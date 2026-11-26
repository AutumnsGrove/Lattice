/**
 * Tests for affected-packages.mjs.
 *
 * The interesting behaviour is not "does it find packages" — it is which
 * changes are allowed to cascade. A file that can only hold data must not
 * revalidate every consumer in the workspace, and a file that is genuinely
 * global must.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
	discoverPackages,
	buildDependents,
	detectAffected,
	fileToPackage,
	isContentOnly,
	classifyScope,
	splitLockfile,
	diffLockfile,
	isOneShot,
	testCommandFor,
} from "./affected-packages.mjs";

// ─── Fixtures ───────────────────────────────────────────────────────

/** Build a throwaway workspace on disk and return its root. */
function workspace(files) {
	const root = mkdtempSync(join(tmpdir(), "affected-packages-"));
	for (const [path, content] of Object.entries(files)) {
		const abs = join(root, path);
		mkdirSync(dirname(abs), { recursive: true });
		writeFileSync(abs, typeof content === "string" ? content : JSON.stringify(content));
	}
	return root;
}

const files = (paths) => paths.map((path) => ({ status: "M", path }));

function standardWorkspace(overrides = {}) {
	return workspace({
		"libs/engine/package.json": {
			name: "@autumnsgrove/lattice",
			scripts: { check: "svelte-check", "test:run": "vitest run" },
		},
		"libs/engine/svelte.config.js": "",
		"libs/engine/src/lib/index.ts": "",
		"libs/engine/src/lib/data/words.json": "{}",
		"libs/engine/migrations/001_init.sql": "",
		"libs/engine/src/lib/thing.test.ts": "",
		"libs/engine/src/lib/thing.ts": "",

		"libs/tiny/package.json": {
			name: "@autumnsgrove/tiny",
			scripts: { check: "tsc", "test:run": "vitest run" },
		},
		"libs/tiny/src/index.ts": "",

		"apps/uses-engine/package.json": {
			name: "uses-engine",
			scripts: { check: "svelte-check", "test:run": "vitest run" },
			dependencies: { "@autumnsgrove/lattice": "workspace:*" },
		},
		"apps/uses-engine/svelte.config.js": "",

		"apps/uses-tiny/package.json": {
			name: "uses-tiny",
			scripts: { check: "svelte-check" },
			dependencies: { "@autumnsgrove/tiny": "workspace:*" },
		},
		"apps/uses-tiny/svelte.config.js": "",

		"workers/standalone/package.json": {
			name: "standalone",
			scripts: { "test:run": "vitest run" },
		},

		"workers/no-checks/package.json": { name: "no-checks" },
		...overrides,
	});
}

// ─── File classification ────────────────────────────────────────────

test("content-only files: docs, tests, migrations, data", () => {
	for (const path of [
		"libs/engine/src/lib/data/words.json",
		"libs/engine/migrations/001_init.sql",
		"libs/engine/src/lib/thing.test.ts",
		"docs/help-center/how-to.md",
		"libs/engine/src/lib/platform/config/blocklist.json",
		"apps/landing/static/logo.svg",
	]) {
		assert.equal(isContentOnly(path), true, `${path} should not cascade`);
	}
});

