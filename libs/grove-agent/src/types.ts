/**
 * GroveAgent — Shared Types
 *
 * Configuration and event types used by both GroveAgent and GroveChatAgent.
 * Kept thin and focused — the SDK's own types are used directly.
 */

// ============================================================================
// Agent Configuration
// ============================================================================

/**
 * Configuration returned by groveConfig().
 *
 * IMPORTANT: groveConfig() is called during super() — before subclass fields
 * are initialized. Return a plain object literal. Do NOT reference `this`.
 */
export interface GroveAgentConfig {
	/** Human-readable agent name, used in logs and error context. */
	name: string;
	/** Brief description of what this agent does. */
	description?: string;
}

// ============================================================================
// Observability
// ============================================================================

/** A structured observability event. */
export interface GroveObservabilityEvent {
	/** Event type identifier (e.g. "email.sent", "schedule.fired"). */
	type: string;
	/** Human-readable message for dashboards. */
	message: string;
	/** Arbitrary event data. */
	data?: Record<string, unknown>;
}

// ============================================================================
// Logger
// ============================================================================

/** Log levels supported by AgentLogger. */
export type AgentLogLevel = "debug" | "info" | "warn" | "error";

/** Structured log entry emitted by AgentLogger. */
export interface AgentLogEntry {
	agent: string;
	instance: string;
	level: AgentLogLevel;
	message: string;
	timestamp: string;
	[key: string]: unknown;
}
