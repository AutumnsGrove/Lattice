/**
 * Unified Tier Configuration
 *
 * Single source of truth for all tier-related data across the Grove ecosystem.
 * This file consolidates feature limits, rate limits, pricing, and display info.
 *
 * Tier progression:
 * - free: Wanderer Plan — 25 posts, 100 MB, no credit card
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
export type TierIcon =
  | "user"
  | "footprints"
  | "sprout"
  | "tree-deciduous"
  | "trees"
  | "crown";

// =============================================================================
// INTERFACES
// =============================================================================

export interface TierLimits {
  posts: number; // Infinity = unlimited, 0 = none
  drafts: number; // Infinity = unlimited, max drafts allowed
  storage: number; // bytes (0 = none)
  storageDisplay: string; // Human-readable storage (e.g., "1 GB")
  themes: number;
  navPages: number;
  commentsPerWeek: number; // Infinity = unlimited
  aiWordsPerMonth: number; // 0 = no AI, Infinity = unlimited
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
  /** Standard (non-grove) name for this tier, shown when Grove Mode is off */
  standardName?: string;
  /** Standard feature strings shown when Grove Mode is off */
  standardFeatureStrings?: string[];
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
    status: "available",
    limits: {
      posts: 25,
      drafts: 100,
      storage: 100 * 1024 * 1024, // 100 MB
      storageDisplay: "100 MB",
      themes: 1,
      navPages: 0,
      commentsPerWeek: 20,
      aiWordsPerMonth: 0,
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
      ai: false,
      analytics: false,
    },
    rateLimits: {
      requests: { limit: 60, windowSeconds: 60 },
      writes: { limit: 20, windowSeconds: 3600 },
      uploads: { limit: 5, windowSeconds: 86400 },
      ai: { limit: 0, windowSeconds: 86400 },
    },
    pricing: {
      monthlyPrice: 0,
      yearlyPrice: 0,
      monthlyPriceCents: 0,
      yearlyPriceCents: 0,
    },
    display: {
      name: "Wanderer",
      tagline: "Your first steps in the grove",
      description:
        "A quiet clearing to try your hand at writing. No commitment, no credit card.",
      icon: "footprints",
      bestFor: "Trying it out",
      featureStrings: [
        "25 blooms",
        "100 MB storage",
        "Your own grove.place address",
        "RSS feed",
        "No credit card needed",
      ],
      standardName: "Free",
      standardFeatureStrings: [
        "25 posts",
        "100 MB storage",
        "Your own grove.place address",
        "RSS feed",
        "No credit card needed",
      ],
    },
    support: { level: "help_center", displayString: "Help Center" },
  },

  seedling: {
    id: "seedling",
    order: 1,
    status: "available",
    limits: {
      posts: 100,
      drafts: Infinity,
      storage: 1 * 1024 * 1024 * 1024, // 1 GB
      storageDisplay: "1 GB",
      themes: 3,
      navPages: 0,
      commentsPerWeek: Infinity,
      aiWordsPerMonth: 750, // ~25/day * 30 days
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
        "Your own corner of the internet. Room to write, no distractions, no ads.",
      icon: "sprout",
      bestFor: "Writers finding their voice",
      featureStrings: [
        "100 blooms",
        "1 GB storage",
        // TODO(foliage): uncomment when themes launch
        // "3 curated themes",
        "Unlimited comments",
        "Meadow access",
        "No ads, no tracking",
      ],
      standardName: "Starter",
      standardFeatureStrings: [
        "100 posts",
        "1 GB storage",
        // TODO(foliage): uncomment when themes launch
        // "3 curated themes",
        "Unlimited comments",
        "Community feed access",
        "No ads, no tracking",
      ],
    },
    support: { level: "community", displayString: "Community" },
  },

  sapling: {
    id: "sapling",
    order: 2,
    status: "coming_soon",
    limits: {
      posts: Infinity,
      drafts: Infinity,
      storage: 5 * 1024 * 1024 * 1024, // 5 GB
      storageDisplay: "5 GB",
      themes: 10,
      navPages: 3,
      commentsPerWeek: Infinity,
      aiWordsPerMonth: 3000, // ~100/day * 30 days
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
      bestFor: "Regular writers",
      featureStrings: [
        "Unlimited blooms",
        "5 GB storage",
        // TODO(foliage): uncomment when themes launch
        // "10 themes",
        "3 nav pages",
        "Email forwarding",
        "Centennial eligible",
        "Everything in Seedling",
      ],
      standardName: "Growth",
      standardFeatureStrings: [
        "Unlimited posts",
        "5 GB storage",
        // TODO(foliage): uncomment when themes launch
        // "10 themes",
        "3 nav pages",
        "Email forwarding",
        "100-year preservation eligible",
        "Everything in Starter",
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
      drafts: Infinity,
      storage: 20 * 1024 * 1024 * 1024, // 20 GB
      storageDisplay: "20 GB",
      themes: Infinity,
      navPages: 5,
      commentsPerWeek: Infinity,
      aiWordsPerMonth: 15000, // ~500/day * 30 days
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
      description:
        "Your own domain, full email, and complete creative control.",
      icon: "trees",
      bestFor: "Established writers",
      featureStrings: [
        "Unlimited blooms",
        "20 GB storage",
        // TODO(foliage): uncomment when themes launch
        // "Theme customizer",
        "5 nav pages",
        "Bring your own domain",
        "Centennial eligible",
        "Priority support",
      ],
      standardName: "Pro",
      standardFeatureStrings: [
        "Unlimited posts",
        "20 GB storage",
        // TODO(foliage): uncomment when themes launch
        // "Theme customizer",
        "5 nav pages",
        "Bring your own domain",
        "100-year preservation eligible",
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
      drafts: Infinity,
      storage: 100 * 1024 * 1024 * 1024, // 100 GB
      storageDisplay: "100 GB",
      themes: Infinity,
      navPages: 8,
      commentsPerWeek: Infinity,
      aiWordsPerMonth: 75000, // ~2500/day * 30 days
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
      description:
        "Domain included, dedicated support, and everything Grove has to offer.",
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
      standardName: "Ultra",
      standardFeatureStrings: [
        "Unlimited everything",
        "100 GB storage",
        "Custom fonts",
        "8 nav pages",
        "Domain included",
        "100-year preservation eligible",
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
 * - Free tier (Wanderer) has tight limits (25 posts, 100 MB), so defaulting
 *   to it could unexpectedly restrict users with unknown/invalid tier data
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
export function getTierLimit(
  tier: TierKey,
  limit: keyof TierLimits,
): number | string {
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
