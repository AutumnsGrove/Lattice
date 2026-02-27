/**
 * GroveAgent — Observability
 *
 * Structured event emission for agent lifecycle and business events.
 * Currently logs via AgentLogger. When the Cloudflare Agents SDK adds
 * an observability API (tracked in their roadmap), this module will
 * also emit to the SDK's event system without changing consumer code.
 */

import type { AgentLogger } from "./logger.js";
import type { GroveObservabilityEvent } from "./types.js";

/**
 * Emit a structured observability event.
 * Shared implementation used by both GroveAgent and GroveChatAgent.
 */
export function emitObservabilityEvent(log: AgentLogger, event: GroveObservabilityEvent): void {
	log.info(`[observe] ${event.type}`, {
		message: event.message,
		...event.data,
	});
}
