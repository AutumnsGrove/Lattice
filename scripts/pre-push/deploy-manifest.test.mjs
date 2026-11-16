import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseShim, buildMatrix, detectDrift } from "./deploy-manifest.mjs";

describe("parseShim", () => {
	test("parses a minimal worker shim", () => {
		const yaml = `name: Deploy Patina

on:
  push:
    branches: [main]
    paths:
      - "workers/patina/**"
  workflow_dispatch:

jobs:
  deploy:
    uses: ./.github/workflows/_deploy-worker.yml
    with:
      worker-dir: workers/patina
    secrets: inherit
`;
		const s = parseShim(yaml, "/fake/deploy-patina.yml");
		assert.equal(s.kind, "worker");
		assert.equal(s.service, "patina");
		assert.equal(s.path, "workers/patina");
		assert.equal(s.template, "./.github/workflows/_deploy-worker.yml");
		assert.deepEqual(s.triggers.paths, ["workers/patina/**"]);
		assert.equal(s.triggers.workflowDispatch, true);
	});

	test("parses a pages shim with project-name", () => {
		const yaml = `name: Deploy Domains

on:
  push:
    branches: [main]
    paths:
      - "apps/domains/**"
      - "libs/engine/**"
  workflow_dispatch:

jobs:
  deploy:
    uses: ./.github/workflows/_deploy-pages.yml
    with:
      app-dir: apps/domains
      project-name: forage
      needs-engine: true
    secrets: inherit
`;
		const s = parseShim(yaml, "/fake/deploy-domains.yml");
		assert.equal(s.kind, "pages");
		assert.equal(s.path, "apps/domains");
		assert.equal(s.with["project-name"], "forage");
		assert.equal(s.with["needs-engine"], true);
		assert.deepEqual(s.triggers.paths, ["apps/domains/**", "libs/engine/**"]);
	});

	test("detects destructive migrations + pre-deploy flags", () => {
		const yaml = `jobs:
  deploy:
    uses: ./.github/workflows/_deploy-worker.yml
    with:
      worker-dir: apps/landing
      run-migrations: true
      migration-db: grove-engine-db
      pre-deploy-command: "pnpm run kb:sync"
    secrets: inherit
`;
		const s = parseShim(yaml, "/fake/deploy-landing.yml");
		assert.equal(s.destructive.migrations, true);
		assert.equal(s.destructive.preDeploy, true);
		assert.equal(s.with["migration-db"], "grove-engine-db");
		assert.equal(s.with["pre-deploy-command"], "pnpm run kb:sync");
	});

	test("parses boolean flags correctly", () => {
		const yaml = `jobs:
  deploy:
    uses: ./.github/workflows/_deploy-worker.yml
    with:
      worker-dir: apps/ivy
      needs-engine: true
      needs-foliage: true
      run-build: true
    secrets: inherit
`;
		const s = parseShim(yaml, "/fake/deploy-ivy.yml");
		assert.equal(s.with["needs-engine"], true);
		assert.equal(s.with["needs-foliage"], true);
		assert.equal(s.with["run-build"], true);
	});

	test("non-shim custom workflow is marked kind:custom", () => {
		const yaml = `name: Build & Migrate Engine

on:
  push:
    branches: [main]
    paths:
      - "libs/engine/**"
  workflow_dispatch:

jobs:
  build-and-migrate:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v5
`;
		const s = parseShim(yaml, "/fake/deploy-engine.yml");
		assert.equal(s.kind, "custom");
		assert.equal(s.template, null);
		assert.equal(s.service, "engine");
		// Custom shims infer path from the first monorepo trigger for drift detection
		assert.equal(s.path, "libs/engine");
	});

	test("strips inline comments in path block", () => {
		const yaml = `on:
  push:
    branches: [main]
    paths:
      - "apps/amber/**"
      # Amber imports from lattice (engine), prism (icons).
      - "libs/engine/**"
      - "libs/prism/**"

jobs:
  deploy:
    uses: ./.github/workflows/_deploy-pages.yml
    with:
      app-dir: apps/amber
      project-name: amber
    secrets: inherit
`;
		const s = parseShim(yaml, "/fake/deploy-amber.yml");
		assert.deepEqual(s.triggers.paths, ["apps/amber/**", "libs/engine/**", "libs/prism/**"]);
	});
});

