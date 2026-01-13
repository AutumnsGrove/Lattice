/**
 * Lemon Squeezy Configuration and Helpers
 *
 * Contains variant IDs for all plans and checkout session creation.
 * Plan display information is derived from the unified tier config.
 *
 * SETUP INSTRUCTIONS:
 * -------------------
 * 1. Go to Lemon Squeezy Dashboard → Products (https://app.lemonsqueezy.com/products)
 * 2. Create 4 products with monthly + yearly variants (see unified config for prices)
 * 3. Copy each variant ID and set environment variables or update the defaults below
 * 4. Set environment variables in Cloudflare Dashboard:
 *    - LEMON_SQUEEZY_API_KEY (from Settings → API)
 *    - LEMON_SQUEEZY_STORE_ID (from Settings → Store)
 *    - LEMON_SQUEEZY_WEBHOOK_SECRET (from Settings → Webhooks)
 *
 * See docs/grove-payment-migration.md for detailed instructions.
 */

import {
  lemonSqueezySetup,
  createCheckout,
} from "@lemonsqueezy/lemonsqueezy.js";

import {
  TIERS,
  PAID_TIERS,
  type PaidTierKey,
} from "@autumnsgrove/groveengine/config";

// =============================================================================
// VARIANT IDS
// =============================================================================

/**
 * Lemon Squeezy Variant IDs
 *
 * Get these from your Lemon Squeezy Dashboard → Products → [Product] → Variants
 * Each variant has a numeric ID visible in the URL or API response.
 *
 * IMPORTANT: Replace these placeholder IDs with your actual Lemon Squeezy variant IDs!
 */
export function getLemonSqueezyVariants(env?: Record<string, string>) {
  return {
    seedling: {
      // Seedling tier: $8/month, ~$81/year (15% off)
      monthly: parseInt(env?.LEMON_SQUEEZY_SEEDLING_VARIANT_MONTHLY || "0", 10),
      yearly: parseInt(env?.LEMON_SQUEEZY_SEEDLING_VARIANT_YEARLY || "0", 10),
    },
    sapling: {
      // Sapling tier: $12/month, ~$122/year
      monthly: parseInt(env?.LEMON_SQUEEZY_SAPLING_VARIANT_MONTHLY || "0", 10),
      yearly: parseInt(env?.LEMON_SQUEEZY_SAPLING_VARIANT_YEARLY || "0", 10),
    },
    oak: {
      // Oak tier: $25/month, ~$255/year
      monthly: parseInt(env?.LEMON_SQUEEZY_OAK_VARIANT_MONTHLY || "0", 10),
      yearly: parseInt(env?.LEMON_SQUEEZY_OAK_VARIANT_YEARLY || "0", 10),
    },
    evergreen: {
      // Evergreen tier: $35/month, ~$357/year
      monthly: parseInt(
        env?.LEMON_SQUEEZY_EVERGREEN_VARIANT_MONTHLY || "0",
        10,
      ),
      yearly: parseInt(env?.LEMON_SQUEEZY_EVERGREEN_VARIANT_YEARLY || "0", 10),
    },
  } as const;
}

// Backward compatibility - returns variants with default env
export const LEMON_SQUEEZY_VARIANTS = getLemonSqueezyVariants();

export type PlanId = keyof typeof LEMON_SQUEEZY_VARIANTS;
export type BillingCycle = "monthly" | "yearly";

/**
 * Get the Lemon Squeezy variant ID for a plan and billing cycle
 */
export function getVariantId(
  plan: PlanId,
  billingCycle: BillingCycle,
  env?: Record<string, string>,
): number {
  const variants = getLemonSqueezyVariants(env);
  return variants[plan][billingCycle];
}

// =============================================================================
// CHECKOUT CREATION
// =============================================================================

/**
 * Initialize Lemon Squeezy SDK
 * Must be called before creating checkouts
 */
function initLemonSqueezy(apiKey: string): void {
  lemonSqueezySetup({
    apiKey,
    onError: (error) => {
      console.error("[LemonSqueezy] SDK Error:", error);
    },
  });
}

/**
 * Create a Lemon Squeezy checkout session
 */
