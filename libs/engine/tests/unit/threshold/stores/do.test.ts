/**
 * ThresholdDOStore — Unit Tests
 *
 * Tests the DO storage adapter in isolation using a mock DurableObjectNamespace.
 * Verifies delegation to the DO, error handling (fail-open/closed), and
 * the factory's priority chain logic.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ThresholdDOStore } from "$lib/threshold/stores/do.js";
import { ThresholdKVStore } from "$lib/threshold/stores/kv.js";
import { createThreshold } from "$lib/threshold/factory.js";

// =============================================================================
// Mock DO Namespace
// =============================================================================

function createMockDONamespace(
  handler?: (...args: any[]) => Promise<Response>,
) {
  const stubs = new Map<string, { fetch: ReturnType<typeof vi.fn> }>();

  return {
    idFromName: vi.fn((name: string) => ({ name, toString: () => name })),
    get: vi.fn((id: { name: string }) => {
      if (!stubs.has(id.name)) {
        stubs.set(id.name, {
          fetch: vi.fn(
            handler ??
              (async () =>
                Response.json({
                  allowed: true,
                  remaining: 9,
                  resetAt: Math.floor(Date.now() / 1000) + 60,
                })),
          ),
        });
      }
      return stubs.get(id.name)!;
    }),
    _stubs: stubs,
  } as unknown as DurableObjectNamespace;
}

// =============================================================================
// ThresholdDOStore Tests
// =============================================================================

describe("ThresholdDOStore", () => {
  let ns: ReturnType<typeof createMockDONamespace>;

  beforeEach(() => {
    ns = createMockDONamespace();
  });

  it("delegates check to DO via fetch", async () => {
    const store = new ThresholdDOStore(ns, "user-123");
    const result = await store.check({
      key: "upload:user-123",
      limit: 10,
      windowSeconds: 60,
    });

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9);

    // Verify correct DO ID was used
    expect(ns.idFromName).toHaveBeenCalledWith("threshold:user-123");
  });

  it("sends correct POST body to DO", async () => {
    let capturedBody: unknown;
    // stub.fetch receives (url, init) — not a Request object
    const ns = createMockDONamespace(async (_url: any, init?: any) => {
      if (init?.body) capturedBody = JSON.parse(init.body);
      return Response.json({ allowed: true, remaining: 4, resetAt: 100 });
    });

    const store = new ThresholdDOStore(ns, "user-456");
    await store.check({ key: "posts:write", limit: 5, windowSeconds: 3600 });

    expect(capturedBody).toEqual({
      key: "posts:write",
      limit: 5,
      windowSeconds: 3600,
    });
  });

  it("returns denied result from DO", async () => {
    const ns = createMockDONamespace(async () =>
      Response.json({
        allowed: false,
        remaining: 0,
        resetAt: 9999,
        retryAfter: 30,
      }),
    );

    const store = new ThresholdDOStore(ns, "user-789");
    const result = await store.check({
      key: "upload:user-789",
      limit: 10,
      windowSeconds: 60,
    });

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfter).toBe(30);
  });

  it("fails open by default on DO error", async () => {
    const ns = createMockDONamespace(async () => {
      throw new Error("DO unreachable");
    });

    const store = new ThresholdDOStore(ns, "user-err");
    const result = await store.check({
      key: "test:key",
      limit: 10,
      windowSeconds: 60,
    });

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(10);
  });

  it("fails closed when failMode is 'closed'", async () => {
    const ns = createMockDONamespace(async () => {
      throw new Error("DO unreachable");
    });

    const store = new ThresholdDOStore(ns, "user-err");
    const result = await store.check({
      key: "auth:login",
      limit: 5,
      windowSeconds: 60,
      failMode: "closed",
    });

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfter).toBe(30);
  });

  it("fails open on non-OK HTTP response", async () => {
    const ns = createMockDONamespace(async () =>
      Response.json({ error: "internal_error" }, { status: 500 }),
    );

    const store = new ThresholdDOStore(ns, "user-500");
    const result = await store.check({
      key: "test:key",
      limit: 10,
      windowSeconds: 60,
    });

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(10);
  });

  it("uses same DO instance for same identifier", async () => {
    const store = new ThresholdDOStore(ns, "user-same");

    await store.check({ key: "a", limit: 10, windowSeconds: 60 });
    await store.check({ key: "b", limit: 10, windowSeconds: 60 });

    // idFromName should always be called with the same identifier
    expect(ns.idFromName).toHaveBeenCalledTimes(2);
    expect(ns.idFromName).toHaveBeenCalledWith("threshold:user-same");
  });
});

// =============================================================================
// Factory Priority Chain Tests
// =============================================================================

describe("createThreshold factory", () => {
  it("returns DO-backed threshold when THRESHOLD + identifier present", () => {
    const ns = createMockDONamespace();
    const threshold = createThreshold(
      { THRESHOLD: ns, CACHE_KV: {} as KVNamespace },
      { identifier: "user-123" },
    );

    expect(threshold).not.toBeNull();
  });

  it("falls back to KV when no identifier provided", () => {
    const ns = createMockDONamespace();
    const mockKV = {} as KVNamespace;
    const threshold = createThreshold({ THRESHOLD: ns, CACHE_KV: mockKV });

    expect(threshold).not.toBeNull();
  });

  it("falls back to KV when no THRESHOLD binding", () => {
    const mockKV = {} as KVNamespace;
    const threshold = createThreshold({ CACHE_KV: mockKV });

    expect(threshold).not.toBeNull();
  });

  it("returns null when neither available", () => {
    const threshold = createThreshold({});
    expect(threshold).toBeNull();
  });

  it("returns null for undefined env", () => {
    const threshold = createThreshold(undefined);
    expect(threshold).toBeNull();
  });

  it("prefers DO over KV when both available with identifier", async () => {
    let doHit = false;
    const ns = createMockDONamespace(async () => {
      doHit = true;
      return Response.json({ allowed: true, remaining: 9, resetAt: 100 });
    });

    const threshold = createThreshold(
      { THRESHOLD: ns, CACHE_KV: {} as KVNamespace },
      { identifier: "user-123" },
    );

    expect(threshold).not.toBeNull();
    await threshold!.check({ key: "test", limit: 10, windowSeconds: 60 });
    expect(doHit).toBe(true);
  });
});
