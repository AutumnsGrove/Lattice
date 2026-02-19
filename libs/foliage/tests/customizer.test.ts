// tests/customizer.test.ts
// Theme customizer tests

import { describe, it, expect } from "vitest";
import {
	generateThemeVariables,
	generateSettingsVariables,
	generateAccentVariations,
} from "../src/lib/utils/css-vars.js";
import { canUseCustomizer, canAccessTheme } from "../src/lib/utils/tier-access.js";
import { getTheme } from "../src/lib/themes/registry.js";
import type { ThemeSettings } from "../src/lib/types.js";

describe("Theme Customizer", () => {
	describe("CSS Variable Generation", () => {
		it("should generate CSS variables from theme", () => {
			const theme = getTheme("grove");
			expect(theme).toBeDefined();

			const vars = generateThemeVariables(theme!);

			// Should return a :root block with CSS variables
			expect(vars).toContain(":root {");
			expect(vars).toContain("--color-background");
			expect(vars).toContain("--font-heading");
			expect(vars).toContain("--max-width");
		});

		it("should include all color variables", () => {
			const theme = getTheme("grove");
			expect(theme).toBeDefined();

			const vars = generateThemeVariables(theme!);

			// Check for all required color variables
			expect(vars).toContain("--color-background");
			expect(vars).toContain("--color-surface");
			expect(vars).toContain("--color-foreground");
			expect(vars).toContain("--color-foreground-muted");
			expect(vars).toContain("--color-accent");
			expect(vars).toContain("--color-border");

			// Should also include accent variations
			expect(vars).toContain("--accent-color-light");
			expect(vars).toContain("--accent-color-dark");
			expect(vars).toContain("--accent-color-hover");
		});

		it("should include typography variables", () => {
			const theme = getTheme("grove");
			expect(theme).toBeDefined();

			const vars = generateThemeVariables(theme!);

			// Check for all typography variables
			expect(vars).toContain("--font-heading");
			expect(vars).toContain("--font-body");
			expect(vars).toContain("--font-mono");
		});

		it("should include layout variables", () => {
			const theme = getTheme("grove");
			expect(theme).toBeDefined();

			const vars = generateThemeVariables(theme!);

			// Check for layout max-width
			expect(vars).toContain("--max-width");

			// Check for spacing variables
			expect(vars).toContain("--spacing-xs");
			expect(vars).toContain("--spacing-sm");
			expect(vars).toContain("--spacing-md");
			expect(vars).toContain("--spacing-lg");
			expect(vars).toContain("--spacing-xl");
			expect(vars).toContain("--spacing-2xl");
		});
	});

	describe("Settings Merge", () => {
		it("should merge custom colors with base theme", () => {
			const theme = getTheme("grove");
			expect(theme).toBeDefined();

			const settings: ThemeSettings = {
				tenantId: "test-tenant",
				themeId: "grove",
				accentColor: "#ff5733",
				customizerEnabled: true,
				customColors: {
					background: "#ffffff",
					foreground: "#000000",
				},
			};

			const vars = generateSettingsVariables(settings, theme!);

			// Should include custom colors
			expect(vars).toContain("--color-background: #ffffff");
			expect(vars).toContain("--color-foreground: #000000");

			// Should include custom accent color
			expect(vars).toContain("--color-accent: #ff5733");
		});

		it("should preserve base values when not overridden", () => {
			const theme = getTheme("grove");
			expect(theme).toBeDefined();

			const settings: ThemeSettings = {
				tenantId: "test-tenant",
				themeId: "grove",
				accentColor: "#ff5733",
				customizerEnabled: true,
				customColors: {
					background: "#ffffff",
					// Only override background, not other colors
				},
			};

			const vars = generateSettingsVariables(settings, theme!);

			// Should include custom background
			expect(vars).toContain("--color-background: #ffffff");

			// Should preserve base theme values for non-overridden colors
			expect(vars).toContain(`--color-surface: ${theme!.colors.surface}`);
			expect(vars).toContain(`--color-foreground: ${theme!.colors.foreground}`);
			expect(vars).toContain(`--color-foreground-muted: ${theme!.colors.foregroundMuted}`);
			expect(vars).toContain(`--color-border: ${theme!.colors.border}`);

			// Should override accent with settings.accentColor
			expect(vars).toContain("--color-accent: #ff5733");
		});

		it("should apply accent color variations", () => {
			const accentColor = "#6366f1";
			const variations = generateAccentVariations(accentColor);

			// Should include base accent color
			expect(variations["--accent-color"]).toBe(accentColor);

			// Should include color-mix variations
			expect(variations["--accent-color-light"]).toContain("color-mix");
			expect(variations["--accent-color-light"]).toContain(accentColor);
			expect(variations["--accent-color-light"]).toContain("white");

			expect(variations["--accent-color-dark"]).toContain("color-mix");
			expect(variations["--accent-color-dark"]).toContain(accentColor);
			expect(variations["--accent-color-dark"]).toContain("black");

			expect(variations["--accent-color-hover"]).toContain("color-mix");
			expect(variations["--accent-color-hover"]).toContain(accentColor);

			expect(variations["--accent-color-muted"]).toContain("color-mix");
			expect(variations["--accent-color-muted"]).toContain(accentColor);
		});
	});

	describe("Tier Gating", () => {
		it("should block customizer for free/seedling/sapling tiers", () => {
			// Free tier should not have access
			expect(canUseCustomizer("free")).toBe(false);

			// Seedling tier should not have access
			expect(canUseCustomizer("seedling")).toBe(false);

			// Sapling tier should not have access
			expect(canUseCustomizer("sapling")).toBe(false);
		});

		it("should allow customizer for oak+ tiers", () => {
			// Oak tier should have access
			expect(canUseCustomizer("oak")).toBe(true);

			// Evergreen tier should have access
			expect(canUseCustomizer("evergreen")).toBe(true);
		});
	});
});
