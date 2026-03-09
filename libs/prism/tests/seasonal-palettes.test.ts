// tests/seasonal-palettes.test.ts
// Validates seasonal palette structure and color values

import { describe, it, expect } from "vitest";
import { SEASONAL_PALETTES, type SeasonalPalette } from "../src/lib/tokens/seasons.js";

const SEASONS = ["spring", "summer", "autumn", "winter"] as const;
const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;

describe("Seasonal Palettes", () => {
	it("should define all four seasons", () => {
		for (const season of SEASONS) {
			expect(SEASONAL_PALETTES[season]).toBeDefined();
		}
	});

	for (const season of SEASONS) {
		describe(season, () => {
			const palette: SeasonalPalette = SEASONAL_PALETTES[season];

			it("should have primary, accent, secondary, highlight", () => {
				expect(palette.primary).toBeDefined();
				expect(palette.accent).toBeDefined();
				expect(palette.secondary).toBeDefined();
				expect(palette.highlight).toBeDefined();
			});

			it("should use valid hex colors", () => {
				expect(palette.primary).toMatch(HEX_PATTERN);
				expect(palette.accent).toMatch(HEX_PATTERN);
				expect(palette.secondary).toMatch(HEX_PATTERN);
				expect(palette.highlight).toMatch(HEX_PATTERN);
			});

			it("should have distinct colors (no duplicates)", () => {
				const colors = [palette.primary, palette.accent, palette.secondary, palette.highlight];
				const unique = new Set(colors);
				expect(unique.size).toBe(4);
			});
		});
	}
});
