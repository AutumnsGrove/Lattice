/**
 * Ivy Error System
 *
 * Structured error codes for the Ivy webhook filtering and digest service.
 * Follows the Grove error system pattern (GroveErrorDef shape).
 *
 * Format: IVY-NNN
 * Ranges:
 *   001-019  Infrastructure & configuration errors
 *   020-039  Authentication errors
 *   040-059  Validation errors
 *   060-079  Security & rate limiting errors
 *   080-099  Internal & database errors
 */

// =============================================================================
// TYPE (imported from @autumnsgrove/lattice/errors)
// =============================================================================

import type { GroveErrorDef } from "@autumnsgrove/lattice/errors";

// =============================================================================
// ERROR CATALOG
// =============================================================================

export const IVY_ERRORS = {
	// ─────────────────────────────────────────────────────────────────────────
	// Infrastructure & Configuration Errors (001-019)
	// ─────────────────────────────────────────────────────────────────────────

	DB_UNAVAILABLE: {
		code: "IVY-001",
		category: "bug" as const,
		userMessage: "Service temporarily unavailable.",
		adminMessage: "D1 database binding not available.",
	},

	CONFIG_ERROR: {
		code: "IVY-002",
		category: "admin" as const,
		userMessage: "Server configuration error.",
		adminMessage: "Required environment binding is missing.",
	},

	// ─────────────────────────────────────────────────────────────────────────
	// Authentication Errors (020-039)
	// ─────────────────────────────────────────────────────────────────────────

	UNAUTHORIZED: {
		code: "IVY-020",
		category: "user" as const,
		userMessage: "Please sign in to continue.",
		adminMessage: "Request missing valid authentication.",
	},

	// ─────────────────────────────────────────────────────────────────────────
	// Validation Errors (040-059)
	// ─────────────────────────────────────────────────────────────────────────

	MISSING_REQUIRED_FIELDS: {
		code: "IVY-040",
		category: "user" as const,
		userMessage: "Some required information is missing.",
		adminMessage: "Required fields missing from request body.",
	},

	INVALID_FILTER_TYPE: {
		code: "IVY-041",
		category: "user" as const,
		userMessage: "Invalid filter type.",
		adminMessage: "Filter type must be 'blocklist' or 'allowlist'.",
	},

	INVALID_MATCH_TYPE: {
		code: "IVY-042",
		category: "user" as const,
		userMessage: "Invalid match type.",
		adminMessage: "Match type must be 'exact', 'domain', or 'contains'.",
	},

	NO_FIELDS_TO_UPDATE: {
		code: "IVY-043",
		category: "user" as const,
		userMessage: "No changes to save.",
		adminMessage: "No fields provided for update.",
	},

	INVALID_DIGEST_TIMES: {
		code: "IVY-044",
		category: "user" as const,
		userMessage: "Invalid digest schedule.",
		adminMessage: "digest_times must be an array.",
	},

	INVALID_JSON: {
		code: "IVY-045",
		category: "user" as const,
		userMessage: "The request format is invalid.",
		adminMessage: "Request body is not valid JSON.",
	},

	MISSING_RECIPIENTS: {
		code: "IVY-046",
		category: "user" as const,
		userMessage: "No recipients specified.",
		adminMessage: "Missing recipients in webhook payload.",
	},

	NO_GROVE_RECIPIENT: {
		code: "IVY-047",
		category: "user" as const,
		userMessage: "No valid recipient found.",
		adminMessage: "No grove.place recipient in payload.",
	},

	INVALID_RECIPIENT_FORMAT: {
		code: "IVY-048",
		category: "user" as const,
		userMessage: "Recipient format is invalid.",
		adminMessage: "Recipient address format validation failed.",
	},

	EMAIL_NOT_FOUND: {
		code: "IVY-049",
		category: "user" as const,
		userMessage: "Email not found.",
		adminMessage: "No email found for the given ID.",
	},

	FILTER_NOT_FOUND: {
		code: "IVY-050",
		category: "user" as const,
		userMessage: "Filter not found.",
		adminMessage: "No filter found for the given ID.",
	},

	NOT_IMPLEMENTED: {
		code: "IVY-051",
		category: "bug" as const,
		userMessage: "This feature isn't available yet.",
		adminMessage: "Endpoint not yet implemented.",
	},

	// ─────────────────────────────────────────────────────────────────────────
	// Security & Rate Limiting Errors (060-079)
	// ─────────────────────────────────────────────────────────────────────────

	MISSING_SIGNATURE: {
		code: "IVY-060",
		category: "user" as const,
		userMessage: "Authentication required.",
		adminMessage: "Missing webhook signature header.",
	},

	INVALID_SIGNATURE: {
		code: "IVY-061",
		category: "user" as const,
		userMessage: "Request validation failed.",
		adminMessage: "Webhook signature verification failed.",
	},

	RATE_LIMITED: {
		code: "IVY-062",
		category: "user" as const,
		userMessage: "Too many requests. Please wait.",
		adminMessage: "Rate limit exceeded for webhook endpoint.",
	},

	// ─────────────────────────────────────────────────────────────────────────
	// Internal & Database Errors (080-099)
	// ─────────────────────────────────────────────────────────────────────────

	FETCH_FAILED: {
		code: "IVY-080",
		category: "bug" as const,
		userMessage: "Couldn't retrieve the data.",
		adminMessage: "Database query failed.",
	},

	UPDATE_FAILED: {
		code: "IVY-081",
		category: "bug" as const,
		userMessage: "Couldn't save the changes.",
		adminMessage: "Database update operation failed.",
	},

	DELETE_FAILED: {
		code: "IVY-082",
		category: "bug" as const,
		userMessage: "Couldn't remove the item.",
		adminMessage: "Database delete operation failed.",
	},

	CREATE_FAILED: {
		code: "IVY-083",
		category: "bug" as const,
		userMessage: "Couldn't create the item.",
		adminMessage: "Database insert operation failed.",
	},

	DIGEST_TRIGGER_FAILED: {
		code: "IVY-084",
		category: "bug" as const,
		userMessage: "Couldn't send the digest.",
		adminMessage: "Failed to trigger digest generation.",
	},

	DIGEST_PREVIEW_FAILED: {
		code: "IVY-085",
		category: "bug" as const,
		userMessage: "Couldn't preview the digest.",
		adminMessage: "Failed to generate digest preview.",
	},

	INTERNAL_ERROR: {
		code: "IVY-099",
		category: "bug" as const,
		userMessage: "An unexpected error occurred.",
		adminMessage: "Unhandled error in Ivy service.",
	},
} as const satisfies Record<string, GroveErrorDef>;

export type IvyErrorKey = keyof typeof IVY_ERRORS;
