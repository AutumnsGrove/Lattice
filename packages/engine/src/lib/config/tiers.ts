/**
 * Unified Tier Configuration
 *
 * Single source of truth for all tier-related data across the Grove ecosystem.
 * This file consolidates feature limits, rate limits, pricing, and display info.
 *
 * Tier progression:
 * - free: Meadow-only (no blog) - coming soon
 * - seedling: $8/mo entry tier
 * - sapling: $12/mo mid tier - coming soon
 * - oak: $25/mo with BYOD domain - future
 * - evergreen: $35/mo full service - future
 */

// =============================================================================
// TIER IDENTIFIERS
// =============================================================================

export type TierKey = "free" | "seedling" | "sapling" | "oak" | "evergreen";
export type PaidTierKey = Exclude<TierKey, "free">;
export type TierStatus = "available" | "coming_soon" | "future" | "deprecated";
export type TierIcon = "user" | "sprout" | "tree-deciduous" | "trees" | "crown";

// =============================================================================
// INTERFACES
// =============================================================================

export interface TierLimits {
  posts: number; // Infinity = unlimited, 0 = none
  storage: number; // bytes (0 = none)
  themes: number;
  navPages: number;
  commentsPerWeek: number; // Infinity = unlimited
}

export interface TierFeatures {
  blog: boolean;
  meadow: boolean;
  emailForwarding: boolean;
  fullEmail: boolean;
  customDomain: boolean;
  byod: boolean; // Bring Your Own Domain
  themeCustomizer: boolean;
  customFonts: boolean;
  centennial: boolean;
  shop: boolean;
  ai: boolean;
  analytics: boolean;
}

export interface RateLimitConfig {
  limit: number;
  windowSeconds: number;
}

export interface TierRateLimits {
  requests: RateLimitConfig;
  writes: RateLimitConfig;
  uploads: RateLimitConfig;
  ai: RateLimitConfig;
}

export interface TierPricing {
  monthlyPrice: number; // dollars
  yearlyPrice: number; // dollars
  monthlyPriceCents: number; // for Stripe
  yearlyPriceCents: number; // for Stripe
}

export interface TierDisplay {
  name: string;
  tagline: string;
  description: string;
  icon: TierIcon;
  bestFor: string;
  featureStrings: string[];
}

export type SupportLevel =
  | "help_center"
  | "community"
  | "email"
  | "priority"
  | "dedicated";

export interface TierSupport {
  level: SupportLevel;
  displayString: string;
  includedHours?: number;
}

export interface TierConfig {
  id: TierKey;
  order: number;
  status: TierStatus;
  limits: TierLimits;
  features: TierFeatures;
  rateLimits: TierRateLimits;
  pricing: TierPricing;
  display: TierDisplay;
  support: TierSupport;
}

// =============================================================================
// TIER DEFINITIONS
// =============================================================================

