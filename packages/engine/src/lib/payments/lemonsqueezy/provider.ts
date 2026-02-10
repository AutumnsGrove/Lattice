/**
 * Lemon Squeezy Payment Provider Implementation
 *
 * Implements the PaymentProvider interface using Lemon Squeezy's API.
 * Lemon Squeezy acts as Merchant of Record, handling tax compliance and fraud protection.
 */

import { LemonSqueezyClient, LemonSqueezyAPIError } from "./client.js";

import type {
  LemonSqueezyConfig,
  LemonSqueezyWebhookPayload,
  LemonSqueezySubscriptionAttributes,
  LemonSqueezyOrderAttributes,
} from "./types.js";

import type {
  PaymentProvider,
  PaymentProviderConfig,
  ProductBase,
  ProductVariant,
  CartItem,
  CheckoutOptions,
  CheckoutSession,
  PaymentStatus,
  RefundRequest,
  RefundResult,
  Subscription,
  SubscriptionStatus,
  Customer,
  WebhookResult,
  WebhookEvent,
  WebhookEventType,
} from "../types.js";

// =============================================================================
// LEMON SQUEEZY PROVIDER
// =============================================================================

export class LemonSqueezyProvider implements PaymentProvider {
  readonly name = "lemonsqueezy";

  private readonly client: LemonSqueezyClient;
  private readonly storeId: number;

  constructor(config: PaymentProviderConfig & { storeId?: string }) {
    const lsConfig: LemonSqueezyConfig = {
      apiKey: config.secretKey,
      storeId: config.storeId || process.env.LEMON_SQUEEZY_STORE_ID || "",
      webhookSecret: config.webhookSecret,
    };

    this.client = new LemonSqueezyClient(lsConfig);
    this.storeId = parseInt(lsConfig.storeId, 10);
  }

  // ==========================================================================
  // PRODUCTS & PRICES
  // ==========================================================================

  /**
   * Sync a product to Lemon Squeezy
   *
   * NOTE: Lemon Squeezy products are typically created via the dashboard.
   * This method is a no-op that returns the existing provider product ID
   * if available, or throws if product sync is attempted without an ID.
   */
  async syncProduct(
    product: ProductBase,
  ): Promise<{ providerProductId: string }> {
    // Lemon Squeezy doesn't support programmatic product creation in the same way
    // Products should be created in the LS dashboard and referenced by ID
    // This is a limitation compared to Stripe

    // If product already has a provider ID, return it
    if (product.metadata?.provider_product_id) {
      return { providerProductId: product.metadata.provider_product_id };
    }

    // For now, we log and return a placeholder
    // In production, you'd want to match products by name or metadata
    console.warn(
      `[LemonSqueezy] Product sync not fully supported. Create product "${product.name}" in LS dashboard.`,
    );

    return { providerProductId: `ls_product_${product.id}` };
  }

  /**
   * Sync a price/variant to Lemon Squeezy
   *
   * NOTE: Like products, variants (prices) are created via the dashboard.
   */
  async syncPrice(
    variant: ProductVariant,
    providerProductId: string,
  ): Promise<{ providerPriceId: string }> {
    // Lemon Squeezy variants are created in the dashboard
    // Return existing ID if available
    if (variant.providerPriceId) {
      return { providerPriceId: variant.providerPriceId };
    }

    console.warn(
      `[LemonSqueezy] Price sync not fully supported. Create variant "${variant.name}" in LS dashboard.`,
    );

    return { providerPriceId: `ls_variant_${variant.id}` };
  }

  /**
   * Archive a product in Lemon Squeezy
   *
   * NOTE: Products are archived via the dashboard.
   */
  async archiveProduct(providerProductId: string): Promise<void> {
    console.warn(
      `[LemonSqueezy] Product archival via API not supported. Archive product ${providerProductId} in LS dashboard.`,
    );
  }

  // ==========================================================================
  // CHECKOUT
  // ==========================================================================

