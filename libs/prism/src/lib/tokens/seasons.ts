/**
 * Prism seasonal palette constants
 *
 * Four seasonal palettes for color shifts throughout the year.
 * Each palette defines the emotional tone and accent colors
 * that layer on top of the base theme.
 */

import type { Season } from "../types.js";

export interface SeasonalPalette {
	/** Dominant color for the season */
	primary: string;
	/** Secondary accent, complements primary */
	accent: string;
	/** Supporting color for variety */
	secondary: string;
	/** Highlight / pop of color */
	highlight: string;
}

export const SEASONAL_PALETTES: Record<Season, SeasonalPalette> = {
	spring: {
		primary: "#84cc16", // lime-500 — fresh green
		accent: "#f472b6", // pink-400 — cherry blossom
		secondary: "#65a30d", // lime-600 — deeper green
		highlight: "#38bdf8", // sky-400 — spring sky
	},
	summer: {
		primary: "#166534", // green-800 — deep forest
		accent: "#0284c7", // sky-600 — rich sky blue
		secondary: "#15803d", // green-700 — canopy green
		highlight: "#facc15", // yellow-400 — sunshine
	},
	autumn: {
		primary: "#b45309", // amber-700 — rust
		accent: "#f59e0b", // amber-500 — amber
		secondary: "#92400e", // amber-800 — deep rust
		highlight: "#eab308", // yellow-500 — gold
	},
	winter: {
		primary: "#475569", // slate-600 — quiet slate
		accent: "#e2e8f0", // slate-200 — frost
		secondary: "#166534", // green-800 — evergreen
		highlight: "#bae6fd", // sky-200 — ice blue
	},
} as const;
