/**
 * Tests for Feature Flags Caching Layer
 *
 * Comprehensive test coverage for KV-based caching functionality,
 * including cache key generation, value retrieval, caching, and invalidation.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  buildCacheKey,
  getCachedValue,
  cacheResult,
  cachedToResult,
  invalidateFlag,
  invalidateAllFlags,
  shouldBypassCache,
  getDefaultTtl,
} from "./cache.js";
import { createMockEnv } from "./test-utils.js";
import type {
  FeatureFlagsEnv,
  EvaluationContext,
  EvaluationResult,
  CachedFlagValue,
} from "./types.js";

// =============================================================================
// TEST HELPERS
// =============================================================================

/**
 * Create a mock evaluation result.
 */
function createResult<T>(
  value: T,
  flagId: string,
  matched: boolean = true,
  matchedRuleId?: number,
): EvaluationResult<T> {
  return {
    value,
    flagId,
    matched,
    matchedRuleId,
    evaluatedAt: new Date("2025-01-16T12:00:00.000Z"),
    cached: false,
  };
}

/**
 * Create a mock cached value.
 */
function createCachedValue<T>(
  value: T,
  flagId: string,
  matched: boolean = true,
  matchedRuleId?: number,
  expiresAt?: string,
): CachedFlagValue<T> {
  return {
    value,
    flagId,
    matched,
    matchedRuleId,
    evaluatedAt: "2025-01-16T12:00:00Z",
    expiresAt: expiresAt || new Date(Date.now() + 60000).toISOString(),
  };
}

// =============================================================================
// BUILD CACHE KEY TESTS
// =============================================================================

