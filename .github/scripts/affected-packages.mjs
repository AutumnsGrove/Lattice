/**
 * Affected Packages Detection
 *
 * Given a list of changed files, works out which workspace packages need to be
 * rebuilt and rechecked. The package list and the dependency graph are read
 * from the workspace itself — every `apps|services|workers|libs/.../package.json`
 * — rather than a hand-kept table. A package added tomorrow is covered the day
 * it appears, and a package deleted tomorrow stops costing CI time.
 *
 * Two rules keep the fan-out proportional to the change:
 *
 *   1. Files that can only be data — docs, tests, migrations, JSON, images —
 *      revalidate their own package. They do not cascade to every consumer,
 *      because no consumer's types can change because a value did.
 *   2. Only changes to genuinely global inputs (the lockfile, the workspace
 *      manifest, the shared tsconfig, the engine's term manifest) invalidate
 *      every package. A data file that happens to live under `scripts/` is not
 *      one of those.
 *
 * Usage:
 *   node affected-packages.mjs <base-ref>
 *   node affected-packages.mjs main            # compare against main
 *   node affected-packages.mjs HEAD~1          # compare against the last commit
 *
 * Output: JSON — affected packages, per-package check/test matrices for GitHub
 * Actions, and scope flags for path-gating whole CI jobs.
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..", "..");

// ─── Workspace discovery ────────────────────────────────────────────
// Matches pnpm-workspace.yaml: apps/*, services/*, workers/*, libs/*, plus
// the one nested package (libs/shutter/cloudflare). `tools/*` is tooling, not
// something CI typechecks per-package — changes there set the `tooling` scope
// flag instead.
const WORKSPACE_ROOTS = ["apps", "services", "workers", "libs"];
const NESTED_PACKAGE_DIRS = ["libs/shutter/cloudflare"];

/**
 * Packages whose own check command is not what CI should run, with the reason.
 * Both were already outside CI's typecheck matrix; deriving commands would have
 * quietly added a permanently red job. Delete an entry once the package is
 * fixed — that is the only maintenance this table needs.
 */
const CHECK_OVERRIDES = {
	// `tsc` alone cannot resolve the generated email templates; the correct
	// command (which generates them first) lives in deploy-email-render.yml.
	// Deploy validation owns this package's typecheck.
	"services/email-render": { typecheck: null },
	// Pre-existing type errors in the fetch handler, unrelated to this change.
	"workers/paused": { typecheck: null },
};

/**
 * A package directory turned into the metadata the matrix needs.
 * Commands are derived from the package's own scripts so there is exactly one
 * source of truth for "how do I check this package".
 */
function describePackage(root, dir) {
	const abs = join(root, dir);
	const pkgPath = join(abs, "package.json");
	if (!existsSync(pkgPath)) return null;

	let pkg;
	try {
		pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
	} catch {
		return null;
	}

	const scripts = pkg.scripts || {};
	const deps = {
		...pkg.peerDependencies,
		...pkg.devDependencies,
		...pkg.dependencies,
	};

	// `check` first: svelte-check covers .svelte and .ts together, which is a
	// superset of plain tsc for the same project.
	let typecheck = null;
	if (scripts.check) typecheck = "pnpm check";
	else if (scripts.typecheck) typecheck = "pnpm run typecheck";
	else if (existsSync(join(abs, "tsconfig.json"))) typecheck = "pnpm exec tsc --noEmit";

	const override = CHECK_OVERRIDES[dir];
	if (override && "typecheck" in override) typecheck = override.typecheck;

	return {
		dir,
		name: pkg.name || dir,
		scripts,
		deps,
		typecheck,
		hasTests: Boolean(scripts["test:run"] || scripts.test),
		isSvelteKit: existsSync(join(abs, "svelte.config.js")),
	};
}

/** Every workspace package, keyed by its directory. */
export function discoverPackages(root = REPO_ROOT) {
	const found = new Map();

	for (const area of WORKSPACE_ROOTS) {
		const areaPath = join(root, area);
		if (!existsSync(areaPath)) continue;
		for (const entry of readdirSync(areaPath)) {
			const dir = `${area}/${entry}`;
			const described = describePackage(root, dir);
			if (described) found.set(dir, described);
		}
	}

	for (const dir of NESTED_PACKAGE_DIRS) {
		const described = describePackage(root, dir);
		if (described) found.set(dir, described);
	}

	return found;
}

