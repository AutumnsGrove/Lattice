/**
 * POST /checkout — Create Stripe Checkout Session
 *
 * Accepts tenantId (existing) or onboardingId (new signup).
 * Validates tier, checks for comped accounts, and creates a
 * Stripe Checkout Session for subscription signup.
 */

import { Hono } from "hono";
import type { Env, CheckoutRequest } from "../types.js";
import { PAID_TIERS } from "../types.js";
import { BILLING_ERRORS, billingError } from "../errors.js";
import { StripeClient, StripeAPIError } from "../stripe/client.js";
import { rateLimitMiddleware } from "../middleware/rateLimit.js";
import {
	isValidPaidTier,
	isValidBillingCycle,
	isValidUUID,
	getPriceId,
	isValidUrl,
	safeParseBody,
} from "../utils/validation.js";

const checkout = new Hono<{ Bindings: Env }>();

// Rate limit: 10 requests per hour
checkout.use(
	"*",
	rateLimitMiddleware("checkout", (c) => {
		// Rate limit key extracted after body parsing below; use IP as fallback
		return c.req.header("CF-Connecting-IP") || "unknown";
	}),
);

checkout.post("/", async (c) => {
	const body = await safeParseBody<CheckoutRequest>(c.req.raw);
	if (!body) {
		return billingError(BILLING_ERRORS.INVALID_TIER, "Invalid request body");
	}

	const { tenantId, onboardingId, tier, billingCycle, customerEmail, successUrl, cancelUrl } = body;

	// Validate: one of tenantId or onboardingId required
	if (!tenantId && !onboardingId) {
		return billingError(BILLING_ERRORS.INVALID_TIER, "tenantId or onboardingId required");
	}

	// Validate tenantId/onboardingId are valid UUIDs (prevent injection)
	if (tenantId && !isValidUUID(tenantId)) {
		return billingError(BILLING_ERRORS.INVALID_TIER, "Invalid tenantId format");
	}
	if (onboardingId && !isValidUUID(onboardingId)) {
		return billingError(BILLING_ERRORS.INVALID_TIER, "Invalid onboardingId format");
	}

	// Validate tier (against allowlist, never echo raw input)
	if (!tier || !isValidPaidTier(tier)) {
		return billingError(BILLING_ERRORS.INVALID_TIER, "Invalid tier");
	}

	// Validate billing cycle (against allowlist, never echo raw input)
	if (!billingCycle || !isValidBillingCycle(billingCycle)) {
		return billingError(BILLING_ERRORS.INVALID_TIER, "Invalid billing cycle");
	}

	// Validate URLs (must be *.grove.place)
	if (!successUrl || !cancelUrl || !isValidUrl(successUrl) || !isValidUrl(cancelUrl)) {
		return billingError(
			BILLING_ERRORS.INVALID_TIER,
			"Valid successUrl and cancelUrl required (must be *.grove.place)",
		);
	}

	// Get price ID
	const priceId = getPriceId(tier, billingCycle);
	if (!priceId) {
		return billingError(BILLING_ERRORS.INVALID_TIER, "No price configured for this tier and cycle");
	}

	const db = c.env.DB;
	let existingCustomerId: string | undefined;

	// If tenantId provided, look up existing billing
	if (tenantId) {
		// Check tenant exists
		const tenant = await db
			.prepare("SELECT id, plan, active FROM tenants WHERE id = ?")
			.bind(tenantId)
			.first<{ id: string; plan: string; active: number }>();

		if (!tenant) {
			return billingError(BILLING_ERRORS.TENANT_NOT_FOUND);
		}

		// Check for comped account
		const billing = await db
			.prepare("SELECT provider_customer_id, plan FROM platform_billing WHERE tenant_id = ?")
			.bind(tenantId)
			.first<{ provider_customer_id: string | null; plan: string }>();

		if (billing) {
			// Check if comped (paid tier but no customer ID)
			if (
				PAID_TIERS.includes(billing.plan as (typeof PAID_TIERS)[number]) &&
				!billing.provider_customer_id
			) {
				return billingError(BILLING_ERRORS.COMPED_ACCOUNT);
			}

			// Check if already at or above target tier
			const tierOrder = PAID_TIERS;
			const currentIdx = tierOrder.indexOf(billing.plan as (typeof PAID_TIERS)[number]);
			const targetIdx = tierOrder.indexOf(tier);
			if (currentIdx >= 0 && targetIdx >= 0 && currentIdx >= targetIdx) {
				return billingError(BILLING_ERRORS.ALREADY_AT_TIER);
			}

			existingCustomerId = billing.provider_customer_id || undefined;
		}
	}

	// Create Stripe Checkout Session
	try {
		const stripe = new StripeClient(c.env.STRIPE_SECRET_KEY);

		const metadata: Record<string, string> = {
			plan: tier,
			billing_cycle: billingCycle,
		};

		if (tenantId) {
			metadata.tenant_id = tenantId;
		}
		if (onboardingId) {
			metadata.onboarding_id = onboardingId;
		}

		const session = await stripe.createCheckoutSession({
			priceId,
			customerId: existingCustomerId,
			customerEmail: existingCustomerId ? undefined : customerEmail,
			successUrl: `${successUrl}${successUrl.includes("?") ? "&" : "?"}session_id={CHECKOUT_SESSION_ID}`,
			cancelUrl,
			metadata,
			subscriptionMetadata: metadata,
		});

		return c.json({
			checkoutUrl: session.url,
			sessionId: session.id,
		});
	} catch (err) {
		if (err instanceof StripeAPIError) {
			console.error("[Checkout] Stripe error:", {
				type: err.type,
				code: err.stripeCode,
				message: err.message,
				statusCode: err.statusCode,
			});
		} else {
			console.error("[Checkout] Unexpected error:", err);
		}

		return billingError(BILLING_ERRORS.STRIPE_ERROR);
	}
});

export default checkout;
