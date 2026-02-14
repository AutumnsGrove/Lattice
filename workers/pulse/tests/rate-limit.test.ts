/**
 * Tests for Pulse Worker — KV-based Rate Limiting
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkRateLimit } from "../src/rate-limit";
import type { Env } from "../src/types";

function createMockEnv(kvStore: Map<string, string> = new Map()): Env {
  return {
    DB: {} as D1Database,
    KV: {
      get: vi.fn(async (key: string) => kvStore.get(key) ?? null),
      put: vi.fn(async (key: string, value: string) => {
        kvStore.set(key, value);
      }),
    } as unknown as KVNamespace,
    GROVE_KEK: "test-kek",
  };
}

describe("checkRateLimit", () => {
  let kvStore: Map<string, string>;
  let env: Env;

  beforeEach(() => {
    kvStore = new Map();
    env = createMockEnv(kvStore);
  });

  it("allows first request for a tenant", async () => {
    const result = await checkRateLimit(env, "tenant-1");
    expect(result.allowed).toBe(true);
    expect(result.current).toBe(1);
  });

  it("increments counter on each request", async () => {
    await checkRateLimit(env, "tenant-1");
    const result = await checkRateLimit(env, "tenant-1");
    expect(result.allowed).toBe(true);
    expect(result.current).toBe(2);
  });

  it("rejects when limit is reached", async () => {
    // Simulate counter at the limit
    // Find the current bucket key
    const bucket = Math.floor(Date.now() / 300_000);
    kvStore.set(`pulse:rl:tenant-1:${bucket}`, "200");

    const result = await checkRateLimit(env, "tenant-1");
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBe(300);
  });

  it("isolates tenants from each other", async () => {
    const bucket = Math.floor(Date.now() / 300_000);
    kvStore.set(`pulse:rl:tenant-1:${bucket}`, "200");

    const blocked = await checkRateLimit(env, "tenant-1");
    const allowed = await checkRateLimit(env, "tenant-2");

    expect(blocked.allowed).toBe(false);
    expect(allowed.allowed).toBe(true);
  });

  it("fails open when KV throws", async () => {
    const failEnv = createMockEnv();
    (failEnv.KV.get as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("KV unavailable"),
    );

    const result = await checkRateLimit(failEnv, "tenant-1");
    expect(result.allowed).toBe(true);
    expect(result.current).toBe(0);
  });

  it("sets TTL on KV put", async () => {
    await checkRateLimit(env, "tenant-1");
    expect(env.KV.put).toHaveBeenCalledWith(
      expect.stringContaining("pulse:rl:tenant-1:"),
      "1",
      { expirationTtl: 300 },
    );
  });

  it("returns limit in response", async () => {
    const result = await checkRateLimit(env, "tenant-1");
    expect(result.limit).toBe(200);
  });
});
