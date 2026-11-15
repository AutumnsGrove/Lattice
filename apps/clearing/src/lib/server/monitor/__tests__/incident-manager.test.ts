import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
	closeStaleIncidents,
	processHealthCheckResult,
	type IncidentEnv,
} from "../incident-manager";
import type { HealthCheckResult } from "../health-checks";

// Mock utils
vi.mock("../utils", () => ({
	generateUUID: vi.fn(() => "mock-uuid-1234"),
}));

function createMockKV(): KVNamespace {
	const store = new Map<string, string>();
	return {
		get: vi.fn(async (key: string) => {
			const val = store.get(key);
			return val ? JSON.parse(val) : null;
		}),
		put: vi.fn(async (key: string, value: string) => {
			store.set(key, value);
		}),
		delete: vi.fn(),
		list: vi.fn(),
		getWithMetadata: vi.fn(),
	} as unknown as KVNamespace;
}

function createMockDB(openIncidents: Array<{ id: string; title: string }> = []): D1Database {
	const runResult = { success: true, meta: { changes: 1 } };
	const mockStmt = {
		bind: vi.fn().mockReturnThis(),
		run: vi.fn().mockResolvedValue(runResult),
		first: vi.fn().mockResolvedValue(null),
		all: vi.fn().mockResolvedValue({ results: openIncidents }),
	};

	return {
		prepare: vi.fn(() => ({
			...mockStmt,
			bind: vi.fn().mockReturnValue(mockStmt),
		})),
		batch: vi.fn().mockResolvedValue([]),
		exec: vi.fn(),
		dump: vi.fn(),
	} as unknown as D1Database;
}

function createHealthyResult(componentId = "comp_test"): HealthCheckResult {
	return {
		componentId,
		componentName: "Test Service",
		status: "operational",
		latencyMs: 100,
		httpStatus: 200,
		error: null,
		timestamp: "2025-01-01T00:00:00.000Z",
	};
}

function createUnhealthyResult(
	componentId = "comp_test",
	status: HealthCheckResult["status"] = "major_outage",
): HealthCheckResult {
	return {
		componentId,
		componentName: "Test Service",
		status,
		latencyMs: 5000,
		httpStatus: 500,
		error: "Connection refused",
		timestamp: "2025-01-01T00:00:00.000Z",
	};
}