describe("buildMatrix", () => {
	test("excludes custom-kind shims", () => {
		const shims = [
			{
				kind: "custom",
				path: null,
				service: "engine",
				with: {},
				destructive: { migrations: false, preDeploy: false },
			},
			{
				kind: "worker",
				path: "apps/aspen",
				service: "aspen",
				with: { "needs-engine": true },
				destructive: { migrations: false, preDeploy: false },
			},
		];
		const m = buildMatrix(shims);
		assert.equal(m.length, 1);
		assert.equal(m[0].name, "aspen");
		assert.equal(m[0]["needs-engine"], true);
	});

	test("propagates destructive flags as skip-* entries", () => {
		const shims = [
			{
				kind: "worker",
				path: "apps/landing",
				service: "landing",
				with: {},
				destructive: { migrations: true, preDeploy: true },
			},
		];
		const m = buildMatrix(shims);
		assert.equal(m[0]["skip-migrations"], true);
		assert.equal(m[0]["skip-pre-deploy"], true);
	});
});

describe("detectDrift", () => {
	test("flags wrangler.toml with no matching shim", () => {
		const shims = [{ path: "apps/aspen", file: "deploy-aspen.yml" }];
		const wranglers = [
			{ dir: "apps/aspen", path: "apps/aspen/wrangler.toml", name: "aspen" },
			{ dir: "apps/orphan", path: "apps/orphan/wrangler.toml", name: "orphan" },
		];
		const d = detectDrift(shims, wranglers);
		assert.equal(d.orphanedWrangler.length, 1);
		assert.equal(d.orphanedWrangler[0].dir, "apps/orphan");
	});

	test("flags shim pointing to nonexistent wrangler.toml", () => {
		const shims = [{ path: "apps/ghost", file: "deploy-ghost.yml" }];
		const d = detectDrift(shims, []);
		assert.equal(d.missingWrangler.length, 1);
		assert.equal(d.missingWrangler[0].shim, "deploy-ghost.yml");
	});

	test("no drift when everything matches", () => {
		const shims = [{ path: "apps/aspen", file: "deploy-aspen.yml" }];
		const wranglers = [{ dir: "apps/aspen", path: "apps/aspen/wrangler.toml", name: "aspen" }];
		const d = detectDrift(shims, wranglers);
		assert.equal(d.missingWrangler.length, 0);
		assert.equal(d.orphanedWrangler.length, 0);
	});
});

describe("detectDrift - path triggers", () => {
	// A real fixture root, not a bare string: the point of these tests is that
	// existsSync actually runs, and an earlier version passed vacuously because
	// its path was filtered out before the stat.
	function makeRepoRoot(dirs) {
		const root = mkdtempSync(join(tmpdir(), "deploy-drift-"));
		for (const dir of dirs) mkdirSync(join(root, dir), { recursive: true });
		return root;
	}

	function shimWith(paths) {
		return {
			path: "workers/lumen",
			file: "deploy-lumen.yml",
			triggers: { paths },
		};
	}

	test("flags a directory trigger that no longer exists", () => {
		// deploy-lumen.yml pointed at libs/engine/src/lib/lumen/** for months
		// after the code moved to ai/lumen/, so the worker never redeployed.
		const root = makeRepoRoot(["workers/lumen", "libs/engine/src/lib/ai/lumen"]);
		const shims = [shimWith(["workers/lumen/**", "libs/engine/src/lib/lumen/**"])];

		const d = detectDrift(shims, [], root);

		assert.equal(d.stalePath.length, 1);
		assert.equal(d.stalePath[0].pattern, "libs/engine/src/lib/lumen/**");
	});

	test("accepts a directory trigger that exists", () => {
		const root = makeRepoRoot(["workers/lumen", "docs"]);
		const shims = [shimWith(["workers/lumen/**", "docs/**"])];

		const d = detectDrift(shims, [], root);

		assert.equal(d.stalePath.length, 0);
	});

	test("flags a moved folder anywhere in the tree, not just under workers/", () => {
		const root = makeRepoRoot(["apps/aspen"]);
		const shims = [shimWith(["apps/aspen/**", "docs/security/**", "scripts/**"])];

		const d = detectDrift(shims, [], root);

		assert.deepEqual(
			d.stalePath.map((s) => s.dir),
			["docs/security", "scripts"],
		);
	});

	test("ignores triggers that cannot be reduced to a directory", () => {
		const root = makeRepoRoot([]);
		const shims = [shimWith(["package.json", "**/*.md", "apps/*/src/**", "!apps/ignored/**"])];

		const d = detectDrift(shims, [], root);

		assert.equal(d.stalePath.length, 0);
	});
});
