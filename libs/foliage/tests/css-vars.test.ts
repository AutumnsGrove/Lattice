// tests/css-vars.test.ts
// CSS variable generation tests

import { describe, it, expect } from "vitest";
import {
	generateThemeVariables,
	generateSettingsVariables,
	applyThemeVariables,
	generateAccentVariations,
} from "../src/lib/utils/css-vars.js";
import type { Theme, ThemeSettings } from "../src/lib/types.js";

// Helper function to create a base theme for testing
function createMockTheme(overrides?: Partial<Theme>): Theme {
	return {
		id: "test-theme",
		name: "Test Theme",
		description: "A test theme",
		thumbnail: "/thumbnails/test.png",
		tier: "seedling",
		colors: {
			background: "#ffffff",
			surface: "#f5f5f5",
			foreground: "#1a1a1a",
			foregroundMuted: "#666666",
			accent: "#2563eb",
			border: "#e0e0e0",
		},
		fonts: {
			heading: "Inter, sans-serif",
			body: "Inter, sans-serif",
			mono: "JetBrains Mono, monospace",
		},
		layout: {
			type: "sidebar",
			maxWidth: "1200px",
			spacing: "comfortable",
		},
		...overrides,
	};
}

// Helper function to create theme settings for testing
function createMockSettings(overrides?: Partial<ThemeSettings>): ThemeSettings {
	return {
		tenantId: "test-tenant",
		themeId: "test-theme",
		accentColor: "#2563eb",
		customizerEnabled: false,
		...overrides,
	};
}

