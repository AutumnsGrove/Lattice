// src/lib/themes/registry.ts
// Theme registry for lookups and tier-based filtering

import type { Theme, UserTier } from "../types.js";
import { grove } from "./grove.js";
import { minimal } from "./minimal.js";
import { nightGarden } from "./night-garden.js";
import { zine } from "./zine.js";
import { moodboard } from "./moodboard.js";
import { typewriter } from "./typewriter.js";
import { solarpunk } from "./solarpunk.js";
import { cozyCabin } from "./cozy-cabin.js";
import { ocean } from "./ocean.js";
import { wildflower } from "./wildflower.js";

/**
 * All available themes indexed by ID
 */
export const themes: Record<string, Theme> = {
	grove,
	minimal,
	"night-garden": nightGarden,
	zine,
	moodboard,
	typewriter,
	solarpunk,
	"cozy-cabin": cozyCabin,
	ocean,
	wildflower,
};

/**
 * All themes as an array (for iteration)
 */
export const themeList: Theme[] = Object.values(themes);

/**
 * Get a theme by ID
 */
export function getTheme(id: string): Theme | undefined {
	return themes[id];
}

/**
 * Get themes available for a given user tier
 * - Free: no themes
 * - Seedling: grove, minimal, night-garden
 * - Sapling+: all themes
 */
export function getThemesForTier(tier: UserTier): Theme[] {
	const allThemes = Object.values(themes);

	switch (tier) {
		case "free":
			return [];
		case "seedling":
			return allThemes.filter((theme) => theme.tier === "seedling");
		case "sapling":
		case "oak":
		case "evergreen":
			return allThemes;
		default:
			return [];
	}
}
