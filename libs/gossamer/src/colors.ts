/**
 * Gossamer Color Palettes
 *
 * Grove-themed color palettes for ASCII effects.
 * Designed to complement Glass UI components.
 */

/**
 * Color definition with metadata
 */
export interface ColorDef {
	/** Hex color value */
	hex: string;
	/** Human-readable name */
	name: string;
	/** Recommended opacity for glass overlays (0-1) */
	glassOpacity?: number;
}

/**
 * Grove Green palette - Primary brand colors
 */
export const GROVE_GREEN = {
	50: { hex: "#f0fdf4", name: "Grove Green 50", glassOpacity: 0.3 },
	100: { hex: "#dcfce7", name: "Grove Green 100", glassOpacity: 0.25 },
	200: { hex: "#bbf7d0", name: "Grove Green 200", glassOpacity: 0.2 },
	300: { hex: "#86efac", name: "Grove Green 300", glassOpacity: 0.18 },
	400: { hex: "#4ade80", name: "Grove Green 400", glassOpacity: 0.15 },
	500: { hex: "#22c55e", name: "Grove Green 500", glassOpacity: 0.12 },
	600: { hex: "#16a34a", name: "Grove Green 600", glassOpacity: 0.1 },
	700: { hex: "#15803d", name: "Grove Green 700", glassOpacity: 0.1 },
	800: { hex: "#166534", name: "Grove Green 800", glassOpacity: 0.08 },
	900: { hex: "#14532d", name: "Grove Green 900", glassOpacity: 0.08 },
} as const;

/**
 * Cream palette - Light/warm backgrounds
 */
export const CREAM = {
	50: { hex: "#fefdfb", name: "Cream 50", glassOpacity: 0.4 },
	100: { hex: "#fdfcf8", name: "Cream 100", glassOpacity: 0.35 },
	200: { hex: "#faf8f3", name: "Cream 200", glassOpacity: 0.3 },
	300: { hex: "#f5f2ea", name: "Cream 300", glassOpacity: 0.25 },
	400: { hex: "#ede9de", name: "Cream 400", glassOpacity: 0.2 },
	500: { hex: "#e2ddd0", name: "Cream 500", glassOpacity: 0.18 },
	600: { hex: "#d4cec0", name: "Cream 600", glassOpacity: 0.15 },
	700: { hex: "#c4bdb0", name: "Cream 700", glassOpacity: 0.12 },
	800: { hex: "#b0a99c", name: "Cream 800", glassOpacity: 0.1 },
	900: { hex: "#9a9387", name: "Cream 900", glassOpacity: 0.08 },
} as const;

/**
 * Bark palette - Dark/earth tones
 */
export const BARK = {
	50: { hex: "#faf7f5", name: "Bark 50", glassOpacity: 0.3 },
	100: { hex: "#f0ebe6", name: "Bark 100", glassOpacity: 0.25 },
	200: { hex: "#e0d5cc", name: "Bark 200", glassOpacity: 0.2 },
	300: { hex: "#ccb59c", name: "Bark 300", glassOpacity: 0.18 },
	400: { hex: "#b89a7a", name: "Bark 400", glassOpacity: 0.15 },
	500: { hex: "#a57c5a", name: "Bark 500", glassOpacity: 0.12 },
	600: { hex: "#8a6344", name: "Bark 600", glassOpacity: 0.1 },
	700: { hex: "#6f4d39", name: "Bark 700", glassOpacity: 0.1 },
	800: { hex: "#553a2a", name: "Bark 800", glassOpacity: 0.08 },
	900: { hex: "#3d2914", name: "Bark 900", glassOpacity: 0.06 },
} as const;

/**
 * Status colors
 */
export const STATUS = {
	success: { hex: "#22c55e", name: "Success", glassOpacity: 0.12 },
	warning: { hex: "#f59e0b", name: "Warning", glassOpacity: 0.12 },
	error: { hex: "#dc2626", name: "Error", glassOpacity: 0.1 },
	info: { hex: "#0ea5e9", name: "Info", glassOpacity: 0.12 },
} as const;

/**
 * Combined Grove color schemes for easy access
 */
