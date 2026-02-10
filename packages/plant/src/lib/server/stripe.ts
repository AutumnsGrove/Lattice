/**
 * Stripe Configuration and Helpers
 *
 * Contains price IDs for all Grove subscription plans and checkout session creation.
 * Plan display information is derived from the unified tier config.
 *
 * SETUP INSTRUCTIONS:
 * -------------------
 * 1. Go to Stripe Dashboard → Products (https://dashboard.stripe.com/products)
 * 2. Products should already exist (created previously)
 * 3. Copy each Price ID (starts with 'price_') and update STRIPE_PRICES below
 * 4. Set environment variables in Cloudflare Dashboard:
 *    - STRIPE_SECRET_KEY (from Developers → API Keys)
 *    - STRIPE_WEBHOOK_SECRET (from Developers → Webhooks → Signing secret)
 *
 * ONLY 2 SECRETS NEEDED! Price IDs are hardcoded below (not secrets).
 */

import { PAID_TIERS, type PaidTierKey } from "@autumnsgrove/groveengine/config";

// =============================================================================
// STRIPE PRICE IDS
// =============================================================================

/**
 * Stripe Price IDs
 *
 * Get these from your Stripe Dashboard → Products → [Product] → Pricing
 * Each price has an ID starting with 'price_' visible when you click on it.
 *
 * These are NOT secrets - price IDs are visible in checkout URLs and safe to commit.
 * This eliminates the need for 8 environment variables!
 *
 * TODO: Replace these placeholder IDs with your actual Stripe price IDs
 */
export const STRIPE_PRICES = {
  seedling: {
    // Seedling tier: $8/month, ~$81/year (15% off)
    monthly: "price_1ShXzXRpJ6WVdxl3dwuzZX90",
    yearly: "price_1ShXzXRpJ6WVdxl38ZgKg4Wk",
  },
  sapling: {
    // Sapling tier: $12/month, ~$122/year
    monthly: "price_1ShY0MRpJ6WVdxl33inwSBKH",
    yearly: "price_1ShY0MRpJ6WVdxl3RI7YAUBK",
  },
  oak: {
    // Oak tier: $25/month, ~$255/year
    monthly: "price_1ShY0yRpJ6WVdxl3GRhURSI8",
    yearly: "price_1ShY0yRpJ6WVdxl38u1qm3EX",
  },
  evergreen: {
    // Evergreen tier: $35/month, ~$357/year
    monthly: "price_1ShY1fRpJ6WVdxl3IiVhJ7BQ",
    yearly: "price_1ShY1fRpJ6WVdxl3rOJXhOkP",
  },
} as const;

export type PlanId = PaidTierKey;
export type BillingCycle = "monthly" | "yearly";

/**
 * Get the Stripe Price ID for a plan and billing cycle
 */
export function getPriceId(plan: PlanId, billingCycle: BillingCycle): string {
  const priceId = STRIPE_PRICES[plan]?.[billingCycle];
  if (!priceId || priceId.includes("REPLACE_ME")) {
    throw new Error(
      `Stripe price ID not configured for ${plan} ${billingCycle}. ` +
        `Update STRIPE_PRICES in packages/plant/src/lib/server/stripe.ts`,
    );
  }
  return priceId;
}

// =============================================================================
// STRIPE API CONSTANTS
// =============================================================================

const STRIPE_API_VERSION = "2024-11-20.acacia";
const STRIPE_API_BASE = "https://api.stripe.com/v1";

// =============================================================================
// CHECKOUT CREATION
// =============================================================================

