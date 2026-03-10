/**
 * Durable Objects Error System
 *
 * Structured error codes for Durable Object operations across all 7 objects:
 * ExportDO, PostContentDO, PostMetaDO, TenantDO, ThresholdDO, TriageDO, SentinelDO.
 * Follows the Grove error system pattern (GroveErrorDef shape) but lives
 * in-worker since Durable Objects are embedded in the engine worker.
 *
 * Format: DO-NNN
 * Ranges:
 *   040-059  Validation / Business Logic errors
 *   080-099  Internal / catch-all errors
 */

// =============================================================================
// TYPE (imported from @autumnsgrove/lattice/errors)
// =============================================================================

import type { GroveErrorDef } from "@autumnsgrove/lattice/errors";

/** Durable Objects error definition — same shape as the engine's GroveErrorDef. */
export type DoErrorDef = GroveErrorDef;

// =============================================================================
// ERROR CATALOG
// =============================================================================

export const DO_ERRORS = {
	// ─────────────────────────────────────────────────────────────────────────
	// Validation / Business Logic Errors (040-059)
	// ─────────────────────────────────────────────────────────────────────────

	CONTENT_NOT_FOUND: {
		code: "DO-040",
		category: "user" as const,
		userMessage: "Content not found.",
		adminMessage: "No content found in storage for the given key.",
	},

	INVALID_PAYLOAD: {
		code: "DO-041",
		category: "user" as const,
		userMessage: "Invalid request data.",
		adminMessage: "Failed to parse JSON payload.",
	},

	INVALID_DIGEST_TIMES: {
		code: "DO-042",
		category: "user" as const,
		userMessage: "Invalid digest schedule format.",
		adminMessage: "Failed to parse digest_times from settings.",
	},

	// ─────────────────────────────────────────────────────────────────────────
	// Internal Errors (080-099)
	// ─────────────────────────────────────────────────────────────────────────

	STORAGE_READ_FAILED: {
		code: "DO-080",
		category: "bug" as const,
		userMessage: "Couldn't retrieve the data.",
		adminMessage: "Failed to read from R2 or D1 storage.",
	},

	EXPORT_PROCESSING_FAILED: {
		code: "DO-081",
		category: "bug" as const,
		userMessage: "Export processing encountered an error.",
		adminMessage: "Error during export job processing.",
	},

	CLASSIFICATION_FAILED: {
		code: "DO-082",
		category: "bug" as const,
		userMessage: "Couldn't process the content.",
		adminMessage: "AI classification call failed.",
	},

	INTERNAL_ERROR: {
		code: "DO-099",
		category: "bug" as const,
		userMessage: "An unexpected error occurred.",
		adminMessage: "Unhandled error in Durable Object.",
	},
} as const satisfies Record<string, DoErrorDef>;

export type DoErrorKey = keyof typeof DO_ERRORS;

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Log a Durable Objects error with structured context.
 * Mirrors logGroveError() from the engine.
 */
export function logDoError(
	error: DoErrorDef,
	context: {
		detail?: string;
		cause?: unknown;
		[key: string]: unknown;
	} = {},
): void {
	const { cause, ...rest } = context;
	const causeMessage = cause instanceof Error ? cause.message : cause ? String(cause) : undefined;

	console.error(
		`[DurableObjects] ${error.code}: ${error.adminMessage}`,
		JSON.stringify({
			code: error.code,
			category: error.category,
			...rest,
			...(causeMessage ? { cause: causeMessage } : {}),
		}),
	);
}
