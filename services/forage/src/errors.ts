/**
 * Forage Error System
 *
 * Structured error codes for the Forage AI job service.
 * Follows the Grove error system pattern (GroveErrorDef shape) but lives
 * in-worker since Forage is a standalone Cloudflare Worker.
 *
 * Format: FORAGE-NNN
 * Ranges:
 *   001-019  Infrastructure & configuration errors
 *   020-039  Auth & routing errors
 *   040-059  Validation & business logic errors
 *   060-079  Rate limiting & security errors
 *   080-099  Internal & catch-all errors
 */

// =============================================================================
// TYPE (imported from @autumnsgrove/lattice/errors)
// =============================================================================

import type { GroveErrorDef } from "@autumnsgrove/lattice/errors";

/** Forage error definition — same shape as the engine's GroveErrorDef. */
export type ForageErrorDef = GroveErrorDef;

// =============================================================================
// ERROR CATALOG
// =============================================================================

export const FORAGE_ERRORS = {
	// ─────────────────────────────────────────────────────────────────────────
	// Infrastructure & Configuration Errors (001-019)
	// ─────────────────────────────────────────────────────────────────────────

	API_KEY_NOT_CONFIGURED: {
		code: "FORAGE-001",
		category: "admin" as const,
		userMessage: "Service is not fully configured.",
		adminMessage: "Provider API key not configured.",
	},

	PROVIDER_ERROR: {
		code: "FORAGE-002",
		category: "bug" as const,
		userMessage: "AI service encountered an error. Please try again.",
		adminMessage: "Upstream provider returned an error.",
	},

	PRICING_FETCH_FAILED: {
		code: "FORAGE-003",
		category: "bug" as const,
		userMessage: "Couldn't retrieve pricing information.",
		adminMessage: "Failed to fetch pricing from upstream.",
	},

	// ─────────────────────────────────────────────────────────────────────────
	// Auth & Routing Errors (020-039)
	// ─────────────────────────────────────────────────────────────────────────

	METHOD_NOT_ALLOWED: {
		code: "FORAGE-020",
		category: "user" as const,
		userMessage: "That action isn't available.",
		adminMessage: "HTTP method not allowed for this endpoint.",
	},

	UNKNOWN_ACTION: {
		code: "FORAGE-021",
		category: "user" as const,
		userMessage: "Unknown request.",
		adminMessage: "Unrecognized action parameter in request.",
	},

	// ─────────────────────────────────────────────────────────────────────────
	// Validation & Business Logic Errors (040-059)
	// ─────────────────────────────────────────────────────────────────────────

	MISSING_REQUIRED_FIELDS: {
		code: "FORAGE-040",
		category: "user" as const,
		userMessage: "Missing required information.",
		adminMessage: "Required field missing from request body.",
	},

	MISSING_JOB_ID: {
		code: "FORAGE-041",
		category: "user" as const,
		userMessage: "Missing job identifier.",
		adminMessage: "Missing job_id parameter.",
	},

	MISSING_VIBE_TEXT: {
		code: "FORAGE-042",
		category: "user" as const,
		userMessage: "Please provide some text to work with.",
		adminMessage: "Missing vibe_text parameter.",
	},

	VIBE_TEXT_TOO_SHORT: {
		code: "FORAGE-043",
		category: "user" as const,
		userMessage: "Please provide a bit more detail.",
		adminMessage: "vibe_text must be at least 5 words.",
	},

	MISSING_QUIZ_RESPONSES: {
		code: "FORAGE-044",
		category: "user" as const,
		userMessage: "Quiz responses are required.",
		adminMessage: "Missing quiz_responses in request body.",
	},

	JOB_IDS_REQUIRED: {
		code: "FORAGE-045",
		category: "user" as const,
		userMessage: "Please specify which jobs.",
		adminMessage: "job_ids array is required.",
	},

	JOB_NOT_FOUND: {
		code: "FORAGE-046",
		category: "user" as const,
		userMessage: "Couldn't find that job.",
		adminMessage: "No job found for the given ID.",
	},

	JOB_ALREADY_EXISTS: {
		code: "FORAGE-047",
		category: "user" as const,
		userMessage: "This job already exists.",
		adminMessage: "Job with this ID already exists.",
	},

	JOB_NOT_AWAITING_FOLLOWUP: {
		code: "FORAGE-048",
		category: "user" as const,
		userMessage: "This job isn't ready for follow-up.",
		adminMessage: "Job not in awaiting_followup state.",
	},

	JOB_NOT_RUNNING: {
		code: "FORAGE-049",
		category: "user" as const,
		userMessage: "This job isn't currently running.",
		adminMessage: "Job is not in running state.",
	},

	NO_FOLLOWUP_QUIZ: {
		code: "FORAGE-050",
		category: "user" as const,
		userMessage: "No follow-up quiz available.",
		adminMessage: "No follow-up quiz available for this job.",
	},

	UNKNOWN_PROVIDER: {
		code: "FORAGE-051",
		category: "bug" as const,
		userMessage: "AI service configuration error.",
		adminMessage: "Unknown provider name.",
	},

	// ─────────────────────────────────────────────────────────────────────────
	// Internal & Catch-all Errors (080-099)
	// ─────────────────────────────────────────────────────────────────────────

	PARSE_FAILED: {
		code: "FORAGE-080",
		category: "bug" as const,
		userMessage: "Something went wrong processing your request.",
		adminMessage: "Failed to parse response data.",
	},

	LIST_JOBS_FAILED: {
		code: "FORAGE-081",
		category: "bug" as const,
		userMessage: "Couldn't retrieve jobs.",
		adminMessage: "Failed to list jobs from storage.",
	},

	REFRESH_FAILED: {
		code: "FORAGE-082",
		category: "bug" as const,
		userMessage: "Couldn't refresh job data.",
		adminMessage: "Failed to refresh jobs.",
	},

	ZEPHYR_SEND_FAILED: {
		code: "FORAGE-083",
		category: "bug" as const,
		userMessage: "Couldn't send the notification.",
		adminMessage: "Zephyr email send failed.",
	},

	TEMPLATE_RENDER_FAILED: {
		code: "FORAGE-084",
		category: "bug" as const,
		userMessage: "Something went wrong preparing content.",
		adminMessage: "Template rendering failed.",
	},

	INTERNAL_ERROR: {
		code: "FORAGE-099",
		category: "bug" as const,
		userMessage: "An unexpected error occurred.",
		adminMessage: "Unhandled error in Forage service.",
	},
} as const satisfies Record<string, ForageErrorDef>;

export type ForageErrorKey = keyof typeof FORAGE_ERRORS;

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Log a Forage error with structured context.
 * Mirrors logGroveError() from the engine.
 */
export function logForageError(
	error: ForageErrorDef,
	context: {
		path?: string;
		detail?: string;
		cause?: unknown;
		[key: string]: unknown;
	} = {},
): void {
	const { cause, ...rest } = context;
	const causeMessage = cause instanceof Error ? cause.message : cause ? String(cause) : undefined;

	console.error(
		`[Forage] ${error.code}: ${error.adminMessage}`,
		JSON.stringify({
			code: error.code,
			category: error.category,
			...rest,
			...(causeMessage ? { cause: causeMessage } : {}),
		}),
	);
}

/**
 * Build a JSON error body for Forage responses.
 */
export function buildForageErrorResponse(error: ForageErrorDef): {
	errorCode: string;
	errorMessage: string;
} {
	return {
		errorCode: error.code,
		errorMessage: error.userMessage,
	};
}
