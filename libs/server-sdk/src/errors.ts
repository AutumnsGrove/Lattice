/**
 * Grove Server SDK — Error Catalog
 *
 * Structured error codes for all infrastructure operations.
 * Uses the shared GroveErrorDef pattern from @autumnsgrove/lattice/errors.
 *
 * Format: SRV-XXX
 * Ranges:
 *   001-019  Infrastructure & initialization
 *   020-039  Auth & sessions (reserved for future use)
 *   040-059  Business logic / operations
 *   060-079  Rate limiting (reserved for Threshold integration)
 *   080-099  Internal / catch-all
 */

import type { GroveErrorDef } from "@autumnsgrove/lattice/errors";

export const SRV_ERRORS = {
	// ─────────────────────────────────────────────────────────────────────────
	// Infrastructure & Initialization (001-019)
	// ─────────────────────────────────────────────────────────────────────────

	DB_NOT_AVAILABLE: {
		code: "SRV-001",
		category: "admin" as const,
		userMessage: "We're having trouble reaching our database. Please try again.",
		adminMessage: "Database binding not available. Check GroveContext initialization.",
	},

	STORAGE_NOT_AVAILABLE: {
		code: "SRV-002",
		category: "admin" as const,
		userMessage: "Storage service is temporarily unavailable.",
		adminMessage: "Object storage binding not available. Check R2/S3 configuration.",
	},

	KV_NOT_AVAILABLE: {
		code: "SRV-003",
		category: "admin" as const,
		userMessage: "We're having trouble reaching a required service.",
		adminMessage: "Key-value store binding not available. Check KV namespace.",
	},

	SERVICE_NOT_FOUND: {
		code: "SRV-004",
		category: "admin" as const,
		userMessage: "A required service is unavailable.",
		adminMessage: "Service binding not found. Check service name in GroveServiceBus.",
	},

	CONFIG_MISSING: {
		code: "SRV-005",
		category: "admin" as const,
		userMessage: "The service is not properly configured.",
		adminMessage: "Required configuration key missing from environment.",
	},

	CONTEXT_INIT_FAILED: {
		code: "SRV-006",
		category: "bug" as const,
		userMessage: "Something went wrong starting the service.",
		adminMessage: "GroveContext initialization failed. Check all bindings.",
	},

	// ─────────────────────────────────────────────────────────────────────────
	// Business Logic / Operations (040-059)
	// ─────────────────────────────────────────────────────────────────────────

	QUERY_FAILED: {
		code: "SRV-040",
		category: "bug" as const,
		userMessage: "We had trouble processing your request.",
		adminMessage: "Database query execution failed.",
	},

	STORAGE_UPLOAD_FAILED: {
		code: "SRV-041",
		category: "bug" as const,
		userMessage: "Upload failed. Please try again.",
		adminMessage: "Object storage put operation failed.",
	},

	STORAGE_DOWNLOAD_FAILED: {
		code: "SRV-042",
		category: "bug" as const,
		userMessage: "We couldn't retrieve the requested file.",
		adminMessage: "Object storage get operation failed.",
	},

	KV_OPERATION_FAILED: {
		code: "SRV-043",
		category: "bug" as const,
		userMessage: "We had trouble processing your request.",
		adminMessage: "Key-value store operation failed.",
	},

	SERVICE_CALL_FAILED: {
		code: "SRV-044",
		category: "bug" as const,
		userMessage: "A required service didn't respond.",
		adminMessage: "Inter-service call failed. Check target service health.",
	},

	TRANSACTIONS_NOT_SUPPORTED: {
		code: "SRV-045",
		category: "admin" as const,
		userMessage: "This operation is not supported.",
		adminMessage:
			"Interactive transactions not supported by this database adapter. Use batch() or Loom DOs.",
	},

	PRESIGNED_URL_FAILED: {
		code: "SRV-046",
		category: "bug" as const,
		userMessage: "We couldn't generate an upload link.",
		adminMessage: "Presigned URL generation failed. Check storage adapter configuration.",
	},

	// ─────────────────────────────────────────────────────────────────────────
	// Internal / Catch-All (080-099)
	// ─────────────────────────────────────────────────────────────────────────

	ADAPTER_ERROR: {
		code: "SRV-080",
		category: "bug" as const,
		userMessage: "Something unexpected happened.",
		adminMessage: "Infrastructure adapter threw an unexpected error.",
	},

	SERIALIZATION_ERROR: {
		code: "SRV-081",
		category: "bug" as const,
		userMessage: "Something went wrong processing data.",
		adminMessage: "Failed to serialize/deserialize data for storage.",
	},

	TIMEOUT: {
		code: "SRV-082",
		category: "bug" as const,
		userMessage: "The request took too long. Please try again.",
		adminMessage: "Infrastructure operation exceeded timeout threshold.",
	},
} as const satisfies Record<string, GroveErrorDef>;

export type SrvErrorKey = keyof typeof SRV_ERRORS;
