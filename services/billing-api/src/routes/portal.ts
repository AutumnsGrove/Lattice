/**
 * POST /portal — Create Stripe Billing Portal Session
 *
 * Returns a URL to Stripe's hosted billing portal where users can
 * update payment method, view invoices, cancel, or change plan.
 */

import { Hono } from "hono";
import type { Env, PortalRequest } from "../types.js";
import { PAID_TIERS } from "../types.js";
import { BILLING_ERRORS, billingError } from "../errors.js";
import { StripeClient, StripeAPIError } from "../stripe/client.js";
import { rateLimitMiddleware } from "../middleware/rateLimit.js";
import { safeParseBody, isValidUUID, isValidUrl } from "../utils/validation.js";

const portal = new Hono<{ Bindings: Env }>();

// Rate limit: 20 requests per hour
portal.use(
	"*",
	rateLimitMiddleware("portal", (c) => c.req.header("CF-Connecting-IP") || "unknown"),
);

portal.post("/", async (c) => {
	const body = await safeParseBody<PortalRequest>(c.req.raw);
	if (!body || !body.tenantId || !body.returnUrl) {
		return billingError(BILLING_ERRORS.TENANT_NOT_FOUND, "tenantId and returnUrl required");
	}

	const { tenantId, returnUrl } = body;

	// Validate tenantId format
	if (!isValidUUID(tenantId)) {
		return billingError(BILLING_ERRORS.TENANT_NOT_FOUND, "Invalid tenantId format");
	}

	// Validate returnUrl against allowlist (prevent open redirect via Stripe portal)
	if (!isValidUrl(returnUrl)) {
		return billingError(BILLING_ERRORS.TENANT_NOT_FOUND, "Invalid returnUrl");
	}
	const db = c.env.DB;

	// Check tenant exists
	const tenant = await db
		.prepare("SELECT id, plan FROM tenants WHERE id = ?")
		.bind(tenantId)
		.first<{ id: string; plan: string }>();

	if (!tenant) {
		return billingError(BILLING_ERRORS.TENANT_NOT_FOUND);
	}

	// Check for comped account
	const billing = await db
		.prepare("SELECT provider_customer_id, plan FROM platform_billing WHERE tenant_id = ?")
		.bind(tenantId)
		.first<{ provider_customer_id: string | null; plan: string }>();

	if (!billing) {
		return billingError(BILLING_ERRORS.NO_CUSTOMER);
	}

	// Check if comped (paid tier but no customer ID)
	if (
		PAID_TIERS.includes(billing.plan as (typeof PAID_TIERS)[number]) &&
		!billing.provider_customer_id
	) {
		return billingError(BILLING_ERRORS.COMPED_ACCOUNT);
	}

	if (!billing.provider_customer_id) {
		return billingError(BILLING_ERRORS.NO_CUSTOMER);
	}

	// Create Stripe Billing Portal session
	try {
		const stripe = new StripeClient(c.env.STRIPE_SECRET_KEY);

		const session = await stripe.createBillingPortalSession(
			billing.provider_customer_id,
			returnUrl,
		);

		return c.json({ portalUrl: session.url });
	} catch (err) {
		if (err instanceof StripeAPIError) {
			console.error("[Portal] Stripe error:", {
				type: err.type,
				message: err.message,
			});
		} else {
			console.error("[Portal] Unexpected error:", err);
		}

		return billingError(BILLING_ERRORS.STRIPE_ERROR);
	}
});

export default portal;