describe("buildCacheKey", () => {
  describe("basic key format", () => {
    it("returns flag:flagId:global for empty context", () => {
      const key = buildCacheKey("test_flag", {});
      expect(key).toBe("flag:test_flag:global");
    });

    it("returns flag:flagId:global when context is undefined attributes", () => {
      const key = buildCacheKey("jxl_encoding", { attributes: {} });
      expect(key).toBe("flag:jxl_encoding:global");
    });
  });

  describe("tenant context", () => {
    it("includes tenant in cache key", () => {
      const key = buildCacheKey("feature_a", { tenantId: "tenant123" });
      expect(key).toBe("flag:feature_a:tenant:tenant123");
    });

    it("sanitizes tenant ID with special characters", () => {
      const key = buildCacheKey("feature_a", {
        tenantId: "tenant:with:colons",
      });
      expect(key).toBe("flag:feature_a:tenant:tenant-with-colons");
    });

    it("sanitizes tenant ID with mixed special characters", () => {
      const key = buildCacheKey("feature_a", {
        tenantId: "tenant@#$%^&*",
      });
      expect(key).toBe("flag:feature_a:tenant:tenant-------");
    });

    it("preserves alphanumeric, dash, underscore, and dot in tenant ID", () => {
      const key = buildCacheKey("feature_a", {
        tenantId: "tenant-123.sub_domain",
      });
      expect(key).toBe("flag:feature_a:tenant:tenant-123.sub_domain");
    });
  });

  describe("tier context", () => {
    it("includes tier in cache key", () => {
      const key = buildCacheKey("meadow_access", { tier: "oak" });
      expect(key).toBe("flag:meadow_access:tier:oak");
    });

    it("sanitizes tier with special characters", () => {
      const key = buildCacheKey("feature_a", { tier: "tier:premium" });
      expect(key).toBe("flag:feature_a:tier:tier-premium");
    });

    it("handles all valid tier values", () => {
      const tiers = ["free", "seedling", "sapling", "oak", "evergreen"];
      tiers.forEach((tier) => {
        const key = buildCacheKey("test_flag", { tier: tier as any });
        expect(key).toContain("tier:");
        expect(key).toContain(tier);
      });
    });
  });

  describe("user context", () => {
    it("includes user in cache key", () => {
      const key = buildCacheKey("user_feature", { userId: "user456" });
      expect(key).toBe("flag:user_feature:user:user456");
    });

    it("sanitizes user ID with special characters", () => {
      const key = buildCacheKey("feature_a", { userId: "user@example.com" });
      expect(key).toBe("flag:feature_a:user:user-example.com");
    });

    it("sanitizes user ID with email-like format", () => {
      const key = buildCacheKey("feature_a", { userId: "alice+test@corp.com" });
      expect(key).toBe("flag:feature_a:user:alice-test-corp.com");
    });

    it("sanitizes flagId with special characters", () => {
      const key = buildCacheKey("flag:with:colons", { userId: "user1" });
      expect(key).toBe("flag:flag-with-colons:user:user1");
    });
  });

  describe("session context", () => {
    it("includes session only when no other identifiers", () => {
      const key = buildCacheKey("test_flag", { sessionId: "sess_123" });
      expect(key).toBe("flag:test_flag:session:sess_123");
    });

    it("excludes session when userId is present", () => {
      const key = buildCacheKey("test_flag", {
        sessionId: "sess_123",
        userId: "user1",
      });
      expect(key).toBe("flag:test_flag:user:user1");
      expect(key).not.toContain("session");
    });

    it("excludes session when tenantId is present", () => {
      const key = buildCacheKey("test_flag", {
        sessionId: "sess_123",
        tenantId: "tenant1",
      });
      expect(key).toBe("flag:test_flag:tenant:tenant1");
      expect(key).not.toContain("session");
    });

    it("excludes session when both userId and tenantId are present", () => {
      const key = buildCacheKey("test_flag", {
        sessionId: "sess_123",
        userId: "user1",
        tenantId: "tenant1",
      });
      expect(key).toContain("tenant:tenant1");
      expect(key).toContain("user:user1");
      expect(key).not.toContain("session");
    });

    it("sanitizes session ID", () => {
      const key = buildCacheKey("test_flag", {
        sessionId: "sess:with:special@chars",
      });
      expect(key).toBe("flag:test_flag:session:sess-with-special-chars");
    });
  });

  describe("combined context", () => {
    it("includes tenant and tier in consistent order", () => {
      const key = buildCacheKey("test_flag", {
        tenantId: "t123",
        tier: "oak",
      });
      expect(key).toBe("flag:test_flag:tenant:t123:tier:oak");
    });

    it("includes tenant, tier, and user in consistent order", () => {
      const key = buildCacheKey("test_flag", {
        tenantId: "t123",
        tier: "oak",
        userId: "u456",
      });
      expect(key).toBe("flag:test_flag:tenant:t123:tier:oak:user:u456");
    });

    it("includes all context types (tenant, tier, user)", () => {
      const context: EvaluationContext = {
        tenantId: "acme",
        userId: "alice",
        tier: "oak",
      };
      const key = buildCacheKey("premium_feature", context);
      expect(key).toContain("flag:premium_feature");
      expect(key).toContain("tenant:acme");
      expect(key).toContain("tier:oak");
      expect(key).toContain("user:alice");
    });

    it("maintains consistent key generation across calls", () => {
      const context: EvaluationContext = {
        tenantId: "t1",
        userId: "u1",
        tier: "oak",
      };
      const key1 = buildCacheKey("flag", context);
      const key2 = buildCacheKey("flag", context);
      expect(key1).toBe(key2);
    });

    it("uses consistent ordering regardless of context property order", () => {
      const context1: EvaluationContext = {
        tenantId: "t1",
        tier: "oak",
        userId: "u1",
      };
      const context2: EvaluationContext = {
        userId: "u1",
        tenantId: "t1",
        tier: "oak",
      };
      const key1 = buildCacheKey("flag", context1);
      const key2 = buildCacheKey("flag", context2);
      expect(key1).toBe(key2);
    });
  });

  describe("key sanitization edge cases", () => {
    it("sanitizes control characters", () => {
      const key = buildCacheKey("test_flag", {
        tenantId: "tenant\n\t\r\x00",
      });
      expect(key).not.toContain("\n");
      expect(key).not.toContain("\t");
      expect(key).not.toContain("\r");
    });

    it("preserves dots in identifiers", () => {
      const key = buildCacheKey("test.flag", {
        tenantId: "tenant.subdomain",
      });
      expect(key).toContain("test.flag");
      expect(key).toContain("tenant.subdomain");
    });

    it("preserves underscores in identifiers", () => {
      const key = buildCacheKey("test_flag", { userId: "user_123" });
      expect(key).toContain("test_flag");
      expect(key).toContain("user_123");
    });

    it("converts spaces to dashes", () => {
      const key = buildCacheKey("test flag", { tenantId: "tenant name" });
      expect(key).toBe("flag:test-flag:tenant:tenant-name");
    });
  });
});

// =============================================================================
// GET CACHED VALUE TESTS
// =============================================================================

