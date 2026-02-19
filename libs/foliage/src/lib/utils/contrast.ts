// src/lib/utils/contrast.ts
// WCAG contrast checking utilities

import type { Theme, ValidationResult } from "../types.js";

/**
 * Calculate the relative luminance of a color
 * @see https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */
export function getRelativeLuminance(hex: string): number {
	// Parse hex color - support both #RGB and #RRGGBB formats
	let r: number, g: number, b: number;

	// Remove # if present
	hex = hex.replace(/^#/, "");

	if (hex.length === 3) {
		// #RGB format - expand to #RRGGBB
		r = parseInt(hex[0] + hex[0], 16);
		g = parseInt(hex[1] + hex[1], 16);
		b = parseInt(hex[2] + hex[2], 16);
	} else if (hex.length === 6) {
		// #RRGGBB format
		r = parseInt(hex.substring(0, 2), 16);
		g = parseInt(hex.substring(2, 4), 16);
		b = parseInt(hex.substring(4, 6), 16);
	} else {
		throw new Error(`Invalid hex color: ${hex}`);
	}

	// Convert to 0-1 range
	r = r / 255;
	g = g / 255;
	b = b / 255;

	// Convert sRGB to linear RGB
	const toLinear = (channel: number): number => {
		if (channel <= 0.03928) {
			return channel / 12.92;
		}
		return Math.pow((channel + 0.055) / 1.055, 2.4);
	};

	const rLinear = toLinear(r);
	const gLinear = toLinear(g);
	const bLinear = toLinear(b);

	// Apply luminance formula per WCAG 2.1 spec
	return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

/**
 * Calculate contrast ratio between two colors
 * @see https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
 */
export function getContrastRatio(fg: string, bg: string): number {
	const l1 = getRelativeLuminance(fg);
	const l2 = getRelativeLuminance(bg);

	// L1 is always the lighter color
	const lighter = Math.max(l1, l2);
	const darker = Math.min(l1, l2);

	// Calculate contrast ratio: (L1 + 0.05) / (L2 + 0.05)
	return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast meets WCAG AA (4.5:1 for normal text)
 */
export function meetsWCAGAA(fg: string, bg: string): boolean {
	return getContrastRatio(fg, bg) >= 4.5;
}

/**
 * Check if contrast meets WCAG AAA (7:1 for normal text)
 */
export function meetsWCAGAAA(fg: string, bg: string): boolean {
	return getContrastRatio(fg, bg) >= 7;
}

/**
 * Validate all color combinations in a theme meet accessibility requirements
 */
export function validateThemeContrast(theme: Theme): ValidationResult {
	const warnings: string[] = [];
	const { colors } = theme;

	// Check foreground on background (body text) - needs 4.5:1
	const fgBgRatio = getContrastRatio(colors.foreground, colors.background);
	if (fgBgRatio < 4.5) {
		return {
			valid: false,
			error: `Foreground on background contrast ratio (${fgBgRatio.toFixed(2)}:1) does not meet WCAG AA requirement of 4.5:1`,
		};
	}
	if (fgBgRatio < 7) {
		warnings.push(
			`Foreground on background contrast ratio (${fgBgRatio.toFixed(2)}:1) meets AA but not AAA (7:1)`,
		);
	}

	// Check foregroundMuted on background - needs 4.5:1
	const mutedBgRatio = getContrastRatio(colors.foregroundMuted, colors.background);
	if (mutedBgRatio < 4.5) {
		return {
			valid: false,
			error: `Muted foreground on background contrast ratio (${mutedBgRatio.toFixed(2)}:1) does not meet WCAG AA requirement of 4.5:1`,
		};
	}

	// Check foreground on surface - needs 4.5:1
	const fgSurfaceRatio = getContrastRatio(colors.foreground, colors.surface);
	if (fgSurfaceRatio < 4.5) {
		return {
			valid: false,
			error: `Foreground on surface contrast ratio (${fgSurfaceRatio.toFixed(2)}:1) does not meet WCAG AA requirement of 4.5:1`,
		};
	}

	// Check accent readability on both background and surface
	const accentBgRatio = getContrastRatio(colors.accent, colors.background);
	const accentSurfaceRatio = getContrastRatio(colors.accent, colors.surface);

	if (accentBgRatio < 3) {
		warnings.push(
			`Accent color on background has low contrast (${accentBgRatio.toFixed(2)}:1). Consider ensuring accent text uses sufficient weight or size.`,
		);
	}

	if (accentSurfaceRatio < 3) {
		warnings.push(
			`Accent color on surface has low contrast (${accentSurfaceRatio.toFixed(2)}:1). Consider ensuring accent text uses sufficient weight or size.`,
		);
	}

	// Check border visibility
	const borderBgRatio = getContrastRatio(colors.border, colors.background);
	if (borderBgRatio < 3) {
		warnings.push(
			`Border color on background has low contrast (${borderBgRatio.toFixed(2)}:1). Borders may be difficult to see.`,
		);
	}

	return {
		valid: true,
		warnings: warnings.length > 0 ? warnings : undefined,
	};
}

/**
 * Suggest a readable foreground color for a given background
 * Returns either pure white or pure black, whichever has better contrast
 */
export function suggestReadableColor(bg: string, preferLight = false): string {
	const white = "#ffffff";
	const black = "#000000";

	const whiteContrast = getContrastRatio(white, bg);
	const blackContrast = getContrastRatio(black, bg);

	// If both meet AA, use preference
	if (whiteContrast >= 4.5 && blackContrast >= 4.5) {
		return preferLight ? white : black;
	}

	// Otherwise return whichever has better contrast
	return whiteContrast > blackContrast ? white : black;
}
