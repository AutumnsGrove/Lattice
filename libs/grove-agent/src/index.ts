/**
 * @autumnsgrove/grove-agent
 *
 * Autonomous agent framework for Grove.
 * Loom gave the trees structure. GroveAgent teaches them to breathe.
 *
 * Two base classes:
 * - GroveAgent (extends Agent) — task agents: scheduling, queues, state, MCP
 * - GroveChatAgent (extends AIChatAgent) — chat agents: persistent conversations, tools
 *
 * Consumers import everything from this single entry point.
 * No need to import from "agents" directly.
 */

// ── Base Classes ──────────────────────────────────────────────────────────────
export { GroveAgent } from "./grove-agent.js";
export { GroveChatAgent } from "./grove-chat-agent.js";

// ── Logger ────────────────────────────────────────────────────────────────────
export { AgentLogger } from "./logger.js";

// ── Errors ────────────────────────────────────────────────────────────────────
export { GROVE_AGENT_ERRORS, type AgentErrorKey } from "./errors.js";

// ── Types ─────────────────────────────────────────────────────────────────────
export type {
	GroveAgentConfig,
	GroveObservabilityEvent,
	AgentLogLevel,
	AgentLogEntry,
} from "./types.js";

// ── Re-exports from Agents SDK ────────────────────────────────────────────────
// So consumers don't need to install "agents" directly for common imports.
export { callable, getAgentByName, routeAgentRequest } from "agents";
export type { Connection, ConnectionContext, Schedule } from "agents";
