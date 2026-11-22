/**
 * Petal — Signpost Error Catalog
 *
 * Every error has a structured code, a category (who can fix it),
 * a user-safe message, and a detailed admin message for logs.
 *
 * Prefix: PETAL
 * Ranges:
 *   001-019  CSAM / NCMEC critical path (legal compliance)
 *   020-039  Provider / infrastructure errors
 *   040-059  Logging / query failures (operational)
 *   060-079  Parse / classification warnings
 *
 * @module @autumnsgrove/lattice/server/petal
 */

import type { GroveErrorDef } from "@autumnsgrove/grove-errors";

export const PETAL_ERRORS = {
	// ─── CSAM / NCMEC Critical Path (001-019) ────────────────────────

	NCMEC_REPORT_REQUIRED: {
		code: "PETAL-001",
		category: "bug" as const,
		userMessage: "Something went wrong. Please try again.",
		adminMessage:
			"NCMEC report required — CSAM detected. Must report within 24 hours per 18 U.S.C. § 2258A.",
	},
	NCMEC_QUEUE_FAILED: {
		code: "PETAL-002",
		category: "bug" as const,
		userMessage: "Something went wrong. Please try again.",
		adminMessage:
			"Failed to queue NCMEC report in database. Report may be lost — immediate investigation required.",
	},
	CSAM_FLAG_FAILED: {
		code: "PETAL-003",
		category: "bug" as const,
		userMessage: "Something went wrong. Please try again.",
		adminMessage:
			"Failed to persist CSAM account flag in database. Upload is blocked but flag not persisted.",
	},
	CSAM_FLAG_LOG_FAILED: {
		code: "PETAL-004",
		category: "bug" as const,
		userMessage: "Something went wrong. Please try again.",
		adminMessage:
			"Failed to log CSAM flagging security event. Account is flagged but audit trail incomplete.",
	},
	CSAM_FLAG_CHECK_FAILED: {
		code: "PETAL-005",
		category: "bug" as const,
		userMessage: "Something went wrong. Please try again.",
		adminMessage:
			"Failed to check CSAM flag status for user. Failing open — user may not be blocked.",
	},

	// ─── Provider / Infrastructure (020-039) ─────────────────────────

	PHOTODNA_FALLBACK: {
		code: "PETAL-020",
		category: "admin" as const,
		userMessage: "Processing your image...",
		adminMessage: "PhotoDNA scan failed, falling back to vision model classification.",
	},
	PHOTODNA_API_ERROR: {
		code: "PETAL-021",
		category: "admin" as const,
		userMessage: "Image processing is temporarily unavailable.",
		adminMessage: "PhotoDNA API returned non-OK response.",
	},
	PHOTODNA_UNEXPECTED: {
		code: "PETAL-022",
		category: "bug" as const,
		userMessage: "Image processing is temporarily unavailable.",
		adminMessage: "PhotoDNA client threw an unexpected error.",
	},
	WORKERS_AI_ERROR: {
		code: "PETAL-023",
		category: "admin" as const,
		userMessage: "Image processing is temporarily unavailable.",
		adminMessage: "Workers AI vision model call failed.",
	},
	OPENROUTER_API_ERROR: {
		code: "PETAL-027",
		category: "admin" as const,
		userMessage: "Image processing is temporarily unavailable.",
		adminMessage: "OpenRouter API returned non-OK response.",
	},
	OPENROUTER_UNEXPECTED: {
		code: "PETAL-028",
		category: "bug" as const,
		userMessage: "Image processing is temporarily unavailable.",
		adminMessage: "OpenRouter client threw an unexpected error.",
	},
	SCAN_UNEXPECTED_ERROR: {
		code: "PETAL-026",
		category: "bug" as const,
		userMessage: "We're experiencing technical difficulties. Please try again.",
		adminMessage:
			"Unexpected error during Petal image scan. Not a PetalError — possible infrastructure issue.",
	},

	// ─── Logging / Query Failures (040-059) ──────────────────────────

	LOG_SECURITY_EVENT_FAILED: {
		code: "PETAL-040",
		category: "bug" as const,
		userMessage: "Something went wrong. Please try again.",
		adminMessage: "Failed to insert security event into petal_security_log.",
	},
	QUERY_USER_EVENTS_FAILED: {
		code: "PETAL-041",
		category: "bug" as const,
		userMessage: "Something went wrong. Please try again.",
		adminMessage: "Failed to query recent user security events.",
	},
	QUERY_BLOCK_COUNT_FAILED: {
		code: "PETAL-042",
		category: "bug" as const,
		userMessage: "Something went wrong. Please try again.",
		adminMessage: "Failed to query user block count.",
	},
	QUERY_BLOCKS_BY_CATEGORY_FAILED: {
		code: "PETAL-043",
		category: "bug" as const,
		userMessage: "Something went wrong. Please try again.",
		adminMessage: "Failed to query recent blocks by category.",
	},
	LOG_CLEANUP_FAILED: {
		code: "PETAL-044",
		category: "bug" as const,
		userMessage: "Something went wrong. Please try again.",
		adminMessage: "Failed to cleanup old security logs.",
	},

	// ─── Parse / Classification Warnings (060-079) ───────────────────

	CLASSIFICATION_PARSE_FAILED: {
		code: "PETAL-060",
		category: "bug" as const,
		userMessage: "Something went wrong. Please try again.",
		adminMessage:
			"Failed to parse classification JSON from vision model response. Defaulting to allow.",
	},
	SANITY_PARSE_FAILED: {
		code: "PETAL-061",
		category: "bug" as const,
		userMessage: "Something went wrong. Please try again.",
		adminMessage: "Failed to parse sanity check JSON from vision model response. Using defaults.",
	},
	LUMEN_CLASSIFY_PARSE_FAILED: {
		code: "PETAL-062",
		category: "bug" as const,
		userMessage: "Something went wrong. Please try again.",
		adminMessage: "Failed to parse Lumen classification response. Defaulting to allow.",
	},
	OUTPUT_REJECTED: {
		code: "PETAL-063",
		category: "bug" as const,
		userMessage: "Something went wrong. Please try again.",
		adminMessage: "Layer 4 rejected AI-generated output without retry opportunity.",
	},
} satisfies Record<string, GroveErrorDef>;

export type PetalErrorKey = keyof typeof PETAL_ERRORS;
