/**
 * POST /resolve Route Tests
 *
 * Tests credential resolution endpoint: auth method gating,
 * scope validation, credential fallthrough, and error handling.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import type { Env } from "../types";
import { resolveRoute } from "./resolve";
import { type AuthVariables } from "../auth/dual-auth";
import {
	createMockGroveDB,
	createMockKV,
	createMockEnv,
	createMockGroveContext,
	createTestAgent,
	resetTestCounters,
	jsonRequest,
} from "../test-helpers";

/** Mock ExecutionContext for c.executionCtx.waitUntil() */
const mockExecutionCtx = { waitUntil: vi.fn(), passThroughOnException: vi.fn(), props: {} };

// Mock dual auth to control authentication
vi.mock("../auth/dual-auth", async (importOriginal) => {
	const original = await importOriginal<typeof import("../auth/dual-auth")>();
	return {
		...original,
		// dualAuth will be bypassed — we wire agent/authMethod directly
		dualAuth: vi.fn((c: any, next: any) => next()),
	};
});

// Mock logging
vi.mock("../lib/logging", () => ({
	logAuditEvent: vi.fn().mockResolvedValue(undefined),
	updateAgentUsage: vi.fn().mockResolvedValue(undefined),
}));

// Mock credential resolution
vi.mock("../lib/credentials", () => ({
	resolveCredential: vi.fn(),
}));

function createTestApp(
	db: ReturnType<typeof createMockGroveDB>,
	agent: ReturnType<typeof createTestAgent>,
	authMethod: "service_binding" | "challenge_response",
) {
	const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

	// Wire context, agent, and authMethod
	app.use("*", async (c, next) => {
		c.set("ctx" as any, createMockGroveContext(db));
		c.set("agent" as any, agent);
		c.set("authMethod" as any, authMethod);
		await next();
	});

	app.route("/resolve", resolveRoute);
	return app;
}

describe("POST /resolve", () => {
	let db: ReturnType<typeof createMockGroveDB>;
	let env: Env;

	beforeEach(async () => {
		resetTestCounters();
		vi.clearAllMocks();
		db = createMockGroveDB();
		env = createMockEnv();

		// Reset mock execution context
		(env as any).executionCtx = { waitUntil: vi.fn() };
	});

	it("should reject challenge-response auth with 403", async () => {
		const agent = createTestAgent();
		const app = createTestApp(db, agent, "challenge_response");

		const req = jsonRequest("/resolve", { service: "github" });
		const res = await app.request(req, undefined, env, mockExecutionCtx);

		expect(res.status).toBe(403);
		const body = (await res.json()) as any;
		expect(body.error.code).toBe("AUTH_METHOD_DENIED");
	});

	it("should return credential for service-binding auth", async () => {
		const { resolveCredential } = await import("../lib/credentials");
		(resolveCredential as any).mockResolvedValueOnce({
			value: "github-token-123",
			source: "global",
		});

		const agent = createTestAgent({ scopes: JSON.stringify(["github:read"]) });
		const app = createTestApp(db, agent, "service_binding");

		const req = jsonRequest("/resolve", { service: "github" });
		const res = await app.request(req, undefined, env, mockExecutionCtx);

		expect(res.status).toBe(200);
		const body = (await res.json()) as any;
		expect(body.success).toBe(true);
		expect(body.data.credential).toBe("github-token-123");
		expect(body.data.source).toBe("global");
	});

	it("should return tenant credential when tenant_id provided", async () => {
		const { resolveCredential } = await import("../lib/credentials");
		(resolveCredential as any).mockResolvedValueOnce({
			value: "tenant-github-token",
			source: "tenant",
		});

		const agent = createTestAgent({ scopes: JSON.stringify(["github:read"]) });
		const app = createTestApp(db, agent, "service_binding");

		const req = jsonRequest("/resolve", { service: "github", tenant_id: "t-123" });
		const res = await app.request(req, undefined, env, mockExecutionCtx);

		expect(res.status).toBe(200);
		const body = (await res.json()) as any;
		expect(body.data.source).toBe("tenant");
	});

	it("should reject when agent has no scope for service", async () => {
		const agent = createTestAgent({ scopes: JSON.stringify(["tavily:read"]) });
		const app = createTestApp(db, agent, "service_binding");

		const req = jsonRequest("/resolve", { service: "github" });
		const res = await app.request(req, undefined, env, mockExecutionCtx);

		expect(res.status).toBe(403);
		const body = (await res.json()) as any;
		expect(body.error.code).toBe("SCOPE_DENIED");
	});

	it("should allow wildcard scope for service", async () => {
		const { resolveCredential } = await import("../lib/credentials");
		(resolveCredential as any).mockResolvedValueOnce({
			value: "token",
			source: "global",
		});

		const agent = createTestAgent({ scopes: JSON.stringify(["github:*"]) });
		const app = createTestApp(db, agent, "service_binding");

		const req = jsonRequest("/resolve", { service: "github" });
		const res = await app.request(req, undefined, env, mockExecutionCtx);

		expect(res.status).toBe(200);
	});

	it("should allow global wildcard scope", async () => {
		const { resolveCredential } = await import("../lib/credentials");
		(resolveCredential as any).mockResolvedValueOnce({
			value: "token",
			source: "global",
		});

		const agent = createTestAgent({ scopes: JSON.stringify(["*:*"]) });
		const app = createTestApp(db, agent, "service_binding");

		const req = jsonRequest("/resolve", { service: "stripe" });
		const res = await app.request(req, undefined, env, mockExecutionCtx);

		expect(res.status).toBe(200);
	});

	it("should return 503 when no credential available", async () => {
		const { resolveCredential } = await import("../lib/credentials");
		(resolveCredential as any).mockResolvedValueOnce(null);

		const agent = createTestAgent({ scopes: JSON.stringify(["github:read"]) });
		const app = createTestApp(db, agent, "service_binding");

		const req = jsonRequest("/resolve", { service: "github" });
		const res = await app.request(req, undefined, env, mockExecutionCtx);

		expect(res.status).toBe(503);
		const body = (await res.json()) as any;
		expect(body.error.code).toBe("NO_CREDENTIAL");
	});

	it("should reject invalid service name", async () => {
		const agent = createTestAgent({ scopes: JSON.stringify(["*:*"]) });
		const app = createTestApp(db, agent, "service_binding");

		const req = jsonRequest("/resolve", { service: "invalid_service" });
		const res = await app.request(req, undefined, env, mockExecutionCtx);

		expect(res.status).toBe(400);
		const body = (await res.json()) as any;
		expect(body.error.code).toBe("INVALID_PARAMS");
	});

	it("should reject non-JSON body", async () => {
		const agent = createTestAgent();
		const app = createTestApp(db, agent, "service_binding");

		const req = new Request("http://localhost/resolve", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: "not json",
		});
		const res = await app.request(req, undefined, env, mockExecutionCtx);

		expect(res.status).toBe(400);
	});
});
