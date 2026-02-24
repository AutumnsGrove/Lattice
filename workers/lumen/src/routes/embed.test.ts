/**
 * POST /embed Route Tests
 *
 * Tests embedding request validation, response envelope shape,
 * and error handling.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import type { Env, LumenWorkerResponse } from "../types";
import { embed } from "./embed";

const mockEmbed = vi.fn();

vi.mock("../lib/client-factory", () => ({
	createLumenClientForWorker: vi.fn(() => ({
		run: vi.fn(),
		embed: mockEmbed,
		moderate: vi.fn(),
		transcribe: vi.fn(),
	})),
}));

function createApp() {
	const app = new Hono<{ Bindings: Env }>();
	app.route("/embed", embed);
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
	return new Request("http://localhost/embed", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
}

describe("POST /embed", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return success envelope for valid request", async () => {
		mockEmbed.mockResolvedValue({
			embeddings: [[0.1, 0.2, 0.3]],
			model: "@cf/bge-small-en-v1.5",
			tokens: 5,
		});

		const app = createApp();
		const res = await app.request(post({ input: "Hello world" }), undefined, mockEnv);

		expect(res.status).toBe(200);
		const body: LumenWorkerResponse = await res.json();
		expect(body.success).toBe(true);
		expect(body.data).toEqual({
			embeddings: [[0.1, 0.2, 0.3]],
			model: "@cf/bge-small-en-v1.5",
			tokens: 5,
		});
		expect(body.meta?.task).toBe("embedding");
		expect(body.meta?.provider).toBe("cloudflare-ai");
	});

	it("should accept string array input", async () => {
		mockEmbed.mockResolvedValue({
			embeddings: [[0.1], [0.2]],
			model: "@cf/bge-small-en-v1.5",
			tokens: 10,
		});

		const app = createApp();
		const res = await app.request(post({ input: ["Hello", "World"] }), undefined, mockEnv);

		expect(res.status).toBe(200);
	});

	it("should return 400 for invalid JSON body", async () => {
		const app = createApp();
		const res = await app.request(
			new Request("http://localhost/embed", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: "not json",
			}),
			undefined,
			mockEnv,
		);

		expect(res.status).toBe(400);
		const body: LumenWorkerResponse = await res.json();
		expect(body.error?.code).toBe("INVALID_REQUEST");
		expect(body.error?.message).toBe("Invalid JSON body");
	});

	it("should return 400 for missing input field", async () => {
		const app = createApp();
		const res = await app.request(post({}), undefined, mockEnv);

		expect(res.status).toBe(400);
		const body: LumenWorkerResponse = await res.json();
		expect(body.error?.code).toBe("INVALID_PARAMS");
		expect(body.error?.message).toContain("input");
	});

	it("should pass tenant_id and tier to LumenClient", async () => {
		mockEmbed.mockResolvedValue({
			embeddings: [[0.1]],
			model: "m",
			tokens: 1,
		});

		const app = createApp();
		await app.request(
			post({ input: "test", tenant_id: "t_123", tier: "seedling" }),
			undefined,
			mockEnv,
		);

		expect(mockEmbed).toHaveBeenCalledWith(
			expect.objectContaining({
				input: "test",
				tenant: "t_123",
			}),
			"seedling",
		);
	});

	it("should return error envelope when LumenClient throws", async () => {
		mockEmbed.mockRejectedValue({ code: "PROVIDER_ERROR", message: "AI binding failed" });

		const app = createApp();
		const res = await app.request(post({ input: "test" }), undefined, mockEnv);

		expect(res.status).toBe(500);
		const body: LumenWorkerResponse = await res.json();
		expect(body.success).toBe(false);
		expect(body.error?.code).toBe("PROVIDER_ERROR");
		expect(body.meta?.task).toBe("embedding");
	});

	it("should pass optional model override", async () => {
		mockEmbed.mockResolvedValue({
			embeddings: [[0.1]],
			model: "custom-embed",
			tokens: 1,
		});

		const app = createApp();
		await app.request(post({ input: "test", model: "custom-embed" }), undefined, mockEnv);

		expect(mockEmbed).toHaveBeenCalledWith(
			expect.objectContaining({ model: "custom-embed" }),
			undefined,
		);
	});
});
