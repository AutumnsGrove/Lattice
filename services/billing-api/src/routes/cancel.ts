/**
 * POST /cancel — Cancel a subscription
 *
 * By default, cancels at period end. Set immediately=true for
 * immediate cancellation.
 */

import { Hono } from "hono";
import type { Env, CancelRequest } from "../types.js";
import { BILLING_ERRORS, billingError } from "../errors.js";
import { StripeClient, StripeAPIError } from "../stripe/client.js";
import { rateLimitMiddleware } from "../middleware/rateLimit.js";
import { safeParseBody, isValidUUID } from "../utils/validation.js";
import { logBillingAudit } from "../services/audit.js";
import { sendCancellationEmail } from "../services/email.js";

const cancel = new Hono<{ Bindings: Env }>();

// Rate limit: 5 requests per hour
cancel.use(
	"*",
	rateLimitMiddleware("cancel", (c) => c.req.header("CF-Connecting-IP") || "unknown"),
);

cancel.post("/", async (c) => {
	const body = await safeParseBody<CancelRequest>(c.req.raw);
	if (!body || !body.tenantId) {
		return billingError(BILLING_ERRORS.TENANT_NOT_FOUND, "tenantId required");
	}

	const { tenantId, immediately = false } = body;

	// Validate tenantId format
	if (!isValidUUID(tenantId)) {
		return billingError(BILLING_ERRORS.TENANT_NOT_FOUND, "Invalid tenantId format");
	}
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

		// Send cancellation email (non-blocking)
		if (onboarding && c.env.ZEPHYR) {
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
