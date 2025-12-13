import { json, error } from "@sveltejs/kit";
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
 *
 * NOTE: The Free tier (Meadow-only access) does NOT use this billing API.
 * Free users sign up directly without Stripe checkout - they're created
 * with plan='free' in the tenants table but never hit this endpoint.
 * This API is only for paid subscriptions.
 */

const PLANS = {
  seedling: {
    name: "Seedling",
    price: 800, // $8.00 in cents
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
    price: 1200, // $12.00 in cents
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
    price: 2500, // $25.00 in cents
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
    price: 3500, // $35.00 in cents
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
export async function GET({ url, platform, locals }) {
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }

  if (!platform?.env?.POSTS_DB) {
    throw error(500, "Database not configured");
  }

  const requestedTenantId =
    url.searchParams.get("tenant_id") || locals.tenant?.id;

  try {
    // Verify user owns this tenant
    const tenantId = await getVerifiedTenantId(
      platform.env.POSTS_DB,
      requestedTenantId,
      locals.user,
    );

    // Get billing record
    const billing = await platform.env.POSTS_DB.prepare(
      `SELECT id, plan, status, provider_customer_id, provider_subscription_id,
                current_period_start, current_period_end, cancel_at_period_end,
                trial_end, payment_method_last4, payment_method_brand,
                created_at, updated_at
         FROM platform_billing WHERE tenant_id = ?`,
    )
      .bind(tenantId)
      .first();

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
    if (err.status) throw err;
    console.error("Error fetching billing:", err);
    throw error(500, "Failed to fetch billing information");
  }
}

/**
 * POST /api/billing - Start subscription checkout
 *
 * Body:
 * {
 *   plan: 'seedling' | 'sapling' | 'oak' | 'evergreen'
 *   successUrl: string
 *   cancelUrl: string
 * }
 */
export async function POST({ request, url, platform, locals }) {
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }

  if (!validateCSRF(request)) {
    throw error(403, "Invalid origin");
  }

  if (!platform?.env?.POSTS_DB) {
    throw error(500, "Database not configured");
  }

  if (!platform?.env?.STRIPE_SECRET_KEY) {
    throw error(500, "Payment provider not configured");
  }

  const requestedTenantId =
    url.searchParams.get("tenant_id") || locals.tenant?.id;

  try {
    // Verify user owns this tenant
    const tenantId = await getVerifiedTenantId(
      platform.env.POSTS_DB,
      requestedTenantId,
      locals.user,
    );

    const data = await request.json();

    // Validate plan
    if (!data.plan || !PLANS[data.plan]) {
      throw error(400, "Invalid plan");
    }

    if (!data.successUrl || !data.cancelUrl) {
      throw error(400, "Success and cancel URLs required");
    }

    const plan = PLANS[data.plan];

    // Check for existing billing
    const existingBilling = await platform.env.POSTS_DB.prepare(
      "SELECT id, provider_customer_id FROM platform_billing WHERE tenant_id = ?",
    )
      .bind(tenantId)
      .first();

    const stripe = createPaymentProvider("stripe", {
      secretKey: platform.env.STRIPE_SECRET_KEY,
    });

    // Get or create price ID for this plan
    // In production, you'd have these pre-created in Stripe
    // For now, we'll use inline price data
    const priceId = platform.env[`STRIPE_PRICE_${data.plan.toUpperCase()}`];

    // Create checkout session for subscription
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
        trial_period_days: data.trialDays || (existingBilling ? 0 : 14), // 14-day trial for new customers
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

    // Build line items
    const lineItems = [];
    if (priceId) {
      lineItems.push({ price: priceId, quantity: 1 });
    } else {
      // Inline price data
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

    // Create session directly via Stripe client
    const stripeClient = stripe.client || stripe;
    const session = await stripeClient.request("checkout/sessions", {
      method: "POST",
      params: {
        ...checkoutParams,
        line_items: lineItems,
      },
    });

    // Create or update billing record
    if (existingBilling) {
      await platform.env.POSTS_DB.prepare(
        "UPDATE platform_billing SET plan = ?, updated_at = ? WHERE id = ?",
      )
        .bind(data.plan, Math.floor(Date.now() / 1000), existingBilling.id)
        .run();
    } else {
      await platform.env.POSTS_DB.prepare(
        `INSERT INTO platform_billing (id, tenant_id, plan, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          crypto.randomUUID(),
          tenantId,
          data.plan,
          "pending",
          Math.floor(Date.now() / 1000),
          Math.floor(Date.now() / 1000),
        )
        .run();
    }

    return json({
      success: true,
      checkoutUrl: session.url,
      sessionId: session.id,
    });
  } catch (err) {
    if (err.status) throw err;
    console.error("Error creating billing checkout:", err);
    throw error(500, "Failed to create checkout session");
  }
}

/**
 * PATCH /api/billing - Update subscription (change plan, cancel, resume)
 *
 * Body:
 * {
 *   action: 'change_plan' | 'cancel' | 'resume'
 *   plan?: string (for change_plan)
 *   cancelImmediately?: boolean (for cancel)
 * }
 */
export async function PATCH({ request, url, platform, locals }) {
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }

  if (!validateCSRF(request)) {
    throw error(403, "Invalid origin");
  }

  if (!platform?.env?.POSTS_DB) {
    throw error(500, "Database not configured");
  }

  if (!platform?.env?.STRIPE_SECRET_KEY) {
    throw error(500, "Payment provider not configured");
  }

  const requestedTenantId =
    url.searchParams.get("tenant_id") || locals.tenant?.id;

  try {
    // Verify user owns this tenant
    const tenantId = await getVerifiedTenantId(
      platform.env.POSTS_DB,
      requestedTenantId,
      locals.user,
    );

    const data = await request.json();

    // Get billing record
    const billing = await platform.env.POSTS_DB.prepare(
      "SELECT * FROM platform_billing WHERE tenant_id = ?",
    )
      .bind(tenantId)
      .first();

    if (!billing || !billing.provider_subscription_id) {
      throw error(404, "No active subscription found");
    }

    const stripe = createPaymentProvider("stripe", {
      secretKey: platform.env.STRIPE_SECRET_KEY,
    });

    switch (data.action) {
      case "cancel":
        await stripe.cancelSubscription(
          billing.provider_subscription_id,
          data.cancelImmediately === true,
        );

        await platform.env.POSTS_DB.prepare(
          `UPDATE platform_billing SET
              cancel_at_period_end = ?,
              updated_at = ?
             WHERE id = ?`,
        )
          .bind(
            data.cancelImmediately ? 0 : 1,
            Math.floor(Date.now() / 1000),
            billing.id,
          )
          .run();

        return json({
          success: true,
          message: data.cancelImmediately
            ? "Subscription canceled immediately"
            : "Subscription will cancel at period end",
        });

      case "resume":
        await stripe.resumeSubscription(billing.provider_subscription_id);

        await platform.env.POSTS_DB.prepare(
          "UPDATE platform_billing SET cancel_at_period_end = 0, updated_at = ? WHERE id = ?",
        )
          .bind(Math.floor(Date.now() / 1000), billing.id)
          .run();

        return json({
          success: true,
          message: "Subscription resumed",
        });

      case "change_plan":
        if (!data.plan || !PLANS[data.plan]) {
          throw error(400, "Invalid plan");
        }

        // For plan changes, we need to update the subscription in Stripe
        // This requires the price ID for the new plan
        const newPriceId =
          platform.env[`STRIPE_PRICE_${data.plan.toUpperCase()}`];

        if (!newPriceId) {
          throw error(500, "Price ID not configured for plan");
        }

        // Get current subscription to find the item ID
        const sub = await stripe.getSubscription(
          billing.provider_subscription_id,
        );
        if (!sub) {
          throw error(404, "Subscription not found in Stripe");
        }

        // Update subscription with new price
        // This is simplified - in production you'd handle prorations
        const stripeClient = stripe.client || stripe;
        await stripeClient.request(
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
          },
        );

        await platform.env.POSTS_DB.prepare(
          "UPDATE platform_billing SET plan = ?, updated_at = ? WHERE id = ?",
        )
          .bind(data.plan, Math.floor(Date.now() / 1000), billing.id)
          .run();

        return json({
          success: true,
          message: `Plan changed to ${PLANS[data.plan].name}`,
        });

      default:
        throw error(400, "Invalid action");
    }
  } catch (err) {
    if (err.status) throw err;
    console.error("Error updating billing:", err);
    throw error(500, "Failed to update subscription");
  }
}

/**
 * GET /api/billing/portal - Get billing portal URL
 */
export async function PUT({ url, platform, locals }) {
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }

  if (!platform?.env?.POSTS_DB) {
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
    // Verify user owns this tenant
    const tenantId = await getVerifiedTenantId(
      platform.env.POSTS_DB,
      requestedTenantId,
      locals.user,
    );

    // Get billing record
    const billing = await platform.env.POSTS_DB.prepare(
      "SELECT provider_customer_id FROM platform_billing WHERE tenant_id = ?",
    )
      .bind(tenantId)
      .first();

    if (!billing?.provider_customer_id) {
      throw error(404, "No billing customer found");
    }

    const stripe = createPaymentProvider("stripe", {
      secretKey: platform.env.STRIPE_SECRET_KEY,
    });

    const { url: portalUrl } = await stripe.createBillingPortalSession(
      billing.provider_customer_id,
      returnUrl,
    );

    return json({
      success: true,
      portalUrl,
    });
  } catch (err) {
    if (err.status) throw err;
    console.error("Error creating billing portal:", err);
    throw error(500, "Failed to create billing portal session");
  }
}
