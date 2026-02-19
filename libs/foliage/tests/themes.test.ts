// tests/themes.test.ts
// Theme tests

import { describe, it, expect } from "vitest";
import { themes, getTheme, getThemesForTier } from "../src/lib/themes/registry.js";
import { validateThemeContrast } from "../src/lib/utils/contrast.js";
import type { Theme } from "../src/lib/types.js";

// List of all expected themes
const expectedThemeIds = [
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

// Valid tier values
const validTiers = ["seedling", "sapling"] as const;

// Valid layout types
const validLayoutTypes = [
	"sidebar",
	"no-sidebar",
	"centered",
	"full-width",
	"grid",
	"masonry",
] as const;

// Valid spacing values
const validSpacing = ["compact", "comfortable", "spacious"] as const;

// Helper to validate hex color format
function isValidHexColor(color: string): boolean {
	return /^#([0-9A-Fa-f]{3}){1,2}$/.test(color);
}

// Helper to validate theme structure
function hasRequiredProperties(theme: Theme): boolean {
	return !!(
		theme.id &&
		theme.name &&
		theme.description &&
		theme.thumbnail &&
		theme.tier &&
		theme.colors &&
		theme.fonts &&
		theme.layout
	);
}

describe("Themes", () => {
	describe("Theme Registry", () => {
		it("should export all 10 themes", () => {
			const themeIds = Object.keys(themes);
			expect(themeIds).toHaveLength(10);
			expectedThemeIds.forEach((id) => {
				expect(themeIds).toContain(id);
			});
		});

		it("should return theme by ID", () => {
			const theme = getTheme("grove");
			expect(theme).toBeDefined();
			expect(theme?.id).toBe("grove");

			const nightGarden = getTheme("night-garden");
			expect(nightGarden).toBeDefined();
			expect(nightGarden?.id).toBe("night-garden");
		});

		it("should return undefined for unknown theme ID", () => {
			const theme = getTheme("non-existent-theme");
			expect(theme).toBeUndefined();
		});

		it("should have all themes accessible via registry", () => {
			expectedThemeIds.forEach((id) => {
				const theme = getTheme(id);
				expect(theme).toBeDefined();
				expect(theme?.id).toBe(id);
			});
		});
	});

	describe("Theme Structure", () => {
		it("should have required properties on all themes", () => {
			Object.values(themes).forEach((theme) => {
				expect(hasRequiredProperties(theme)).toBe(true);
				expect(theme.id).toBeTruthy();
				expect(theme.name).toBeTruthy();
				expect(theme.description).toBeTruthy();
				expect(theme.thumbnail).toBeTruthy();
			});
		});

		it("should have valid tier values", () => {
			Object.values(themes).forEach((theme) => {
				expect(validTiers).toContain(theme.tier);
			});
		});

		it("should have valid layout types", () => {
			Object.values(themes).forEach((theme) => {
				expect(validLayoutTypes).toContain(theme.layout.type);
			});
		});

		it("should have valid spacing values", () => {
			Object.values(themes).forEach((theme) => {
				expect(validSpacing).toContain(theme.layout.spacing);
			});
		});

		it("should have valid maxWidth values", () => {
			Object.values(themes).forEach((theme) => {
				expect(theme.layout.maxWidth).toBeTruthy();
				expect(typeof theme.layout.maxWidth).toBe("string");
			});
		});

		it("should have all required color properties", () => {
			Object.values(themes).forEach((theme) => {
				expect(theme.colors.background).toBeTruthy();
				expect(theme.colors.surface).toBeTruthy();
				expect(theme.colors.foreground).toBeTruthy();
				expect(theme.colors.foregroundMuted).toBeTruthy();
				expect(theme.colors.accent).toBeTruthy();
				expect(theme.colors.border).toBeTruthy();
			});
		});

		it("should have valid hex color format for all colors", () => {
			Object.values(themes).forEach((theme) => {
				expect(isValidHexColor(theme.colors.background)).toBe(true);
				expect(isValidHexColor(theme.colors.surface)).toBe(true);
				expect(isValidHexColor(theme.colors.foreground)).toBe(true);
				expect(isValidHexColor(theme.colors.foregroundMuted)).toBe(true);
				expect(isValidHexColor(theme.colors.accent)).toBe(true);
				expect(isValidHexColor(theme.colors.border)).toBe(true);
			});
		});

		it("should have all required font properties", () => {
			Object.values(themes).forEach((theme) => {
				expect(theme.fonts.heading).toBeTruthy();
				expect(theme.fonts.body).toBeTruthy();
				expect(theme.fonts.mono).toBeTruthy();
			});
		});
	});

	describe("Tier Access", () => {
		it("should return 3 themes for seedling tier", () => {
			const seedlingThemes = getThemesForTier("seedling");
			const seedlingThemeIds = seedlingThemes.map((t) => t.id);

			// Should include the 3 seedling themes
			expect(seedlingThemeIds).toContain("grove");
			expect(seedlingThemeIds).toContain("minimal");
			expect(seedlingThemeIds).toContain("night-garden");

			// Seedling tier should only get seedling themes, not sapling
			const hasOnlySeedlingThemes = seedlingThemes.every((theme) => theme.tier === "seedling");
			expect(hasOnlySeedlingThemes).toBe(true);
			expect(seedlingThemes).toHaveLength(3);
		});

		it("should return all 10 themes for sapling tier", () => {
			const saplingThemes = getThemesForTier("sapling");
			expect(saplingThemes).toHaveLength(10);
		});

		it("should return all 10 themes for oak tier", () => {
			const oakThemes = getThemesForTier("oak");
			expect(oakThemes).toHaveLength(10);
		});

		it("should return all 10 themes for evergreen tier", () => {
			const evergreenThemes = getThemesForTier("evergreen");
			expect(evergreenThemes).toHaveLength(10);
		});

		it("should return 0 themes for free tier", () => {
			const freeThemes = getThemesForTier("free");
			expect(freeThemes).toHaveLength(0);
		});

		it("should have exactly 3 seedling tier themes", () => {
			const seedlingThemes = Object.values(themes).filter((theme) => theme.tier === "seedling");
			expect(seedlingThemes).toHaveLength(3);
			expect(seedlingThemes.map((t) => t.id).sort()).toEqual(
				["grove", "minimal", "night-garden"].sort(),
			);
		});

		it("should have exactly 7 sapling tier themes", () => {
			const saplingThemes = Object.values(themes).filter((theme) => theme.tier === "sapling");
			expect(saplingThemes).toHaveLength(7);
		});
	});

	describe("WCAG Contrast Validation", () => {
		describe("Grove Theme", () => {
			it("should pass WCAG AA contrast validation", () => {
				const theme = getTheme("grove")!;
				const result = validateThemeContrast(theme);

				if (!result.valid) {
					console.error(`Grove theme failed validation: ${result.error}`);
				}

				expect(result.valid).toBe(true);
			});
		});

		describe("Minimal Theme", () => {
			it("should pass WCAG AA contrast validation", () => {
				const theme = getTheme("minimal")!;
				const result = validateThemeContrast(theme);

				if (!result.valid) {
					console.error(`Minimal theme failed validation: ${result.error}`);
				}

				expect(result.valid).toBe(true);
			});
		});

		describe("Night Garden Theme", () => {
			it("should pass WCAG AA contrast validation", () => {
				const theme = getTheme("night-garden")!;
				const result = validateThemeContrast(theme);

				if (!result.valid) {
					console.error(`Night Garden theme failed validation: ${result.error}`);
				}

				expect(result.valid).toBe(true);
			});
		});

		describe("Zine Theme", () => {
			it("should pass WCAG AA contrast validation", () => {
				const theme = getTheme("zine")!;
				const result = validateThemeContrast(theme);

				if (!result.valid) {
					console.error(`Zine theme failed validation: ${result.error}`);
				}

				expect(result.valid).toBe(true);
			});
		});

		describe("Moodboard Theme", () => {
			it("should pass WCAG AA contrast validation", () => {
				const theme = getTheme("moodboard")!;
				const result = validateThemeContrast(theme);

				if (!result.valid) {
					console.error(`Moodboard theme failed validation: ${result.error}`);
				}

				expect(result.valid).toBe(true);
			});
		});

		describe("Typewriter Theme", () => {
			it("should pass WCAG AA contrast validation", () => {
				const theme = getTheme("typewriter")!;
				const result = validateThemeContrast(theme);

				if (!result.valid) {
					console.error(`Typewriter theme failed validation: ${result.error}`);
				}

				expect(result.valid).toBe(true);
			});
		});

		describe("Solarpunk Theme", () => {
			it("should pass WCAG AA contrast validation", () => {
				const theme = getTheme("solarpunk")!;
				const result = validateThemeContrast(theme);

				if (!result.valid) {
					console.error(`Solarpunk theme failed validation: ${result.error}`);
				}

				expect(result.valid).toBe(true);
			});
		});

		describe("Cozy Cabin Theme", () => {
			it("should pass WCAG AA contrast validation", () => {
				const theme = getTheme("cozy-cabin")!;
				const result = validateThemeContrast(theme);

				if (!result.valid) {
					console.error(`Cozy Cabin theme failed validation: ${result.error}`);
				}

				expect(result.valid).toBe(true);
			});
		});

		describe("Ocean Theme", () => {
			it("should pass WCAG AA contrast validation", () => {
				const theme = getTheme("ocean")!;
				const result = validateThemeContrast(theme);

				if (!result.valid) {
					console.error(`Ocean theme failed validation: ${result.error}`);
				}

				expect(result.valid).toBe(true);
			});
		});

		describe("Wildflower Theme", () => {
			it("should pass WCAG AA contrast validation", () => {
				const theme = getTheme("wildflower")!;
				const result = validateThemeContrast(theme);

				if (!result.valid) {
					console.error(`Wildflower theme failed validation: ${result.error}`);
				}

				expect(result.valid).toBe(true);
			});
		});

		it("should validate all themes meet WCAG AA contrast requirements", () => {
			const failedThemes: { id: string; error: string }[] = [];

			Object.values(themes).forEach((theme) => {
				const result = validateThemeContrast(theme);
				if (!result.valid) {
					failedThemes.push({ id: theme.id, error: result.error || "Unknown error" });
				}
			});

			if (failedThemes.length > 0) {
				console.error("The following themes failed WCAG AA validation:");
				failedThemes.forEach(({ id, error }) => {
					console.error(`  - ${id}: ${error}`);
				});
			}

			expect(failedThemes).toHaveLength(0);
		});
	});
});
