/**
 * POST /request Route Tests
 *
 * Tests the main proxy route: the full pipeline of
 * auth → scope → rate limit → params → credential → execute → scrub → respond.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import type { Env } from "../types";
import { requestRoute } from "./request";
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

// ── Module mocks ──────────────────────────────────────────────────

// Bypass dualAuth — we set agent/authMethod manually
vi.mock("../auth/dual-auth", async (importOriginal) => {
	const original = await importOriginal<typeof import("../auth/dual-auth")>();
	return {
		...original,
		dualAuth: vi.fn((c: any, next: any) => next()),
	};
});

vi.mock("../lib/logging", () => ({
	logAuditEvent: vi.fn().mockResolvedValue(undefined),
	updateAgentUsage: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../lib/credentials", () => ({
	resolveCredential: vi.fn(),
}));

vi.mock("../lib/execute", () => ({
	executeUpstream: vi.fn(),
}));

vi.mock("../middleware/rate-limit", () => ({
	checkRateLimit: vi
		.fn()
		.mockResolvedValue({ allowed: true, remaining: 59, limit: 60, resetAt: 0 }),
	checkServiceRateLimit: vi
		.fn()
		.mockResolvedValue({ allowed: true, remaining: 4999, limit: 5000, resetAt: 0 }),
}));

// Register test services so getService() returns something
vi.mock("../services", () => {
	const { z } = require("zod");

	const mockActions: Record<string, any> = {
		list_repos: {
			schema: z.object({ owner: z.string().optional() }),
			buildRequest: (params: any, cred: string) => ({
				url: "https://api.github.com/user/repos",
				method: "GET",
				headers: { Authorization: `Bearer ${cred}` },
			}),
		},
		create_issue: {
			schema: z.object({ owner: z.string(), repo: z.string(), title: z.string() }),
			buildRequest: (params: any, cred: string) => ({
				url: `https://api.github.com/repos/${params.owner}/${params.repo}/issues`,
				method: "POST",
				headers: { Authorization: `Bearer ${cred}`, "Content-Type": "application/json" },
				body: JSON.stringify({ title: params.title }),
			}),
		},
	};

	return {
		getService: vi.fn((name: string) => {
			if (name === "github") {
				return { name: "github", baseUrl: "https://api.github.com", actions: mockActions };
			}
			return undefined;
		}),
		listServices: vi.fn(() => ["github"]),
	};
});

// ── Test harness ──────────────────────────────────────────────────

function createTestApp(
	db: ReturnType<typeof createMockGroveDB>,
	agent: ReturnType<typeof createTestAgent>,
	authMethod: "service_binding" | "challenge_response" = "service_binding",
) {
	const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

	app.use("*", async (c, next) => {
		c.set("ctx" as any, createMockGroveContext(db));
		c.set("agent" as any, agent);
		c.set("authMethod" as any, authMethod);
		await next();
	});

	app.route("/request", requestRoute);
	return app;
}

describe("POST /request", () => {
	let db: ReturnType<typeof createMockGroveDB>;
	let env: Env;

	beforeEach(async () => {
		resetTestCounters();
		vi.clearAllMocks();
		db = createMockGroveDB();
		env = createMockEnv({
			RATE_LIMITS: createMockKV() as unknown as KVNamespace,
		});

		// Default: credential resolves, upstream succeeds
		const { resolveCredential } = await import("../lib/credentials");
		(resolveCredential as any).mockResolvedValue({ value: "test-token", source: "global" });

		const { executeUpstream } = await import("../lib/execute");
		(executeUpstream as any).mockResolvedValue({
			response: { success: true, data: { repos: [] } },
			latencyMs: 50,
			status: 200,
		});
	});

	// ── Happy path ────────────────────────────────────────────────

	it("should proxy a valid request and return scrubbed response", async () => {
		const agent = createTestAgent({ scopes: JSON.stringify(["github:read"]) });
		const app = createTestApp(db, agent);

		const req = jsonRequest("/request", {
			service: "github",
			action: "list_repos",
			params: {},
		});
		const res = await app.request(req, undefined, env, mockExecutionCtx);

		expect(res.status).toBe(200);
		const body = (await res.json()) as any;
		expect(body.success).toBe(true);
		expect(body.data).toBeDefined();
		expect(body.meta.service).toBe("github");
		expect(body.meta.action).toBe("list_repos");
		expect(body.meta.latencyMs).toBeGreaterThanOrEqual(0);
	});

	// ── Service validation ────────────────────────────────────────

	it("should reject unknown service", async () => {
		const agent = createTestAgent({ scopes: JSON.stringify(["*:*"]) });
		const app = createTestApp(db, agent);

		const req = jsonRequest("/request", {
			service: "nonexistent_service",
			action: "do_thing",
			params: {},
		});
		const res = await app.request(req, undefined, env, mockExecutionCtx);

		expect(res.status).toBe(400);
		const body = (await res.json()) as any;
		expect(body.error.code).toBe("UNKNOWN_SERVICE");
	});

	it("should reject unknown action for valid service", async () => {
		const agent = createTestAgent({ scopes: JSON.stringify(["github:*"]) });
		const app = createTestApp(db, agent);

		const req = jsonRequest("/request", {
			service: "github",
			action: "nonexistent_action",
			params: {},
		});
		const res = await app.request(req, undefined, env, mockExecutionCtx);

		expect(res.status).toBe(400);
		const body = (await res.json()) as any;
		expect(body.error.code).toBe("UNKNOWN_ACTION");
	});

	// ── Scope validation ──────────────────────────────────────────

	it("should reject when agent lacks required scope", async () => {
		const agent = createTestAgent({ scopes: JSON.stringify(["tavily:read"]) });
		const app = createTestApp(db, agent);

		const req = jsonRequest("/request", {
			service: "github",
			action: "list_repos",
			params: {},
		});
		const res = await app.request(req, undefined, env, mockExecutionCtx);

		expect(res.status).toBe(403);
		const body = (await res.json()) as any;
		expect(body.error.code).toBe("SCOPE_DENIED");
	});

	it("should log scope denial as audit event", async () => {
		const { logAuditEvent } = await import("../lib/logging");
		const agent = createTestAgent({ scopes: JSON.stringify([]) });
		const app = createTestApp(db, agent);

		const req = jsonRequest("/request", {
			service: "github",
			action: "list_repos",
			params: {},
		});
		await app.request(req, undefined, env, mockExecutionCtx);

		expect(logAuditEvent).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				event_type: "scope_denial",
				error_code: "SCOPE_DENIED",
			}),
		);
	});

	// ── Rate limiting ─────────────────────────────────────────────

	it("should reject when per-agent rate limit exceeded", async () => {
		const { checkRateLimit } = await import("../middleware/rate-limit");
		(checkRateLimit as any).mockResolvedValueOnce({
			allowed: false,
			remaining: 0,
			limit: 60,
			resetAt: 9999,
		});

		const agent = createTestAgent({ scopes: JSON.stringify(["github:read"]) });
		const app = createTestApp(db, agent);

		const req = jsonRequest("/request", {
			service: "github",
			action: "list_repos",
			params: {},
		});
		const res = await app.request(req, undefined, env, mockExecutionCtx);

		expect(res.status).toBe(429);
		const body = (await res.json()) as any;
		expect(body.error.code).toBe("RATE_LIMITED");
	});

	it("should reject when per-service rate limit exceeded", async () => {
		const { checkServiceRateLimit } = await import("../middleware/rate-limit");
		(checkServiceRateLimit as any).mockResolvedValueOnce({
			allowed: false,
			remaining: 0,
			limit: 5000,
			resetAt: 9999,
		});

		const agent = createTestAgent({ scopes: JSON.stringify(["github:read"]) });
		const app = createTestApp(db, agent);

		const req = jsonRequest("/request", {
			service: "github",
			action: "list_repos",
			params: {},
		});
		const res = await app.request(req, undefined, env, mockExecutionCtx);

		expect(res.status).toBe(429);
	});

	// ── Parameter validation ──────────────────────────────────────

	it("should reject invalid params", async () => {
		const agent = createTestAgent({ scopes: JSON.stringify(["github:write"]) });
		const app = createTestApp(db, agent);

		// create_issue requires owner, repo, title
		const req = jsonRequest("/request", {
			service: "github",
			action: "create_issue",
			params: { owner: "test" }, // missing repo and title
		});
		const res = await app.request(req, undefined, env, mockExecutionCtx);

		expect(res.status).toBe(400);
		const body = (await res.json()) as any;
		expect(body.error.code).toBe("INVALID_PARAMS");
	});

	// ── Credential resolution ─────────────────────────────────────

	it("should return 503 when no credential available", async () => {
		const { resolveCredential } = await import("../lib/credentials");
		(resolveCredential as any).mockResolvedValueOnce(null);

		const agent = createTestAgent({ scopes: JSON.stringify(["github:read"]) });
		const app = createTestApp(db, agent);

		const req = jsonRequest("/request", {
			service: "github",
			action: "list_repos",
			params: {},
		});
		const res = await app.request(req, undefined, env, mockExecutionCtx);

		expect(res.status).toBe(503);
		const body = (await res.json()) as any;
		expect(body.error.code).toBe("NO_CREDENTIAL");
	});

	it("should pass tenant_id to credential resolution", async () => {
		const { resolveCredential } = await import("../lib/credentials");

		const agent = createTestAgent({ scopes: JSON.stringify(["github:read"]) });
		const app = createTestApp(db, agent);

		const req = jsonRequest("/request", {
			service: "github",
			action: "list_repos",
			params: {},
			tenant_id: "tenant-abc",
		});
		await app.request(req, undefined, env, mockExecutionCtx);

		expect(resolveCredential).toHaveBeenCalledWith(expect.anything(), "github", "tenant-abc");
	});

	// ── Upstream error handling ───────────────────────────────────

	it("should forward upstream errors with appropriate status", async () => {
		const { executeUpstream } = await import("../lib/execute");
		(executeUpstream as any).mockResolvedValueOnce({
			response: {
				success: false,
				error: { code: "UPSTREAM_404", message: "Not Found" },
			},
			latencyMs: 30,
			status: 404,
		});

		const agent = createTestAgent({ scopes: JSON.stringify(["github:read"]) });
		const app = createTestApp(db, agent);

		const req = jsonRequest("/request", {
			service: "github",
			action: "list_repos",
			params: {},
		});
		const res = await app.request(req, undefined, env, mockExecutionCtx);

		expect(res.status).toBe(404);
		const body = (await res.json()) as any;
		expect(body.success).toBe(false);
	});

	// ── Body validation ───────────────────────────────────────────

	it("should reject non-JSON body", async () => {
		const agent = createTestAgent({ scopes: JSON.stringify(["github:read"]) });
		const app = createTestApp(db, agent);

		const req = new Request("http://localhost/request", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: "not json",
		});
		const res = await app.request(req, undefined, env, mockExecutionCtx);

		expect(res.status).toBe(400);
		const body = (await res.json()) as any;
		expect(body.error.code).toBe("INVALID_BODY");
	});

	// ── Audit logging ─────────────────────────────────────────────

	it("should fire audit log and usage update on success", async () => {
		const { logAuditEvent, updateAgentUsage } = await import("../lib/logging");

		const agent = createTestAgent({ scopes: JSON.stringify(["github:read"]) });
		const app = createTestApp(db, agent);

		const req = jsonRequest("/request", {
			service: "github",
			action: "list_repos",
			params: {},
		});
		await app.request(req, undefined, env, mockExecutionCtx);

		expect(logAuditEvent).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				event_type: "request",
				target_service: "github",
				action: "list_repos",
				auth_result: "success",
			}),
		);
		expect(updateAgentUsage).toHaveBeenCalledWith(expect.anything(), agent.id);
	});
});