export const TIERS: Record<TierKey, TierConfig> = {
  free: {
    id: "free",
    order: 0,
    status: "coming_soon",
    limits: {
      posts: 0,
      storage: 0,
      themes: 0,
      navPages: 0,
      commentsPerWeek: 20,
    },
    features: {
      blog: false,
      meadow: true,
      emailForwarding: false,
      fullEmail: false,
      customDomain: false,
      byod: false,
      themeCustomizer: false,
      customFonts: false,
      centennial: false,
      shop: false,
      ai: false,
      analytics: false,
    },
    rateLimits: {
      requests: { limit: 50, windowSeconds: 60 },
      writes: { limit: 20, windowSeconds: 3600 },
      uploads: { limit: 0, windowSeconds: 86400 },
      ai: { limit: 0, windowSeconds: 86400 },
    },
    pricing: {
      monthlyPrice: 0,
      yearlyPrice: 0,
      monthlyPriceCents: 0,
      yearlyPriceCents: 0,
    },
    display: {
      name: "Free",
      tagline: "Just visiting",
      description: "Hang out in Meadow, follow blogs, react and comment.",
      icon: "user",
      bestFor: "Readers",
      featureStrings: [
        "Meadow access",
        "20 comments/week",
        "Follow blogs",
        "React to posts",
      ],
    },
    support: { level: "help_center", displayString: "Help Center" },
  },

  seedling: {
    id: "seedling",
    order: 1,
    status: "available",
    limits: {
      posts: 50,
      storage: 1 * 1024 * 1024 * 1024, // 1 GB
      themes: 3,
      navPages: 0,
      commentsPerWeek: Infinity,
    },
    features: {
      blog: true,
      meadow: true,
      emailForwarding: false,
      fullEmail: false,
      customDomain: false,
      byod: false,
      themeCustomizer: false,
      customFonts: false,
      centennial: false,
      shop: false,
      ai: true,
      analytics: false,
    },
    rateLimits: {
      requests: { limit: 100, windowSeconds: 60 },
      writes: { limit: 50, windowSeconds: 3600 },
      uploads: { limit: 10, windowSeconds: 86400 },
      ai: { limit: 25, windowSeconds: 86400 },
    },
    pricing: {
      monthlyPrice: 8,
      yearlyPrice: 81.6,
      monthlyPriceCents: 800,
      yearlyPriceCents: 8160,
    },
    display: {
      name: "Seedling",
      tagline: "Just planted",
      description:
        "Perfect for getting started. A quiet corner to call your own.",
      icon: "sprout",
      bestFor: "Curious",
      featureStrings: [
        "50 posts",
        "1 GB storage",
        "3 curated themes",
        "Meadow access",
        "RSS feed",
        "No ads ever",
      ],
    },
    support: { level: "community", displayString: "Community" },
  },

  sapling: {
    id: "sapling",
    order: 2,
    status: "coming_soon",
    limits: {
      posts: 250,
      storage: 5 * 1024 * 1024 * 1024, // 5 GB
      themes: 10,
      navPages: 3,
      commentsPerWeek: Infinity,
    },
    features: {
      blog: true,
      meadow: true,
      emailForwarding: true,
      fullEmail: false,
      customDomain: false,
      byod: false,
      themeCustomizer: false,
      customFonts: false,
      centennial: true,
      shop: true,
      ai: true,
      analytics: false,
    },
    rateLimits: {
      requests: { limit: 500, windowSeconds: 60 },
      writes: { limit: 200, windowSeconds: 3600 },
      uploads: { limit: 50, windowSeconds: 86400 },
      ai: { limit: 100, windowSeconds: 86400 },
    },
    pricing: {
      monthlyPrice: 12,
      yearlyPrice: 122.4,
      monthlyPriceCents: 1200,
      yearlyPriceCents: 12240,
    },
    display: {
      name: "Sapling",
      tagline: "Growing strong",
      description: "For blogs finding their voice. Room to stretch and grow.",
      icon: "tree-deciduous",
      bestFor: "Hobbyists",
      featureStrings: [
        "250 posts",
        "5 GB storage",
        "10 themes",
        "3 nav pages",
        "Email forwarding",
        "Centennial eligible",
        "Everything in Seedling",
      ],
    },
    support: { level: "email", displayString: "Email" },
  },

  oak: {
    id: "oak",
    order: 3,
    status: "future",
    limits: {
      posts: Infinity,
      storage: 20 * 1024 * 1024 * 1024, // 20 GB
      themes: Infinity,
      navPages: 5,
      commentsPerWeek: Infinity,
    },
    features: {
      blog: true,
      meadow: true,
      emailForwarding: true,
      fullEmail: true,
      customDomain: true,
      byod: true,
      themeCustomizer: true,
      customFonts: false,
      centennial: true,
      shop: true,
      ai: true,
      analytics: true,
    },
    rateLimits: {
      requests: { limit: 1000, windowSeconds: 60 },
      writes: { limit: 500, windowSeconds: 3600 },
      uploads: { limit: 200, windowSeconds: 86400 },
      ai: { limit: 500, windowSeconds: 86400 },
    },
    pricing: {
      monthlyPrice: 25,
      yearlyPrice: 255,
      monthlyPriceCents: 2500,
      yearlyPriceCents: 25500,
    },
    display: {
      name: "Oak",
      tagline: "Deep roots",
      description: "Full creative control. Your blog, your rules.",
      icon: "trees",
      bestFor: "Serious Bloggers",
      featureStrings: [
        "Unlimited posts",
        "20 GB storage",
        "Theme customizer",
        "5 nav pages",
        "Bring your own domain",
        "Centennial eligible",
        "Priority support",
      ],
    },
    support: { level: "priority", displayString: "Priority" },
  },

  evergreen: {
    id: "evergreen",
    order: 4,
    status: "future",
    limits: {
      posts: Infinity,
      storage: 100 * 1024 * 1024 * 1024, // 100 GB
      themes: Infinity,
      navPages: 8,
      commentsPerWeek: Infinity,
    },
    features: {
      blog: true,
      meadow: true,
      emailForwarding: true,
      fullEmail: true,
      customDomain: true,
      byod: false, // Domain included
      themeCustomizer: true,
      customFonts: true,
      centennial: true,
      shop: true,
      ai: true,
      analytics: true,
    },
    rateLimits: {
      requests: { limit: 5000, windowSeconds: 60 },
      writes: { limit: 2000, windowSeconds: 3600 },
      uploads: { limit: 1000, windowSeconds: 86400 },
      ai: { limit: 2500, windowSeconds: 86400 },
    },
    pricing: {
      monthlyPrice: 35,
      yearlyPrice: 357,
      monthlyPriceCents: 3500,
      yearlyPriceCents: 35700,
    },
    display: {
      name: "Evergreen",
      tagline: "Always flourishing",
      description: "The complete package. Everything Grove has to offer.",
      icon: "crown",
      bestFor: "Professionals",
      featureStrings: [
        "Unlimited everything",
        "100 GB storage",
        "Custom fonts",
        "8 nav pages",
        "Domain included",
        "Centennial eligible",
        "8 hrs/mo dedicated support",
      ],
    },
    support: {
      level: "dedicated",
      displayString: "8hrs + Priority",
      includedHours: 8,
    },
  },
} as const;

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Default tier used when tier is unknown, invalid, or not yet determined.
 * Used as a safe fallback throughout the codebase to ensure consistent behavior.
 *
 * Seedling is the default because:
 * - It's the entry-level paid tier with reasonable limits
 * - Free tier doesn't have blog access, so can't be a safe default
 * - It provides a good baseline without being overly permissive
 */
