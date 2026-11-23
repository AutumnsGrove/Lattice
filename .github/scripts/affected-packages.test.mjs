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
		for (const path of [
			"pnpm-lock.yaml",
			"pnpm-workspace.yaml",
			"tsconfig.base.json",
			"package.json",
		]) {
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
