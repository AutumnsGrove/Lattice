/**
 * Tier Feature Limits
 *
 * Static feature limits per subscription tier.
 * Defines what each tier can have (storage, posts, nav pages, etc.)
 *
 * These are distinct from rate limits (requests per minute).
 * Rate limits control "how fast", feature limits control "how much".
 */

// ============================================================================
// Feature Limits by Tier
// ============================================================================

/**
 * Feature limits per subscription tier.
 * Each tier unlocks progressively more capabilities.
 *
 * Tier mapping:
 * - free: Meadow-only (no blog)
 * - seedling: $8/mo entry tier
 * - sapling: $12/mo mid tier
 * - oak: $25/mo with BYOD domain
 * - evergreen: $35/mo full service
 */
export const TIER_FEATURE_LIMITS = {
  free: {
    posts: 0, // No blog for free tier
    storage: 0, // No storage
    themes: 0, // No theme selection
    navPages: 0, // No navigation customization
    emailForwarding: false,
    customDomain: false,
    themeCustomizer: false,
    customFonts: false,
  },
  seedling: {
    posts: 50,
    storage: 1 * 1024 * 1024 * 1024, // 1 GB in bytes
    themes: 3,
    navPages: 3, // 3 custom nav pages
    emailForwarding: false,
    customDomain: false,
    themeCustomizer: false,
    customFonts: false,
  },
  sapling: {
    posts: 250,
    storage: 5 * 1024 * 1024 * 1024, // 5 GB in bytes
    themes: 10,
    navPages: 5, // 5 custom nav pages
    emailForwarding: true,
    customDomain: false,
    themeCustomizer: false,
    customFonts: false,
  },
  oak: {
    posts: Infinity, // Unlimited
    storage: 20 * 1024 * 1024 * 1024, // 20 GB in bytes
    themes: Infinity, // All themes
    navPages: 8, // 8 custom nav pages
    emailForwarding: true,
    customDomain: true, // BYOD
    themeCustomizer: true,
    customFonts: false,
  },
  evergreen: {
    posts: Infinity,
    storage: 100 * 1024 * 1024 * 1024, // 100 GB in bytes
    themes: Infinity,
    navPages: 8, // Same as Oak - nav pages cap at 8
    emailForwarding: true,
    customDomain: true, // Domain included
    themeCustomizer: true,
    customFonts: true,
  },
} as const;

// ============================================================================
// Types
// ============================================================================

export type SubscriptionTier = keyof typeof TIER_FEATURE_LIMITS;
export type FeatureKey = keyof (typeof TIER_FEATURE_LIMITS)["seedling"];

export interface TierFeatures {
  posts: number;
  storage: number;
  themes: number;
  navPages: number;
  emailForwarding: boolean;
  customDomain: boolean;
  themeCustomizer: boolean;
  customFonts: boolean;
}

// ============================================================================
// Helpers
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
  return tier in TIER_FEATURE_LIMITS;
}

/**
 * Get nav page limit for a tier (convenience function).
 * Returns 0 for invalid tiers.
 */
export function getNavPageLimit(tier: string): number {
  if (!isValidTier(tier)) return 0;
  return TIER_FEATURE_LIMITS[tier].navPages;
}

/**
 * Format storage size for display.
 */
export function formatStorage(bytes: number): string {
  if (bytes === 0) return "0 GB";
  if (bytes === Infinity) return "Unlimited";

  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb} GB`;

  const mb = bytes / (1024 * 1024);
  return `${mb} MB`;
}

/**
 * Format feature count for display.
 */
export function formatLimit(count: number): string {
  if (count === 0) return "None";
  if (count === Infinity) return "Unlimited";
  return count.toString();
}