  async createCheckoutSession(
    items: CartItem[],
    options: CheckoutOptions,
    resolveVariant: (variantId: string) => Promise<ProductVariant | null>,
  ): Promise<CheckoutSession> {
    // Lemon Squeezy checkouts support a single variant at a time
    // For multi-item carts, you'd need multiple checkouts or a custom solution
    if (items.length === 0) {
      throw new Error("Cart cannot be empty");
    }

    if (items.length > 1) {
      console.warn(
        "[LemonSqueezy] Multi-item checkout not supported, using first item only",
      );
    }

    const firstItem = items[0];
    const variant = await resolveVariant(firstItem.variantId);

    if (!variant) {
      throw new Error(`Variant not found: ${firstItem.variantId}`);
    }

    if (!variant.providerPriceId) {
      throw new Error(`Variant ${variant.id} has no Lemon Squeezy variant ID`);
    }

    const variantId = parseInt(variant.providerPriceId, 10);

    const result = await this.client.createCheckout({
      variantId,
      email: options.customerEmail,
      customData: {
        ...options.metadata,
        grove_checkout_mode: options.mode,
      },
      redirectUrl: options.successUrl,
      receiptButtonText: "Return to Grove",
      receiptThankYouNote: "Thank you for subscribing to Grove!",
    });

    return {
      id: result.id,
      url: result.url,
      status: "open",
      mode: options.mode,
      customerEmail: options.customerEmail,
      metadata: options.metadata,
      paymentStatus: "unpaid",
      expiresAt: result.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000), // Default 24h
    };
  }

  async getCheckoutSession(sessionId: string): Promise<CheckoutSession | null> {
    const checkout = await this.client.getCheckout(sessionId);

    if (!checkout) return null;

    const attrs = checkout.attributes;

    return {
      id: checkout.id,
      url: attrs.url,
      status:
        attrs.expires_at && new Date(attrs.expires_at) < new Date()
          ? "expired"
          : "open",
      mode: "subscription", // LS checkouts are typically subscriptions
      customerEmail: attrs.checkout_data?.email,
      metadata: attrs.checkout_data?.custom as
        | Record<string, string>
        | undefined,
      paymentStatus: "unpaid", // LS checkout status isn't directly available
      expiresAt: attrs.expires_at
        ? new Date(attrs.expires_at)
        : new Date(Date.now() + 24 * 60 * 60 * 1000),
    };
  }

  // ==========================================================================
  // PAYMENTS
  // ==========================================================================

  async getPaymentStatus(providerPaymentId: string): Promise<PaymentStatus> {
    // In Lemon Squeezy, payments are tied to orders
    const order = await this.client.getOrder(providerPaymentId);

    if (!order) return "pending";

    const statusMap: Record<string, PaymentStatus> = {
      pending: "pending",
      failed: "failed",
      paid: "succeeded",
      refunded: "refunded",
      partial_refund: "partially_refunded",
    };

    return statusMap[order.attributes.status] || "pending";
  }

  async refund(
    request: RefundRequest,
    providerPaymentId: string,
  ): Promise<RefundResult> {
    // Lemon Squeezy refunds are processed via the dashboard or support
    // The API doesn't support programmatic refunds as of now
    console.warn(
      `[LemonSqueezy] Programmatic refunds not supported. Process refund for order ${providerPaymentId} via LS dashboard.`,
    );

    return {
      id: `manual_refund_${Date.now()}`,
      orderId: request.orderId,
      amount: { amount: request.amount || 0, currency: "usd" },
      status: "pending",
      reason: request.reason,
      createdAt: new Date(),
    };
  }

  // ==========================================================================
  // SUBSCRIPTIONS
  // ==========================================================================

  async getSubscription(
    providerSubscriptionId: string,
  ): Promise<Subscription | null> {
    const sub = await this.client.getSubscription(providerSubscriptionId);

    if (!sub) return null;

    return this.mapSubscription(sub.id, sub.attributes);
  }

  async cancelSubscription(
    providerSubscriptionId: string,
    cancelImmediately = false,
  ): Promise<void> {
    if (cancelImmediately) {
      // Lemon Squeezy doesn't support immediate cancellation via API
      // It always cancels at period end
      console.warn(
        "[LemonSqueezy] Immediate cancellation not supported, cancelling at period end",
      );
    }

    await this.client.cancelSubscription(providerSubscriptionId);
  }

  async resumeSubscription(providerSubscriptionId: string): Promise<void> {
    await this.client.resumeSubscription(providerSubscriptionId);
  }

  private mapSubscription(
    id: string,
    attrs: LemonSqueezySubscriptionAttributes,
  ): Subscription {
    const statusMap: Record<string, SubscriptionStatus> = {
      on_trial: "active",
      active: "active",
      past_due: "past_due",
      paused: "paused",
      cancelled: "canceled",
      expired: "canceled",
      unpaid: "unpaid",
    };

    return {
      id,
      tenantId: "", // Would need to be stored in custom_data
      customerId: String(attrs.customer_id),
      customerEmail: attrs.user_email,
      productId: String(attrs.product_id),
      variantId: String(attrs.variant_id),
      quantity: 1, // LS doesn't expose quantity the same way
      status: statusMap[attrs.status] || "active",
      currentPeriodStart: new Date(attrs.created_at), // LS doesn't expose period start
      currentPeriodEnd: new Date(attrs.renews_at),
      cancelAtPeriodEnd: attrs.cancelled,
      canceledAt: attrs.ends_at ? new Date(attrs.ends_at) : undefined,
      providerSubscriptionId: id,
      createdAt: new Date(attrs.created_at),
      updatedAt: new Date(attrs.updated_at),
    };
  }

  // ==========================================================================
  // CUSTOMERS
  // ==========================================================================

  async syncCustomer(
    customer: Partial<Customer>,
  ): Promise<{ providerCustomerId: string }> {
    // Lemon Squeezy creates customers automatically during checkout
    // We can look up existing customers by email

    if (customer.providerCustomerId) {
      return { providerCustomerId: customer.providerCustomerId };
    }

    if (customer.email) {
      const existing = await this.client.findCustomerByEmail(customer.email);
      if (existing) {
        return { providerCustomerId: existing.id };
      }
    }

    // Customers are created during checkout, not via API
    console.warn(
      "[LemonSqueezy] Customer sync not supported. Customers are created during checkout.",
    );

    return { providerCustomerId: `pending_${customer.id || "new"}` };
  }

  async getCustomer(providerCustomerId: string): Promise<Customer | null> {
    const cust = await this.client.getCustomer(providerCustomerId);

    if (!cust) return null;

    return {
      id: cust.id,
      tenantId: "", // Would need to be stored elsewhere
      email: cust.attributes.email,
      name: cust.attributes.name,
      providerCustomerId: cust.id,
      createdAt: new Date(cust.attributes.created_at),
      updatedAt: new Date(cust.attributes.updated_at),
    };
  }

  async createBillingPortalSession(
    providerCustomerId: string,
    returnUrl: string,
  ): Promise<{ id: string; url: string }> {
    // Lemon Squeezy provides customer portal URLs directly on the subscription
    // We need to get the subscription to find the portal URL

    // First, try to get customer to find their subscription
    const customer = await this.client.getCustomer(providerCustomerId);

    if (customer?.attributes.urls?.customer_portal) {
      return {
        id: `ls_${providerCustomerId}`,
        url: customer.attributes.urls.customer_portal,
      };
    }

    // Fallback: construct the portal URL (this is a known pattern for LS)
    // The actual URL format depends on your LS store configuration
    console.warn(
      "[LemonSqueezy] Could not find customer portal URL, returning placeholder",
    );

    return {
      id: `ls_fallback_${Date.now()}`,
      url: `https://app.lemonsqueezy.com/my-orders?return_url=${encodeURIComponent(returnUrl)}`,
    };
  }

  // ==========================================================================
  // WEBHOOKS
  // ==========================================================================

  async handleWebhook(request: Request): Promise<WebhookResult> {
    const signature = request.headers.get("x-signature");
    const payload = await request.text();

    const result = await this.client.verifyWebhookSignature(payload, signature);

    if (!result.valid) {
      return { received: false, error: result.error };
    }

    const lsEvent = result.event as LemonSqueezyWebhookPayload;

    const event: WebhookEvent = {
      id: crypto.randomUUID(),
      type: this.mapEventType(lsEvent.meta.event_name),
      data: {
        type: lsEvent.data.type,
        id: lsEvent.data.id,
        attributes: lsEvent.data.attributes,
        customData: lsEvent.meta.custom_data,
        testMode: lsEvent.meta.test_mode,
      },
      createdAt: new Date(),
      providerEventId: lsEvent.data.id,
    };

    return { received: true, event };
  }

  private mapEventType(lsEventName: string): WebhookEventType {
    const typeMap: Record<string, WebhookEventType> = {
      // Orders
      order_created: "payment.succeeded",
      order_refunded: "refund.created",

      // Subscriptions
      subscription_created: "subscription.created",
      subscription_updated: "subscription.updated",
      subscription_cancelled: "subscription.canceled",
      subscription_resumed: "subscription.updated",
      subscription_expired: "subscription.canceled",
      subscription_paused: "subscription.updated",
      subscription_unpaused: "subscription.updated",
      subscription_plan_changed: "subscription.updated",

      // Payments
      subscription_payment_success: "invoice.paid",
      subscription_payment_failed: "invoice.payment_failed",
      subscription_payment_recovered: "invoice.paid",
    };

    return typeMap[lsEventName] || ("payment.succeeded" as WebhookEventType);
  }

  // ==========================================================================
  // STRIPE CONNECT (Not Supported)
  // ==========================================================================

  // Lemon Squeezy does not have a Connect equivalent for marketplace payments
  // These methods are not implemented

  createConnectAccount = undefined;
  getConnectAccount = undefined;
  createConnectAccountLink = undefined;
  createConnectLoginLink = undefined;
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

export function createLemonSqueezyProvider(
  config: PaymentProviderConfig & { storeId?: string },
): LemonSqueezyProvider {
  return new LemonSqueezyProvider(config);
}
