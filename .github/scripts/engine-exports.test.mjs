/**
 * Tests for engine-exports.mjs.
 *
 * The question this module answers is narrow and expensive to get wrong: given
 * a changed file inside the engine, which of the package's 144 subpath exports
 * can make it visible to a consumer? Under-answering ships a broken import with
 * green checks (#1786), so the cases that matter are the shapes that widen:
 * the root barrel, a wildcard subpath, and anything unattributable.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
	exposedBy,
	importedSpecifiers,
	loadEngineSurface,
	specifierMatches,
} from "./engine-exports.mjs";

// ─── Fixtures ───────────────────────────────────────────────────────

/** Build a throwaway workspace on disk and return its root. */
function workspace(files) {
	const root = mkdtempSync(join(tmpdir(), "engine-exports-"));
	for (const [path, content] of Object.entries(files)) {
		const abs = join(root, path);
		mkdirSync(dirname(abs), { recursive: true });
		writeFileSync(abs, typeof content === "string" ? content : JSON.stringify(content));
	}
	return root;
}

const ENGINE_EXPORTS = {
	".": { types: "./dist/index.d.ts", default: "./dist/index.js" },
	"./ui": { types: "./dist/ui/index.d.ts", default: "./dist/ui/index.js" },
	"./ui/*": { types: "./dist/ui/*.d.ts", default: "./dist/ui/*.js" },
	"./ui/*.svelte": { types: "./dist/ui/*.svelte.d.ts", default: "./dist/ui/*.svelte" },
	"./styles/tokens.css": { default: "./dist/styles/tokens.css" },
	"./styles/*": { default: "./dist/styles/*" },
	"./platform/config": {
		types: "./dist/platform/config/index.d.ts",
		default: "./dist/platform/config/index.js",
	},
	"./platform/config/*": {
		types: "./dist/platform/config/*.d.ts",
		default: "./dist/platform/config/*.js",
	},
	"./server/*": { types: "./dist/server/*.d.ts", default: "./dist/server/*.js" },
};

/**
 * The smallest engine that behaves like the real one: a root barrel that
 * re-exports `ui` wholesale, a `platform/config` barrel that re-exports its
 * files, and wildcard subpaths that make a file importable without any barrel.
 */
function engineWorkspace(overrides = {}) {
	return workspace({
		"libs/engine/package.json": { name: "@autumnsgrove/lattice", exports: ENGINE_EXPORTS },
		"libs/engine/src/lib/index.ts": [
			'export * from "./ui/index";',
			'export { cn } from "./utils/cn";',
		].join("\n"),
		"libs/engine/src/lib/ui/index.ts": 'export * from "./GlassCard.svelte";',
		"libs/engine/src/lib/ui/GlassCard.svelte": "<div />",
		"libs/engine/src/lib/utils/cn.ts": "export const cn = () => '';",
		"libs/engine/src/lib/private/helper.ts": "export type Thing = string;",
		"libs/engine/src/lib/platform/config/index.ts": [
			'export * from "./tiers.js";',
			'export * from "./domain-blocklist.js";',
		].join("\n"),
		"libs/engine/src/lib/platform/config/tiers.ts": "export const TIERS = {};",
		"libs/engine/src/lib/platform/config/domain-blocklist.ts": "export const BLOCKED = [];",
		"libs/engine/src/lib/platform/config/unbarrelled.ts": "export const X = 1;",
		"libs/engine/src/lib/server/internal.ts": "export const internal = 1;",
		"libs/engine/src/lib/styles/tokens.css": ":root { --grove: green; }",
		"libs/engine/src/lib/styles/fonts.css": "@font-face { }",
		...overrides,
	});
}

