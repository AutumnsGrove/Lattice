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

	EMAIL_CODE_SEND_FAILED: {
		code: "LOGIN-022",
		category: "admin" as const,
		userMessage: "We couldn't send your sign-in code. Please try again in a moment.",
		adminMessage: "Heartwood rejected or failed a send-verification-otp request.",
	},

	EMAIL_CODE_VERIFY_UNAVAILABLE: {
		code: "LOGIN-023",
		category: "admin" as const,
		userMessage: "We couldn't sign you in. Please try again.",
		adminMessage: "Heartwood could not be reached to verify a sign-in code.",
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
