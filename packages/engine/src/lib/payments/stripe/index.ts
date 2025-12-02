/**
 * Stripe Payment Provider
 *
 * @example
 * ```ts
 * import { createStripeProvider } from '$lib/payments/stripe';
 *
 * const stripe = createStripeProvider({
 *   secretKey: platform.env.STRIPE_SECRET_KEY,
 *   webhookSecret: platform.env.STRIPE_WEBHOOK_SECRET,
 * });
 *
 * const session = await stripe.createCheckoutSession(items, options, resolveVariant);
 * ```
 */

export { StripeClient, StripeAPIError } from './client.js';
export { StripeProvider, createStripeProvider } from './provider.js';

// Re-export Stripe-specific types
export type {
  StripeClientConfig,
  StripeRequestOptions,
  StripeError,
  StripeProduct,
  StripePrice,
  StripeCheckoutSession,
  StripeCustomer,
  StripeAddress,
  StripePaymentIntent,
  StripeSubscription,
  StripeRefund,
  StripeAccount,
  StripeAccountLink,
  StripeLoginLink,
  StripeBillingPortalSession,
  StripeEvent,
} from './client.js';
