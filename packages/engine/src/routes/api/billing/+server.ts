import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { createPaymentProvider } from "$lib/payments";
import { getVerifiedTenantId } from "$lib/auth/session.js";
import { TIERS, type TierKey } from "$lib/config/tiers";
import { createThreshold } from "$lib/threshold/factory.js";
import {
  thresholdCheckWithResult,
  thresholdHeaders,
} from "$lib/threshold/adapters/sveltekit.js";
import type { ThresholdResult } from "$lib/threshold/types.js";
import { getEndpointLimitByKey } from "$lib/threshold/config.js";
import {
  isCompedAccount,
  logBillingAudit,
  type AuditLogEntry,
} from "$lib/server/billing.js";
import { Resend } from "resend";
import { API_ERRORS, throwGroveError, logGroveError } from "$lib/errors";
import { GROVE_EMAILS } from "$lib/config/emails.js";

// Rate limit config is now centralized in $lib/server/rate-limits/config.ts
const BILLING_RATE_LIMIT = getEndpointLimitByKey("billing/operations");

/** Result from billing rate limit check */
interface BillingRateLimitCheckResult {
  /** If set, return this 429 response immediately */
  response?: Response;
  /** Rate limit result for adding headers to successful responses */
  result: ThresholdResult;
}

/**
 * Check billing rate limit using centralized infrastructure.
 * Returns a 429 response if rate limited, or the result for adding headers.
 */
async function checkBillingRateLimit(
  env: { CACHE_KV?: KVNamespace } | undefined,
  tenantId: string,
): Promise<BillingRateLimitCheckResult> {
  // Default result when KV not available
  const defaultResult: ThresholdResult = {
    allowed: true,
    remaining: BILLING_RATE_LIMIT.limit,
    resetAt: 0,
  };

  const threshold = createThreshold(env);
  if (!threshold) {
    console.warn("[Billing] KV not configured, rate limiting disabled");
    return { result: defaultResult };
  }

  return thresholdCheckWithResult(threshold, {
    key: `billing:${tenantId}`,
    limit: BILLING_RATE_LIMIT.limit,
    windowSeconds: BILLING_RATE_LIMIT.windowSeconds,
  });
}

/**
 * Platform billing for tenant subscriptions to GroveEngine
 *
 * Plans are derived from $lib/config/tiers.ts (single source of truth).
 * See tiers.ts for current pricing and features.
 */

/**
 * Send subscription cancellation confirmation email.
 * Non-blocking - caller should catch errors.
 */
interface CancellationEmailParams {
  to: string;
  name: string;
  subdomain: string;
  periodEndDate: string;
  planName: string;
  resendApiKey: string;
}

