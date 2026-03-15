/**
 * Season Metadata — favicon paths and theme colors per season
 *
 * Used by the root layout (<svelte:head>) and the dynamic PWA manifest
 * to serve personalized seasonal favicons. (#1304)
 *
 * Summer is the default — its files use the original names (no suffix).
 * Other seasons use suffixed filenames: icon-192-autumn.png, etc.
 */

import type { Season } from "$lib/ui/types/season";
import { ALL_SEASONS } from "$lib/ui/types/season";

// ─────────────────────────────────────────────────────────────────────────────
// THEME COLORS
// ─────────────────────────────────────────────────────────────────────────────

/** Browser chrome / PWA theme color per season */
export const SEASON_THEME_COLORS: Record<Season, string> = {
	spring: "#be185d", // Rose — cherry blossom pink
	summer: "#16a34a", // Grove green — the original
	autumn: "#ea580c", // Warm orange — sunset glow
	winter: "#1e40af", // Deep blue — crystalline ice
	midnight: "#7c3aed", // Violet — the queer fifth season
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// FAVICON PATHS
// ─────────────────────────────────────────────────────────────────────────────

interface SeasonFavicons {
	svg: string;
	png32: string;
	appleTouch: string;
	icon192: string;
	icon512: string;
	themeColor: string;
}

/** Get favicon file paths for a given season */
export function getSeasonFavicons(season: Season): SeasonFavicons {
	const suffix = season === "summer" ? "" : `-${season}`;
	return {
		svg: `/favicon${suffix}.svg`,
		png32: `/favicon-32x32${suffix}.png`,
		appleTouch: `/apple-touch-icon${suffix}.png`,
		icon192: `/icon-192${suffix}.png`,
		icon512: `/icon-512${suffix}.png`,
		themeColor: SEASON_THEME_COLORS[season],
	};
}

/** Validate a string as a Season, returning the default if invalid */
export function resolveSeasonPreference(value: string | undefined): Season | null {
	if (!value) return null;
	return ALL_SEASONS.includes(value as Season) ? (value as Season) : null;
}
