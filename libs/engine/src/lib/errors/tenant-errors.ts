/**
 * Engine Tenant Error Catalog
 *
 * Structured error codes for tenant lifecycle operations — creation and the
 * steps inside it. These used to be ad-hoc `PLANT-05x` object literals inline
 * in the caller; they live here now that the operation does.
 *
 * Format: GROVE-TENANT-XXX
 * Ranges:
 *   001-019  Signup identity checks
 *   020-059  Creation steps (one code per step, so a log line names the step
 *            that failed without needing the message)
 *   060-099  Reserved
 */

import type { GroveErrorDef } from "@autumnsgrove/grove-errors";

export const TENANT_ERRORS = {
	// ─────────────────────────────────────────────────────────────────────────
	// Signup identity (001-019)
	// ─────────────────────────────────────────────────────────────────────────

	SIGNUP_BLOCK_CHECK_FAILED: {
		code: "GROVE-TENANT-001",
		category: "admin" as const,
		userMessage: "We couldn't finish checking your account details.",
		adminMessage:
			"signup_blocks could not be read during tenant creation; the signup was allowed. The deny list is not protecting anyone — check the table and the binding.",
	},

	// ─────────────────────────────────────────────────────────────────────────
	// Creation steps (020-059)
	// ─────────────────────────────────────────────────────────────────────────

	INSERT_FAILED: {
		code: "GROVE-TENANT-020",
		category: "bug" as const,
		userMessage: "Something went wrong creating your account. Please try again.",
		adminMessage:
			"Step 1 FAILED — INSERT into tenants. Possible constraint violation or schema mismatch.",
	},

	BILLING_INSERT_FAILED: {
		code: "GROVE-TENANT-021",
		category: "bug" as const,
		userMessage: "Something went wrong setting up your account. Please try again.",
		adminMessage:
			"Step 2 FAILED — INSERT into platform_billing. Possible constraint violation or missing column.",
	},

	SETTINGS_INSERT_FAILED: {
		code: "GROVE-TENANT-022",
		category: "bug" as const,
		userMessage: "Something went wrong configuring your site. Please try again.",
		adminMessage:
			"Step 3 FAILED — INSERT into site_settings. Possible schema mismatch or missing table.",
	},

	ONBOARDING_LINK_FAILED: {
		code: "GROVE-TENANT-023",
		category: "bug" as const,
		userMessage: "Something went wrong finishing your signup. Please try again.",
		adminMessage: "Step 4 FAILED — UPDATE user_onboarding to link tenant_id.",
	},

	USER_SYNC_FAILED: {
		code: "GROVE-TENANT-024",
		category: "bug" as const,
		userMessage: "Something went wrong syncing your account. Please try again.",
		adminMessage: "Step 4b FAILED — SELECT groveauth_id or UPSERT into users.",
	},

	HOME_PAGE_FAILED: {
		code: "GROVE-TENANT-025",
		category: "bug" as const,
		userMessage: "Something went wrong creating your home page. Please try again.",
		adminMessage: "Step 5 FAILED — INSERT into pages (slug: home).",
	},

	ABOUT_PAGE_FAILED: {
		code: "GROVE-TENANT-026",
		category: "bug" as const,
		userMessage: "Something went wrong creating your about page. Please try again.",
		adminMessage: "Step 6 FAILED — INSERT into pages (slug: about).",
	},
} as const satisfies Record<string, GroveErrorDef>;

export type TenantErrorKey = keyof typeof TENANT_ERRORS;
