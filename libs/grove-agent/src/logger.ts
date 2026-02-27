/**
 * GroveAgent — Structured Logger
 *
 * Adapted from LoomLogger for the agent context. Same structured JSON output,
 * same API surface, different field names: `agent` and `instance` instead of
 * `do` and `id`.
 *
 * Auto-tagged with agent name and instance name. Emits structured JSON to
 * console so Cloudflare's log aggregation can parse and filter.
 */

import type { AgentLogLevel, AgentLogEntry } from "./types.js";

export class AgentLogger {
	private readonly agentName: string;
	private readonly instanceNameOrFn: string | (() => string);

	/**
	 * @param agentName — static name from groveConfig().name
	 * @param instanceName — the DO instance name. Can be a lazy getter
	 *   because the Agents SDK sets `.name` after construction, not during.
	 */
	constructor(agentName: string, instanceName: string | (() => string)) {
		this.agentName = agentName;
		this.instanceNameOrFn = instanceName;
	}

	private get instanceName(): string {
		return typeof this.instanceNameOrFn === "function"
			? this.instanceNameOrFn()
			: this.instanceNameOrFn;
	}

	debug(message: string, data?: Record<string, unknown>): void {
		this.emit("debug", message, data);
	}

	info(message: string, data?: Record<string, unknown>): void {
		this.emit("info", message, data);
	}

	warn(message: string, data?: Record<string, unknown>): void {
		this.emit("warn", message, data);
	}

	error(message: string, data?: Record<string, unknown>): void {
		this.emit("error", message, data);
	}

	/** Log an error with a caught exception as context. */
	errorWithCause(message: string, cause: unknown, data?: Record<string, unknown>): void {
		const causeMessage = cause instanceof Error ? cause.message : String(cause);
		this.emit("error", message, { ...data, cause: causeMessage });
	}

	private emit(level: AgentLogLevel, message: string, data?: Record<string, unknown>): void {
		// Spread data first so structural fields cannot be overwritten
		const entry: AgentLogEntry = {
			...data,
			agent: this.agentName,
			instance: this.instanceName,
			level,
			message,
			timestamp: new Date().toISOString(),
		};

		const json = JSON.stringify(entry);

		switch (level) {
			case "debug":
				console.debug(json);
				break;
			case "info":
				console.log(json);
				break;
			case "warn":
				console.warn(json);
				break;
			case "error":
				console.error(json);
				break;
		}
	}
}