async function sendCancellationEmail(
  params: CancellationEmailParams,
): Promise<void> {
  const resend = new Resend(params.resendApiKey);

  const adminUrl = `https://${params.subdomain}.grove.place/admin/account`;

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Subscription Cancelled</title>
</head>
<body style="margin: 0; padding: 0; background-color: #fefdfb; font-family: 'Lexend', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <tr>
      <td align="center" style="padding-bottom: 30px;">
        <svg width="48" height="59" viewBox="0 0 417 512.238" xmlns="http://www.w3.org/2000/svg">
          <path fill="#5d4037" d="M171.274 344.942h74.09v167.296h-74.09V344.942z"/>
          <path fill="#22c55e" d="M0 173.468h126.068l-89.622-85.44 49.591-50.985 85.439 87.829V0h74.086v124.872L331 37.243l49.552 50.785-89.58 85.24H417v70.502H290.252l90.183 87.629L331 381.192 208.519 258.11 86.037 381.192l-49.591-49.591 90.218-87.631H0v-70.502z"/>
        </svg>
      </td>
    </tr>
    <tr>
      <td style="padding: 30px; background-color: #1e2227; border-radius: 12px;">
        <h1 style="margin: 0 0 16px 0; font-size: 24px; color: #f5f2ea; font-weight: normal;">
          Hi ${params.name},
        </h1>
        <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: rgba(245, 242, 234, 0.7);">
          We've cancelled your membership as requested.
        </p>
        <hr style="border: none; border-top: 1px solid rgba(245, 242, 234, 0.1); margin: 24px 0;" />
        <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #f5f2ea; font-weight: 500;">
          Your blog stays live
        </h2>
        <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: rgba(245, 242, 234, 0.7);">
          <a href="https://${params.subdomain}.grove.place" style="color: #16a34a; text-decoration: none;">${params.subdomain}.grove.place</a> remains fully accessible until <strong style="color: #f5f2ea;">${params.periodEndDate}</strong>.
        </p>
        <hr style="border: none; border-top: 1px solid rgba(245, 242, 234, 0.1); margin: 24px 0;" />
        <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #f5f2ea; font-weight: 500;">
          Changed your mind?
        </h2>
        <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: rgba(245, 242, 234, 0.7);">
          Resume anytime before ${params.periodEndDate}:
        </p>
        <p style="margin: 0 0 24px 0;">
          <a href="${adminUrl}" style="display: inline-block; padding: 12px 24px; background-color: #16a34a; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 500;">Resume Subscription</a>
        </p>
        <hr style="border: none; border-top: 1px solid rgba(245, 242, 234, 0.1); margin: 24px 0;" />
        <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #f5f2ea; font-weight: 500;">
          Your content is safe
        </h2>
        <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: rgba(245, 242, 234, 0.7);">
          After the period ends, your blog becomes private—but nothing is deleted. You can resubscribe anytime to restore public access.
        </p>
        <p style="margin: 0; font-size: 16px; line-height: 1.6; color: rgba(245, 242, 234, 0.7);">
          Questions? Just reply to this email.
        </p>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding-top: 30px;">
        <p style="margin: 0; font-size: 14px; color: rgba(245, 242, 234, 0.5);">
          —Autumn
        </p>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding-top: 40px;">
        <p style="margin: 0; font-size: 12px; color: rgba(61, 41, 20, 0.4);">
          grove.place
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

  const textContent = `
Hi ${params.name},

We've cancelled your subscription as requested.

---

Your blog stays live

${params.subdomain}.grove.place remains fully accessible until ${params.periodEndDate}.

---

Changed your mind?

Resume anytime before ${params.periodEndDate}:
${adminUrl}

---

Your content is safe

After the period ends, your blog becomes private—but nothing is deleted. You can resubscribe anytime to restore public access.

Questions? Just reply to this email.

—Autumn
`.trim();

  await resend.emails.send({
    from: GROVE_EMAILS.support.from,
    to: params.to,
    subject: "Your Grove membership has been cancelled",
    html: htmlContent,
    text: textContent,
  });
}

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
    throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
  }

  if (!platform?.env?.DB) {
    throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
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
              payment_method_last4, payment_method_brand,
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
    logGroveError("API", API_ERRORS.OPERATION_FAILED, { cause: err });
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API", { cause: err });
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
    throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
  }

  if (!platform?.env?.DB) {
    throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
  }

  if (!platform?.env?.STRIPE_SECRET_KEY) {
    throwGroveError(500, API_ERRORS.PAYMENT_PROVIDER_NOT_CONFIGURED, "API");
  }

  const requestedTenantId =
    url.searchParams.get("tenant_id") || locals.tenantId;

  try {
    const tenantId = await getVerifiedTenantId(
      platform.env.DB,
      requestedTenantId,
      locals.user,
    );

    // Check rate limit before processing (Threshold SDK)
    const { result: rateLimitResult, response: rateLimitResponse } =
      await checkBillingRateLimit(platform.env, tenantId);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const data = (await request.json()) as CheckoutRequest;

    if (!data.plan || !PLANS[data.plan]) {
      throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
    }

    if (!data.successUrl || !data.cancelUrl) {
      throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "API");
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

    // Note: This endpoint is for legacy/internal use. Plant handles new signups
    // with hardcoded Stripe price IDs. This creates dynamic pricing as fallback.
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

    // Create dynamic price data (Plant uses hardcoded Stripe price IDs for new signups)
    const lineItems = [
      {
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
      },
    ];

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
        headers: thresholdHeaders(rateLimitResult, BILLING_RATE_LIMIT.limit),
      },
    );
  } catch (err) {
    if ((err as { status?: number }).status) throw err;

    // Extract error details for better debugging and user feedback
    let errorMessage = "Failed to create checkout session";
    const errorDetails: Record<string, unknown> = {};

    if (err instanceof Error) {
      errorMessage = err.message;
      errorDetails.message = err.message;

      // Handle specific Stripe error codes
      if (err.message.includes("Invalid price")) {
        errorMessage =
          "Selected plan is not available. Please try another plan.";
      } else if (err.message.includes("Customer already exists")) {
        errorMessage =
          "This account already has an active subscription. Please contact support.";
      } else if (err.message.includes("Invalid API key")) {
        errorMessage = "Payment system error. Please try again later.";
        errorDetails.severity = "critical";
      }
    } else {
      errorDetails.rawError = String(err);
    }

    console.error(
      "[Billing] Checkout creation failed:",
      errorDetails,
      err instanceof Error ? err.stack : undefined,
    );

    logGroveError("API", API_ERRORS.OPERATION_FAILED, { cause: err });
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API", { cause: err });
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
    throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
  }

  if (!platform?.env?.DB) {
    throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
  }

  if (!platform?.env?.STRIPE_SECRET_KEY) {
    throwGroveError(500, API_ERRORS.PAYMENT_PROVIDER_NOT_CONFIGURED, "API");
  }

  const tenantId = locals.tenantId;
  if (!tenantId) {
    throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
  }

  try {
    const verifiedTenantId = await getVerifiedTenantId(
      platform.env.DB,
      tenantId,
      locals.user,
    );

    // Check rate limit before processing (Threshold SDK)
    const { result: rateLimitResult, response: rateLimitResponse } =
      await checkBillingRateLimit(platform.env, tenantId);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const data = (await request.json()) as UpdateRequest;

    // Get billing record with tenant info for email
    const billing = (await platform.env.DB.prepare(
      `SELECT pb.id, pb.plan, pb.status, pb.provider_customer_id, pb.provider_subscription_id,
              pb.current_period_start, pb.current_period_end, pb.cancel_at_period_end,
              pb.payment_method_last4, pb.payment_method_brand,
              pb.created_at, pb.updated_at, t.subdomain
       FROM platform_billing pb
       JOIN tenants t ON t.id = pb.tenant_id
       WHERE pb.tenant_id = ?`,
    )
      .bind(verifiedTenantId)
      .first()) as (BillingRecord & { subdomain: string }) | null;

    if (!billing || !billing.provider_subscription_id) {
      throwGroveError(404, API_ERRORS.RESOURCE_NOT_FOUND, "API");
    }

    const payments = createPaymentProvider("stripe", {
      secretKey: platform.env.STRIPE_SECRET_KEY,
    });

    switch (data.action) {
      case "cancel":
        // Cancel at period end (Stripe supports both immediate and end-of-period)
        await payments.cancelSubscription(
          billing.provider_subscription_id,
          data.cancelImmediately || false,
        );

        await platform.env.DB.prepare(
          `UPDATE platform_billing SET
            cancel_at_period_end = 1,
            updated_at = ?
           WHERE id = ? AND tenant_id = ?`,
        )
          .bind(Math.floor(Date.now() / 1000), billing.id, verifiedTenantId)
          .run();

        // Send cancellation confirmation email (non-blocking)
        if (platform.env.RESEND_API_KEY && locals.user.email) {
          sendCancellationEmail({
            to: locals.user.email,
            name: locals.user.name || "Wanderer",
            subdomain: billing.subdomain,
            periodEndDate: billing.current_period_end
              ? new Date(billing.current_period_end * 1000).toLocaleDateString(
                  "en-US",
                  { month: "long", day: "numeric", year: "numeric" },
                )
              : "the end of your billing period",
            planName: PLANS[billing.plan]?.name || billing.plan,
            resendApiKey: platform.env.RESEND_API_KEY,
          }).catch((err) => {
            console.error("[Billing] Failed to send cancellation email:", err, {
              tenant: tenantId,
              email: locals.user?.email,
            });
          });
        }

        // Audit log: subscription cancelled
        await logBillingAudit(platform.env.DB, {
          tenantId,
          action: "subscription_cancelled",
          details: {
            plan: billing.plan,
            immediate: data.cancelImmediately || false,
            subscriptionId: billing.provider_subscription_id,
          },
          userEmail: locals.user.email,
        });

        return json(
          {
            success: true,
            message: "Subscription will cancel at period end",
          },
          {
            headers: thresholdHeaders(
              rateLimitResult,
              BILLING_RATE_LIMIT.limit,
            ),
          },
        );

      case "resume":
        await payments.resumeSubscription(billing.provider_subscription_id);

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
            headers: thresholdHeaders(
              rateLimitResult,
              BILLING_RATE_LIMIT.limit,
            ),
          },
        );

      case "change_plan":
        // Plan changes are handled through Stripe's billing portal
        // Use PUT /api/billing to get a portal URL
        throwGroveError(400, API_ERRORS.INVALID_STATE_TRANSITION, "API");

      default:
        throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
    }
  } catch (err) {
    if ((err as { status?: number }).status) throw err;

    // Extract error details for better debugging and user feedback
    let errorMessage = "Failed to update subscription";
    const errorDetails: Record<string, unknown> = {};

    if (err instanceof Error) {
      errorMessage = err.message;
      errorDetails.message = err.message;

      // Handle specific Stripe error codes
      if (
        err.message.includes("not found") ||
        err.message.includes("Not Found") ||
        err.message.includes("No such subscription")
      ) {
        errorMessage =
          "Subscription not found. Please try refreshing your billing page.";
      } else if (
        err.message.includes("Unauthorized") ||
        err.message.includes("Invalid API")
      ) {
        errorMessage = "Payment system error. Please try again later.";
        errorDetails.severity = "critical";
      } else if (
        err.message.includes("cannot be resumed") ||
        err.message.includes("already canceled")
      ) {
        errorMessage =
          "This subscription cannot be resumed. Please contact support.";
      }
    } else {
      errorDetails.rawError = String(err);
    }

    console.error(
      "[Billing] Subscription update failed:",
      errorDetails,
      err instanceof Error ? err.stack : undefined,
    );

    logGroveError("API", API_ERRORS.OPERATION_FAILED, { cause: err });
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API", { cause: err });
  }
};

