// src/lib/utils/glass.ts
// Glass variant utilities for Prism pattern glassmorphism

import type { ThemeGlass, GlassVariant } from "../types.js";

/**
 * Converts a hex color to rgba with specified opacity.
 */
export function hexToRgba(hex: string, opacity: number): string {
	const cleanHex = hex.replace("#", "");
	const r = parseInt(cleanHex.substring(0, 2), 16);
	const g = parseInt(cleanHex.substring(2, 4), 16);
	const b = parseInt(cleanHex.substring(4, 6), 16);
	return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Prism pattern opacity values for each glass variant.
 * Based on GroveEngine's Glass component specifications.
 */
export const GLASS_OPACITY = {
	surface: { light: 0.95, dark: 0.95 },
	tint: { light: 0.6, dark: 0.5 },
	card: { light: 0.8, dark: 0.7 },
	frosted: { light: 0.7, dark: 0.35 },
	accent: { light: 0.3, dark: 0.2 },
	overlay: { light: 0.5, dark: 0.6 },
	muted: { light: 0.4, dark: 0.3 },
} as const;

/**
 * Default blur intensities for each variant.
 */
export const GLASS_BLUR: Record<keyof typeof GLASS_OPACITY, GlassVariant["blur"]> = {
	surface: "md",
	tint: "md",
	card: "md",
	frosted: "lg",
	accent: "sm",
	overlay: "lg",
	muted: "sm",
} as const;

/**
 * Border opacity values.
 */
export const BORDER_OPACITY = {
	light: 0.2,
	dark: 0.3,
} as const;

export interface GlassGeneratorOptions {
	/** Light mode surface color (default: white) */
	lightSurface?: string;
	/** Dark mode surface color (default: slate-800) */
	darkSurface?: string;
	/** Accent color for accent variant */
	accent?: string;
	/** Light mode border base color */
	lightBorder?: string;
	/** Dark mode border base color */
	darkBorder?: string;
}

/**
 * Generates a complete ThemeGlass configuration from base colors.
 * Follows Prism pattern specifications for opacity and blur values.
 */
export function generateGlass(options: GlassGeneratorOptions = {}): ThemeGlass {
	const {
		lightSurface = "#ffffff",
		darkSurface = "#1e293b", // slate-800
		accent = "#16a34a", // grove-600
		lightBorder = "#ffffff",
		darkBorder = "#334155", // slate-700
	} = options;

	const createVariant = (
		type: keyof typeof GLASS_OPACITY,
		surfaceLight: string = lightSurface,
		surfaceDark: string = darkSurface,
	): GlassVariant => ({
		background: hexToRgba(surfaceLight, GLASS_OPACITY[type].light),
		backgroundDark: hexToRgba(surfaceDark, GLASS_OPACITY[type].dark),
		blur: GLASS_BLUR[type],
		border: hexToRgba(lightBorder, BORDER_OPACITY.light),
		borderDark: hexToRgba(darkBorder, BORDER_OPACITY.dark),
	});

	return {
		surface: createVariant("surface"),
		tint: createVariant("tint"),
		card: createVariant("card"),
		frosted: createVariant("frosted"),
		accent: {
			...createVariant("accent", accent, accent),
			border: hexToRgba(accent, 0.3),
			borderDark: hexToRgba(accent, 0.2),
		},
		overlay: {
			background: hexToRgba("#000000", GLASS_OPACITY.overlay.light),
			backgroundDark: hexToRgba("#000000", GLASS_OPACITY.overlay.dark),
			blur: GLASS_BLUR.overlay,
			border: "transparent",
			borderDark: "transparent",
		},
		muted: createVariant("muted"),
	};
}

/**
 * Generates glass variants optimized for dark themes (like Night Garden / Midnight Bloom).
 * Uses inverted opacity logic where dark surfaces are primary.
 */
export function generateDarkGlass(options: GlassGeneratorOptions = {}): ThemeGlass {
	const {
		lightSurface = "#f0fdf4", // grove-50 for light mode fallback
		darkSurface = "#0f172a", // slate-900 base
		accent = "#86efac", // grove-300 for visibility on dark
		lightBorder = "#e2e8f0", // slate-200
		darkBorder = "#1e293b", // slate-800
	} = options;

	// For dark themes, we swap the opacity approach
	const createVariant = (type: keyof typeof GLASS_OPACITY): GlassVariant => ({
		background: hexToRgba(lightSurface, GLASS_OPACITY[type].light),
		backgroundDark: hexToRgba(darkSurface, GLASS_OPACITY[type].dark),
		blur: GLASS_BLUR[type],
		border: hexToRgba(lightBorder, BORDER_OPACITY.light),
		borderDark: hexToRgba(darkBorder, BORDER_OPACITY.dark),
	});

	return {
		surface: createVariant("surface"),
		tint: createVariant("tint"),
		card: createVariant("card"),
		frosted: createVariant("frosted"),
		accent: {
			...createVariant("accent"),
			background: hexToRgba(accent, 0.15),
			backgroundDark: hexToRgba(accent, 0.1),
			border: hexToRgba(accent, 0.25),
			borderDark: hexToRgba(accent, 0.15),
		},
		overlay: {
			background: hexToRgba("#000000", 0.6),
			backgroundDark: hexToRgba("#000000", 0.7),
			blur: "lg",
			border: "transparent",
			borderDark: "transparent",
		},
		muted: createVariant("muted"),
	};
}

/**
 * Midnight Bloom palette - GroveEngine's canonical dark theme.
 * Deep purples and slate for intimate evening atmosphere.
 */
export const MIDNIGHT_BLOOM = {
	background: "#0c0a14", // Deep purple-black
	surface: "#1a1625", // Dark purple surface
	foreground: "#f8fafc", // slate-50
	foregroundMuted: "#a78bfa", // violet-400
	accent: "#c4b5fd", // violet-300
	border: "#2e2640", // Dark purple border

	// Extended palette for glass
	glass: {
		surface: "#1e1a2e",
		overlay: "#0c0a14",
	},
} as const;

/**
 * Generates glass variants using Midnight Bloom palette.
 */
export function generateMidnightBloomGlass(): ThemeGlass {
	return generateDarkGlass({
		lightSurface: "#faf5ff", // violet-50 for light fallback
		darkSurface: MIDNIGHT_BLOOM.glass.surface,
		accent: MIDNIGHT_BLOOM.accent,
		lightBorder: "#e9d5ff", // violet-200
		darkBorder: MIDNIGHT_BLOOM.border,
	});
}
