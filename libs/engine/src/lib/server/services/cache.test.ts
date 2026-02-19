/**
 * Cache Service Tests
 *
 * Tests for KV cache abstraction layer covering:
 * - Basic CRUD (get, set, del)
 * - getOrSet pattern (compute-if-missing)
 * - Namespace support
 * - TTL expiration
 * - Rate limiting
 * - Batch operations
 * - Error handling
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { createMockKV, advanceKVTime } from "./__mocks__/cloudflare";
import {
  // Types
  CacheError,
  type CacheOptions,
  // Operations
  get,
  set,
  del,
  getOrSet,
  getOrSetSync,
  // Batch operations
  delMany,
  delByPrefix,
  // Utilities
  has,
  touch,
  // Rate limiting
  rateLimit,
  // Constants
  CACHE_DEFAULTS,
} from "./cache";

describe("Cache Service", () => {
  let kv: ReturnType<typeof createMockKV>;

  beforeEach(() => {
    kv = createMockKV();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ==========================================================================
  // Basic Operations
  // ==========================================================================

  describe("get", () => {
    it("should return null for non-existent keys", async () => {
      const result = await get(kv, "nonexistent");
      expect(result).toBeNull();
    });

    it("should return stored value", async () => {
      await kv.put("grove:testkey", JSON.stringify({ data: "test" }));

      const result = await get<{ data: string }>(kv, "testkey");
      expect(result).toEqual({ data: "test" });
    });

    it("should handle string values without JSON parsing", async () => {
      await kv.put("grove:stringkey", "plain string");

      const result = await get<string>(kv, "stringkey");
      expect(result).toBe("plain string");
    });

    it("should apply namespace prefix", async () => {
      await kv.put(
        "grove:myns:testkey",
        JSON.stringify({ data: "namespaced" }),
      );

      const result = await get<{ data: string }>(kv, "testkey", {
        namespace: "myns",
      });
      expect(result).toEqual({ data: "namespaced" });
    });

    it("should throw CacheError on failure", async () => {
      kv.get = vi.fn(async () => {
        throw new Error("KV failure");
      });

      await expect(get(kv, "key")).rejects.toThrow(CacheError);
    });
  });

  describe("set", () => {
    it("should store value with default TTL", async () => {
      await set(kv, "testkey", { data: "test" });

      expect(kv.put).toHaveBeenCalledWith(
        "grove:testkey",
        JSON.stringify({ data: "test" }),
        expect.objectContaining({ expirationTtl: CACHE_DEFAULTS.TTL_SECONDS }),
      );
    });

    it("should store value with custom TTL", async () => {
      await set(kv, "testkey", { data: "test" }, { ttl: 600 });

      expect(kv.put).toHaveBeenCalledWith(
        "grove:testkey",
        expect.any(String),
        expect.objectContaining({ expirationTtl: 600 }),
      );
    });

    it("should store string values without double-encoding", async () => {
      await set(kv, "stringkey", "plain string");

      expect(kv.put).toHaveBeenCalledWith(
        "grove:stringkey",
        "plain string",
        expect.any(Object),
      );
    });

    it("should apply namespace prefix", async () => {
      await set(kv, "testkey", "value", { namespace: "myns" });

      expect(kv.put).toHaveBeenCalledWith(
        "grove:myns:testkey",
        expect.any(String),
        expect.any(Object),
      );
    });

    it("should throw CacheError on serialization failure", async () => {
      const circular: Record<string, unknown> = {};
      circular.self = circular;

      await expect(set(kv, "key", circular)).rejects.toThrow(CacheError);
    });

    it("should throw CacheError on KV failure", async () => {
      kv.put = vi.fn(async () => {
        throw new Error("KV write failure");
      });

      await expect(set(kv, "key", "value")).rejects.toThrow(CacheError);
    });
  });

  describe("del", () => {
    it("should delete a key", async () => {
      await kv.put("grove:testkey", "value");
      await del(kv, "testkey");

      expect(kv.delete).toHaveBeenCalledWith("grove:testkey");
    });

    it("should apply namespace prefix", async () => {
      await del(kv, "testkey", { namespace: "myns" });

      expect(kv.delete).toHaveBeenCalledWith("grove:myns:testkey");
    });

    it("should throw CacheError on failure", async () => {
      kv.delete = vi.fn(async () => {
        throw new Error("Delete failed");
      });

      await expect(del(kv, "key")).rejects.toThrow(CacheError);
    });
  });

  // ==========================================================================
  // getOrSet Pattern
  // ==========================================================================

  describe("getOrSet", () => {
    it("should return cached value when present", async () => {
      await kv.put("grove:testkey", JSON.stringify({ cached: true }));

      const compute = vi.fn(async () => ({ computed: true }));
      const result = await getOrSet(kv, "testkey", { compute });

      expect(result).toEqual({ cached: true });
      expect(compute).not.toHaveBeenCalled();
    });

    it("should compute and cache when key is missing", async () => {
      const compute = vi.fn(async () => ({ computed: true }));
      const result = await getOrSet(kv, "newkey", { compute });

      expect(result).toEqual({ computed: true });
      expect(compute).toHaveBeenCalledTimes(1);
    });

    it("should force refresh when specified", async () => {
      await kv.put("grove:testkey", JSON.stringify({ cached: true }));

      const compute = vi.fn(async () => ({ fresh: true }));
      const result = await getOrSet(kv, "testkey", {
        compute,
        forceRefresh: true,
      });

      expect(result).toEqual({ fresh: true });
      expect(compute).toHaveBeenCalledTimes(1);
    });

    it("should apply TTL to cached value", async () => {
      const compute = vi.fn(async () => ({ data: "test" }));
      await getOrSet(kv, "testkey", { compute, ttl: 300 });

      // Check that put was called with correct TTL
      expect(kv.put).toHaveBeenCalled();
    });

    it("should throw CacheError when compute fails", async () => {
      const compute = vi.fn(async () => {
        throw new Error("Compute failed");
      });

      await expect(getOrSet(kv, "key", { compute })).rejects.toThrow(
        CacheError,
      );
    });

    it("should not fail request when cache write fails (fire-and-forget)", async () => {
      kv.put = vi.fn(async () => {
        throw new Error("Cache write failed");
      });

      const compute = vi.fn(async () => ({ data: "computed" }));
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // Should not throw despite cache write failure
      const result = await getOrSet(kv, "key", { compute });
      expect(result).toEqual({ data: "computed" });

      // Wait for fire-and-forget to complete
      await vi.runAllTimersAsync();

      // Should log the error
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe("getOrSetSync", () => {
    it("should await cache write", async () => {
      const compute = vi.fn(async () => ({ data: "test" }));
      await getOrSetSync(kv, "testkey", { compute });

      expect(kv.put).toHaveBeenCalled();
    });

    it("should throw when cache write fails", async () => {
      kv.put = vi.fn(async () => {
        throw new Error("Cache write failed");
      });

      const compute = vi.fn(async () => ({ data: "test" }));

      await expect(getOrSetSync(kv, "key", { compute })).rejects.toThrow(
        CacheError,
      );
    });
  });

  // ==========================================================================
  // Batch Operations
  // ==========================================================================

  describe("delMany", () => {
    it("should delete multiple keys", async () => {
      await delMany(kv, ["key1", "key2", "key3"]);

      expect(kv.delete).toHaveBeenCalledTimes(3);
    });

    it("should apply namespace to all keys", async () => {
      await delMany(kv, ["key1", "key2"], { namespace: "batch" });

      expect(kv.delete).toHaveBeenCalledWith("grove:batch:key1");
      expect(kv.delete).toHaveBeenCalledWith("grove:batch:key2");
    });
  });

  describe("delByPrefix", () => {
    it("should delete all keys with prefix", async () => {
      // Seed some keys
      kv._store.set("grove:users:1", { value: "a" });
      kv._store.set("grove:users:2", { value: "b" });
      kv._store.set("grove:posts:1", { value: "c" });

      const deleted = await delByPrefix(kv, "users:");

      expect(deleted).toBe(2);
      expect(kv._store.has("grove:users:1")).toBe(false);
      expect(kv._store.has("grove:users:2")).toBe(false);
      expect(kv._store.has("grove:posts:1")).toBe(true);
    });

    it("should handle pagination", async () => {
      // Add many keys
      for (let i = 0; i < 5; i++) {
        kv._store.set(`grove:batch:${i}`, { value: `value${i}` });
      }

      const deleted = await delByPrefix(kv, "batch:");
      expect(deleted).toBe(5);
    });
  });

  // ==========================================================================
  // Utility Functions
  // ==========================================================================

  describe("has", () => {
    it("should return true when key exists", async () => {
      await kv.put("grove:testkey", "value");

      const result = await has(kv, "testkey");
      expect(result).toBe(true);
    });

    it("should return false when key does not exist", async () => {
      const result = await has(kv, "nonexistent");
      expect(result).toBe(false);
    });
  });

  describe("touch", () => {
    it("should refresh TTL for existing key", async () => {
      await kv.put("grove:testkey", JSON.stringify({ data: "test" }));

      const result = await touch(kv, "testkey", { ttl: 600 });

      expect(result).toBe(true);
      expect(kv.put).toHaveBeenCalledTimes(2); // Initial + touch
    });

    it("should return false for non-existent key", async () => {
      const result = await touch(kv, "nonexistent");

      expect(result).toBe(false);
    });
  });

  // ==========================================================================
  // Rate Limiting
  // ==========================================================================

  describe("rateLimit", () => {
    it("should allow requests under the limit", async () => {
      const result = await rateLimit(kv, "login:user@test.com", {
        limit: 5,
        windowSeconds: 60,
      });

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
    });

    it("should track request count", async () => {
      // First request
      const r1 = await rateLimit(kv, "api:endpoint", {
        limit: 3,
        windowSeconds: 60,
      });
      expect(r1.remaining).toBe(2);

      // Second request
      const r2 = await rateLimit(kv, "api:endpoint", {
        limit: 3,
        windowSeconds: 60,
      });
      expect(r2.remaining).toBe(1);

      // Third request
      const r3 = await rateLimit(kv, "api:endpoint", {
        limit: 3,
        windowSeconds: 60,
      });
      expect(r3.remaining).toBe(0);
    });

    it("should block requests over the limit", async () => {
      // Exhaust the limit
      for (let i = 0; i < 3; i++) {
        await rateLimit(kv, "limited:key", { limit: 3, windowSeconds: 60 });
      }

      // This should be blocked
      const result = await rateLimit(kv, "limited:key", {
        limit: 3,
        windowSeconds: 60,
      });

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it("should reset after window expires", async () => {
      // Use up the limit
      for (let i = 0; i < 3; i++) {
        await rateLimit(kv, "expiring:key", { limit: 3, windowSeconds: 60 });
      }

      // Advance time past the window
      advanceKVTime(kv, 61000);

      // Should be allowed again
      const result = await rateLimit(kv, "expiring:key", {
        limit: 3,
        windowSeconds: 60,
      });
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(2);
    });

    it("should include resetAt timestamp", async () => {
      const result = await rateLimit(kv, "timestamp:key", {
        limit: 5,
        windowSeconds: 300,
      });

      expect(result.resetAt).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    it("should support custom namespace", async () => {
      await rateLimit(kv, "custom:key", {
        limit: 5,
        windowSeconds: 60,
        namespace: "custom-limiter",
      });

      expect(kv.put).toHaveBeenCalledWith(
        expect.stringContaining("custom-limiter"),
        expect.any(String),
        expect.any(Object),
      );
    });
  });

  // ==========================================================================
  // TTL / Expiration
  // ==========================================================================

  describe("TTL Expiration", () => {
    it("should return null for expired keys", async () => {
      // Set with short TTL
      kv._store.set("grove:expiring", {
        value: JSON.stringify({ data: "test" }),
        expiresAt: Date.now() + 1000,
      });

      // Advance time past expiration
      advanceKVTime(kv, 2000);

      const result = await get(kv, "expiring");
      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // Key Building / Namespacing
  // ==========================================================================

  describe("Key Building", () => {
    it("should use grove prefix", async () => {
      await set(kv, "mykey", "value");

      expect(kv.put).toHaveBeenCalledWith(
        "grove:mykey",
        expect.any(String),
        expect.any(Object),
      );
    });

    it("should include namespace in key", async () => {
      await set(kv, "mykey", "value", { namespace: "users" });

      expect(kv.put).toHaveBeenCalledWith(
        "grove:users:mykey",
        expect.any(String),
        expect.any(Object),
      );
    });

    it("should handle keys with colons", async () => {
      await set(kv, "user:123:profile", "value");

      expect(kv.put).toHaveBeenCalledWith(
        "grove:user:123:profile",
        expect.any(String),
        expect.any(Object),
      );
    });
  });

  // ==========================================================================
  // Error Handling
  // ==========================================================================

  describe("Error Handling", () => {
    it("should include error code in CacheError", async () => {
      kv.get = vi.fn(async () => {
        throw new Error("Network error");
      });

      try {
        await get(kv, "key");
      } catch (err) {
        expect(err).toBeInstanceOf(CacheError);
        expect((err as CacheError).code).toBe("GET_FAILED");
      }
    });

    it("should preserve original error as cause", async () => {
      const originalError = new Error("Original");
      kv.delete = vi.fn(async () => {
        throw originalError;
      });

      try {
        await del(kv, "key");
      } catch (err) {
        expect((err as CacheError).cause).toBe(originalError);
      }
    });

    it("should use COMPUTE_FAILED code for compute errors", async () => {
      const compute = vi.fn(async () => {
        throw new Error("Compute failed");
      });

      try {
        await getOrSet(kv, "key", { compute });
      } catch (err) {
        expect((err as CacheError).code).toBe("COMPUTE_FAILED");
      }
    });
  });

  // ==========================================================================
  // Constants
  // ==========================================================================

  describe("Constants", () => {
    it("should export default TTL", () => {
      expect(CACHE_DEFAULTS.TTL_SECONDS).toBe(3600);
    });

    it("should export key prefix", () => {
      expect(CACHE_DEFAULTS.KEY_PREFIX).toBe("grove");
    });
  });
});
