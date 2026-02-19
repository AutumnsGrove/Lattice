/**
 * Grove Payments Module
 *
 * Abstract payment provider system with pluggable implementations.
 * Currently supports Stripe, designed for easy addition of Paddle, LemonSqueezy, etc.
 *
 * @example
 * ```ts
 * import { createPaymentProvider, type PaymentProvider } from '$lib/payments';
 *
 * // Create a Stripe provider
 * const payments = createPaymentProvider('stripe', {
 *   secretKey: platform.env.STRIPE_SECRET_KEY,
 *   webhookSecret: platform.env.STRIPE_WEBHOOK_SECRET,
 * });
 *
 * // Use the provider
 * const session = await payments.createCheckoutSession(items, options, resolveVariant);
 * ```
 */

import { createStripeProvider } from "./stripe/index.js";
import { createLemonSqueezyProvider } from "./lemonsqueezy/index.js";
import type { PaymentProvider, PaymentProviderConfig } from "./types.js";

// =============================================================================
// PROVIDER FACTORY
// =============================================================================

export type ProviderType = "stripe" | "paddle" | "lemonsqueezy";

/**
 * Create a payment provider instance
 *
 * @param type - The payment provider type ('stripe', 'paddle', etc.)
 * @param config - Provider-specific configuration
 * @returns A PaymentProvider implementation
 */
export function createPaymentProvider(
  type: ProviderType,
  config: PaymentProviderConfig,
): PaymentProvider {
  switch (type) {
    case "stripe":
      return createStripeProvider(config);

    case "paddle":
      throw new Error("Paddle provider not yet implemented");

    case "lemonsqueezy":
      return createLemonSqueezyProvider(config);

    default:
      throw new Error(`Unknown payment provider: ${type}`);
  }
}

// =============================================================================
// RE-EXPORTS
// =============================================================================

// All types from the types module
export * from "./types.js";

// Stripe-specific exports (for advanced usage)
export {
  StripeClient,
  StripeAPIError,
  StripeProvider,
  createStripeProvider,
} from "./stripe/index.js";

export type {
  StripeClientConfig,
  StripeProduct,
  StripePrice,
  StripeCheckoutSession,
  StripeEvent,
} from "./stripe/index.js";

// Lemon Squeezy-specific exports
export {
  LemonSqueezyClient,
  LemonSqueezyAPIError,
  LemonSqueezyProvider,
  createLemonSqueezyProvider,
} from "./lemonsqueezy/index.js";

export type {
  LemonSqueezyConfig,
  LemonSqueezyCheckout,
  LemonSqueezySubscription,
  LemonSqueezyCustomer,
  LemonSqueezyOrder,
  LemonSqueezyWebhookPayload,
} from "./lemonsqueezy/index.js";
