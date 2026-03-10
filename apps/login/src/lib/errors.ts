/**
 * Login Error System
 *
 * Structured error codes for the Login app authentication service.
 * Follows the Grove error system pattern (GroveErrorDef shape).
 *
 * Format: LOGIN-NNN
 * Ranges:
 *   001-019  Infrastructure & service errors
 *   020-039  Auth & routing errors
 *   080-099  Internal / catch-all errors
 */

// =============================================================================
// TYPE (imported from @autumnsgrove/lattice/errors)
// =============================================================================

import type { GroveErrorDef } from "@autumnsgrove/lattice/errors";

// =============================================================================
// ERROR CATALOG
// =============================================================================

export const LOGIN_ERRORS = {
	// ─────────────────────────────────────────────────────────────────────────
	// Infrastructure & Service Errors (001-019)
	// ─────────────────────────────────────────────────────────────────────────

	AUTH_SERVICE_UNAVAILABLE: {
		code: "LOGIN-001",
		category: "admin" as const,
		userMessage: "Sign-in service is temporarily unavailable.",
		adminMessage: "Auth service (Heartwood) binding is unavailable.",
	},

	REQUEST_TOO_LARGE: {
		code: "LOGIN-002",
		category: "user" as const,
		userMessage: "Request is too large.",
		adminMessage: "Request body exceeds size limit.",
	},

	// ─────────────────────────────────────────────────────────────────────────
	// Auth & Routing Errors (020-039)
	// ─────────────────────────────────────────────────────────────────────────

	INVALID_PATH: {
		code: "LOGIN-020",
		category: "user" as const,
		userMessage: "Page not found.",
		adminMessage: "Invalid path in auth request.",
	},

	NOT_FOUND: {
		code: "LOGIN-021",
		category: "user" as const,
		userMessage: "Page not found.",
		adminMessage: "Requested route does not exist.",
	},

	// ─────────────────────────────────────────────────────────────────────────
	// Internal Errors (080-099)
	// ─────────────────────────────────────────────────────────────────────────

	INTERNAL_ERROR: {
		code: "LOGIN-099",
		category: "bug" as const,
		userMessage: "An unexpected error occurred.",
		adminMessage: "Unhandled error in Login service.",
	},
} as const satisfies Record<string, GroveErrorDef>;

export type LoginErrorKey = keyof typeof LOGIN_ERRORS;
