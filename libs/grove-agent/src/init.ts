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

export function groveInit(_agent: { log: AgentLogger }, _config: GroveAgentConfig): void {
	// NOTE: Do NOT log here. The Agents SDK sets .name lazily after
	// construction, so accessing this.name during the constructor throws.
	// See: https://github.com/cloudflare/workerd/issues/2240
	// The onStart() lifecycle hook logs "Agent started" once the name is set.
}
