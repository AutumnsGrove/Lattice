import { describe, it, expect, beforeEach, vi } from "vitest";
import { ThresholdD1Store } from "./d1.js";
import { createMockD1 } from "../test-utils.js";

describe("ThresholdD1Store", () => {
  let db: D1Database;
  let store: ThresholdD1Store;

  beforeEach(() => {
    db = createMockD1();
    store = new ThresholdD1Store(db);
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

  it("denies when limit is exceeded", async () => {
    for (let i = 0; i < 5; i++) {
      await store.check({ key: "test:user1", limit: 5, windowSeconds: 60 });
    }

    const result = await store.check({
      key: "test:user1",
      limit: 5,
      windowSeconds: 60,
    });

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it("isolates keys between different identifiers", async () => {
    const r1 = await store.check({ key: "user1", limit: 1, windowSeconds: 60 });
    const r2 = await store.check({ key: "user2", limit: 1, windowSeconds: 60 });

    expect(r1.allowed).toBe(true);
    expect(r2.allowed).toBe(true);
  });

  it("uses atomic SQL (single prepare call)", async () => {
    await store.check({ key: "test:user1", limit: 10, windowSeconds: 60 });

    expect(db.prepare).toHaveBeenCalledTimes(1);
    expect(db.prepare).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO rate_limits"),
    );
  });

  describe("fail modes", () => {
    it("fails open by default on D1 error", async () => {
      const errorDb = {
        prepare: vi.fn(() => ({
          bind: vi.fn(() => ({
            first: vi.fn().mockRejectedValue(new Error("D1 down")),
          })),
        })),
      } as unknown as D1Database;

      const errorStore = new ThresholdD1Store(errorDb);
      const result = await errorStore.check({
        key: "test:user1",
        limit: 10,
        windowSeconds: 60,
      });

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(10);
    });

    it('fails closed when failMode is "closed"', async () => {
      const errorDb = {
        prepare: vi.fn(() => ({
          bind: vi.fn(() => ({
            first: vi.fn().mockRejectedValue(new Error("D1 down")),
          })),
        })),
      } as unknown as D1Database;

      const errorStore = new ThresholdD1Store(errorDb);
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