describe("CSS Variable Utilities", () => {
	describe("generateThemeVariables", () => {
		it("should generate all color variables", () => {
			const theme = createMockTheme();
			const result = generateThemeVariables(theme);

			expect(result).toContain("--color-background: #ffffff;");
			expect(result).toContain("--color-surface: #f5f5f5;");
			expect(result).toContain("--color-foreground: #1a1a1a;");
			expect(result).toContain("--color-foreground-muted: #666666;");
			expect(result).toContain("--color-accent: #2563eb;");
			expect(result).toContain("--color-border: #e0e0e0;");
		});

		it("should generate font variables", () => {
			const theme = createMockTheme();
			const result = generateThemeVariables(theme);

			expect(result).toContain("--font-heading: Inter, sans-serif;");
			expect(result).toContain("--font-body: Inter, sans-serif;");
			expect(result).toContain("--font-mono: JetBrains Mono, monospace;");
		});

		it("should generate layout variables", () => {
			const theme = createMockTheme();
			const result = generateThemeVariables(theme);

			expect(result).toContain("--max-width: 1200px;");
		});

		it("should generate spacing variables for compact mode", () => {
			const theme = createMockTheme({
				layout: {
					type: "sidebar",
					maxWidth: "1200px",
					spacing: "compact",
				},
			});
			const result = generateThemeVariables(theme);

			expect(result).toContain("--spacing-xs: 0.25rem;");
			expect(result).toContain("--spacing-sm: 0.5rem;");
			expect(result).toContain("--spacing-md: 0.75rem;");
			expect(result).toContain("--spacing-lg: 1rem;");
			expect(result).toContain("--spacing-xl: 1.5rem;");
			expect(result).toContain("--spacing-2xl: 2rem;");
		});

		it("should generate spacing variables for comfortable mode", () => {
			const theme = createMockTheme({
				layout: {
					type: "sidebar",
					maxWidth: "1200px",
					spacing: "comfortable",
				},
			});
			const result = generateThemeVariables(theme);

			expect(result).toContain("--spacing-xs: 0.5rem;");
			expect(result).toContain("--spacing-sm: 0.75rem;");
			expect(result).toContain("--spacing-md: 1rem;");
			expect(result).toContain("--spacing-lg: 1.5rem;");
			expect(result).toContain("--spacing-xl: 2rem;");
			expect(result).toContain("--spacing-2xl: 3rem;");
		});

		it("should generate spacing variables for spacious mode", () => {
			const theme = createMockTheme({
				layout: {
					type: "sidebar",
					maxWidth: "1200px",
					spacing: "spacious",
				},
			});
			const result = generateThemeVariables(theme);

			expect(result).toContain("--spacing-xs: 0.75rem;");
			expect(result).toContain("--spacing-sm: 1rem;");
			expect(result).toContain("--spacing-md: 1.5rem;");
			expect(result).toContain("--spacing-lg: 2rem;");
			expect(result).toContain("--spacing-xl: 3rem;");
			expect(result).toContain("--spacing-2xl: 4rem;");
		});

		it("should generate accent variations", () => {
			const theme = createMockTheme();
			const result = generateThemeVariables(theme);

			// Should contain accent variations (color-mix syntax)
			expect(result).toContain("--accent-color-light:");
			expect(result).toContain("--accent-color-dark:");
			expect(result).toContain("--accent-color-hover:");
			expect(result).toContain("--accent-color-muted:");
			expect(result).toContain("color-mix");
		});

		it("should output valid CSS :root block", () => {
			const theme = createMockTheme();
			const result = generateThemeVariables(theme);

			// Should start with :root {
			expect(result).toMatch(/^:root \{/);
			// Should end with }
			expect(result).toMatch(/\}$/);
			// Should have proper indentation (2 spaces)
			expect(result).toContain("\n  --");
		});

		it("should handle different layout types", () => {
			const layoutTypes: Array<
				"sidebar" | "no-sidebar" | "centered" | "full-width" | "grid" | "masonry"
			> = ["sidebar", "no-sidebar", "centered", "full-width", "grid", "masonry"];

			layoutTypes.forEach((layoutType) => {
				const theme = createMockTheme({
					layout: {
						type: layoutType,
						maxWidth: "1200px",
						spacing: "comfortable",
					},
				});
				const result = generateThemeVariables(theme);

				// Layout type doesn't affect CSS generation, but should not error
				expect(result).toContain("--max-width: 1200px;");
			});
		});

		it("should handle custom max-width values", () => {
			const theme = createMockTheme({
				layout: {
					type: "sidebar",
					maxWidth: "1440px",
					spacing: "comfortable",
				},
			});
			const result = generateThemeVariables(theme);

			expect(result).toContain("--max-width: 1440px;");
		});

		it("should handle different accent colors", () => {
			const theme = createMockTheme({
				colors: {
					background: "#ffffff",
					surface: "#f5f5f5",
					foreground: "#1a1a1a",
					foregroundMuted: "#666666",
					accent: "#ff5733",
					border: "#e0e0e0",
				},
			});
			const result = generateThemeVariables(theme);

			expect(result).toContain("--color-accent: #ff5733;");
			expect(result).toContain("color-mix(in srgb, #ff5733");
		});

		it("should handle dark theme colors", () => {
			const darkTheme = createMockTheme({
				colors: {
					background: "#1a1a1a",
					surface: "#2a2a2a",
					foreground: "#ffffff",
					foregroundMuted: "#b0b0b0",
					accent: "#60a5fa",
					border: "#404040",
				},
			});
			const result = generateThemeVariables(darkTheme);

			expect(result).toContain("--color-background: #1a1a1a;");
			expect(result).toContain("--color-foreground: #ffffff;");
			expect(result).toContain("--color-accent: #60a5fa;");
		});
	});

	describe("generateSettingsVariables", () => {
		it("should override base theme with custom colors", () => {
			const baseTheme = createMockTheme();
			const settings = createMockSettings({
				customColors: {
					background: "#000000",
					foreground: "#ffffff",
				},
			});
			const result = generateSettingsVariables(settings, baseTheme);

			expect(result).toContain("--color-background: #000000;");
			expect(result).toContain("--color-foreground: #ffffff;");
			// Non-overridden colors should use base theme
			expect(result).toContain("--color-surface: #f5f5f5;");
		});

		it("should override fonts with custom typography", () => {
			const baseTheme = createMockTheme();
			const settings = createMockSettings({
				customTypography: {
					heading: "Playfair Display, serif",
					body: "Roboto, sans-serif",
				},
			});
			const result = generateSettingsVariables(settings, baseTheme);

			expect(result).toContain("--font-heading: Playfair Display, serif;");
			expect(result).toContain("--font-body: Roboto, sans-serif;");
			// Non-overridden font should use base theme
			expect(result).toContain("--font-mono: JetBrains Mono, monospace;");
		});

		it("should override layout settings", () => {
			const baseTheme = createMockTheme();
			const settings = createMockSettings({
				customLayout: {
					maxWidth: "1440px",
					spacing: "spacious",
				},
			});
			const result = generateSettingsVariables(settings, baseTheme);

			expect(result).toContain("--max-width: 1440px;");
			// Should use spacious spacing values
			expect(result).toContain("--spacing-xs: 0.75rem;");
			expect(result).toContain("--spacing-sm: 1rem;");
		});

		it("should always use settings.accentColor for accent", () => {
			const baseTheme = createMockTheme({
				colors: {
					background: "#ffffff",
					surface: "#f5f5f5",
					foreground: "#1a1a1a",
					foregroundMuted: "#666666",
					accent: "#2563eb", // This should be overridden
					border: "#e0e0e0",
				},
			});
			const settings = createMockSettings({
				accentColor: "#ff5733", // This should always be used
			});
			const result = generateSettingsVariables(settings, baseTheme);

			expect(result).toContain("--color-accent: #ff5733;");
			expect(result).toContain("color-mix(in srgb, #ff5733");
		});

		it("should use settings.accentColor even if customColors.accent is set", () => {
			const baseTheme = createMockTheme();
			const settings = createMockSettings({
				accentColor: "#10b981",
				customColors: {
					accent: "#ff5733", // This should be ignored
				},
			});
			const result = generateSettingsVariables(settings, baseTheme);

			// settings.accentColor should always win
			expect(result).toContain("--color-accent: #10b981;");
		});

		it("should handle partial custom colors", () => {
			const baseTheme = createMockTheme();
			const settings = createMockSettings({
				customColors: {
					surface: "#f0f0f0",
					// Only overriding surface
				},
			});
			const result = generateSettingsVariables(settings, baseTheme);

			expect(result).toContain("--color-surface: #f0f0f0;");
			expect(result).toContain("--color-background: #ffffff;");
			expect(result).toContain("--color-foreground: #1a1a1a;");
		});

		it("should handle partial custom typography", () => {
			const baseTheme = createMockTheme();
			const settings = createMockSettings({
				customTypography: {
					mono: "Fira Code, monospace",
					// Only overriding mono
				},
			});
			const result = generateSettingsVariables(settings, baseTheme);

			expect(result).toContain("--font-mono: Fira Code, monospace;");
			expect(result).toContain("--font-heading: Inter, sans-serif;");
			expect(result).toContain("--font-body: Inter, sans-serif;");
		});

		it("should handle partial custom layout", () => {
			const baseTheme = createMockTheme();
			const settings = createMockSettings({
				customLayout: {
					spacing: "compact",
					// Only overriding spacing
				},
			});
			const result = generateSettingsVariables(settings, baseTheme);

			expect(result).toContain("--spacing-xs: 0.25rem;");
			expect(result).toContain("--max-width: 1200px;");
		});

		it("should handle all customizations at once", () => {
			const baseTheme = createMockTheme();
			const settings = createMockSettings({
				accentColor: "#8b5cf6",
				customColors: {
					background: "#fafafa",
					surface: "#f5f5f5",
					foreground: "#0a0a0a",
					border: "#d4d4d4",
				},
				customTypography: {
					heading: "Merriweather, serif",
					body: "Open Sans, sans-serif",
				},
				customLayout: {
					maxWidth: "1400px",
					spacing: "spacious",
				},
			});
			const result = generateSettingsVariables(settings, baseTheme);

			// Check custom colors
			expect(result).toContain("--color-background: #fafafa;");
			expect(result).toContain("--color-surface: #f5f5f5;");
			expect(result).toContain("--color-accent: #8b5cf6;");

			// Check custom typography
			expect(result).toContain("--font-heading: Merriweather, serif;");
			expect(result).toContain("--font-body: Open Sans, sans-serif;");

			// Check custom layout
			expect(result).toContain("--max-width: 1400px;");
			expect(result).toContain("--spacing-xl: 3rem;");
		});

		it("should output valid CSS :root block", () => {
			const baseTheme = createMockTheme();
			const settings = createMockSettings();
			const result = generateSettingsVariables(settings, baseTheme);

			expect(result).toMatch(/^:root \{/);
			expect(result).toMatch(/\}$/);
			expect(result).toContain("\n  --");
		});
	});

	describe("applyThemeVariables", () => {
		it("should handle missing window/document gracefully", () => {
			const settings = createMockSettings();

			// Should not throw in Node.js environment (no window/document)
			expect(() => applyThemeVariables(settings)).not.toThrow();
		});

		it("should not error with minimal settings", () => {
			const settings = createMockSettings();

			expect(() => applyThemeVariables(settings)).not.toThrow();
		});

		it("should not error with full customizations", () => {
			const settings = createMockSettings({
				accentColor: "#8b5cf6",
				customColors: {
					background: "#fafafa",
					surface: "#f5f5f5",
					foreground: "#0a0a0a",
				},
				customTypography: {
					heading: "Merriweather, serif",
				},
				customLayout: {
					spacing: "spacious",
				},
			});

			expect(() => applyThemeVariables(settings)).not.toThrow();
		});
	});

	describe("generateAccentVariations", () => {
		it("should return 5 accent variations", () => {
			const variations = generateAccentVariations("#2563eb");

			const keys = Object.keys(variations);
			expect(keys).toHaveLength(5);
		});

		it("should include base, light, dark, hover, and muted variations", () => {
			const variations = generateAccentVariations("#2563eb");

			expect(variations).toHaveProperty("--accent-color");
			expect(variations).toHaveProperty("--accent-color-light");
			expect(variations).toHaveProperty("--accent-color-dark");
			expect(variations).toHaveProperty("--accent-color-hover");
			expect(variations).toHaveProperty("--accent-color-muted");
		});

		it("should use color-mix syntax for variations", () => {
			const variations = generateAccentVariations("#2563eb");

			expect(variations["--accent-color-light"]).toContain("color-mix");
			expect(variations["--accent-color-dark"]).toContain("color-mix");
			expect(variations["--accent-color-hover"]).toContain("color-mix");
			expect(variations["--accent-color-muted"]).toContain("color-mix");
		});

		it("should set base accent-color to input color", () => {
			const variations = generateAccentVariations("#ff5733");

			expect(variations["--accent-color"]).toBe("#ff5733");
		});

		it("should use srgb color space", () => {
			const variations = generateAccentVariations("#2563eb");

			expect(variations["--accent-color-light"]).toContain("in srgb");
			expect(variations["--accent-color-dark"]).toContain("in srgb");
			expect(variations["--accent-color-hover"]).toContain("in srgb");
			expect(variations["--accent-color-muted"]).toContain("in srgb");
		});

		it("should mix light variation with white", () => {
			const variations = generateAccentVariations("#2563eb");

			expect(variations["--accent-color-light"]).toContain("#2563eb");
			expect(variations["--accent-color-light"]).toContain("white");
			expect(variations["--accent-color-light"]).toContain("80%");
			expect(variations["--accent-color-light"]).toContain("20%");
		});

		it("should mix dark variation with black", () => {
			const variations = generateAccentVariations("#2563eb");

			expect(variations["--accent-color-dark"]).toContain("#2563eb");
			expect(variations["--accent-color-dark"]).toContain("black");
			expect(variations["--accent-color-dark"]).toContain("80%");
			expect(variations["--accent-color-dark"]).toContain("20%");
		});

		it("should mix hover variation with black", () => {
			const variations = generateAccentVariations("#2563eb");

			expect(variations["--accent-color-hover"]).toContain("#2563eb");
			expect(variations["--accent-color-hover"]).toContain("black");
			expect(variations["--accent-color-hover"]).toContain("90%");
			expect(variations["--accent-color-hover"]).toContain("10%");
		});

		it("should create muted variation", () => {
			const variations = generateAccentVariations("#2563eb");

			expect(variations["--accent-color-muted"]).toContain("#2563eb");
			expect(variations["--accent-color-muted"]).toContain("60%");
			expect(variations["--accent-color-muted"]).toContain("40%");
		});

		it("should handle different color formats", () => {
			const colors = ["#2563eb", "#ff5733", "#10b981", "#8b5cf6"];

			colors.forEach((color) => {
				const variations = generateAccentVariations(color);

				expect(variations["--accent-color"]).toBe(color);
				expect(Object.keys(variations)).toHaveLength(5);
			});
		});

		it("should preserve original color in variations", () => {
			const color = "#ff5733";
			const variations = generateAccentVariations(color);

			expect(variations["--accent-color-light"]).toContain(color);
			expect(variations["--accent-color-dark"]).toContain(color);
			expect(variations["--accent-color-hover"]).toContain(color);
			expect(variations["--accent-color-muted"]).toContain(color);
		});

		it("should handle RGB color values", () => {
			const variations = generateAccentVariations("rgb(37, 99, 235)");

			expect(variations["--accent-color"]).toBe("rgb(37, 99, 235)");
			expect(variations["--accent-color-light"]).toContain("rgb(37, 99, 235)");
		});

		it("should handle HSL color values", () => {
			const variations = generateAccentVariations("hsl(217, 91%, 60%)");

			expect(variations["--accent-color"]).toBe("hsl(217, 91%, 60%)");
			expect(variations["--accent-color-light"]).toContain("hsl(217, 91%, 60%)");
		});
	});
});
