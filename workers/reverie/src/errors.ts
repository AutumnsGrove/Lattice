/**
 * Reverie Error Catalog
 *
 * Signpost-compatible error definitions for the Reverie worker.
 * Prefix: REV-XXX
 */

export interface ReverieErrorDef {
	code: string;
	message: string;
	status: number;
}

export const REVERIE_ERRORS = {
	// Auth errors
	AUTH_REQUIRED: { code: "REV-001", message: "Authentication required", status: 401 },
	AUTH_INVALID: { code: "REV-002", message: "Invalid authentication token", status: 401 },
	TIER_FORBIDDEN: {
		code: "REV-003",
		message: "Reverie is not available on your current tier",
		status: 403,
	},

	// Input errors
	INVALID_REQUEST: { code: "REV-004", message: "Invalid request body", status: 400 },
	INPUT_TOO_LONG: { code: "REV-005", message: "Input exceeds maximum length", status: 400 },
	NO_DOMAINS_MATCHED: {
		code: "REV-006",
		message: "Could not identify any configuration domains from your request",
		status: 400,
	},

	// Execution errors
	REQUEST_NOT_FOUND: {
		code: "REV-007",
		message: "Preview request not found or expired",
		status: 404,
	},
	DOMAIN_READ_ONLY: {
		code: "REV-008",
		message: "This domain is read-only and cannot be modified",
		status: 403,
	},
	VALIDATION_FAILED: {
		code: "REV-009",
		message: "One or more field values failed validation",
		status: 400,
	},
	EXECUTION_FAILED: {
		code: "REV-010",
		message: "Failed to apply configuration changes",
		status: 500,
	},

	// Rate limiting
	RATE_LIMITED: {
		code: "REV-011",
		message: "Too many requests — please wait before trying again",
		status: 429,
	},

	// Upstream errors
	LUMEN_UNAVAILABLE: {
		code: "REV-012",
		message: "AI inference service is unavailable",
		status: 502,
	},
	LUMEN_ERROR: { code: "REV-013", message: "AI inference returned an error", status: 502 },

	// Internal
	INTERNAL_ERROR: { code: "REV-014", message: "An unexpected error occurred", status: 500 },
	DB_ERROR: { code: "REV-015", message: "Database operation failed", status: 500 },
} as const;

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
				message: detail ? `${def.message}: ${detail}` : def.message,
			},
		},
		status: def.status,
	};
}
