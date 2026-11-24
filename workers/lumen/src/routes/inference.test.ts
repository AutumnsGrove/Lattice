/**
 * POST /inference Route Tests
 *
 * Tests request validation, Zod schema enforcement, success/error envelopes,
 * and the LumenClient integration.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import type { Env, LumenWorkerResponse } from "../types";
import { inference } from "./inference";

// =============================================================================
// MOCK LUMEN CLIENT
// =============================================================================

const mockRun = vi.fn();

vi.mock("../lib/client-factory", () => ({
	createLumenClientForWorker: vi.fn(() => ({
		run: mockRun,
		embed: vi.fn(),
		moderate: vi.fn(),
		transcribe: vi.fn(),
	})),
}));

// =============================================================================
// TEST HARNESS
// =============================================================================

function createApp() {
	const app = new Hono<{ Bindings: Env }>();
	app.route("/inference", inference);
	return app;
}

const mockEnv: Env = {
	DB: {} as D1Database,
	AI: {} as Ai,
	WARDEN: { fetch: vi.fn() },
	RATE_LIMITS: {} as KVNamespace,
	LUMEN_API_KEY: "test-key",
	WARDEN_API_KEY: "test-warden-key",
};

function post(body: unknown) {
	return new Request("http://localhost/inference", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
}

function postRaw(body: string) {
	return new Request("http://localhost/inference", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body,
	});
}

describe("the request's message allowance", () => {
	function body(messages: number) {
		return {
			task: "agent",
			input: Array.from({ length: messages }, (_, index) => ({
				role: index % 2 === 0 ? "user" : "assistant",
				content: `message ${index}`,
			})),
		};
	}

	it("accepts a conversation an agent loop can actually produce", async () => {
		// 300 messages is ~100 tool calls with their results: ordinary for a recipe that
		// asks for one tool per line of work, and refused by the old cap of 100.
		mockRun.mockResolvedValue({
			content: "fine",
			model: "deepseek/v3",
			provider: "openrouter",
			usage: { input: 1, output: 1, cost: 0 },
		});
		const response = await createApp().request(
			"/inference",
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body(300)),
			},
			mockEnv,
		);

		expect(response.status).toBe(200);
	});

	it("still refuses a conversation nobody could need", async () => {
		const response = await createApp().request(
			"/inference",
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body(401)),
			},
			mockEnv,
		);

		expect(response.status).toBe(400);
	});
});

describe("POST /inference", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return success envelope for valid request", async () => {
		mockRun.mockResolvedValue({
			content: "Hello world!",
			model: "deepseek/v3",
			provider: "openrouter",
			usage: { input: 10, output: 5, cost: 0.001 },
			cached: false,
		});

		const app = createApp();
		const res = await app.request(
			post({ task: "generation", input: "Write a haiku" }),
			undefined,
			mockEnv,
		);

		expect(res.status).toBe(200);
		const body: LumenWorkerResponse = (await res.json()) as any;
		expect(body.success).toBe(true);
		expect(body.data).toEqual({
			content: "Hello world!",
			model: "deepseek/v3",
			provider: "openrouter",
			usage: { input: 10, output: 5, cost: 0.001 },
			cached: false,
		});
		expect(body.meta?.task).toBe("generation");
		expect(body.meta?.model).toBe("deepseek/v3");
		expect(body.meta?.provider).toBe("openrouter");
		expect(body.meta?.latencyMs).toBeGreaterThanOrEqual(0);
	});

	it("carries a tool conversation through to the client, ids intact", async () => {
		mockRun.mockResolvedValue({
			content: "18C and clear",
			model: "m",
			provider: "openrouter",
			usage: { input: 30, output: 8, cost: 0 },
			cached: false,
			finishReason: "stop",
		});

		const app = createApp();
		const res = await app.request(
			post({
				task: "generation",
				input: [
					{ role: "user", content: "what is the weather" },
					{
						role: "assistant",
						content: "",
						tool_calls: [
							{
								id: "call_1",
								type: "function",
								function: { name: "weather", arguments: '{"city":"NYC"}' },
							},
						],
					},
					{ role: "tool", content: "18C", tool_call_id: "call_1", name: "weather" },
				],
				options: {
					tools: [
						{
							type: "function",
							function: {
								name: "weather",
								description: "Get the weather",
								parameters: { type: "object", properties: {} },
							},
						},
					],
				},
			}),
			undefined,
			mockEnv,
		);

		expect(res.status).toBe(200);

		const passed = mockRun.mock.calls[0][0];
		expect(passed.input[1].toolCalls?.[0].id).toBe("call_1");
		expect(passed.input[2]).toMatchObject({ role: "tool", toolCallId: "call_1" });
		expect(passed.options.tools).toHaveLength(1);
	});

	it("rejects a tool message with no tool_call_id", async () => {
		const app = createApp();
		const res = await app.request(
			post({
				task: "generation",
				input: [{ role: "tool", content: "orphan result" }],
			}),
			undefined,
			mockEnv,
		);

		expect(res.status).toBe(400);
		const body: LumenWorkerResponse = (await res.json()) as any;
		expect(body.error?.code).toBe("INVALID_PARAMS");
		expect(body.error?.message).toContain("tool_call_id");
	});

	it("returns finish_reason so a caller can see a truncated reply", async () => {
		mockRun.mockResolvedValue({
			content: '{"partial":',
			model: "m",
			provider: "openrouter",
			usage: { input: 100, output: 50, cost: 0 },
			cached: false,
			finishReason: "length",
			toolCalls: [{ id: "call_9", type: "function", function: { name: "t", arguments: '{"a":' } }],
		});

		const app = createApp();
		const res = await app.request(post({ task: "generation", input: "go" }), undefined, mockEnv);

		const body = (await res.json()) as any;
		expect(body.data?.finish_reason).toBe("length");
		expect(body.data?.tool_calls).toHaveLength(1);
	});

	it("omits finish_reason when the client did not report one", async () => {
		mockRun.mockResolvedValue({
			content: "x",
			model: "m",
			provider: "openrouter",
			usage: { input: 1, output: 1, cost: 0 },
			cached: false,
		});

		const app = createApp();
		const res = await app.request(post({ task: "generation", input: "go" }), undefined, mockEnv);

		const body = (await res.json()) as any;
		expect(body.data?.finish_reason).toBeUndefined();
	});

	it("carries the cost source out as cost_source", async () => {
		mockRun.mockResolvedValue({
			content: "x",
			model: "m",
			provider: "openrouter",
			usage: { input: 10, output: 5, cost: 0.002, costSource: "catalog" },
			cached: false,
		});

		const app = createApp();
		const res = await app.request(post({ task: "generation", input: "go" }), undefined, mockEnv);

		const body = (await res.json()) as any;
		expect(body.data.usage).toEqual({
			input: 10,
			output: 5,
			cost: 0.002,
			cost_source: "catalog",
		});
	});

	it("omits cost_source when the client did not report one", async () => {
		mockRun.mockResolvedValue({
			content: "x",
			model: "m",
			provider: "openrouter",
			usage: { input: 1, output: 1, cost: 0 },
			cached: false,
		});

		const app = createApp();
		const res = await app.request(post({ task: "generation", input: "go" }), undefined, mockEnv);

		const body = (await res.json()) as any;
		expect(body.data.usage).not.toHaveProperty("cost_source");
	});

	it("should return 400 for invalid JSON body", async () => {
		const app = createApp();
		const res = await app.request(postRaw("not json {{{"), undefined, mockEnv);

		expect(res.status).toBe(400);
		const body: LumenWorkerResponse = (await res.json()) as any;
		expect(body.success).toBe(false);
		expect(body.error?.code).toBe("INVALID_REQUEST");
		expect(body.error?.message).toBe("Invalid JSON body");
	});

	it("should return 400 for missing required fields", async () => {
		const app = createApp();
		const res = await app.request(post({}), undefined, mockEnv);

		expect(res.status).toBe(400);
		const body: LumenWorkerResponse = (await res.json()) as any;
		expect(body.success).toBe(false);
		expect(body.error?.code).toBe("INVALID_PARAMS");
		expect(body.error?.message).toContain("task");
	});

	it("should return 400 for invalid task type", async () => {
		const app = createApp();
		const res = await app.request(
			post({ task: "not-a-real-task", input: "test" }),
			undefined,
			mockEnv,
		);

		expect(res.status).toBe(400);
		const body: LumenWorkerResponse = (await res.json()) as any;
		expect(body.error?.code).toBe("INVALID_PARAMS");
	});

	it("should accept message array input", async () => {
		mockRun.mockResolvedValue({
			content: "Response",
			model: "m",
			provider: "p",
			usage: { input: 1, output: 1, cost: 0 },
			cached: false,
		});

		const app = createApp();
		const res = await app.request(
			post({
				task: "chat",
				input: [
					{ role: "system", content: "You are helpful" },
					{ role: "user", content: "Hi" },
				],
			}),
			undefined,
			mockEnv,
		);

		expect(res.status).toBe(200);
	});

	it("should pass options through to LumenClient", async () => {
		mockRun.mockResolvedValue({
			content: "ok",
			model: "custom-model",
			provider: "openrouter",
			usage: { input: 1, output: 1, cost: 0 },
			cached: false,
		});

		const app = createApp();
		await app.request(
			post({
				task: "generation",
				input: "test",
				tenant_id: "tenant_abc",
				tier: "oak",
				options: {
					model: "custom-model",
					max_tokens: 500,
					temperature: 0.5,
					skip_quota: true,
					skip_pii_scrub: true,
				},
			}),
			undefined,
			mockEnv,
		);

		expect(mockRun).toHaveBeenCalledWith(
			expect.objectContaining({
				task: "generation",
				input: "test",
				tenant: "tenant_abc",
				options: expect.objectContaining({
					model: "custom-model",
					maxTokens: 500,
					temperature: 0.5,
					skipQuota: true,
					skipPiiScrub: true,
				}),
			}),
			"oak",
		);
	});

	it("should return error envelope when LumenClient throws", async () => {
		mockRun.mockRejectedValue({ code: "QUOTA_EXCEEDED", message: "Daily limit reached" });

		const app = createApp();
		const res = await app.request(post({ task: "generation", input: "test" }), undefined, mockEnv);

		expect(res.status).toBe(429);
		const body: LumenWorkerResponse = (await res.json()) as any;
		expect(body.success).toBe(false);
		expect(body.error?.code).toBe("QUOTA_EXCEEDED");
		expect(body.meta?.task).toBe("generation");
	});

	it("should validate tier enum values", async () => {
		const app = createApp();
		const res = await app.request(
			post({ task: "generation", input: "test", tier: "platinum" }),
			undefined,
			mockEnv,
		);

		expect(res.status).toBe(400);
		const body: LumenWorkerResponse = (await res.json()) as any;
		expect(body.error?.code).toBe("INVALID_PARAMS");
	});

	it("should accept all valid task types", async () => {
		mockRun.mockResolvedValue({
			content: "ok",
			model: "m",
			provider: "p",
			usage: { input: 1, output: 1, cost: 0 },
			cached: false,
		});

		const app = createApp();
		const validTasks = [
			"generation",
			"chat",
			"summary",
			"code",
			"image",
			"moderation",
			"embedding",
			"transcription",
		];

		for (const task of validTasks) {
			const res = await app.request(post({ task, input: "test" }), undefined, mockEnv);
			expect(res.status).toBe(200);
		}
	});
});
