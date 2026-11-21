/**
 * POST /cancel — Cancel a subscription
 *
 * By default, cancels at period end. Set immediately=true for
 * immediate cancellation.
 *
 * `notify: false` cancels without emailing the account holder. A removal uses it:
 * the removal sends its own notice, and a "your subscription is cancelled" mail
 * moments before "your account is gone" reads as two systems disagreeing (#1745).
 */

import { Hono, type Context } from "hono";
import type { Env, CancelRequest } from "../types.js";
import { BILLING_ERRORS, billingError } from "../errors.js";
import { StripeClient, StripeAPIError } from "../stripe/client.js";
import { RATE_LIMITS, checkRateLimit } from "../middleware/rateLimit.js";
import { safeParseBody, isValidUUID } from "../utils/validation.js";
import { logBillingAudit } from "../services/audit.js";
import { sendCancellationEmail } from "../services/email.js";

const cancel = new Hono<{ Bindings: Env }>();

const CANCEL_LIMIT = RATE_LIMITS.cancel;

/**
 * 5 requests per hour, keyed per tenant rather than per IP.
 *
 * This route is reached over a service binding, where `CF-Connecting-IP` is
 * absent — every internal caller would fall into one shared "unknown" bucket, so
 * a cleanup of nine tenants (2026-11-16) would trip the limit at the sixth and
 * abandon the removal (#1745). A real client IP is still honoured when there is
 * one, which is how the proxied call has always behaved.
 */
async function rateLimit(
	c: Context<{ Bindings: Env }>,
	tenantId: string,
): Promise<Response | null> {
	const kv = c.env.CACHE_KV;
	if (!kv) return null; // No KV binding — skip rate limiting, as before

	const ip = c.req.header("CF-Connecting-IP");
	const key = ip && ip !== "unknown" ? ip : `tenant:${tenantId}`;
	const result = await checkRateLimit(kv, key, CANCEL_LIMIT);

	if (!result.allowed) return billingError(BILLING_ERRORS.RATE_LIMITED);

	c.header("X-RateLimit-Limit", String(CANCEL_LIMIT.limit));
	c.header("X-RateLimit-Remaining", String(result.remaining));
	c.header("X-RateLimit-Reset", String(result.resetAt));
	return null;
}

cancel.post("/", async (c) => {
	const body = await safeParseBody<CancelRequest>(c.req.raw);
	if (!body || !body.tenantId) {
		return billingError(BILLING_ERRORS.TENANT_NOT_FOUND, "tenantId required");
	}

	const { tenantId, immediately = false, notify = true } = body;

	// Validate tenantId format
	if (!isValidUUID(tenantId)) {
		return billingError(BILLING_ERRORS.TENANT_NOT_FOUND, "Invalid tenantId format");
	}

	const limited = await rateLimit(c, tenantId);
	if (limited) return limited;
	const db = c.env.DB;

	// Get billing record with tenant and owner info in one query
	const billing = await db
		.prepare(
			`SELECT pb.id, pb.plan, pb.status, pb.provider_subscription_id,
              pb.current_period_end, t.subdomain,
              u.email, u.display_name
       FROM platform_billing pb
       JOIN tenants t ON t.id = pb.tenant_id
       JOIN user_onboarding u ON u.id = t.onboarding_id
       WHERE pb.tenant_id = ?`,
		)
		.bind(tenantId)
		.first<{
			id: string;
			plan: string;
			status: string;
			provider_subscription_id: string | null;
			current_period_end: number | null;
			subdomain: string;
			email: string;
			display_name: string;
		}>();

	if (!billing || !billing.provider_subscription_id) {
		return billingError(BILLING_ERRORS.NO_CUSTOMER);
	}

	// Cancel via Stripe
	try {
		const stripe = new StripeClient(c.env.STRIPE_SECRET_KEY);
		const sub = await stripe.cancelSubscription(billing.provider_subscription_id, immediately);

		// Update platform_billing
		if (immediately) {
			await db
				.prepare(
					`UPDATE platform_billing
           SET status = 'cancelled', cancel_at_period_end = 1, updated_at = unixepoch()
           WHERE id = ?`,
				)
				.bind(billing.id)
				.run();
		} else {
			await db
				.prepare(
					`UPDATE platform_billing
           SET cancel_at_period_end = 1, updated_at = unixepoch()
           WHERE id = ?`,
				)
				.bind(billing.id)
				.run();
		}

		// onboarding info already fetched above — no second query needed
		const onboarding = billing.email
			? { email: billing.email, display_name: billing.display_name }
			: null;

		// Send cancellation email (non-blocking), unless the caller is sending its
		// own notice. Suppressed on a removal, where the removal email follows.
		if (notify && onboarding && c.env.ZEPHYR) {
			const periodEndDate = billing.current_period_end
				? new Date(billing.current_period_end * 1000).toLocaleDateString("en-US", {
						month: "long",
						day: "numeric",
						year: "numeric",
					})
				: "the end of your billing period";

			sendCancellationEmail(c.env.ZEPHYR, {
				to: onboarding.email,
				name: onboarding.display_name || "Wanderer",
				subdomain: billing.subdomain,
				periodEndDate,
				planName: billing.plan,
			}).catch((err) => {
				console.error("[Cancel] Failed to send cancellation email:", err);
			});
		}

		// Audit log
		await logBillingAudit(db, {
			tenantId,
			action: "subscription_cancelled",
			details: {
				plan: billing.plan,
				immediate: immediately,
				subscriptionId: billing.provider_subscription_id,
			},
			userEmail: onboarding?.email,
		});

		const periodEnd = sub.current_period_end
			? new Date(sub.current_period_end * 1000).toISOString()
			: null;

		return c.json({
			success: true,
			periodEnd,
		});
	} catch (err) {
		if (err instanceof StripeAPIError) {
			console.error("[Cancel] Stripe error:", {
				type: err.type,
				message: err.message,
			});
		} else {
			console.error("[Cancel] Unexpected error:", err);
		}

		return billingError(BILLING_ERRORS.STRIPE_ERROR);
	}
});

export default cancel;