test("a svelte config without the SvelteKit dependency is not SvelteKit", () => {
	// `libs/gossamer` is this case in the real workspace: a `svelte.config.js` for
	// `svelte-package`, no `@sveltejs/kit`, and so no `svelte-kit` binary for the
	// CI sync step to run. Found when the Lumen adapter made gossamer affected.
	const root = workspace({
		"libs/gossamer/package.json": {
			name: "@autumnsgrove/gossamer",
			scripts: { "test:run": "vitest run" },
			devDependencies: { svelte: "^5.0.0" },
		},
		"libs/gossamer/svelte.config.js": "",
		"libs/with-kit/package.json": {
			name: "with-kit",
			devDependencies: { "@sveltejs/kit": "^2.0.0" },
		},
		"libs/with-kit/svelte.config.js": "",
	});
	try {
		const packages = discoverPackages(root);
		assert.equal(packages.get("libs/gossamer").isSvelteKit, false);
		assert.equal(packages.get("libs/with-kit").isSvelteKit, true);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("structural files always cascade, even when they end in .json", () => {
	for (const path of [
		"libs/engine/package.json",
		"apps/aspen/tsconfig.json",
		"libs/engine/svelte.config.js",
		"libs/engine/src/lib/username.ts",
		"apps/plant/wrangler.toml",
	]) {
		assert.equal(isContentOnly(path), false, `${path} should cascade`);
	}
});

// ─── Cascading ──────────────────────────────────────────────────────

test("a data file revalidates its own package but not its consumers", () => {
	const root = standardWorkspace();
	try {
		const packages = discoverPackages(root);
		const result = detectAffected({
			entries: files(["libs/engine/src/lib/data/words.json"]),
			packages,
			root,
		});

		assert.deepEqual(result.directlyChanged, ["libs/engine"]);
		assert.deepEqual(result.affectedPackages, ["libs/engine"]);
		assert.equal(result.runAll, false);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("a code change cascades to direct and transitive consumers", () => {
	const root = standardWorkspace();
	try {
		const packages = discoverPackages(root);
		const result = detectAffected({
			entries: files(["libs/tiny/src/index.ts"]),
			packages,
			root,
		});

		assert.deepEqual(result.affectedPackages, ["apps/uses-tiny", "libs/tiny"]);
		// types-only consumers are typechecked, not tested
		assert.deepEqual(
			result.testMatrix.map((m) => m.name),
			["tiny"],
		);
		// sorted by directory: apps/ before libs/
		assert.deepEqual(
			result.typecheckMatrix.map((m) => m.name),
			["uses-tiny", "tiny"],
		);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("a test file change does not revalidate consumers either", () => {
	const root = standardWorkspace();
	try {
		const result = detectAffected({
			entries: files(["libs/engine/src/lib/thing.test.ts"]),
			packages: discoverPackages(root),
			root,
		});

		assert.deepEqual(result.affectedPackages, ["libs/engine"]);
		assert.deepEqual(
			result.testMatrix.map((m) => m.name),
			["engine"],
		);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("a content change and a code change in the same package still cascade", () => {
	const root = standardWorkspace();
	try {
		const result = detectAffected({
			entries: files(["libs/tiny/src/index.ts", "libs/tiny/README.md"]),
			packages: discoverPackages(root),
			root,
		});

		assert.deepEqual(result.affectedPackages, ["apps/uses-tiny", "libs/tiny"]);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

// ─── Global inputs ──────────────────────────────────────────────────

test("global inputs invalidate every package", () => {
	const root = standardWorkspace();
	try {
		const packages = discoverPackages(root);
		for (const path of ["pnpm-workspace.yaml", "tsconfig.base.json", "package.json"]) {
			const result = detectAffected({ entries: files([path]), packages, root });
			assert.equal(result.runAll, true, `${path} should run everything`);
			assert.equal(
				result.affectedPackages.length,
				packages.size,
				`${path} should affect every package`,
			);
		}
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

// ─── Lockfile scope (#1795) ─────────────────────────────────────────

/** A pnpm lockfile with the given importers and shared section. */
function lockfile({ importers = {}, shared = "lockfileVersion: '9.0'" } = {}) {
	let out = `${shared}\n\nimporters:\n`;
	for (const [dir, deps] of Object.entries(importers)) {
		out += `\n  ${dir}:\n`;
		for (const [name, version] of Object.entries(deps)) {
			out += `    dependencies:\n      ${name}:\n        specifier: ${version}\n        version: ${version}\n`;
		}
	}
	return out;
}

test("the lockfile is split into importers and the shared remainder", () => {
	const parsed = splitLockfile(
		lockfile({
			importers: { ".": { prettier: "^3.0.0" }, "apps/aspen": { svelte: "^5.0.0" } },
			// `packages:` is the shared half — outside the importers section.
			shared:
				"lockfileVersion: '9.0'\n\npackages:\n\n  svelte@5.0.0:\n    resolution: {integrity: sha512-x}",
		}),
	);

	assert.deepEqual([...parsed.importers.keys()], [".", "apps/aspen"]);
	assert.match(parsed.shared, /^lockfileVersion/);
	assert.match(parsed.shared, /packages:/);
});

test("a lockfile with no importers section is not scoped", () => {
	assert.equal(splitLockfile("lockfileVersion: '9.0'\n"), null);
	assert.deepEqual(diffLockfile(null, "anything"), {
		sharedChanged: true,
		changedImporters: [],
	});
});

test("diffLockfile names only the importers that moved", () => {
	const before = lockfile({
		importers: { ".": { prettier: "^3.0.0" }, "libs/lyra": { zod: "^3.0.0" } },
	});
	const after = lockfile({
		importers: { ".": { prettier: "^3.0.0" }, "libs/lyra": { zod: "^4.0.0" } },
	});

	assert.deepEqual(diffLockfile(before, after), {
		sharedChanged: false,
		changedImporters: ["libs/lyra"],
	});
});

test("a moved re-export is shared, not importer-scoped", () => {
	// The #1793 shape: many packages affected because the lockfile changed. Only
	// one importer moved, so only that package (and its consumers) should be.
	const root = standardWorkspace({
		"libs/lyra/package.json": {
			name: "@autumnsgrove/lyra",
			scripts: { check: "tsc", "test:run": "vitest run" },
			dependencies: { zod: "^3.0.0" },
		},
		"libs/lyra/tsconfig.json": "{}",
		"workers/lyra-user/package.json": {
			name: "lyra-user",
			scripts: { check: "tsc" },
			dependencies: { "@autumnsgrove/lyra": "workspace:*" },
		},
		"workers/lyra-user/src/index.ts": "",
	});
	try {
		const packages = discoverPackages(root);
		const result = detectAffected({
			entries: files(["pnpm-lock.yaml"]),
			packages,
			root,
			lockfile: { sharedChanged: false, changedImporters: ["libs/lyra"] },
		});

		assert.equal(result.runAll, false, "one importer must not span the workspace");
		assert.deepEqual(result.affectedPackages, ["libs/lyra", "workers/lyra-user"]);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("a shared lockfile resolution still invalidates every package", () => {
	const root = standardWorkspace();
	try {
		const packages = discoverPackages(root);
		const result = detectAffected({
			entries: files(["pnpm-lock.yaml"]),
			packages,
			root,
			lockfile: { sharedChanged: true, changedImporters: [] },
		});

		assert.equal(result.runAll, true);
		assert.equal(result.affectedPackages.length, packages.size);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("a lockfile change with no importer detail stays conservative", () => {
	// No `lockfile` argument means the caller could not read both sides. Running
	// everything is the only safe answer: over-running costs time, under-running
	// ships a broken install with green checks.
	const root = standardWorkspace();
	try {
		const result = detectAffected({
			entries: files(["pnpm-lock.yaml"]),
			packages: discoverPackages(root),
			root,
		});
		assert.equal(result.runAll, true);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("a root importer change is shared, because everyone installs it", () => {
	const root = standardWorkspace();
	try {
		const result = detectAffected({
			entries: files(["pnpm-lock.yaml"]),
			packages: discoverPackages(root),
			root,
			// `.` is the root manifest's importer; it is not a package directory.
			lockfile: { sharedChanged: false, changedImporters: ["."] },
		});
		assert.equal(result.runAll, true);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("a lockfile change that touches no importer affects nothing", () => {
	const root = standardWorkspace();
	try {
		const result = detectAffected({
			entries: files(["pnpm-lock.yaml"]),
			packages: discoverPackages(root),
			root,
			lockfile: { sharedChanged: false, changedImporters: [] },
		});
		assert.equal(result.runAll, false);
		assert.deepEqual(result.affectedPackages, []);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("a data file under scripts/ is not a global input", () => {
	// The regression from #1783: scripts/db/migration-drift-baseline.json
	// expanded a two-package PR into every package in the monorepo.
	const root = standardWorkspace();
	try {
		const result = detectAffected({
			entries: files(["scripts/db/migration-drift-baseline.json"]),
			packages: discoverPackages(root),
			root,
		});

		assert.equal(result.runAll, false);
		assert.deepEqual(result.affectedPackages, []);
		assert.equal(result.testMatrix.length, 0);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("the engine term manifest is a global input", () => {
	const root = standardWorkspace();
	try {
		const result = detectAffected({
			entries: files(["scripts/generate/grove-term-manifest.ts"]),
			packages: discoverPackages(root),
			root,
		});

		assert.equal(result.runAll, true);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

// ─── Derived package metadata ───────────────────────────────────────

test("check commands come from each package's own scripts", () => {
	const root = standardWorkspace({
		"services/typed/package.json": {
			name: "typed",
			scripts: { typecheck: "tsc --noEmit" },
		},
		"services/typed/tsconfig.json": "{}",
		"workers/ts-only/package.json": { name: "ts-only" },
		"workers/ts-only/tsconfig.json": "{}",
	});
	try {
		const packages = discoverPackages(root);
		assert.equal(packages.get("libs/engine").typecheck, "pnpm check");
		assert.equal(packages.get("services/typed").typecheck, "pnpm run typecheck");
		assert.equal(packages.get("workers/ts-only").typecheck, "pnpm exec tsc --noEmit");
		assert.equal(packages.get("workers/no-checks").typecheck, null);
		assert.equal(packages.get("workers/no-checks").hasTests, false);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("dependents are read from package.json, not a hardcoded list", () => {
	const root = standardWorkspace();
	try {
		const packages = discoverPackages(root);
		const dependents = buildDependents(packages);

		assert.deepEqual(dependents.get("libs/engine"), ["apps/uses-engine"]);
		assert.deepEqual(dependents.get("libs/tiny"), ["apps/uses-tiny"]);
		assert.deepEqual(dependents.get("workers/standalone"), []);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("fileToPackage prefers the longest matching directory", () => {
	const root = workspace({
		"libs/shutter/package.json": { name: "@autumnsgrove/shutter" },
		"libs/shutter/cloudflare/package.json": { name: "@autumnsgrove/shutter-cf" },
	});
	try {
		const packages = discoverPackages(root);
		assert.equal(
			fileToPackage("libs/shutter/cloudflare/src/a.ts", packages),
			"libs/shutter/cloudflare",
		);
		assert.equal(fileToPackage("libs/shutter/src/b.ts", packages), "libs/shutter");
		assert.equal(fileToPackage("libs/other/src/c.ts", packages), null);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

// ─── The test command (#1796) ──────────────────────────────────────

// The detector used to admit a package on `test` and then have the job run
// `test:run`, which is how `libs/gossamer` and `libs/shutter/cloudflare` kept
// suites CI could never run. One script name is no longer the contract.
test("test:run wins when a package has both scripts", () => {
	assert.equal(testCommandFor({ "test:run": "vitest run", test: "vitest" }), "pnpm test:run");
});

test("a test script is used only when it cannot watch", () => {
	assert.equal(testCommandFor({ test: "vitest run" }), "pnpm test");
	assert.equal(testCommandFor({ test: "vitest" }), null);
	assert.equal(testCommandFor({ test: "vitest --watch" }), null);
});

test("a package with no runnable suite stays out of the matrix", () => {
	assert.equal(testCommandFor({}), null);
	assert.equal(testCommandFor({ build: "tsc" }), null);
	assert.equal(testCommandFor({ test: "vitest" }) !== null, false);
});

test("watchers and one-shot runners are told apart by the runner's own arguments", () => {
	const oneShot = [
		"vitest run",
		"vitest run --coverage",
		"vitest --run",
		"jest --ci",
		"jest --runInBand",
		"cross-env NODE_ENV=test vitest run",
		"c8 vitest run",
		"node --test src/*.test.ts",
		"tsx --test src/*.test.ts",
		"playwright test",
		"tsc --noEmit",
	];
	for (const command of oneShot) {
		assert.equal(isOneShot(command), true, `${command} should be one-shot`);
	}

	const watching = [
		"vitest",
		"vitest --watch",
		"vitest --ui",
		"vitest -w",
		"jest --watchAll",
		"mocha --watch",
		"vitest run --watch",
		// A `run` earlier on the line does not make the runner one-shot.
		"npm run build && vitest",
	];
	for (const command of watching) {
		assert.equal(isOneShot(command), false, `${command} should not be run in CI`);
	}
});

test("the test matrix carries the command, not a hardcoded script name", () => {
	const root = standardWorkspace({
		"workers/plain-vitest/package.json": {
			name: "plain-vitest",
			scripts: { test: "vitest run" },
		},
		"workers/bare-vitest/package.json": {
			name: "bare-vitest",
			scripts: { test: "vitest" },
		},
	});
	try {
		const result = detectAffected({
			entries: files(["workers/plain-vitest/src/a.ts", "workers/bare-vitest/src/a.ts"]),
			packages: discoverPackages(root),
			root,
		});

		const byDir = Object.fromEntries(result.testMatrix.map((m) => [m.package, m.command]));
		assert.equal(byDir["workers/plain-vitest"], "pnpm test");
		assert.equal(byDir["workers/bare-vitest"], undefined, "a watcher must not enter the matrix");
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("needsEngine is true only when an engine consumer is affected", () => {
	const root = standardWorkspace();
	try {
		const packages = discoverPackages(root);

		const engineAffected = detectAffected({
			entries: files(["apps/uses-engine/src/page.ts"]),
			packages,
			root,
		});
		assert.equal(engineAffected.needsEngine, true);

		const unrelated = detectAffected({
			entries: files(["workers/standalone/src/index.ts"]),
			packages,
			root,
		});
		assert.equal(unrelated.needsEngine, false);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

// ─── Scope flags for gating whole jobs ───────────────────────────────

test("scope: ui only when something can change a rendered colour", () => {
	const css = classifyScope(files(["apps/landing/src/app.css"]));
	assert.equal(css.ui, true);
	assert.equal(css.engine, false);

	const server = classifyScope(files(["libs/engine/src/lib/server/users.ts"]));
	assert.equal(server.ui, false);
	assert.equal(server.engine, true, "engine source still sets the engine flag");

	const docs = classifyScope(files(["docs/legal/privacy.md"]));
	assert.equal(docs.ui, false);
	assert.equal(docs.engine, false);
	assert.equal(docs.tooling, false);
});

test("scope: tooling covers workflows, scripts, labels and README", () => {
	for (const path of [
		".github/workflows/ci.yml",
		"scripts/pre-push/validate.mjs",
		"tools/labels/sync.ts",
		"README.md",
		"pnpm-lock.yaml",
	]) {
		const scope = classifyScope(files([path]));
		assert.equal(scope.tooling, true, `${path} should be tooling`);
	}

	assert.equal(classifyScope(files(["apps/plant/src/x.ts"])).tooling, false);
});

test("scope: structure when a package appears or disappears", () => {
	const added = classifyScope([{ status: "A", path: "apps/newthing/package.json" }]);
	assert.equal(added.structure, true);
	assert.equal(added.tooling, true, "README inventory must be rechecked");

	const modified = classifyScope([{ status: "M", path: "apps/plant/package.json" }]);
	assert.equal(modified.structure, false);
});

// ─── The real repository ────────────────────────────────────────────

test("the real workspace discovers every package that has its own checks", () => {
	const packages = discoverPackages();

	// Packages that exist with check/test scripts but were missing from the
	// hand-maintained table this script used to carry (#1783).
	for (const dir of [
		"libs/curios",
		"libs/thorn",
		"libs/loom",
		"libs/grove-crypto",
		"libs/grove-errors",
		"libs/grove-markdown",
		"workers/timeline-sync",
	]) {
		const pkg = packages.get(dir);
		assert.ok(pkg, `${dir} should be discovered`);
		assert.ok(pkg.typecheck, `${dir} should have a typecheck command`);
		assert.equal(pkg.hasTests, true, `${dir} should have tests`);
	}

	// Directories left behind as build output only — no package.json.
	for (const dead of ["apps/ivy", "apps/meadow", "apps/terrarium"]) {
		assert.equal(packages.has(dead), false, `${dead} should not be a package`);
	}

	// Known-bad typecheck commands are opted out explicitly, not by omission.
	// If one of these starts passing, delete its CHECK_OVERRIDES entry and this
	// assertion together.
	assert.equal(packages.get("services/email-render").typecheck, null);
	assert.equal(packages.get("workers/paused").typecheck, null);
});

test("every package in the real workspace gets a test command that will exit", () => {
	// A job that hangs until the runner kills it is a red check with no verdict
	// in it, which is worse than no check at all (#1796).
	const packages = discoverPackages();
	let suites = 0;

	for (const pkg of packages.values()) {
		if (!pkg.hasTests) continue;
		suites++;
		const script = pkg.testCommand === "pnpm test:run" ? pkg.scripts["test:run"] : pkg.scripts.test;
		assert.ok(script, `${pkg.dir} is in the matrix with no test script`);
		assert.equal(isOneShot(script), true, `${pkg.dir} would not exit in CI: ${script}`);
	}

	assert.ok(suites > 0, "the workspace should have test suites");
});
