/**
 * The seam between a Lyra request and Lumen's wire.
 *
 * Lyra knows a conversation, a list of tools, and an abort signal. Lumen knows
 * a task, a tier and a provider key. Every Lumen-shaped idea lives in this file,
 * so the core never learns one: the request goes out as Lumen's own messages,
 * and the reply comes back as the four fields the slot contract names
 * (docs/adapters.md, "the model slot's request and response stay generic").
 *
 * Two mappings are deliberately lossy, and both are noted where they happen: a
 * tool result's `isError` flag has no wire field, and a volunteered `reasoning`
 * string has no place in an assistant turn.
 */

import type {
	ConversationMessage,
	ModelReply,
	ModelRequest,
	ToolCall,
	ToolSpec,
} from "@autumnsgrove/lyra";
import type { LumenToolCall, LumenToolDefinition } from "@autumnsgrove/lattice/ai/lumen/types";

/**
 * A message as the worker's `POST /inference` body carries it.
 *
 * This is not `LumenMessage`. The engine's own type is camelCase (`toolCalls`,
 * `toolCallId`) because it is used client-side; the wire is snake_case, and the
 * worker's Zod schema validates that spelling and drops what it does not know. A
 * camelCase `toolCallId` therefore arrives as no id at all, and the route refuses
 * the tool message for missing one — which is how the real routes caught this.
 * `RemoteLumenClient` has a `toWireMessage` for the same reason.
 */
export interface WireMessage {
	role: "system" | "user" | "assistant" | "tool";
	content: LumenMessageContent;
	tool_calls?: LumenToolCall[];
	tool_call_id?: string;
	name?: string;
}

type LumenMessageContent = string | Array<Record<string, unknown>>;

/** A tool as Lumen's worker accepts it: an OpenAI-style function definition. */
export function toLumenTool(tool: ToolSpec): LumenToolDefinition {
	return {
		type: "function",
		function: {
			name: tool.name,
			description: tool.description,
			parameters: tool.parameters as Record<string, unknown>,
		},
	};
}

/** A call the model made, on its way back into the conversation. */
export function toLumenToolCall(call: ToolCall): LumenToolCall {
	return {
		id: call.id,
		type: "function",
		function: { name: call.name, arguments: call.arguments },
	};
}

/**
 * Lyra's conversation as Lumen's messages.
 *
 * The system prompt is sent only when there is one, so an empty recipe does not
 * produce a system turn the provider has to read. A tool result keeps its id,
 * because that id is what pairs it with the assistant turn's call — without it a
 * provider rejects the message several layers down with an error that never
 * mentions the id.
 */
export function toLumenMessages(request: ModelRequest): WireMessage[] {
	const messages: WireMessage[] = [];

	if (request.system !== "") {
		messages.push({ role: "system", content: request.system });
	}

	for (const message of request.messages) {
		messages.push(toLumenMessage(message));
	}

	return messages;
}

function toLumenMessage(message: ConversationMessage): WireMessage {
	switch (message.role) {
		case "user":
			return { role: "user", content: message.text };

		case "assistant": {
			const wire: WireMessage = { role: "assistant", content: message.text };
			if (message.toolCalls.length > 0) {
				wire.tool_calls = message.toolCalls.map(toLumenToolCall);
			}
			// `reasoning` is dropped: Lumen's message shape has no field for it, and
			// inventing one would be an option a provider might reject (OAI16).
			return wire;
		}

		case "tool":
			// `isError` is dropped for the same reason. The result's text is what the
			// model reads, and a tool that failed says so in its own words.
			return { role: "tool", content: message.content, tool_call_id: message.toolCallId };
	}
}

/** What a reply from the worker carries, once the envelope is peeled back. */
export interface LumenReplyData {
	content: string;
	model: string;
	usage: { input: number; output: number; cost: number; cost_source?: "catalog" | "provider" };
	tool_calls?: Array<{
		id: string;
		type: "function";
		function: { name: string; arguments: string };
	}>;
	finish_reason?: "stop" | "length" | "tool_calls" | "content_filter" | "other";
}

/**
 * Lumen's reply as Lyra's.
 *
 * Three things are worth naming. `arguments` stays the raw string the model
 * produced, because a model can emit invalid JSON and the loop should see that
 * rather than a parse crash. A missing finish reason becomes `other` — absent
 * means unknown, never "finished" (L2). And the cost always carries a source:
 * Lumen prices from its own catalog (L5), so a figure that did not come from a
 * provider is labelled `catalog`, not passed off as an invoice.
 */
export function fromLumenReply(data: LumenReplyData): ModelReply {
	return {
		text: data.content,
		toolCalls: (data.tool_calls ?? []).map((call) => ({
			id: call.id,
			name: call.function.name,
			arguments: call.function.arguments,
		})),
		usage: {
			inputTokens: data.usage.input,
			outputTokens: data.usage.output,
			cost: {
				amount: data.usage.cost,
				currency: "USD",
				source: data.usage.cost_source ?? "catalog",
			},
		},
		finishReason: data.finish_reason ?? "other",
		model: data.model,
	};
}
