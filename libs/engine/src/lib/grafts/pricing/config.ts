/**
 * Pricing Graft Configuration
 *
 * Utilities for transforming tier config into display-ready pricing data.
 */

import {
  TIERS,
  TIER_ORDER,
  formatStorage,
  formatLimit,
  type TierKey,
  type TierConfig,
} from "../../config/tiers.js";
import type { PricingTier, PricingTierLimits } from "./types.js";

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Default tier order for pricing display.
 */
export const DEFAULT_TIER_ORDER: TierKey[] = TIER_ORDER;

/**
 * Default annual savings percentage (15%).
 */
export const DEFAULT_ANNUAL_SAVINGS = 15;

// =============================================================================
// TRANSFORMATION HELPERS
// =============================================================================

/**
 * Format themes for display based on tier features.
 *
 * @param config - Tier configuration
 * @returns Formatted theme string
 */
function formatThemes(config: TierConfig): string {
  const themes = config.limits.themes;
  const hasCustomizer = config.features.themeCustomizer;
  const hasCustomFonts = config.features.customFonts;

  if (themes === 0) return "—";
  if (themes === Infinity && hasCustomFonts) return "All + Customizer + Fonts";
  if (themes === Infinity && hasCustomizer) return "All + Customizer";
  if (themes === Infinity) return "All themes";
  return `${themes} themes`;
}

/**
 * Format tier limits for display.
 *
 * @param config - Tier configuration
 * @returns Formatted limits object
 */
function formatLimits(config: TierConfig): PricingTierLimits {
  return {
    posts: formatLimit(config.limits.posts),
    storage: formatStorage(config.limits.storage),
    themes: formatThemes(config),
    navPages: formatLimit(config.limits.navPages),
    commentsPerWeek:
      config.limits.commentsPerWeek === Infinity
        ? "Unlimited"
        : config.limits.commentsPerWeek === 0
          ? "—"
          : `${config.limits.commentsPerWeek}/week`,
  };
}

/**
 * Calculate annual savings percentage.
 *
 * @param monthlyPrice - Monthly price
 * @param annualPrice - Annual price
 * @returns Savings percentage (0-100)
 */
export function calculateAnnualSavings(
  monthlyPrice: number,
  annualPrice: number,
): number {
  if (monthlyPrice <= 0) return 0;
  const monthlyEquivalent = annualPrice / 12;
  return Math.round((1 - monthlyEquivalent / monthlyPrice) * 100);
}

// =============================================================================
// TIER TRANSFORMATION
// =============================================================================

/**
 * Transform a raw tier config into a display-ready pricing tier.
 *
 * @param key - Tier key
 * @param config - Tier configuration
 * @param checkoutUrls - Checkout URLs for this tier
 * @param options - Additional display options
 * @returns Display-ready pricing tier
 *
 * @example
 * ```typescript
 * const seedlingTier = transformTier('seedling', TIERS.seedling, {
 *   monthly: 'https://checkout.lemonsqueezy.com/...',
 *   annual: 'https://checkout.lemonsqueezy.com/...'
 * }, { highlight: true, badge: 'Most Popular' });
 * ```
 */
export function transformTier(
  key: TierKey,
  config: TierConfig,
  checkoutUrls: { monthly?: string; annual?: string } = {},
  options: { highlight?: boolean; badge?: string } = {},
): PricingTier {
  const monthlyPrice = config.pricing.monthlyPrice;
  const annualPrice = config.pricing.yearlyPrice;
  const annualSavings = calculateAnnualSavings(monthlyPrice, annualPrice);

  return {
    key,
    name: config.display.name,
    tagline: config.display.tagline,
    icon: config.display.icon,
    status: config.status,
    bestFor: config.display.bestFor,
    monthlyPrice,
    annualPrice,
    annualSavings,
    limits: formatLimits(config),
    features: config.features,
    featureStrings: config.display.featureStrings,
    standardName: config.display.standardName,
    standardFeatureStrings: config.display.standardFeatureStrings,
    supportLevel: config.support.displayString,
    highlight: options.highlight,
    badge: options.badge,
    checkoutUrls,
  };
}

/**
 * Transform all tiers into display-ready format.
 *
 * @param options - Options for transformation
 * @returns Array of display-ready pricing tiers
 *
 * @example
 * ```typescript
 * // Simple usage - all tiers with defaults
 * const tiers = transformAllTiers();
 *
 * // With checkout URLs and highlighting
 * const tiers = transformAllTiers({
 *   checkoutUrls: {
 *     seedling: { monthly: '...', annual: '...' },
 *     sapling: { monthly: '...', annual: '...' }
 *   },
 *   highlightTier: 'seedling',
 *   badges: { seedling: 'Most Popular' }
 * });
 * ```
 */
