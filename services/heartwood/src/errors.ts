/**
 * Heartwood Error System
 *
 * Structured error codes for the Heartwood authentication service.
 * Service-layer errors use the HW-SVC- prefix to distinguish from SDK errors
 * (which use HW-AUTH- prefix).
 *
 * Format: HW-SVC-NNN
 * Ranges:
 *   001-019  Infrastructure & Configuration errors
 *   040-059  Validation & Business Logic errors
 *   080-099  Internal / catch-all errors
 */

// =============================================================================
// TYPE (imported from @autumnsgrove/lattice/errors)
// =============================================================================

import type { GroveErrorDef } from "@autumnsgrove/lattice/errors";

// =============================================================================
// ERROR CATALOG
// =============================================================================

export const HW_SVC_ERRORS = {
	// ─────────────────────────────────────────────────────────────────────────
	// Infrastructure & Configuration Errors (001-019)
	// ─────────────────────────────────────────────────────────────────────────

	MISSING_DB_BINDING: {
		code: "HW-SVC-001",
		category: "admin" as const,
		userMessage: "Service is not fully configured.",
		adminMessage: "Missing DB binding (D1 groveauth database).",
	},

	MISSING_AUTH_BASE_URL: {
		code: "HW-SVC-002",
		category: "admin" as const,
		userMessage: "Service is not fully configured.",
		adminMessage: "Missing AUTH_BASE_URL env var.",
	},

	MISSING_SESSION_SECRET: {
		code: "HW-SVC-003",
		category: "admin" as const,
		userMessage: "Service is not fully configured.",
		adminMessage: "Missing SESSION_SECRET secret.",
	},

	MISSING_OAUTH_CREDENTIALS: {
		code: "HW-SVC-004",
		category: "admin" as const,
		userMessage: "Service is not fully configured.",
		adminMessage: "Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET.",
	},

	MISSING_ZEPHYR_KEY: {
		code: "HW-SVC-005",
		category: "admin" as const,
		userMessage: "Service is not fully configured.",
		adminMessage: "Missing ZEPHYR_API_KEY secret.",
	},

	// ─────────────────────────────────────────────────────────────────────────
	// Validation & Business Logic Errors (040-059)
	// ─────────────────────────────────────────────────────────────────────────

	ACCOUNT_CREATION_FAILED: {
		code: "HW-SVC-040",
		category: "bug" as const,
		userMessage:
			"We couldn't create your account right now. Please try again or visit grove.place/support.",
		adminMessage: "Account creation failed during OAuth callback.",
	},

	INVALID_AUDIT_RETENTION: {
		code: "HW-SVC-041",
		category: "user" as const,
		userMessage: "Invalid retention period.",
		adminMessage: "Audit log retention must be at least 30 days.",
	},

	LOGIN_CODE_SEND_FAILED: {
		code: "HW-SVC-042",
		category: "admin" as const,
		userMessage: "We couldn't send your sign-in code. Please try again in a moment.",
		adminMessage: "Zephyr failed to deliver a sign-in code email.",
	},

	LOGIN_CODE_RATE_LIMITED: {
		code: "HW-SVC-043",
		category: "user" as const,
		userMessage: "Too many sign-in codes were requested for this email. Please wait a few minutes.",
		adminMessage: "Zephyr per-recipient verification rate limit hit for a sign-in code.",
	},

	// ─────────────────────────────────────────────────────────────────────────
	// Internal Errors (080-099)
	// ─────────────────────────────────────────────────────────────────────────

	SESSION_BRIDGE_FAILED: {
		code: "HW-SVC-080",
		category: "bug" as const,
		userMessage: "We couldn't finish signing you in. Please try again.",
		adminMessage:
			"Better Auth session was not bridged to SessionDO — user has a valid Better Auth session but no grove_session.",
	},

	INTERNAL_ERROR: {
		code: "HW-SVC-099",
		category: "bug" as const,
		userMessage: "An unexpected error occurred.",
		adminMessage: "Unhandled error in Heartwood service.",
	},
} as const satisfies Record<string, GroveErrorDef>;

export type HwSvcErrorKey = keyof typeof HW_SVC_ERRORS;
