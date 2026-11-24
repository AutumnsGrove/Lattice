import { describe, expect, it, vi } from "vitest";
import type { ModelRequest } from "@autumnsgrove/lyra";
import { createLumenModelSlot } from "./slot.js";

const KEY = "sk-or-v1-0123456789abcdef0123456789abcdef";

function request(overrides: Partial<ModelRequest> = {}): ModelRequest {
	return {
		system: "You are a careful steward.",
		messages: [{ role: "user", text: "What grew today?" }],
		tools: [{ name: "add_line", description: "Add a line", parameters: { type: "object" } }],
		signal: new AbortController().signal,
		...overrides,
	};
}

function success(data: Record<string, unknown> = {}): Response {
	return new Response(
		JSON.stringify({
			success: true,
			data: {
				content: "A quiet day.",
				model: "deepseek/deepseek-v4.1-flash",
				provider: "openrouter",
				usage: { input: 100, output: 20, cost: 0.0001, cost_source: "catalog" },
				finish_reason: "stop",
				...data,
			},
			meta: { task: "agent", model: "m", provider: "openrouter", latencyMs: 12 },
		}),
		{ status: 200, headers: { "Content-Type": "application/json" } },
	);
}

interface Captured {
	url: string;
	init: RequestInit;
}

function slotWith(response: Response | (() => Promise<Response>), config = {}) {
	const calls: Captured[] = [];
	const slot = createLumenModelSlot({
		baseUrl: "https://lumen.test",
		apiKey: "caller-key",
		tenantId: "tenant-1",
		tenantApiKey: KEY,
		fetch: async (input, init) => {
			calls.push({ url: String(input), init: init ?? {} });
			return typeof response === "function" ? response() : response.clone();
		},
		...config,
	});
	return { slot, calls };
}

function bodyOf(call: Captured): Record<string, unknown> {
	return JSON.parse(String(call.init.body));
}

