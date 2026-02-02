/**
 * D1 Logging Tests
 *
 * Tests for logging email sends to D1 database.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { logToD1, queryLogs, getTenantStats } from "../src/logging/d1";
import type { ZephyrLogEntry, EmailType } from "../src/types";

// Mock console.error to prevent noise in tests
vi.spyOn(console, "error").mockImplementation(() => {});

// Helper to create mock D1 database
function createMockD1() {
  const storedLogs: ZephyrLogEntry[] = [];
  let queryLog: Array<{ sql: string; params: unknown[] }> = [];

  return {
    storedLogs,
    queryLog,
    clearQueryLog: () => {
      queryLog = [];
    },
    prepare: vi.fn((sql: string) => ({
      bind: vi.fn((...params: unknown[]) => ({
        first: vi.fn(async () => ({ count: 0 })),
        all: vi.fn(async () => {
          queryLog.push({ sql, params });
          return { results: [] };
        }),
        run: vi.fn(async () => {
          queryLog.push({ sql, params });
          return { success: true };
        }),
      })),
    })),
  };
}

describe("logToD1", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create log entry on successful send", async () => {
    const mockDb = createMockD1();

    const logEntry = {
      id: "log-123",
      message_id: "msg-456",
      type: "transactional" as EmailType,
      template: "welcome",
      recipient: "user@example.com",
      subject: "Welcome to Grove",
      success: true,
      provider: "resend",
      attempts: 1,
      latency_ms: 150,
      tenant: "grove",
      source: "onboarding",
      correlation_id: "corr-789",
      idempotency_key: "idem-abc",
      created_at: Date.now(),
      sent_at: Date.now(),
    };

    await logToD1(mockDb as unknown as D1Database, logEntry);

    expect(mockDb.prepare).toHaveBeenCalled();
    const sql = mockDb.prepare.mock.calls[0][0];
    expect(sql).toContain("INSERT INTO zephyr_logs");
    expect(sql).toContain("message_id");
    expect(sql).toContain("recipient");
  });

  it("should create log entry on failed send", async () => {
    const mockDb = createMockD1();

    const logEntry = {
      id: "log-fail-123",
      type: "notification" as EmailType,
      template: "porch-reply",
      recipient: "user@example.com",
      success: false,
      error_code: "PROVIDER_ERROR" as const,
      error_message: "Network timeout",
      provider: "resend",
      attempts: 3,
      latency_ms: 5000,
      tenant: "grove",
      created_at: Date.now(),
    };

    await logToD1(mockDb as unknown as D1Database, logEntry);

    expect(mockDb.prepare).toHaveBeenCalled();
  });

  it("should NOT log email body for privacy", async () => {
    const mockDb = createMockD1();

    const logEntry = {
      id: "log-123",
      type: "transactional" as EmailType,
      template: "welcome",
      recipient: "user@example.com",
      success: true,
      attempts: 1,
      created_at: Date.now(),
    };

    await logToD1(mockDb as unknown as D1Database, logEntry);

    const sql = mockDb.prepare.mock.calls[0][0];
    // Should not contain body/html/text fields
    expect(sql).not.toContain("body");
    expect(sql).not.toContain("html");
    expect(sql).not.toContain("text");
  });

  it("should handle optional fields being null", async () => {
    const mockDb = createMockD1();

    const logEntry = {
      id: "log-minimal",
      type: "transactional" as EmailType,
      template: "test",
      recipient: "user@example.com",
      success: true,
      attempts: 1,
      created_at: Date.now(),
    };

    await logToD1(mockDb as unknown as D1Database, logEntry);

    expect(mockDb.prepare).toHaveBeenCalled();
    const bindCall = mockDb.prepare.mock.results[0].value.bind;
    expect(bindCall).toHaveBeenCalled();
  });

  it("should not fail the request if logging fails", async () => {
    const dbWithError = {
      prepare: vi.fn(() => {
        throw new Error("Database write failed");
      }),
    } as unknown as D1Database;

    const logEntry = {
      id: "log-123",
      type: "transactional" as EmailType,
      template: "test",
      recipient: "user@example.com",
      success: true,
      attempts: 1,
      created_at: Date.now(),
    };

    // Should not throw
    await expect(logToD1(dbWithError, logEntry)).resolves.not.toThrow();
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("Failed to write to D1"),
      expect.any(Error),
    );
  });

  it("should log all required fields", async () => {
    const mockDb = createMockD1();

    const logEntry = {
      id: "log-complete",
      message_id: "msg-123",
      type: "transactional" as EmailType,
      template: "welcome",
      recipient: "user@example.com",
      subject: "Welcome",
      success: true,
      error_code: undefined,
      error_message: undefined,
      provider: "resend",
      attempts: 1,
      latency_ms: 100,
      tenant: "grove",
      source: "api",
      correlation_id: "corr-456",
      idempotency_key: "idem-789",
      created_at: Date.now(),
      scheduled_at: undefined,
      sent_at: Date.now(),
    };

    await logToD1(mockDb as unknown as D1Database, logEntry);

    const bindCall = mockDb.prepare.mock.results[0].value.bind;
    const boundParams = bindCall.mock.calls[0];

    // Verify all required fields are bound
    expect(boundParams[0]).toBe("log-complete"); // id
    expect(boundParams[1]).toBe("msg-123"); // message_id
    expect(boundParams[2]).toBe("transactional"); // type
    expect(boundParams[3]).toBe("welcome"); // template
    expect(boundParams[4]).toBe("user@example.com"); // recipient
    expect(boundParams[5]).toBe("Welcome"); // subject
    expect(boundParams[6]).toBe(1); // success (as integer)
    expect(boundParams[10]).toBe(1); // attempts
    expect(boundParams[11]).toBe(100); // latency_ms
  });
});

describe("queryLogs", () => {
  it("should query logs by recipient", async () => {
    const mockDb = createMockD1();
    const logs: ZephyrLogEntry[] = [
      {
        id: "log-1",
        type: "transactional",
        template: "welcome",
        recipient: "user@example.com",
        success: true,
        attempts: 1,
        created_at: Date.now(),
      },
    ];

    const dbWithResults = {
      prepare: vi.fn((sql: string) => ({
        bind: vi.fn((...params: unknown[]) => ({
          first: vi.fn(async () => ({ count: 1 })),
          all: vi.fn(async () => ({ results: logs })),
          run: vi.fn(async () => ({ success: true })),
        })),
      })),
    } as unknown as D1Database;

    const result = await queryLogs(dbWithResults, {
      recipient: "user@example.com",
    });

    expect(result).toEqual(logs);
  });

  it("should query logs by date range", async () => {
    const mockDb = {
      prepare: vi.fn((sql: string) => ({
        bind: vi.fn((...params: unknown[]) => ({
          first: vi.fn(async () => ({ count: 0 })),
          all: vi.fn(async () => {
            // Verify SQL includes date range
            expect(sql).toContain("created_at >= ?");
            expect(sql).toContain("created_at <= ?");
            return { results: [] };
          }),
          run: vi.fn(async () => ({ success: true })),
        })),
      })),
    } as unknown as D1Database;

    const startTime = Date.now() - 24 * 60 * 60 * 1000; // 1 day ago
    const endTime = Date.now();

    await queryLogs(mockDb, {
      startTime,
      endTime,
    });
  });

  it("should apply all filters together", async () => {
    const capturedSql: string[] = [];
    const capturedParams: unknown[][] = [];

    const mockDb = {
      prepare: vi.fn((sql: string) => ({
        bind: vi.fn((...params: unknown[]) => ({
          first: vi.fn(async () => ({ count: 0 })),
          all: vi.fn(async () => {
            capturedSql.push(sql);
            capturedParams.push(params);
            return { results: [] };
          }),
          run: vi.fn(async () => ({ success: true })),
        })),
      })),
    } as unknown as D1Database;

    await queryLogs(mockDb, {
      tenant: "grove",
      recipient: "user@example.com",
      type: "transactional",
      success: true,
      startTime: 1000,
      endTime: 2000,
      limit: 50,
      offset: 10,
    });

    expect(capturedSql[0]).toContain("tenant = ?");
    expect(capturedSql[0]).toContain("recipient = ?");
    expect(capturedSql[0]).toContain("type = ?");
    expect(capturedSql[0]).toContain("success = ?");
    expect(capturedSql[0]).toContain("LIMIT ? OFFSET ?");
  });

  it("should use default limit and offset", async () => {
    const capturedSql: string[] = [];

    const mockDb = {
      prepare: vi.fn((sql: string) => ({
        bind: vi.fn(() => ({
          first: vi.fn(async () => ({ count: 0 })),
          all: vi.fn(async () => {
            capturedSql.push(sql);
            return { results: [] };
          }),
          run: vi.fn(async () => ({ success: true })),
        })),
      })),
    } as unknown as D1Database;

    await queryLogs(mockDb, {});

    expect(capturedSql[0]).toContain("LIMIT ? OFFSET ?");
  });
});

describe("getTenantStats", () => {
  it("should aggregate stats by type", async () => {
    const mockResults = [
      { type: "transactional", success: 1, count: 45 },
      { type: "transactional", success: 0, count: 5 },
      { type: "notification", success: 1, count: 30 },
      { type: "notification", success: 0, count: 2 },
    ];

    const mockDb = {
      prepare: vi.fn(() => ({
        bind: vi.fn(() => ({
          first: vi.fn(async () => ({ count: 0 })),
          all: vi.fn(async () => ({ results: mockResults })),
          run: vi.fn(async () => ({ success: true })),
        })),
      })),
    } as unknown as D1Database;

    const stats = await getTenantStats(mockDb, "grove", 1000, 2000);

    expect(stats.total).toBe(82);
    expect(stats.successful).toBe(75);
    expect(stats.failed).toBe(7);
    expect(stats.byType.transactional).toEqual({
      total: 50,
      successful: 45,
      failed: 5,
    });
    expect(stats.byType.notification).toEqual({
      total: 32,
      successful: 30,
      failed: 2,
    });
  });

  it("should handle empty results", async () => {
    const mockDb = {
      prepare: vi.fn(() => ({
        bind: vi.fn(() => ({
          first: vi.fn(async () => ({ count: 0 })),
          all: vi.fn(async () => ({ results: [] })),
          run: vi.fn(async () => ({ success: true })),
        })),
      })),
    } as unknown as D1Database;

    const stats = await getTenantStats(mockDb, "grove", 1000, 2000);

    expect(stats.total).toBe(0);
    expect(stats.successful).toBe(0);
    expect(stats.failed).toBe(0);
    expect(Object.keys(stats.byType)).toHaveLength(0);
  });

  it("should filter by tenant and time range", async () => {
    const capturedParams: unknown[][] = [];

    const mockDb = {
      prepare: vi.fn(() => ({
        bind: vi.fn((...params: unknown[]) => ({
          first: vi.fn(async () => ({ count: 0 })),
          all: vi.fn(async () => {
            capturedParams.push(params);
            return { results: [] };
          }),
          run: vi.fn(async () => ({ success: true })),
        })),
      })),
    } as unknown as D1Database;

    const startTime = 1000;
    const endTime = 2000;

    await getTenantStats(mockDb, "my-tenant", startTime, endTime);

    expect(capturedParams[0]).toEqual(["my-tenant", startTime, endTime]);
  });
});
