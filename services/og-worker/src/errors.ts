/**
 * OG Worker Error System
 *
 * Structured error codes for the OG (Open Graph) image generation worker.
 * Follows the Grove error system pattern (GroveErrorDef shape) but lives
 * in-worker since OG Worker is a standalone Cloudflare Worker.
 *
 * Format: OG-NNN
 * Ranges:
 *   040-059  Validation errors
 *   060-079  Security & rate limiting errors
 *   080-099  Internal errors
 */

// =============================================================================
// TYPE (imported from @autumnsgrove/lattice/errors)
// =============================================================================

import type { GroveErrorDef } from "@autumnsgrove/lattice/errors";

// =============================================================================
// ERROR CATALOG
// =============================================================================

export const OG_ERRORS = {
	// ─────────────────────────────────────────────────────────────────────────
	// Validation Errors (040-059)
	// ─────────────────────────────────────────────────────────────────────────

	MISSING_URL: {
		code: "OG-040",
		category: "user" as const,
		userMessage: "Please provide a URL.",
		adminMessage: "Missing url parameter in request.",
	},

	INVALID_URL: {
		code: "OG-041",
		category: "user" as const,
		userMessage: "That URL doesn't look right.",
		adminMessage: "URL format validation failed.",
	},

	NOT_HTML: {
		code: "OG-042",
		category: "user" as const,
		userMessage: "The URL doesn't point to a web page.",
		adminMessage: "Response content-type is not HTML.",
	},

	// ─────────────────────────────────────────────────────────────────────────
	// Security & Rate Limiting Errors (060-079)
	// ─────────────────────────────────────────────────────────────────────────

	URL_BLOCKED: {
		code: "OG-060",
		category: "user" as const,
		userMessage: "This URL can't be accessed.",
		adminMessage: "URL is blocked for security reasons.",
	},

	RATE_LIMITED: {
		code: "OG-061",
		category: "user" as const,
		userMessage: "Too many requests. Please wait.",
		adminMessage: "Rate limit exceeded.",
	},

	// ─────────────────────────────────────────────────────────────────────────
	// Internal Errors (080-099)
	// ─────────────────────────────────────────────────────────────────────────

	REQUEST_TIMEOUT: {
		code: "OG-080",
		category: "bug" as const,
		userMessage: "The request took too long.",
		adminMessage: "Request timed out while fetching URL.",
	},

	FETCH_FAILED: {
		code: "OG-081",
		category: "bug" as const,
		userMessage: "Couldn't retrieve the page.",
		adminMessage: "Failed to fetch the URL.",
	},

	READ_FAILED: {
		code: "OG-082",
		category: "bug" as const,
		userMessage: "Couldn't read the page content.",
		adminMessage: "Failed to read response body.",
	},

	FONT_LOAD_FAILED: {
		code: "OG-083",
		category: "bug" as const,
		userMessage: "Image generation encountered an issue.",
		adminMessage: "All font sources failed to load.",
	},

	INTERNAL_ERROR: {
		code: "OG-099",
		category: "bug" as const,
		userMessage: "An unexpected error occurred.",
		adminMessage: "Unhandled error in OG worker.",
	},
} as const satisfies Record<string, GroveErrorDef>;

export type OgErrorKey = keyof typeof OG_ERRORS;
