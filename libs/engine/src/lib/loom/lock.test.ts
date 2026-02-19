import { describe, it, expect } from "vitest";
import { PromiseLockMap } from "./lock.js";

describe("PromiseLockMap", () => {
  it("executes function and returns result", async () => {
    const locks = new PromiseLockMap();
    const result = await locks.withLock("test", async () => 42);
    expect(result).toBe(42);
  });

  it("deduplicates concurrent calls with same key", async () => {
    const locks = new PromiseLockMap();
    let callCount = 0;

    const fn = async () => {
      callCount++;
      await new Promise((r) => setTimeout(r, 50));
      return "result";
    };

    // Fire two concurrent calls with the same key
    const [a, b] = await Promise.all([
      locks.withLock("key", fn),
      locks.withLock("key", fn),
    ]);

    // Both get the same result, but fn only ran once
    expect(a).toBe("result");
    expect(b).toBe("result");
    expect(callCount).toBe(1);
  });

  it("allows concurrent calls with different keys", async () => {
    const locks = new PromiseLockMap();
    let callCount = 0;

    const fn = async () => {
      callCount++;
      await new Promise((r) => setTimeout(r, 10));
      return callCount;
    };

    await Promise.all([locks.withLock("a", fn), locks.withLock("b", fn)]);

    expect(callCount).toBe(2);
  });

  it("releases lock after completion", async () => {
    const locks = new PromiseLockMap();

    await locks.withLock("key", async () => "first");
    expect(locks.isLocked("key")).toBe(false);

    // Second call creates a new execution
    let secondCalled = false;
    await locks.withLock("key", async () => {
      secondCalled = true;
    });
    expect(secondCalled).toBe(true);
  });

  it("releases lock even on error", async () => {
    const locks = new PromiseLockMap();

    try {
      await locks.withLock("key", async () => {
        throw new Error("test error");
      });
    } catch {
      // Expected
    }

    expect(locks.isLocked("key")).toBe(false);
    expect(locks.size).toBe(0);
  });

  it("tracks lock state correctly", async () => {
    const locks = new PromiseLockMap();
    expect(locks.size).toBe(0);
    expect(locks.isLocked("key")).toBe(false);

    const promise = locks.withLock("key", async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(locks.isLocked("key")).toBe(true);
    expect(locks.size).toBe(1);

    await promise;

    expect(locks.isLocked("key")).toBe(false);
    expect(locks.size).toBe(0);
  });
});
