import { describe, it, expect, beforeEach, vi } from "vitest";
import { ThresholdKVStore } from "./kv.js";
import { createMockKV } from "../test-utils.js";

describe("ThresholdKVStore", () => {
  let kv: KVNamespace;
  let store: ThresholdKVStore;

  beforeEach(() => {
    kv = createMockKV();
    store = new ThresholdKVStore(kv);
  });

  it("allows first request in a new window", async () => {
    const result = await store.check({
      key: "test:user1",
      limit: 10,
      windowSeconds: 60,
    });

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9);
    expect(result.resetAt).toBeGreaterThan(0);
  });

  it("decrements remaining on subsequent requests", async () => {
    await store.check({ key: "test:user1", limit: 10, windowSeconds: 60 });
    const result = await store.check({
      key: "test:user1",
      limit: 10,
      windowSeconds: 60,
    });

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(8);
  });

  it("denies when limit is reached", async () => {
    for (let i = 0; i < 3; i++) {
      await store.check({ key: "test:user1", limit: 3, windowSeconds: 60 });
    }

    const result = await store.check({
      key: "test:user1",
      limit: 3,
      windowSeconds: 60,
    });

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it("uses custom namespace prefix", async () => {
    const customStore = new ThresholdKVStore(kv, "custom");
    await customStore.check({
      key: "test:user1",
      limit: 10,
      windowSeconds: 60,
    });

    expect(kv.put).toHaveBeenCalledWith(
      expect.stringContaining("custom:test:user1"),
      expect.any(String),
      expect.any(Object),
    );
  });

  it("isolates keys between different identifiers", async () => {
    const r1 = await store.check({ key: "user1", limit: 1, windowSeconds: 60 });
    const r2 = await store.check({ key: "user2", limit: 1, windowSeconds: 60 });

    expect(r1.allowed).toBe(true);
    expect(r2.allowed).toBe(true);
  });

  describe("fail modes", () => {
    it("fails open by default on KV error", async () => {
      const errorKV = {
        get: vi.fn().mockRejectedValue(new Error("KV down")),
        put: vi.fn(),
        delete: vi.fn(),
        list: vi.fn(),
        getWithMetadata: vi.fn(),
      } as unknown as KVNamespace;

      const errorStore = new ThresholdKVStore(errorKV);
      const result = await errorStore.check({
        key: "test:user1",
        limit: 10,
        windowSeconds: 60,
      });

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(10);
    });

    it('fails closed when failMode is "closed"', async () => {
      const errorKV = {
        get: vi.fn().mockRejectedValue(new Error("KV down")),
        put: vi.fn(),
        delete: vi.fn(),
        list: vi.fn(),
        getWithMetadata: vi.fn(),
      } as unknown as KVNamespace;

      const errorStore = new ThresholdKVStore(errorKV);
      const result = await errorStore.check({
        key: "test:user1",
        limit: 10,
        windowSeconds: 60,
        failMode: "closed",
      });

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBe(30);
    });
  });
});
