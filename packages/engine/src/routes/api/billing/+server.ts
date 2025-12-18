import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { validateCSRF } from "$lib/utils/csrf.js";
import { createPaymentProvider } from "$lib/payments";
import { getVerifiedTenantId } from "$lib/auth/session.js";

/**
 * Platform billing for tenant subscriptions to GroveEngine
 *
 * Plans:
 * - seedling: $8/month - Entry tier
 * - sapling: $12/month - Hobbyist tier
 * - oak: $25/month - Serious blogger tier
 * - evergreen: $35/month - Full-service tier
 */

/** Plan configuration */
interface PlanConfig {
  name: string;
  price: number;
  interval: string;
  features: string[];
}

/** Billing record from database */
interface BillingRecord {
  id: string;
  plan: string;
  status: string;
  provider_customer_id: string | null;
  provider_subscription_id: string | null;
  current_period_start: number | null;
  current_period_end: number | null;
  cancel_at_period_end: number;
  trial_end: number | null;
  payment_method_last4: string | null;
  payment_method_brand: string | null;
  created_at: number;
  updated_at: number;
}

/** Checkout request body */
interface CheckoutRequest {
  plan: string;
  successUrl: string;
  cancelUrl: string;
  trialDays?: number;
}

/** Update subscription request body */
interface UpdateRequest {
  action: "change_plan" | "cancel" | "resume";
  plan?: string;
  cancelImmediately?: boolean;
}

const PLANS: Record<string, PlanConfig> = {
  seedling: {
    name: "Seedling",
    price: 800,
    interval: "month",
    features: [
      "50 posts",
      "1GB Storage",
      "3 themes + accent color",
      "Basic analytics",
      "grove.place subdomain",
      "Unlimited public comments",
      "Community support",
    ],
  },
  sapling: {
    name: "Sapling",
    price: 1200,
    interval: "month",
    features: [
      "250 posts",
      "5GB Storage",
      "10 themes + accent color",
      "Basic analytics",
      "grove.place subdomain",
      "Email forwarding (@grove.place)",
      "Unlimited public comments",
      "Email support",
    ],
  },
  oak: {
    name: "Oak",
    price: 2500,
    interval: "month",
    features: [
      "Unlimited posts",
      "20GB Storage",
      "Theme customizer + community themes",
      "Full analytics",
      "BYOD (custom domain)",
      "Full email (@grove.place)",
      "Unlimited public comments",
      "Priority email support",
    ],
  },
  evergreen: {
    name: "Evergreen",
    price: 3500,
    interval: "month",
    features: [
      "Unlimited posts",
      "100GB Storage",
      "Theme customizer + custom fonts",
      "Full analytics",
      "Domain search + registration included",
      "Full email (@grove.place)",
      "Unlimited public comments",
      "8hrs free support + priority",
    ],
  },
};

/**
 * GET /api/billing - Get current billing status
 */
export const GET: RequestHandler = async ({ url, platform, locals }) => {
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }

  if (!platform?.env?.DB) {
    throw error(500, "Database not configured");
  }

  const requestedTenantId =
    url.searchParams.get("tenant_id") || locals.tenant?.id;

  try {
    const tenantId = await getVerifiedTenantId(
      platform.env.DB,
      requestedTenantId,
      locals.user
    );

    const billing = (await platform.env.DB.prepare(
      `SELECT id, plan, status, provider_customer_id, provider_subscription_id,
              current_period_start, current_period_end, cancel_at_period_end,
              trial_end, payment_method_last4, payment_method_brand,
              created_at, updated_at
       FROM platform_billing WHERE tenant_id = ?`
    )
      .bind(tenantId)
      .first()) as BillingRecord | null;

    if (!billing) {
      return json({
        hasBilling: false,
        plans: PLANS,
      });
    }

    return json({
      hasBilling: true,
      billing: {
        plan: billing.plan,
        planDetails: PLANS[billing.plan],
        status: billing.status,
        currentPeriodStart: billing.current_period_start
          ? new Date(billing.current_period_start * 1000).toISOString()
          : null,
        currentPeriodEnd: billing.current_period_end
          ? new Date(billing.current_period_end * 1000).toISOString()
          : null,
        cancelAtPeriodEnd: billing.cancel_at_period_end === 1,
        trialEnd: billing.trial_end
          ? new Date(billing.trial_end * 1000).toISOString()
          : null,
        paymentMethod: billing.payment_method_last4
          ? {
              last4: billing.payment_method_last4,
              brand: billing.payment_method_brand,
            }
          : null,
      },
      plans: PLANS,
    });
  } catch (err) {
    if ((err as { status?: number }).status) throw err;
    console.error("Error fetching billing:", err);
    throw error(500, "Failed to fetch billing information");
  }
};

