/**
 * POST /moderate Route Tests
 *
 * Tests content moderation request validation, provider derivation,
 * and response envelope shape.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import type { Env, LumenWorkerResponse } from "../types";
import { moderate } from "./moderate";

const mockModerate = vi.fn();

vi.mock("../lib/client-factory", () => ({
	createLumenClientForWorker: vi.fn(() => ({
		run: vi.fn(),
		embed: vi.fn(),
		moderate: mockModerate,
		transcribe: vi.fn(),
	})),
}));

function createApp() {
	const app = new Hono<{ Bindings: Env }>();
	app.route("/moderate", moderate);
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
	return new Request("http://localhost/moderate", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
}

describe("POST /moderate", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return success envelope for safe content", async () => {
		mockModerate.mockResolvedValue({
			safe: true,
			categories: [],
			confidence: 0.99,
			model: "@cf/meta-llama-guard",
		});

		const app = createApp();
		const res = await app.request(post({ content: "Hello world" }), mockEnv);

		expect(res.status).toBe(200);
		const body: LumenWorkerResponse = await res.json();
		expect(body.success).toBe(true);
		expect(body.data).toEqual({
			safe: true,
			categories: [],
			confidence: 0.99,
			model: "@cf/meta-llama-guard",
		});
		expect(body.meta?.task).toBe("moderation");
	});

	it("should return unsafe content detection", async () => {
		mockModerate.mockResolvedValue({
			safe: false,
			categories: ["hate", "violence"],
			confidence: 0.95,
			model: "@cf/meta-llama-guard",
		});

		const app = createApp();
		const res = await app.request(post({ content: "bad content" }), mockEnv);

		expect(res.status).toBe(200);
		const body: LumenWorkerResponse = await res.json();
		expect(body.data).toMatchObject({
			safe: false,
			categories: ["hate", "violence"],
		});
	});

	it("should derive cloudflare-ai provider from @ prefix models", async () => {
		mockModerate.mockResolvedValue({
			safe: true,
			categories: [],
			confidence: 0.99,
			model: "@cf/meta-llama-guard",
		});

		const app = createApp();
		const res = await app.request(post({ content: "test" }), mockEnv);
		const body: LumenWorkerResponse = await res.json();
		expect(body.meta?.provider).toBe("cloudflare-ai");
	});

	it("should derive openrouter provider from non-@ models", async () => {
		mockModerate.mockResolvedValue({
			safe: true,
			categories: [],
			confidence: 0.99,
			model: "meta-llama/guard-3",
		});

		const app = createApp();
		const res = await app.request(post({ content: "test" }), mockEnv);
		const body: LumenWorkerResponse = await res.json();
		expect(body.meta?.provider).toBe("openrouter");
	});

	it("should return 400 for invalid JSON body", async () => {
		const app = createApp();
		const res = await app.request(
			new Request("http://localhost/moderate", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: "broken json",
			}),
			mockEnv,
		);

		expect(res.status).toBe(400);
		const body: LumenWorkerResponse = await res.json();
		expect(body.error?.code).toBe("INVALID_REQUEST");
	});

	it("should return 400 for missing content field", async () => {
		const app = createApp();
		const res = await app.request(post({}), mockEnv);

		expect(res.status).toBe(400);
		const body: LumenWorkerResponse = await res.json();
		expect(body.error?.code).toBe("INVALID_PARAMS");
		expect(body.error?.message).toContain("content");
	});

	it("should return error envelope when LumenClient throws", async () => {
		mockModerate.mockRejectedValue({
			code: "ALL_PROVIDERS_FAILED",
			message: "No providers available",
		});

		const app = createApp();
		const res = await app.request(post({ content: "test" }), mockEnv);

		expect(res.status).toBe(500);
		const body: LumenWorkerResponse = await res.json();
		expect(body.success).toBe(false);
		expect(body.error?.code).toBe("ALL_PROVIDERS_FAILED");
		expect(body.meta?.task).toBe("moderation");
	});

	it("should pass tenant_id and tier to LumenClient", async () => {
		mockModerate.mockResolvedValue({
			safe: true,
			categories: [],
			confidence: 0.99,
			model: "m",
		});

		const app = createApp();
		await app.request(post({ content: "test", tenant_id: "t_abc", tier: "evergreen" }), mockEnv);

		expect(mockModerate).toHaveBeenCalledWith(
			expect.objectContaining({
				content: "test",
				tenant: "t_abc",
			}),
			"evergreen",
		);
	});
});