export interface CreateCheckoutParams {
  stripeSecretKey: string;
  priceId: string;
  customerEmail: string;
  onboardingId: string;
  username: string;
  plan: PlanId;
  billingCycle: BillingCycle;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSession {
  sessionId: string;
  url: string;
}

/**
 * Create a Stripe Checkout Session for subscription signup
 *
 * Uses Stripe's hosted checkout page with:
 * - Automatic tax calculation (Stripe Tax)
 * - Billing address collection
 * - Metadata for webhook processing
 */
export async function createCheckoutSession(
  params: CreateCheckoutParams,
): Promise<CheckoutSession> {
  const {
    stripeSecretKey,
    priceId,
    customerEmail,
    onboardingId,
    username,
    plan,
    billingCycle,
    successUrl,
    cancelUrl,
  } = params;

  console.log("[Stripe] Creating checkout session:", {
    priceId,
    email: customerEmail.replace(/(.{2}).*(@.*)/, "$1***$2"),
    onboardingId,
    plan,
    billingCycle,
  });

  // Build the request body as form-urlencoded
  const body = new URLSearchParams({
    mode: "subscription",
    "line_items[0][price]": priceId,
    "line_items[0][quantity]": "1",
    customer_email: customerEmail,
    success_url: successUrl,
    cancel_url: cancelUrl,
    // Enable automatic tax calculation
    "automatic_tax[enabled]": "true",
    // Collect billing address for accurate tax
    billing_address_collection: "required",
    // Allow promotion codes (for comping friends!)
    allow_promotion_codes: "true",
    // Store metadata for webhook processing
    "metadata[onboarding_id]": onboardingId,
    "metadata[username]": username,
    "metadata[plan]": plan,
    "metadata[billing_cycle]": billingCycle,
    // Also store in subscription metadata (survives beyond checkout)
    "subscription_data[metadata][onboarding_id]": onboardingId,
    "subscription_data[metadata][username]": username,
    "subscription_data[metadata][plan]": plan,
    "subscription_data[metadata][billing_cycle]": billingCycle,
  });

  const response = await fetch(`${STRIPE_API_BASE}/checkout/sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Stripe-Version": STRIPE_API_VERSION,
    },
    body: body.toString(),
  });

  const data = (await response.json()) as {
    id?: string;
    url?: string;
    error?: { message: string; type: string };
  };

  if (!response.ok || data.error) {
    const errorMsg = data.error?.message || "Unknown Stripe error";
    console.error("[Stripe] Checkout creation failed:", data.error);
    throw new Error(`Stripe checkout failed: ${errorMsg}`);
  }

  if (!data.url || !data.id) {
    throw new Error("No checkout URL returned from Stripe");
  }

  console.log("[Stripe] Created checkout session:", data.id);

  return {
    sessionId: data.id,
    url: data.url,
  };
}

// =============================================================================
// WEBHOOK VERIFICATION
// =============================================================================

/**
 * Verify Stripe webhook signature
 *
 * Stripe uses HMAC-SHA256 with format: t=timestamp,v1=signature
 * The signed payload is: timestamp.rawBody
 */
export async function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
  toleranceSeconds = 300,
): Promise<{ valid: boolean; event?: StripeWebhookEvent; error?: string }> {
  if (!signature || !secret) {
    return { valid: false, error: "Missing signature or secret" };
  }

  try {
    // Parse the signature header: t=timestamp,v1=signature
    const parts = signature.split(",").reduce(
      (acc, part) => {
        const [key, value] = part.split("=");
        if (key && value) {
          acc[key] = value;
        }
        return acc;
      },
      {} as Record<string, string>,
    );

    const timestamp = parts["t"];
    const v1Signature = parts["v1"];

    if (!timestamp || !v1Signature) {
      return { valid: false, error: "Invalid signature format" };
    }

    // Check timestamp tolerance (prevent replay attacks)
    const timestampSeconds = parseInt(timestamp, 10);
    const now = Math.floor(Date.now() / 1000);

    if (now - timestampSeconds > toleranceSeconds) {
      return { valid: false, error: "Webhook timestamp too old" };
    }

    // Compute expected signature: HMAC-SHA256(secret, timestamp.payload)
    const signedPayload = `${timestamp}.${payload}`;
    const encoder = new TextEncoder();

    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );

    const signatureBytes = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(signedPayload),
    );

    const expectedSignature = Array.from(new Uint8Array(signatureBytes))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Constant-time comparison to prevent timing attacks
    if (!secureCompare(expectedSignature, v1Signature)) {
      return { valid: false, error: "Signature mismatch" };
    }

    // Parse and return the event
    const event = JSON.parse(payload) as StripeWebhookEvent;
    return { valid: true, event };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { valid: false, error: `Verification failed: ${errorMsg}` };
  }
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function secureCompare(a: string, b: string): boolean {
  // Pad to equal length to avoid leaking length information via timing
  const maxLen = Math.max(a.length, b.length);
  const paddedA = a.padEnd(maxLen, "\0");
  const paddedB = b.padEnd(maxLen, "\0");

  // XOR all bytes — length mismatch still produces nonzero result
  let result = a.length ^ b.length;
  for (let i = 0; i < maxLen; i++) {
    result |= paddedA.charCodeAt(i) ^ paddedB.charCodeAt(i);
  }

  return result === 0;
}

// =============================================================================
// SUBSCRIPTION STATUS MAPPING
// =============================================================================

/**
 * Map Stripe subscription status to Grove's internal status
 */
export function mapSubscriptionStatus(
  stripeStatus: string,
): "active" | "past_due" | "paused" | "cancelled" | "expired" {
  const statusMap: Record<
    string,
    "active" | "past_due" | "paused" | "cancelled" | "expired"
  > = {
    active: "active",
    trialing: "active",
    past_due: "past_due",
    unpaid: "past_due",
    canceled: "cancelled",
    incomplete: "past_due",
    incomplete_expired: "expired",
    paused: "paused",
  };

  return statusMap[stripeStatus] || "active";
}

// =============================================================================
// BILLING PORTAL
// =============================================================================

/**
 * Create a Stripe Billing Portal session
 *
 * Allows customers to update payment method, view invoices, cancel subscription
 */
export async function createBillingPortalSession(
  stripeSecretKey: string,
  customerId: string,
  returnUrl: string,
): Promise<{ url: string }> {
  const body = new URLSearchParams({
    customer: customerId,
    return_url: returnUrl,
  });

  const response = await fetch(`${STRIPE_API_BASE}/billing_portal/sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Stripe-Version": STRIPE_API_VERSION,
    },
    body: body.toString(),
  });

  const data = (await response.json()) as {
    url?: string;
    error?: { message: string };
  };

  if (!response.ok || data.error) {
    throw new Error(
      `Billing portal failed: ${data.error?.message || "Unknown error"}`,
    );
  }

  if (!data.url) {
    throw new Error("No portal URL returned from Stripe");
  }

  return { url: data.url };
}

