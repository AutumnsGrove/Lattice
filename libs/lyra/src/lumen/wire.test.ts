import { describe, expect, it } from "vitest";
import type { ModelRequest } from "@autumnsgrove/lyra";
import { fromLumenReply, toLumenMessages, toLumenTool } from "./wire.js";

function request(overrides: Partial<ModelRequest> = {}): ModelRequest {
	return {
		system: "You are a careful steward.",
		messages: [{ role: "user", text: "What grew today?" }],
		tools: [],
		signal: new AbortController().signal,
		...overrides,
	};
}

describe("toLumenMessages", () => {
	it("WIR01 sends the system prompt only when there is one", () => {
		expect(toLumenMessages(request())[0]).toEqual({
			role: "system",
			content: "You are a careful steward.",
		});

		const bare = toLumenMessages(request({ system: "" }));
		expect(bare).toEqual([{ role: "user", content: "What grew today?" }]);
	});

	it("WIR02 carries an assistant turn's own calls, and a tool result's id", () => {
		const messages = toLumenMessages(
			request({
				messages: [
					{ role: "user", text: "Look at the diff." },
					{
						role: "assistant",
						text: "",
						toolCalls: [{ id: "call_1", name: "get_diff", arguments: '{"pr":12}' }],
					},
					{ role: "tool", toolCallId: "call_1", content: "+ a line", isError: false },
				],
			}),
		);

		// Index 0 is the system prompt, so the turn pair starts at 1.
		expect(messages[2]).toEqual({
			role: "assistant",
			content: "",
			tool_calls: [
				{
					id: "call_1",
					type: "function",
					function: { name: "get_diff", arguments: '{"pr":12}' },
				},
			],
		});
		expect(messages[3]).toEqual({ role: "tool", content: "+ a line", tool_call_id: "call_1" });
	});

	it("WIR03 keeps arguments raw, and invents no field for reasoning or isError", () => {
		const messages = toLumenMessages(
			request({
				messages: [
					{
						role: "assistant",
						text: "thinking",
						reasoning: "a private thought",
						toolCalls: [{ id: "call_9", name: "finish", arguments: "{not json" }],
					},
					{ role: "tool", toolCallId: "call_9", content: "failed", isError: true },
				],
			}),
		);

		// This request has no user turn: wire index 1 is the assistant, 2 the result.
		const assistant = messages[1] as unknown as Record<string, unknown>;
		expect(
			(assistant.tool_calls as Array<{ function: { arguments: string } }>)[0].function.arguments,
		).toBe("{not json");
		expect(assistant).not.toHaveProperty("reasoning");
		expect(messages[2]).not.toHaveProperty("isError");
		// The snake_case spelling is the point: the worker's schema drops camelCase,
		// and a dropped `tool_call_id` is a refused tool message.
		expect(messages[2]).toHaveProperty("tool_call_id", "call_9");
	});

	it("WIR04 maps a tool to a function definition, keeping an empty schema", () => {
		expect(toLumenTool({ name: "finish", description: "End the day", parameters: {} })).toEqual({
			type: "function",
			function: { name: "finish", description: "End the day", parameters: {} },
		});
	});
});

describe("fromLumenReply", () => {
	it("WIR05 maps calls, usage and cost source", () => {
		const reply = fromLumenReply({
			content: "",
			model: "deepseek/deepseek-v4.1-flash",
			usage: { input: 812, output: 42, cost: 0.0008, cost_source: "provider" },
			tool_calls: [
				{ id: "call_1", type: "function", function: { name: "add_line", arguments: '{"a":1}' } },
			],
			finish_reason: "tool_calls",
		});

		expect(reply.toolCalls).toEqual([{ id: "call_1", name: "add_line", arguments: '{"a":1}' }]);
		expect(reply.usage).toEqual({
			inputTokens: 812,
			outputTokens: 42,
			cost: { amount: 0.0008, currency: "USD", source: "provider" },
		});
		expect(reply.finishReason).toBe("tool_calls");
		expect(reply.model).toBe("deepseek/deepseek-v4.1-flash");
	});

	it("WIR06 labels a priced cost as catalog, and a missing finish reason as other", () => {
		const reply = fromLumenReply({
			content: "A quiet day.",
			model: "m",
			usage: { input: 1, output: 1, cost: 0.01 },
		});

		expect(reply.usage.cost).toEqual({ amount: 0.01, currency: "USD", source: "catalog" });
		expect(reply.finishReason).toBe("other");
		expect(reply.toolCalls).toEqual([]);
	});
});
