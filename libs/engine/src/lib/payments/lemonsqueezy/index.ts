/**
 * Lemon Squeezy Payment Provider
 *
 * @example
 * ```ts
 * import { createLemonSqueezyProvider } from '$lib/payments/lemonsqueezy';
 *
 * const payments = createLemonSqueezyProvider({
 *   secretKey: platform.env.LEMON_SQUEEZY_API_KEY,
 *   storeId: platform.env.LEMON_SQUEEZY_STORE_ID,
 *   webhookSecret: platform.env.LEMON_SQUEEZY_WEBHOOK_SECRET,
 * });
 *
 * const session = await payments.createCheckoutSession(items, options, resolveVariant);
 * ```
 */

export { LemonSqueezyClient, LemonSqueezyAPIError } from "./client.js";
export {
  LemonSqueezyProvider,
  createLemonSqueezyProvider,
} from "./provider.js";

// Re-export Lemon Squeezy-specific types
export type {
  LemonSqueezyConfig,
  LemonSqueezyResponse,
  LemonSqueezyResource,
  LemonSqueezyStoreAttributes,
  LemonSqueezyStore,
  LemonSqueezyProductAttributes,
  LemonSqueezyProduct,
  LemonSqueezyVariantAttributes,
  LemonSqueezyVariant,
  LemonSqueezyCheckoutAttributes,
  LemonSqueezyCheckout,
  LemonSqueezyCustomerAttributes,
  LemonSqueezyCustomer,
  LemonSqueezySubscriptionStatus,
  LemonSqueezySubscriptionAttributes,
  LemonSqueezySubscription,
  LemonSqueezyOrderStatus,
  LemonSqueezyOrderAttributes,
  LemonSqueezyOrder,
  LemonSqueezyWebhookEventName,
  LemonSqueezyWebhookMeta,
  LemonSqueezyWebhookPayload,
  LemonSqueezySubscriptionWebhook,
  LemonSqueezyOrderWebhook,
} from "./types.js";
