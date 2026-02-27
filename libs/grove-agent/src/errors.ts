/**
 * GroveAgent — Error Catalog
 *
 * Structured error codes for the agent framework.
 * Uses the shared GroveErrorDef pattern from Signpost.
 *
 * Format: GROVE-AGENT-XXX
 * Ranges:
 *   001-019  Initialization & lifecycle
 *   020-039  Scheduling & queues
 *   040-059  State & storage
 *   060-079  Communication (WebSocket, MCP, email)
 *   080-099  Internal / catch-all
 */

import type { GroveErrorDef } from "@autumnsgrove/lattice/errors";

// ============================================================================
// Error Catalog
// ============================================================================

export const GROVE_AGENT_ERRORS = {
	// ─────────────────────────────────────────────────────────────────────────
	// Initialization & Lifecycle (001-019)
	// ─────────────────────────────────────────────────────────────────────────

	INIT_FAILED: {
		code: "GROVE-AGENT-001",
		category: "bug" as const,
		userMessage: "Service temporarily unavailable. Please try again.",
		adminMessage: "Agent initialization failed in onStart().",
	},

	CONFIG_INVALID: {
		code: "GROVE-AGENT-002",
		category: "bug" as const,
		userMessage: "Service temporarily unavailable. Please try again.",
		adminMessage: "groveConfig() returned invalid configuration.",
	},

	// ─────────────────────────────────────────────────────────────────────────
	// Scheduling & Queues (020-039)
	// ─────────────────────────────────────────────────────────────────────────

	SCHEDULE_FAILED: {
		code: "GROVE-AGENT-020",
		category: "bug" as const,
		userMessage: "A scheduled task could not be created.",
		adminMessage: "schedule() or scheduleEvery() call failed.",
	},

	QUEUE_FAILED: {
		code: "GROVE-AGENT-021",
		category: "bug" as const,
		userMessage: "A background task could not be started.",
		adminMessage: "queue() call failed.",
	},

	CALLBACK_FAILED: {
		code: "GROVE-AGENT-022",
		category: "bug" as const,
		userMessage: "A background task encountered an error.",
		adminMessage: "Scheduled or queued callback threw an error.",
	},

	// ─────────────────────────────────────────────────────────────────────────
	// State & Storage (040-059)
	// ─────────────────────────────────────────────────────────────────────────

	STATE_INVALID: {
		code: "GROVE-AGENT-040",
		category: "bug" as const,
		userMessage: "Changes could not be saved. Please try again.",
		adminMessage: "State validation rejected an update.",
	},

	SQL_FAILED: {
		code: "GROVE-AGENT-041",
		category: "bug" as const,
		userMessage: "Service temporarily unavailable. Please try again.",
		adminMessage: "SQL query failed in agent storage.",
	},

	// ─────────────────────────────────────────────────────────────────────────
	// Communication (060-079)
	// ─────────────────────────────────────────────────────────────────────────

	MCP_CONNECTION_FAILED: {
		code: "GROVE-AGENT-060",
		category: "bug" as const,
		userMessage: "Could not connect to an external service.",
		adminMessage: "addMcpServer() failed to establish connection.",
	},

	EMAIL_SEND_FAILED: {
		code: "GROVE-AGENT-061",
		category: "bug" as const,
		userMessage: "Your message could not be sent. Please try again.",
		adminMessage: "Email send or reply failed.",
	},

	// ─────────────────────────────────────────────────────────────────────────
	// Internal / Catch-All (080-099)
	// ─────────────────────────────────────────────────────────────────────────

	INTERNAL_ERROR: {
		code: "GROVE-AGENT-080",
		category: "bug" as const,
		userMessage: "Something went wrong. Please try again.",
		adminMessage: "Unhandled error in agent execution.",
	},
} as const satisfies Record<string, GroveErrorDef>;

// ============================================================================
// Types
// ============================================================================

export type AgentErrorKey = keyof typeof GROVE_AGENT_ERRORS;
