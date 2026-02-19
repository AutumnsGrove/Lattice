// tests/contrast.test.ts
// WCAG contrast tests

import { describe, it, expect } from "vitest";
import {
	getRelativeLuminance,
	getContrastRatio,
	meetsWCAGAA,
	meetsWCAGAAA,
	validateThemeContrast,
} from "../src/lib/utils/contrast.js";
import type { Theme } from "../src/lib/types.js";

describe("Contrast Utilities", () => {
	describe("getRelativeLuminance", () => {
		it("should return 0 for black (#000000)", () => {
			expect(getRelativeLuminance("#000000")).toBe(0);
		});

		it("should return 1 for white (#ffffff)", () => {
			expect(getRelativeLuminance("#ffffff")).toBe(1);
		});

		it("should handle short hex format for black (#000)", () => {
			expect(getRelativeLuminance("#000")).toBe(0);
		});

		it("should handle short hex format for white (#fff)", () => {
			expect(getRelativeLuminance("#fff")).toBe(1);
		});

		it("should calculate correct luminance for pure red (#ff0000)", () => {
			// Red channel contributes 0.2126 to luminance
			const luminance = getRelativeLuminance("#ff0000");
			expect(luminance).toBeCloseTo(0.2126, 4);
		});

		it("should calculate correct luminance for pure green (#00ff00)", () => {
			// Green channel contributes 0.7152 to luminance
			const luminance = getRelativeLuminance("#00ff00");
			expect(luminance).toBeCloseTo(0.7152, 4);
		});

		it("should calculate correct luminance for pure blue (#0000ff)", () => {
			// Blue channel contributes 0.0722 to luminance
			const luminance = getRelativeLuminance("#0000ff");
			expect(luminance).toBeCloseTo(0.0722, 4);
		});

		it("should calculate luminance for medium gray (#808080)", () => {
			// Medium gray should be approximately 0.22 luminance
			const luminance = getRelativeLuminance("#808080");
			expect(luminance).toBeGreaterThan(0);
			expect(luminance).toBeLessThan(1);
		});

		it("should handle colors without # prefix", () => {
			expect(getRelativeLuminance("000000")).toBe(0);
			expect(getRelativeLuminance("ffffff")).toBe(1);
		});

		it("should handle uppercase hex colors", () => {
			expect(getRelativeLuminance("#FFFFFF")).toBe(1);
			expect(getRelativeLuminance("#000000")).toBe(0);
		});
	});

	describe("getContrastRatio", () => {
		it("should return 21:1 for black on white", () => {
			const ratio = getContrastRatio("#000000", "#ffffff");
			expect(ratio).toBeCloseTo(21, 1);
		});

		it("should return 21:1 for white on black", () => {
			const ratio = getContrastRatio("#ffffff", "#000000");
			expect(ratio).toBeCloseTo(21, 1);
		});

		it("should return 1:1 for same color (black on black)", () => {
			const ratio = getContrastRatio("#000000", "#000000");
			expect(ratio).toBe(1);
		});

		it("should return 1:1 for same color (white on white)", () => {
			const ratio = getContrastRatio("#ffffff", "#ffffff");
			expect(ratio).toBe(1);
		});

		it("should be symmetric (fg/bg vs bg/fg)", () => {
			const fg = "#4a5568";
			const bg = "#edf2f7";
			const ratio1 = getContrastRatio(fg, bg);
			const ratio2 = getContrastRatio(bg, fg);
			expect(ratio1).toBeCloseTo(ratio2, 2);
		});

		it("should calculate correct ratio for dark gray on light gray", () => {
			// #333333 on #f0f0f0 should be around 12:1
			const ratio = getContrastRatio("#333333", "#f0f0f0");
			expect(ratio).toBeGreaterThan(10);
			expect(ratio).toBeLessThan(15);
		});

		it("should calculate correct ratio for medium gray on white", () => {
			// #767676 on #ffffff should be approximately 4.54:1
			const ratio = getContrastRatio("#767676", "#ffffff");
			expect(ratio).toBeGreaterThan(4.5);
			expect(ratio).toBeLessThan(5);
		});

		it("should handle short hex format", () => {
			const ratio = getContrastRatio("#000", "#fff");
			expect(ratio).toBeCloseTo(21, 1);
		});

		it("should work with colors without # prefix", () => {
			const ratio = getContrastRatio("000000", "ffffff");
			expect(ratio).toBeCloseTo(21, 1);
		});
	});

	describe("meetsWCAGAA", () => {
		it("should pass for black on white (21:1)", () => {
			expect(meetsWCAGAA("#000000", "#ffffff")).toBe(true);
		});

		it("should pass for white on black (21:1)", () => {
			expect(meetsWCAGAA("#ffffff", "#000000")).toBe(true);
		});

		it("should fail for same colors (1:1)", () => {
			expect(meetsWCAGAA("#ffffff", "#ffffff")).toBe(false);
			expect(meetsWCAGAA("#000000", "#000000")).toBe(false);
		});

		it("should pass for contrast ratio exactly at 4.5:1", () => {
			// #767676 on #ffffff is approximately 4.54:1
			expect(meetsWCAGAA("#767676", "#ffffff")).toBe(true);
		});

		it("should fail for contrast ratio below 4.5:1", () => {
			// #959595 on #ffffff is approximately 2.85:1
			expect(meetsWCAGAA("#959595", "#ffffff")).toBe(false);
		});

		it("should fail for light gray on white", () => {
			expect(meetsWCAGAA("#e0e0e0", "#ffffff")).toBe(false);
		});

		it("should pass for dark gray on light background", () => {
			expect(meetsWCAGAA("#333333", "#f5f5f5")).toBe(true);
		});
	});

	describe("meetsWCAGAAA", () => {
		it("should pass for black on white (21:1)", () => {
			expect(meetsWCAGAAA("#000000", "#ffffff")).toBe(true);
		});

		it("should pass for white on black (21:1)", () => {
			expect(meetsWCAGAAA("#ffffff", "#000000")).toBe(true);
		});

		it("should fail for same colors (1:1)", () => {
			expect(meetsWCAGAAA("#ffffff", "#ffffff")).toBe(false);
			expect(meetsWCAGAAA("#000000", "#000000")).toBe(false);
		});

		it("should pass for contrast ratio at or above 7:1", () => {
			// #595959 on #ffffff is approximately 7:1
			expect(meetsWCAGAAA("#595959", "#ffffff")).toBe(true);
		});

		it("should fail for contrast ratio below 7:1", () => {
			// #767676 on #ffffff is approximately 4.54:1
			expect(meetsWCAGAAA("#767676", "#ffffff")).toBe(false);
		});

		it("should fail for medium gray on white", () => {
			expect(meetsWCAGAAA("#808080", "#ffffff")).toBe(false);
		});

		it("should pass for very dark gray on white", () => {
			expect(meetsWCAGAAA("#404040", "#ffffff")).toBe(true);
		});

		it("should be more strict than AA (7:1 vs 4.5:1)", () => {
			// Color that passes AA but fails AAA
			const fg = "#767676";
			const bg = "#ffffff";
			expect(meetsWCAGAA(fg, bg)).toBe(true);
			expect(meetsWCAGAAA(fg, bg)).toBe(false);
		});
	});

	describe("validateThemeContrast", () => {
		it("should pass for theme with good contrast", () => {
			const validTheme: Theme = {
				id: "test-theme",
				name: "Test Theme",
				description: "A test theme",
				thumbnail: "/thumbnails/test.png",
				tier: "seedling",
				colors: {
					background: "#ffffff",
					surface: "#f5f5f5",
					foreground: "#000000",
					foregroundMuted: "#666666",
					accent: "#2563eb",
					border: "#e0e0e0",
				},
				fonts: {
					heading: "Inter",
					body: "Inter",
					mono: "JetBrains Mono",
				},
				layout: {
					type: "sidebar",
					maxWidth: "1200px",
					spacing: "comfortable",
				},
			};

			const result = validateThemeContrast(validTheme);
			expect(result.valid).toBe(true);
			expect(result.error).toBeUndefined();
		});

		it("should fail for theme with poor foreground contrast", () => {
			const invalidTheme: Theme = {
				id: "test-theme-bad",
				name: "Test Theme Bad",
				description: "A test theme with poor contrast",
				thumbnail: "/thumbnails/test.png",
				tier: "seedling",
				colors: {
					background: "#ffffff",
					surface: "#f5f5f5",
					foreground: "#cccccc", // Poor contrast on white
					foregroundMuted: "#e0e0e0",
					accent: "#2563eb",
					border: "#e0e0e0",
				},
				fonts: {
					heading: "Inter",
					body: "Inter",
					mono: "JetBrains Mono",
				},
				layout: {
					type: "sidebar",
					maxWidth: "1200px",
					spacing: "comfortable",
				},
			};

			const result = validateThemeContrast(invalidTheme);
			expect(result.valid).toBe(false);
			expect(result.error).toBeDefined();
			expect(result.error?.toLowerCase()).toContain("foreground");
		});

		it("should fail for theme with poor accent contrast", () => {
			const invalidTheme: Theme = {
				id: "test-theme-accent",
				name: "Test Theme Accent",
				description: "A test theme with poor accent contrast",
				thumbnail: "/thumbnails/test.png",
				tier: "seedling",
				colors: {
					background: "#2563eb",
					surface: "#1e40af",
					foreground: "#ffffff",
					foregroundMuted: "#e0e0e0",
					accent: "#60a5fa", // Poor contrast on blue background
					border: "#3b82f6",
				},
				fonts: {
					heading: "Inter",
					body: "Inter",
					mono: "JetBrains Mono",
				},
				layout: {
					type: "sidebar",
					maxWidth: "1200px",
					spacing: "comfortable",
				},
			};

			const result = validateThemeContrast(invalidTheme);
			expect(result.valid).toBe(false);
			expect(result.error).toBeDefined();
		});

		it("should validate foreground on background", () => {
			const theme: Theme = {
				id: "test-fg-bg",
				name: "Test FG/BG",
				description: "Test foreground on background",
				thumbnail: "/thumbnails/test.png",
				tier: "seedling",
				colors: {
					background: "#000000",
					surface: "#1a1a1a",
					foreground: "#ffffff",
					foregroundMuted: "#999999",
					accent: "#00ff00",
					border: "#333333",
				},
				fonts: {
					heading: "Inter",
					body: "Inter",
					mono: "JetBrains Mono",
				},
				layout: {
					type: "sidebar",
					maxWidth: "1200px",
					spacing: "comfortable",
				},
			};

			const result = validateThemeContrast(theme);
			expect(result.valid).toBe(true);
		});

		it("should validate foreground on surface", () => {
			const theme: Theme = {
				id: "test-fg-surface",
				name: "Test FG/Surface",
				description: "Test foreground on surface",
				thumbnail: "/thumbnails/test.png",
				tier: "seedling",
				colors: {
					background: "#ffffff",
					surface: "#f0f0f0",
					foreground: "#1a1a1a",
					foregroundMuted: "#666666",
					accent: "#0066cc",
					border: "#d0d0d0",
				},
				fonts: {
					heading: "Inter",
					body: "Inter",
					mono: "JetBrains Mono",
				},
				layout: {
					type: "sidebar",
					maxWidth: "1200px",
					spacing: "comfortable",
				},
			};

			const result = validateThemeContrast(theme);
			expect(result.valid).toBe(true);
		});

		it("should provide specific error message about which color pair failed", () => {
			const invalidTheme: Theme = {
				id: "test-specific-error",
				name: "Test Specific Error",
				description: "Test specific error message",
				thumbnail: "/thumbnails/test.png",
				tier: "seedling",
				colors: {
					background: "#ffffff",
					surface: "#f5f5f5",
					foreground: "#d0d0d0", // This should fail
					foregroundMuted: "#e8e8e8",
					accent: "#2563eb",
					border: "#e0e0e0",
				},
				fonts: {
					heading: "Inter",
					body: "Inter",
					mono: "JetBrains Mono",
				},
				layout: {
					type: "sidebar",
					maxWidth: "1200px",
					spacing: "comfortable",
				},
			};

			const result = validateThemeContrast(invalidTheme);
			expect(result.valid).toBe(false);
			expect(result.error).toBeDefined();
			// Error message should mention specific colors or ratios
			expect(
				result.error?.toLowerCase().includes("contrast") ||
					result.error?.toLowerCase().includes("foreground") ||
					result.error?.toLowerCase().includes("background"),
			).toBe(true);
		});

		it("should handle themes with dark backgrounds", () => {
			const darkTheme: Theme = {
				id: "test-dark",
				name: "Test Dark",
				description: "Test dark theme",
				thumbnail: "/thumbnails/test.png",
				tier: "seedling",
				colors: {
					background: "#1a1a1a",
					surface: "#2a2a2a",
					foreground: "#ffffff",
					foregroundMuted: "#b0b0b0",
					accent: "#60a5fa",
					border: "#404040",
				},
				fonts: {
					heading: "Inter",
					body: "Inter",
					mono: "JetBrains Mono",
				},
				layout: {
					type: "sidebar",
					maxWidth: "1200px",
					spacing: "comfortable",
				},
			};

			const result = validateThemeContrast(darkTheme);
			expect(result.valid).toBe(true);
		});
	});
});