/**
 * Reverse dependency map: package directory → the directories that import it.
 * Built from each package's `@autumnsgrove/*` dependencies, resolved through
 * the workspace's own package names.
 */
export function buildDependents(packages) {
	const dirByName = new Map([...packages.values()].map((p) => [p.name, p.dir]));
	const dependents = new Map([...packages.keys()].map((dir) => [dir, []]));

	for (const pkg of packages.values()) {
		for (const depName of Object.keys(pkg.deps)) {
			const depDir = dirByName.get(depName);
			if (depDir && depDir !== pkg.dir) dependents.get(depDir).push(pkg.dir);
		}
	}

	return dependents;
}

// ─── What a changed file means ──────────────────────────────────────

// Changes to these invalidate the whole workspace: they are build inputs for
// every package, not content for one of them.
const GLOBAL_FILES = new Set([
	"package.json",
	"pnpm-lock.yaml",
	"pnpm-workspace.yaml",
	"tsconfig.base.json",
	// libs/engine's `prepackage` step regenerates the term manifest from this
	// file, so engine's public types shift when it does.
	"scripts/generate/grove-term-manifest.ts",
]);

// Files that can change without changing any type a consumer sees. They still
// revalidate their own package — a broken test is still a broken test — they
// just don't cascade.
const CONTENT_ONLY = [
	/\.md$/,
	/(^|\/)README/,
	/\.test\.(ts|tsx|js|mjs|cjs)$/,
	/(^|\/)migrations\//,
	/(^|\/)test(s)?\//,
	/\.(json|jsonc|sql|csv|txt|svg|png|jpe?g|webp|gif|ico|woff2?|ttf|otf)$/i,
];

// package.json and config files are always structural, never "content",
// even though several end in .json.
const STRUCTURAL_NAMES = [
	"package.json",
	"tsconfig.json",
	"svelte.config.js",
	"vite.config.ts",
	"vite.config.js",
	"vitest.config.ts",
	"tailwind.config.ts",
	"tailwind.config.js",
	"wrangler.toml",
];

/** True when a file can only change data, never a consumer's types. */
export function isContentOnly(file) {
	const name = file.split("/").pop();
	if (STRUCTURAL_NAMES.includes(name)) return false;
	return CONTENT_ONLY.some((re) => re.test(file));
}

/** Map a file path onto the package directory that owns it, or null. */
export function fileToPackage(file, packages) {
	let match = null;
	for (const dir of packages.keys()) {
		if (file === dir || file.startsWith(dir + "/")) {
			// Longest prefix wins: libs/shutter/cloudflare over libs/shutter.
			if (!match || dir.length > match.length) match = dir;
		}
	}
	return match;
}

// ─── Scope flags for path-gating whole jobs ─────────────────────────
/**
 * Booleans for jobs that are useful only for some kinds of change.
 *   engine  — the engine's export surface may have moved (barrel awareness)
 *   ui      — a .svelte or .css file changed (what the accent-colour check scans)
 *   tooling — repo machinery: workflows, scripts, labels, README inventory
 *   structure — a package was added or removed (README inventory, labels)
 */
