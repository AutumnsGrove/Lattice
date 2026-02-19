/**
 * Lemon Squeezy API Client for Cloudflare Workers
 *
 * A lightweight wrapper around the @lemonsqueezy/lemonsqueezy.js SDK.
 * Handles initialization, API calls, and webhook signature verification.
 */

import {
  lemonSqueezySetup,
  createCheckout,
  getCheckout,
  getSubscription,
  updateSubscription,
  cancelSubscription,
  getCustomer,
  listCustomers,
  getOrder,
  type Checkout,
  type Subscription,
  type Customer,
  type Order,
} from "@lemonsqueezy/lemonsqueezy.js";

import type {
  LemonSqueezyConfig,
  LemonSqueezyCheckoutAttributes,
  LemonSqueezySubscriptionAttributes,
  LemonSqueezyCustomerAttributes,
  LemonSqueezyOrderAttributes,
} from "./types.js";

// =============================================================================
// ERROR CLASS
// =============================================================================

export class LemonSqueezyAPIError extends Error {
  public readonly statusCode: number;
  public readonly code?: string;

  constructor(message: string, statusCode: number, code?: string) {
    super(message);
    this.name = "LemonSqueezyAPIError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

// =============================================================================
// CLIENT CLASS
// =============================================================================

export class LemonSqueezyClient {
  private readonly apiKey: string;
  private readonly storeId: number;
  private readonly webhookSecret?: string;
  private initialized = false;

  constructor(config: LemonSqueezyConfig) {
    this.apiKey = config.apiKey;
    this.storeId = parseInt(config.storeId, 10);
    this.webhookSecret = config.webhookSecret;
  }

  /**
   * Initialize the Lemon Squeezy SDK
   * Must be called before any API operations
   */
  private init(): void {
    if (this.initialized) return;

    lemonSqueezySetup({
      apiKey: this.apiKey,
      onError: (error) => {
        console.error("[LemonSqueezy Error]:", error);
      },
    });

    this.initialized = true;
  }

  // ==========================================================================
  // CHECKOUT
  // ==========================================================================

  /**
   * Create a checkout session
   */
  async createCheckout(options: {
    variantId: number;
    email?: string;
    name?: string;
    customData?: Record<string, string | number | boolean>;
    redirectUrl?: string;
    receiptButtonText?: string;
    receiptThankYouNote?: string;
    expiresAt?: Date;
  }): Promise<{ id: string; url: string; expiresAt: Date | null }> {
    this.init();

    const checkoutOptions: Parameters<typeof createCheckout>[2] = {
      checkoutData: {
        email: options.email,
        name: options.name,
        custom: options.customData,
      },
      productOptions: {
        redirectUrl: options.redirectUrl ?? "https://grove.place/dashboard",
        receiptButtonText: options.receiptButtonText ?? "Return to Grove",
        receiptThankYouNote:
          options.receiptThankYouNote ?? "Thank you for subscribing to Grove!",
      },
      checkoutOptions: {
        embed: false,
        media: true,
        logo: true,
      },
    };

    // Add expiration if specified
    if (options.expiresAt) {
      checkoutOptions.expiresAt = options.expiresAt.toISOString();
    }

    const { data, error } = await createCheckout(
      this.storeId,
      options.variantId,
      checkoutOptions,
    );

    if (error) {
      throw new LemonSqueezyAPIError(
        error.message || "Failed to create checkout",
        (error.cause as number) || 500,
      );
    }

    if (!data?.data?.attributes?.url) {
      throw new LemonSqueezyAPIError("No checkout URL returned", 500);
    }

    // Cast through unknown - SDK types don't fully match our interface
    const attrs = data.data
      .attributes as unknown as LemonSqueezyCheckoutAttributes;
    return {
      id: data.data.id,
      url: attrs.url,
      expiresAt: attrs.expires_at ? new Date(attrs.expires_at) : null,
    };
  }

  /**
   * Get a checkout session by ID
   */
  async getCheckout(checkoutId: string): Promise<Checkout["data"] | null> {
    this.init();

    const { data, error } = await getCheckout(checkoutId);

    if (error) {
      if (String(error.cause) === "404") return null;
      throw new LemonSqueezyAPIError(
        error.message || "Failed to get checkout",
        (error.cause as number) || 500,
      );
    }

    return data?.data ?? null;
  }

  // ==========================================================================
  // SUBSCRIPTIONS
  // ==========================================================================

  /**
   * Get a subscription by ID
   */
  async getSubscription(subscriptionId: string): Promise<{
    id: string;
    attributes: LemonSqueezySubscriptionAttributes;
  } | null> {
    this.init();

    const { data, error } = await getSubscription(subscriptionId);

    if (error) {
      if (String(error.cause) === "404") return null;
      throw new LemonSqueezyAPIError(
        error.message || "Failed to get subscription",
        (error.cause as number) || 500,
      );
    }

    if (!data?.data) return null;

    return {
      id: data.data.id,
      attributes: data.data.attributes as LemonSqueezySubscriptionAttributes,
    };
  }

  /**
   * Update a subscription (e.g., change variant/plan)
   */
  async updateSubscription(
    subscriptionId: string,
    options: {
      variantId?: number;
      pause?: { mode: "void" | "free" } | null;
      cancelled?: boolean;
    },
  ): Promise<{ id: string; attributes: LemonSqueezySubscriptionAttributes }> {
    this.init();

    const updateData: Parameters<typeof updateSubscription>[1] = {};

    if (options.variantId !== undefined) {
      updateData.variantId = options.variantId;
    }

    if (options.pause !== undefined) {
      updateData.pause = options.pause;
    }

    if (options.cancelled !== undefined) {
      updateData.cancelled = options.cancelled;
    }

    const { data, error } = await updateSubscription(
      subscriptionId,
      updateData,
    );

    if (error) {
      throw new LemonSqueezyAPIError(
        error.message || "Failed to update subscription",
        (error.cause as number) || 500,
      );
    }

    if (!data?.data) {
      throw new LemonSqueezyAPIError("No subscription data returned", 500);
    }

    return {
      id: data.data.id,
      attributes: data.data.attributes as LemonSqueezySubscriptionAttributes,
    };
  }

  /**
   * Cancel a subscription (sets cancelled to true, ends at period end)
   */
  async cancelSubscription(subscriptionId: string): Promise<void> {
    this.init();

    const { error } = await cancelSubscription(subscriptionId);

    if (error) {
      throw new LemonSqueezyAPIError(
        error.message || "Failed to cancel subscription",
        (error.cause as number) || 500,
      );
    }
  }

  /**
   * Resume a cancelled subscription (sets cancelled to false)
   */
  async resumeSubscription(subscriptionId: string): Promise<void> {
    await this.updateSubscription(subscriptionId, { cancelled: false });
  }

  /**
   * Pause a subscription
   */
  async pauseSubscription(
    subscriptionId: string,
    mode: "void" | "free" = "void",
  ): Promise<void> {
    await this.updateSubscription(subscriptionId, { pause: { mode } });
  }

  /**
   * Unpause a subscription
   */
  async unpauseSubscription(subscriptionId: string): Promise<void> {
    await this.updateSubscription(subscriptionId, { pause: null });
  }

  // ==========================================================================
  // CUSTOMERS
  // ==========================================================================

  /**
   * Get a customer by ID
   */
  async getCustomer(customerId: string): Promise<{
    id: string;
    attributes: LemonSqueezyCustomerAttributes;
  } | null> {
    this.init();

    const { data, error } = await getCustomer(customerId);

    if (error) {
      if (String(error.cause) === "404") return null;
      throw new LemonSqueezyAPIError(
        error.message || "Failed to get customer",
        (error.cause as number) || 500,
      );
    }

    if (!data?.data) return null;

    return {
      id: data.data.id,
      attributes: data.data.attributes as LemonSqueezyCustomerAttributes,
    };
  }

  /**
   * Find a customer by email
   */
  async findCustomerByEmail(email: string): Promise<{
    id: string;
    attributes: LemonSqueezyCustomerAttributes;
  } | null> {
    this.init();

    const { data, error } = await listCustomers({
      filter: {
        storeId: this.storeId,
        email,
      },
    });

    if (error) {
      throw new LemonSqueezyAPIError(
        error.message || "Failed to find customer",
        (error.cause as number) || 500,
      );
    }

    if (!data?.data || data.data.length === 0) return null;

    const customer = data.data[0];
    return {
      id: customer.id,
      attributes: customer.attributes as LemonSqueezyCustomerAttributes,
    };
  }

  // ==========================================================================
  // ORDERS
  // ==========================================================================

  /**
   * Get an order by ID
   */
  async getOrder(orderId: string): Promise<{
    id: string;
    attributes: LemonSqueezyOrderAttributes;
  } | null> {
    this.init();

    const { data, error } = await getOrder(orderId);

    if (error) {
      if (String(error.cause) === "404") return null;
      throw new LemonSqueezyAPIError(
        error.message || "Failed to get order",
        (error.cause as number) || 500,
      );
    }

    if (!data?.data) return null;

    return {
      id: data.data.id,
      attributes: data.data.attributes as LemonSqueezyOrderAttributes,
    };
  }

  // ==========================================================================
  // WEBHOOK VERIFICATION
  // ==========================================================================

  /**
   * Verify a webhook signature from Lemon Squeezy
   *
   * @param payload - Raw request body as string
   * @param signature - x-signature header value (hex-encoded HMAC-SHA256)
   * @returns Verification result with parsed event on success
   */
  async verifyWebhookSignature(
    payload: string,
    signature: string | null,
  ): Promise<{ valid: boolean; event?: unknown; error?: string }> {
    if (!signature) {
      return { valid: false, error: "Missing x-signature header" };
    }

    if (!this.webhookSecret) {
      return { valid: false, error: "Webhook secret not configured" };
    }

    try {
      // Compute HMAC-SHA256
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(this.webhookSecret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
      );

      const signatureBytes = await crypto.subtle.sign(
        "HMAC",
        key,
        encoder.encode(payload),
      );

      const expectedSignature = Array.from(new Uint8Array(signatureBytes))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      // Constant-time comparison
      if (!this.secureCompare(expectedSignature, signature)) {
        return { valid: false, error: "Signature mismatch" };
      }

      // Parse and return the event
      const event = JSON.parse(payload);
      return { valid: true, event };
    } catch (err) {
      return { valid: false, error: `Verification failed: ${err}` };
    }
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   */
  private secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  /**
   * Get the store ID
   */
  getStoreId(): number {
    return this.storeId;
  }
}
