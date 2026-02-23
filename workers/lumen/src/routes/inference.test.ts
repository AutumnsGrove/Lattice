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
		const res = await app.request(post({ task: "generation", input: "Write a haiku" }), mockEnv);

		expect(res.status).toBe(200);
		const body: LumenWorkerResponse = await res.json();
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

	it("should return 400 for invalid JSON body", async () => {
		const app = createApp();
		const res = await app.request(postRaw("not json {{{"), mockEnv);

		expect(res.status).toBe(400);
		const body: LumenWorkerResponse = await res.json();
		expect(body.success).toBe(false);
		expect(body.error?.code).toBe("INVALID_REQUEST");
		expect(body.error?.message).toBe("Invalid JSON body");
	});

	it("should return 400 for missing required fields", async () => {
		const app = createApp();
		const res = await app.request(post({}), mockEnv);

		expect(res.status).toBe(400);
		const body: LumenWorkerResponse = await res.json();
		expect(body.success).toBe(false);
		expect(body.error?.code).toBe("INVALID_PARAMS");
		expect(body.error?.message).toContain("task");
	});

	it("should return 400 for invalid task type", async () => {
		const app = createApp();
		const res = await app.request(post({ task: "not-a-real-task", input: "test" }), mockEnv);

		expect(res.status).toBe(400);
		const body: LumenWorkerResponse = await res.json();
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
		const res = await app.request(post({ task: "generation", input: "test" }), mockEnv);

		expect(res.status).toBe(429);
		const body: LumenWorkerResponse = await res.json();
		expect(body.success).toBe(false);
		expect(body.error?.code).toBe("QUOTA_EXCEEDED");
		expect(body.meta?.task).toBe("generation");
	});

	it("should validate tier enum values", async () => {
		const app = createApp();
		const res = await app.request(
			post({ task: "generation", input: "test", tier: "platinum" }),
			mockEnv,
		);

		expect(res.status).toBe(400);
		const body: LumenWorkerResponse = await res.json();
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
			const res = await app.request(post({ task, input: "test" }), mockEnv);
			expect(res.status).toBe(200);
		}
	});
});
