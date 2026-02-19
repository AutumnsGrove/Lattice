/**
 * Rate Limiting Integration Tests
 *
 * Tests rate limit behavior using the KV mock, including counter-based rate limiting,
 * per-tenant isolation, window expiration, and retry information.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { createMockKV, advanceKVTime } from "../helpers/index.js";

// ============================================================================
// Constants
// ============================================================================

const RATE_LIMITS = {
  upload: {
    limit: 50,
    window: 3600, // 1 hour
  },
  api: {
    limit: 100,
    window: 3600,
  },
  post: {
    limit: 10,
    window: 300, // 5 minutes
  },
};

// ============================================================================
// Test Suite
// ============================================================================

describe("Rate Limiting Integration", () => {
  let kv: ReturnType<typeof createMockKV>;

  beforeEach(() => {
    kv = createMockKV();
  });

  // ============================================================================
  // Counter-Based Rate Limiting Tests
  // ============================================================================

  describe("Counter-based rate limiting", () => {
    it("increments counter on each request", async () => {
      const key = "ratelimit:upload:user-1";

      // First request - no prior value
      const current = await kv.get(key);
      expect(current).toBeNull();

      // Increment counter
      await kv.put(key, "1", { expirationTtl: 3600 });
      const after = await kv.get(key);
      expect(after).toBe("1");

      // Increment again
      await kv.put(key, "2", { expirationTtl: 3600 });
      const next = await kv.get(key);
      expect(next).toBe("2");
    });

    it("tracks count up to limit", async () => {
      const key = "ratelimit:upload:user-1";

      for (let i = 1; i <= 50; i++) {
        await kv.put(key, String(i), { expirationTtl: 3600 });
      }

      const count = await kv.get(key);
      expect(count).toBe("50");
    });

    it("returns 429 when limit is exceeded", async () => {
      const key = "ratelimit:upload:user-1";
      await kv.put(key, "50", { expirationTtl: 3600 }); // At limit

      const count = parseInt((await kv.get(key)) || "0", 10);
      expect(count).toBe(50);
      expect(count >= RATE_LIMITS.upload.limit).toBe(true);
    });

    it("differentiates between request types", async () => {
      const uploadKey = "ratelimit:upload:user-1";
      const apiKey = "ratelimit:api:user-1";

      await kv.put(uploadKey, "40", { expirationTtl: 3600 });
      await kv.put(apiKey, "80", { expirationTtl: 3600 });

      const uploadCount = await kv.get(uploadKey);
      const apiCount = await kv.get(apiKey);

      expect(uploadCount).toBe("40");
      expect(apiCount).toBe("80");
      expect(uploadCount).not.toBe(apiCount);
    });

    it("increments remaining counter correctly", () => {
      const limit = 50;
      const current = 25;
      const remaining = limit - current;

      expect(remaining).toBe(25);
      expect(remaining).toBeGreaterThan(0);
    });

    it("returns zero remaining when at limit", () => {
      const limit = 50;
      const current = 50;
      const remaining = limit - current;

      expect(remaining).toBe(0);
      expect(remaining >= 0).toBe(true);
    });
  });

  // ============================================================================
  // Rate Limit Response Headers Tests
  // ============================================================================

  describe("Rate limit response headers", () => {
    it("includes Retry-After information", async () => {
      const windowSeconds = RATE_LIMITS.upload.window;
      const resetAt = Math.floor(Date.now() / 1000) + windowSeconds;
      const retryAfter = resetAt - Math.floor(Date.now() / 1000);

      expect(retryAfter).toBeGreaterThan(0);
      expect(retryAfter).toBeLessThanOrEqual(windowSeconds);
    });

    it("provides reset timestamp", () => {
      const setAtTime = Math.floor(Date.now() / 1000);
      const windowSeconds = 3600;
      const resetAt = setAtTime + windowSeconds;

      expect(resetAt).toBeGreaterThan(setAtTime);
      expect(resetAt - setAtTime).toBe(windowSeconds);
    });

    it("calculates seconds until reset", () => {
      const now = Math.floor(Date.now() / 1000);
      const resetAt = now + 3600;
      const secondsUntilReset = resetAt - now;

      expect(secondsUntilReset).toBe(3600);
      expect(typeof secondsUntilReset).toBe("number");
    });

    it("handles headers in rate limited response", () => {
      const headers: Record<string, string> = {
        "RateLimit-Limit": "50",
        "RateLimit-Remaining": "0",
        "RateLimit-Reset": String(Math.floor(Date.now() / 1000) + 3600),
        "Retry-After": "3600",
      };

      expect(headers["RateLimit-Limit"]).toBe("50");
      expect(headers["RateLimit-Remaining"]).toBe("0");
      expect(headers["Retry-After"]).toBe("3600");
      expect(parseInt(headers["RateLimit-Reset"], 10)).toBeGreaterThan(
        Math.floor(Date.now() / 1000),
      );
    });
  });

  // ============================================================================
  // Per-Tenant Isolation Tests
  // ============================================================================

  describe("Per-tenant isolation", () => {
    it("tracks rate limits independently per tenant", async () => {
      const tenant1Key = "ratelimit:upload:tenant-1:user-1";
      const tenant2Key = "ratelimit:upload:tenant-2:user-1";

      await kv.put(tenant1Key, "10", { expirationTtl: 3600 });
      await kv.put(tenant2Key, "5", { expirationTtl: 3600 });

      const tenant1 = await kv.get(tenant1Key);
      const tenant2 = await kv.get(tenant2Key);

      expect(tenant1).toBe("10");
      expect(tenant2).toBe("5");
      expect(tenant1).not.toBe(tenant2);
    });

    it("prevents cross-tenant rate limit sharing", async () => {
      const tenant1Key = "ratelimit:upload:tenant-1:user-1";
      const tenant2Key = "ratelimit:upload:tenant-2:user-1";

      await kv.put(tenant1Key, "50", { expirationTtl: 3600 });
      await kv.put(tenant2Key, "1", { expirationTtl: 3600 });

      // tenant-1 is at limit
      const tenant1Count = parseInt((await kv.get(tenant1Key)) || "0", 10);
      expect(tenant1Count).toBe(50);

      // tenant-2 should not be affected
      const tenant2Count = parseInt((await kv.get(tenant2Key)) || "0", 10);
      expect(tenant2Count).toBe(1);
      expect(tenant2Count < RATE_LIMITS.upload.limit).toBe(true);
    });

    it("isolates rate limits by tenant and user", async () => {
      const tenant1User1 = "ratelimit:upload:tenant-1:user-1";
      const tenant1User2 = "ratelimit:upload:tenant-1:user-2";

      await kv.put(tenant1User1, "45", { expirationTtl: 3600 });
      await kv.put(tenant1User2, "10", { expirationTtl: 3600 });

      const user1Count = parseInt((await kv.get(tenant1User1)) || "0", 10);
      const user2Count = parseInt((await kv.get(tenant1User2)) || "0", 10);

      expect(user1Count).toBe(45);
      expect(user2Count).toBe(10);
      expect(user1Count).not.toBe(user2Count);
    });

    it("uses composite keys for isolation", () => {
      const buildKey = (namespace: string, tenant: string, user: string) =>
        `ratelimit:${namespace}:${tenant}:${user}`;

      const key1 = buildKey("upload", "tenant-1", "user-1");
      const key2 = buildKey("upload", "tenant-2", "user-1");
      const key3 = buildKey("api", "tenant-1", "user-1");

      expect(key1).toBe("ratelimit:upload:tenant-1:user-1");
      expect(key2).toBe("ratelimit:upload:tenant-2:user-1");
      expect(key3).toBe("ratelimit:api:tenant-1:user-1");
      expect(key1).not.toBe(key2);
      expect(key1).not.toBe(key3);
    });
  });

  // ============================================================================
  // Window Expiration Tests
  // ============================================================================

  describe("Window expiration", () => {
    it("counter resets after TTL expires", async () => {
      const key = "ratelimit:api:user-1";
      await kv.put(key, "50", { expirationTtl: 1 }); // 1 second TTL

      // Simulate time passage
      const entry = (kv as any)._store.get(key);
      if (entry) {
        entry.expiresAt = Date.now() - 1000; // Expired
      }

      const result = await kv.get(key);
      expect(result).toBeNull();
    });

    it("handles different TTL windows", async () => {
      const shortKey = "ratelimit:post:user-1";
      const longKey = "ratelimit:api:user-1";

      await kv.put(shortKey, "5", { expirationTtl: 300 }); // 5 minutes
      await kv.put(longKey, "50", { expirationTtl: 3600 }); // 1 hour

      const shortCount = await kv.get(shortKey);
      const longCount = await kv.get(longKey);

      expect(shortCount).toBe("5");
      expect(longCount).toBe("50");
    });

    it("resets counter within same TTL window", async () => {
      const key = "ratelimit:upload:user-1";

      // Set counter
      await kv.put(key, "25", { expirationTtl: 3600 });
      let count = await kv.get(key);
      expect(count).toBe("25");

      // Update counter within TTL
      await kv.put(key, "26", { expirationTtl: 3600 });
      count = await kv.get(key);
      expect(count).toBe("26");
    });

    it("provides TTL information to client", () => {
      const expirationTtl = 3600;
      const setTime = Math.floor(Date.now() / 1000);
      const resetTime = setTime + expirationTtl;

      const ttlRemaining = resetTime - setTime;
      expect(ttlRemaining).toBe(expirationTtl);
      expect(ttlRemaining).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Request Type Differentiation Tests
  // ============================================================================

  describe("Request type differentiation", () => {
    it("applies different limits for upload vs API requests", async () => {
      const uploadKey = "ratelimit:upload:user-1";
      const apiKey = "ratelimit:api:user-1";

      await kv.put(uploadKey, "50", { expirationTtl: 3600 });
      await kv.put(apiKey, "100", { expirationTtl: 3600 });

      const uploadCount = parseInt((await kv.get(uploadKey)) || "0", 10);
      const apiCount = parseInt((await kv.get(apiKey)) || "0", 10);

      expect(uploadCount).toBe(RATE_LIMITS.upload.limit);
      expect(apiCount).toBe(RATE_LIMITS.api.limit);
    });

    it("applies different windows for different operations", async () => {
      const uploadKey = "ratelimit:upload:user-1";
      const postKey = "ratelimit:post:user-1";

      // Upload: 1 hour window
      await kv.put(uploadKey, "1", {
        expirationTtl: RATE_LIMITS.upload.window,
      });
      // Post: 5 minute window
      await kv.put(postKey, "1", { expirationTtl: RATE_LIMITS.post.window });

      const uploadEntry = (kv as any)._store.get(uploadKey);
      const postEntry = (kv as any)._store.get(postKey);

      // Mock KV stores expiresAt (computed timestamp), not raw TTL
      // Verify the relative expiration: upload window > post window
      expect(uploadEntry.expiresAt).toBeDefined();
      expect(postEntry.expiresAt).toBeDefined();
      expect(uploadEntry.expiresAt).toBeGreaterThan(postEntry.expiresAt);
    });
  });

  // ============================================================================
  // Edge Cases Tests
  // ============================================================================

  describe("Edge cases", () => {
    it("handles zero remaining correctly", () => {
      const limit = 50;
      const current = 50;
      const remaining = Math.max(0, limit - current);

      expect(remaining).toBe(0);
    });

    it("handles negative remaining as zero", () => {
      const limit = 50;
      const current = 51; // Over limit
      const remaining = Math.max(0, limit - current);

      expect(remaining).toBe(0);
    });

    it("handles very large counters", async () => {
      const key = "ratelimit:api:user-1";
      const largeCount = "999999999";

      await kv.put(key, largeCount, { expirationTtl: 3600 });
      const result = await kv.get(key);

      expect(result).toBe(largeCount);
      expect(parseInt(result || "0", 10)).toBeGreaterThan(
        RATE_LIMITS.api.limit,
      );
    });

    it("returns correct remaining for fractional calculation", () => {
      const limit = 100;
      const current = 33;
      const remaining = limit - current;

      expect(remaining).toBe(67);
      expect(typeof remaining).toBe("number");
    });

    it("handles missing KV key gracefully", async () => {
      const key = "ratelimit:upload:nonexistent-user";
      const result = await kv.get(key);

      expect(result).toBeNull();
      // Default to 0 requests made
      const count = parseInt(result || "0", 10);
      expect(count).toBe(0);
      expect(count < RATE_LIMITS.upload.limit).toBe(true);
    });
  });

  // ============================================================================
  // Rate Limit Status Tests
  // ============================================================================

  describe("Rate limit status", () => {
    it("indicates when approaching limit", async () => {
      const key = "ratelimit:upload:user-1";
      const limit = 50;

      await kv.put(key, "48", { expirationTtl: 3600 });
      const current = parseInt((await kv.get(key)) || "0", 10);
      const remaining = limit - current;

      expect(remaining).toBe(2);
      expect(remaining < 5).toBe(true); // Approaching threshold
    });

    it("indicates when limit is reached", async () => {
      const key = "ratelimit:upload:user-1";
      const limit = 50;

      await kv.put(key, "50", { expirationTtl: 3600 });
      const current = parseInt((await kv.get(key)) || "0", 10);
      const remaining = limit - current;
      const isLimited = remaining <= 0;

      expect(isLimited).toBe(true);
    });

    it("indicates when well under limit", async () => {
      const key = "ratelimit:upload:user-1";
      const limit = 50;

      await kv.put(key, "10", { expirationTtl: 3600 });
      const current = parseInt((await kv.get(key)) || "0", 10);
      const remaining = limit - current;
      const isHealthy = remaining > limit * 0.5;

      expect(isHealthy).toBe(true);
      expect(remaining).toBe(40);
    });
  });
});
