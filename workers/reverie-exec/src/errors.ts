/**
 * Reverie Exec Error Catalog
 *
 * Signpost-compatible error definitions for the execution worker.
 * Prefix: EXC-XXX
 */

export interface ExecErrorDef {
	code: string;
	message: string;
	status: number;
}

export const EXEC_ERRORS = {
	// Auth errors
	AUTH_REQUIRED: { code: "EXC-001", message: "Authentication required", status: 401 },
	AUTH_INVALID: { code: "EXC-002", message: "Invalid API key", status: 401 },

	// Input errors
	INVALID_REQUEST: { code: "EXC-003", message: "Invalid request body", status: 400 },
	DISALLOWED_FIELD: {
		code: "EXC-004",
		message: "One or more fields are not in the write allowlist",
		status: 403,
	},

	// Execution errors
	DISPATCH_FAILED: {
		code: "EXC-005",
		message: "Failed to dispatch changes to API",
		status: 502,
	},
	API_ERROR: {
		code: "EXC-006",
		message: "Upstream API returned an error",
		status: 502,
	},
	UNKNOWN_DOMAIN: {
		code: "EXC-007",
		message: "Domain has no configured endpoint mapping",
		status: 400,
	},

	// Rate limiting
	RATE_LIMITED: {
		code: "EXC-008",
		message: "Too many requests — please wait before trying again",
		status: 429,
	},

	// Internal
	INTERNAL_ERROR: { code: "EXC-009", message: "An unexpected error occurred", status: 500 },
	SERVICE_UNAVAILABLE: {
		code: "EXC-010",
		message: "SvelteKit app service binding unavailable",
		status: 503,
	},

	// Client errors
	NOT_FOUND: { code: "EXC-011", message: "Route not found", status: 404 },
	INVALID_CONTENT_TYPE: {
		code: "EXC-012",
		message: "Content-Type must be application/json",
		status: 415,
	},
} as const;

/**
 * Build an execution error response from an error definition.
 */
export function buildExecError(
	def: ExecErrorDef,
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
