/**
 * Authentication Middleware Tests
 *
 * Tests API key validation including:
 * - Valid key → passes to next
 * - Missing key → 401
 * - Invalid key → 401
 * - Missing env config → 500
 * - Timing-safe comparison (no length-leak via padding)
 */

import { describe, it, expect, vi } from "vitest";
import { Hono } from "hono";
import type { Env, LumenWorkerResponse } from "../types";
import { apiKeyAuth } from "./middleware";

const TEST_API_KEY = "grove-test-key-2026";

function createTestApp() {
	const app = new Hono<{ Bindings: Env }>();

	app.use("/protected/*", apiKeyAuth);
	app.get("/protected/resource", (c) => c.json({ data: "secret" }));

	return app;
}

function createEnv(apiKey?: string): Env {
	return {
		DB: {} as D1Database,
		AI: {} as Ai,
		WARDEN: { fetch: vi.fn() },
		RATE_LIMITS: {} as KVNamespace,
		LUMEN_API_KEY: apiKey ?? TEST_API_KEY,
		WARDEN_API_KEY: "test-warden-key",
	} as Env;
}

/**
 * Hono's app.request() signature: (input, requestInit?, Env?, executionCtx?)
 * When passing a Request object, env must be the THIRD argument —
 * the second slot is always RequestInit (for overriding headers/method).
 */
function requestWithEnv(apiKey: string | undefined, env: Env) {
	const headers: Record<string, string> = { "Content-Type": "application/json" };
	if (apiKey !== undefined) headers["X-API-Key"] = apiKey;
	const req = new Request("http://localhost/protected/resource", { headers });
	return { req, env };
}

describe("apiKeyAuth middleware", () => {
	it("should pass with valid API key", async () => {
		const app = createTestApp();
		const { req, env } = requestWithEnv(TEST_API_KEY, createEnv());
		const res = await app.request(req, undefined, env);

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data).toBe("secret");
	});

	it("should return 401 when X-API-Key header is missing", async () => {
		const app = createTestApp();
		const req = new Request("http://localhost/protected/resource");
		const res = await app.request(req, undefined, createEnv());

		expect(res.status).toBe(401);
		const body: LumenWorkerResponse = await res.json();
		expect(body.success).toBe(false);
		expect(body.error?.code).toBe("AUTH_REQUIRED");
		expect(body.error?.message).toBe("Missing X-API-Key header");
	});

	it("should return 401 when API key is invalid", async () => {
		const app = createTestApp();
		const { req, env } = requestWithEnv("wrong-key", createEnv());
		const res = await app.request(req, undefined, env);

		expect(res.status).toBe(401);
		const body: LumenWorkerResponse = await res.json();
		expect(body.success).toBe(false);
		expect(body.error?.code).toBe("AUTH_REQUIRED");
		expect(body.error?.message).toBe("Invalid API key");
	});

	it("should return 500 when LUMEN_API_KEY is not configured", async () => {
		const app = createTestApp();
		const env = createEnv("");
		env.LUMEN_API_KEY = "" as unknown as string;
		const { req } = requestWithEnv("any-key", env);
		const res = await app.request(req, undefined, env);

		expect(res.status).toBe(500);
		const body: LumenWorkerResponse = await res.json();
		expect(body.success).toBe(false);
		expect(body.error?.code).toBe("INTERNAL_ERROR");
		expect(body.error?.message).toBe("LUMEN_API_KEY not configured");
	});

	it("should reject keys of different length (timing-safe)", async () => {
		const app = createTestApp();
		// Key much shorter than expected — padding ensures constant-time comparison
		const { req, env } = requestWithEnv("x", createEnv());
		const res = await app.request(req, undefined, env);

		expect(res.status).toBe(401);
		const body: LumenWorkerResponse = await res.json();
		expect(body.error?.code).toBe("AUTH_REQUIRED");
	});

	it("should reject keys of longer length (timing-safe)", async () => {
		const app = createTestApp();
		const longKey = TEST_API_KEY + "extra-padding-bytes-that-should-fail";
		const { req, env } = requestWithEnv(longKey, createEnv());
		const res = await app.request(req, undefined, env);

		expect(res.status).toBe(401);
	});

	it("should reject empty API key header", async () => {
		const app = createTestApp();
		const { req, env } = requestWithEnv("", createEnv());
		const res = await app.request(req, undefined, env);

		// Empty string is falsy in Hono header getter, so treated as missing
		expect(res.status).toBe(401);
	});
});
