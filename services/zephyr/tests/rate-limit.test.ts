/**
 * Rate Limiting Middleware Tests
 *
 * Tests for per-tenant rate limiting by email type using atomic counters.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  checkRateLimit,
  getRateLimitStatus,
} from "../src/middleware/rate-limit";
import type { EmailType } from "../src/types";

// Mock D1 database with atomic increment support
function createMockD1(initialCounts?: { minute?: number; day?: number }) {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  let minuteCount = initialCounts?.minute ?? 0;
  let dayCount = initialCounts?.day ?? 0;

  return {
    queries,
    prepare: vi.fn((sql: string) => {
      queries.push({ sql, params: [] });
      return {
        bind: vi.fn((...params: unknown[]) => {
          queries[queries.length - 1].params = params;
          return {
            first: vi.fn(async () => {
              // Determine which table is being queried
              const isMinuteTable = sql.includes("zephyr_rate_limits");
              const isDayTable = sql.includes("zephyr_rate_limits_daily");

              if (sql.includes("INSERT") && sql.includes("ON CONFLICT")) {
                // Atomic increment - return incremented count
                if (isDayTable) {
                  dayCount++;
                  return { count: dayCount };
                } else {
                  minuteCount++;
                  return { count: minuteCount };
                }
              }

              // SELECT query for getRateLimitStatus
              if (isDayTable) {
                return { count: dayCount };
              }
              return { count: minuteCount };
            }),
            all: vi.fn(async () => ({
              results: [],
            })),
            run: vi.fn(async () => ({ success: true })),
          };
        }),
      };
    }),
    getCounts: () => ({ minute: minuteCount, day: dayCount }),
    // Helper to simulate specific counts
    simulateCount: (count: number) => {
      minuteCount = count;
      dayCount = count;
      return mockDb as unknown as D1Database;
    },
  };
}

let mockDb: ReturnType<typeof createMockD1>;

describe("checkRateLimit", () => {
  beforeEach(() => {
    mockDb = createMockD1();
  });

  it("should allow request within limits", async () => {
    const result = await checkRateLimit(
      mockDb as unknown as D1Database,
      "test-tenant",
      "transactional",
      "user@example.com",
    );

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBeGreaterThan(0);
  });

  it("should atomically increment counters", async () => {
    await checkRateLimit(
      mockDb as unknown as D1Database,
      "test-tenant",
      "transactional",
      "user@example.com",
    );

    const counts = mockDb.getCounts();
    expect(counts.minute).toBe(1);
    expect(counts.day).toBe(1);
  });

  it("should reject when per-minute limit exceeded", async () => {
    // Start at 60 (at limit), next increment makes it 61
    mockDb = createMockD1({ minute: 60, day: 0 });

    const result = await checkRateLimit(
      mockDb as unknown as D1Database,
      "test-tenant",
      "transactional",
      "user@example.com",
    );

    expect(result.allowed).toBe(false);
    expect(result.message).toContain("per minute");
    expect(result.remaining).toBe(0);
  });

  it("should reject when per-day limit exceeded", async () => {
    // Minute count low, day count at limit
    mockDb = createMockD1({ minute: 10, day: 1000 });

    const result = await checkRateLimit(
      mockDb as unknown as D1Database,
      "test-tenant",
      "transactional",
      "user@example.com",
    );

    expect(result.allowed).toBe(false);
    expect(result.message).toContain("per day");
  });

  it("should have different limits for different email types", async () => {
    // Test verification type (stricter limits: 10/min, 100/day)
    mockDb = createMockD1({ minute: 10, day: 10 });
    const verificationResult = await checkRateLimit(
      mockDb as unknown as D1Database,
      "test-tenant",
      "verification",
      "user@example.com",
    );

    expect(verificationResult.allowed).toBe(false);

    // Test broadcast type (higher limits: 1000/min, 10000/day)
    mockDb = createMockD1({ minute: 1000, day: 1000 });
    const broadcastResult = await checkRateLimit(
      mockDb as unknown as D1Database,
      "test-tenant",
      "broadcast",
      "user@example.com",
    );

    expect(broadcastResult.allowed).toBe(false);
  });

  it("should allow request in new time bucket after limit", async () => {
    // First request at limit
    mockDb = createMockD1({ minute: 60, day: 60 });
    const blockedResult = await checkRateLimit(
      mockDb as unknown as D1Database,
      "test-tenant",
      "transactional",
      "user@example.com",
    );

    expect(blockedResult.allowed).toBe(false);

    // New bucket (simulated by fresh mock with 0 counts)
    mockDb = createMockD1({ minute: 0, day: 0 });
    const allowedResult = await checkRateLimit(
      mockDb as unknown as D1Database,
      "test-tenant",
      "transactional",
      "user@example.com",
    );

    expect(allowedResult.allowed).toBe(true);
  });

  it("should fail open on database error", async () => {
    const dbWithError = {
      prepare: vi.fn(() => {
        throw new Error("Database connection failed");
      }),
    } as unknown as D1Database;

    const result = await checkRateLimit(
      dbWithError,
      "test-tenant",
      "transactional",
      "user@example.com",
    );

    expect(result.allowed).toBe(true);
  });

  it("should track remaining count correctly", async () => {
    // At count 30, after increment becomes 31, so remaining = 60 - 31 = 29
    mockDb = createMockD1({ minute: 30, day: 30 });

    const result = await checkRateLimit(
      mockDb as unknown as D1Database,
      "test-tenant",
      "transactional",
      "user@example.com",
    );

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(29); // 60 - 31 = 29
  });

  it("should prevent race condition with atomic increments", async () => {
    // Simulate concurrent requests - each should get accurate count
    mockDb = createMockD1({ minute: 0, day: 0 });

    const results = await Promise.all([
      checkRateLimit(
        mockDb as unknown as D1Database,
        "test-tenant",
        "transactional",
        "user1@example.com",
      ),
      checkRateLimit(
        mockDb as unknown as D1Database,
        "test-tenant",
        "transactional",
        "user2@example.com",
      ),
      checkRateLimit(
        mockDb as unknown as D1Database,
        "test-tenant",
        "transactional",
        "user3@example.com",
      ),
    ]);

    // All should be allowed (only 3 requests, limit is 60)
    expect(results.every((r) => r.allowed)).toBe(true);

    // Counter should show 3
    const counts = mockDb.getCounts();
    expect(counts.minute).toBe(3);
  });
});

describe("getRateLimitStatus", () => {
  it("should return complete rate limit status", async () => {
    mockDb = createMockD1({ minute: 25, day: 100 });

    const status = await getRateLimitStatus(
      mockDb as unknown as D1Database,
      "test-tenant",
      "transactional",
    );

    expect(status.perMinute).toEqual({
      limit: 60,
      used: 25,
      remaining: 35,
    });

    expect(status.perDay).toEqual({
      limit: 1000,
      used: 100,
      remaining: 900,
    });
  });

  it("should handle zero usage", async () => {
    mockDb = createMockD1({ minute: 0, day: 0 });

    const status = await getRateLimitStatus(
      mockDb as unknown as D1Database,
      "test-tenant",
      "notification",
    );

    expect(status.perMinute.used).toBe(0);
    expect(status.perMinute.remaining).toBe(60);
    expect(status.perDay.used).toBe(0);
    expect(status.perDay.remaining).toBe(1000);
  });

  it("should cap remaining at zero when over limit", async () => {
    mockDb = createMockD1({ minute: 1500, day: 1500 });

    const status = await getRateLimitStatus(
      mockDb as unknown as D1Database,
      "test-tenant",
      "transactional",
    );

    expect(status.perMinute.remaining).toBe(0);
    expect(status.perDay.remaining).toBe(0);
  });
});
