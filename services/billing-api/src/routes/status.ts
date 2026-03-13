/**
 * GET /status/:tenantId — Get billing status
 *
 * Returns the current billing status for a tenant, including
 * plan, subscription status, period dates, and payment method.
 */

import { Hono } from "hono";
import type { Env, BillingRecord } from "../types.js";
import { PAID_TIERS } from "../types.js";
import { BILLING_ERRORS, billingError } from "../errors.js";
import { rateLimitMiddleware } from "../middleware/rateLimit.js";
import { isValidUUID } from "../utils/validation.js";

const status = new Hono<{ Bindings: Env }>();

// Rate limit: 100 requests per hour
status.use(
	"*",
	rateLimitMiddleware(
		"status",
		(c) => c.req.param("tenantId") || c.req.header("CF-Connecting-IP") || "unknown",
	),
);

status.get("/:tenantId", async (c) => {
	const tenantId = c.req.param("tenantId");
	if (!tenantId || !isValidUUID(tenantId)) {
		return billingError(BILLING_ERRORS.TENANT_NOT_FOUND, "Valid tenantId required");
	}

	const db = c.env.DB;

	// Get tenant
	const tenant = await db
		.prepare("SELECT id, plan, active FROM tenants WHERE id = ?")
		.bind(tenantId)
		.first<{ id: string; plan: string; active: number }>();

	if (!tenant) {
		return billingError(BILLING_ERRORS.TENANT_NOT_FOUND);
	}

	// Get billing record
	const billing = await db
		.prepare(
			`SELECT id, plan, status, provider_customer_id, provider_subscription_id,
              current_period_start, current_period_end, cancel_at_period_end,
              payment_method_last4, payment_method_brand,
              created_at, updated_at
       FROM platform_billing WHERE tenant_id = ?`,
		)
		.bind(tenantId)
		.first<BillingRecord>();

	if (!billing) {
		// No billing record — free tier
		return c.json({
			plan: tenant.plan || "wanderer",
			status: "active",
			flourishState: "free",
			currentPeriodEnd: null,
			cancelAtPeriodEnd: false,
			isComped: false,
			paymentMethod: null,
		});
	}

	// Determine if comped
	const isComped =
		PAID_TIERS.includes(billing.plan as (typeof PAID_TIERS)[number]) &&
		!billing.provider_customer_id;

	// Determine flourish state (UI indicator)
	let flourishState: string;
	if (isComped) {
		flourishState = "comped";
	} else if (billing.cancel_at_period_end === 1) {
		flourishState = "cancelling";
	} else if (billing.status === "past_due") {
		flourishState = "past_due";
	} else if (billing.status === "active") {
		flourishState = "active";
	} else {
		flourishState = billing.status || "unknown";
	}

	return c.json({
		plan: billing.plan,
		status: billing.status,
		flourishState,
		currentPeriodEnd: billing.current_period_end
			? new Date(billing.current_period_end * 1000).toISOString()
			: null,
		cancelAtPeriodEnd: billing.cancel_at_period_end === 1,
		isComped,
		paymentMethod: billing.payment_method_last4
			? {
					last4: billing.payment_method_last4,
					brand: billing.payment_method_brand,
				}
			: null,
	});
});

export default status;
