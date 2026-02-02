/**
 * Rate Limiting Middleware Tests
 *
 * Tests for per-tenant rate limiting by email type.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  checkRateLimit,
  getRateLimitStatus,
} from "../src/middleware/rate-limit";
import type { EmailType } from "../src/types";

// Mock D1 database
function createMockD1() {
  const queries: Array<{ sql: string; params: unknown[] }> = [];

  return {
    queries,
    prepare: vi.fn((sql: string) => ({
      bind: vi.fn((...params: unknown[]) => ({
        first: vi.fn(async () => {
          queries.push({ sql, params });
          return { count: 0 };
        }),
        all: vi.fn(async () => ({
          results: [],
        })),
        run: vi.fn(async () => ({ success: true })),
      })),
    })),
    // Helper to simulate rate limit exceeded
    simulateCount: (count: number) => {
      return {
        prepare: vi.fn((sql: string) => ({
          bind: vi.fn((...params: unknown[]) => ({
            first: vi.fn(async () => {
              queries.push({ sql, params });
              return { count };
            }),
            all: vi.fn(async () => ({
              results: [],
            })),
            run: vi.fn(async () => ({ success: true })),
          })),
        })),
      } as unknown as D1Database;
    },
  };
}

describe("checkRateLimit", () => {
  it("should allow request within limits", async () => {
    const mockDb = createMockD1();

    const result = await checkRateLimit(
      mockDb as unknown as D1Database,
      "test-tenant",
      "transactional",
      "user@example.com",
    );

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBeGreaterThan(0);
  });

  it("should reject when per-minute limit exceeded", async () => {
    const mockDb = createMockD1();
    const dbWithHighCount = mockDb.simulateCount(60); // At limit for transactional

    const result = await checkRateLimit(
      dbWithHighCount,
      "test-tenant",
      "transactional",
      "user@example.com",
    );

    expect(result.allowed).toBe(false);
    expect(result.message).toContain("per minute");
    expect(result.remaining).toBe(0);
  });

  it("should reject when per-day limit exceeded", async () => {
    const mockDb = createMockD1();
    // Simulate 999 emails sent (just under minute limit, at day limit)
    let callCount = 0;
    const dbWithDayLimit = {
      prepare: vi.fn((sql: string) => ({
        bind: vi.fn((...params: unknown[]) => ({
          first: vi.fn(async () => {
            callCount++;
            // First call is minute check (returns low count)
            // Second call is day check (returns high count)
            return { count: callCount === 1 ? 10 : 1000 };
          }),
          all: vi.fn(async () => ({ results: [] })),
          run: vi.fn(async () => ({ success: true })),
        })),
      })),
    } as unknown as D1Database;

    const result = await checkRateLimit(
      dbWithDayLimit,
      "test-tenant",
      "transactional",
      "user@example.com",
    );

    expect(result.allowed).toBe(false);
    expect(result.message).toContain("per day");
  });

  it("should have different limits for different email types", async () => {
    const mockDb = createMockD1();

    // Test verification type (stricter limits: 10/min, 100/day)
    const dbAtVerificationLimit = mockDb.simulateCount(10);
    const verificationResult = await checkRateLimit(
      dbAtVerificationLimit,
      "test-tenant",
      "verification",
      "user@example.com",
    );

    expect(verificationResult.allowed).toBe(false);

    // Test broadcast type (higher limits: 1000/min, 10000/day)
    const dbAtBroadcastLimit = mockDb.simulateCount(1000);
    const broadcastResult = await checkRateLimit(
      dbAtBroadcastLimit,
      "test-tenant",
      "broadcast",
      "user@example.com",
    );

    expect(broadcastResult.allowed).toBe(false);
  });

  it("should allow request after rate limit window resets", async () => {
    const mockDb = createMockD1();

    // First request at limit
    const dbAtLimit = mockDb.simulateCount(60);
    const blockedResult = await checkRateLimit(
      dbAtLimit,
      "test-tenant",
      "transactional",
      "user@example.com",
    );

    expect(blockedResult.allowed).toBe(false);

    // Simulate time passing (new DB query returns lower count)
    const dbAfterReset = mockDb.simulateCount(0);
    const allowedResult = await checkRateLimit(
      dbAfterReset,
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
    const mockDb = createMockD1();
    const dbWithPartialUsage = mockDb.simulateCount(30);

    const result = await checkRateLimit(
      dbWithPartialUsage,
      "test-tenant",
      "transactional",
      "user@example.com",
    );

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(30); // 60 - 30 = 30
  });
});

describe("getRateLimitStatus", () => {
  it("should return complete rate limit status", async () => {
    const mockDb = createMockD1();
    const dbWithUsage = mockDb.simulateCount(25);

    const status = await getRateLimitStatus(
      dbWithUsage,
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
      used: 25,
      remaining: 975,
    });
  });

  it("should handle zero usage", async () => {
    const mockDb = createMockD1();

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
    // Mock with count over both minute (60) and day (1000) limits
    let callCount = 0;
    const dbWithOverage = {
      prepare: vi.fn((sql: string) => ({
        bind: vi.fn((...params: unknown[]) => ({
          first: vi.fn(async () => {
            callCount++;
            // Return count over both limits
            return { count: 1500 };
          }),
          all: vi.fn(async () => ({ results: [] })),
          run: vi.fn(async () => ({ success: true })),
        })),
      })),
    } as unknown as D1Database;

    const status = await getRateLimitStatus(
      dbWithOverage,
      "test-tenant",
      "transactional",
    );

    expect(status.perMinute.remaining).toBe(0);
    expect(status.perDay.remaining).toBe(0);
  });
});