export const DEFAULT_TIER: TierKey = "seedling";

// =============================================================================
// HELPER ARRAYS
// =============================================================================

export const TIER_ORDER: TierKey[] = [
  "free",
  "seedling",
  "sapling",
  "oak",
  "evergreen",
];
export const PAID_TIERS: PaidTierKey[] = [
  "seedling",
  "sapling",
  "oak",
  "evergreen",
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get tier config by key (throws if invalid).
 */
export function getTier(key: TierKey): TierConfig {
  return TIERS[key];
}

/**
 * Get tier config safely (returns undefined if invalid).
 */
export function getTierSafe(key: string): TierConfig | undefined {
  return isValidTier(key) ? TIERS[key] : undefined;
}

/**
 * Check if a string is a valid tier key.
 */
export function isValidTier(key: string): key is TierKey {
  return key in TIERS;
}

/**
 * Check if a tier is a paid tier.
 */
export function isPaidTier(key: string): key is PaidTierKey {
  return PAID_TIERS.includes(key as PaidTierKey);
}

/**
 * Get all tiers with 'available' status.
 */
export function getAvailableTiers(): TierConfig[] {
  return TIER_ORDER.map((k) => TIERS[k]).filter(
    (t) => t.status === "available",
  );
}

/**
 * Get all tiers in order.
 */
export function getTiersInOrder(): TierConfig[] {
  return TIER_ORDER.map((k) => TIERS[k]);
}

/**
 * Check if a tier has a specific feature enabled.
 */
export function tierHasFeature(
  tier: TierKey,
  feature: keyof TierFeatures,
): boolean {
  return TIERS[tier].features[feature];
}

/**
 * Get a specific limit for a tier.
 */
export function getTierLimit(tier: TierKey, limit: keyof TierLimits): number {
  return TIERS[tier].limits[limit];
}

/**
 * Get rate limits for a tier.
 */
export function getTierRateLimits(tier: TierKey): TierRateLimits {
  return TIERS[tier].rateLimits;
}

/**
 * Format storage size for display.
 */
export function formatStorage(bytes: number): string {
  if (bytes === 0) return "—";
  if (bytes === Infinity) return "Unlimited";
  const gb = bytes / (1024 * 1024 * 1024);
  return gb >= 1 ? `${gb} GB` : `${bytes / (1024 * 1024)} MB`;
}

/**
 * Format a numeric limit for display.
 */
export function formatLimit(value: number): string {
  if (value === 0) return "—";
  if (value === Infinity) return "Unlimited";
  return value.toString();
}

/**
 * Get the next tier in the upgrade path.
 */
export function getNextTier(current: TierKey): TierKey | null {
  const idx = TIER_ORDER.indexOf(current);
  return idx === -1 || idx === TIER_ORDER.length - 1
    ? null
    : TIER_ORDER[idx + 1];
}

/**
 * Get all tiers that have a specific feature enabled.
 */
export function getTiersWithFeature(feature: keyof TierFeatures): TierKey[] {
  return TIER_ORDER.filter((key) => TIERS[key].features[feature]);
}
