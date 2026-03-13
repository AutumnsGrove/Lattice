/**
 * BillingHub Error Catalog
 *
 * Structured error codes for the billing API service.
 * Format: BILLING-NNN
 *
 * Ranges:
 *   001-009  Validation errors
 *   010-019  Business logic / conflict errors
 *   020-029  External service errors
 *   030-039  Rate limiting
 */

// =============================================================================
// ERROR DEFINITION TYPE
// =============================================================================

export interface BillingErrorDef {
	/** Structured error code */
	code: string;
	/** HTTP status code */
	status: number;
	/** User-safe message */
	message: string;
}

// =============================================================================
// ERROR CATALOG
// =============================================================================

export const BILLING_ERRORS = {
	// ─────────────────────────────────────────────────────────────────────────
	// Validation Errors (001-009)
	// ─────────────────────────────────────────────────────────────────────────

	INVALID_TIER: {
		code: "BILLING-001",
		status: 400,
		message: "Invalid tier or billing cycle",
	},

	TENANT_NOT_FOUND: {
		code: "BILLING-002",
		status: 404,
		message: "Tenant not found",
	},

	// ─────────────────────────────────────────────────────────────────────────
	// Business Logic / Conflict Errors (010-019)
	// ─────────────────────────────────────────────────────────────────────────

	ALREADY_AT_TIER: {
		code: "BILLING-003",
		status: 409,
		message: "Already at or above target tier",
	},

	COMPED_ACCOUNT: {
		code: "BILLING-004",
		status: 409,
		message: "Comped account cannot checkout",
	},

	// ─────────────────────────────────────────────────────────────────────────
	// External Service Errors (020-029)
	// ─────────────────────────────────────────────────────────────────────────

	STRIPE_ERROR: {
		code: "BILLING-005",
		status: 500,
		message: "Payment provider error",
	},

	// ─────────────────────────────────────────────────────────────────────────
	// Rate Limiting (030-039)
	// ─────────────────────────────────────────────────────────────────────────

	RATE_LIMITED: {
		code: "BILLING-006",
		status: 429,
		message: "Too many requests",
	},

	// ─────────────────────────────────────────────────────────────────────────
	// Missing Data (040-049)
	// ─────────────────────────────────────────────────────────────────────────

	NO_CUSTOMER: {
		code: "BILLING-007",
		status: 404,
		message: "No payment customer on record",
	},
} as const satisfies Record<string, BillingErrorDef>;

export type BillingErrorKey = keyof typeof BILLING_ERRORS;

// =============================================================================
// ERROR RESPONSE HELPER
// =============================================================================

/**
 * Create a JSON error response from a billing error definition.
 */
export function billingError(errorDef: BillingErrorDef, detail?: string): Response {
	// Truncate detail to prevent exfiltration of large payloads via error responses
	const safeDetail = detail ? detail.slice(0, 200) : undefined;
	const body = {
		error: errorDef.code,
		message: errorDef.message,
		...(safeDetail ? { detail: safeDetail } : {}),
	};

	return new Response(JSON.stringify(body), {
		status: errorDef.status,
		headers: { "Content-Type": "application/json" },
	});
}