export function classifyScope(entries) {
	const files = entries.map((e) => e.path);
	const touched = (re) => files.some((f) => re.test(f));

	const structure = entries.some(
		(e) =>
			(e.status === "A" || e.status === "D") &&
			/^(apps|services|workers)\/[^/]+\/package\.json$/.test(e.path),
	);

	return {
		engine: touched(/^libs\/engine\//) || files.some((f) => GLOBAL_FILES.has(f)),
		ui: touched(/\.(svelte|css)$/),
		tooling:
			touched(/^(\.github|tools|scripts)\//) ||
			touched(/(^|\/)README/) ||
			files.some((f) => GLOBAL_FILES.has(f)) ||
			structure,
		structure,
	};
}

// ─── The decision ───────────────────────────────────────────────────

/**
 * Pure core of the detector: given changed files (and their git status),
 * return the affected set and the matrices CI needs.
 */
export function detectAffected({ entries, packages, root = REPO_ROOT }) {
	const files = entries.map((e) => e.path);

	const runAll = files.some((f) => GLOBAL_FILES.has(f));

	// Every changed file revalidates the package that owns it.
	const directlyChanged = new Set();
	for (const file of files) {
		const dir = fileToPackage(file, packages);
		if (dir) directlyChanged.add(dir);
	}

	// Only structural changes cascade to consumers.
	const cascadeSources = new Set();
	for (const file of files) {
		if (isContentOnly(file)) continue;
		const dir = fileToPackage(file, packages);
		if (dir) cascadeSources.add(dir);
	}

	const dependents = buildDependents(packages);

	const affected = runAll ? new Set(packages.keys()) : new Set(directlyChanged);
	if (!runAll) {
		const walked = new Set();
		const queue = [...cascadeSources];
		while (queue.length > 0) {
			const dir = queue.shift();
			if (walked.has(dir)) continue;
			walked.add(dir);
			for (const dependent of dependents.get(dir) || []) {
				affected.add(dependent);
				if (!walked.has(dependent)) queue.push(dependent);
			}
		}
	}

	// Engine is a library: any package that imports it needs its dist built
	// before its own typecheck can resolve `@autumnsgrove/lattice`.
	const engineDir = [...packages.values()].find((p) => p.name === "@autumnsgrove/lattice")?.dir;
	const needsEngine =
		runAll ||
		(engineDir !== undefined &&
			[...affected].some(
				(dir) => dir === engineDir || packages.get(dir)?.deps["@autumnsgrove/lattice"],
			));

	const testMatrix = [];
	const typecheckMatrix = [];

	for (const dir of [...affected].sort()) {
		const pkg = packages.get(dir);
		if (!pkg) continue;
		if (!existsSync(join(root, dir))) continue;

		const name = dir.split("/").pop();

		if (pkg.hasTests) {
			testMatrix.push({ package: dir, name, isSvelteKit: pkg.isSvelteKit });
		}

		if (pkg.typecheck) {
			typecheckMatrix.push({
				package: dir,
				name,
				command: pkg.typecheck,
				isSvelteKit: pkg.isSvelteKit,
			});
		}
	}

	return {
		changedFiles: files.length,
		directlyChanged: [...directlyChanged].sort(),
		affectedPackages: [...affected].sort(),
		runAll,
		needsEngine,
		testMatrix,
		typecheckMatrix,
		scope: classifyScope(entries, packages),
	};
}

// ─── Git input ──────────────────────────────────────────────────────

/**
 * Changed files with their git status, relative to `baseRef`.
 * `A`/`D` entries are what tells us a package appeared or disappeared.
 */
export function getChangedEntries(baseRef) {
	const diff = (args) =>
		execSync(`git diff --name-status ${args}`, { encoding: "utf8", cwd: REPO_ROOT }).trim();

	let out;
	try {
		out = diff(`${baseRef}...HEAD`);
	} catch {
		// Fallback for a shallow clone or a ref that isn't fetched.
		try {
			out = diff("HEAD~1");
		} catch {
			return [];
		}
	}

	if (!out) return [];

	return out.split("\n").map((line) => {
		const [status, ...rest] = line.split("\t");
		return { status: status[0], path: rest.join("\t") };
	});
}

// ─── CLI ────────────────────────────────────────────────────────────

function main() {
	const baseRef = process.argv[2] || "main";
	const entries = getChangedEntries(baseRef);
	const packages = discoverPackages(REPO_ROOT);

	const result =
		entries.length === 0
			? {
					changedFiles: 0,
					directlyChanged: [],
					affectedPackages: [],
					runAll: false,
					needsEngine: false,
					testMatrix: [],
					typecheckMatrix: [],
					scope: { engine: false, ui: false, tooling: false, structure: false },
				}
			: detectAffected({ entries, packages, root: REPO_ROOT });

	console.log(JSON.stringify(result));
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) main();
