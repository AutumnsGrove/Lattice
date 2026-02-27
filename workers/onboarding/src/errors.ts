/**
 * OnboardingAgent — Error Catalog
 *
 * Structured error codes for the onboarding email agent.
 * Uses the shared GroveErrorDef pattern from Signpost.
 *
 * Format: ONBOARDING-XXX
 * Ranges:
 *   001-009  Validation (input)
 *   010-019  Delivery (email sending)
 *   020-029  State (idempotency, unsubscribe)
 */

import type { GroveErrorDef } from "@autumnsgrove/lattice/errors";

export const ONBOARDING_ERRORS = {
	// ─────────────────────────────────────────────────────────────────────────
	// Validation (001-009)
	// ─────────────────────────────────────────────────────────────────────────

	INVALID_EMAIL: {
		code: "ONBOARDING-001",
		category: "user" as const,
		userMessage: "Please enter a valid email address.",
		adminMessage: "startSequence() received an invalid or missing email.",
	},

	INVALID_AUDIENCE: {
		code: "ONBOARDING-002",
		category: "user" as const,
		userMessage: "Something went wrong. Please try again.",
		adminMessage: "startSequence() received an unrecognized audience type.",
	},

	// ─────────────────────────────────────────────────────────────────────────
	// Delivery (010-019)
	// ─────────────────────────────────────────────────────────────────────────

	EMAIL_SEND_FAILED: {
		code: "ONBOARDING-010",
		category: "bug" as const,
		userMessage: "We couldn't send your email. We'll try again shortly.",
		adminMessage: "Zephyr send call failed during scheduled email delivery.",
	},

	// ─────────────────────────────────────────────────────────────────────────
	// State (020-029)
	// ─────────────────────────────────────────────────────────────────────────

	SEQUENCE_ALREADY_STARTED: {
		code: "ONBOARDING-020",
		category: "user" as const,
		userMessage: "You're already signed up!",
		adminMessage:
			"startSequence() called but this agent already has an active sequence. Idempotent no-op.",
	},

	ALREADY_UNSUBSCRIBED: {
		code: "ONBOARDING-021",
		category: "user" as const,
		userMessage: "You've already unsubscribed from these emails.",
		adminMessage: "unsubscribe() called but agent is already in unsubscribed state.",
	},
} as const satisfies Record<string, GroveErrorDef>;

export type OnboardingErrorKey = keyof typeof ONBOARDING_ERRORS;
