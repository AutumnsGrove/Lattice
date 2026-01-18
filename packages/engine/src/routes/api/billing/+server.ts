import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { validateCSRF } from "$lib/utils/csrf.js";
import { createPaymentProvider } from "$lib/payments";
import { getVerifiedTenantId } from "$lib/auth/session.js";
import { TIERS, PAID_TIERS, type TierKey } from "$lib/config/tiers";
import {
  checkRateLimit,
  getEndpointLimitByKey,
  rateLimitHeaders,
  type RateLimitResult,
} from "$lib/server/rate-limits/index.js";

// Rate limit config is now centralized in $lib/server/rate-limits/config.ts
const BILLING_RATE_LIMIT = getEndpointLimitByKey("billing/operations");

/** Result from billing rate limit check */
interface BillingRateLimitCheckResult {
  /** If set, return this 429 response immediately */
  response?: Response;
  /** Rate limit result for adding headers to successful responses */
  result: RateLimitResult;
}

/**
 * Check billing rate limit using centralized infrastructure.
 * Returns a 429 response if rate limited, or the result for adding headers.
 */
async function checkBillingRateLimit(
  kv: KVNamespace | undefined,
  tenantId: string,
): Promise<BillingRateLimitCheckResult> {
  // Default result when KV not available
  const defaultResult: RateLimitResult = {
    allowed: true,
    remaining: BILLING_RATE_LIMIT.limit,
    resetAt: 0,
  };

  if (!kv) {
    console.warn("[Billing] KV not configured, rate limiting disabled");
    return { result: defaultResult };
  }

  const { result, response } = await checkRateLimit({
    kv,
    key: `billing:${tenantId}`,
    limit: BILLING_RATE_LIMIT.limit,
    windowSeconds: BILLING_RATE_LIMIT.windowSeconds,
    namespace: "billing",
  });

  return { result, response };
}

/**
 * Audit log entry for billing operations.
 * Logs are stored in the audit_log table for compliance and debugging.
 */
interface AuditLogEntry {
  tenantId: string;
  action: string;
  details: Record<string, unknown>;
  userEmail: string;
  ipAddress?: string;
}

/**
 * Log billing operations for audit trail.
 * This helps with compliance, debugging, and dispute resolution.
 *
 * IMPORTANT: Audit log failures are non-blocking to prevent billing operations
 * from failing due to logging issues. However, persistent failures should trigger
 * alerts in the monitoring system. Look for "[Billing Audit] CRITICAL" in logs.
 *
 * Trade-off: We prioritize completing the user's billing action over guaranteed
 * audit logging. For true compliance-critical operations, consider a separate
 * job queue that retries failed audit entries.
 */
