/**
 * Stripe Configuration and Helpers
 *
 * Contains price IDs for all plans and checkout session creation.
 *
 * SETUP INSTRUCTIONS:
 * -------------------
 * 1. Go to Stripe Dashboard → Products (https://dashboard.stripe.com/products)
 * 2. Create 4 products with monthly + yearly prices:
 *    - Seedling: $8/month, $81.60/year (15% discount)
 *    - Sapling: $12/month, $122.40/year
 *    - Oak: $25/month, $255/year
 *    - Evergreen: $35/month, $357/year
 * 3. Copy each price ID (starts with "price_") and paste below
 * 4. Set environment variables in Cloudflare Dashboard:
 *    - STRIPE_SECRET_KEY (sk_test_... or sk_live_...)
 *    - STRIPE_PUBLISHABLE_KEY (pk_test_... or pk_live_...)
 *    - STRIPE_WEBHOOK_SECRET (whsec_... from webhook setup)
 *
 * See docs/STRIPE-SETUP.md for detailed instructions.
 */

// Stripe Price IDs - Get these from your Stripe Dashboard → Products → [Product] → Pricing
// IMPORTANT: These must be from the SAME Stripe account as your STRIPE_SECRET_KEY
// Environment variables are required for production; defaults below are for development only
export function getStripesPrices(env?: Record<string, string>) {
  return {
    seedling: {
      monthly:
        env?.STRIPE_SEEDLING_PRICE_MONTHLY || "price_1ShXzXRpJ6WVdxl3dwuzZX90",
      yearly:
        env?.STRIPE_SEEDLING_PRICE_YEARLY || "price_1ShXzXRpJ6WVdxl38ZgKg4Wk",
    },
    sapling: {
      monthly:
        env?.STRIPE_SAPLING_PRICE_MONTHLY || "price_1ShY0MRpJ6WVdxl33inwSBKH",
      yearly:
        env?.STRIPE_SAPLING_PRICE_YEARLY || "price_1ShY0MRpJ6WVdxl3RI7YAUBK",
    },
    oak: {
      monthly:
        env?.STRIPE_OAK_PRICE_MONTHLY || "price_1ShY0yRpJ6WVdxl3GRhURSI8",
      yearly: env?.STRIPE_OAK_PRICE_YEARLY || "price_1ShY0yRpJ6WVdxl38u1qm3EX",
    },
    evergreen: {
      monthly:
        env?.STRIPE_EVERGREEN_PRICE_MONTHLY || "price_1ShY1fRpJ6WVdxl3IiVhJ7BQ",
      yearly:
        env?.STRIPE_EVERGREEN_PRICE_YEARLY || "price_1ShY1fRpJ6WVdxl3rOJXhOkP",
    },
  } as const;
}

// Backward compatibility - returns prices with default env
export const STRIPE_PRICES = getStripesPrices();

export type PlanId = keyof typeof STRIPE_PRICES;
export type BillingCycle = "monthly" | "yearly";

/**
 * Get the Stripe price ID for a plan and billing cycle
 */
export function getPriceId(plan: PlanId, billingCycle: BillingCycle): string {
  return STRIPE_PRICES[plan][billingCycle];
}

/**
 * Plan display information
 */
export const PLAN_INFO = {
  seedling: {
    name: "Seedling",
    monthlyPrice: 800, // cents
    yearlyPrice: 8160,
  },
  sapling: {
    name: "Sapling",
    monthlyPrice: 1200,
    yearlyPrice: 12240,
  },
  oak: {
    name: "Oak",
    monthlyPrice: 2500,
    yearlyPrice: 25500,
  },
  evergreen: {
    name: "Evergreen",
    monthlyPrice: 3500,
    yearlyPrice: 35700,
  },
} as const;

/**
 * Create a Stripe checkout session
 */
export async function createCheckoutSession(params: {
  stripeSecretKey: string;
  priceId: string;
  customerEmail: string;
  onboardingId: string;
  username: string;
  plan: string;
  billingCycle: string;
  successUrl: string;
  cancelUrl: string;
  trialDays?: number;
}): Promise<{ sessionId: string; url: string }> {
  // Default to 14 days if not provided, but allow override via parameter
  const trialDays = params.trialDays ?? 14;
  // IMPORTANT: Create customer first (required for Stripe Accounts V2)
  const customerResponse = await fetch("https://api.stripe.com/v1/customers", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.stripeSecretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      email: params.customerEmail,
      "metadata[onboarding_id]": params.onboardingId,
      "metadata[username]": params.username,
    }),
  });

  if (!customerResponse.ok) {
    const error = (await customerResponse.json()) as {
      error?: { message?: string };
    };
    console.error("[Stripe] Customer creation failed:", error);
    throw new Error(
      error.error?.message ||
        `Failed to create Stripe customer: ${customerResponse.status}`,
    );
  }

  const customer = (await customerResponse.json()) as { id: string };
  console.log("[Stripe] Created customer:", customer.id);

  // Now create checkout session with customer ID
  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.stripeSecretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      mode: "subscription",
      customer: customer.id, // Use customer ID instead of email
      "line_items[0][price]": params.priceId,
      "line_items[0][quantity]": "1",
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      "subscription_data[trial_period_days]": String(trialDays),
      "subscription_data[metadata][onboarding_id]": params.onboardingId,
      "subscription_data[metadata][username]": params.username,
      "subscription_data[metadata][plan]": params.plan,
      "metadata[onboarding_id]": params.onboardingId,
      "metadata[username]": params.username,
      "metadata[plan]": params.plan,
      "metadata[billing_cycle]": params.billingCycle,
    }),
  });

  if (!response.ok) {
    const error = (await response.json()) as { error?: { message?: string } };
    console.error("[Stripe] Checkout session creation failed:", error);
    console.error("[Stripe] Request params:", {
      priceId: params.priceId,
      customerId: customer.id,
      mode: "subscription",
    });
    throw new Error(
      error.error?.message ||
        `Stripe API error: ${response.status} ${response.statusText}`,
    );
  }

  const session = (await response.json()) as { id: string; url: string };
  return {
    sessionId: session.id,
    url: session.url,
  };
}

/**
 * Retrieve a checkout session
 */
export async function getCheckoutSession(
  stripeSecretKey: string,
  sessionId: string,
): Promise<{
  id: string;
  status: string;
  customer: string;
  subscription: { id: string; status: string } | string;
  metadata: Record<string, string>;
}> {
  const response = await fetch(
    `https://api.stripe.com/v1/checkout/sessions/${sessionId}?expand[]=subscription`,
    {
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error("Failed to retrieve checkout session");
  }

  return response.json();
}

/**
 * Verify Stripe webhook signature
 */
export async function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  // Parse the signature header
  const parts = signature.split(",");
  const timestamp = parts.find((p) => p.startsWith("t="))?.slice(2);
  const v1Signature = parts.find((p) => p.startsWith("v1="))?.slice(3);

  if (!timestamp || !v1Signature) {
    return false;
  }

  // Check timestamp (reject if > 5 minutes old)
  const timestampAge = Math.floor(Date.now() / 1000) - parseInt(timestamp);
  if (timestampAge > 300) {
    return false;
  }

  // Compute expected signature
  const signedPayload = `${timestamp}.${payload}`;
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
    encoder.encode(signedPayload),
  );
  const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Constant-time comparison
  if (expectedSignature.length !== v1Signature.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < expectedSignature.length; i++) {
    result |= expectedSignature.charCodeAt(i) ^ v1Signature.charCodeAt(i);
  }

  return result === 0;
}
