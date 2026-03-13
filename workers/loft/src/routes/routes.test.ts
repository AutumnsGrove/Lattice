/**
 * Routes Tests — Ignite, Fade, Status, Sessions, Activity
 *
 * Tests all Loft route handlers: instance provisioning, termination,
 * status monitoring, session history, and activity reporting.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import type { Env, AppVariables } from "../types";
import { igniteRoute } from "./ignite";
import { fadeRoute } from "./fade";
import { statusRoute } from "./status";
import { sessionsRoute } from "./sessions";
import { activityRoute } from "./activity";

// =============================================================================
// MOCKS
// =============================================================================

// Mock workspace packages that can't be resolved outside the monorepo build
vi.mock("@autumnsgrove/lattice/firefly", () => ({
	LOFT_DEFAULTS: {
		defaultSize: "shared-cpu-1x",
		defaultRegion: "iad",
		tags: ["loft"],
		idle: 1800000,
		maxLifetime: 28800000,
		name: "loft",
	},
	Firefly: vi.fn(),
	D1FireflyStore: vi.fn(),
	createWardenProvider: vi.fn(),
}));

vi.mock("@autumnsgrove/lattice/warden", () => ({
	createWardenClient: vi.fn(),
}));

vi.mock("../lib/firefly-factory", () => ({
	createLoftFirefly: vi.fn(),
}));

vi.mock("../lib/schema", () => ({
	initializeSchema: vi.fn().mockResolvedValue(undefined),
}));

// =============================================================================
// TEST HELPERS
// =============================================================================

function createMockEnv(): Env & { _stmt: any } {
	const stmt = {
		bind: vi.fn().mockReturnThis(),
		first: vi.fn().mockResolvedValue(null),
		run: vi.fn().mockResolvedValue({ success: true }),
	};
	return {
		DB: { prepare: vi.fn().mockReturnValue(stmt), batch: vi.fn().mockResolvedValue([]) } as any,
		LOFT_STATE: {} as any,
		WARDEN: { fetch: vi.fn() } as any,
		LOFT_API_KEY: "key",
		WARDEN_API_KEY: "key",
		_stmt: stmt,
	};
}

function createMockFirefly() {
	return {
		ignite: vi.fn().mockResolvedValue({
			id: "inst-1",
			providerServerId: "fly-123",
			status: "running",
			metadata: { region: "iad", codeServerPassword: "pass123", fireflyAgentSecret: "secret" },
			publicIp: "1.2.3.4",
			createdAt: Date.now(),
		}),
		fade: vi.fn().mockResolvedValue(undefined),
		getActiveInstances: vi.fn().mockResolvedValue([]),
		getRecentSessions: vi.fn().mockResolvedValue([]),
		getInstance: vi.fn().mockResolvedValue(null),
		reportActivity: vi.fn(),
		sweepOrphans: vi.fn().mockResolvedValue([]),
	};
}

function createTestApp() {
	const app = new Hono<{ Bindings: Env; Variables: AppVariables }>();
	app.route("/ignite", igniteRoute);
	app.route("/fade", fadeRoute);
	app.route("/status", statusRoute);
	app.route("/sessions", sessionsRoute);
	app.route("/activity", activityRoute);
	return app;
}

// =============================================================================
// IGNITE TESTS
// =============================================================================

describe("POST /ignite", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return 400 when no SSH key configured", async () => {
		const env = createMockEnv();
		const mockFirefly = createMockFirefly();

		vi.mocked(env.DB.prepare).mockReturnValue({
			...env._stmt,
			first: vi.fn().mockResolvedValue(null),
		});

		const { createLoftFirefly } = await import("../lib/firefly-factory");
		vi.mocked(createLoftFirefly).mockReturnValue(mockFirefly);

		const app = createTestApp();
		const res = await app.request("/ignite", { method: "POST" }, env);

		expect(res.status).toBe(400);
		const body = (await res.json()) as any;
		expect(body.success).toBe(false);
		expect(body.error.code).toBe("SSH_KEY_MISSING");
	});

	it("should return 200 with instance details on successful ignition", async () => {
		const env = createMockEnv();
		const mockFirefly = createMockFirefly();

		vi.mocked(env.DB.prepare).mockImplementation((sql: string) => {
			if (sql.includes("ssh_public_key")) {
				return {
					...env._stmt,
					first: vi.fn().mockResolvedValue({ value: "ssh-ed25519 AAAA..." }),
				};
			}
			return env._stmt;
		});

		const { createLoftFirefly } = await import("../lib/firefly-factory");
		vi.mocked(createLoftFirefly).mockReturnValue(mockFirefly);

		const app = createTestApp();
		const res = await app.request("/ignite", { method: "POST" }, env);

		expect(res.status).toBe(200);
		const body = (await res.json()) as any;
		expect(body.success).toBe(true);
		expect(body.data.instanceId).toBe("inst-1");
	});

	it("should include instanceId in response data", async () => {
		const env = createMockEnv();
		const mockFirefly = createMockFirefly();

		vi.mocked(env.DB.prepare).mockImplementation((sql: string) => {
			if (sql.includes("ssh_public_key")) {
				return {
					...env._stmt,
					first: vi.fn().mockResolvedValue({ value: "ssh-ed25519 AAAA..." }),
				};
			}
			return env._stmt;
		});

		const { createLoftFirefly } = await import("../lib/firefly-factory");
		vi.mocked(createLoftFirefly).mockReturnValue(mockFirefly);

		const app = createTestApp();
		const res = await app.request("/ignite", { method: "POST" }, env);
		const body = (await res.json()) as any;

		expect(body.data.instanceId).toBe("inst-1");
		expect(body.data.providerServerId).toBe("fly-123");
		expect(body.data.status).toBe("running");
	});

	it("should include codeServerUrl in response", async () => {
		const env = createMockEnv();
		const mockFirefly = createMockFirefly();

		vi.mocked(env.DB.prepare).mockImplementation((sql: string) => {
			if (sql.includes("ssh_public_key")) {
				return {
					...env._stmt,
					first: vi.fn().mockResolvedValue({ value: "ssh-ed25519 AAAA..." }),
				};
			}
			return env._stmt;
		});

		const { createLoftFirefly } = await import("../lib/firefly-factory");
		vi.mocked(createLoftFirefly).mockReturnValue(mockFirefly);

		const app = createTestApp();
		const res = await app.request("/ignite", { method: "POST" }, env);
		const body = (await res.json()) as any;

		expect(body.data.codeServerUrl).toBe("https://grove-loft.fly.dev");
	});

	it("should include sshHost and sshUser in response", async () => {
		const env = createMockEnv();
		const mockFirefly = createMockFirefly();

		vi.mocked(env.DB.prepare).mockImplementation((sql: string) => {
			if (sql.includes("ssh_public_key")) {
				return {
					...env._stmt,
					first: vi.fn().mockResolvedValue({ value: "ssh-ed25519 AAAA..." }),
				};
			}
			return env._stmt;
		});

		const { createLoftFirefly } = await import("../lib/firefly-factory");
		vi.mocked(createLoftFirefly).mockReturnValue(mockFirefly);

		const app = createTestApp();
		const res = await app.request("/ignite", { method: "POST" }, env);
		const body = (await res.json()) as any;

		expect(body.data.sshHost).toBe("grove-loft.fly.dev");
		expect(body.data.sshUser).toBe("grove");
	});

	it("should include hardCapAt as ISO string in response", async () => {
		const env = createMockEnv();
		const mockFirefly = createMockFirefly();

		vi.mocked(env.DB.prepare).mockImplementation((sql: string) => {
			if (sql.includes("ssh_public_key")) {
				return {
					...env._stmt,
					first: vi.fn().mockResolvedValue({ value: "ssh-ed25519 AAAA..." }),
				};
			}
			return env._stmt;
		});

		const { createLoftFirefly } = await import("../lib/firefly-factory");
		vi.mocked(createLoftFirefly).mockReturnValue(mockFirefly);

		const app = createTestApp();
		const res = await app.request("/ignite", { method: "POST" }, env);
		const body = (await res.json()) as any;

		expect(body.data.hardCapAt).toBeDefined();
		expect(typeof body.data.hardCapAt).toBe("string");
		// Verify it's a valid ISO string
		expect(() => new Date(body.data.hardCapAt)).not.toThrow();
	});

	it("should call firefly.ignite with machine config", async () => {
		const env = createMockEnv();
		const mockFirefly = createMockFirefly();

		vi.mocked(env.DB.prepare).mockImplementation((sql: string) => {
			if (sql.includes("ssh_public_key")) {
				return {
					...env._stmt,
					first: vi.fn().mockResolvedValue({ value: "ssh-ed25519 AAAA..." }),
				};
			}
			return env._stmt;
		});

		const { createLoftFirefly } = await import("../lib/firefly-factory");
		vi.mocked(createLoftFirefly).mockReturnValue(mockFirefly);

		const app = createTestApp();
		await app.request("/ignite", { method: "POST" }, env);

		expect(mockFirefly.ignite).toHaveBeenCalled();
		const call = mockFirefly.ignite.mock.calls[0][0];
		expect(call.stateKey).toBe("default");
		expect(call.metadata).toHaveProperty("codeServerPassword");
		expect(call.metadata).toHaveProperty("fireflyAgentSecret");
	});

	it("should record activity in D1", async () => {
		const env = createMockEnv();
		const mockFirefly = createMockFirefly();

		vi.mocked(env.DB.prepare).mockImplementation((sql: string) => {
			if (sql.includes("ssh_public_key")) {
				return {
					...env._stmt,
					first: vi.fn().mockResolvedValue({ value: "ssh-ed25519 AAAA..." }),
				};
			}
			return env._stmt;
		});

		const { createLoftFirefly } = await import("../lib/firefly-factory");
		vi.mocked(createLoftFirefly).mockReturnValue(mockFirefly);

		const app = createTestApp();
		await app.request("/ignite", { method: "POST" }, env);

		const calls = vi.mocked(env.DB.prepare).mock.calls;
		const insertActivityCall = calls.find(([sql]) => sql.includes("loft_activity"));
		expect(insertActivityCall).toBeDefined();
		expect(insertActivityCall![0]).toContain("INSERT OR REPLACE INTO loft_activity");
	});
});

// =============================================================================
// FADE TESTS
// =============================================================================

describe("POST /fade/:id", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return 200 with terminated status", async () => {
		const env = createMockEnv();
		const mockFirefly = createMockFirefly();

		const { createLoftFirefly } = await import("../lib/firefly-factory");
		vi.mocked(createLoftFirefly).mockReturnValue(mockFirefly);

		const app = createTestApp();
		const res = await app.request("/fade/inst-1", { method: "POST" }, env);

		expect(res.status).toBe(200);
		const body = (await res.json()) as any;
		expect(body.success).toBe(true);
		expect(body.data.status).toBe("terminated");
	});

	it("should call firefly.fade with instance ID", async () => {
		const env = createMockEnv();
		const mockFirefly = createMockFirefly();

		const { createLoftFirefly } = await import("../lib/firefly-factory");
		vi.mocked(createLoftFirefly).mockReturnValue(mockFirefly);

		const app = createTestApp();
		await app.request("/fade/inst-1", { method: "POST" }, env);

		expect(mockFirefly.fade).toHaveBeenCalledWith("inst-1", { stateKey: "default" });
	});

	it("should delete activity record from D1", async () => {
		const env = createMockEnv();
		const mockFirefly = createMockFirefly();

		const { createLoftFirefly } = await import("../lib/firefly-factory");
		vi.mocked(createLoftFirefly).mockReturnValue(mockFirefly);

		const app = createTestApp();
		await app.request("/fade/inst-1", { method: "POST" }, env);

		const calls = vi.mocked(env.DB.prepare).mock.calls;
		const deleteCall = calls.find(([sql]) => sql.includes("DELETE FROM loft_activity"));
		expect(deleteCall).toBeDefined();
	});

	it("should log fade event in loft_events", async () => {
		const env = createMockEnv();
		const mockFirefly = createMockFirefly();

		const { createLoftFirefly } = await import("../lib/firefly-factory");
		vi.mocked(createLoftFirefly).mockReturnValue(mockFirefly);

		const app = createTestApp();
		await app.request("/fade/inst-1", { method: "POST" }, env);

		const calls = vi.mocked(env.DB.prepare).mock.calls;
		const eventCall = calls.find(([sql]) => sql.includes("loft_events"));
		expect(eventCall).toBeDefined();
		expect(eventCall![0]).toContain("INSERT INTO loft_events");
		expect(eventCall![0]).toContain("'fade'");
	});
});

// =============================================================================
// STATUS TESTS
// =============================================================================

describe("GET /status", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return active: false with empty instances when no active instances", async () => {
		const env = createMockEnv();
		const mockFirefly = createMockFirefly();

		mockFirefly.getActiveInstances.mockResolvedValue([]);

		const { createLoftFirefly } = await import("../lib/firefly-factory");
		vi.mocked(createLoftFirefly).mockReturnValue(mockFirefly);

		const app = createTestApp();
		const res = await app.request("/status", { method: "GET" }, env);

		expect(res.status).toBe(200);
		const body = (await res.json()) as any;
		expect(body.success).toBe(true);
		expect(body.data.active).toBe(false);
		expect(body.data.instances).toEqual([]);
	});

	it("should return active: true with instances", async () => {
		const env = createMockEnv();
		const mockFirefly = createMockFirefly();

		mockFirefly.getActiveInstances.mockResolvedValue([
			{
				id: "inst-1",
				providerServerId: "fly-123",
				status: "running",
				metadata: { region: "iad" },
				publicIp: "1.2.3.4",
				createdAt: Date.now() - 60_000,
			},
		]);

		vi.mocked(env.DB.prepare).mockImplementation((sql: string) => {
			if (sql.includes("loft_activity")) {
				return {
					...env._stmt,
					first: vi.fn().mockResolvedValue({
						last_activity_at: Date.now() - 5 * 60_000,
						hard_cap_at: Date.now() + 7 * 60 * 60_000,
						warned: 0,
					}),
				};
			}
			return env._stmt;
		});

		const { createLoftFirefly } = await import("../lib/firefly-factory");
		vi.mocked(createLoftFirefly).mockReturnValue(mockFirefly);

		const app = createTestApp();
		const res = await app.request("/status", { method: "GET" }, env);
		const body = (await res.json()) as any;

		expect(body.data.active).toBe(true);
		expect(body.data.instances.length).toBe(1);
	});

	it("should include idleMinutes calculated from activity", async () => {
		const env = createMockEnv();
		const mockFirefly = createMockFirefly();

		const now = Date.now();
		mockFirefly.getActiveInstances.mockResolvedValue([
			{
				id: "inst-1",
				providerServerId: "fly-123",
				status: "running",
				metadata: { region: "iad" },
				publicIp: "1.2.3.4",
				createdAt: now - 60_000,
			},
		]);

		vi.mocked(env.DB.prepare).mockImplementation((sql: string) => {
			if (sql.includes("loft_activity")) {
				return {
					...env._stmt,
					first: vi.fn().mockResolvedValue({
						last_activity_at: now - 10 * 60_000, // 10 min ago
						hard_cap_at: now + 7 * 60 * 60_000,
						warned: 0,
					}),
				};
			}
			return env._stmt;
		});

		const { createLoftFirefly } = await import("../lib/firefly-factory");
		vi.mocked(createLoftFirefly).mockReturnValue(mockFirefly);

		const app = createTestApp();
		const res = await app.request("/status", { method: "GET" }, env);
		const body = (await res.json()) as any;

		expect(body.data.instances[0].idleMinutes).toBeGreaterThanOrEqual(9);
		expect(body.data.instances[0].idleMinutes).toBeLessThanOrEqual(11);
	});

	it("should include remainingMinutes from hard cap", async () => {
		const env = createMockEnv();
		const mockFirefly = createMockFirefly();

		const now = Date.now();
		mockFirefly.getActiveInstances.mockResolvedValue([
			{
				id: "inst-1",
				providerServerId: "fly-123",
				status: "running",
				metadata: { region: "iad" },
				publicIp: "1.2.3.4",
				createdAt: now - 60_000,
			},
		]);

		vi.mocked(env.DB.prepare).mockImplementation((sql: string) => {
			if (sql.includes("loft_activity")) {
				return {
					...env._stmt,
					first: vi.fn().mockResolvedValue({
						last_activity_at: now - 5 * 60_000,
						hard_cap_at: now + 60 * 60_000, // 60 min from now
						warned: 0,
					}),
				};
			}
			return env._stmt;
		});

		const { createLoftFirefly } = await import("../lib/firefly-factory");
		vi.mocked(createLoftFirefly).mockReturnValue(mockFirefly);

		const app = createTestApp();
		const res = await app.request("/status", { method: "GET" }, env);
		const body = (await res.json()) as any;

		expect(body.data.instances[0].remainingMinutes).toBeGreaterThanOrEqual(59);
		expect(body.data.instances[0].remainingMinutes).toBeLessThanOrEqual(61);
	});

	it("should include codeServerUrl", async () => {
		const env = createMockEnv();
		const mockFirefly = createMockFirefly();

		mockFirefly.getActiveInstances.mockResolvedValue([
			{
				id: "inst-1",
				providerServerId: "fly-123",
				status: "running",
				metadata: { region: "iad" },
				publicIp: "1.2.3.4",
				createdAt: Date.now() - 60_000,
			},
		]);

		vi.mocked(env.DB.prepare).mockImplementation((sql: string) => {
			if (sql.includes("loft_activity")) {
				return {
					...env._stmt,
					first: vi.fn().mockResolvedValue({
						last_activity_at: Date.now() - 5 * 60_000,
						hard_cap_at: Date.now() + 7 * 60 * 60_000,
						warned: 0,
					}),
				};
			}
			return env._stmt;
		});

		const { createLoftFirefly } = await import("../lib/firefly-factory");
		vi.mocked(createLoftFirefly).mockReturnValue(mockFirefly);

		const app = createTestApp();
		const res = await app.request("/status", { method: "GET" }, env);
		const body = (await res.json()) as any;

		expect(body.data.instances[0].codeServerUrl).toBe("https://grove-loft.fly.dev");
	});

	it("should return correct region from metadata", async () => {
		const env = createMockEnv();
		const mockFirefly = createMockFirefly();

		mockFirefly.getActiveInstances.mockResolvedValue([
			{
				id: "inst-1",
				providerServerId: "fly-123",
				status: "running",
				metadata: { region: "iad" },
				publicIp: "1.2.3.4",
				createdAt: Date.now() - 60_000,
			},
		]);

		vi.mocked(env.DB.prepare).mockImplementation((sql: string) => {
			if (sql.includes("loft_activity")) {
				return {
					...env._stmt,
					first: vi.fn().mockResolvedValue({
						last_activity_at: Date.now() - 5 * 60_000,
						hard_cap_at: Date.now() + 7 * 60 * 60_000,
						warned: 0,
					}),
				};
			}
			return env._stmt;
		});

		const { createLoftFirefly } = await import("../lib/firefly-factory");
		vi.mocked(createLoftFirefly).mockReturnValue(mockFirefly);

		const app = createTestApp();
		const res = await app.request("/status", { method: "GET" }, env);
		const body = (await res.json()) as any;

		expect(body.data.instances[0].region).toBe("iad");
	});
});

// =============================================================================
// SESSIONS TESTS
// =============================================================================

describe("GET /sessions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return empty sessions array when no sessions", async () => {
		const env = createMockEnv();
		const mockFirefly = createMockFirefly();

		mockFirefly.getRecentSessions.mockResolvedValue([]);

		const { createLoftFirefly } = await import("../lib/firefly-factory");
		vi.mocked(createLoftFirefly).mockReturnValue(mockFirefly);

		const app = createTestApp();
		const res = await app.request("/sessions", { method: "GET" }, env);
		const body = (await res.json()) as any;

		expect(body.success).toBe(true);
		expect(body.data.sessions).toEqual([]);
		expect(body.data.total).toBe(0);
	});

	it("should return sessions with ISO timestamps", async () => {
		const env = createMockEnv();
		const mockFirefly = createMockFirefly();

		mockFirefly.getRecentSessions.mockResolvedValue([
			{
				id: "sess-1",
				instanceId: "inst-1",
				provider: "fly",
				size: "shared-cpu-1x",
				region: "iad",
				startedAt: 1700000000000,
				endedAt: 1700003600000,
				durationSec: 3600,
				status: "completed",
			},
		]);

		const { createLoftFirefly } = await import("../lib/firefly-factory");
		vi.mocked(createLoftFirefly).mockReturnValue(mockFirefly);

		const app = createTestApp();
		const res = await app.request("/sessions", { method: "GET" }, env);
		const body = (await res.json()) as any;

		expect(body.data.sessions[0].startedAt).toBe(new Date(1700000000000).toISOString());
		expect(body.data.sessions[0].endedAt).toBe(new Date(1700003600000).toISOString());
	});

	it("should convert durationSec to durationMin", async () => {
		const env = createMockEnv();
		const mockFirefly = createMockFirefly();

		mockFirefly.getRecentSessions.mockResolvedValue([
			{
				id: "sess-1",
				instanceId: "inst-1",
				provider: "fly",
				size: "shared-cpu-1x",
				region: "iad",
				startedAt: 1700000000000,
				endedAt: 1700003600000,
				durationSec: 3600,
				status: "completed",
			},
		]);

		const { createLoftFirefly } = await import("../lib/firefly-factory");
		vi.mocked(createLoftFirefly).mockReturnValue(mockFirefly);

		const app = createTestApp();
		const res = await app.request("/sessions", { method: "GET" }, env);
		const body = (await res.json()) as any;

		expect(body.data.sessions[0].durationMin).toBe(60);
	});

	it("should default limit to 20", async () => {
		const env = createMockEnv();
		const mockFirefly = createMockFirefly();

		mockFirefly.getRecentSessions.mockResolvedValue([]);

		const { createLoftFirefly } = await import("../lib/firefly-factory");
		vi.mocked(createLoftFirefly).mockReturnValue(mockFirefly);

		const app = createTestApp();
		await app.request("/sessions", { method: "GET" }, env);

		expect(mockFirefly.getRecentSessions).toHaveBeenCalledWith(20);
	});

	it("should respect custom limit from query param", async () => {
		const env = createMockEnv();
		const mockFirefly = createMockFirefly();

		mockFirefly.getRecentSessions.mockResolvedValue([]);

		const { createLoftFirefly } = await import("../lib/firefly-factory");
		vi.mocked(createLoftFirefly).mockReturnValue(mockFirefly);

		const app = createTestApp();
		await app.request("/sessions?limit=5", { method: "GET" }, env);

		expect(mockFirefly.getRecentSessions).toHaveBeenCalledWith(5);
	});

	it("should clamp limit to max 100", async () => {
		const env = createMockEnv();
		const mockFirefly = createMockFirefly();

		mockFirefly.getRecentSessions.mockResolvedValue([]);

		const { createLoftFirefly } = await import("../lib/firefly-factory");
		vi.mocked(createLoftFirefly).mockReturnValue(mockFirefly);

		const app = createTestApp();
		await app.request("/sessions?limit=999", { method: "GET" }, env);

		expect(mockFirefly.getRecentSessions).toHaveBeenCalledWith(100);
	});
});

// =============================================================================
// ACTIVITY TESTS
// =============================================================================

describe("POST /activity/:id", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return 404 when instance not found", async () => {
		const env = createMockEnv();
		const mockFirefly = createMockFirefly();

		mockFirefly.getInstance.mockResolvedValue(null);

		const { createLoftFirefly } = await import("../lib/firefly-factory");
		vi.mocked(createLoftFirefly).mockReturnValue(mockFirefly);

		const app = createTestApp();
		const res = await app.request("/activity/inst-1", { method: "POST" }, env);

		expect(res.status).toBe(404);
		const body = (await res.json()) as any;
		expect(body.success).toBe(false);
		expect(body.error.code).toBe("INSTANCE_NOT_FOUND");
	});

	it("should return 404 when instance is terminated", async () => {
		const env = createMockEnv();
		const mockFirefly = createMockFirefly();

		mockFirefly.getInstance.mockResolvedValue({
			id: "inst-1",
			status: "terminated",
			metadata: {},
		});

		const { createLoftFirefly } = await import("../lib/firefly-factory");
		vi.mocked(createLoftFirefly).mockReturnValue(mockFirefly);

		const app = createTestApp();
		const res = await app.request("/activity/inst-1", { method: "POST" }, env);

		expect(res.status).toBe(404);
		const body = (await res.json()) as any;
		expect(body.success).toBe(false);
		expect(body.error.code).toBe("INSTANCE_NOT_FOUND");
	});

	it("should return 200 with instanceId on successful activity", async () => {
		const env = createMockEnv();
		const mockFirefly = createMockFirefly();

		mockFirefly.getInstance.mockResolvedValue({
			id: "inst-1",
			status: "running",
			metadata: {},
		});

		const { createLoftFirefly } = await import("../lib/firefly-factory");
		vi.mocked(createLoftFirefly).mockReturnValue(mockFirefly);

		const app = createTestApp();
		const res = await app.request("/activity/inst-1", { method: "POST" }, env);

		expect(res.status).toBe(200);
		const body = (await res.json()) as any;
		expect(body.success).toBe(true);
		expect(body.data.instanceId).toBe("inst-1");
	});

	it("should update last_activity_at in D1", async () => {
		const env = createMockEnv();
		const mockFirefly = createMockFirefly();

		mockFirefly.getInstance.mockResolvedValue({
			id: "inst-1",
			status: "running",
			metadata: {},
		});

		const { createLoftFirefly } = await import("../lib/firefly-factory");
		vi.mocked(createLoftFirefly).mockReturnValue(mockFirefly);

		const app = createTestApp();
		await app.request("/activity/inst-1", { method: "POST" }, env);

		const calls = vi.mocked(env.DB.prepare).mock.calls;
		const updateCall = calls.find(([sql]) => sql.includes("UPDATE loft_activity"));
		expect(updateCall).toBeDefined();
		expect(updateCall![0]).toContain("last_activity_at");
	});

	it("should reset warned to 0 in D1", async () => {
		const env = createMockEnv();
		const mockFirefly = createMockFirefly();

		mockFirefly.getInstance.mockResolvedValue({
			id: "inst-1",
			status: "running",
			metadata: {},
		});

		const { createLoftFirefly } = await import("../lib/firefly-factory");
		vi.mocked(createLoftFirefly).mockReturnValue(mockFirefly);

		const app = createTestApp();
		await app.request("/activity/inst-1", { method: "POST" }, env);

		const calls = vi.mocked(env.DB.prepare).mock.calls;
		const updateCall = calls.find(([sql]) => sql.includes("UPDATE loft_activity"));
		expect(updateCall).toBeDefined();
		expect(updateCall![0]).toContain("warned = 0");
	});

	it("should call firefly.reportActivity", async () => {
		const env = createMockEnv();
		const mockFirefly = createMockFirefly();

		mockFirefly.getInstance.mockResolvedValue({
			id: "inst-1",
			status: "running",
			metadata: {},
		});

		const { createLoftFirefly } = await import("../lib/firefly-factory");
		vi.mocked(createLoftFirefly).mockReturnValue(mockFirefly);

		const app = createTestApp();
		await app.request("/activity/inst-1", { method: "POST" }, env);

		expect(mockFirefly.reportActivity).toHaveBeenCalledWith("inst-1");
	});
});