describe("processHealthCheckResult - State Machine", () => {
	let env: IncidentEnv;

	beforeEach(() => {
		vi.restoreAllMocks();
		env = {
			DB: createMockDB(),
			MONITOR_KV: createMockKV(),
			ZEPHYR_URL: undefined,
			ZEPHYR_API_KEY: undefined,
			ALERT_EMAIL: undefined,
		};
	});

	it("should increment consecutiveFailures on unhealthy result", async () => {
		await processHealthCheckResult(env, createUnhealthyResult());

		// Verify state was saved to KV
		expect(env.MONITOR_KV.put).toHaveBeenCalled();
		const savedState = JSON.parse(
			(env.MONITOR_KV.put as ReturnType<typeof vi.fn>).mock.calls[0][1],
		);
		expect(savedState.consecutiveFailures).toBe(1);
	});

	it("should reset consecutiveSuccesses on unhealthy result", async () => {
		// Prime KV with a state that has some successes
		(env.MONITOR_KV.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			consecutiveFailures: 0,
			consecutiveSuccesses: 5,
			activeIncidentId: null,
			lastStatus: "operational",
			lastCheckAt: "2025-01-01T00:00:00.000Z",
		});

		await processHealthCheckResult(env, createUnhealthyResult());

		const savedState = JSON.parse(
			(env.MONITOR_KV.put as ReturnType<typeof vi.fn>).mock.calls[0][1],
		);
		expect(savedState.consecutiveSuccesses).toBe(0);
	});

	it("should create incident after 3 consecutive failures", async () => {
		// Prime with 2 existing failures (next one triggers incident)
		(env.MONITOR_KV.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			consecutiveFailures: 2,
			consecutiveSuccesses: 0,
			activeIncidentId: null,
			lastStatus: "major_outage",
			lastCheckAt: "2025-01-01T00:00:00.000Z",
		});

		await processHealthCheckResult(env, createUnhealthyResult());

		// Should have called db.batch for incident creation
		expect(env.DB.batch).toHaveBeenCalled();

		// The row must be marked as monitor-created, so recovery can close it.
		const insert = (env.DB.prepare as Mock).mock.calls
			.map((call) => String(call[0]))
			.find((query) => query.includes("INSERT INTO status_incidents"));
		expect(insert).toContain("auto_resolve");
	});

	it("should NOT create incident with fewer than 3 failures", async () => {
		// Only 1 existing failure
		(env.MONITOR_KV.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			consecutiveFailures: 1,
			consecutiveSuccesses: 0,
			activeIncidentId: null,
			lastStatus: "major_outage",
			lastCheckAt: "2025-01-01T00:00:00.000Z",
		});

		await processHealthCheckResult(env, createUnhealthyResult());

		// Should NOT have called batch (no incident created)
		expect(env.DB.batch).not.toHaveBeenCalled();
	});

	it("should increment consecutiveSuccesses on healthy result", async () => {
		await processHealthCheckResult(env, createHealthyResult());

		const savedState = JSON.parse(
			(env.MONITOR_KV.put as ReturnType<typeof vi.fn>).mock.calls[0][1],
		);
		expect(savedState.consecutiveSuccesses).toBe(1);
	});

	it("should resolve open incidents from D1 even when KV has forgotten them", async () => {
		// The incident is open in D1 but KV has no activeIncidentId (expired,
		// evicted, or corrupt). This is the case that used to leave incidents
		// open for weeks: resolution was keyed entirely off the KV pointer.
		env = {
			DB: createMockDB([{ id: "incident-orphan", title: "Payments - Partial Outage" }]),
			MONITOR_KV: createMockKV(),
		};

		(env.MONITOR_KV.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			consecutiveFailures: 0,
			consecutiveSuccesses: 1,
			activeIncidentId: null,
			lastStatus: "major_outage",
			lastCheckAt: "2025-01-01T00:00:00.000Z",
		});

		// The incident existence check inside resolveIncident must find it.
		const mockStmt = (env.DB.prepare as Mock)();
		mockStmt.first.mockResolvedValueOnce(null).mockResolvedValue({ id: "incident-orphan" });

		await processHealthCheckResult(env, createHealthyResult());

		// Should have called db.batch for resolution
		expect(env.DB.batch).toHaveBeenCalled();

		// ...but only for incidents the monitor created. An operator's security
		// or maintenance notice must survive a green check.
		const sql = (env.DB.prepare as Mock).mock.calls
			.map((call) => String(call[0]))
			.find((query) => query.includes("FROM status_incidents i"));
		expect(sql).toContain("auto_resolve = 1");
	});

	it("should not resolve anything when D1 has no open incident", async () => {
		(env.MONITOR_KV.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			consecutiveFailures: 0,
			consecutiveSuccesses: 1,
			activeIncidentId: "deleted-incident",
			lastStatus: "major_outage",
			lastCheckAt: "2025-01-01T00:00:00.000Z",
		});

		await processHealthCheckResult(env, createHealthyResult());

		// No open incident in D1 — nothing to resolve, and no phantom resolution.
		expect(env.DB.batch).not.toHaveBeenCalled();

		// The stale pointer is still cleared from local state.
		const savedState = JSON.parse(
			(env.MONITOR_KV.put as ReturnType<typeof vi.fn>).mock.calls[0][1],
		);
		expect(savedState.activeIncidentId).toBeNull();
	});

	it("should NOT resolve incident with fewer than 2 successes", async () => {
		(env.MONITOR_KV.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			consecutiveFailures: 0,
			consecutiveSuccesses: 0,
			activeIncidentId: "incident-123",
			lastStatus: "major_outage",
			lastCheckAt: "2025-01-01T00:00:00.000Z",
		});

		await processHealthCheckResult(env, createHealthyResult());

		// batch should not have been called (no resolution)
		expect(env.DB.batch).not.toHaveBeenCalled();
	});

	it("should NOT update current_status on first unhealthy check (debounce)", async () => {
		await processHealthCheckResult(env, createUnhealthyResult());

		// First failure should NOT update current_status (needs 2 consecutive).
		// The last_check_at stamp is written on every check, so filter it out.
		const prepareCalls = (env.DB.prepare as ReturnType<typeof vi.fn>).mock.calls;
		const statusUpdateCalls = prepareCalls.filter(
			(call: string[]) =>
				call[0].includes("UPDATE status_components") && call[0].includes("current_status"),
		);
		expect(statusUpdateCalls.length).toBe(0);
	});

	it("should keep updating status when incident bookkeeping fails", async () => {
		// Simulates a worker deployed before migration 0012: the incident queries
		// reference a column that doesn't exist yet. Status and counters must
		// still move, or the monitor looks dead until the migration runs.
		const db = env.DB as unknown as { prepare: Mock };
		const realPrepare = db.prepare.getMockImplementation()!;
		db.prepare.mockImplementation((sql: string) => {
			if (sql.includes("auto_resolve")) {
				throw new Error("D1_ERROR: no such column: auto_resolve");
			}
			return realPrepare(sql);
		});

		(env.MONITOR_KV.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			consecutiveFailures: 2,
			consecutiveSuccesses: 0,
			activeIncidentId: null,
			lastStatus: "operational",
			lastCheckAt: "2025-01-01T00:00:00.000Z",
		});

		await expect(processHealthCheckResult(env, createUnhealthyResult())).resolves.not.toThrow();

		expect(env.DB.prepare).toHaveBeenCalledWith(expect.stringContaining("current_status"));
		expect(env.MONITOR_KV.put).toHaveBeenCalled();
	});

	it("should stamp last_check_at on every check", async () => {
		await processHealthCheckResult(env, createHealthyResult());

		expect(env.DB.prepare).toHaveBeenCalledWith(expect.stringContaining("SET last_check_at"));
	});

	it("should still update status when recording history throws", async () => {
		env = {
			DB: createMockDB(),
			MONITOR_KV: createMockKV(),
		};

		// Simulate a D1 writer hiccup on the daily-history insert only.
		const db = env.DB as unknown as { prepare: Mock };
		db.prepare.mockImplementation((sql: string) => {
			const fails = sql.includes("INSERT INTO status_daily_history");
			const stmt = {
				bind: vi.fn().mockReturnThis(),
				run: fails
					? vi.fn().mockRejectedValue(new Error("D1_ERROR: write failed"))
					: vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } }),
				first: vi.fn().mockResolvedValue(null),
				all: vi.fn().mockResolvedValue({ results: [] }),
			};
			return { ...stmt, bind: vi.fn().mockReturnValue(stmt) };
		});

		(env.MONITOR_KV.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			consecutiveFailures: 1,
			consecutiveSuccesses: 0,
			activeIncidentId: null,
			lastStatus: "operational",
			lastCheckAt: "2025-01-01T00:00:00.000Z",
		});

		await expect(processHealthCheckResult(env, createUnhealthyResult())).resolves.not.toThrow();

		// Status still moves: the history write must not gate the state machine.
		expect(env.DB.prepare).toHaveBeenCalledWith(expect.stringContaining("current_status"));
	});

	it("should not open an incident for latency-only degradation", async () => {
		(env.MONITOR_KV.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			consecutiveFailures: 2,
			consecutiveSuccesses: 0,
			activeIncidentId: null,
			lastStatus: "degraded",
			lastCheckAt: "2025-01-01T00:00:00.000Z",
		});

		const slowButHealthy: HealthCheckResult = {
			componentId: "comp_test",
			componentName: "Test Service",
			status: "degraded",
			latencyMs: 6200,
			httpStatus: 200,
			error: null,
			latencyDegraded: true,
			timestamp: "2025-01-01T00:00:00.000Z",
		};

		await processHealthCheckResult(env, slowButHealthy);

		// Degraded is recorded against the component, but no public incident.
		expect(env.DB.batch).not.toHaveBeenCalled();
		expect(env.DB.prepare).toHaveBeenCalledWith(expect.stringContaining("current_status"));
	});

	it("should not duplicate an incident that is already open in D1", async () => {
		env = {
			DB: createMockDB([{ id: "incident-existing", title: "Payments - Partial Outage" }]),
			MONITOR_KV: createMockKV(),
		};

		(env.MONITOR_KV.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			consecutiveFailures: 2,
			consecutiveSuccesses: 0,
			activeIncidentId: null,
			lastStatus: "partial_outage",
			lastCheckAt: "2025-01-01T00:00:00.000Z",
		});

		await processHealthCheckResult(env, createUnhealthyResult("comp_test", "partial_outage"));

		expect(env.DB.batch).not.toHaveBeenCalled();

		const savedState = JSON.parse(
			(env.MONITOR_KV.put as ReturnType<typeof vi.fn>).mock.calls[0][1],
		);
		expect(savedState.activeIncidentId).toBe("incident-existing");
	});

	it("should update component status after 2 consecutive unhealthy checks", async () => {
		// Prime with 1 existing failure (next one meets CHECKS_TO_DEGRADE threshold)
		(env.MONITOR_KV.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			consecutiveFailures: 1,
			consecutiveSuccesses: 0,
			activeIncidentId: null,
			lastStatus: "operational",
			lastCheckAt: "2025-01-01T00:00:00.000Z",
		});

		await processHealthCheckResult(env, createUnhealthyResult());

		// Now it should update status in D1
		expect(env.DB.prepare).toHaveBeenCalledWith(
			expect.stringContaining("UPDATE status_components"),
		);
	});

	it("should save state to KV after processing", async () => {
		await processHealthCheckResult(env, createHealthyResult());

		expect(env.MONITOR_KV.put).toHaveBeenCalledWith(
			"monitor:comp_test",
			expect.any(String),
			expect.objectContaining({ expirationTtl: 604800 }),
		);
	});

	it("should handle maintenance status without creating incidents", async () => {
		const maintenanceResult: HealthCheckResult = {
			componentId: "comp_test",
			componentName: "Test Service",
			status: "maintenance",
			latencyMs: 100,
			httpStatus: 203,
			error: null,
			timestamp: "2025-01-01T00:00:00.000Z",
		};

		await processHealthCheckResult(env, maintenanceResult);

		// Should update component status to maintenance
		expect(env.DB.prepare).toHaveBeenCalledWith(
			expect.stringContaining("UPDATE status_components"),
		);

		// Should NOT create an incident
		expect(env.DB.batch).not.toHaveBeenCalled();

		// Should save state with maintenance status
		const savedState = JSON.parse(
			(env.MONITOR_KV.put as ReturnType<typeof vi.fn>).mock.calls[0][1],
		);
		expect(savedState.lastStatus).toBe("maintenance");
	});
});

