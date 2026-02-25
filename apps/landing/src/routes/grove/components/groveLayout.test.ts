import { describe, it, expect } from "vitest";
import {
	buildIslandLayouts,
	buildTreesForIsland,
	getTreeSpecies,
	UMBRELLA_DIRS,
	type IslandLayout,
	type TreeLayout,
} from "./groveLayout";
import type { DirectoryEntry } from "../+page.server";

/** Helper to build a minimal annotated directory entry */
function makeDir(
	overrides: Partial<DirectoryEntry & { primaryLanguage: string }> = {},
): DirectoryEntry & { primaryLanguage: string } {
	return {
		path: "libs/engine",
		depth: 1,
		totalLines: 1000,
		tsLines: 500,
		svelteLines: 200,
		jsLines: 100,
		cssLines: 50,
		pyLines: 0,
		goLines: 0,
		sqlLines: 0,
		shLines: 0,
		tsxLines: 0,
		mdLines: 0,
		otherLines: 0,
		primaryLanguage: "ts",
		...overrides,
	};
}

describe("groveLayout", () => {
	describe("getTreeSpecies", () => {
		it("maps svelte to cherry", () => {
			expect(getTreeSpecies("svelte")).toBe("cherry");
		});

		it("maps ts to pine", () => {
			expect(getTreeSpecies("ts")).toBe("pine");
		});

		it("maps py to aspen", () => {
			expect(getTreeSpecies("py")).toBe("aspen");
		});

		it("maps go to birch", () => {
			expect(getTreeSpecies("go")).toBe("birch");
		});

		it("maps md to logo", () => {
			expect(getTreeSpecies("md")).toBe("logo");
		});

		it("maps unknown languages to pine", () => {
			expect(getTreeSpecies("rust")).toBe("pine");
			expect(getTreeSpecies("")).toBe("pine");
		});
	});

	describe("buildIslandLayouts", () => {
		it("returns empty array for empty directories", () => {
			expect(buildIslandLayouts([])).toEqual([]);
		});

		it("creates islands from depth-1 directories", () => {
			const dirs = [
				makeDir({ path: "libs/engine", depth: 1, totalLines: 5000 }),
				makeDir({ path: "apps/landing", depth: 1, totalLines: 3000 }),
			];
			const islands = buildIslandLayouts(dirs);
			expect(islands).toHaveLength(2);
			expect(islands.map((i) => i.path)).toContain("libs/engine");
			expect(islands.map((i) => i.path)).toContain("apps/landing");
		});

		it("excludes depth-1 directories with zero lines", () => {
			const dirs = [
				makeDir({ path: "libs/engine", depth: 1, totalLines: 5000 }),
				makeDir({ path: "libs/empty", depth: 1, totalLines: 0 }),
			];
			const islands = buildIslandLayouts(dirs);
			expect(islands).toHaveLength(1);
			expect(islands[0].path).toBe("libs/engine");
		});

		it("creates umbrella island from depth-0 dir in UMBRELLA_DIRS", () => {
			const dirs = [
				makeDir({ path: "docs", depth: 0, totalLines: 10000 }),
				makeDir({ path: "docs/specs", depth: 1, totalLines: 5000 }),
				makeDir({ path: "docs/plans", depth: 1, totalLines: 3000 }),
			];
			const islands = buildIslandLayouts(dirs);
			// Should have 1 umbrella island, NOT 2 child islands
			expect(islands).toHaveLength(1);
			expect(islands[0].path).toBe("docs");
			expect(islands[0].name).toBe("docs");
		});

		it("absorbs depth-1 children of umbrella dirs", () => {
			const dirs = [
				makeDir({ path: "workers", depth: 0, totalLines: 5000 }),
				makeDir({ path: "workers/warden", depth: 1, totalLines: 2000 }),
				makeDir({ path: "workers/lumen", depth: 1, totalLines: 1500 }),
				makeDir({ path: "libs/engine", depth: 1, totalLines: 8000 }),
			];
			const islands = buildIslandLayouts(dirs);
			const paths = islands.map((i) => i.path);
			expect(paths).toContain("workers");
			expect(paths).toContain("libs/engine");
			expect(paths).not.toContain("workers/warden");
			expect(paths).not.toContain("workers/lumen");
		});

		it("does NOT absorb depth-1 children of non-umbrella dirs like libs", () => {
			const dirs = [
				makeDir({ path: "libs", depth: 0, totalLines: 10000 }),
				makeDir({ path: "libs/engine", depth: 1, totalLines: 5000 }),
				makeDir({ path: "libs/foliage", depth: 1, totalLines: 3000 }),
			];
			const islands = buildIslandLayouts(dirs);
			const paths = islands.map((i) => i.path);
			// libs is not an umbrella dir, so its children become individual islands
			expect(paths).toContain("libs/engine");
			expect(paths).toContain("libs/foliage");
			expect(paths).not.toContain("libs");
		});

		it("assigns known positions for predefined packages", () => {
			const dirs = [makeDir({ path: "libs/engine", depth: 1, totalLines: 5000 })];
			const islands = buildIslandLayouts(dirs);
			expect(islands[0].x).toBe(35);
			expect(islands[0].y).toBe(28);
		});

		it("auto-positions unknown packages instead of piling at center", () => {
			const dirs = [makeDir({ path: "libs/unknown-new-pkg", depth: 1, totalLines: 100 })];
			const islands = buildIslandLayouts(dirs);
			// Should not be exactly at center default (50, 50)
			// Auto-position is hash-based and deterministic
			expect(islands[0].x).toBeGreaterThanOrEqual(10);
			expect(islands[0].x).toBeLessThanOrEqual(90);
			expect(islands[0].y).toBeGreaterThanOrEqual(20);
			expect(islands[0].y).toBeLessThanOrEqual(75);
		});

		it("auto-position is deterministic for the same path", () => {
			const dirs = [makeDir({ path: "libs/brand-new", depth: 1, totalLines: 100 })];
			const a = buildIslandLayouts(dirs);
			const b = buildIslandLayouts(dirs);
			expect(a[0].x).toBe(b[0].x);
			expect(a[0].y).toBe(b[0].y);
		});

		it("scales island width with line count", () => {
			const small = buildIslandLayouts([
				makeDir({ path: "libs/engine", depth: 1, totalLines: 100 }),
			]);
			const large = buildIslandLayouts([
				makeDir({ path: "libs/engine", depth: 1, totalLines: 50000 }),
			]);
			expect(large[0].width).toBeGreaterThan(small[0].width);
		});

		it("extracts display name from path", () => {
			const dirs = [makeDir({ path: "apps/landing", depth: 1, totalLines: 1000 })];
			const islands = buildIslandLayouts(dirs);
			expect(islands[0].name).toBe("landing");
		});
	});

	describe("buildTreesForIsland", () => {
		it("returns empty array when island has no lines", () => {
			const dirs = [makeDir({ path: "libs/engine", depth: 1, totalLines: 0 })];
			const trees = buildTreesForIsland("libs/engine", dirs);
			expect(trees).toEqual([]);
		});

		it("creates a single tree when no depth-2 children exist", () => {
			const dirs = [makeDir({ path: "libs/engine", depth: 1, totalLines: 5000 })];
			const trees = buildTreesForIsland("libs/engine", dirs);
			expect(trees).toHaveLength(1);
			expect(trees[0].id).toBe("libs/engine");
			expect(trees[0].x).toBe(0.5);
		});

		it("creates trees from depth-2 children with >50 lines", () => {
			const dirs = [
				makeDir({ path: "libs/engine", depth: 1, totalLines: 5000 }),
				makeDir({
					path: "libs/engine/src/ui",
					depth: 2,
					totalLines: 2000,
					primaryLanguage: "svelte",
				}),
				makeDir({
					path: "libs/engine/src/server",
					depth: 2,
					totalLines: 1500,
					primaryLanguage: "ts",
				}),
				makeDir({
					path: "libs/engine/src/tiny",
					depth: 2,
					totalLines: 20,
					primaryLanguage: "ts",
				}),
			];
			const trees = buildTreesForIsland("libs/engine", dirs);
			// Should include the two >50 lines children, not the tiny one
			expect(trees).toHaveLength(2);
			expect(trees.map((t) => t.id)).toContain("libs/engine/src/ui");
			expect(trees.map((t) => t.id)).toContain("libs/engine/src/server");
		});

		it("umbrella island uses depth-1 children as trees", () => {
			const dirs = [
				makeDir({ path: "docs", depth: 0, totalLines: 50000 }),
				makeDir({ path: "docs/specs", depth: 1, totalLines: 10000, primaryLanguage: "md" }),
				makeDir({ path: "docs/plans", depth: 1, totalLines: 8000, primaryLanguage: "md" }),
				makeDir({ path: "docs/tiny", depth: 1, totalLines: 20, primaryLanguage: "md" }),
			];
			const trees = buildTreesForIsland("docs", dirs);
			expect(trees).toHaveLength(2);
			expect(trees.map((t) => t.id)).toContain("docs/specs");
			expect(trees.map((t) => t.id)).toContain("docs/plans");
			expect(trees.map((t) => t.id)).not.toContain("docs/tiny");
		});

		it("limits trees to maxTrees parameter", () => {
			const dirs = [
				makeDir({ path: "libs/engine", depth: 1, totalLines: 10000 }),
				...Array.from({ length: 15 }, (_, i) =>
					makeDir({
						path: `libs/engine/src/dir${i}`,
						depth: 2,
						totalLines: 100 + i * 50,
						primaryLanguage: "ts",
					}),
				),
			];
			const trees = buildTreesForIsland("libs/engine", dirs, 5);
			expect(trees).toHaveLength(5);
		});

		it("sorts trees by line count (largest first)", () => {
			const dirs = [
				makeDir({ path: "libs/engine", depth: 1, totalLines: 5000 }),
				makeDir({ path: "libs/engine/src/small", depth: 2, totalLines: 100 }),
				makeDir({ path: "libs/engine/src/large", depth: 2, totalLines: 3000 }),
				makeDir({ path: "libs/engine/src/medium", depth: 2, totalLines: 500 }),
			];
			const trees = buildTreesForIsland("libs/engine", dirs);
			expect(trees[0].id).toBe("libs/engine/src/large");
		});

		it("maps species based on primary language", () => {
			const dirs = [
				makeDir({ path: "libs/engine", depth: 1, totalLines: 5000 }),
				makeDir({
					path: "libs/engine/src/ui",
					depth: 2,
					totalLines: 2000,
					primaryLanguage: "svelte",
				}),
			];
			const trees = buildTreesForIsland("libs/engine", dirs);
			expect(trees[0].species).toBe("cherry");
		});

		it("spaces trees evenly across x-axis", () => {
			const dirs = [
				makeDir({ path: "libs/engine", depth: 1, totalLines: 5000 }),
				makeDir({ path: "libs/engine/src/a", depth: 2, totalLines: 1000 }),
				makeDir({ path: "libs/engine/src/b", depth: 2, totalLines: 1000 }),
				makeDir({ path: "libs/engine/src/c", depth: 2, totalLines: 1000 }),
			];
			const trees = buildTreesForIsland("libs/engine", dirs);
			// 3 trees: positions should be 1/4, 2/4, 3/4
			expect(trees[0].x).toBeCloseTo(0.25, 2);
			expect(trees[1].x).toBeCloseTo(0.5, 2);
			expect(trees[2].x).toBeCloseTo(0.75, 2);
		});

		it("does not include children from other islands", () => {
			const dirs = [
				makeDir({ path: "libs/engine", depth: 1, totalLines: 5000 }),
				makeDir({ path: "apps/landing", depth: 1, totalLines: 3000 }),
				makeDir({ path: "apps/landing/src/routes", depth: 2, totalLines: 2000 }),
			];
			const trees = buildTreesForIsland("libs/engine", dirs);
			// Should have 1 tree (the island itself), not include landing's children
			expect(trees).toHaveLength(1);
			expect(trees[0].id).toBe("libs/engine");
		});
	});
});