function withSurface(root, fn) {
	try {
		return fn(loadEngineSurface(root), root);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
}

const exposed = (surface, path) => [...exposedBy(surface, path)].sort();

// ─── Reading the surface ────────────────────────────────────────────

test("a package with no readable exports map has no surface", () => {
	const root = workspace({ "libs/engine/package.json": { name: "@autumnsgrove/lattice" } });
	try {
		assert.equal(loadEngineSurface(root), null);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("each exact subpath resolves to its own source entry", () => {
	const root = engineWorkspace();
	withSurface(root, (surface) => {
		assert.equal(surface.entries.get(".").entry, "libs/engine/src/lib/index.ts");
		assert.equal(
			surface.entries.get("./platform/config").entry,
			"libs/engine/src/lib/platform/config/index.ts",
		);
		assert.equal(surface.entries.get("./ui").entry, "libs/engine/src/lib/ui/index.ts");
	});
});

// ─── What a file is exposed by ──────────────────────────────────────

test("a file re-exported by a subpath barrel is exposed by that subpath", () => {
	const root = engineWorkspace();
	withSurface(root, (surface) => {
		assert.deepEqual(exposed(surface, "libs/engine/src/lib/platform/config/tiers.ts"), [
			"./platform/config",
			"./platform/config/*",
		]);
	});
});

test("a file under a wildcard subpath is importable without any barrel", () => {
	// `unbarrelled.ts` is in no `index.ts`, but `./platform/config/*` addresses it
	// directly, so a consumer can import it and has to be revalidated.
	const root = engineWorkspace();
	withSurface(root, (surface) => {
		assert.deepEqual(exposed(surface, "libs/engine/src/lib/platform/config/unbarrelled.ts"), [
			"./platform/config/*",
		]);
	});
});

test("a wholesale barrel re-export widens a file to the root export", () => {
	// This is the case a grep for the filename would miss: `index.ts` says
	// `export * from "./ui/index"`, so every consumer of the root import sees
	// GlassCard even though its name appears nowhere in index.ts.
	const root = engineWorkspace();
	withSurface(root, (surface) => {
		const keys = exposed(surface, "libs/engine/src/lib/ui/GlassCard.svelte");
		assert.ok(keys.includes("."), `expected the root export, got ${keys.join(", ")}`);
	});
});

test("the root barrel itself is exposed by the root export", () => {
	const root = engineWorkspace();
	withSurface(root, (surface) => {
		assert.deepEqual(exposed(surface, "libs/engine/src/lib/index.ts"), ["."]);
	});
});

test("a file nothing re-exports and no subpath addresses is internal", () => {
	// Nothing outside the engine can name it, so no consumer's types can move.
	const root = engineWorkspace();
	withSurface(root, (surface) => {
		assert.deepEqual(exposed(surface, "libs/engine/src/lib/private/helper.ts"), []);
	});
});

test("a file outside src/lib cannot be attributed, so it is global", () => {
	const root = engineWorkspace();
	withSurface(root, (surface) => {
		assert.deepEqual(exposed(surface, "libs/engine/package.json"), ["*"]);
		assert.deepEqual(exposed(surface, "libs/engine/vite.config.ts"), ["*"]);
	});
});

test("re-exports are followed, imports are not", () => {
	// If plain imports widened the surface, the root barrel would reach every
	// helper in the tree and #1786 would be back to revalidating 27 packages.
	const root = engineWorkspace({
		"libs/engine/src/lib/ui/index.ts": [
			'import "./side-effect.js";',
			'export * from "./GlassCard.svelte";',
		].join("\n"),
		"libs/engine/src/lib/ui/side-effect.ts": "export const effect = 1;",
	});
	withSurface(root, (surface) => {
		assert.ok(exposed(surface, "libs/engine/src/lib/ui/GlassCard.svelte").includes("."));
		assert.deepEqual(exposed(surface, "libs/engine/src/lib/ui/side-effect.ts"), ["./ui/*"]);
	});
});

test("a `$lib` re-export is followed, not treated as unresolvable", () => {
	// The real engine does this: `server/petal/types.ts` says
	// `export type { PetalCategory } from "$lib/types/petal"`. Dropping aliased
	// re-exports made those types look internal while they sat on a public subpath,
	// so a type change there reached no consumer at all.
	const root = engineWorkspace({
		"libs/engine/src/lib/types/petal.ts": "export type PetalCategory = string;",
		"libs/engine/src/lib/server/petal/index.ts":
			'export type { PetalCategory } from "$lib/types/petal";',
	});
	withSurface(root, (surface) => {
		assert.deepEqual(exposed(surface, "libs/engine/src/lib/types/petal.ts"), ["./server/*"]);
		assert.equal(surface.partial, false);
	});
});

test("a local re-export that cannot be resolved marks the surface partial", () => {
	// We started walking and lost the trail, so the real surface is larger than
	// what we found. Guessing it is smaller is how a broken import ships green.
	const root = engineWorkspace({
		"libs/engine/src/lib/platform/config/index.ts":
			'export * from "./tiers.js";\nexport * from "./gone.js";',
	});
	withSurface(root, (surface) => {
		assert.equal(surface.partial, true);
		// A file nothing names now widens instead of being called internal.
		assert.deepEqual(exposed(surface, "libs/engine/src/lib/private/helper.ts"), ["*"]);
	});
});

test("an exact subpath with no source here is not uncertainty", () => {
	// `./payments` in the real map points at a directory that no longer exists.
	// That says nothing about any other file, so it must not globalise the tree.
	const root = engineWorkspace({
		"libs/engine/package.json": {
			name: "@autumnsgrove/lattice",
			exports: { ...ENGINE_EXPORTS, "./gone": { default: "./dist/gone/index.js" } },
		},
	});
	withSurface(root, (surface) => {
		assert.equal(surface.partial, false);
		assert.deepEqual(exposed(surface, "libs/engine/src/lib/private/helper.ts"), []);
	});
});

test("an imported internal module inherits the exposure of its importer", () => {
	// The dependency runs backwards here: a public barrel importing a private
	// module puts that module's declarations in the barrel's emitted `.d.ts` as an
	// un-nameable reference, so its types still reach consumers.
	const root = engineWorkspace({
		"libs/engine/src/lib/types/friend.ts": "export type Friend = { name: string };",
		"libs/engine/src/lib/ui/FriendCard.svelte":
			'<script lang="ts">import type { Friend } from "$lib/types/friend";</script>',
		"libs/engine/src/lib/ui/index.ts":
			'export * from "./GlassCard.svelte";\nexport * from "./FriendCard.svelte";',
	});
	withSurface(root, (surface) => {
		const keys = exposed(surface, "libs/engine/src/lib/types/friend.ts");
		assert.ok(keys.includes("."), `expected the root export, got ${keys.join(", ")}`);
	});
});

test("a file imported by nothing public is still internal", () => {
	const root = engineWorkspace({
		"libs/engine/src/lib/orphan/helper.ts": "export const orphan = 1;",
	});
	withSurface(root, (surface) => {
		assert.deepEqual(exposed(surface, "libs/engine/src/lib/orphan/helper.ts"), []);
	});
});

// ─── Matching a specifier to an export key ──────────────────────────

test("specifiers match exact keys, wildcards and the root export", () => {
	assert.equal(specifierMatches(".", "."), true);
	assert.equal(specifierMatches("./ui/chrome", "."), false);

	assert.equal(specifierMatches("./platform/config", "./platform/config"), true);
	assert.equal(specifierMatches("./platform/config/tiers", "./platform/config"), false);

	assert.equal(specifierMatches("./platform/config/tiers", "./platform/config/*"), true);
	assert.equal(specifierMatches("./platform/config", "./platform/config/*"), false);
	assert.equal(specifierMatches("./platform/configx", "./platform/config/*"), false);

	// `*` is the "cannot be attributed" key: it matches every import.
	assert.equal(specifierMatches("./anything/at/all", "*"), true);
});

test("a wildcard key with a suffix still requires the suffix", () => {
	assert.equal(specifierMatches("./ui/Foo.svelte", "./ui/*.svelte"), true);
	assert.equal(specifierMatches("./ui/Foo", "./ui/*.svelte"), false);
});

// ─── What a consumer imports ────────────────────────────────────────

test("consumer specifiers are collected in export-key form", () => {
	const root = engineWorkspace({
		"apps/site/package.json": { name: "site" },
		"apps/site/src/a.ts": [
			'import { TIERS } from "@autumnsgrove/lattice/platform/config";',
			'import type { Thing } from "@autumnsgrove/lattice";',
			"const lazy = () => import('@autumnsgrove/lattice/server/internal');",
		].join("\n"),
		"apps/site/src/b.svelte": '<script lang="ts">',
		"apps/site/src/b.svelte.mjs": "",
	});
	try {
		writeFileSync(
			join(root, "apps/site/src/b.svelte"),
			'<script lang="ts">\n\timport { GlassCard } from "@autumnsgrove/lattice/ui";\n</script>\n',
		);
		assert.deepEqual([...importedSpecifiers(root, "apps/site")].sort(), [
			".",
			"./platform/config",
			"./server/internal",
			"./ui",
		]);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("a stylesheet imported for its side effect still counts", () => {
	// `import "@autumnsgrove/lattice/styles/tokens.css"` has no `from`, and both
	// Aspen and Plant pull the engine's design tokens exactly this way. Missing it
	// meant a token change reached neither of them.
	const root = engineWorkspace({
		"apps/site/package.json": { name: "site" },
		"apps/site/src/a.svelte":
			'<script>\n\timport "@autumnsgrove/lattice/styles/tokens.css";\n</script>',
		"apps/site/src/b.css": '@import "@autumnsgrove/lattice/styles/fonts.css";',
		"apps/site/src/c.css": '@import url("@autumnsgrove/lattice/ui/styles/grove.css");',
		"apps/site/src/d.ts": 'import x from "@autumnsgrove/lattice/ui";',
	});
	try {
		assert.deepEqual([...importedSpecifiers(root, "apps/site")].sort(), [
			"./styles/fonts.css",
			"./styles/tokens.css",
			"./ui",
			"./ui/styles/grove.css",
		]);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("a package that imports nothing from the engine has no specifiers", () => {
	const root = engineWorkspace({
		"apps/standalone/package.json": { name: "standalone" },
		"apps/standalone/src/a.ts": 'import { x } from "@autumnsgrove/infra";',
	});
	try {
		assert.deepEqual([...importedSpecifiers(root, "apps/standalone")], []);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("generated output directories are not read as authored imports", () => {
	const root = engineWorkspace({
		"apps/site/package.json": { name: "site" },
		"apps/site/node_modules/@autumnsgrove/lattice/index.js":
			'export * from "@autumnsgrove/lattice/ui";',
		"apps/site/.svelte-kit/generated/a.ts": 'import x from "@autumnsgrove/lattice/ui";',
	});
	try {
		assert.deepEqual([...importedSpecifiers(root, "apps/site")], []);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});
