// tests/prism-contrast.test.ts
// WCAG contrast validation for all Prism curated themes and status colors
//
// Ensures CI catches contrast regressions when theme colors change.
// Reference: docs/specs/prism-spec.md — PRZ-003, PRZ-006

import { describe, it, expect } from "vitest";
import { getContrastRatio, meetsWCAGAA, validateThemeContrast } from "../src/lib/utils/contrast.js";
import { themeList } from "../src/lib/themes/registry.js";
import { status, semantic } from "../src/lib/tokens/colors.js";

describe("Prism Theme Contrast Validation", () => {
	describe("all curated themes pass WCAG AA", () => {
		for (const theme of themeList) {
			describe(theme.name, () => {
				it("foreground/background meets WCAG AA (4.5:1)", () => {
					const ratio = getContrastRatio(theme.colors.foreground, theme.colors.background);
					expect(
						ratio,
						`${theme.id}: foreground on background is ${ratio.toFixed(2)}:1`,
					).toBeGreaterThanOrEqual(4.5);
				});

				it("foreground/surface meets WCAG AA (4.5:1)", () => {
					const ratio = getContrastRatio(theme.colors.foreground, theme.colors.surface);
					expect(
						ratio,
						`${theme.id}: foreground on surface is ${ratio.toFixed(2)}:1`,
					).toBeGreaterThanOrEqual(4.5);
				});

				it("foregroundMuted/background meets large text minimum (3:1)", () => {
					const ratio = getContrastRatio(theme.colors.foregroundMuted, theme.colors.background);
					expect(
						ratio,
						`${theme.id}: muted on background is ${ratio.toFixed(2)}:1`,
					).toBeGreaterThanOrEqual(3);
				});

				it("passes validateThemeContrast()", () => {
					const result = validateThemeContrast(theme);
					expect(result.valid, result.error ?? "").toBe(true);
				});
			});
		}
	});

	describe("night-garden (dark theme) contrast", () => {
		const nightGarden = themeList.find((t) => t.id === "night-garden");

		it("exists in registry", () => {
			expect(nightGarden).toBeDefined();
		});

		it("foreground/background meets WCAG AA", () => {
			if (!nightGarden) return;
			const ratio = getContrastRatio(nightGarden.colors.foreground, nightGarden.colors.background);
			expect(ratio).toBeGreaterThanOrEqual(4.5);
		});

		it("foregroundMuted/background meets large text minimum", () => {
			if (!nightGarden) return;
			const ratio = getContrastRatio(
				nightGarden.colors.foregroundMuted,
				nightGarden.colors.background,
			);
			expect(ratio).toBeGreaterThanOrEqual(3);
		});
	});

	describe("status color contrast", () => {
		const statusColors = [
			{ name: "success", fg: status.success.foreground, bg: status.success.light },
			{ name: "warning", fg: status.warning.foreground, bg: status.warning.light },
			{ name: "error", fg: status.error.foreground, bg: status.error.light },
			{ name: "info", fg: status.info.foreground, bg: status.info.light },
		];

		for (const { name, fg, bg } of statusColors) {
			it(`${name}: foreground/light meets WCAG AA (4.5:1)`, () => {
				const ratio = getContrastRatio(fg, bg);
				expect(
					ratio,
					`status.${name}: ${fg} on ${bg} is ${ratio.toFixed(2)}:1`,
				).toBeGreaterThanOrEqual(4.5);
			});
		}
	});

	describe("semantic primary contrast", () => {
		it("primary.foreground/primary.DEFAULT meets large text / UI component minimum (3:1)", () => {
			// Primary buttons use bold text, so WCAG large text threshold (3:1) applies
			const ratio = getContrastRatio(semantic.primary.foreground, semantic.primary.DEFAULT);
			expect(
				ratio,
				`primary: ${semantic.primary.foreground} on ${semantic.primary.DEFAULT} is ${ratio.toFixed(2)}:1`,
			).toBeGreaterThanOrEqual(3);
		});

		it("foreground/background meets WCAG AA", () => {
			expect(meetsWCAGAA(semantic.foreground, semantic.background)).toBe(true);
		});

		it("muted.foreground/muted.DEFAULT meets large text minimum (3:1)", () => {
			const ratio = getContrastRatio(semantic.muted.foreground, semantic.muted.DEFAULT);
			expect(ratio).toBeGreaterThanOrEqual(3);
		});
	});
});
