/**
 * Short Links Error Catalog
 *
 * Structured error codes for link.grove.place: slug and target validation,
 * link management, and the redirect worker.
 *
 * Format: GROVE-LINK-XXX
 * Ranges:
 *   001-019  Service bindings, infrastructure
 *   020-039  Auth
 *   040-059  Validation & business logic
 *   060-079  Rate limiting
 *   080-099  Internal / catch-all
 */

import type { GroveErrorDef } from "@autumnsgrove/grove-errors";

export const LINK_ERRORS = {
	// ─────────────────────────────────────────────────────────────────────────
	// Service & Infrastructure (001-019)
	// ─────────────────────────────────────────────────────────────────────────

	DB_NOT_AVAILABLE: {
		code: "GROVE-LINK-001",
		category: "bug" as const,
		userMessage: "Short links can't reach the database right now. Please try again in a moment.",
		adminMessage: "D1 database binding not available for short links.",
	},

	// ─────────────────────────────────────────────────────────────────────────
	// Auth (020-039)
	// ─────────────────────────────────────────────────────────────────────────

	UNAUTHORIZED: {
		code: "GROVE-LINK-020",
		category: "user" as const,
		userMessage: "Please sign in to manage your short links.",
		adminMessage: "Short link management attempted without an authenticated user or tenant.",
	},

	// ─────────────────────────────────────────────────────────────────────────
	// Validation & Business Logic (040-059)
	// ─────────────────────────────────────────────────────────────────────────

	SLUG_INVALID: {
		code: "GROVE-LINK-040",
		category: "user" as const,
		userMessage:
			"Short links need 3 to 32 characters: lowercase letters, numbers, and single hyphens between them.",
		adminMessage: "Slug failed length or pattern validation.",
	},

	SLUG_RESERVED: {
		code: "GROVE-LINK-041",
		category: "user" as const,
		userMessage: "That short link isn't available. Try another?",
		adminMessage: "Slug matched the domain blocklist or offensive blocklist.",
	},

	SLUG_TAKEN: {
		code: "GROVE-LINK-042",
		category: "user" as const,
		userMessage: "Someone already has that short link. Try another?",
		adminMessage: "Slug already exists in short_links (disabled links keep their slug).",
	},

	SLUG_YOURS: {
		code: "GROVE-LINK-050",
		category: "user" as const,
		userMessage: "You already have a short link with that name.",
		adminMessage: "Slug exists, active, and belongs to the same owner.",
	},

	SLUG_RETIRED: {
		code: "GROVE-LINK-051",
		category: "user" as const,
		userMessage:
			"You retired that name, and retired names stay retired so old links never point somewhere new. Try another?",
		adminMessage: "Slug exists, disabled, and belonged to the same owner.",
	},

	TARGET_INVALID: {
		code: "GROVE-LINK-043",
		category: "user" as const,
		userMessage: "That doesn't look like a link we can use. Check the address and try again.",
		adminMessage: "Target URL failed to parse, has credentials, or an explicit port.",
	},

	TARGET_NOT_HTTPS: {
		code: "GROVE-LINK-044",
		category: "user" as const,
		userMessage: "Short links only point to secure addresses that start with https://.",
		adminMessage: "Target URL scheme is not https.",
	},

	TARGET_NOT_OWN_GROVE: {
		code: "GROVE-LINK-045",
		category: "user" as const,
		userMessage: "Short links can only point to pages in your own grove.",
		adminMessage: "Target host does not match the tenant's subdomain or custom domain.",
	},

	TARGET_IS_SHORT_LINK: {
		code: "GROVE-LINK-046",
		category: "user" as const,
		userMessage: "A short link can't point to another short link.",
		adminMessage: "Target host is the short link host (loop/chain).",
	},

	TARGET_TOO_LONG: {
		code: "GROVE-LINK-047",
		category: "user" as const,
		userMessage: "That address is too long for a short link.",
		adminMessage: "Target URL exceeds SHORT_LINK_MAX_TARGET_LENGTH.",
	},

	LINK_NOT_FOUND: {
		code: "GROVE-LINK-048",
		category: "user" as const,
		userMessage: "We couldn't find that short link.",
		adminMessage: "No short_links row for this owner and slug (or it is not a custom link).",
	},

	POST_NOT_FOUND: {
		code: "GROVE-LINK-049",
		category: "user" as const,
		userMessage: "We couldn't find that bloom.",
		adminMessage: "Post does not exist or does not belong to this tenant.",
	},

	// ─────────────────────────────────────────────────────────────────────────
	// Rate Limiting (060-079)
	// ─────────────────────────────────────────────────────────────────────────

	RATE_LIMITED: {
		code: "GROVE-LINK-060",
		category: "user" as const,
		userMessage: "You're making short links quickly. Take a breath and try again soon.",
		adminMessage: "links/create Threshold limit exceeded.",
	},

	// ─────────────────────────────────────────────────────────────────────────
	// Internal (080-099)
	// ─────────────────────────────────────────────────────────────────────────

	SLUG_GENERATION_FAILED: {
		code: "GROVE-LINK-080",
		category: "bug" as const,
		userMessage: "We couldn't make a short link just now. Please try again.",
		adminMessage: "Exhausted SHORT_LINK_GENERATOR.maxAttempts without a free slug.",
	},
} as const satisfies Record<string, GroveErrorDef>;

export type LinkErrorKey = keyof typeof LINK_ERRORS;
