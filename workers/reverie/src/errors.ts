/**
 * Reverie Error Catalog
 *
 * Signpost-compatible error definitions for the Reverie worker.
 * Imports GroveErrorDef from the engine and extends with HTTP status.
 * Prefix: REV-XXX
 */

import type { GroveErrorDef } from "@autumnsgrove/lattice/errors";

/** Reverie error definition — GroveErrorDef + HTTP status for response building. */
export type ReverieErrorDef = GroveErrorDef & { status: number };

export const REVERIE_ERRORS = {
	// Auth errors
	AUTH_REQUIRED: {
		code: "REV-001",
		category: "user" as const,
		userMessage: "Authentication required",
		adminMessage: "Request missing or empty Authorization header.",
		status: 401,
	},
	AUTH_INVALID: {
		code: "REV-002",
		category: "user" as const,
		userMessage: "Invalid authentication token",
		adminMessage: "JWT verification failed or token expired.",
		status: 401,
	},
	TIER_FORBIDDEN: {
		code: "REV-003",
		category: "user" as const,
		userMessage: "Reverie is not available on your current tier",
		adminMessage: "User tier does not meet minimum requirement for Reverie access.",
		status: 403,
	},

	// Input errors
	INVALID_REQUEST: {
		code: "REV-004",
		category: "user" as const,
		userMessage: "Invalid request body",
		adminMessage: "Request body failed Zod validation or is not valid JSON.",
		status: 400,
	},
	INPUT_TOO_LONG: {
		code: "REV-005",
		category: "user" as const,
		userMessage: "Input exceeds maximum length",
		adminMessage: "User input exceeded the maximum character limit for Reverie queries.",
		status: 400,
	},
	NO_DOMAINS_MATCHED: {
		code: "REV-006",
		category: "user" as const,
		userMessage: "Could not identify any configuration domains from your request",
		adminMessage: "Domain classification returned zero matches for the user's natural language input.",
		status: 400,
	},

	// Execution errors
	REQUEST_NOT_FOUND: {
		code: "REV-007",
		category: "user" as const,
		userMessage: "Preview request not found or expired",
		adminMessage: "Lookup by requestId returned no row — request may have expired or been consumed.",
		status: 404,
	},
	DOMAIN_READ_ONLY: {
		code: "REV-008",
		category: "user" as const,
		userMessage: "This domain is read-only and cannot be modified",
		adminMessage: "User attempted to write to a domain marked as read-only in the domain registry.",
		status: 403,
	},
	VALIDATION_FAILED: {
		code: "REV-009",
		category: "user" as const,
		userMessage: "One or more field values failed validation",
		adminMessage: "Domain-level field validation rejected one or more proposed changes.",
		status: 400,
	},
	EXECUTION_FAILED: {
		code: "REV-010",
		category: "bug" as const,
		userMessage: "Failed to apply configuration changes",
		adminMessage: "Domain executor threw during apply phase. Check upstream API logs.",
		status: 500,
	},

	// Rate limiting
	RATE_LIMITED: {
		code: "REV-011",
		category: "user" as const,
		userMessage: "Too many requests — please wait before trying again",
		adminMessage: "Rate limiter rejected request. User exceeded per-minute or per-hour quota.",
		status: 429,
	},

	// Upstream errors
	LUMEN_UNAVAILABLE: {
		code: "REV-012",
		category: "bug" as const,
		userMessage: "AI inference service is unavailable",
		adminMessage: "Lumen worker returned a non-2xx status or failed to respond.",
		status: 502,
	},
	LUMEN_ERROR: {
		code: "REV-013",
		category: "bug" as const,
		userMessage: "AI inference returned an error",
		adminMessage: "Lumen returned 2xx but response body contained an error or unparseable result.",
		status: 502,
	},

	// Internal
	INTERNAL_ERROR: {
		code: "REV-014",
		category: "bug" as const,
		userMessage: "An unexpected error occurred",
		adminMessage: "Unhandled exception in Reverie worker.",
		status: 500,
	},
	DB_ERROR: {
		code: "REV-015",
		category: "bug" as const,
		userMessage: "Database operation failed",
		adminMessage: "D1 query threw or returned unexpected result.",
		status: 500,
	},
} as const satisfies Record<string, ReverieErrorDef>;

/**
 * Build a Reverie error response from an error definition.
 */
export function buildReverieError(
	def: ReverieErrorDef,
	detail?: string,
): { body: { success: false; error: { code: string; message: string } }; status: number } {
	return {
		body: {
			success: false,
			error: {
				code: def.code,
				message: detail ? `${def.userMessage}: ${detail}` : def.userMessage,
			},
		},
		status: def.status,
	};
}
