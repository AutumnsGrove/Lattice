/**
 * Firefly SDK — Signpost Error Catalog
 *
 * Every error has a structured code, a category (who can fix it),
 * a user-safe message, and a detailed admin message for logs.
 *
 * Prefix: FLY
 * Ranges:
 *   001-019  Infrastructure (provider API, bindings, connectivity)
 *   020-039  Lifecycle (ignite, fade, timeout, orphan)
 *   040-059  State (sync, store, conflicts)
 *   080-099  Internal errors (unexpected failures)
 *
 * @module @autumnsgrove/lattice/firefly
 */

import type { GroveErrorDef } from "../errors/types.js";

export const FLY_ERRORS = {
	// ─── Infrastructure (001-019) ─────────────────────────────────

	PROVIDER_API_ERROR: {
		code: "FLY-001",
		category: "admin" as const,
		userMessage: "Server provisioning service is temporarily unavailable.",
		adminMessage: "Provider API request failed. Check token and endpoint.",
	},
	PROVIDER_AUTH_FAILED: {
		code: "FLY-002",
		category: "admin" as const,
		userMessage: "Server provisioning service is temporarily unavailable.",
		adminMessage: "Provider API authentication failed. Check API token.",
	},
	PROVIDER_NOT_IMPLEMENTED: {
		code: "FLY-003",
		category: "admin" as const,
		userMessage: "This server provider is not yet available.",
		adminMessage: "Provider stub invoked. Implementation not yet shipped.",
	},
	STORE_NOT_AVAILABLE: {
		code: "FLY-004",
		category: "admin" as const,
		userMessage: "Server management service is temporarily unavailable.",
		adminMessage: "FireflyStateStore binding not available.",
	},
	EXECUTOR_NOT_AVAILABLE: {
		code: "FLY-005",
		category: "admin" as const,
		userMessage: "Remote execution is not available for this server.",
		adminMessage: "RemoteExecutor not available. Workers runtime lacks net/tls modules for SSH.",
	},
	EXECUTOR_COMMAND_FAILED: {
		code: "FLY-006",
		category: "bug" as const,
		userMessage: "A command failed on the server.",
		adminMessage: "Remote agent returned a non-OK HTTP status for command execution.",
	},
	CREDENTIAL_RESOLVE_FAILED: {
		code: "FLY-007",
		category: "admin" as const,
		userMessage: "Server provisioning service is temporarily unavailable.",
		adminMessage: "Failed to resolve provider API credential via Warden.",
	},

	// ─── Lifecycle (020-039) ─────────────────────────────────────

	IGNITE_FAILED: {
		code: "FLY-020",
		category: "bug" as const,
		userMessage: "Failed to start the server. Please try again.",
		adminMessage: "Firefly ignite sequence failed during provisioning.",
	},
	READY_TIMEOUT: {
		code: "FLY-021",
		category: "bug" as const,
		userMessage: "Server is taking too long to start. Please try again.",
		adminMessage: "Server did not reach ready status within the timeout period.",
	},
	FADE_FAILED: {
		code: "FLY-022",
		category: "bug" as const,
		userMessage: "Failed to shut down the server cleanly.",
		adminMessage: "Firefly fade sequence failed during termination.",
	},
	INSTANCE_NOT_FOUND: {
		code: "FLY-023",
		category: "user" as const,
		userMessage: "This server doesn't exist or has already been shut down.",
		adminMessage: "Instance ID not found in state store.",
	},
	MAX_LIFETIME_EXCEEDED: {
		code: "FLY-024",
		category: "user" as const,
		userMessage: "Server reached its maximum allowed runtime.",
		adminMessage: "Instance exceeded maxLifetime. Triggering automatic fade.",
	},
	ORPHAN_DETECTED: {
		code: "FLY-025",
		category: "bug" as const,
		userMessage: "Something went wrong. Please try again.",
		adminMessage: "Running server found with no corresponding state store entry.",
	},
	ALREADY_RUNNING: {
		code: "FLY-026",
		category: "user" as const,
		userMessage: "A server is already running for this workload.",
		adminMessage: "Ignite rejected: instance already active for this key.",
	},

	// ─── State (040-059) ─────────────────────────────────────────

	SYNC_HYDRATE_FAILED: {
		code: "FLY-040",
		category: "bug" as const,
		userMessage: "Failed to restore server state. Starting fresh.",
		adminMessage: "R2 state hydration failed during ignite.",
	},
	SYNC_PERSIST_FAILED: {
		code: "FLY-041",
		category: "bug" as const,
		userMessage: "Failed to save server state.",
		adminMessage: "R2 state persistence failed during fade or periodic sync.",
	},
	SYNC_CONFLICT: {
		code: "FLY-042",
		category: "user" as const,
		userMessage: "A state conflict was detected. Your latest work was preserved.",
		adminMessage: "State conflict detected during hydration. Check versions.",
	},
	STORE_WRITE_FAILED: {
		code: "FLY-043",
		category: "bug" as const,
		userMessage: "Something went wrong. Please try again.",
		adminMessage: "FireflyStateStore write operation failed.",
	},

	// ─── Internal (080-099) ──────────────────────────────────────

	UNEXPECTED_ERROR: {
		code: "FLY-080",
		category: "bug" as const,
		userMessage: "Something went wrong. Please try again.",
		adminMessage: "Unexpected error in Firefly SDK.",
	},
} satisfies Record<string, GroveErrorDef>;

export type FireflyErrorKey = keyof typeof FLY_ERRORS;

/**
 * Firefly SDK error class.
 * Wraps a GroveErrorDef with the error code and messages.
 */
export class FireflyError extends Error {
	code: string;
	category: string;
	userMessage: string;

	constructor(errorDef: GroveErrorDef, details?: string, cause?: unknown) {
		const message = details ? `${errorDef.adminMessage} ${details}` : errorDef.adminMessage;
		super(message, cause ? { cause } : undefined);
		this.name = "FireflyError";
		this.code = errorDef.code;
		this.category = errorDef.category;
		this.userMessage = errorDef.userMessage;
	}
}