export async function createCheckoutSession(params: {
  lemonSqueezyApiKey: string;
  lemonSqueezyStoreId: string;
  variantId: number;
  customerEmail: string;
  onboardingId: string;
  username: string;
  plan: string;
  billingCycle: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ checkoutId: string; url: string }> {
  initLemonSqueezy(params.lemonSqueezyApiKey);

  const storeId = parseInt(params.lemonSqueezyStoreId, 10);

  console.log("[LemonSqueezy] Creating checkout:", {
    storeId,
    variantId: params.variantId,
    email: params.customerEmail,
    onboardingId: params.onboardingId,
  });

  const { data, error } = await createCheckout(storeId, params.variantId, {
    checkoutData: {
      email: params.customerEmail,
      custom: {
        onboarding_id: params.onboardingId,
        username: params.username,
        plan: params.plan,
        billing_cycle: params.billingCycle,
      },
    },
    productOptions: {
      redirectUrl: params.successUrl,
      receiptButtonText: "Return to Grove",
      receiptThankYouNote:
        "Thank you for subscribing to Grove! Your garden awaits.",
    },
    checkoutOptions: {
      embed: false,
      media: true,
      logo: true,
    },
  });

  if (error) {
    console.error("[LemonSqueezy] Checkout creation failed:", error);
    throw new Error(error.message || `Failed to create Lemon Squeezy checkout`);
  }

  if (!data?.data?.attributes?.url) {
    throw new Error("No checkout URL returned from Lemon Squeezy");
  }

  console.log("[LemonSqueezy] Created checkout:", data.data.id);

  return {
    checkoutId: data.data.id,
    url: data.data.attributes.url,
  };
}

// =============================================================================
// WEBHOOK VERIFICATION
// =============================================================================

/**
 * Verify Lemon Squeezy webhook signature
 *
 * Lemon Squeezy uses HMAC-SHA256 with the raw body and webhook secret.
 * The signature is sent in the `x-signature` header as a hex string.
 */
export async function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  if (!signature || !secret) {
    return false;
  }

  try {
    // Compute HMAC-SHA256
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );

    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(payload),
    );

    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Constant-time comparison to prevent timing attacks
    if (expectedSignature.length !== signature.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < expectedSignature.length; i++) {
      result |= expectedSignature.charCodeAt(i) ^ signature.charCodeAt(i);
    }

    return result === 0;
  } catch (error) {
    console.error(
      "[LemonSqueezy] Webhook signature verification failed:",
      error,
    );
    return false;
  }
}

// =============================================================================
// SUBSCRIPTION STATUS MAPPING
// =============================================================================

/**
 * Map Lemon Squeezy subscription status to Grove status
 */
export function mapSubscriptionStatus(
  lsStatus: string,
): "active" | "trialing" | "past_due" | "paused" | "cancelled" | "expired" {
  const statusMap: Record<
    string,
    "active" | "trialing" | "past_due" | "paused" | "cancelled" | "expired"
  > = {
    on_trial: "trialing",
    active: "active",
    paused: "paused",
    past_due: "past_due",
    unpaid: "past_due",
    cancelled: "cancelled",
    expired: "expired",
  };

  return statusMap[lsStatus] || "active";
}

// =============================================================================
// WEBHOOK EVENT TYPES
// =============================================================================

/**
 * Lemon Squeezy webhook event names we care about
 */
export type LemonSqueezyEventName =
  | "order_created"
  | "order_refunded"
  | "subscription_created"
  | "subscription_updated"
  | "subscription_cancelled"
  | "subscription_resumed"
  | "subscription_expired"
  | "subscription_paused"
  | "subscription_unpaused"
  | "subscription_plan_changed"
  | "subscription_payment_success"
  | "subscription_payment_failed"
  | "subscription_payment_recovered";

/**
 * Lemon Squeezy webhook payload structure
 */
export interface LemonSqueezyWebhookPayload {
  meta: {
    event_name: LemonSqueezyEventName;
    custom_data?: {
      onboarding_id?: string;
      username?: string;
      plan?: string;
      billing_cycle?: string;
      [key: string]: unknown;
    };
    test_mode: boolean;
  };
  data: {
    id: string;
    type: string;
    attributes: Record<string, unknown>;
    relationships?: Record<string, unknown>;
  };
}
