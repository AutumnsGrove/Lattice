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
 *   2. Only changes to genuinely global inputs (the workspace manifest, the
 *      shared tsconfig, the engine's term manifest) invalidate every package.
 *      A data file that happens to live under `scripts/` is not one of those.
 *   3. A lockfile change is only as wide as the importers it touched. Two
 *      packages gaining a dependency does not revalidate the other twenty-five
 *      — unless a `packages:`/`snapshots:` entry moved, which is a genuinely
 *      shared resolution and still invalidates everything (#1795).
 *
 * Usage:
 *   node affected-packages.mjs <base-ref>
 *   node affected-packages.mjs main            # compare against main
 *   node affected-packages.mjs HEAD~1          # compare against the last commit
 *   node affected-packages.mjs --all           # weekly sweep: skip detection
 *
 * Output: JSON — affected packages, per-package check/test matrices for GitHub
 * Actions, and scope flags for path-gating whole CI jobs.
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
	exposedBy,
	importedSpecifiers,
	loadEngineSurface,
	specifierMatches,
} from "./engine-exports.mjs";

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
 * Whether a script is a single run rather than a watcher.
 *
 * A bare `vitest` (or `jest`, `mocha`, `ava`) sits and waits for file changes on
 * a CI runner, where nothing ever changes, until the job times out — a red check
 * with no verdict in it. The runner only leaves when the command names a mode
 * that exits, so that is what this looks for (#1796).
 *
 * A command with no watcher-capable runner in it at all — `tsc --noEmit`,
 * `node --test`, `playwright test` — already exits, and is left alone.
 */
export function isOneShot(command) {
	const WATCHERS = /(?:^|[\s/])(?:vitest|jest|mocha|ava|tap)(?=$|[\s/])/;
	const WATCH_FLAGS = /(?:^|\s)(?:-w|--watch|--watchAll|--ui)(?=$|[\s=])/;
	const ONCE_MODES = /(?:^|\s)(?:run|--run|--runInBand|--ci|--single-run)(?=$|\s)/;

	const watcher = WATCHERS.exec(command);
	if (!watcher) return true;

	// Only the runner's own arguments decide. `npm run build && vitest` must not
	// be read as `vitest run` because a `run` appears earlier on the line.
	const args = command.slice(watcher.index + watcher[0].length);
	if (WATCH_FLAGS.test(args)) return false;
	return ONCE_MODES.test(args);
}

/**
 * The command that runs a package's tests in CI, or null if it has no runnable
 * suite.
 *
 * `test:run` first, because that name already means "the one CI runs". Falling
 * back to `test` is only safe when that script cannot watch — the mismatch
 * between a detector admitting a package on `test` and the job running
 * `test:run` is what let `libs/gossamer` and `libs/shutter/cloudflare` carry
 * suites CI could never run.
 */
export function testCommandFor(scripts) {
	if (scripts["test:run"]) return "pnpm test:run";
	if (scripts.test && isOneShot(scripts.test)) return "pnpm test";
	return null;
}

/**
 * A package directory turned into the metadata the matrix needs.
 * Commands are derived from the package's own scripts so there is exactly one
 * source of truth for "how do I check this package" and "how do I test it".
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
	const testCommand = testCommandFor(scripts);
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
		testCommand,
		hasTests: testCommand !== null,
		// A config file alone does not make a package SvelteKit-capable: `libs/gossamer`
		// has one and no `@sveltejs/kit`, so `pnpm exec svelte-kit sync` there is
		// "Command svelte-kit not found". The sync step needs the binary, and the
		// binary comes from the dependency, so that is what this asks.
		isSvelteKit: existsSync(join(abs, "svelte.config.js")) && declaresKit(pkg),
	};
}

/** Whether a package declares SvelteKit itself rather than inheriting it. */
function declaresKit(pkg) {
	for (const field of ["dependencies", "devDependencies", "peerDependencies"]) {
		if (pkg[field] && Object.hasOwn(pkg[field], "@sveltejs/kit")) {
			return true;
		}
	}
	return false;
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
// every package, not content for one of them. `pnpm-lock.yaml` is deliberately
// absent — it is global only when a shared resolution moved, so it is scoped by
// importer instead (see `diffLockfile` below).
const GLOBAL_FILES = new Set([
	"package.json",
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

// ─── Lockfile scope ─────────────────────────────────────────────────

const LOCKFILE = "pnpm-lock.yaml";

/**
 * Split a pnpm lockfile into its `importers:` section and everything else.
 *
 * Both halves matter and they mean different things: `importers:` records what
 * each workspace package asked for, so a change inside one entry is scoped to
 * that package. Anything outside it — `packages:`, `snapshots:`, `settings:`,
 * `overrides:` — is a resolution every importer shares, which is the only way a
 * lockfile change is genuinely global (#1795).
 *
 * Returns null when the text has no recognisable `importers:` section, which is
 * the cue for every caller to fall back to "this could be anything".
 */
export function splitLockfile(text) {
	const lines = text.split("\n");
	const start = lines.findIndex((line) => /^importers:\s*$/.test(line));
	if (start === -1) return null;

	const importers = new Map();
	let current = null;
	let end = lines.length;

	for (let i = start + 1; i < lines.length; i++) {
		const line = lines[i];
		if (line.trim() === "") continue;
		// Back to column 0: the importers section closed (e.g. `packages:`).
		if (!/^\s/.test(line)) {
			end = i;
			break;
		}
		// An importer key sits at two-space indent: `  apps/aspen:` — optionally
		// quoted, and usually followed by a blank line and its nested entries.
		const key = /^ {2}(?:'([^']+)'|"([^"]+)"|([^:\s][^:]*)):\s*(?:#.*)?$/.exec(line);
		if (key) {
			current = (key[1] ?? key[2] ?? key[3]).trim();
			importers.set(current, []);
			continue;
		}
		if (current) importers.get(current).push(line);
	}

	if (importers.size === 0) return null;

	// Everything that is not part of an importer entry: before the section,
	// after it, and the section header itself.
	const shared = [...lines.slice(0, start), ...lines.slice(end)].join("\n");

	return { importers, shared };
}

/**
 * What a lockfile change actually touched.
 *
 * `sharedChanged` is the conservative answer: a resolution every package sees
 * moved, or the file could not be read/parsed, so nothing narrower is safe.
 * Otherwise `changedImporters` lists the workspace directories whose own
 * dependency block moved, and the caller cascades from those.
 */
export function diffLockfile(before, after) {
	const oldSide = before == null ? null : splitLockfile(before);
	const newSide = after == null ? null : splitLockfile(after);

	// Added, deleted, or unrecognisable: assume the worst rather than ship a
	// broken install with green checks.
	if (!oldSide || !newSide) return { sharedChanged: true, changedImporters: [] };
	if (oldSide.shared !== newSide.shared) return { sharedChanged: true, changedImporters: [] };

	const changed = new Set();
	for (const [dir, body] of newSide.importers) {
		const previous = oldSide.importers.get(dir);
		if (!previous || previous.join("\n") !== body.join("\n")) changed.add(dir);
	}
	for (const dir of oldSide.importers.keys()) {
		if (!newSide.importers.has(dir)) changed.add(dir);
	}

	return { sharedChanged: false, changedImporters: [...changed].sort() };
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
		engine: touched(/^libs\/engine\//) || files.some((f) => GLOBAL_FILES.has(f) || f === LOCKFILE),
		ui: touched(/\.(svelte|css)$/),
		tooling:
			touched(/^(\.github|tools|scripts)\//) ||
			touched(/(^|\/)README/) ||
			files.some((f) => GLOBAL_FILES.has(f) || f === LOCKFILE) ||
			structure,
		structure,
	};
}

// ─── The decision ───────────────────────────────────────────────────

/**
 * Which packages a set of changed engine files can actually reach.
 *
 * The engine is a library with 144 subpath exports over one source tree, so
 * "something in the engine changed" is not the same question as "every consumer
 * is affected". A helper under `src/lib/platform/config` is visible to the
 * packages that import `lattice/platform/config` (or a file under it); a
 * component the root barrel re-exports wholesale is visible to everyone.
 *
 * Returns null when the engine did not change, and a `global` scope when the
 * change cannot be narrowed — the root barrel, `package.json`, a build config,
 * or an `exports` map we could not read. Narrowing on a guess is the one
 * failure mode that ships a broken import with green checks, so anything
 * unattributable widens instead.
 */
function scopeEngineCascade({ entries, packages, root, engineDir, dependents }) {
	if (!engineDir) return null;

	const engineDependents = dependents.get(engineDir) || [];
	const structural = entries
		.filter((entry) => fileToPackage(entry.path, packages) === engineDir)
		.map((entry) => entry.path)
		.filter((file) => !isContentOnly(file));

	// A README or a migration cannot move a type, so it reaches nobody. Answering
	// that before reading the exports map keeps the cheap case cheap.
	if (structural.length === 0) return { global: false, dependents: [] };

	const surface = loadEngineSurface(root);
	if (!surface) return { global: true, dependents: engineDependents };

	const exposedKeys = new Set();
	let global = false;
	for (const file of structural) {
		const exposed = exposedBy(surface, file);
		// Nothing names it and nothing re-exports it: no consumer's types can move.
		if (exposed.size === 0) continue;
		// `*` is "could not be attributed" — package.json, a build config, a file
		// outside `src/lib`. `.` is *not* that: it is one export key like any other,
		// visible to the packages that import the root and to nobody else.
		if (exposed.has("*")) {
			global = true;
			break;
		}
		for (const key of exposed) exposedKeys.add(key);
	}

	if (global) return { global: true, dependents: engineDependents };
	if (exposedKeys.size === 0) return { global: false, dependents: [] };

	const cache = new Map();
	const reached = engineDependents.filter((dir) => {
		for (const specifier of importedSpecifiers(root, dir, cache)) {
			for (const key of exposedKeys) {
				if (specifierMatches(specifier, key)) return true;
			}
		}
		return false;
	});

	return { global: false, dependents: reached };
}

/**
 * Pure core of the detector: given changed files (and their git status),
 * return the affected set and the matrices CI needs.
 *
 * `lockfile` carries the result of `diffLockfile` when the caller could read
 * both sides. Omitting it while `pnpm-lock.yaml` is in the diff keeps the old,
 * safe behaviour: everything is affected.
 *
 * `sweep` bypasses the affected detection entirely and checks every package and
 * every gated job. Nothing is wrong with the diff — the point is that "nothing
 * changed" is exactly how a package stays broken for months (#1797).
 */
export function detectAffected({ entries, packages, root = REPO_ROOT, lockfile, sweep }) {
	const files = entries.map((e) => e.path);
	const lockfileChanged = files.includes(LOCKFILE);
	const lockfileScoped =
		lockfileChanged && lockfile && !lockfile.sharedChanged && lockfile.changedImporters;

	// Importers that no longer map onto a package (the root `.` importer, a
	// package that moved) cannot be scoped to anyone, so they are shared.
	const unscopable = lockfileScoped && lockfile.changedImporters.some((dir) => !packages.has(dir));

	const runAll =
		sweep ||
		files.some((f) => GLOBAL_FILES.has(f)) ||
		(lockfileChanged && (!lockfileScoped || unscopable));

	// Every changed file revalidates the package that owns it. A changed
	// lockfile importer is a structural change to that package: its own
	// dependencies moved, so its types can move with them.
	const directlyChanged = new Set();
	for (const file of files) {
		const dir = fileToPackage(file, packages);
		if (dir) directlyChanged.add(dir);
	}
	if (lockfileScoped && !unscopable) {
		for (const dir of lockfile.changedImporters) directlyChanged.add(dir);
	}

	// Only structural changes cascade to consumers.
	const engineDir = [...packages.values()].find((p) => p.name === "@autumnsgrove/lattice")?.dir;
	const dependents = buildDependents(packages);

	// Engine caveats only the packages that can actually import what moved. Its
	// 144 subpath exports are not one surface, and which one a file lands in is
	// read from the package's own `exports` map rather than assumed (#1786).
	const engineScope = runAll
		? null
		: scopeEngineCascade({ entries, packages, root, engineDir, dependents });

	const cascadeSources = new Set();
	for (const file of files) {
		if (isContentOnly(file)) continue;
		const dir = fileToPackage(file, packages);
		// Engine's fan-out is decided per file in `scopeEngineCascade`. Queueing the
		// directory here would put all 27 of its dependents back on the critical
		// path for a change to one helper.
		if (dir && dir !== engineDir) cascadeSources.add(dir);
	}
	if (lockfileScoped && !unscopable) {
		for (const dir of lockfile.changedImporters) cascadeSources.add(dir);
	}

	const affected = runAll ? new Set(packages.keys()) : new Set(directlyChanged);
	if (!runAll) {
		const engineDependents = engineScope?.dependents ?? [];
		for (const dir of engineDependents) affected.add(dir);

		const walked = new Set();
		const queue = [...cascadeSources, ...engineDependents];
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
			testMatrix.push({
				package: dir,
				name,
				command: pkg.testCommand,
				isSvelteKit: pkg.isSvelteKit,
			});
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
		sweep: Boolean(sweep),
		testMatrix,
		typecheckMatrix,
		// A sweep has no diff worth reading scope from, so every gated job runs
		// too — a scheduled barrel or accent check that skipped is a package that
		// stays broken with nobody looking at it.
		scope: sweep
			? { engine: true, ui: true, tooling: true, structure: false }
			: classifyScope(entries, packages),
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

/** The lockfile as it stood at a ref, or null when it cannot be read. */
function lockfileAt(ref) {
	try {
		return execSync(`git show ${ref}:${LOCKFILE}`, {
			encoding: "utf8",
			cwd: REPO_ROOT,
			maxBuffer: 256 * 1024 * 1024,
			stdio: ["ignore", "pipe", "ignore"],
		});
	} catch {
		return null;
	}
}

/**
 * Both sides of the lockfile for the diff being measured.
 *
 * The three-dot diff `getChangedEntries` uses compares against the merge base,
 * so the lockfile has to be read from that same commit — reading `baseRef`
 * would fold in every dependency change `main` picked up since the branch was
 * cut and widen the scope for no reason.
 */
export function readLockfilePair(baseRef) {
	let mergeBase = baseRef;
	try {
		mergeBase = execSync(`git merge-base ${baseRef} HEAD`, {
			encoding: "utf8",
			cwd: REPO_ROOT,
			stdio: ["ignore", "pipe", "ignore"],
		}).trim();
	} catch {
		// Not a commit, or not fetched: `baseRef` itself is the best we have.
	}

	const path = join(REPO_ROOT, LOCKFILE);
	return {
		before: lockfileAt(mergeBase),
		after: existsSync(path) ? readFileSync(path, "utf8") : null,
	};
}

function main() {
	// `--all` is what the weekly sweep (and `workflow_dispatch` with run-all) uses:
	// no diff is worth scoping against, so every package and every gated job runs.
	const args = process.argv.slice(2);
	const sweep = args.includes("--all");
	const baseRef = args.find((a) => !a.startsWith("--")) || "main";
	const entries = getChangedEntries(baseRef);
	const packages = discoverPackages(REPO_ROOT);

	// Only pay for reading a ~1MB lockfile twice when it is actually in the diff.
	let lockfile;
	if (entries.some((e) => e.path === LOCKFILE)) {
		const { before, after } = readLockfilePair(baseRef);
		lockfile = diffLockfile(before, after);
	}

	const result =
		entries.length === 0 && !sweep
			? {
					changedFiles: 0,
					directlyChanged: [],
					affectedPackages: [],
					runAll: false,
					needsEngine: false,
					sweep: false,
					testMatrix: [],
					typecheckMatrix: [],
					scope: { engine: false, ui: false, tooling: false, structure: false },
				}
			: detectAffected({ entries, packages, root: REPO_ROOT, lockfile, sweep });

	console.log(JSON.stringify(result));
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) main();
