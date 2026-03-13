/**
 * Scheduled Handlers Tests — Idle Check & Orphan Sweep
 *
 * Tests cron-triggered handlers: idle instance detection, idle warnings,
 * hard cap enforcement, and orphan machine cleanup.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { handleIdleCheck } from "./idle-check";
import { handleOrphanSweep } from "./orphan-sweep";

// =============================================================================
// MOCKS
// =============================================================================

vi.mock("../lib/firefly-factory", () => ({
	createLoftFirefly: vi.fn(),
}));

vi.mock("../lib/schema", () => ({
	initializeSchema: vi.fn().mockResolvedValue(undefined),
}));

// =============================================================================
// TEST HELPERS
// =============================================================================

function createMockEnv(): any {
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

const mockCtx = { waitUntil: vi.fn() } as any;
const originalFetch = globalThis.fetch;

afterEach(() => {
	globalThis.fetch = originalFetch;
	vi.restoreAllMocks();
});

// =============================================================================
// IDLE CHECK TESTS
// =============================================================================

describe("handleIdleCheck", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return immediately when no active instances", async () => {
		const env = createMockEnv();
		const mockFirefly = createMockFirefly();

		mockFirefly.getActiveInstances.mockResolvedValue([]);

		const { createLoftFirefly } = await import("../lib/firefly-factory");
		vi.mocked(createLoftFirefly).mockReturnValue(mockFirefly);

		await handleIdleCheck(env, mockCtx);

		// Should not make any DB calls beyond getActiveInstances
		const calls = vi.mocked(env.DB.prepare).mock.calls;
		expect(calls.length).toBe(0);
	});

	it("should update activity when agent reports active SSH sessions", async () => {
		const env = createMockEnv();
		const mockFirefly = createMockFirefly();

		mockFirefly.getActiveInstances.mockResolvedValue([
			{
				id: "inst-1",
				status: "running",
				metadata: { fireflyAgentSecret: "secret" },
			},
		]);

		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: vi.fn().mockResolvedValue({
				sshSessions: 1,
				codeServerClients: 0,
			}),
		});

		const { createLoftFirefly } = await import("../lib/firefly-factory");
		vi.mocked(createLoftFirefly).mockReturnValue(mockFirefly);

		await handleIdleCheck(env, mockCtx);

		const calls = vi.mocked(env.DB.prepare).mock.calls;
		const updateCall = calls.find(([sql]) => sql.includes("UPDATE loft_activity"));
		expect(updateCall).toBeDefined();
		expect(mockFirefly.reportActivity).toHaveBeenCalledWith("inst-1");
	});

	it("should update activity when agent reports active code-server clients", async () => {
		const env = createMockEnv();
		const mockFirefly = createMockFirefly();

		mockFirefly.getActiveInstances.mockResolvedValue([
			{
				id: "inst-1",
				status: "running",
				metadata: { fireflyAgentSecret: "secret" },
			},
		]);

		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: vi.fn().mockResolvedValue({
				sshSessions: 0,
				codeServerClients: 1,
			}),
		});

		const { createLoftFirefly } = await import("../lib/firefly-factory");
		vi.mocked(createLoftFirefly).mockReturnValue(mockFirefly);

		await handleIdleCheck(env, mockCtx);

		const calls = vi.mocked(env.DB.prepare).mock.calls;
		const updateCall = calls.find(([sql]) => sql.includes("UPDATE loft_activity"));
		expect(updateCall).toBeDefined();
	});

	it("should fall back to D1 activity when agent unreachable", async () => {
		const env = createMockEnv();
		const mockFirefly = createMockFirefly();

		mockFirefly.getActiveInstances.mockResolvedValue([
			{
				id: "inst-1",
				status: "running",
				metadata: { fireflyAgentSecret: "secret" },
			},
		]);

		globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

		vi.mocked(env.DB.prepare).mockImplementation((sql: string) => {
			if (sql.includes("SELECT * FROM loft_activity")) {
				return {
					bind: vi.fn().mockReturnThis(),
					first: vi.fn().mockResolvedValue({
						last_activity_at: Date.now() - 10 * 60_000,
						hard_cap_at: Date.now() + 7 * 60 * 60_000,
						warned: 0,
					}),
				};
			}
			return env._stmt;
		});

		const { createLoftFirefly } = await import("../lib/firefly-factory");
		vi.mocked(createLoftFirefly).mockReturnValue(mockFirefly);

		await handleIdleCheck(env, mockCtx);

		const calls = vi.mocked(env.DB.prepare).mock.calls;
		const selectCall = calls.find(([sql]) => sql.includes("SELECT * FROM loft_activity"));
		expect(selectCall).toBeDefined();
	});

	it("should skip instance when no activity record in D1", async () => {
		const env = createMockEnv();
		const mockFirefly = createMockFirefly();

		mockFirefly.getActiveInstances.mockResolvedValue([
			{
				id: "inst-1",
				status: "running",
				metadata: { fireflyAgentSecret: "secret" },
			},
		]);

		globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

		vi.mocked(env.DB.prepare).mockImplementation((sql: string) => {
			if (sql.includes("SELECT * FROM loft_activity")) {
				return {
					bind: vi.fn().mockReturnThis(),
					first: vi.fn().mockResolvedValue(null),
				};
			}
			return env._stmt;
		});

		const { createLoftFirefly } = await import("../lib/firefly-factory");
		vi.mocked(createLoftFirefly).mockReturnValue(mockFirefly);

		await handleIdleCheck(env, mockCtx);

		// Should only have SELECT call, no DELETE or INSERT
		const calls = vi.mocked(env.DB.prepare).mock.calls;
		expect(calls.length).toBe(1);
		expect(calls[0][0]).toContain("SELECT * FROM loft_activity");
	});

	it("should call firefly.fade and delete activity when hard cap reached", async () => {
		const env = createMockEnv();
		const mockFirefly = createMockFirefly();

		const now = Date.now();
		mockFirefly.getActiveInstances.mockResolvedValue([
			{
				id: "inst-1",
				status: "running",
				metadata: { fireflyAgentSecret: "secret" },
			},
		]);

		globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

		vi.mocked(env.DB.prepare).mockImplementation((sql: string) => {
			if (sql.includes("SELECT * FROM loft_activity")) {
				return {
					bind: vi.fn().mockReturnThis(),
					first: vi.fn().mockResolvedValue({
						last_activity_at: now - 10 * 60_000,
						hard_cap_at: now - 1000, // Already past
						warned: 0,
					}),
				};
			}
			return env._stmt;
		});

		const { createLoftFirefly } = await import("../lib/firefly-factory");
		vi.mocked(createLoftFirefly).mockReturnValue(mockFirefly);

		await handleIdleCheck(env, mockCtx);

		expect(mockFirefly.fade).toHaveBeenCalledWith("inst-1", { stateKey: "default" });

		const calls = vi.mocked(env.DB.prepare).mock.calls;
		const deleteCall = calls.find(([sql]) => sql.includes("DELETE FROM loft_activity"));
		expect(deleteCall).toBeDefined();
	});

	it("should log hard_cap_fade event when hard cap reached", async () => {
		const env = createMockEnv();
		const mockFirefly = createMockFirefly();

		const now = Date.now();
		mockFirefly.getActiveInstances.mockResolvedValue([
			{
				id: "inst-1",
				status: "running",
				metadata: { fireflyAgentSecret: "secret" },
			},
		]);

		globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

		vi.mocked(env.DB.prepare).mockImplementation((sql: string) => {
			if (sql.includes("SELECT * FROM loft_activity")) {
				return {
					bind: vi.fn().mockReturnThis(),
					first: vi.fn().mockResolvedValue({
						last_activity_at: now - 10 * 60_000,
						hard_cap_at: now - 1000,
						warned: 0,
					}),
				};
			}
			return env._stmt;
		});

		const { createLoftFirefly } = await import("../lib/firefly-factory");
		vi.mocked(createLoftFirefly).mockReturnValue(mockFirefly);

		await handleIdleCheck(env, mockCtx);

		const calls = vi.mocked(env.DB.prepare).mock.calls;
		const eventCall = calls.find(([sql]) => sql.includes("loft_events"));
		expect(eventCall).toBeDefined();
		expect(eventCall![0]).toContain("hard_cap_fade");
	});

	it("should call firefly.fade and delete activity when idle threshold reached", async () => {
		const env = createMockEnv();
		const mockFirefly = createMockFirefly();

		const now = Date.now();
		mockFirefly.getActiveInstances.mockResolvedValue([
			{
				id: "inst-1",
				status: "running",
				metadata: { fireflyAgentSecret: "secret" },
			},
		]);

		globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

		vi.mocked(env.DB.prepare).mockImplementation((sql: string) => {
			if (sql.includes("SELECT * FROM loft_activity")) {
				return {
					bind: vi.fn().mockReturnThis(),
					first: vi.fn().mockResolvedValue({
						last_activity_at: now - 31 * 60_000, // 31 min ago
						hard_cap_at: now + 7 * 60 * 60_000,
						warned: 0,
					}),
				};
			}
			return env._stmt;
		});

		const { createLoftFirefly } = await import("../lib/firefly-factory");
		vi.mocked(createLoftFirefly).mockReturnValue(mockFirefly);

		await handleIdleCheck(env, mockCtx);

		expect(mockFirefly.fade).toHaveBeenCalledWith("inst-1", { stateKey: "default" });

		const calls = vi.mocked(env.DB.prepare).mock.calls;
		const deleteCall = calls.find(([sql]) => sql.includes("DELETE FROM loft_activity"));
		expect(deleteCall).toBeDefined();
	});

	it("should log idle_fade event when idle threshold reached", async () => {
		const env = createMockEnv();
		const mockFirefly = createMockFirefly();

		const now = Date.now();
		mockFirefly.getActiveInstances.mockResolvedValue([
			{
				id: "inst-1",
				status: "running",
				metadata: { fireflyAgentSecret: "secret" },
			},
		]);

		globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

		vi.mocked(env.DB.prepare).mockImplementation((sql: string) => {
			if (sql.includes("SELECT * FROM loft_activity")) {
				return {
					bind: vi.fn().mockReturnThis(),
					first: vi.fn().mockResolvedValue({
						last_activity_at: now - 31 * 60_000,
						hard_cap_at: now + 7 * 60 * 60_000,
						warned: 0,
					}),
				};
			}
			return env._stmt;
		});

		const { createLoftFirefly } = await import("../lib/firefly-factory");
		vi.mocked(createLoftFirefly).mockReturnValue(mockFirefly);

		await handleIdleCheck(env, mockCtx);

		const calls = vi.mocked(env.DB.prepare).mock.calls;
		const eventCall = calls.find(([sql]) => sql.includes("loft_events"));
		expect(eventCall).toBeDefined();
		expect(eventCall![0]).toContain("idle_fade");
	});

	it("should set warned=1 when warning threshold reached and not already warned", async () => {
		const env = createMockEnv();
		const mockFirefly = createMockFirefly();

		const now = Date.now();
		mockFirefly.getActiveInstances.mockResolvedValue([
			{
				id: "inst-1",
				status: "running",
				metadata: { fireflyAgentSecret: "secret" },
			},
		]);

		globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

		vi.mocked(env.DB.prepare).mockImplementation((sql: string) => {
			if (sql.includes("SELECT * FROM loft_activity")) {
				return {
					bind: vi.fn().mockReturnThis(),
					first: vi.fn().mockResolvedValue({
						last_activity_at: now - 26 * 60_000, // 26 min ago
						hard_cap_at: now + 7 * 60 * 60_000,
						warned: 0,
					}),
				};
			}
			return env._stmt;
		});

		const { createLoftFirefly } = await import("../lib/firefly-factory");
		vi.mocked(createLoftFirefly).mockReturnValue(mockFirefly);

		await handleIdleCheck(env, mockCtx);

		const calls = vi.mocked(env.DB.prepare).mock.calls;
		const updateCall = calls.find(([sql]) => sql.includes("UPDATE loft_activity SET warned"));
		expect(updateCall).toBeDefined();
		expect(updateCall![0]).toContain("warned = 1");
	});

	it("should log idle_warning event when warning threshold reached", async () => {
		const env = createMockEnv();
		const mockFirefly = createMockFirefly();

		const now = Date.now();
		mockFirefly.getActiveInstances.mockResolvedValue([
			{
				id: "inst-1",
				status: "running",
				metadata: { fireflyAgentSecret: "secret" },
			},
		]);

		globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

		vi.mocked(env.DB.prepare).mockImplementation((sql: string) => {
			if (sql.includes("SELECT * FROM loft_activity")) {
				return {
					bind: vi.fn().mockReturnThis(),
					first: vi.fn().mockResolvedValue({
						last_activity_at: now - 26 * 60_000,
						hard_cap_at: now + 7 * 60 * 60_000,
						warned: 0,
					}),
				};
			}
			return env._stmt;
		});

		const { createLoftFirefly } = await import("../lib/firefly-factory");
		vi.mocked(createLoftFirefly).mockReturnValue(mockFirefly);

		await handleIdleCheck(env, mockCtx);

		const calls = vi.mocked(env.DB.prepare).mock.calls;
		const eventCall = calls.find(([sql]) => sql.includes("idle_warning"));
		expect(eventCall).toBeDefined();
	});

	it("should not duplicate warning when already warned", async () => {
		const env = createMockEnv();
		const mockFirefly = createMockFirefly();

		const now = Date.now();
		mockFirefly.getActiveInstances.mockResolvedValue([
			{
				id: "inst-1",
				status: "running",
				metadata: { fireflyAgentSecret: "secret" },
			},
		]);

		globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

		vi.mocked(env.DB.prepare).mockImplementation((sql: string) => {
			if (sql.includes("SELECT * FROM loft_activity")) {
				return {
					bind: vi.fn().mockReturnThis(),
					first: vi.fn().mockResolvedValue({
						last_activity_at: now - 26 * 60_000,
						hard_cap_at: now + 7 * 60 * 60_000,
						warned: 1, // Already warned
					}),
				};
			}
			return env._stmt;
		});

		const { createLoftFirefly } = await import("../lib/firefly-factory");
		vi.mocked(createLoftFirefly).mockReturnValue(mockFirefly);

		await handleIdleCheck(env, mockCtx);

		const calls = vi.mocked(env.DB.prepare).mock.calls;
		const eventCalls = calls.filter(([sql]) => sql.includes("idle_warning"));
		expect(eventCalls.length).toBe(0);
	});

	it("should not take action when below warning threshold", async () => {
		const env = createMockEnv();
		const mockFirefly = createMockFirefly();

		const now = Date.now();
		mockFirefly.getActiveInstances.mockResolvedValue([
			{
				id: "inst-1",
				status: "running",
				metadata: { fireflyAgentSecret: "secret" },
			},
		]);

		globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

		vi.mocked(env.DB.prepare).mockImplementation((sql: string) => {
			if (sql.includes("SELECT * FROM loft_activity")) {
				return {
					bind: vi.fn().mockReturnThis(),
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

		await handleIdleCheck(env, mockCtx);

		// Should only have SELECT call
		const calls = vi.mocked(env.DB.prepare).mock.calls;
		expect(calls.length).toBe(1);
		expect(mockFirefly.fade).not.toHaveBeenCalled();
	});

	it("should not block other instances on per-instance error", async () => {
		const env = createMockEnv();
		const mockFirefly = createMockFirefly();

		const now = Date.now();
		mockFirefly.getActiveInstances.mockResolvedValue([
			{
				id: "inst-1",
				status: "running",
				metadata: { fireflyAgentSecret: "secret" },
			},
			{
				id: "inst-2",
				status: "running",
				metadata: { fireflyAgentSecret: "secret" },
			},
		]);

		// First instance fails, second succeeds
		let callCount = 0;
		globalThis.fetch = vi.fn().mockImplementation(() => {
			callCount++;
			if (callCount === 1) {
				throw new Error("Agent error");
			}
			return Promise.resolve({
				ok: true,
				json: vi.fn().mockResolvedValue({
					sshSessions: 0,
					codeServerClients: 0,
				}),
			});
		});

		vi.mocked(env.DB.prepare).mockImplementation((sql: string) => {
			if (sql.includes("SELECT * FROM loft_activity")) {
				return {
					bind: vi.fn().mockReturnThis(),
					first: vi.fn().mockResolvedValue({
						last_activity_at: now - 10 * 60_000,
						hard_cap_at: now + 7 * 60 * 60_000,
						warned: 0,
					}),
				};
			}
			return env._stmt;
		});

		const { createLoftFirefly } = await import("../lib/firefly-factory");
		vi.mocked(createLoftFirefly).mockReturnValue(mockFirefly);

		await handleIdleCheck(env, mockCtx);

		// Both instances should be processed despite first one error
		const calls = vi.mocked(env.DB.prepare).mock.calls;
		// 2 SELECT calls (one per instance)
		const selectCalls = calls.filter(([sql]) => sql.includes("SELECT * FROM loft_activity"));
		expect(selectCalls.length).toBe(2);
	});

	it("should continue to idle check when agent returns 0 sessions and clients", async () => {
		const env = createMockEnv();
		const mockFirefly = createMockFirefly();

		const now = Date.now();
		mockFirefly.getActiveInstances.mockResolvedValue([
			{
				id: "inst-1",
				status: "running",
				metadata: { fireflyAgentSecret: "secret" },
			},
		]);

		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: vi.fn().mockResolvedValue({
				sshSessions: 0,
				codeServerClients: 0,
			}),
		});

		vi.mocked(env.DB.prepare).mockImplementation((sql: string) => {
			if (sql.includes("SELECT * FROM loft_activity")) {
				return {
					bind: vi.fn().mockReturnThis(),
					first: vi.fn().mockResolvedValue({
						last_activity_at: now - 10 * 60_000,
						hard_cap_at: now + 7 * 60 * 60_000,
						warned: 0,
					}),
				};
			}
			return env._stmt;
		});

		const { createLoftFirefly } = await import("../lib/firefly-factory");
		vi.mocked(createLoftFirefly).mockReturnValue(mockFirefly);

		await handleIdleCheck(env, mockCtx);

		// Should proceed to SELECT query for idle check
		const calls = vi.mocked(env.DB.prepare).mock.calls;
		const selectCall = calls.find(([sql]) => sql.includes("SELECT * FROM loft_activity"));
		expect(selectCall).toBeDefined();
	});

	it("should fall back to D1 when agent returns non-OK response", async () => {
		const env = createMockEnv();
		const mockFirefly = createMockFirefly();

		const now = Date.now();
		mockFirefly.getActiveInstances.mockResolvedValue([
			{
				id: "inst-1",
				status: "running",
				metadata: { fireflyAgentSecret: "secret" },
			},
		]);

		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: false,
			status: 500,
		});

		vi.mocked(env.DB.prepare).mockImplementation((sql: string) => {
			if (sql.includes("SELECT * FROM loft_activity")) {
				return {
					bind: vi.fn().mockReturnThis(),
					first: vi.fn().mockResolvedValue({
						last_activity_at: now - 10 * 60_000,
						hard_cap_at: now + 7 * 60 * 60_000,
						warned: 0,
					}),
				};
			}
			return env._stmt;
		});

		const { createLoftFirefly } = await import("../lib/firefly-factory");
		vi.mocked(createLoftFirefly).mockReturnValue(mockFirefly);

		await handleIdleCheck(env, mockCtx);

		// Should fall back to D1 activity check
		const calls = vi.mocked(env.DB.prepare).mock.calls;
		const selectCall = calls.find(([sql]) => sql.includes("SELECT * FROM loft_activity"));
		expect(selectCall).toBeDefined();
	});
});

// =============================================================================
// ORPHAN SWEEP TESTS
// =============================================================================

describe("handleOrphanSweep", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return without logging when no orphans found", async () => {
		const env = createMockEnv();
		const mockFirefly = createMockFirefly();

		mockFirefly.sweepOrphans.mockResolvedValue([]);

		const { createLoftFirefly } = await import("../lib/firefly-factory");
		vi.mocked(createLoftFirefly).mockReturnValue(mockFirefly);

		await handleOrphanSweep(env, mockCtx);

		const calls = vi.mocked(env.DB.prepare).mock.calls;
		const eventCalls = calls.filter(([sql]) => sql.includes("loft_events"));
		expect(eventCalls.length).toBe(0);
	});

	it("should log orphan_swept event for each orphan found", async () => {
		const env = createMockEnv();
		const mockFirefly = createMockFirefly();

		mockFirefly.sweepOrphans.mockResolvedValue([
			{ id: "orphan-1", providerServerId: "fly-456" },
			{ id: "orphan-2", providerServerId: "fly-789" },
		]);

		const { createLoftFirefly } = await import("../lib/firefly-factory");
		vi.mocked(createLoftFirefly).mockReturnValue(mockFirefly);

		await handleOrphanSweep(env, mockCtx);

		const calls = vi.mocked(env.DB.prepare).mock.calls;
		const eventCalls = calls.filter(([sql]) => sql.includes("orphan_swept"));
		expect(eventCalls.length).toBe(2);
	});

	it("should call sweepOrphans with loft tags", async () => {
		const env = createMockEnv();
		const mockFirefly = createMockFirefly();

		mockFirefly.sweepOrphans.mockResolvedValue([]);

		const { createLoftFirefly } = await import("../lib/firefly-factory");
		vi.mocked(createLoftFirefly).mockReturnValue(mockFirefly);

		await handleOrphanSweep(env, mockCtx);

		expect(mockFirefly.sweepOrphans).toHaveBeenCalledWith(["loft"]);
	});

	it("should not throw when sweep operation fails", async () => {
		const env = createMockEnv();
		const mockFirefly = createMockFirefly();

		mockFirefly.sweepOrphans.mockRejectedValue(new Error("Firefly error"));

		const { createLoftFirefly } = await import("../lib/firefly-factory");
		vi.mocked(createLoftFirefly).mockReturnValue(mockFirefly);

		// Should not throw
		await expect(handleOrphanSweep(env, mockCtx)).resolves.toBeUndefined();
	});

	it("should log orphan_swept event for multiple orphans", async () => {
		const env = createMockEnv();
		const mockFirefly = createMockFirefly();

		mockFirefly.sweepOrphans.mockResolvedValue([
			{ id: "orphan-1", providerServerId: "fly-456" },
			{ id: "orphan-2", providerServerId: "fly-789" },
			{ id: "orphan-3", providerServerId: "fly-321" },
		]);

		const { createLoftFirefly } = await import("../lib/firefly-factory");
		vi.mocked(createLoftFirefly).mockReturnValue(mockFirefly);

		await handleOrphanSweep(env, mockCtx);

		const calls = vi.mocked(env.DB.prepare).mock.calls;
		expect(calls.length).toBe(3);
		for (const [sql] of calls) {
			expect(sql).toContain("orphan_swept");
		}
	});
});
