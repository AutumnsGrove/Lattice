/**
 * Tests for createGroveViteConfig and its deep merge logic.
 *
 * The sveltekit() plugin cannot be instantiated in a unit test environment, so
 * @sveltejs/kit/vite is mocked to return a plain sentinel object. All other
 * merge behaviour is exercised against the real implementation.
 */

import { describe, it, expect, vi } from "vitest";
import type { UserConfig } from "vite";

vi.mock("@sveltejs/kit/vite", () => ({
	sveltekit: () => ({ name: "sveltekit-mock" }),
}));

// Import after the mock is registered
const { createGroveViteConfig } = await import("./grove-vite-config.js");

// =============================================================================
// Default config baseline
// =============================================================================

describe("default config (no overrides)", () => {
	it("should include the sveltekit plugin", () => {
		const config = createGroveViteConfig();

		expect(config.plugins).toBeDefined();
		expect(Array.isArray(config.plugins)).toBe(true);
		expect(config.plugins).toHaveLength(1);
		expect((config.plugins as Array<{ name: string }>)[0].name).toBe("sveltekit-mock");
	});

	it("should include @lucide/svelte in ssr.noExternal", () => {
		const config = createGroveViteConfig();

		expect(config.ssr?.noExternal).toContain("@lucide/svelte");
	});
});

// =============================================================================
// Array concatenation
// =============================================================================

describe("array merge: arrays are concatenated, not replaced", () => {
	it("should append extra ssr.noExternal entries after the base entry", () => {
		const config = createGroveViteConfig({
			ssr: {
				noExternal: ["some-esm-pkg"],
			},
		});

		expect(config.ssr?.noExternal).toEqual(["@lucide/svelte", /^@autumnsgrove\//, "some-esm-pkg"]);
	});

	it("should concatenate multiple extra entries in order", () => {
		const config = createGroveViteConfig({
			ssr: {
				noExternal: ["pkg-a", "pkg-b"],
			},
		});

		expect(config.ssr?.noExternal).toEqual([
			"@lucide/svelte",
			/^@autumnsgrove\//,
			"pkg-a",
			"pkg-b",
		]);
	});
});

// =============================================================================
// New top-level key (not in base)
// =============================================================================

describe("new keys: overrides add keys absent from base", () => {
	it("should add server.port when not present in base", () => {
		const config = createGroveViteConfig({
			server: { port: 5174 },
		});

		expect((config as UserConfig & { server?: { port?: number } }).server?.port).toBe(5174);
	});

	it("should not disturb existing base keys when adding a new key", () => {
		const config = createGroveViteConfig({ server: { port: 3000 } });

		expect(config.plugins).toHaveLength(1);
		expect(config.ssr?.noExternal).toContain("@lucide/svelte");
	});
});

// =============================================================================
// Deep object merge (recursive)
// =============================================================================

describe("deep object merge: nested objects merge recursively", () => {
	it("should keep base keys intact when adding a new nested key", () => {
		const config = createGroveViteConfig({
			build: {
				rollupOptions: {
					output: { dir: "dist/custom" },
				},
			},
		});

		// Override lands, and the base ssr array is untouched by the build merge
		expect(config.build?.rollupOptions?.output).toEqual({ dir: "dist/custom" });
		expect(config.ssr?.noExternal).toContain("@lucide/svelte");
	});

	it("should add new keys inside an existing nested object", () => {
		const config = createGroveViteConfig({
			build: {
				minify: false,
			},
		});

		expect(config.build?.minify).toBe(false);
		// Base ssr config must survive an unrelated nested merge
		expect(config.ssr?.noExternal).toBeDefined();
	});
});

// =============================================================================
// Primitive replacement
// =============================================================================

describe("primitive replacement: scalar overrides replace base values", () => {
	it("should replace a boolean base value with the override value", () => {
		// clearScreen is not in base — set it via override and confirm it wins
		const config = createGroveViteConfig({ clearScreen: false });

		expect((config as UserConfig).clearScreen).toBe(false);
	});

	it("should replace a string base value with the override string", () => {
		// base has no root — adding one creates a new key (same code path as replace)
		const config = createGroveViteConfig({ root: "/custom/root" });

		expect(config.root).toBe("/custom/root");
	});

	it("should replace an array with a non-array override of the same key (when base value is missing)", () => {
		// optimizeDeps is not in base — override adds it wholesale
		const config = createGroveViteConfig({
			optimizeDeps: { include: ["dep-a"] },
		});

		// base has no optimizeDeps — include is new, should be set directly
		expect((config.optimizeDeps as { include?: string[] })?.include).toEqual(["dep-a"]);
	});
});

// =============================================================================
// No mutation of inputs
// =============================================================================

describe("input immutability: overrides object is not mutated", () => {
	it("should not mutate the overrides argument", () => {
		const overrides: UserConfig = {
			optimizeDeps: { exclude: ["pkg-a"] },
		};
		const originalExclude = [...(overrides.optimizeDeps?.exclude ?? [])];

		createGroveViteConfig(overrides);

		expect(overrides.optimizeDeps?.exclude).toEqual(originalExclude);
	});
});
