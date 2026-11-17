/**
 * Cloudflare AI provider — tool-turn refusal.
 *
 * Workers AI has no tool-calling path here, and the formatter keeps only role
 * and content. Dropping the ids silently would send the model prose where a
 * tool result belonged, so the provider refuses instead.
 */

import { describe, it, expect, vi } from "vitest";
import { CloudflareAIProvider } from "./cloudflare-ai.js";
import type { LumenMessage } from "../types.js";

const mockAi = { run: vi.fn().mockResolvedValue({ response: "ok" }) } as unknown as Ai;

function provider() {
	return new CloudflareAIProvider(mockAi);
}

describe("CloudflareAIProvider tool turns", () => {
	it("refuses a conversation containing a tool result", async () => {
		const messages: LumenMessage[] = [
			{ role: "user", content: "hello" },
			{ role: "tool", content: "a result", toolCallId: "call_1" },
		];

		await expect(
			provider().inference("@cf/test/model", messages, { maxTokens: 10, temperature: 0 }),
		).rejects.toThrow(/not supported by the Cloudflare Workers AI provider/);
	});

	it("refuses an assistant turn carrying tool calls", async () => {
		const messages: LumenMessage[] = [
			{
				role: "assistant",
				content: "",
				toolCalls: [{ id: "c", type: "function", function: { name: "t", arguments: "{}" } }],
			},
		];

		await expect(
			provider().inference("@cf/test/model", messages, { maxTokens: 10, temperature: 0 }),
		).rejects.toThrow(/Use an OpenRouter-routed model/);
	});

	it("still runs an ordinary conversation", async () => {
		const result = await provider().inference("@cf/test/model", [{ role: "user", content: "hi" }], {
			maxTokens: 10,
			temperature: 0,
		});

		expect(result.content).toBe("ok");
	});
});
