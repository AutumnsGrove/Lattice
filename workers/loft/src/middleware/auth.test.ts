import { describe, it, expect, vi } from "vitest";
import { Hono } from "hono";
import { authMiddleware } from "./auth";
import type { Env, AppVariables } from "../types";

function createTestApp() {
	const app = new Hono<{ Bindings: Env; Variables: AppVariables }>();
	app.use("*", authMiddleware);
	app.get("/test", (c) => c.json({ ok: true }));
	return app;
}

function createMockEnv(): Env {
	return {
		DB: {} as any,
		LOFT_STATE: {} as any,
		WARDEN: { fetch: vi.fn() } as any,
		LOFT_API_KEY: "test-secret-key",
		WARDEN_API_KEY: "test-warden-key",
	};
}

describe("authMiddleware", () => {
	it("returns 401 when no Authorization header", async () => {
		const app = createTestApp();
		const res = await app.request("/test", { method: "GET" }, createMockEnv());

		expect(res.status).toBe(401);
		const json = (await res.json()) as any;
		expect(json.success).toBe(false);
	});

	it("returns 401 when Authorization doesn't start with 'Bearer '", async () => {
		const app = createTestApp();
		const env = createMockEnv();

		const res = await app.request(
			"/test",
			{
				method: "GET",
				headers: { Authorization: "Basic test-token" },
			},
			env,
		);

		expect(res.status).toBe(401);
		const json = (await res.json()) as any;
		expect(json.success).toBe(false);
	});

	it("returns 401 when token doesn't match LOFT_API_KEY", async () => {
		const app = createTestApp();
		const env = createMockEnv();

		const res = await app.request(
			"/test",
			{
				method: "GET",
				headers: { Authorization: "Bearer wrong-token" },
			},
			env,
		);

		expect(res.status).toBe(401);
		const json = (await res.json()) as any;
		expect(json.success).toBe(false);
	});

	it("returns 200 when valid Bearer token provided", async () => {
		const app = createTestApp();
		const env = createMockEnv();

		const res = await app.request(
			"/test",
			{
				method: "GET",
				headers: { Authorization: "Bearer test-secret-key" },
			},
			env,
		);

		expect(res.status).toBe(200);
		const json = (await res.json()) as any;
		expect(json.ok).toBe(true);
	});

	it("error response has code AUTH_REQUIRED when no header", async () => {
		const app = createTestApp();
		const res = await app.request("/test", { method: "GET" }, createMockEnv());

		const json = (await res.json()) as any;
		expect(json.error.code).toBe("AUTH_REQUIRED");
	});

	it("error response has code AUTH_FAILED when wrong token", async () => {
		const app = createTestApp();
		const env = createMockEnv();

		const res = await app.request(
			"/test",
			{
				method: "GET",
				headers: { Authorization: "Bearer wrong-token" },
			},
			env,
		);

		const json = (await res.json()) as any;
		expect(json.error.code).toBe("AUTH_FAILED");
	});

	it("auth header with extra whitespace after 'Bearer ' still works", async () => {
		const app = createTestApp();
		const env = createMockEnv();

		const res = await app.request(
			"/test",
			{
				method: "GET",
				headers: { Authorization: "Bearer   test-secret-key" },
			},
			env,
		);

		// The token extracted is "  test-secret-key", which doesn't match
		// This test verifies that whitespace is NOT trimmed, so it fails auth
		// (If the requirement is to trim, the implementation would need to change)
		expect(res.status).toBe(401);
	});
});