// =============================================================================
// WEBHOOK EVENT TYPES
// =============================================================================

/**
 * Stripe webhook event types we care about
 */
export type StripeEventType =
  | "checkout.session.completed"
  | "customer.subscription.created"
  | "customer.subscription.updated"
  | "customer.subscription.deleted"
  | "invoice.paid"
  | "invoice.payment_failed";

/**
 * Stripe webhook event structure
 */
export interface StripeWebhookEvent {
  id: string;
  object: "event";
  type: StripeEventType | string;
  data: {
    object: StripeCheckoutSession | StripeSubscription | StripeInvoice;
    previous_attributes?: Record<string, unknown>;
  };
  created: number;
  livemode: boolean;
}

export interface StripeCheckoutSession {
  id: string;
  object: "checkout.session";
  customer: string;
  customer_email?: string;
  subscription?: string;
  payment_status: "unpaid" | "paid" | "no_payment_required";
  status: "open" | "complete" | "expired";
  metadata: Record<string, string>;
  amount_total?: number;
  currency?: string;
}

export interface StripeSubscription {
  id: string;
  object: "subscription";
  customer: string;
  status:
    | "incomplete"
    | "incomplete_expired"
    | "trialing"
    | "active"
    | "past_due"
    | "canceled"
    | "unpaid"
    | "paused";
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end: boolean;
  canceled_at?: number;
  metadata: Record<string, string>;
  items: {
    data: Array<{
      id: string;
      price: {
        id: string;
        product: string;
        unit_amount: number;
        currency: string;
        recurring?: {
          interval: "day" | "week" | "month" | "year";
        };
      };
    }>;
  };
  default_payment_method?: string | { last4?: string; brand?: string };
}

export interface StripeInvoice {
  id: string;
  object: "invoice";
  customer: string;
  subscription?: string;
  status: "draft" | "open" | "paid" | "uncollectible" | "void";
  amount_paid: number;
  amount_due: number;
  currency: string;
  hosted_invoice_url?: string;
  billing_reason?:
    | "subscription_create"
    | "subscription_cycle"
    | "subscription_update"
    | "subscription_threshold"
    | "manual"
    | "upcoming"
    | string;
  lines?: {
    data: Array<{
      id: string;
      price?: {
        id: string;
        recurring?: {
          interval: "day" | "week" | "month" | "year";
          interval_count: number;
        };
      };
    }>;
  };
}