export const GROVE_COLORS = {
	// Greens
	grove: GROVE_GREEN[500].hex,
	"grove-light": GROVE_GREEN[300].hex,
	"grove-dark": GROVE_GREEN[700].hex,
	"grove-muted": GROVE_GREEN[400].hex,

	// Creams
	cream: CREAM[50].hex,
	"cream-warm": CREAM[200].hex,
	"cream-deep": CREAM[500].hex,

	// Barks
	bark: BARK[900].hex,
	"bark-light": BARK[500].hex,
	"bark-medium": BARK[700].hex,

	// Utility
	white: "#ffffff",
	black: "#000000",
	transparent: "transparent",
} as const;

/**
 * Glass-optimized color schemes
 * Pre-configured for use with Glass components
 */
export const GLASS_SCHEMES = {
	// Light mode schemes (on light backgrounds)
	"grove-mist": {
		color: GROVE_GREEN[500].hex,
		background: "transparent",
		opacity: 0.12,
		description: "Subtle green mist for light glass",
	},
	"cream-haze": {
		color: CREAM[600].hex,
		background: "transparent",
		opacity: 0.15,
		description: "Warm cream haze for cozy glass",
	},
	"bark-shadow": {
		color: BARK[700].hex,
		background: "transparent",
		opacity: 0.08,
		description: "Soft earth shadow for depth",
	},

	// Dark mode schemes (on dark backgrounds)
	"grove-glow": {
		color: GROVE_GREEN[400].hex,
		background: "#1a1915",
		opacity: 0.15,
		description: "Glowing green for dark glass",
	},
	"cream-dust": {
		color: CREAM[300].hex,
		background: "#1a1915",
		opacity: 0.1,
		description: "Dusty cream particles in dark",
	},
	moonlight: {
		color: "#e2e8f0",
		background: "#1a1915",
		opacity: 0.08,
		description: "Cool moonlight glow",
	},

	// Accent schemes
	"spring-fresh": {
		color: GROVE_GREEN[300].hex,
		background: "transparent",
		opacity: 0.18,
		description: "Fresh spring green overlay",
	},
	"autumn-warm": {
		color: "#d97706",
		background: "transparent",
		opacity: 0.1,
		description: "Warm autumn amber tones",
	},
	"winter-frost": {
		color: "#93c5fd",
		background: "transparent",
		opacity: 0.12,
		description: "Cool frost blue overlay",
	},
} as const;

export type GroveColorName = keyof typeof GROVE_COLORS;
export type GlassSchemeName = keyof typeof GLASS_SCHEMES;

/**
 * Get a Grove color by name
 */
export function getGroveColor(name: GroveColorName | string): string {
	if (name in GROVE_COLORS) {
		return GROVE_COLORS[name as GroveColorName];
	}
	// If it's already a hex color, return it
	if (name.startsWith("#")) {
		return name;
	}
	// Default to grove green
	return GROVE_COLORS.grove;
}

/**
 * Get a glass scheme by name
 */
export function getGlassScheme(name: GlassSchemeName | string): {
	color: string;
	background: string;
	opacity: number;
} {
	if (name in GLASS_SCHEMES) {
		const scheme = GLASS_SCHEMES[name as GlassSchemeName];
		return {
			color: scheme.color,
			background: scheme.background,
			opacity: scheme.opacity,
		};
	}
	// Default to grove-mist
	return {
		color: GLASS_SCHEMES["grove-mist"].color,
		background: GLASS_SCHEMES["grove-mist"].background,
		opacity: GLASS_SCHEMES["grove-mist"].opacity,
	};
}

/**
 * List all Grove color names
 */
export function getGroveColorNames(): string[] {
	return Object.keys(GROVE_COLORS);
}

/**
 * List all glass scheme names
 */
export function getGlassSchemeNames(): string[] {
	return Object.keys(GLASS_SCHEMES);
}

/**
 * Apply opacity to a hex color, returning rgba string
 */
export function hexToRgba(hex: string, opacity: number): string {
	const r = parseInt(hex.slice(1, 3), 16);
	const g = parseInt(hex.slice(3, 5), 16);
	const b = parseInt(hex.slice(5, 7), 16);
	return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
