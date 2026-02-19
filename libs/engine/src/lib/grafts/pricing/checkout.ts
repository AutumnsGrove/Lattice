/**
 * LemonSqueezy Checkout URL Generation
 *
 * Utilities for generating checkout URLs for LemonSqueezy payments.
 * Each Grove product can configure their own LemonSqueezy store/products.
 */

import type { TierKey } from "../../config/tiers.js";
import type { BillingPeriod } from "./types.js";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Configuration for LemonSqueezy checkout.
 */
export interface CheckoutConfig {
  /** LemonSqueezy store ID */
  storeId: string;

  /** Product variant IDs by tier */
  products: Partial<
    Record<
      TierKey,
      {
        /** Variant ID for monthly billing */
        monthlyVariantId?: string;
        /** Variant ID for annual billing */
        annualVariantId?: string;
      }
    >
  >;
}

/**
 * Options for generating a checkout URL.
 */
export interface CheckoutOptions {
  /** Pre-fill customer email */
  email?: string;

  /** Apply a discount code */
  discountCode?: string;

  /** Custom success redirect URL */
  successUrl?: string;

  /** Custom cancel redirect URL */
  cancelUrl?: string;

  /** Custom checkout attributes */
  customData?: Record<string, string>;
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Valid pattern for custom data keys.
 * Allows alphanumeric characters, underscores, and hyphens.
 */
const VALID_CUSTOM_DATA_KEY_PATTERN = /^[a-zA-Z0-9_-]+$/;

/**
 * Validate a custom data key to prevent XSS and injection attacks.
 *
 * @param key - The key to validate
 * @returns True if the key is valid
 */
function isValidCustomDataKey(key: string): boolean {
  return VALID_CUSTOM_DATA_KEY_PATTERN.test(key);
}

// =============================================================================
// CHECKOUT URL GENERATION
// =============================================================================

/**
 * Generate a LemonSqueezy checkout URL for a tier and billing period.
 *
 * @param config - LemonSqueezy configuration
 * @param tierKey - Which tier to checkout
 * @param period - Billing period
 * @param options - Additional checkout options
 * @returns Checkout URL, or undefined if tier/period not configured
 *
 * @example
 * ```typescript
 * const config: CheckoutConfig = {
 *   storeId: 'my-store',
 *   products: {
 *     seedling: {
 *       monthlyVariantId: 'abc123',
 *       annualVariantId: 'def456'
 *     }
 *   }
 * };
 *
 * const url = getCheckoutUrl(config, 'seedling', 'monthly', {
 *   email: 'user@example.com',
 *   discountCode: 'WELCOME10'
 * });
 * // => "https://my-store.lemonsqueezy.com/checkout/buy/abc123?..."
 * ```
 */
export function getCheckoutUrl(
  config: CheckoutConfig,
  tierKey: TierKey,
  period: BillingPeriod,
  options: CheckoutOptions = {},
): string | undefined {
  const product = config.products[tierKey];
  if (!product) return undefined;

  const variantId =
    period === "monthly" ? product.monthlyVariantId : product.annualVariantId;

  if (!variantId) return undefined;

  // Build checkout URL
  // LemonSqueezy checkout format: https://{store}.lemonsqueezy.com/checkout/buy/{variant_id}
  const url = new URL(
    `https://${config.storeId}.lemonsqueezy.com/checkout/buy/${variantId}`,
  );

  // Add optional parameters
  if (options.email) {
    url.searchParams.set("checkout[email]", options.email);
  }

  if (options.discountCode) {
    url.searchParams.set("checkout[discount_code]", options.discountCode);
  }

  if (options.successUrl) {
    url.searchParams.set("checkout[success_url]", options.successUrl);
  }

  if (options.cancelUrl) {
    url.searchParams.set("checkout[cancel_url]", options.cancelUrl);
  }

  // Add custom data with validation
  if (options.customData) {
    for (const [key, value] of Object.entries(options.customData)) {
      // Validate key to prevent XSS/injection attacks
      if (!isValidCustomDataKey(key)) {
        console.warn(
          `[checkout] Invalid custom data key "${key}" - must contain only alphanumeric characters, underscores, and hyphens. Skipping.`,
        );
        continue;
      }
      url.searchParams.set(`checkout[custom][${key}]`, value);
    }
  }

  return url.toString();
}

/**
 * Generate checkout URLs for all tiers in a config.
 *
 * @param config - LemonSqueezy configuration
 * @param options - Checkout options to apply to all URLs
 * @returns Map of tier key to checkout URLs
 *
 * @example
 * ```typescript
 * const urls = getAllCheckoutUrls(config, { email: 'user@example.com' });
 * // => {
 * //   seedling: { monthly: 'https://...', annual: 'https://...' },
 * //   sapling: { monthly: 'https://...', annual: 'https://...' },
 * //   ...
 * // }
 * ```
 */
export function getAllCheckoutUrls(
  config: CheckoutConfig,
  options: CheckoutOptions = {},
): Record<TierKey, { monthly?: string; annual?: string }> {
  const tiers: TierKey[] = ["free", "seedling", "sapling", "oak", "evergreen"];
  const result = {} as Record<TierKey, { monthly?: string; annual?: string }>;

  for (const tier of tiers) {
    result[tier] = {
      monthly: getCheckoutUrl(config, tier, "monthly", options),
      annual: getCheckoutUrl(config, tier, "annual", options),
    };
  }

  return result;
}

/**
 * Create a checkout config from environment variables.
 *
 * @param env - Environment object with LemonSqueezy config
 * @returns Checkout configuration
 *
 * @example
 * ```typescript
 * // In +page.server.ts
 * const checkoutConfig = createCheckoutConfigFromEnv({
 *   LEMON_SQUEEZY_STORE_ID: 'my-store',
 *   LEMON_SEEDLING_MONTHLY: 'abc123',
 *   LEMON_SEEDLING_ANNUAL: 'def456',
 *   // ... etc
 * });
 * ```
 */
export function createCheckoutConfigFromEnv(env: {
  LEMON_SQUEEZY_STORE_ID?: string;
  LEMON_SEEDLING_MONTHLY?: string;
  LEMON_SEEDLING_ANNUAL?: string;
  LEMON_SAPLING_MONTHLY?: string;
  LEMON_SAPLING_ANNUAL?: string;
  LEMON_OAK_MONTHLY?: string;
  LEMON_OAK_ANNUAL?: string;
  LEMON_EVERGREEN_MONTHLY?: string;
  LEMON_EVERGREEN_ANNUAL?: string;
}): CheckoutConfig {
  return {
    storeId: env.LEMON_SQUEEZY_STORE_ID ?? "",
    products: {
      // Free tier has no checkout
      seedling: {
        monthlyVariantId: env.LEMON_SEEDLING_MONTHLY,
        annualVariantId: env.LEMON_SEEDLING_ANNUAL,
      },
      sapling: {
        monthlyVariantId: env.LEMON_SAPLING_MONTHLY,
        annualVariantId: env.LEMON_SAPLING_ANNUAL,
      },
      oak: {
        monthlyVariantId: env.LEMON_OAK_MONTHLY,
        annualVariantId: env.LEMON_OAK_ANNUAL,
      },
      evergreen: {
        monthlyVariantId: env.LEMON_EVERGREEN_MONTHLY,
        annualVariantId: env.LEMON_EVERGREEN_ANNUAL,
      },
    },
  };
}