describe("sendEmailAlert (via Zephyr)", () => {
	let env: IncidentEnv;

	beforeEach(() => {
		vi.restoreAllMocks();
		env = {
			DB: createMockDB(),
			MONITOR_KV: createMockKV(),
			ZEPHYR_URL: undefined,
			ZEPHYR_API_KEY: undefined,
			ALERT_EMAIL: undefined,
		};
	});

	it("should skip when no ZEPHYR_URL", async () => {
		const fetchSpy = vi.spyOn(globalThis, "fetch");

		// Process a result that would trigger incident creation + email
		(env.MONITOR_KV.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			consecutiveFailures: 2,
			consecutiveSuccesses: 0,
			activeIncidentId: null,
			lastStatus: "major_outage",
			lastCheckAt: "2025-01-01T00:00:00.000Z",
		});

		await processHealthCheckResult(env, createUnhealthyResult());

		// fetch should NOT have been called (no Zephyr URL configured)
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it("should send email via Zephyr with correct payload", async () => {
		env.ZEPHYR_URL = "https://grove-zephyr.test.workers.dev";
		env.ZEPHYR_API_KEY = "test-api-key";
		env.ALERT_EMAIL = "test@grove.place";

		const fetchSpy = vi
			.spyOn(globalThis, "fetch")
			.mockResolvedValue(
				new Response(JSON.stringify({ success: true, messageId: "msg-123" }), { status: 200 }),
			);

		(env.MONITOR_KV.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			consecutiveFailures: 2,
			consecutiveSuccesses: 0,
			activeIncidentId: null,
			lastStatus: "major_outage",
			lastCheckAt: "2025-01-01T00:00:00.000Z",
		});

		await processHealthCheckResult(env, createUnhealthyResult());

		// Wait for fire-and-forget email to complete
		await new Promise((resolve) => setTimeout(resolve, 50));

		const zephyrCalls = fetchSpy.mock.calls.filter((call) =>
			String(call[0]).includes("grove-zephyr"),
		);
		expect(zephyrCalls.length).toBe(1);

		const body = JSON.parse(zephyrCalls[0][1]?.body as string);
		expect(body.to).toBe("test@grove.place");
		expect(body.subject).toContain("[Grove] Incident:");
		expect(body.type).toBe("notification");
		expect(body.template).toBe("raw");
	});

	it("should not throw on email failure", async () => {
		env.ZEPHYR_URL = "https://grove-zephyr.test.workers.dev";
		env.ZEPHYR_API_KEY = "test-api-key";

		vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));

		(env.MONITOR_KV.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			consecutiveFailures: 2,
			consecutiveSuccesses: 0,
			activeIncidentId: null,
			lastStatus: "major_outage",
			lastCheckAt: "2025-01-01T00:00:00.000Z",
		});

		// Should not throw even if email fails
		await expect(processHealthCheckResult(env, createUnhealthyResult())).resolves.not.toThrow();
	});
});

describe("closeStaleIncidents", () => {
	it("closes incidents left open against a healthy component", async () => {
		const env: IncidentEnv = {
			DB: createMockDB([{ id: "incident-old", title: "Payments - Partial Outage" }]),
			MONITOR_KV: createMockKV(),
		};

		// resolveIncident re-checks that the incident still exists before closing it.
		const mockStmt = (env.DB.prepare as Mock)();
		mockStmt.first.mockResolvedValue({ id: "incident-old" });

		const closed = await closeStaleIncidents(env);

		expect(closed).toBe(1);
		expect(env.DB.batch).toHaveBeenCalled();

		// The sweep must never close an incident a human is working.
		const sql = (env.DB.prepare as Mock).mock.calls
			.map((call) => String(call[0]))
			.find((query) => query.includes("FROM status_incidents i"));
		expect(sql).toContain("auto_resolve = 1");
	});

	it("closes nothing when no incident is stale", async () => {
		const env: IncidentEnv = {
			DB: createMockDB([]),
			MONITOR_KV: createMockKV(),
		};

		expect(await closeStaleIncidents(env)).toBe(0);
		expect(env.DB.batch).not.toHaveBeenCalled();
	});
});