async function logBillingAudit(
  db: D1Database,
  entry: AuditLogEntry,
): Promise<void> {
  try {
    await db
      .prepare(
        `INSERT INTO audit_log (id, tenant_id, category, action, details, user_email, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        crypto.randomUUID(),
        entry.tenantId,
        "billing",
        entry.action,
        JSON.stringify(entry.details),
        entry.userEmail,
        Math.floor(Date.now() / 1000),
      )
      .run();
  } catch (e) {
    // CRITICAL: Audit log failures need monitoring alerts
    // This log line should trigger alerts in production monitoring
    console.error("[Billing Audit] CRITICAL - Failed to log billing action:", {
      error: e instanceof Error ? e.message : String(e),
      action: entry.action,
      tenantId: entry.tenantId,
      userEmail: entry.userEmail,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Platform billing for tenant subscriptions to GroveEngine
 *
 * Plans are derived from $lib/config/tiers.ts (single source of truth).
 * See tiers.ts for current pricing and features.
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

/** Derive PLANS from single source of truth in tiers.ts */
const PLANS: Record<string, PlanConfig> = Object.fromEntries(
  Object.entries(TIERS)
    .filter(([key]) => key !== "free") // Exclude free tier from billing
    .map(([key, tier]) => [
      key,
      {
        name: tier.display.name,
        price: tier.pricing.monthlyPriceCents,
        interval: "month",
        features: tier.display.featureStrings,
      },
    ]),
);

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
    url.searchParams.get("tenant_id") || locals.tenantId;

  try {
    const tenantId = await getVerifiedTenantId(
      platform.env.DB,
      requestedTenantId,
      locals.user,
    );

    const billing = (await platform.env.DB.prepare(
      `SELECT id, plan, status, provider_customer_id, provider_subscription_id,
              current_period_start, current_period_end, cancel_at_period_end,
              trial_end, payment_method_last4, payment_method_brand,
              created_at, updated_at
       FROM platform_billing WHERE tenant_id = ?`,
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
export const POST: RequestHandler = async ({
  request,
  url,
  platform,
  locals,
}) => {
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
    url.searchParams.get("tenant_id") || locals.tenantId;

  try {
    const tenantId = await getVerifiedTenantId(
      platform.env.DB,
      requestedTenantId,
      locals.user,
    );

    // Check rate limit before processing (centralized in $lib/server/rate-limits)
    const { result: rateLimitResult, response: rateLimitResponse } =
      await checkBillingRateLimit(platform.env.CACHE_KV, tenantId);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const data = (await request.json()) as CheckoutRequest;

    if (!data.plan || !PLANS[data.plan]) {
      throw error(400, "Invalid plan");
    }

    if (!data.successUrl || !data.cancelUrl) {
      throw error(400, "Success and cancel URLs required");
    }

    const plan = PLANS[data.plan];

    const existingBilling = (await platform.env.DB.prepare(
      "SELECT id, provider_customer_id FROM platform_billing WHERE tenant_id = ?",
    )
      .bind(tenantId)
      .first()) as { id: string; provider_customer_id: string | null } | null;

    const stripe = createPaymentProvider("stripe", {
      secretKey: platform.env.STRIPE_SECRET_KEY,
    });

    const priceId = (platform.env as unknown as Record<string, string>)[
      `STRIPE_PRICE_${data.plan.toUpperCase()}`
    ];

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
        trial_period_days: data.trialDays || (existingBilling ? 0 : 7),
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

    const lineItems: Array<{
      price?: string;
      quantity: number;
      price_data?: object;
    }> = [];
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
    const session = await (
      stripeClient as {
        request: (
          path: string,
          opts: object,
        ) => Promise<{ url: string; id: string }>;
      }
    ).request("checkout/sessions", {
      method: "POST",
      params: {
        ...checkoutParams,
        line_items: lineItems,
      },
    });

    if (existingBilling) {
      await platform.env.DB.prepare(
        "UPDATE platform_billing SET plan = ?, updated_at = ? WHERE id = ?",
      )
        .bind(data.plan, Math.floor(Date.now() / 1000), existingBilling.id)
        .run();
    } else {
      await platform.env.DB.prepare(
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

    return json(
      {
        success: true,
        checkoutUrl: session.url,
        sessionId: session.id,
      },
      {
        headers: rateLimitHeaders(rateLimitResult, BILLING_RATE_LIMIT.limit),
      },
    );
  } catch (err) {
    if ((err as { status?: number }).status) throw err;
    console.error("Error creating billing checkout:", err);
    throw error(500, "Failed to create checkout session");
  }
};

/**
 * PATCH /api/billing - Update subscription (change plan, cancel, resume)
 */
export const PATCH: RequestHandler = async ({
  request,
  url,
  platform,
  locals,
}) => {
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
    url.searchParams.get("tenant_id") || locals.tenantId;

  try {
    const tenantId = await getVerifiedTenantId(
      platform.env.DB,
      requestedTenantId,
      locals.user,
    );

    // Check rate limit before processing (centralized in $lib/server/rate-limits)
    const { result: rateLimitResult, response: rateLimitResponse } =
      await checkBillingRateLimit(platform.env.CACHE_KV, tenantId);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const data = (await request.json()) as UpdateRequest;

    const billing = (await platform.env.DB.prepare(
      `SELECT id, plan, status, provider_customer_id, provider_subscription_id,
              current_period_start, current_period_end, cancel_at_period_end,
              trial_end, payment_method_last4, payment_method_brand,
              created_at, updated_at
       FROM platform_billing WHERE tenant_id = ?`,
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
        await (
          stripe as {
            cancelSubscription: (
              id: string,
              immediate: boolean,
            ) => Promise<void>;
          }
        ).cancelSubscription(
          billing.provider_subscription_id,
          data.cancelImmediately === true,
        );

        await platform.env.DB.prepare(
          `UPDATE platform_billing SET
            cancel_at_period_end = ?,
            updated_at = ?
           WHERE id = ? AND tenant_id = ?`,
        )
          .bind(
            data.cancelImmediately ? 0 : 1,
            Math.floor(Date.now() / 1000),
            billing.id,
            tenantId,
          )
          .run();

        // Audit log: subscription cancelled
        await logBillingAudit(platform.env.DB, {
          tenantId,
          action: "subscription_cancelled",
          details: {
            plan: billing.plan,
            immediate: data.cancelImmediately === true,
            subscriptionId: billing.provider_subscription_id,
          },
          userEmail: locals.user.email,
        });

        return json(
          {
            success: true,
            message: data.cancelImmediately
              ? "Subscription canceled immediately"
              : "Subscription will cancel at period end",
          },
          {
            headers: rateLimitHeaders(
              rateLimitResult,
              BILLING_RATE_LIMIT.limit,
            ),
          },
        );

      case "resume":
        await (
          stripe as { resumeSubscription: (id: string) => Promise<void> }
        ).resumeSubscription(billing.provider_subscription_id);

        await platform.env.DB.prepare(
          "UPDATE platform_billing SET cancel_at_period_end = 0, updated_at = ? WHERE id = ? AND tenant_id = ?",
        )
          .bind(Math.floor(Date.now() / 1000), billing.id, tenantId)
          .run();

        // Audit log: subscription resumed
        await logBillingAudit(platform.env.DB, {
          tenantId,
          action: "subscription_resumed",
          details: {
            plan: billing.plan,
            subscriptionId: billing.provider_subscription_id,
          },
          userEmail: locals.user.email,
        });

        return json(
          {
            success: true,
            message: "Subscription resumed",
          },
          {
            headers: rateLimitHeaders(
              rateLimitResult,
              BILLING_RATE_LIMIT.limit,
            ),
          },
        );

      case "change_plan":
        if (!data.plan || !PLANS[data.plan]) {
          throw error(400, "Invalid plan");
        }

        // Check if already on the target plan (fail fast)
        if (billing.plan === data.plan) {
          throw error(400, "You are already on this plan");
        }

        // Validate tier is available for purchase
        const targetTier = TIERS[data.plan as TierKey];
        if (!targetTier || targetTier.status !== "available") {
          throw error(
            400,
            `The ${targetTier?.display?.name || data.plan} plan is not currently available`,
          );
        }

        const newPriceId = (platform.env as unknown as Record<string, string>)[
          `STRIPE_PRICE_${data.plan.toUpperCase()}`
        ];

        if (!newPriceId) {
          throw error(500, "Price ID not configured for plan");
        }

        const sub = await (
          stripe as {
            getSubscription: (
              id: string,
            ) => Promise<{ items?: { data?: Array<{ id: string }> } } | null>;
          }
        ).getSubscription(billing.provider_subscription_id);
        if (!sub) {
          throw error(404, "Subscription not found in Stripe");
        }

        const stripeClient = (stripe as { client?: unknown }).client || stripe;
        await (
          stripeClient as {
            request: (path: string, opts: object) => Promise<unknown>;
          }
        ).request(`subscriptions/${billing.provider_subscription_id}`, {
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
        });

        // Clear cancel_at_period_end when changing plans - user is committing to a new plan
        await platform.env.DB.prepare(
          "UPDATE platform_billing SET plan = ?, cancel_at_period_end = 0, updated_at = ? WHERE id = ? AND tenant_id = ?",
        )
          .bind(data.plan, Math.floor(Date.now() / 1000), billing.id, tenantId)
          .run();

        // Audit log: plan changed
        await logBillingAudit(platform.env.DB, {
          tenantId,
          action: "plan_changed",
          details: {
            previousPlan: billing.plan,
            newPlan: data.plan,
            subscriptionId: billing.provider_subscription_id,
          },
          userEmail: locals.user.email,
        });

        return json(
          {
            success: true,
            message: `Plan changed to ${PLANS[data.plan].name}`,
          },
          {
            headers: rateLimitHeaders(
              rateLimitResult,
              BILLING_RATE_LIMIT.limit,
            ),
          },
        );

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
 * POST /api/billing/portal - Create billing portal session
 *
 * POST is semantically correct here because we're creating a session
 * on the payment provider's side, not simply retrieving data.
 */
export const PUT: RequestHandler = async ({
  url,
  request,
  platform,
  locals,
}) => {
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }

  if (!platform?.env?.DB) {
    throw error(500, "Database not configured");
  }

  if (!platform?.env?.STRIPE_SECRET_KEY) {
    throw error(500, "Payment provider not configured");
  }

  // Accept return_url from request body only (standardized approach)
  let returnUrl: string | null = null;
  try {
    const body = (await request.json()) as { returnUrl?: string };
    returnUrl = body.returnUrl || null;
  } catch {
    // Body parsing failed
  }

  if (!returnUrl) {
    throw error(400, "Return URL required");
  }

  // Validate return URL to prevent open redirect attacks
  try {
    const parsedReturn = new URL(returnUrl);
    const isGroveDomain =
      parsedReturn.hostname === "grove.place" ||
      parsedReturn.hostname.endsWith(".grove.place");
    const isSameOrigin = parsedReturn.origin === url.origin;

    if (!isGroveDomain && !isSameOrigin) {
      throw error(400, "Invalid return URL: must be a grove.place domain");
    }
  } catch (e) {
    if ((e as { status?: number }).status) throw e;
    throw error(400, "Invalid return URL format");
  }

  const requestedTenantId =
    url.searchParams.get("tenant_id") || locals.tenantId;

  try {
    const tenantId = await getVerifiedTenantId(
      platform.env.DB,
      requestedTenantId,
      locals.user,
    );

    // Check rate limit before processing (centralized in $lib/server/rate-limits)
    const { result: rateLimitResult, response: rateLimitResponse } =
      await checkBillingRateLimit(platform.env.CACHE_KV, tenantId);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const billing = (await platform.env.DB.prepare(
      "SELECT provider_customer_id FROM platform_billing WHERE tenant_id = ?",
    )
      .bind(tenantId)
      .first()) as { provider_customer_id: string | null } | null;

    if (!billing?.provider_customer_id) {
      throw error(404, "No billing customer found");
    }

    const stripe = createPaymentProvider("stripe", {
      secretKey: platform.env.STRIPE_SECRET_KEY,
    });

    const { url: portalUrl } = await (
      stripe as {
        createBillingPortalSession: (
          customerId: string,
          returnUrl: string,
        ) => Promise<{ url: string }>;
      }
    ).createBillingPortalSession(billing.provider_customer_id, returnUrl);

    return json(
      {
        success: true,
        portalUrl,
      },
      {
        headers: rateLimitHeaders(rateLimitResult, BILLING_RATE_LIMIT.limit),
      },
    );
  } catch (err) {
    if ((err as { status?: number }).status) throw err;
    console.error("Error creating billing portal:", err);
    throw error(500, "Failed to create billing portal session");
  }
};
