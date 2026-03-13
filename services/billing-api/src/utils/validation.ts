/**
 * Input Validation Helpers
 *
 * Lightweight validation for request bodies.
 * No external dependencies — just type guards and assertions.
 */

import { PAID_TIERS, STRIPE_PRICES, type PlanTier, type BillingCycle } from "../types.js";

// =============================================================================
// VALIDATORS
// =============================================================================

/**
 * Validate that a tier is a valid paid tier
 */
export function isValidPaidTier(tier: string): tier is PlanTier {
	return PAID_TIERS.includes(tier as PlanTier);
}

/**
 * Validate that a billing cycle is valid
 */
export function isValidBillingCycle(cycle: string): cycle is BillingCycle {
	return cycle === "monthly" || cycle === "yearly";
}

/**
 * Get the Stripe price ID for a tier + billing cycle combination.
 * Returns null if invalid.
 */
export function getPriceId(tier: string, billingCycle: string): string | null {
	const prices = STRIPE_PRICES[tier];
	if (!prices) return null;

	const priceId = prices[billingCycle as BillingCycle];
	if (!priceId) return null;

	return priceId;
}

/** Match HTTPS *.grove.place origins (single or multi-level subdomains) */
const ALLOWED_URL_RE = /^https:\/\/([a-z0-9-]+\.)*grove\.place(\/|$)/;

/** Match localhost origins for local development */
const LOCAL_URL_RE = /^http:\/\/localhost(:\d+)?(\/|$)/;

/**
 * Validate a URL is well-formed AND within the *.grove.place allowlist.
 * Prevents open redirect attacks via successUrl/cancelUrl/returnUrl.
 */
export function isValidUrl(url: string): boolean {
	try {
		new URL(url); // Validates URL is well-formed
		return ALLOWED_URL_RE.test(url) || LOCAL_URL_RE.test(url);
	} catch {
		return false;
	}
}

/**
 * Validate a UUID string
 */
export function isValidUUID(id: string): boolean {
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

/** Maximum request body size: 64 KB (generous for JSON billing requests) */
const MAX_BODY_SIZE = 64 * 1024;

/**
 * Safely parse a JSON request body.
 * Returns null if parsing fails or body exceeds size limit.
 */
export async function safeParseBody<T>(request: Request): Promise<T | null> {
	try {
		// Check Content-Length header first (fast reject)
		const contentLength = request.headers.get("Content-Length");
		if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE) {
			return null;
		}

		// Read body with size enforcement
		const body = await request.text();
		if (body.length > MAX_BODY_SIZE) {
			return null;
		}

		return JSON.parse(body) as T;
	} catch {
		return null;
	}
}

// =============================================================================
// SUBSCRIPTION STATUS MAPPING
// =============================================================================

/**
 * Map Stripe subscription status to Grove's internal status
 */
export function mapSubscriptionStatus(
	stripeStatus: string,
): "active" | "past_due" | "paused" | "cancelled" | "expired" {
	const statusMap: Record<string, "active" | "past_due" | "paused" | "cancelled" | "expired"> = {
		active: "active",
		trialing: "active",
		past_due: "past_due",
		unpaid: "past_due",
		canceled: "cancelled",
		incomplete: "past_due",
		incomplete_expired: "expired",
		paused: "paused",
	};

	return statusMap[stripeStatus] || "expired";
}
