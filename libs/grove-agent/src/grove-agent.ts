/**
 * GroveAgent — Task Agent Base Class
 *
 * Extends the Cloudflare Agents SDK's Agent class with Grove conventions:
 * structured logging, Signpost error codes, and observability events.
 *
 * Use this for agents that schedule work, sync state, handle queues,
 * and expose MCP — but don't need persistent chat.
 *
 * A Loom DO waits for requests. A GroveAgent acts on its own.
 * The same forest, a new kind of creature.
 *
 * @example
 * ```typescript
 * import { GroveAgent, callable } from "@autumnsgrove/grove-agent";
 *
 * export class OnboardingAgent extends GroveAgent<Env, OnboardingState> {
 *   initialState = { userId: null, emailsSent: [] };
 *
 *   groveConfig() {
 *     return { name: "OnboardingAgent", description: "Email sequences" };
 *   }
 *
 *   @callable()
 *   async startSequence(userId: string) {
 *     this.setState({ ...this.state, userId });
 *     await this.schedule(0, "sendWelcome", {});
 *   }
 * }
 * ```
 */

import { Agent } from "agents";
import type { Connection, ConnectionContext } from "agents";
import { groveInit } from "./init.js";
import { AgentLogger } from "./logger.js";
import { emitObservabilityEvent } from "./observability.js";
import type { GroveAgentConfig, GroveObservabilityEvent } from "./types.js";

export abstract class GroveAgent<
	Env extends Record<string, unknown> = Record<string, unknown>,
	State = unknown,
> extends Agent<Env, State> {
	readonly log: AgentLogger;

	/**
	 * Override to configure the agent.
	 *
	 * IMPORTANT: Called during super() — return a plain object literal.
	 * Do NOT reference `this` (subclass fields aren't initialized yet).
	 */
	abstract groveConfig(): GroveAgentConfig;

	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
		const config = this.groveConfig();
		this.log = new AgentLogger(config.name, () => this.name);
		groveInit(this, config);
	}

	/**
	 * Emit a structured observability event.
	 *
	 * Currently logs via AgentLogger. When the Cloudflare Agents SDK adds
	 * an observability API, this method will also emit to the SDK's event
	 * system without changing consumer code.
	 */
	protected observe(event: GroveObservabilityEvent): void {
		emitObservabilityEvent(this.log, event);
	}

	/** Signpost-patterned error logging. Handles both connection and general errors. */
	onError(connectionOrError: Connection | unknown, error?: unknown): void {
		if (error !== undefined) {
			const connection = connectionOrError as Connection;
			this.log.errorWithCause("Agent error", error, {
				connectionId: connection.id,
			});
		} else {
			this.log.errorWithCause("Agent error", connectionOrError);
		}
	}

	/** Lifecycle logging. Override in subclass, call super if you want logs. */
	async onStart(): Promise<void> {
		this.log.info("Agent started");
	}

	onConnect(connection: Connection, ctx: ConnectionContext): void {
		this.log.debug("Client connected", { connectionId: connection.id });
	}

	onClose(connection: Connection, code: number, reason: string, wasClean: boolean): void {
		this.log.debug("Client disconnected", {
			connectionId: connection.id,
			code,
			wasClean,
		});
	}
}
