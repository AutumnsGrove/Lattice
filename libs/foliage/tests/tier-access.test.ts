// tests/tier-access.test.ts
// Integration tests for tier-based access control

import { describe, it, expect } from "vitest";
import { getThemesForTier, getTheme, themes } from "../src/lib/themes/registry.js";
import {
	canAccessTheme,
	hasTierAccess,
	canUseCustomizer,
	canUploadFonts,
	canAccessCommunityThemes,
	getThemeCountForTier,
} from "../src/lib/utils/tier-access.js";
import type { UserTier } from "../src/lib/types.js";

describe("Tier-Based Access Control", () => {
	describe("Theme Access by Tier", () => {
		it("should return no themes for free tier", () => {
			const freeThemes = getThemesForTier("free");
			expect(freeThemes).toHaveLength(0);
		});

		it("should return seedling themes for seedling tier", () => {
			const seedlingThemes = getThemesForTier("seedling");
			expect(seedlingThemes.length).toBeGreaterThan(0);
			expect(seedlingThemes).toHaveLength(3);

			// All returned themes should be seedling tier
			seedlingThemes.forEach((theme) => {
				expect(theme.tier).toBe("seedling");
			});

			// Check specific seedling themes
			const themeIds = seedlingThemes.map((t) => t.id);
			expect(themeIds).toContain("grove");
			expect(themeIds).toContain("minimal");
			expect(themeIds).toContain("night-garden");
		});

		it("should return all themes for sapling+ tiers", () => {
			const saplingThemes = getThemesForTier("sapling");
			const oakThemes = getThemesForTier("oak");
			const evergreenThemes = getThemesForTier("evergreen");

			expect(saplingThemes).toHaveLength(10);
			expect(oakThemes).toHaveLength(10);
			expect(evergreenThemes).toHaveLength(10);

			// All should have the same themes
			expect(saplingThemes.length).toBe(oakThemes.length);
			expect(oakThemes.length).toBe(evergreenThemes.length);
		});

		it("should include seedling themes in sapling tier", () => {
			const saplingThemes = getThemesForTier("sapling");
			const themeIds = saplingThemes.map((t) => t.id);

			// Sapling tier should include seedling themes
			expect(themeIds).toContain("grove");
			expect(themeIds).toContain("minimal");
			expect(themeIds).toContain("night-garden");
		});

		it("should include sapling themes only for sapling+ tiers", () => {
			const seedlingThemes = getThemesForTier("seedling");
			const saplingThemes = getThemesForTier("sapling");

			const seedlingIds = seedlingThemes.map((t) => t.id);
			const saplingIds = saplingThemes.map((t) => t.id);

			// Find a sapling-tier theme
			const saplingTierTheme = Object.values(themes).find((t) => t.tier === "sapling");
			expect(saplingTierTheme).toBeDefined();

			// Seedling tier should not have sapling themes
			expect(seedlingIds).not.toContain(saplingTierTheme!.id);

			// Sapling tier should have sapling themes
			expect(saplingIds).toContain(saplingTierTheme!.id);
		});
	});

	describe("Tier Hierarchy", () => {
		it("should enforce tier hierarchy correctly", () => {
			const tiers: UserTier[] = ["free", "seedling", "sapling", "oak", "evergreen"];

			// Free tier: no themes
			expect(getThemesForTier("free")).toHaveLength(0);

			// Seedling tier: only seedling themes (3)
			const seedlingThemes = getThemesForTier("seedling");
			expect(seedlingThemes).toHaveLength(3);
			expect(seedlingThemes.every((t) => t.tier === "seedling")).toBe(true);

			// Sapling, Oak, Evergreen: all themes (10)
			["sapling", "oak", "evergreen"].forEach((tier) => {
				const tierThemes = getThemesForTier(tier as UserTier);
				expect(tierThemes).toHaveLength(10);
			});
		});

		it("should have correct theme counts per tier", () => {
			expect(getThemeCountForTier("free")).toBe(0);
			expect(getThemeCountForTier("seedling")).toBe(3);
			expect(getThemeCountForTier("sapling")).toBe(10);
			expect(getThemeCountForTier("oak")).toBe(10);
			expect(getThemeCountForTier("evergreen")).toBe(10);
		});

		it("should validate tier access hierarchy", () => {
			// Free has no access
			expect(hasTierAccess("free", "seedling")).toBe(false);
			expect(hasTierAccess("free", "sapling")).toBe(false);

			// Seedling can access seedling
			expect(hasTierAccess("seedling", "seedling")).toBe(true);
			expect(hasTierAccess("seedling", "sapling")).toBe(false);

			// Sapling can access seedling and sapling
			expect(hasTierAccess("sapling", "seedling")).toBe(true);
			expect(hasTierAccess("sapling", "sapling")).toBe(true);

			// Oak can access all
			expect(hasTierAccess("oak", "seedling")).toBe(true);
			expect(hasTierAccess("oak", "sapling")).toBe(true);

			// Evergreen can access all
			expect(hasTierAccess("evergreen", "seedling")).toBe(true);
			expect(hasTierAccess("evergreen", "sapling")).toBe(true);
		});
	});

	describe("Individual Theme Access", () => {
		it("should check individual theme access correctly", () => {
			const groveTheme = getTheme("grove")!;
			const saplingTierTheme = Object.values(themes).find((t) => t.tier === "sapling")!;

			// Free tier cannot access any themes
			expect(canAccessTheme("free", groveTheme)).toBe(false);
			expect(canAccessTheme("free", saplingTierTheme)).toBe(false);

			// Seedling tier can access grove (seedling theme)
			expect(canAccessTheme("seedling", groveTheme)).toBe(true);

			// Seedling tier cannot access sapling themes
			expect(canAccessTheme("seedling", saplingTierTheme)).toBe(false);

			// Sapling tier can access both
			expect(canAccessTheme("sapling", groveTheme)).toBe(true);
			expect(canAccessTheme("sapling", saplingTierTheme)).toBe(true);
		});

		it("should validate access for all seedling themes", () => {
			const seedlingThemes = ["grove", "minimal", "night-garden"];

			seedlingThemes.forEach((themeId) => {
				const theme = getTheme(themeId)!;

				// Seedling tier can access
				expect(canAccessTheme("seedling", theme)).toBe(true);

				// Higher tiers can also access
				expect(canAccessTheme("sapling", theme)).toBe(true);
				expect(canAccessTheme("oak", theme)).toBe(true);
				expect(canAccessTheme("evergreen", theme)).toBe(true);

				// Free tier cannot access
				expect(canAccessTheme("free", theme)).toBe(false);
			});
		});

		it("should validate access for sapling tier themes", () => {
			const saplingTierThemes = Object.values(themes).filter((t) => t.tier === "sapling");
			expect(saplingTierThemes.length).toBeGreaterThan(0);

			saplingTierThemes.forEach((theme) => {
				// Free and seedling cannot access
				expect(canAccessTheme("free", theme)).toBe(false);
				expect(canAccessTheme("seedling", theme)).toBe(false);

				// Sapling and above can access
				expect(canAccessTheme("sapling", theme)).toBe(true);
				expect(canAccessTheme("oak", theme)).toBe(true);
				expect(canAccessTheme("evergreen", theme)).toBe(true);
			});
		});

		it("should handle all 10 themes correctly", () => {
			const allThemeIds = [
				"grove",
				"minimal",
				"night-garden",
				"zine",
				"moodboard",
				"typewriter",
				"solarpunk",
				"cozy-cabin",
				"ocean",
				"wildflower",
			];

			allThemeIds.forEach((themeId) => {
				const theme = getTheme(themeId)!;
				expect(theme).toBeDefined();

				// Verify tier-based access works for each theme
				if (theme.tier === "seedling") {
					expect(canAccessTheme("seedling", theme)).toBe(true);
				} else if (theme.tier === "sapling") {
					expect(canAccessTheme("seedling", theme)).toBe(false);
					expect(canAccessTheme("sapling", theme)).toBe(true);
				}
			});
		});
	});

	describe("Feature Access by Tier", () => {
		it("should restrict theme customizer to oak+ tiers", () => {
			expect(canUseCustomizer("free")).toBe(false);
			expect(canUseCustomizer("seedling")).toBe(false);
			expect(canUseCustomizer("sapling")).toBe(false);
			expect(canUseCustomizer("oak")).toBe(true);
			expect(canUseCustomizer("evergreen")).toBe(true);
		});

		it("should restrict custom font uploads to evergreen tier", () => {
			expect(canUploadFonts("free")).toBe(false);
			expect(canUploadFonts("seedling")).toBe(false);
			expect(canUploadFonts("sapling")).toBe(false);
			expect(canUploadFonts("oak")).toBe(false);
			expect(canUploadFonts("evergreen")).toBe(true);
		});

		it("should restrict community themes to oak+ tiers", () => {
			expect(canAccessCommunityThemes("free")).toBe(false);
			expect(canAccessCommunityThemes("seedling")).toBe(false);
			expect(canAccessCommunityThemes("sapling")).toBe(false);
			expect(canAccessCommunityThemes("oak")).toBe(true);
			expect(canAccessCommunityThemes("evergreen")).toBe(true);
		});
	});

	describe("Theme Distribution Validation", () => {
		it("should have exactly 3 seedling tier themes", () => {
			const seedlingThemes = Object.values(themes).filter((t) => t.tier === "seedling");
			expect(seedlingThemes).toHaveLength(3);

			const seedlingIds = seedlingThemes.map((t) => t.id).sort();
			expect(seedlingIds).toEqual(["grove", "minimal", "night-garden"].sort());
		});

		it("should have exactly 7 sapling tier themes", () => {
			const saplingThemes = Object.values(themes).filter((t) => t.tier === "sapling");
			expect(saplingThemes).toHaveLength(7);
		});

		it("should have all 10 themes accounted for", () => {
			const allThemes = Object.values(themes);
			expect(allThemes).toHaveLength(10);

			const seedlingCount = allThemes.filter((t) => t.tier === "seedling").length;
			const saplingCount = allThemes.filter((t) => t.tier === "sapling").length;

			expect(seedlingCount + saplingCount).toBe(10);
		});

		it("should have unique theme IDs", () => {
			const themeIds = Object.keys(themes);
			const uniqueIds = new Set(themeIds);
			expect(themeIds.length).toBe(uniqueIds.size);
		});
	});

	describe("Edge Cases", () => {
		it("should handle accessing themes with different tier combinations", () => {
			const groveTheme = getTheme("grove")!;
			const tiers: UserTier[] = ["free", "seedling", "sapling", "oak", "evergreen"];

			tiers.forEach((tier) => {
				const hasAccess = canAccessTheme(tier, groveTheme);
				const expectedAccess = tier !== "free";
				expect(hasAccess).toBe(expectedAccess);
			});
		});

		it("should return consistent results for repeated tier checks", () => {
			const theme = getTheme("zine")!;

			// Call multiple times to ensure consistency
			const result1 = canAccessTheme("seedling", theme);
			const result2 = canAccessTheme("seedling", theme);
			const result3 = canAccessTheme("seedling", theme);

			expect(result1).toBe(result2);
			expect(result2).toBe(result3);
		});

		it("should handle theme access for all tier permutations", () => {
			const tiers: UserTier[] = ["free", "seedling", "sapling", "oak", "evergreen"];
			const allThemes = Object.values(themes);

			tiers.forEach((userTier) => {
				allThemes.forEach((theme) => {
					const hasAccess = canAccessTheme(userTier, theme);

					// Validate access logic
					if (userTier === "free") {
						expect(hasAccess).toBe(false);
					} else if (theme.tier === "seedling") {
						expect(hasAccess).toBe(true);
					} else if (theme.tier === "sapling") {
						expect(hasAccess).toBe(userTier !== "seedling");
					}
				});
			});
		});
	});
});
