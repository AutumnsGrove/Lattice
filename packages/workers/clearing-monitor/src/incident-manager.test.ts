import { describe, it, expect, vi, beforeEach } from "vitest";
import { processHealthCheckResult, type IncidentEnv } from "./incident-manager";
import type { HealthCheckResult } from "./health-checks";

// Mock utils
vi.mock("./utils", () => ({
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

function createMockDB(): D1Database {
  const runResult = { success: true, meta: { changes: 1 } };
  const mockStmt = {
    bind: vi.fn().mockReturnThis(),
    run: vi.fn().mockResolvedValue(runResult),
    first: vi.fn().mockResolvedValue(null),
    all: vi.fn().mockResolvedValue({ results: [] }),
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
      RESEND_API_KEY: undefined,
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

  it("should resolve incident after 2 consecutive successes", async () => {
    // Prime with active incident and 1 success already
    (env.MONITOR_KV.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      consecutiveFailures: 0,
      consecutiveSuccesses: 1,
      activeIncidentId: "incident-123",
      lastStatus: "major_outage",
      lastCheckAt: "2025-01-01T00:00:00.000Z",
    });

    // Mock the incident existence check (resolveIncident does a SELECT first)
    const mockStmt = (env.DB.prepare as ReturnType<typeof vi.fn>)();
    mockStmt.first.mockResolvedValueOnce({ id: "incident-123" });

    await processHealthCheckResult(env, createHealthyResult());

    // Should have called db.batch for resolution
    expect(env.DB.batch).toHaveBeenCalled();

    // Should have cleared activeIncidentId
    const savedState = JSON.parse(
      (env.MONITOR_KV.put as ReturnType<typeof vi.fn>).mock.calls[0][1],
    );
    expect(savedState.activeIncidentId).toBeNull();
  });

  it("should clear activeIncidentId even if incident was already deleted", async () => {
    // Prime with active incident that no longer exists in D1
    (env.MONITOR_KV.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      consecutiveFailures: 0,
      consecutiveSuccesses: 1,
      activeIncidentId: "deleted-incident",
      lastStatus: "major_outage",
      lastCheckAt: "2025-01-01T00:00:00.000Z",
    });

    // Mock: incident doesn't exist (first() returns null)
    const mockStmt = (env.DB.prepare as ReturnType<typeof vi.fn>)();
    mockStmt.first.mockResolvedValueOnce(null);

    await processHealthCheckResult(env, createHealthyResult());

    // Should NOT have called batch (incident doesn't exist)
    expect(env.DB.batch).not.toHaveBeenCalled();

    // But should still clear activeIncidentId from state
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

  it("should NOT update component status on first unhealthy check (debounce)", async () => {
    await processHealthCheckResult(env, createUnhealthyResult());

    // First failure should NOT update component status (needs 2 consecutive)
    const prepareCalls = (env.DB.prepare as ReturnType<typeof vi.fn>).mock
      .calls;
    const statusUpdateCalls = prepareCalls.filter((call: string[]) =>
      call[0].includes("UPDATE status_components"),
    );
    expect(statusUpdateCalls.length).toBe(0);
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

describe("sendEmailAlert", () => {
  let env: IncidentEnv;

  beforeEach(() => {
    vi.restoreAllMocks();
    env = {
      DB: createMockDB(),
      MONITOR_KV: createMockKV(),
      RESEND_API_KEY: undefined,
      ALERT_EMAIL: undefined,
    };
  });

  it("should skip when no RESEND_API_KEY", async () => {
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

    // fetch should NOT have been called for Resend API
    const resendCalls = fetchSpy.mock.calls.filter((call) =>
      String(call[0]).includes("resend.com"),
    );
    expect(resendCalls.length).toBe(0);
  });

  it("should call Resend API with correct payload", async () => {
    env.RESEND_API_KEY = "test-api-key";
    env.ALERT_EMAIL = "test@grove.place";

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ id: "email-123" }), { status: 200 }),
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

    const resendCalls = fetchSpy.mock.calls.filter((call) =>
      String(call[0]).includes("resend.com"),
    );
    expect(resendCalls.length).toBe(1);

    const body = JSON.parse(resendCalls[0][1]?.body as string);
    expect(body.to).toEqual(["test@grove.place"]);
    expect(body.subject).toContain("[Grove] Incident:");
  });

  it("should not throw on email failure", async () => {
    env.RESEND_API_KEY = "test-api-key";

    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));

    (env.MONITOR_KV.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      consecutiveFailures: 2,
      consecutiveSuccesses: 0,
      activeIncidentId: null,
      lastStatus: "major_outage",
      lastCheckAt: "2025-01-01T00:00:00.000Z",
    });

    // Should not throw even if email fails
    await expect(
      processHealthCheckResult(env, createUnhealthyResult()),
    ).resolves.not.toThrow();
  });
});
