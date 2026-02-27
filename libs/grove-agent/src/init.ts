/**
 * GroveAgent — Shared Convention Layer
 *
 * Called in both GroveAgent and GroveChatAgent constructors.
 * Intentionally thin today — this is the seam where future conventions
 * plug in: metrics collection, feature flag checks, tenant context injection.
 *
 * One function, both classes, zero duplication.
 */

import type { AgentLogger } from "./logger.js";
import type { GroveAgentConfig } from "./types.js";

export function groveInit(agent: { log: AgentLogger }, config: GroveAgentConfig): void {
	agent.log.debug("Grove agent initializing", {
		name: config.name,
		description: config.description,
	});
}