/**
 * POST /api/billing - Start subscription checkout
 */
export const POST: RequestHandler = async ({ request, url, platform, locals }) => {
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }

  if (!validateCSRF(request)) {
    throw error(403, "Invalid origin");
  }

  if (!platform?.env?.DB) {
    throw error(500, "Database not configured");
  }

  if (!platform?.env?.STRIPE_SECRET_KEY) {
    throw error(500, "Payment provider not configured");
  }

  const requestedTenantId =
    url.searchParams.get("tenant_id") || locals.tenant?.id;

  try {
    const tenantId = await getVerifiedTenantId(
      platform.env.DB,
      requestedTenantId,
      locals.user
    );

    const data = (await request.json()) as CheckoutRequest;

    if (!data.plan || !PLANS[data.plan]) {
      throw error(400, "Invalid plan");
    }

    if (!data.successUrl || !data.cancelUrl) {
      throw error(400, "Success and cancel URLs required");
    }

    const plan = PLANS[data.plan];

    const existingBilling = (await platform.env.DB.prepare(
      "SELECT id, provider_customer_id FROM platform_billing WHERE tenant_id = ?"
    )
      .bind(tenantId)
      .first()) as { id: string; provider_customer_id: string | null } | null;

    const stripe = createPaymentProvider("stripe", {
      secretKey: platform.env.STRIPE_SECRET_KEY,
    });

    const priceId = platform.env[`STRIPE_PRICE_${data.plan.toUpperCase()}`];

    const checkoutParams = {
      mode: "subscription",
      success_url: `${data.successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: data.cancelUrl,
      customer_email: locals.user.email,
      customer: existingBilling?.provider_customer_id || undefined,
      automatic_tax: { enabled: true },
      billing_address_collection: "required",
      allow_promotion_codes: true,
      subscription_data: {
        trial_period_days: data.trialDays || (existingBilling ? 0 : 14),
        metadata: {
          grove_tenant_id: tenantId,
          grove_plan: data.plan,
        },
      },
      metadata: {
        grove_tenant_id: tenantId,
        grove_plan: data.plan,
        type: "platform_billing",
      },
    };

    const lineItems: Array<{ price?: string; quantity: number; price_data?: object }> = [];
    if (priceId) {
      lineItems.push({ price: priceId, quantity: 1 });
    } else {
      lineItems.push({
        price_data: {
          currency: "usd",
          unit_amount: plan.price,
          product_data: {
            name: `Grove ${plan.name} Plan`,
            description: plan.features.join(", "),
          },
          recurring: {
            interval: plan.interval,
          },
        },
        quantity: 1,
      });
    }

    const stripeClient = (stripe as { client?: unknown }).client || stripe;
    const session = await (stripeClient as { request: (path: string, opts: object) => Promise<{ url: string; id: string }> }).request("checkout/sessions", {
      method: "POST",
      params: {
        ...checkoutParams,
        line_items: lineItems,
      },
    });

    if (existingBilling) {
      await platform.env.DB.prepare(
        "UPDATE platform_billing SET plan = ?, updated_at = ? WHERE id = ?"
      )
        .bind(data.plan, Math.floor(Date.now() / 1000), existingBilling.id)
        .run();
    } else {
      await platform.env.DB.prepare(
        `INSERT INTO platform_billing (id, tenant_id, plan, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
        .bind(
          crypto.randomUUID(),
          tenantId,
          data.plan,
          "pending",
          Math.floor(Date.now() / 1000),
          Math.floor(Date.now() / 1000)
        )
        .run();
    }

    return json({
      success: true,
      checkoutUrl: session.url,
      sessionId: session.id,
    });
  } catch (err) {
    if ((err as { status?: number }).status) throw err;
    console.error("Error creating billing checkout:", err);
    throw error(500, "Failed to create checkout session");
  }
};

/**
 * PATCH /api/billing - Update subscription (change plan, cancel, resume)
 */