export function transformAllTiers(
  options: {
    /** Checkout URLs by tier key */
    checkoutUrls?: Record<TierKey, { monthly?: string; annual?: string }>;
    /** Which tier to highlight */
    highlightTier?: TierKey;
    /** Badges by tier key */
    badges?: Partial<Record<TierKey, string>>;
    /** Custom tier order */
    tierOrder?: TierKey[];
    /** Filter to only include specific tiers */
    includeTiers?: TierKey[];
    /** Exclude specific tiers */
    excludeTiers?: TierKey[];
  } = {},
): PricingTier[] {
  const {
    checkoutUrls = {} as Record<TierKey, { monthly?: string; annual?: string }>,
    highlightTier,
    badges = {},
    tierOrder = DEFAULT_TIER_ORDER,
    includeTiers,
    excludeTiers = [],
  } = options;

  let tiers = tierOrder;

  // Apply include filter
  if (includeTiers) {
    tiers = tiers.filter((key) => includeTiers.includes(key));
  }

  // Apply exclude filter
  tiers = tiers.filter((key) => !excludeTiers.includes(key));

  return tiers.map((key) =>
    transformTier(key, TIERS[key], checkoutUrls[key] ?? {}, {
      highlight: key === highlightTier,
      badge: badges[key],
    }),
  );
}

// =============================================================================
// DISPLAY HELPERS
// =============================================================================

/**
 * Get price to display based on billing period.
 *
 * @param tier - Pricing tier
 * @param period - Billing period
 * @returns Price string
 */
export function getDisplayPrice(
  tier: PricingTier,
  period: "monthly" | "annual",
): string {
  if (tier.monthlyPrice === 0) return "Free";

  const price =
    period === "monthly" ? tier.monthlyPrice : Math.round(tier.annualPrice);

  return `$${price}`;
}

/**
 * Get price suffix (e.g., "/mo" or "/yr").
 *
 * @param period - Billing period
 * @returns Price suffix
 */
export function getPriceSuffix(period: "monthly" | "annual"): string {
  return period === "monthly" ? "/mo" : "/yr";
}

/**
 * Format annual price as monthly equivalent.
 *
 * @param annualPrice - Annual price
 * @returns Monthly equivalent string
 */
export function formatAnnualAsMonthly(annualPrice: number): string {
  const monthly = annualPrice / 12;
  return `$${monthly.toFixed(2)}/mo`;
}

/**
 * Get the display price value for a tier based on billing period.
 *
 * When viewing annual billing, shows the monthly equivalent (annual / 12).
 * Returns just the numeric value as a string (no $ prefix or /mo suffix),
 * suitable for flexible UI composition.
 *
 * @param tier - Pricing tier
 * @param period - Billing period
 * @returns Price value as string (e.g., "5", "4.17")
 *
 * @example
 * ```typescript
 * const price = getMonthlyEquivalentPrice(seedling, 'monthly'); // "5"
 * const price = getMonthlyEquivalentPrice(seedling, 'annual');  // "4.25"
 *
 * // In Svelte template:
 * <span>${getMonthlyEquivalentPrice(tier, period)}</span>
 * <span>/mo</span>
 * ```
 */
export function getMonthlyEquivalentPrice(
  tier: PricingTier,
  period: "monthly" | "annual",
): string {
  if (period === "annual") {
    const monthlyEquivalent = tier.annualPrice / 12;
    // Show clean integers when possible, otherwise 2 decimal places
    return monthlyEquivalent % 1 === 0
      ? monthlyEquivalent.toFixed(0)
      : monthlyEquivalent.toFixed(2);
  }
  return tier.monthlyPrice.toString();
}

/**
 * Calculate the dollar amount saved per year with annual billing.
 *
 * @param tier - Pricing tier
 * @returns Savings amount as a formatted string (e.g., "12")
 *
 * @example
 * ```typescript
 * const savings = getYearlySavingsAmount(seedling); // "9"
 *
 * // In Svelte template:
 * <p>Save ${getYearlySavingsAmount(tier)}/year</p>
 * ```
 */
export function getYearlySavingsAmount(tier: PricingTier): string {
  const fullYearAtMonthly = tier.monthlyPrice * 12;
  const savings = fullYearAtMonthly - tier.annualPrice;
  return savings.toFixed(0);
}

// =============================================================================
// BILLING PERIOD UTILITIES
// =============================================================================

/**
 * Database billing cycle format.
 * Some systems (like LemonSqueezy webhooks) use "yearly" instead of "annual".
 */
export type DbBillingCycle = "monthly" | "yearly";

/**
 * Convert graft billing period to database format.
 *
 * The graft uses "annual" (standard pricing terminology) but databases
 * and some external systems use "yearly".
 *
 * @param period - Billing period from the graft
 * @returns Database-compatible billing cycle
 *
 * @example
 * ```typescript
 * const dbCycle = billingPeriodToDbFormat('annual'); // 'yearly'
 * ```
 */
export function billingPeriodToDbFormat(
  period: "monthly" | "annual",
): DbBillingCycle {
  return period === "annual" ? "yearly" : "monthly";
}

/**
 * Convert database billing cycle to graft billing period.
 *
 * @param dbFormat - Database billing cycle
 * @returns Graft-compatible billing period
 *
 * @example
 * ```typescript
 * const period = dbFormatToBillingPeriod('yearly'); // 'annual'
 * ```
 */
export function dbFormatToBillingPeriod(
  dbFormat: DbBillingCycle,
): "monthly" | "annual" {
  return dbFormat === "yearly" ? "annual" : "monthly";
}
