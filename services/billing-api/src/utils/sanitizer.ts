/**
 * Stripe Webhook Payload Sanitizer
 *
 * Strips PII from Stripe webhook payloads before database storage.
 * Uses a whitelist approach — only explicitly allowed fields are kept.
 *
 * Adapted from libs/engine/src/lib/utils/webhook-sanitizer.ts
 * (Stripe-specific sanitizer only — LemonSqueezy sanitizer removed).
 *
 * Critical for:
 * - GDPR compliance (minimizing stored personal data)
 * - PCI DSS compliance (not storing card details)
 * - Defense-in-depth (reducing data breach impact)
 */

// =============================================================================
// TYPES
// =============================================================================

export interface SanitizedStripePayload {
	id: string;
	type: string;
	created: number;
	livemode: boolean;
	data: {
		object: Record<string, unknown>;
	};
}

// =============================================================================
// WHITELISTS
// =============================================================================

/**
 * Safe fields to keep from Stripe webhook event objects.
 */
const STRIPE_OBJECT_WHITELIST = new Set([
	// Identifiers (not PII)
	"id",
	"object",
	"customer",
	"subscription",
	"invoice",
	"payment_intent",
	"charge",

	// Status fields
	"status",
	"payment_status",
	"billing_reason",

	// Financial (no card details)
	"amount_total",
	"amount_paid",
	"amount_due",
	"amount_remaining",
	"currency",
	"total",
	"subtotal",
	"tax",

	// Subscription details
	"current_period_start",
	"current_period_end",
	"cancel_at_period_end",
	"canceled_at",
	"cancel_at",
	"trial_start",
	"trial_end",

	// Plan/price metadata (product info, not PII)
	"plan",
	"price",
	"quantity",
	"interval",
	"interval_count",

	// Subscription line items (deep-sanitized below)
	"items",

	// Timestamps
	"created",
	"livemode",

	// Our metadata (onboarding_id, username, plan, billing_cycle)
	"metadata",
]);

/**
 * Stripe fields that are PII and must NEVER be stored
 */
const STRIPE_PII_FIELDS = new Set([
	"email",
	"customer_email",
	"name",
	"customer_name",
	"phone",
	"address",
	"shipping",
	"billing_details",
	"receipt_email",
	"description",
	"last4",
	"brand",
	"default_payment_method",
	"default_source",
	"hosted_invoice_url",
	"invoice_pdf",
]);

// =============================================================================
// SANITIZATION
// =============================================================================

/**
 * Sanitize a Stripe webhook event by stripping PII.
 *
 * @param payload - Raw Stripe webhook event (parsed JSON)
 * @returns Sanitized payload with PII removed, or null if invalid
 */
export function sanitizeStripeWebhookPayload(payload: unknown): SanitizedStripePayload | null {
	if (!payload || typeof payload !== "object") {
		return null;
	}

	const raw = payload as Record<string, unknown>;

	// Validate Stripe event structure
	if (typeof raw.id !== "string" || typeof raw.type !== "string" || !raw.data) {
		return null;
	}

	const data = raw.data as Record<string, unknown>;
	if (!data.object || typeof data.object !== "object") {
		return null;
	}

	const eventObject = data.object as Record<string, unknown>;

	// Whitelist-filter the event object
	const sanitizedObject: Record<string, unknown> = {};
	for (const key of STRIPE_OBJECT_WHITELIST) {
		if (key in eventObject && !STRIPE_PII_FIELDS.has(key)) {
			const value = eventObject[key];

			// Deep-sanitize nested objects (e.g., items.data[].price)
			if (key === "items" && value && typeof value === "object") {
				const items = value as { data?: unknown[] };
				if (Array.isArray(items.data)) {
					sanitizedObject[key] = {
						data: items.data.map((item: unknown) => {
							if (!item || typeof item !== "object") return {};
							const i = item as Record<string, unknown>;
							return {
								id: i.id,
								price: i.price
									? {
											id: (i.price as Record<string, unknown>).id,
											product: (i.price as Record<string, unknown>).product,
											unit_amount: (i.price as Record<string, unknown>).unit_amount,
											currency: (i.price as Record<string, unknown>).currency,
											recurring: (i.price as Record<string, unknown>).recurring,
										}
									: undefined,
								quantity: i.quantity,
							};
						}),
					};
				}
			} else {
				sanitizedObject[key] = value;
			}
		}
	}

	return {
		id: raw.id as string,
		type: raw.type as string,
		created: (raw.created as number) || 0,
		livemode: (raw.livemode as boolean) || false,
		data: {
			object: sanitizedObject,
		},
	};
}

// =============================================================================
// RETENTION
// =============================================================================

/**
 * Calculate retention expiry timestamp (120 days from now)
 */
export function calculateWebhookExpiry(): number {
	const RETENTION_DAYS = 120;
	const now = Math.floor(Date.now() / 1000);
	return now + RETENTION_DAYS * 24 * 60 * 60;
}
