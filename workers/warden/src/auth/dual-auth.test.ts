/**
 * Dual Authentication Middleware Integration Tests
 *
 * Tests both authentication paths through a real Hono app:
 * 1. X-API-Key header → service binding
 * 2. agent.id + nonce + signature in body → challenge-response
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import type { Env } from "../types";
import { dualAuth, type AuthVariables } from "./dual-auth";
import {
	createMockGroveDB,
	createMockKV,
	createMockEnv,
	createTestAgent,
	resetTestCounters,
	createMockGroveContext,
} from "../test-helpers";

// Mock the logging module to prevent DB writes during tests
vi.mock("../lib/logging", () => ({
	logAuditEvent: vi.fn().mockResolvedValue(undefined),
	updateAgentUsage: vi.fn().mockResolvedValue(undefined),
}));

function createTestApp(db: ReturnType<typeof createMockGroveDB>) {
	const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

	// Wire GroveContext manually (replaces groveInfraMiddleware)
	app.use("*", async (c, next) => {
		c.set("ctx" as any, createMockGroveContext(db));
		await next();
	});

	// Apply dual auth
	app.use("/protected/*", dualAuth);

	// Protected endpoint that returns auth info
	app.post("/protected/test", (c) => {
		const agent = c.get("agent");
		const authMethod = c.get("authMethod");
		return c.json({ agent: { id: agent.id, name: agent.name }, authMethod });
	});

	return app;
}

describe("dualAuth — API key path (service binding)", () => {
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

	it("should authenticate with valid X-API-Key", async () => {
		const agent = createTestAgent();
		db._prepared._bound.first.mockResolvedValueOnce(agent);

		const app = createTestApp(db);
		const req = new Request("http://localhost/protected/test", {
			method: "POST",
			headers: { "Content-Type": "application/json", "X-API-Key": "valid-key" },
			body: JSON.stringify({}),
		});

		const res = await app.request(req, undefined, env);

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.agent.id).toBe(agent.id);
		expect(body.authMethod).toBe("service_binding");
	});

	it("should reject invalid API key with 401", async () => {
		db._prepared._bound.first.mockResolvedValueOnce(null);

		const app = createTestApp(db);
		const req = new Request("http://localhost/protected/test", {
			method: "POST",
			headers: { "Content-Type": "application/json", "X-API-Key": "invalid-key" },
			body: JSON.stringify({}),
		});

		const res = await app.request(req, undefined, env);

		expect(res.status).toBe(401);
		const body = await res.json();
		expect(body.error.code).toBe("AUTH_FAILED");
	});
});

describe("dualAuth — challenge-response path", () => {
	let db: ReturnType<typeof createMockGroveDB>;
	let env: Env;
	let nonces: ReturnType<typeof createMockKV>;

	beforeEach(() => {
		resetTestCounters();
		vi.clearAllMocks();
		db = createMockGroveDB();
		nonces = createMockKV();
		env = createMockEnv({
			NONCES: nonces as unknown as KVNamespace,
		});
	});

	it("should reject when no auth credentials provided (no header, no body agent)", async () => {
		const app = createTestApp(db);
		const req = new Request("http://localhost/protected/test", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ service: "github", action: "list_repos" }),
		});

		const res = await app.request(req, undefined, env);

		expect(res.status).toBe(401);
		const body = await res.json();
		expect(body.error.code).toBe("AUTH_REQUIRED");
	});

	it("should reject partial agent credentials (missing signature)", async () => {
		const app = createTestApp(db);
		const req = new Request("http://localhost/protected/test", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				agent: { id: "agent-1", nonce: "some-nonce" },
				// missing signature
			}),
		});

		const res = await app.request(req, undefined, env);

		expect(res.status).toBe(401);
		const body = await res.json();
		expect(body.error.code).toBe("AUTH_REQUIRED");
	});

	it("should reject when agent not found", async () => {
		// DB returns null for agent lookup
		db._prepared._bound.first.mockResolvedValueOnce(null);

		const app = createTestApp(db);
		const req = new Request("http://localhost/protected/test", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				agent: { id: "nonexistent", nonce: "n", signature: "s" },
			}),
		});

		const res = await app.request(req, undefined, env);

		expect(res.status).toBe(401);
		const body = await res.json();
		expect(body.error.code).toBe("AGENT_NOT_FOUND");
	});

	it("should reject invalid/expired nonce", async () => {
		const agent = createTestAgent();
		db._prepared._bound.first.mockResolvedValueOnce(agent);
		// Nonce not in KV (expired or already used)
		nonces.get.mockResolvedValueOnce(null);

		const app = createTestApp(db);
		const req = new Request("http://localhost/protected/test", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				agent: { id: agent.id, nonce: "expired-nonce", signature: "any" },
			}),
		});

		const res = await app.request(req, undefined, env);

		expect(res.status).toBe(401);
		const body = await res.json();
		expect(body.error.code).toBe("NONCE_INVALID");
	});

	it("should reject invalid HMAC signature", async () => {
		const agent = createTestAgent({ secret_hash: "the-real-secret" });
		db._prepared._bound.first.mockResolvedValueOnce(agent);
		// Nonce is valid
		nonces.get.mockResolvedValueOnce("1");

		const app = createTestApp(db);
		const req = new Request("http://localhost/protected/test", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				agent: { id: agent.id, nonce: "valid-nonce", signature: "wrong-signature" },
			}),
		});

		const res = await app.request(req, undefined, env);

		expect(res.status).toBe(401);
		const body = await res.json();
		expect(body.error.code).toBe("SIGNATURE_INVALID");
	});

	it("should reject non-JSON body with 400", async () => {
		const app = createTestApp(db);
		const req = new Request("http://localhost/protected/test", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: "not json",
		});

		const res = await app.request(req, undefined, env);

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error.code).toBe("INVALID_BODY");
	});

	it("should log nonce reuse as audit event", async () => {
		const { logAuditEvent } = await import("../lib/logging");

		const agent = createTestAgent();
		db._prepared._bound.first.mockResolvedValueOnce(agent);
		nonces.get.mockResolvedValueOnce(null); // Nonce reuse

		const app = createTestApp(db);
		const req = new Request("http://localhost/protected/test", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				agent: { id: agent.id, nonce: "reused-nonce", signature: "sig" },
			}),
		});

		await app.request(req, undefined, env);

		expect(logAuditEvent).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				event_type: "nonce_reuse",
				agent_id: agent.id,
				error_code: "NONCE_INVALID",
			}),
		);
	});
});