describe("createLumenModelSlot", () => {
	it("SLT01 sends an agent turn the way Lumen's worker expects it", async () => {
		const { slot, calls } = slotWith(success());
		const result = await slot.complete(request());

		expect(result.ok).toBe(true);
		expect(calls).toHaveLength(1);
		expect(calls[0].url).toBe("https://lumen.test/inference");

		const body = bodyOf(calls[0]);
		expect(body.task).toBe("agent");
		expect(body.tenant_id).toBe("tenant-1");
		expect(body.input).toEqual([
			{ role: "system", content: "You are a careful steward." },
			{ role: "user", content: "What grew today?" },
		]);

		const options = body.options as Record<string, unknown>;
		// The agent task's quota is zero on every tier, so a call without this is refused.
		expect(options.skip_quota).toBe(true);
		expect(options.tools).toEqual([
			{
				type: "function",
				function: { name: "add_line", description: "Add a line", parameters: { type: "object" } },
			},
		]);
	});

	it("SLT02 keeps the provider key in the body, in no header and in no reply", async () => {
		const { slot, calls } = slotWith(success({ tool_calls: [] }));
		const result = await slot.complete(request());

		const headers = calls[0].init.headers as Record<string, string>;
		expect(Object.values(headers)).not.toContain(KEY);
		expect(headers["X-API-Key"]).toBe("caller-key");
		expect((bodyOf(calls[0]).options as Record<string, unknown>).tenant_api_key).toBe(KEY);

		// The reply that reaches Lyra carries no key anywhere.
		expect(JSON.stringify(result)).not.toContain(KEY);
	});

	it("SLT03 maps the reply onto the slot's contract", async () => {
		const { slot } = slotWith(
			success({
				tool_calls: [
					{ id: "call_1", type: "function", function: { name: "add_line", arguments: '{"a":1}' } },
				],
				finish_reason: "tool_calls",
			}),
		);

		const result = await slot.complete(request());
		if (!result.ok) throw new Error("expected a reply");

		expect(result.value).toEqual({
			text: "A quiet day.",
			toolCalls: [{ id: "call_1", name: "add_line", arguments: '{"a":1}' }],
			usage: {
				inputTokens: 100,
				outputTokens: 20,
				cost: { amount: 0.0001, currency: "USD", source: "catalog" },
			},
			finishReason: "tool_calls",
			model: "deepseek/deepseek-v4.1-flash",
		});
	});

	it("SLT04 takes the context window from the model's own flags", () => {
		const { slot } = slotWith(success());
		// The agent task's default, from lumen-models.json.
		expect(slot.contextWindow).toBe(128_000);
	});

	it("SLT05 says nothing about a window it does not know", () => {
		const { slot } = slotWith(success(), { model: "someone/unlisted-model" });
		// Compaction cannot fire on its own without a number, which is the point of
		// saying nothing rather than guessing one (decision 41).
		expect(slot.contextWindow).toBeUndefined();
	});

	it("SLT06 asks a different task for a compaction", async () => {
		const { slot, calls } = slotWith(success());
		await slot.complete(request({ purpose: "compaction" }));

		expect(bodyOf(calls[0]).task).toBe("summary");
		// A run still pays for the work it does, but not twice for summarising itself.
		expect((bodyOf(calls[0]).options as Record<string, unknown>).skip_quota).toBe(true);
	});

	it("SLT06b gives a compaction its own output allowance", async () => {
		// A summary that runs out of allowance comes back empty, and an empty summary
		// parks the run as model_unavailable. The history grows as the run goes, so the
		// last summary of a day is the one most likely to hit the ceiling.
		const { slot, calls } = slotWith(success(), { maxTokens: 1_000 });
		await slot.complete(request({ purpose: "compaction" }));
		await slot.complete(request());

		expect((bodyOf(calls[0]).options as Record<string, unknown>).max_tokens).toBe(16_384);
		expect((bodyOf(calls[1]).options as Record<string, unknown>).max_tokens).toBe(1_000);
	});

	it("SLT07 lets a recipe's model override the configured one", async () => {
		const { slot, calls } = slotWith(success(), { model: "configured/model" });
		await slot.complete(request({ model: "recipe/fallback" }));

		expect((bodyOf(calls[0]).options as Record<string, unknown>).model).toBe("recipe/fallback");
	});

	it("SLT08 reads the key per call when it is handed a reader", async () => {
		const read = vi.fn(async () => KEY);
		const { slot, calls } = slotWith(success(), { tenantApiKey: read });

		await slot.complete(request());
		await slot.complete(request());

		expect(read).toHaveBeenCalledTimes(2);
		expect((bodyOf(calls[1]).options as Record<string, unknown>).tenant_api_key).toBe(KEY);
	});

	it("SLT09 a 429 is worth another try, and its Retry-After is passed on", async () => {
		const { slot } = slotWith(
			new Response(
				JSON.stringify({ success: false, error: { code: "RATE_LIMITED", message: "slow down" } }),
				{ status: 429, headers: { "Retry-After": "3" } },
			),
		);

		const result = await slot.complete(request());
		if (result.ok) throw new Error("expected a failure");

		expect(result.error).toMatchObject({ code: "busy", retryable: true, retryAfterMs: 3_000 });
	});

	it("SLT10 an unregistered failure is a plain, unretried refusal", async () => {
		const { slot } = slotWith(
			new Response(
				JSON.stringify({ success: false, error: { code: "INVALID_PARAMS", message: "bad tools" } }),
				{ status: 400 },
			),
		);

		const result = await slot.complete(request());
		if (result.ok) throw new Error("expected a failure");

		expect(result.error).toMatchObject({ code: "bad_request", retryable: false });
	});

	it("SLT11 a network failure is retryable and names no key", async () => {
		const { slot } = slotWith(async () => {
			throw new Error(`connect ECONNREFUSED with ${KEY}`);
		});

		const result = await slot.complete(request());
		if (result.ok) throw new Error("expected a failure");

		expect(result.error).toMatchObject({ code: "provider_error", retryable: true });
		expect(result.error.message).not.toContain(KEY);
	});

	it("SLT12 a stop before anything is sent costs no request", async () => {
		const controller = new AbortController();
		controller.abort();
		const { slot, calls } = slotWith(success());

		const result = await slot.complete(request({ signal: controller.signal }));
		if (result.ok) throw new Error("expected a failure");

		expect(calls).toHaveLength(0);
		expect(result.error).toMatchObject({ code: "timeout", retryable: false });
	});

	it("SLT13 a stop while the call is in flight is read as a stop", async () => {
		const controller = new AbortController();
		const { slot } = slotWith(async () => {
			controller.abort();
			throw new DOMException("aborted", "AbortError");
		});

		const result = await slot.complete(request({ signal: controller.signal }));
		if (result.ok) throw new Error("expected a failure");

		expect(result.error).toMatchObject({ code: "timeout", retryable: false });
	});

	it("SLT14 a call that never answers is abandoned at the deadline, retryably", async () => {
		const { slot } = slotWith(
			() =>
				new Promise<Response>((_, reject) => {
					setTimeout(() => reject(new DOMException("aborted", "AbortError")), 50);
				}),
			{ deadlineMs: 5 },
		);

		const result = await slot.complete(request());
		if (result.ok) throw new Error("expected a failure");

		expect(result.error).toMatchObject({ code: "timeout", retryable: true });
		expect(result.error.message).toContain("5ms");
	});

	it("SLT14b a body that stalls after the headers is abandoned at the deadline too", async () => {
		// Headers, then nothing: the shape a deadline exists for, and the one the first
		// version missed because the timer was cleared when `send` resolved.
		const stalled = new Response(
			new ReadableStream({
				start() {
					// Deliberately never enqueues and never closes.
				},
			}),
			{ status: 200, headers: { "Content-Type": "application/json" } },
		);
		const { slot } = slotWith(async () => stalled, { deadlineMs: 5 });

		const result = await slot.complete(request());
		if (result.ok) throw new Error("expected a failure");

		expect(result.error).toMatchObject({ code: "timeout", retryable: true });
	});

	it("SLT15 a 200 whose body is not the contract is a failure, not a crash", async () => {
		const { slot } = slotWith(
			new Response(JSON.stringify({ success: true, data: { content: "no usage" } }), {
				status: 200,
			}),
		);

		const result = await slot.complete(request());
		if (result.ok) throw new Error("expected a failure");

		expect(result.error).toMatchObject({ code: "provider_error", retryable: true });
		expect(result.error.message).toContain("did not match");
	});

	it("SLT16 a body that is not JSON at all is a failure, not a crash", async () => {
		const { slot } = slotWith(new Response("<html>gateway</html>", { status: 200 }));

		const result = await slot.complete(request());
		if (result.ok) throw new Error("expected a failure");

		expect(result.error).toMatchObject({ code: "provider_error" });
	});
});
