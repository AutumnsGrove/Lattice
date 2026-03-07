/**
 * Reverie Exec Error Catalog
 *
 * Signpost-compatible error definitions for the execution worker.
 * Imports GroveErrorDef from the engine and extends with HTTP status.
 * Prefix: EXC-XXX
 */

import type { GroveErrorDef } from "@autumnsgrove/lattice/errors";

/** Exec error definition — GroveErrorDef + HTTP status for response building. */
export type ExecErrorDef = GroveErrorDef & { status: number };

export const EXEC_ERRORS = {
	// Auth errors
	AUTH_REQUIRED: {
		code: "EXC-001",
		category: "user" as const,
		userMessage: "Authentication required",
		adminMessage: "Request missing or empty X-API-Key header.",
		status: 401,
	},
	AUTH_INVALID: {
		code: "EXC-002",
		category: "user" as const,
		userMessage: "Invalid API key",
		adminMessage: "API key did not match expected value (timing-safe comparison failed).",
		status: 401,
	},

	// Input errors
	INVALID_REQUEST: {
		code: "EXC-003",
		category: "user" as const,
		userMessage: "Invalid request body",
		adminMessage: "Request body failed Zod validation or is not valid JSON.",
		status: 400,
	},
	DISALLOWED_FIELD: {
		code: "EXC-004",
		category: "user" as const,
		userMessage: "One or more fields are not in the write allowlist",
		adminMessage: "Execution payload contained fields not present in the domain's write allowlist.",
		status: 403,
	},

	// Execution errors
	DISPATCH_FAILED: {
		code: "EXC-005",
		category: "bug" as const,
		userMessage: "Failed to dispatch changes to API",
		adminMessage: "Service binding fetch to SvelteKit app threw or returned non-2xx.",
		status: 502,
	},
	API_ERROR: {
		code: "EXC-006",
		category: "bug" as const,
		userMessage: "Upstream API returned an error",
		adminMessage: "SvelteKit API endpoint returned an error response during execution.",
		status: 502,
	},
	UNKNOWN_DOMAIN: {
		code: "EXC-007",
		category: "user" as const,
		userMessage: "Domain has no configured endpoint mapping",
		adminMessage: "Domain name not found in the endpoint registry.",
		status: 400,
	},

	// Rate limiting
	RATE_LIMITED: {
		code: "EXC-008",
		category: "user" as const,
		userMessage: "Too many requests — please wait before trying again",
		adminMessage: "Rate limiter rejected request. Exceeded per-minute quota.",
		status: 429,
	},

	// Internal
	INTERNAL_ERROR: {
		code: "EXC-009",
		category: "bug" as const,
		userMessage: "An unexpected error occurred",
		adminMessage: "Unhandled exception in reverie-exec worker.",
		status: 500,
	},
	SERVICE_UNAVAILABLE: {
		code: "EXC-010",
		category: "admin" as const,
		userMessage: "SvelteKit app service binding unavailable",
		adminMessage: "Service binding to the SvelteKit app is not configured or unreachable.",
		status: 503,
	},

	// Client errors
	NOT_FOUND: {
		code: "EXC-011",
		category: "user" as const,
		userMessage: "Route not found",
		adminMessage: "No matching route handler for the request path.",
		status: 404,
	},
	INVALID_CONTENT_TYPE: {
		code: "EXC-012",
		category: "user" as const,
		userMessage: "Content-Type must be application/json",
		adminMessage: "Request Content-Type header is missing or not application/json.",
		status: 415,
	},
} as const satisfies Record<string, ExecErrorDef>;

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
				message: detail ? `${def.userMessage}: ${detail}` : def.userMessage,
			},
		},
		status: def.status,
	};
}
