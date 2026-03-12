/**
 * POST /nonce Route Tests
 *
 * Tests nonce request endpoint: agent validation, nonce generation,
 * and error handling.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import type { Env, AppVariables } from "../types";
import { nonceRoute } from "./nonce";
import {
	createMockGroveDB,
	createMockKV,
	createMockEnv,
	createMockGroveContext,
	resetTestCounters,
	jsonRequest,
} from "../test-helpers";

function createTestApp(db: ReturnType<typeof createMockGroveDB>) {
	const app = new Hono<{ Bindings: Env; Variables: AppVariables }>();
	app.use("*", async (c, next) => {
		c.set("ctx" as any, createMockGroveContext(db));
		await next();
	});
	app.route("/nonce", nonceRoute);
	return app;
}

describe("POST /nonce", () => {
	let db: ReturnType<typeof createMockGroveDB>;
	let env: Env;

	beforeEach(() => {
		resetTestCounters();
		vi.clearAllMocks();
		db = createMockGroveDB();
		env = createMockEnv({
			NONCES: createMockKV() as unknown as KVNamespace,
		});
	});

	it("should return nonce for valid enabled agent", async () => {
		// Agent exists and is enabled
		db._prepared._bound.first.mockResolvedValueOnce({ id: "wdn_agent1" });

		const app = createTestApp(db);
		const req = jsonRequest("/nonce", { agentId: "wdn_agent1" });
		const res = await app.request(req, undefined, env);

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.data.nonce).toBeDefined();
		expect(typeof body.data.nonce).toBe("string");
	});

	it("should return 404 for unknown agent", async () => {
		// Agent not found
		db._prepared._bound.first.mockResolvedValueOnce(null);

		const app = createTestApp(db);
		const req = jsonRequest("/nonce", { agentId: "nonexistent" });
		const res = await app.request(req, undefined, env);

		expect(res.status).toBe(404);
		const body = await res.json();
		expect(body.error.code).toBe("AGENT_NOT_FOUND");
	});

	it("should return 400 when agentId is missing", async () => {
		const app = createTestApp(db);
		const req = jsonRequest("/nonce", {});
		const res = await app.request(req, undefined, env);

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error.code).toBe("MISSING_FIELD");
	});

	it("should return 400 for non-JSON body", async () => {
		const app = createTestApp(db);
		const req = new Request("http://localhost/nonce", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: "not json",
		});
		const res = await app.request(req, undefined, env);

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error.code).toBe("INVALID_BODY");
	});
});