export const PATCH: RequestHandler = async ({ request, url, platform, locals }) => {
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }

  if (!validateCSRF(request)) {
    throw error(403, "Invalid origin");
  }

  if (!platform?.env?.DB) {
    throw error(500, "Database not configured");
  }

  if (!platform?.env?.STRIPE_SECRET_KEY) {
    throw error(500, "Payment provider not configured");
  }

  const requestedTenantId =
    url.searchParams.get("tenant_id") || locals.tenant?.id;

  try {
    const tenantId = await getVerifiedTenantId(
      platform.env.DB,
      requestedTenantId,
      locals.user
    );

    const data = (await request.json()) as UpdateRequest;

    const billing = (await platform.env.DB.prepare(
      "SELECT * FROM platform_billing WHERE tenant_id = ?"
    )
      .bind(tenantId)
      .first()) as BillingRecord | null;

    if (!billing || !billing.provider_subscription_id) {
      throw error(404, "No active subscription found");
    }

    const stripe = createPaymentProvider("stripe", {
      secretKey: platform.env.STRIPE_SECRET_KEY,
    });

    switch (data.action) {
      case "cancel":
        await (stripe as { cancelSubscription: (id: string, immediate: boolean) => Promise<void> }).cancelSubscription(
          billing.provider_subscription_id,
          data.cancelImmediately === true
        );

        await platform.env.DB.prepare(
          `UPDATE platform_billing SET
            cancel_at_period_end = ?,
            updated_at = ?
           WHERE id = ? AND tenant_id = ?`
        )
          .bind(
            data.cancelImmediately ? 0 : 1,
            Math.floor(Date.now() / 1000),
            billing.id,
            tenantId
          )
          .run();

        return json({
          success: true,
          message: data.cancelImmediately
            ? "Subscription canceled immediately"
            : "Subscription will cancel at period end",
        });

      case "resume":
        await (stripe as { resumeSubscription: (id: string) => Promise<void> }).resumeSubscription(billing.provider_subscription_id);

        await platform.env.DB.prepare(
          "UPDATE platform_billing SET cancel_at_period_end = 0, updated_at = ? WHERE id = ? AND tenant_id = ?"
        )
          .bind(Math.floor(Date.now() / 1000), billing.id, tenantId)
          .run();

        return json({
          success: true,
          message: "Subscription resumed",
        });

      case "change_plan":
        if (!data.plan || !PLANS[data.plan]) {
          throw error(400, "Invalid plan");
        }

        const newPriceId =
          platform.env[`STRIPE_PRICE_${data.plan.toUpperCase()}`];

        if (!newPriceId) {
          throw error(500, "Price ID not configured for plan");
        }

        const sub = await (stripe as { getSubscription: (id: string) => Promise<{ items?: { data?: Array<{ id: string }> } } | null> }).getSubscription(
          billing.provider_subscription_id
        );
        if (!sub) {
          throw error(404, "Subscription not found in Stripe");
        }

        const stripeClient = (stripe as { client?: unknown }).client || stripe;
        await (stripeClient as { request: (path: string, opts: object) => Promise<unknown> }).request(
          `subscriptions/${billing.provider_subscription_id}`,
          {
            method: "POST",
            params: {
              proration_behavior: "create_prorations",
              items: [
                {
                  id: sub.items?.data?.[0]?.id,
                  price: newPriceId,
                },
              ],
              metadata: {
                grove_plan: data.plan,
              },
            },
          }
        );

        await platform.env.DB.prepare(
          "UPDATE platform_billing SET plan = ?, updated_at = ? WHERE id = ? AND tenant_id = ?"
        )
          .bind(data.plan, Math.floor(Date.now() / 1000), billing.id, tenantId)
          .run();

        return json({
          success: true,
          message: `Plan changed to ${PLANS[data.plan].name}`,
        });

      default:
        throw error(400, "Invalid action");
    }
  } catch (err) {
    if ((err as { status?: number }).status) throw err;
    console.error("Error updating billing:", err);
    throw error(500, "Failed to update subscription");
  }
};

/**
 * PUT /api/billing - Get billing portal URL
 */
export const PUT: RequestHandler = async ({ url, platform, locals }) => {
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }

  if (!platform?.env?.DB) {
    throw error(500, "Database not configured");
  }

  if (!platform?.env?.STRIPE_SECRET_KEY) {
    throw error(500, "Payment provider not configured");
  }

  const requestedTenantId =
    url.searchParams.get("tenant_id") || locals.tenant?.id;

  const returnUrl = url.searchParams.get("return_url");
  if (!returnUrl) {
    throw error(400, "Return URL required");
  }

  try {
    const tenantId = await getVerifiedTenantId(
      platform.env.DB,
      requestedTenantId,
      locals.user
    );

    const billing = (await platform.env.DB.prepare(
      "SELECT provider_customer_id FROM platform_billing WHERE tenant_id = ?"
    )
      .bind(tenantId)
      .first()) as { provider_customer_id: string | null } | null;

    if (!billing?.provider_customer_id) {
      throw error(404, "No billing customer found");
    }

    const stripe = createPaymentProvider("stripe", {
      secretKey: platform.env.STRIPE_SECRET_KEY,
    });

    const { url: portalUrl } = await (stripe as { createBillingPortalSession: (customerId: string, returnUrl: string) => Promise<{ url: string }> }).createBillingPortalSession(
      billing.provider_customer_id,
      returnUrl
    );

    return json({
      success: true,
      portalUrl,
    });
  } catch (err) {
    if ((err as { status?: number }).status) throw err;
    console.error("Error creating billing portal:", err);
    throw error(500, "Failed to create billing portal session");
  }
};
