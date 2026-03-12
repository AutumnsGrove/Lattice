/**
 * Admin Routes Tests
 *
 * Tests agent CRUD operations and audit log querying,
 * including admin authentication middleware.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import type { Env, AppVariables } from "../types";
import { adminRoutes } from "./admin";
import {
	createMockGroveDB,
	createMockEnv,
	createMockGroveContext,
	resetTestCounters,
	jsonRequest,
	getRequest,
	deleteRequest,
} from "../test-helpers";

function createTestApp(db: ReturnType<typeof createMockGroveDB>) {
	const app = new Hono<{ Bindings: Env; Variables: AppVariables }>();
	app.use("*", async (c, next) => {
		c.set("ctx" as any, createMockGroveContext(db));
		await next();
	});
	app.route("/admin", adminRoutes);
	return app;
}

describe("admin auth middleware", () => {
	let db: ReturnType<typeof createMockGroveDB>;
	let env: Env;

	beforeEach(() => {
		resetTestCounters();
		vi.clearAllMocks();
		db = createMockGroveDB();
		env = createMockEnv();
	});

	it("should allow requests with valid WARDEN_ADMIN_KEY via X-API-Key", async () => {
		db.execute.mockResolvedValueOnce({ results: [], meta: { changes: 0 } });

		const app = createTestApp(db);
		const req = getRequest("/admin/agents", { "X-API-Key": "test-admin-key" });
		const res = await app.request(req, undefined, env);

		expect(res.status).toBe(200);
	});

	it("should allow requests with valid key via Authorization Bearer", async () => {
		db.execute.mockResolvedValueOnce({ results: [], meta: { changes: 0 } });

		const app = createTestApp(db);
		const req = getRequest("/admin/agents", { Authorization: "Bearer test-admin-key" });
		const res = await app.request(req, undefined, env);

		expect(res.status).toBe(200);
	});

	it("should allow CF-Worker header (service binding)", async () => {
		db.execute.mockResolvedValueOnce({ results: [], meta: { changes: 0 } });

		const app = createTestApp(db);
		const req = getRequest("/admin/agents", { "CF-Worker": "grove-internal" });
		const res = await app.request(req, undefined, env);

		expect(res.status).toBe(200);
	});

	it("should reject requests without admin credentials", async () => {
		const app = createTestApp(db);
		const req = getRequest("/admin/agents");
		const res = await app.request(req, undefined, env);

		expect(res.status).toBe(401);
		const body = await res.json();
		expect(body.error.code).toBe("ADMIN_AUTH_REQUIRED");
	});

	it("should reject wrong admin key", async () => {
		const app = createTestApp(db);
		const req = getRequest("/admin/agents", { "X-API-Key": "wrong-key" });
		const res = await app.request(req, undefined, env);

		expect(res.status).toBe(401);
	});
});

describe("POST /admin/agents — agent registration", () => {
	let db: ReturnType<typeof createMockGroveDB>;
	let env: Env;

	beforeEach(() => {
		resetTestCounters();
		vi.clearAllMocks();
		db = createMockGroveDB();
		env = createMockEnv();
	});

	it("should create agent and return secret exactly once", async () => {
		const app = createTestApp(db);
		const req = jsonRequest(
			"/admin/agents",
			{
				name: "my-agent",
				owner: "autumn",
				scopes: ["github:read", "tavily:*"],
				rate_limit_rpm: 120,
				rate_limit_daily: 5000,
			},
			{ "X-API-Key": "test-admin-key" },
		);

		const res = await app.request(req, undefined, env);

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.data.id).toMatch(/^wdn_/);
		expect(body.data.secret).toMatch(/^wdn_sk_/);
		expect(body.data.name).toBe("my-agent");
		expect(body.data.owner).toBe("autumn");
		expect(body.data.scopes).toEqual(["github:read", "tavily:*"]);
		expect(body.data.rate_limit_rpm).toBe(120);
		expect(body.data.rate_limit_daily).toBe(5000);
	});

	it("should use default scopes when none provided", async () => {
		const app = createTestApp(db);
		const req = jsonRequest(
			"/admin/agents",
			{
				name: "default-agent",
				owner: "test",
			},
			{ "X-API-Key": "test-admin-key" },
		);

		const res = await app.request(req, undefined, env);

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data.scopes).toEqual(["github:read", "tavily:read"]);
	});

	it("should use default rate limits when none provided", async () => {
		const app = createTestApp(db);
		const req = jsonRequest(
			"/admin/agents",
			{
				name: "default-agent",
				owner: "test",
			},
			{ "X-API-Key": "test-admin-key" },
		);

		const res = await app.request(req, undefined, env);

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data.rate_limit_rpm).toBe(60);
		expect(body.data.rate_limit_daily).toBe(1000);
	});

	it("should reject when name is missing", async () => {
		const app = createTestApp(db);
		const req = jsonRequest(
			"/admin/agents",
			{
				owner: "test",
			},
			{ "X-API-Key": "test-admin-key" },
		);

		const res = await app.request(req, undefined, env);

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error.code).toBe("MISSING_FIELDS");
	});

	it("should reject when owner is missing", async () => {
		const app = createTestApp(db);
		const req = jsonRequest(
			"/admin/agents",
			{
				name: "test-agent",
			},
			{ "X-API-Key": "test-admin-key" },
		);

		const res = await app.request(req, undefined, env);

		expect(res.status).toBe(400);
	});

	it("should hash the secret before storing", async () => {
		const app = createTestApp(db);
		const req = jsonRequest(
			"/admin/agents",
			{
				name: "secure-agent",
				owner: "test",
			},
			{ "X-API-Key": "test-admin-key" },
		);

		const res = await app.request(req, undefined, env);
		const body = await res.json();

		// The execute call should contain a hashed secret, not the plaintext
		const executeCall = db.execute.mock.calls[0];
		const insertedHash = executeCall[1]![3]; // 4th param is secret_hash
		expect(insertedHash).not.toBe(body.data.secret);
		expect(typeof insertedHash).toBe("string");
		expect((insertedHash as string).length).toBe(64); // SHA-256 hex
	});

	it("should return 500 when DB insert fails", async () => {
		db.execute.mockRejectedValueOnce(new Error("DB down"));
		const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

		const app = createTestApp(db);
		const req = jsonRequest(
			"/admin/agents",
			{
				name: "agent",
				owner: "test",
			},
			{ "X-API-Key": "test-admin-key" },
		);

		const res = await app.request(req, undefined, env);

		expect(res.status).toBe(500);
		const body = await res.json();
		expect(body.error.code).toBe("CREATE_FAILED");

		consoleSpy.mockRestore();
	});
});

describe("GET /admin/agents — list agents", () => {
	let db: ReturnType<typeof createMockGroveDB>;
	let env: Env;

	beforeEach(() => {
		resetTestCounters();
		db = createMockGroveDB();
		env = createMockEnv();
	});

	it("should return list of agents with parsed scopes", async () => {
		db.execute.mockResolvedValueOnce({
			results: [
				{
					id: "wdn_1",
					name: "agent-1",
					owner: "test",
					scopes: '["github:read"]',
					rate_limit_rpm: 60,
					rate_limit_daily: 1000,
					enabled: 1,
					created_at: "2026-01-01",
					last_used_at: null,
					request_count: 0,
				},
			],
			meta: { changes: 0 },
		});

		const app = createTestApp(db);
		const req = getRequest("/admin/agents", { "X-API-Key": "test-admin-key" });
		const res = await app.request(req, undefined, env);

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.data.agents).toHaveLength(1);
		expect(body.data.agents[0].scopes).toEqual(["github:read"]);
		expect(body.data.agents[0].enabled).toBe(true);
		expect(body.data.total).toBe(1);
	});

	it("should not include secret_hash in response", async () => {
		db.execute.mockResolvedValueOnce({
			results: [{ id: "wdn_1", name: "a", owner: "o", scopes: "[]", enabled: 1 }],
			meta: { changes: 0 },
		});

		const app = createTestApp(db);
		const req = getRequest("/admin/agents", { "X-API-Key": "test-admin-key" });
		const res = await app.request(req, undefined, env);

		// The SQL SELECT deliberately omits secret_hash
		const executeCall = db.execute.mock.calls[0];
		expect(executeCall[0]).not.toContain("secret_hash");
	});
});

describe("DELETE /admin/agents/:id — revoke agent", () => {
	let db: ReturnType<typeof createMockGroveDB>;
	let env: Env;

	beforeEach(() => {
		resetTestCounters();
		db = createMockGroveDB();
		env = createMockEnv();
	});

	it("should soft-delete agent (set enabled=0)", async () => {
		db.execute.mockResolvedValueOnce({ results: [], meta: { changes: 1 } });

		const app = createTestApp(db);
		const req = deleteRequest("/admin/agents/wdn_target", { "X-API-Key": "test-admin-key" });
		const res = await app.request(req, undefined, env);

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data.id).toBe("wdn_target");
		expect(body.data.enabled).toBe(false);
	});

	it("should return 404 when agent not found", async () => {
		db.execute.mockResolvedValueOnce({ results: [], meta: { changes: 0 } });

		const app = createTestApp(db);
		const req = deleteRequest("/admin/agents/nonexistent", { "X-API-Key": "test-admin-key" });
		const res = await app.request(req, undefined, env);

		expect(res.status).toBe(404);
		const body = await res.json();
		expect(body.error.code).toBe("NOT_FOUND");
	});
});

describe("GET /admin/logs — audit log query", () => {
	let db: ReturnType<typeof createMockGroveDB>;
	let env: Env;

	beforeEach(() => {
		resetTestCounters();
		db = createMockGroveDB();
		env = createMockEnv();
	});

	it("should return paginated log entries", async () => {
		const entries = [
			{
				id: 1,
				agent_id: "wdn_1",
				agent_name: "test",
				target_service: "github",
				action: "list_repos",
				auth_method: "service_binding",
				auth_result: "success",
				event_type: "request",
				tenant_id: null,
				latency_ms: 120,
				error_code: null,
			},
		];
		db.execute.mockResolvedValueOnce({ results: entries, meta: { changes: 0 } });

		const app = createTestApp(db);
		const req = getRequest("/admin/logs?limit=10&offset=0", { "X-API-Key": "test-admin-key" });
		const res = await app.request(req, undefined, env);

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data.entries).toHaveLength(1);
		expect(body.data.limit).toBe(10);
		expect(body.data.offset).toBe(0);
	});

	it("should cap limit at 500", async () => {
		db.execute.mockResolvedValueOnce({ results: [], meta: { changes: 0 } });

		const app = createTestApp(db);
		const req = getRequest("/admin/logs?limit=9999", { "X-API-Key": "test-admin-key" });
		await app.request(req, undefined, env);

		// Check that the query used 500 as limit
		const executeCall = db.execute.mock.calls[0];
		const bindings = executeCall[1] as string[];
		expect(bindings[bindings.length - 2]).toBe("500");
	});

	it("should filter by agent_id when provided", async () => {
		db.execute.mockResolvedValueOnce({ results: [], meta: { changes: 0 } });

		const app = createTestApp(db);
		const req = getRequest("/admin/logs?agent_id=wdn_1", { "X-API-Key": "test-admin-key" });
		await app.request(req, undefined, env);

		const executeCall = db.execute.mock.calls[0];
		expect(executeCall[0]).toContain("AND agent_id = ?");
		expect((executeCall[1] as string[])[0]).toBe("wdn_1");
	});

	it("should filter by service when provided", async () => {
		db.execute.mockResolvedValueOnce({ results: [], meta: { changes: 0 } });

		const app = createTestApp(db);
		const req = getRequest("/admin/logs?service=github", { "X-API-Key": "test-admin-key" });
		await app.request(req, undefined, env);

		const executeCall = db.execute.mock.calls[0];
		expect(executeCall[0]).toContain("AND target_service = ?");
	});
});