describe("getCachedValue", () => {
  let env: FeatureFlagsEnv;

  beforeEach(() => {
    env = createMockEnv();
  });

  describe("cache hits", () => {
    it("returns cached value if it exists and is valid", async () => {
      const cached = createCachedValue(true, "test_flag");
      const mockKV = env.FLAGS_KV as any;
      mockKV.get.mockResolvedValueOnce(cached);

      const result = await getCachedValue("flag:test_flag:global", env);

      expect(result).toEqual(cached);
      expect(mockKV.get).toHaveBeenCalledWith("flag:test_flag:global", "json");
    });

    it("returns cached value with correct structure", async () => {
      const cached: CachedFlagValue<boolean> = {
        value: true,
        flagId: "feature",
        matched: true,
        matchedRuleId: 42,
        evaluatedAt: "2025-01-16T12:00:00Z",
        expiresAt: new Date(Date.now() + 60000).toISOString(),
      };
      const mockKV = env.FLAGS_KV as any;
      mockKV.get.mockResolvedValueOnce(cached);

      const result = await getCachedValue("key", env);

      expect(result).toEqual(cached);
      expect(result?.value).toBe(true);
      expect(result?.flagId).toBe("feature");
      expect(result?.matched).toBe(true);
      expect(result?.matchedRuleId).toBe(42);
    });

    it("returns cached value for variant flags", async () => {
      const cached = createCachedValue("variant_a", "ab_test");
      const mockKV = env.FLAGS_KV as any;
      mockKV.get.mockResolvedValueOnce(cached);

      const result = await getCachedValue("flag:ab_test:global", env);

      expect(result?.value).toBe("variant_a");
    });

    it("returns cached value for numeric flags", async () => {
      const cached = createCachedValue(42, "number_flag");
      const mockKV = env.FLAGS_KV as any;
      mockKV.get.mockResolvedValueOnce(cached);

      const result = await getCachedValue("flag:number_flag:global", env);

      expect(result?.value).toBe(42);
    });
  });

  describe("cache misses", () => {
    it("returns null if key not in KV", async () => {
      const mockKV = env.FLAGS_KV as any;
      mockKV.get.mockResolvedValueOnce(null);

      const result = await getCachedValue("nonexistent_key", env);

      expect(result).toBeNull();
    });

    it("returns null and deletes if expired", async () => {
      const expiredDate = new Date(Date.now() - 1000).toISOString(); // 1 second ago
      const cached = createCachedValue(
        true,
        "test_flag",
        true,
        undefined,
        expiredDate,
      );
      const mockKV = env.FLAGS_KV as any;
      mockKV.get.mockResolvedValueOnce(cached);
      mockKV.delete.mockResolvedValueOnce(undefined);

      const result = await getCachedValue("flag:expired", env);

      expect(result).toBeNull();
      expect(mockKV.delete).toHaveBeenCalledWith("flag:expired");
    });

    it("does not await delete for expired cache", async () => {
      const expiredDate = new Date(Date.now() - 1000).toISOString();
      const cached = createCachedValue(
        true,
        "test_flag",
        true,
        undefined,
        expiredDate,
      );
      const mockKV = env.FLAGS_KV as any;
      mockKV.get.mockResolvedValueOnce(cached);
      mockKV.delete.mockImplementationOnce(async () => {
        // Simulate a slow delete
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      const start = Date.now();
      const result = await getCachedValue("key", env);
      const elapsed = Date.now() - start;

      // Should return immediately, not wait for delete
      expect(elapsed).toBeLessThan(50);
      expect(result).toBeNull();
    });

    it("ignores delete errors gracefully", async () => {
      const expiredDate = new Date(Date.now() - 1000).toISOString();
      const cached = createCachedValue(
        true,
        "test_flag",
        true,
        undefined,
        expiredDate,
      );
      const mockKV = env.FLAGS_KV as any;
      mockKV.get.mockResolvedValueOnce(cached);
      mockKV.delete.mockRejectedValueOnce(new Error("Delete failed"));

      const result = await getCachedValue("key", env);

      expect(result).toBeNull(); // Still returns null even if delete fails
    });
  });

  describe("error handling", () => {
    it("returns null on KV read error", async () => {
      const mockKV = env.FLAGS_KV as any;
      mockKV.get.mockRejectedValueOnce(new Error("KV read failed"));

      const result = await getCachedValue("key", env);

      expect(result).toBeNull();
    });

    it("returns null on JSON parse error", async () => {
      const mockKV = env.FLAGS_KV as any;
      mockKV.get.mockRejectedValueOnce(new SyntaxError("Invalid JSON"));

      const result = await getCachedValue("key", env);

      expect(result).toBeNull();
    });

    it("returns null on timeout error", async () => {
      const mockKV = env.FLAGS_KV as any;
      mockKV.get.mockRejectedValueOnce(new Error("Request timeout"));

      const result = await getCachedValue("key", env);

      expect(result).toBeNull();
    });

    it("calls KV get with correct parameters", async () => {
      const mockKV = env.FLAGS_KV as any;
      mockKV.get.mockResolvedValueOnce(null);

      await getCachedValue("test_key", env);

      expect(mockKV.get).toHaveBeenCalledWith("test_key", "json");
    });
  });
});

// =============================================================================
// CACHE RESULT TESTS
// =============================================================================

describe("cacheResult", () => {
  let env: FeatureFlagsEnv;

  beforeEach(() => {
    env = createMockEnv();
  });

  describe("instant flags (bypass cache)", () => {
    it("skips caching for jxl_kill_switch", async () => {
      const result = createResult(true, "jxl_kill_switch");
      const mockKV = env.FLAGS_KV as any;

      await cacheResult("key", result, env);

      expect(mockKV.put).not.toHaveBeenCalled();
    });

    it("skips caching for maintenance_mode", async () => {
      const result = createResult(true, "maintenance_mode");
      const mockKV = env.FLAGS_KV as any;

      await cacheResult("key", result, env);

      expect(mockKV.put).not.toHaveBeenCalled();
    });

    it("caches other flags normally", async () => {
      const result = createResult(true, "regular_flag");
      const mockKV = env.FLAGS_KV as any;
      mockKV.put.mockResolvedValueOnce(undefined);

      await cacheResult("key", result, env);

      expect(mockKV.put).toHaveBeenCalled();
    });
  });

  describe("TTL handling", () => {
    it("skips caching if ttlOverride is 0", async () => {
      const result = createResult(true, "no_cache_flag");
      const mockKV = env.FLAGS_KV as any;

      await cacheResult("key", result, env, 0);

      expect(mockKV.put).not.toHaveBeenCalled();
    });

    it("uses default TTL of 60 seconds when no override provided", async () => {
      const result = createResult(true, "test_flag");
      const mockKV = env.FLAGS_KV as any;
      mockKV.put.mockResolvedValueOnce(undefined);

      await cacheResult("key", result, env);

      const call = mockKV.put.mock.calls[0];
      const options = call[2];
      expect(options.expirationTtl).toBe(60);
    });

    it("uses provided ttlOverride", async () => {
      const result = createResult(true, "test_flag");
      const mockKV = env.FLAGS_KV as any;
      mockKV.put.mockResolvedValueOnce(undefined);

      await cacheResult("key", result, env, 300);

      const call = mockKV.put.mock.calls[0];
      const options = call[2];
      expect(options.expirationTtl).toBe(300);
    });

    it("uses ttlOverride of 1 second", async () => {
      const result = createResult(true, "test_flag");
      const mockKV = env.FLAGS_KV as any;
      mockKV.put.mockResolvedValueOnce(undefined);

      await cacheResult("key", result, env, 1);

      const call = mockKV.put.mock.calls[0];
      const options = call[2];
      expect(options.expirationTtl).toBe(1);
    });

    it("uses ttlOverride of large number", async () => {
      const result = createResult(true, "test_flag");
      const mockKV = env.FLAGS_KV as any;
      mockKV.put.mockResolvedValueOnce(undefined);

      await cacheResult("key", result, env, 86400); // 1 day

      const call = mockKV.put.mock.calls[0];
      const options = call[2];
      expect(options.expirationTtl).toBe(86400);
    });
  });

  describe("cached value structure", () => {
    it("stores correct cached value structure", async () => {
      const result = createResult(true, "test_flag", true, 42);
      const mockKV = env.FLAGS_KV as any;
      mockKV.put.mockResolvedValueOnce(undefined);

      await cacheResult("key", result, env);

      const call = mockKV.put.mock.calls[0];
      const cached = JSON.parse(call[1]);

      expect(cached.value).toBe(true);
      expect(cached.flagId).toBe("test_flag");
      expect(cached.matched).toBe(true);
      expect(cached.matchedRuleId).toBe(42);
      expect(cached.evaluatedAt).toBe("2025-01-16T12:00:00.000Z");
      expect(cached.expiresAt).toBeDefined();
    });

    it("converts evaluatedAt to ISO string", async () => {
      const result = createResult(false, "flag", false);
      const mockKV = env.FLAGS_KV as any;
      mockKV.put.mockResolvedValueOnce(undefined);

      await cacheResult("key", result, env);

      const call = mockKV.put.mock.calls[0];
      const cached = JSON.parse(call[1]);

      expect(cached.evaluatedAt).toBe("2025-01-16T12:00:00.000Z");
      expect(typeof cached.evaluatedAt).toBe("string");
    });

    it("calculates correct expiresAt timestamp", async () => {
      const result = createResult(true, "flag");
      const mockKV = env.FLAGS_KV as any;
      mockKV.put.mockResolvedValueOnce(undefined);
      const now = Date.now();

      await cacheResult("key", result, env, 30);

      const call = mockKV.put.mock.calls[0];
      const cached = JSON.parse(call[1]);
      const expiresAt = new Date(cached.expiresAt).getTime();

      expect(expiresAt).toBeGreaterThanOrEqual(now + 29000); // Allow 1s margin
      expect(expiresAt).toBeLessThanOrEqual(now + 31000);
    });

    it("caches variant values", async () => {
      const result = createResult("treatment_b", "ab_test");
      const mockKV = env.FLAGS_KV as any;
      mockKV.put.mockResolvedValueOnce(undefined);

      await cacheResult("key", result, env);

      const call = mockKV.put.mock.calls[0];
      const cached = JSON.parse(call[1]);

      expect(cached.value).toBe("treatment_b");
    });

    it("caches numeric values", async () => {
      const result = createResult(42, "numeric_flag");
      const mockKV = env.FLAGS_KV as any;
      mockKV.put.mockResolvedValueOnce(undefined);

      await cacheResult("key", result, env);

      const call = mockKV.put.mock.calls[0];
      const cached = JSON.parse(call[1]);

      expect(cached.value).toBe(42);
    });
  });

  describe("error handling", () => {
    it("handles KV write errors gracefully", async () => {
      const result = createResult(true, "test_flag");
      const mockKV = env.FLAGS_KV as any;
      mockKV.put.mockRejectedValueOnce(new Error("KV write failed"));

      await expect(cacheResult("key", result, env)).resolves.not.toThrow();
    });

    it("continues without caching on write error", async () => {
      const result = createResult(true, "test_flag");
      const mockKV = env.FLAGS_KV as any;
      mockKV.put.mockRejectedValueOnce(new Error("Write error"));

      // Should not throw, just silently fail
      const promise = cacheResult("key", result, env);
      await expect(promise).resolves.toBeUndefined();
    });

    it("calls KV put with correct key and value", async () => {
      const result = createResult(true, "test_flag");
      const mockKV = env.FLAGS_KV as any;
      mockKV.put.mockResolvedValueOnce(undefined);

      await cacheResult("flag:test_flag:global", result, env, 60);

      expect(mockKV.put).toHaveBeenCalledWith(
        "flag:test_flag:global",
        expect.any(String),
        expect.any(Object),
      );
    });
  });
});

// =============================================================================
// CACHED TO RESULT TESTS
// =============================================================================

describe("cachedToResult", () => {
  it("converts cached value to evaluation result", () => {
    const cached = createCachedValue(true, "test_flag");

    const result = cachedToResult(cached);

    expect(result.value).toBe(true);
    expect(result.flagId).toBe("test_flag");
    expect(result.matched).toBe(true);
    expect(result.cached).toBe(true);
  });

  it("converts evaluatedAt string to Date", () => {
    const cached = createCachedValue(true, "flag");

    const result = cachedToResult(cached);

    expect(result.evaluatedAt).toBeInstanceOf(Date);
    expect(result.evaluatedAt.toISOString()).toBe("2025-01-16T12:00:00.000Z");
  });

  it("sets cached property to true", () => {
    const cached = createCachedValue(false, "flag");

    const result = cachedToResult(cached);

    expect(result.cached).toBe(true);
  });

  it("preserves matchedRuleId", () => {
    const cached = createCachedValue(true, "flag", true, 42);

    const result = cachedToResult(cached);

    expect(result.matchedRuleId).toBe(42);
  });

  it("handles missing matchedRuleId", () => {
    const cached = createCachedValue(true, "flag", true);

    const result = cachedToResult(cached);

    expect(result.matchedRuleId).toBeUndefined();
  });

  it("converts variant values", () => {
    const cached = createCachedValue("variant_a", "ab_test");

    const result = cachedToResult(cached);

    expect(result.value).toBe("variant_a");
    expect(result.cached).toBe(true);
  });

  it("converts numeric values", () => {
    const cached = createCachedValue(99, "numeric_flag");

    const result = cachedToResult(cached);

    expect(result.value).toBe(99);
  });

  it("converts object values", () => {
    const obj = { key: "value", nested: { prop: 123 } };
    const cached = createCachedValue(obj, "json_flag");

    const result = cachedToResult(cached);

    expect(result.value).toEqual(obj);
  });

  it("converts matched=false", () => {
    const cached = createCachedValue(true, "flag", false);

    const result = cachedToResult(cached);

    expect(result.matched).toBe(false);
  });

  it("handles all context types in evaluatedAt", () => {
    const isoString = "2024-12-25T10:30:45.123Z";
    const cached: CachedFlagValue = {
      value: true,
      flagId: "flag",
      matched: true,
      evaluatedAt: isoString,
      expiresAt: new Date().toISOString(),
    };

    const result = cachedToResult(cached);

    expect(result.evaluatedAt.toISOString()).toBe(isoString);
  });
});

// =============================================================================
// INVALIDATE FLAG TESTS
// =============================================================================

describe("invalidateFlag", () => {
  let env: FeatureFlagsEnv;

  beforeEach(() => {
    env = createMockEnv();
  });

  describe("basic invalidation", () => {
    it("deletes all keys with flag prefix", async () => {
      const mockKV = env.FLAGS_KV as any;
      mockKV.list.mockResolvedValueOnce({
        keys: [
          { name: "flag:test_flag:global" },
          { name: "flag:test_flag:tenant:t1" },
          { name: "flag:test_flag:user:u1" },
        ],
        list_complete: true,
      });
      mockKV.delete.mockResolvedValue(undefined);

      const deleted = await invalidateFlag("test_flag", env);

      expect(deleted).toBe(3);
      expect(mockKV.delete).toHaveBeenCalledTimes(3);
    });

    it("returns count of deleted entries", async () => {
      const mockKV = env.FLAGS_KV as any;
      mockKV.list.mockResolvedValueOnce({
        keys: [{ name: "flag:flag:global" }, { name: "flag:flag:tenant:t1" }],
        list_complete: true,
      });
      mockKV.delete.mockResolvedValue(undefined);

      const deleted = await invalidateFlag("flag", env);

      expect(deleted).toBe(2);
    });

    it("returns 0 when no entries to delete", async () => {
      const mockKV = env.FLAGS_KV as any;
      mockKV.list.mockResolvedValueOnce({
        keys: [],
        list_complete: true,
      });

      const deleted = await invalidateFlag("nonexistent", env);

      expect(deleted).toBe(0);
      expect(mockKV.delete).not.toHaveBeenCalled();
    });
  });

  describe("pagination handling", () => {
    it("handles pagination with multiple pages", async () => {
      const mockKV = env.FLAGS_KV as any;
      mockKV.list
        .mockResolvedValueOnce({
          keys: Array.from({ length: 100 }, (_, i) => ({
            name: `flag:test_flag:key${i}`,
          })),
          list_complete: false,
          cursor: "cursor_1",
        })
        .mockResolvedValueOnce({
          keys: Array.from({ length: 100 }, (_, i) => ({
            name: `flag:test_flag:key${100 + i}`,
          })),
          list_complete: false,
          cursor: "cursor_2",
        })
        .mockResolvedValueOnce({
          keys: Array.from({ length: 50 }, (_, i) => ({
            name: `flag:test_flag:key${200 + i}`,
          })),
          list_complete: true,
        });
      mockKV.delete.mockResolvedValue(undefined);

      const deleted = await invalidateFlag("test_flag", env);

      expect(deleted).toBe(250);
      expect(mockKV.list).toHaveBeenCalledTimes(3);
    });

    it("stops pagination when list_complete is true", async () => {
      const mockKV = env.FLAGS_KV as any;
      mockKV.list.mockResolvedValueOnce({
        keys: [{ name: "flag:test_flag:global" }],
        list_complete: true,
      });
      mockKV.delete.mockResolvedValue(undefined);

      await invalidateFlag("test_flag", env);

      expect(mockKV.list).toHaveBeenCalledTimes(1);
    });

    it("continues pagination when list_complete is false", async () => {
      const mockKV = env.FLAGS_KV as any;
      mockKV.list
        .mockResolvedValueOnce({
          keys: [{ name: "flag:test_flag:key1" }],
          list_complete: false,
          cursor: "cursor_1",
        })
        .mockResolvedValueOnce({
          keys: [{ name: "flag:test_flag:key2" }],
          list_complete: true,
        });
      mockKV.delete.mockResolvedValue(undefined);

      const deleted = await invalidateFlag("test_flag", env);

      expect(deleted).toBe(2);
      expect(mockKV.list).toHaveBeenCalledTimes(2);
    });
  });

  describe("sanitization", () => {
    it("sanitizes flag ID before building prefix", async () => {
      const mockKV = env.FLAGS_KV as any;
      mockKV.list.mockResolvedValueOnce({
        keys: [],
        list_complete: true,
      });

      await invalidateFlag("flag:with:colons", env);

      const call = mockKV.list.mock.calls[0][0];
      expect(call.prefix).toBe("flag:flag-with-colons:");
    });

    it("sanitizes special characters in flag ID", async () => {
      const mockKV = env.FLAGS_KV as any;
      mockKV.list.mockResolvedValueOnce({
        keys: [],
        list_complete: true,
      });

      await invalidateFlag("flag@#$%", env);

      const call = mockKV.list.mock.calls[0][0];
      expect(call.prefix).toBe("flag:flag----:");
    });
  });

  describe("error handling", () => {
    it("returns partial count on KV error", async () => {
      const mockKV = env.FLAGS_KV as any;
      mockKV.list.mockResolvedValueOnce({
        keys: [{ name: "flag:test_flag:key1" }],
        list_complete: false,
        cursor: "cursor_1",
      });
      mockKV.delete.mockResolvedValueOnce(undefined);
      mockKV.list.mockRejectedValueOnce(new Error("KV error"));

      const deleted = await invalidateFlag("test_flag", env);

      expect(deleted).toBe(1); // Count from first page
    });

    it("continues deleting on individual delete error", async () => {
      const mockKV = env.FLAGS_KV as any;
      mockKV.list.mockResolvedValueOnce({
        keys: [
          { name: "flag:test_flag:key1" },
          { name: "flag:test_flag:key2" },
        ],
        list_complete: true,
      });
      mockKV.delete
        .mockRejectedValueOnce(new Error("Delete error"))
        .mockResolvedValueOnce(undefined);

      const deleted = await invalidateFlag("test_flag", env);

      // Despite error on first delete, count should be correct
      expect(mockKV.delete).toHaveBeenCalledTimes(2);
    });

    it("handles KV list errors gracefully", async () => {
      const mockKV = env.FLAGS_KV as any;
      mockKV.list.mockRejectedValueOnce(new Error("List error"));

      const deleted = await invalidateFlag("test_flag", env);

      expect(deleted).toBe(0);
    });
  });

  describe("KV list parameters", () => {
    it("uses correct prefix format for flag", async () => {
      const mockKV = env.FLAGS_KV as any;
      mockKV.list.mockResolvedValueOnce({
        keys: [],
        list_complete: true,
      });

      await invalidateFlag("my_flag", env);

      const call = mockKV.list.mock.calls[0][0];
      expect(call.prefix).toBe("flag:my_flag:");
    });

    it("uses cursor from previous list call", async () => {
      const mockKV = env.FLAGS_KV as any;
      mockKV.list
        .mockResolvedValueOnce({
          keys: [],
          list_complete: false,
          cursor: "next_cursor",
        })
        .mockResolvedValueOnce({
          keys: [],
          list_complete: true,
        });

      await invalidateFlag("flag", env);

      const secondCall = mockKV.list.mock.calls[1][0];
      expect(secondCall.cursor).toBe("next_cursor");
    });
  });
});

// =============================================================================
// INVALIDATE ALL FLAGS TESTS
// =============================================================================

describe("invalidateAllFlags", () => {
  let env: FeatureFlagsEnv;

  beforeEach(() => {
    env = createMockEnv();
  });

  describe("basic invalidation", () => {
    it("deletes all flag entries", async () => {
      const mockKV = env.FLAGS_KV as any;
      mockKV.list.mockResolvedValueOnce({
        keys: [
          { name: "flag:flag1:global" },
          { name: "flag:flag2:global" },
          { name: "flag:flag3:tenant:t1" },
        ],
        list_complete: true,
      });
      mockKV.delete.mockResolvedValue(undefined);

      const deleted = await invalidateAllFlags(env);

      expect(deleted).toBe(3);
      expect(mockKV.delete).toHaveBeenCalledTimes(3);
    });

    it("returns total count of deleted entries", async () => {
      const mockKV = env.FLAGS_KV as any;
      mockKV.list.mockResolvedValueOnce({
        keys: Array.from({ length: 50 }, (_, i) => ({
          name: `flag:flag:key${i}`,
        })),
        list_complete: true,
      });
      mockKV.delete.mockResolvedValue(undefined);

      const deleted = await invalidateAllFlags(env);

      expect(deleted).toBe(50);
    });

    it("returns 0 when no flags cached", async () => {
      const mockKV = env.FLAGS_KV as any;
      mockKV.list.mockResolvedValueOnce({
        keys: [],
        list_complete: true,
      });

      const deleted = await invalidateAllFlags(env);

      expect(deleted).toBe(0);
    });
  });

  describe("pagination handling", () => {
    it("handles multiple pages of flags", async () => {
      const mockKV = env.FLAGS_KV as any;
      mockKV.list
        .mockResolvedValueOnce({
          keys: Array.from({ length: 200 }, (_, i) => ({
            name: `flag:flag:key${i}`,
          })),
          list_complete: false,
          cursor: "cursor_1",
        })
        .mockResolvedValueOnce({
          keys: Array.from({ length: 150 }, (_, i) => ({
            name: `flag:flag:key${200 + i}`,
          })),
          list_complete: true,
        });
      mockKV.delete.mockResolvedValue(undefined);

      const deleted = await invalidateAllFlags(env);

      expect(deleted).toBe(350);
      expect(mockKV.list).toHaveBeenCalledTimes(2);
    });

    it("continues with cursor until complete", async () => {
      const mockKV = env.FLAGS_KV as any;
      mockKV.list
        .mockResolvedValueOnce({
          keys: [{ name: "flag:a:global" }],
          list_complete: false,
          cursor: "c1",
        })
        .mockResolvedValueOnce({
          keys: [{ name: "flag:b:global" }],
          list_complete: false,
          cursor: "c2",
        })
        .mockResolvedValueOnce({
          keys: [{ name: "flag:c:global" }],
          list_complete: true,
        });
      mockKV.delete.mockResolvedValue(undefined);

      const deleted = await invalidateAllFlags(env);

      expect(deleted).toBe(3);
      expect(mockKV.list).toHaveBeenCalledTimes(3);
    });
  });

  describe("prefix usage", () => {
    it("uses 'flag:' prefix to match all flags", async () => {
      const mockKV = env.FLAGS_KV as any;
      mockKV.list.mockResolvedValueOnce({
        keys: [],
        list_complete: true,
      });

      await invalidateAllFlags(env);

      const call = mockKV.list.mock.calls[0][0];
      expect(call.prefix).toBe("flag:");
    });
  });

  describe("error handling", () => {
    it("returns partial count on error", async () => {
      const mockKV = env.FLAGS_KV as any;
      mockKV.list
        .mockResolvedValueOnce({
          keys: Array.from({ length: 10 }, (_, i) => ({
            name: `flag:flag:key${i}`,
          })),
          list_complete: false,
          cursor: "c1",
        })
        .mockRejectedValueOnce(new Error("List error"));
      mockKV.delete.mockResolvedValue(undefined);

      const deleted = await invalidateAllFlags(env);

      expect(deleted).toBe(10);
    });

    it("handles KV list error gracefully", async () => {
      const mockKV = env.FLAGS_KV as any;
      mockKV.list.mockRejectedValueOnce(new Error("KV error"));

      const deleted = await invalidateAllFlags(env);

      expect(deleted).toBe(0);
    });
  });
});

// =============================================================================
// SHOULD BYPASS CACHE TESTS
// =============================================================================

describe("shouldBypassCache", () => {
  it("returns true for jxl_kill_switch", () => {
    expect(shouldBypassCache("jxl_kill_switch")).toBe(true);
  });

  it("returns true for maintenance_mode", () => {
    expect(shouldBypassCache("maintenance_mode")).toBe(true);
  });

  it("returns false for regular flags", () => {
    expect(shouldBypassCache("regular_flag")).toBe(false);
  });

  it("returns false for feature_a", () => {
    expect(shouldBypassCache("feature_a")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(shouldBypassCache("")).toBe(false);
  });

  it("returns false for similar but different names", () => {
    expect(shouldBypassCache("jxl_kill_switch_v2")).toBe(false);
    expect(shouldBypassCache("maintenance_mode_2")).toBe(false);
    expect(shouldBypassCache("kill_switch")).toBe(false);
  });

  it("is case sensitive", () => {
    expect(shouldBypassCache("JXL_KILL_SWITCH")).toBe(false);
    expect(shouldBypassCache("MAINTENANCE_MODE")).toBe(false);
  });

  it("returns true only for exact matches", () => {
    expect(shouldBypassCache("jxl_kill_switch")).toBe(true);
    expect(shouldBypassCache("jxl_kill_switch ")).toBe(false);
    expect(shouldBypassCache(" jxl_kill_switch")).toBe(false);
  });
});

// =============================================================================
// GET DEFAULT TTL TESTS
// =============================================================================

describe("getDefaultTtl", () => {
  it("returns 60 seconds", () => {
    expect(getDefaultTtl()).toBe(60);
  });

  it("always returns the same value", () => {
    const ttl1 = getDefaultTtl();
    const ttl2 = getDefaultTtl();
    expect(ttl1).toBe(ttl2);
    expect(ttl1).toBe(60);
  });

  it("returns a number type", () => {
    const ttl = getDefaultTtl();
    expect(typeof ttl).toBe("number");
  });

  it("returns exactly 60, not approximately", () => {
    expect(getDefaultTtl()).toBe(60);
    expect(getDefaultTtl()).not.toBe(59);
    expect(getDefaultTtl()).not.toBe(61);
  });
});
