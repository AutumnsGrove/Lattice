/**
 * Amber SDK — Signpost Error Catalog
 *
 * Every error has a structured code, a category (who can fix it),
 * a user-safe message, and a detailed admin message for logs.
 *
 * Prefix: AMB
 * Ranges:
 *   001-019  Infrastructure (database, storage, service bindings)
 *   040-059  Business logic (validation, quota, exports)
 *   080-099  Internal errors (orphans, sync failures)
 *
 * @module @autumnsgrove/lattice/amber
 */

import type { GroveErrorDef } from "../errors/types.js";

export const AMB_ERRORS = {
	// ─── Infrastructure (001-019) ─────────────────────────────────

	DB_NOT_AVAILABLE: {
		code: "AMB-001",
		category: "admin" as const,
		userMessage: "Storage service is temporarily unavailable.",
		adminMessage: "Amber D1 database binding not available.",
	},
	STORAGE_NOT_AVAILABLE: {
		code: "AMB-002",
		category: "admin" as const,
		userMessage: "Storage service is temporarily unavailable.",
		adminMessage: "Amber R2 bucket binding not available.",
	},
	EXPORT_SERVICE_UNAVAILABLE: {
		code: "AMB-003",
		category: "admin" as const,
		userMessage: "Export service is temporarily unavailable.",
		adminMessage: "ExportJobV2 Durable Object binding not available.",
	},

	// ─── Business Logic (040-059) ─────────────────────────────────

	INVALID_UPLOAD: {
		code: "AMB-040",
		category: "user" as const,
		userMessage: "This file can't be uploaded. Please check the file type and size.",
		adminMessage: "Upload validation failed. Check filename, contentType, product.",
	},
	QUOTA_EXCEEDED: {
		code: "AMB-041",
		category: "user" as const,
		userMessage: "You've reached your storage limit. Consider upgrading or removing unused files.",
		adminMessage: "Upload would exceed user's storage quota.",
	},
	UPLOAD_FAILED: {
		code: "AMB-042",
		category: "bug" as const,
		userMessage: "Upload failed. Please try again.",
		adminMessage: "R2 put operation failed for file upload.",
	},
	FILE_NOT_FOUND: {
		code: "AMB-043",
		category: "user" as const,
		userMessage: "This file doesn't exist or has been deleted.",
		adminMessage: "File ID not found in storage_files table.",
	},
	EXPORT_NOT_READY: {
		code: "AMB-044",
		category: "user" as const,
		userMessage: "Your export isn't ready yet. Please wait a moment.",
		adminMessage: "Export download requested but status is not 'completed'.",
	},
	EXPORT_EXPIRED: {
		code: "AMB-045",
		category: "user" as const,
		userMessage: "This export has expired. Please create a new one.",
		adminMessage: "Export download link expired. R2 object may have been cleaned up.",
	},
	EXPORT_FAILED: {
		code: "AMB-046",
		category: "bug" as const,
		userMessage: "Your export failed. Please try again.",
		adminMessage: "ExportJobV2 processing failed. Check DO logs.",
	},
	EXPORT_NOT_FOUND: {
		code: "AMB-047",
		category: "user" as const,
		userMessage: "This export doesn't exist.",
		adminMessage: "Export ID not found in storage_exports table.",
	},
	FILE_ALREADY_TRASHED: {
		code: "AMB-048",
		category: "user" as const,
		userMessage: "This file is already in the trash.",
		adminMessage: "Trash operation attempted on already-deleted file.",
	},
	FILE_NOT_TRASHED: {
		code: "AMB-049",
		category: "user" as const,
		userMessage: "This file isn't in the trash.",
		adminMessage: "Restore operation attempted on non-deleted file.",
	},
	DOWNLOAD_FAILED: {
		code: "AMB-050",
		category: "bug" as const,
		userMessage: "Download failed. Please try again.",
		adminMessage: "R2 get operation failed or returned null for existing file.",
	},
	USER_STORAGE_NOT_FOUND: {
		code: "AMB-051",
		category: "admin" as const,
		userMessage: "Storage service is temporarily unavailable.",
		adminMessage: "No user_storage record found for user. May need initialization.",
	},

	// ─── Internal (080-099) ───────────────────────────────────────

	ORPHAN_CLEANUP_FAILED: {
		code: "AMB-080",
		category: "bug" as const,
		userMessage: "Something went wrong. Please try again.",
		adminMessage: "D1 insert failed after R2 upload. Orphan cleanup attempted.",
	},
	QUOTA_SYNC_ERROR: {
		code: "AMB-081",
		category: "bug" as const,
		userMessage: "Something went wrong updating your storage usage.",
		adminMessage: "Quota tracking update failed. Usage may be out of sync.",
	},
} satisfies Record<string, GroveErrorDef>;

export type AmberErrorKey = keyof typeof AMB_ERRORS;
