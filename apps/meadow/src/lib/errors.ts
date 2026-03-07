/**
 * Meadow Error Catalog
 *
 * Structured error codes for the Meadow social feed app.
 * Uses the shared GroveErrorDef type from the Grove error system.
 *
 * Format: MEADOW-XXX
 * Ranges:
 *   001-019  Service & binding errors
 *   020-039  Input validation errors
 *   040-059  Upload & media errors
 *   080-099  Internal / catch-all errors
 */

import type { GroveErrorDef } from "@autumnsgrove/lattice/errors";

export type MeadowErrorDef = GroveErrorDef;

export const MEADOW_ERRORS = {
	// ─────────────────────────────────────────────────────────────────────────
	// Input Validation Errors (020-039)
	// ─────────────────────────────────────────────────────────────────────────

	INVALID_REACTION: {
		code: "MEADOW-020",
		category: "user" as const,
		userMessage: "That reaction isn't available.",
		adminMessage: "Emoji failed isValidReaction() allowlist check.",
	},

	// ─────────────────────────────────────────────────────────────────────────
	// Upload & Media Errors (040-059)
	// ─────────────────────────────────────────────────────────────────────────

	UPLOAD_NO_URL: {
		code: "MEADOW-040",
		category: "bug" as const,
		userMessage: "Your image was uploaded but something went wrong. Please try again.",
		adminMessage: "Upload API returned success but response contained no URL.",
	},

	UPLOAD_FAILED: {
		code: "MEADOW-041",
		category: "bug" as const,
		userMessage: "Image upload failed. Please try again.",
		adminMessage: "Upload API request failed or returned an error.",
	},
} as const satisfies Record<string, MeadowErrorDef>;
