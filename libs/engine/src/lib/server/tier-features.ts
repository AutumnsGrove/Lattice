/**
 * Tier Feature Limits
 *
 * Backward-compatible wrapper around the unified tier config.
 * Maintains existing exports while delegating to the single source of truth.
 *
 * @deprecated Import directly from '../config/tiers.js' for new code.
 */

import {
  TIERS,
  TIER_ORDER,
  type TierKey,
  isValidTier as configIsValidTier,
  formatStorage as configFormatStorage,
  formatLimit as configFormatLimit,
} from "../config/tiers.js";

// ============================================================================
// Types (backward compatible)
// ============================================================================

export type SubscriptionTier = TierKey;
export type FeatureKey = keyof TierFeatures;

export interface TierFeatures {
  posts: number;
  drafts: number;
  storage: number;
  themes: number;
  navPages: number;
  emailForwarding: boolean;
  customDomain: boolean;
  themeCustomizer: boolean;
  customFonts: boolean;
}

// ============================================================================
// Feature Limits (derived from unified config)
// ============================================================================

/**
 * Feature limits per subscription tier.
 * Derived from the unified tier config.
 */
export const TIER_FEATURE_LIMITS = Object.fromEntries(
  TIER_ORDER.map((key) => [
    key,
    {
      posts: TIERS[key].limits.posts,
      drafts: TIERS[key].limits.drafts,
      storage: TIERS[key].limits.storage,
      themes: TIERS[key].limits.themes,
      navPages: TIERS[key].limits.navPages,
      emailForwarding: TIERS[key].features.emailForwarding,
      customDomain: TIERS[key].features.customDomain,
      themeCustomizer: TIERS[key].features.themeCustomizer,
      customFonts: TIERS[key].features.customFonts,
    },
  ]),
) as Record<SubscriptionTier, TierFeatures>;

// ============================================================================
// Helpers (delegate to unified config)
// ============================================================================

/**
 * Get all feature limits for a tier.
 */
export function getTierFeatures(tier: SubscriptionTier): TierFeatures {
  return TIER_FEATURE_LIMITS[tier];
}

/**
 * Get a specific feature limit for a tier.
 */
export function getFeatureLimit(
  tier: SubscriptionTier,
  feature: FeatureKey,
): number | boolean {
  return TIER_FEATURE_LIMITS[tier][feature];
}

/**
 * Check if a tier has a specific feature enabled.
 * Works for boolean features like customDomain.
 */
export function hasFeature(
  tier: SubscriptionTier,
  feature: FeatureKey,
): boolean {
  const value = TIER_FEATURE_LIMITS[tier][feature];
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  return false;
}

/**
 * Check if a tier is valid.
 */
export function isValidTier(tier: string): tier is SubscriptionTier {
  return configIsValidTier(tier);
}

/**
 * Get nav page limit for a tier (convenience function).
 * Returns 0 for invalid tiers.
 */
export function getNavPageLimit(tier: string): number {
  if (!isValidTier(tier)) return 0;
  return TIERS[tier].limits.navPages;
}

/**
 * Format storage size for display.
 */
export const formatStorage = configFormatStorage;

/**
 * Format feature count for display.
 */
export const formatLimit = configFormatLimit;
