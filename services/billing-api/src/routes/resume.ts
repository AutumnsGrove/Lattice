/**
 * POST /resume — Resume a cancelled subscription
 *
 * Removes cancel_at_period_end flag from a subscription
 * that has been scheduled for cancellation.
 */

import { Hono } from "hono";
import type { Env, ResumeRequest } from "../types.js";
import { BILLING_ERRORS, billingError } from "../errors.js";
import { StripeClient, StripeAPIError } from "../stripe/client.js";
import { rateLimitMiddleware } from "../middleware/rateLimit.js";
import { safeParseBody, isValidUUID } from "../utils/validation.js";
import { logBillingAudit } from "../services/audit.js";

const resume = new Hono<{ Bindings: Env }>();

// Rate limit: 5 requests per hour
resume.use(
	"*",
	rateLimitMiddleware("resume", (c) => c.req.header("CF-Connecting-IP") || "unknown"),
);

resume.post("/", async (c) => {
	const body = await safeParseBody<ResumeRequest>(c.req.raw);
	if (!body || !body.tenantId) {
		return billingError(BILLING_ERRORS.TENANT_NOT_FOUND, "tenantId required");
	}

	const { tenantId } = body;

	// Validate tenantId format
	if (!isValidUUID(tenantId)) {
		return billingError(BILLING_ERRORS.TENANT_NOT_FOUND, "Invalid tenantId format");
	}
	const db = c.env.DB;

	// Get billing record with owner email in one query (used for audit log)
	const billing = await db
		.prepare(
			`SELECT pb.id, pb.plan, pb.provider_subscription_id, pb.cancel_at_period_end,
              u.email
       FROM platform_billing pb
       JOIN tenants t ON t.id = pb.tenant_id
       JOIN user_onboarding u ON u.id = t.onboarding_id
       WHERE pb.tenant_id = ?`,
		)
		.bind(tenantId)
		.first<{
			id: string;
			plan: string;
			provider_subscription_id: string | null;
			cancel_at_period_end: number;
			email: string | null;
		}>();

	if (!billing || !billing.provider_subscription_id) {
		return billingError(BILLING_ERRORS.NO_CUSTOMER);
	}

	// Verify the subscription is actually pending cancellation
	if (billing.cancel_at_period_end !== 1) {
		return billingError(BILLING_ERRORS.ALREADY_AT_TIER, "Subscription is not pending cancellation");
	}

	// Resume via Stripe
	try {
		const stripe = new StripeClient(c.env.STRIPE_SECRET_KEY);
		await stripe.resumeSubscription(billing.provider_subscription_id);

		// Update platform_billing
		await db
			.prepare(
				`UPDATE platform_billing
         SET cancel_at_period_end = 0, updated_at = unixepoch()
         WHERE id = ?`,
			)
			.bind(billing.id)
			.run();

		// Audit log — email already fetched above, no second query needed
		await logBillingAudit(db, {
			tenantId,
			action: "subscription_resumed",
			details: {
				plan: billing.plan,
				subscriptionId: billing.provider_subscription_id,
			},
			userEmail: billing.email ?? undefined,
		});

		return c.json({ success: true });
	} catch (err) {
		if (err instanceof StripeAPIError) {
			console.error("[Resume] Stripe error:", {
				type: err.type,
				message: err.message,
			});
		} else {
			console.error("[Resume] Unexpected error:", err);
		}

		return billingError(BILLING_ERRORS.STRIPE_ERROR);
	}
});

export default resume;