/**
 * PUT /api/billing - Create Stripe Billing Portal session
 *
 * Returns a URL to Stripe's hosted billing portal where users can:
 * - Update payment method
 * - View invoices
 * - Cancel subscription
 * - Change plan
 */
export const PUT: RequestHandler = async ({
  request,
  url,
  platform,
  locals,
}) => {
  if (!locals.user) {
    throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
  }

  if (!platform?.env?.DB) {
    throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
  }

  if (!platform?.env?.STRIPE_SECRET_KEY) {
    throwGroveError(500, API_ERRORS.PAYMENT_PROVIDER_NOT_CONFIGURED, "API");
  }

  const requestedTenantId =
    url.searchParams.get("tenant_id") || locals.tenantId;

  try {
    const tenantId = await getVerifiedTenantId(
      platform.env.DB,
      requestedTenantId,
      locals.user,
    );

    // Check if this is a comped account first
    const compedStatus = await isCompedAccount(platform.env.DB, tenantId);
    if (compedStatus.isComped) {
      // Comped accounts don't have Stripe customer records
      // Return a friendly message instead of an error
      return json({
        success: false,
        isComped: true,
        tier: compedStatus.tier,
        message:
          "Your account is complimentary and doesn't require payment management. " +
          "If you have questions about your account, contact hello@grove.place.",
      });
    }

    // Get the Stripe customer ID
    const billing = (await platform.env.DB.prepare(
      `SELECT provider_customer_id FROM platform_billing WHERE tenant_id = ?`,
    )
      .bind(tenantId)
      .first()) as { provider_customer_id: string | null } | null;

    if (!billing?.provider_customer_id) {
      // Not comped but no customer ID - might be pre-migration or data issue
      throwGroveError(404, API_ERRORS.RESOURCE_NOT_FOUND, "API");
    }

    // Get subdomain for return URL
    const tenant = (await platform.env.DB.prepare(
      `SELECT subdomain FROM tenants WHERE id = ?`,
    )
      .bind(tenantId)
      .first()) as { subdomain: string } | null;

    const returnUrl = tenant
      ? `https://${tenant.subdomain}.grove.place/arbor/account`
      : url.origin + "/arbor/account";

    // Create Stripe Billing Portal session
    const response = await fetch(
      "https://api.stripe.com/v1/billing_portal/sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${platform.env.STRIPE_SECRET_KEY}`,
          "Content-Type": "application/x-www-form-urlencoded",
          "Stripe-Version": "2024-11-20.acacia",
        },
        body: new URLSearchParams({
          customer: billing.provider_customer_id,
          return_url: returnUrl,
        }).toString(),
      },
    );

    const data = (await response.json()) as {
      url?: string;
      error?: { message: string };
    };

    if (!response.ok || data.error) {
      console.error("[Billing] Portal creation failed:", data.error);
      logGroveError("API", API_ERRORS.OPERATION_FAILED, { cause: data.error });
      throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API");
    }

    if (!data.url) {
      logGroveError("API", API_ERRORS.OPERATION_FAILED);
      throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API");
    }

    return json({
      success: true,
      portalUrl: data.url,
    });
  } catch (err) {
    if ((err as { status?: number }).status) throw err;
    console.error("[Billing] Portal creation error:", err);
    logGroveError("API", API_ERRORS.OPERATION_FAILED, { cause: err });
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API", { cause: err });
  }
};
