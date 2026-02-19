// src/lib/utils/tier-access.ts
// Feature gating by user tier

import type { UserTier, Theme } from "../types.js";

/**
 * Tier hierarchy for comparison
 */
const TIER_LEVELS: Record<UserTier, number> = {
	free: 0,
	seedling: 1,
	sapling: 2,
	oak: 3,
	evergreen: 4,
};

/**
 * Check if user has access to a specific tier level
 */
export function hasTierAccess(userTier: UserTier, requiredTier: UserTier): boolean {
	return TIER_LEVELS[userTier] >= TIER_LEVELS[requiredTier];
}

/**
 * Check if user can access a specific theme
 */
export function canAccessTheme(userTier: UserTier, theme: Theme): boolean {
	return hasTierAccess(userTier, theme.tier);
}

/**
 * Check if user has access to the theme customizer
 */
export function canUseCustomizer(userTier: UserTier): boolean {
	return hasTierAccess(userTier, "oak");
}

/**
 * Check if user can upload custom fonts
 */
export function canUploadFonts(userTier: UserTier): boolean {
	return hasTierAccess(userTier, "evergreen");
}

/**
 * Check if user can access community themes
 */
export function canAccessCommunityThemes(userTier: UserTier): boolean {
	return hasTierAccess(userTier, "oak");
}

/**
 * Get the number of themes available for a tier
 */
export function getThemeCountForTier(userTier: UserTier): number {
	if (userTier === "free") return 0;
	if (userTier === "seedling") return 3;
	return 10;
}
