/**
 * GroveAgent — Chat Agent Base Class
 *
 * Extends the Cloudflare AI Chat Agent with Grove conventions:
 * structured logging, Signpost error codes, and observability events.
 *
 * Use this for agents that need persistent conversations, resumable
 * streams, and tool support. All clients connected to the same instance
 * see the same conversation in real time.
 *
 * @example
 * ```typescript
 * import { streamText } from "ai";
 * import { GroveChatAgent } from "@autumnsgrove/grove-agent";
 *
 * export class FiresideAgent extends GroveChatAgent<Env, FiresideState> {
 *   initialState = { phase: "warming-up", messageCount: 0 };
 *
 *   groveConfig() {
 *     return { name: "FiresideAgent", description: "Conversational writing" };
 *   }
 *
 *   async onChatMessage(onFinish) {
 *     const response = streamText({
 *       model: this.env.AI,
 *       messages: this.messages,
 *     });
 *     return response.toDataStreamResponse();
 *   }
 * }
 * ```
 */

import { AIChatAgent } from "@cloudflare/ai-chat";
import type { Connection } from "agents";
import { groveInit } from "./init.js";
import { AgentLogger } from "./logger.js";
import { emitObservabilityEvent } from "./observability.js";
import type { GroveAgentConfig, GroveObservabilityEvent } from "./types.js";

export abstract class GroveChatAgent<
	Env extends Record<string, unknown> = Record<string, unknown>,
	State = unknown,
> extends AIChatAgent<Env, State> {
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
		this.log = new AgentLogger(config.name, this.name);
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
			this.log.errorWithCause("Chat agent error", error, {
				connectionId: connection.id,
			});
		} else {
			this.log.errorWithCause("Chat agent error", connectionOrError);
		}
	}
}
