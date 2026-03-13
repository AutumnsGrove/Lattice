/**
 * Billing Error System
 *
 * Structured error codes for the Billing app.
 * Follows the Grove error system pattern (GroveErrorDef shape).
 *
 * Format: BILLING-NNN
 * Ranges:
 *   001-019  Infrastructure & service errors
 *   020-039  Checkout & payment errors
 *   040-059  Subscription management errors
 *   060-079  Webhook errors
 *   080-099  Internal / catch-all errors
 */

import type { GroveErrorDef } from "@autumnsgrove/lattice/errors";

export const BILLING_ERRORS = {
	// ─────────────────────────────────────────────────────────────────────────
	// Infrastructure & Service Errors (001-019)
	// ─────────────────────────────────────────────────────────────────────────

	SERVICE_UNAVAILABLE: {
		code: "BILLING-001",
		category: "admin" as const,
		userMessage: "Billing service is temporarily unavailable. Please try again in a moment.",
		adminMessage: "Billing API service binding is unavailable.",
	},

	AUTH_REQUIRED: {
		code: "BILLING-002",
		category: "user" as const,
		userMessage: "Please sign in to manage your billing.",
		adminMessage: "No valid session found for billing request.",
	},

	// ─────────────────────────────────────────────────────────────────────────
	// Checkout & Payment Errors (020-039)
	// ─────────────────────────────────────────────────────────────────────────

	INVALID_CHECKOUT_PARAMS: {
		code: "BILLING-020",
		category: "user" as const,
		userMessage: "Missing or invalid checkout parameters.",
		adminMessage: "Required checkout query parameters are missing or malformed.",
	},

	INVALID_REDIRECT: {
		code: "BILLING-021",
		category: "user" as const,
		userMessage: "Invalid redirect URL.",
		adminMessage: "Redirect URL failed *.grove.place validation.",
	},

	CHECKOUT_FAILED: {
		code: "BILLING-022",
		category: "admin" as const,
		userMessage: "Could not start checkout. Please try again.",
		adminMessage: "Billing API returned error for checkout request.",
	},

	// ─────────────────────────────────────────────────────────────────────────
	// Subscription Management Errors (040-059)
	// ─────────────────────────────────────────────────────────────────────────

	PORTAL_FAILED: {
		code: "BILLING-040",
		category: "admin" as const,
		userMessage: "Could not open the billing portal. Please try again.",
		adminMessage: "Billing API returned error for portal request.",
	},

	CANCEL_FAILED: {
		code: "BILLING-041",
		category: "admin" as const,
		userMessage: "Could not process cancellation. Please try again.",
		adminMessage: "Billing API returned error for cancel request.",
	},

	RESUME_FAILED: {
		code: "BILLING-042",
		category: "admin" as const,
		userMessage: "Could not resume subscription. Please try again.",
		adminMessage: "Billing API returned error for resume request.",
	},

	STATUS_FAILED: {
		code: "BILLING-043",
		category: "admin" as const,
		userMessage: "Could not load billing information.",
		adminMessage: "Billing API returned error for status request.",
	},

	// ─────────────────────────────────────────────────────────────────────────
	// Webhook Errors (060-079)
	// ─────────────────────────────────────────────────────────────────────────

	WEBHOOK_INVALID_SIGNATURE: {
		code: "BILLING-060",
		category: "admin" as const,
		userMessage: "Unauthorized.",
		adminMessage: "Stripe webhook signature verification failed.",
	},

	WEBHOOK_MISSING_SIGNATURE: {
		code: "BILLING-061",
		category: "admin" as const,
		userMessage: "Unauthorized.",
		adminMessage: "Missing stripe-signature header on webhook request.",
	},

	// ─────────────────────────────────────────────────────────────────────────
	// Internal Errors (080-099)
	// ─────────────────────────────────────────────────────────────────────────

	INTERNAL_ERROR: {
		code: "BILLING-099",
		category: "bug" as const,
		userMessage: "An unexpected error occurred.",
		adminMessage: "Unhandled error in Billing service.",
	},
} as const satisfies Record<string, GroveErrorDef>;

export type BillingErrorKey = keyof typeof BILLING_ERRORS;
