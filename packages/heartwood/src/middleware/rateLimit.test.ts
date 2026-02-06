/**
 * Tests for rate limiting middleware
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import type { Env } from "../types.js";
import { createMockEnv } from "../test-helpers.js";

// Type-safe response interfaces for tests
interface RateLimitErrorResponse {
  error: string;
  retry_after: number;
}

// Mock the DB queries module
vi.mock("../db/queries.js", () => ({
  checkRateLimit: vi.fn(),
}));

import { createRateLimiter, checkRouteRateLimit } from "./rateLimit.js";
import { checkRateLimit } from "../db/queries.js";

const mockEnv = createMockEnv();

// =============================================================================
// createRateLimiter middleware
// =============================================================================

describe("createRateLimiter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createTestApp(config: Parameters<typeof createRateLimiter>[0]) {
    const app = new Hono<{ Bindings: Env }>();
    app.use("*", createRateLimiter(config));
    app.get("/test", (c) => c.json({ ok: true }));
    return app;
  }

  it("allows request when under limit", async () => {
    (checkRateLimit as ReturnType<typeof vi.fn>).mockResolvedValue({
      allowed: true,
      remaining: 5,
      resetAt: new Date(Date.now() + 60000),
    });

    const app = createTestApp({
      keyPrefix: "test",
      limit: 10,
      windowSeconds: 60,
      getKey: () => "127.0.0.1",
    });

    const res = await app.request("/test", {}, mockEnv);
    expect(res.status).toBe(200);
  });

  it("returns 429 when over limit", async () => {
    const resetAt = new Date(Date.now() + 30000);
    (checkRateLimit as ReturnType<typeof vi.fn>).mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt,
    });

    const app = createTestApp({
      keyPrefix: "test",
      limit: 10,
      windowSeconds: 60,
      getKey: () => "127.0.0.1",
    });

    const res = await app.request("/test", {}, mockEnv);
    expect(res.status).toBe(429);
    const json = (await res.json()) as RateLimitErrorResponse;
    expect(json.error).toBe("rate_limit");
    expect(json.retry_after).toBeGreaterThan(0);
  });

  it("sets Retry-After header when rate limited", async () => {
    const resetAt = new Date(Date.now() + 45000);
    (checkRateLimit as ReturnType<typeof vi.fn>).mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt,
    });

    const app = createTestApp({
      keyPrefix: "test",
      limit: 10,
      windowSeconds: 60,
      getKey: () => "127.0.0.1",
    });

    const res = await app.request("/test", {}, mockEnv);
    expect(res.headers.get("Retry-After")).toBeDefined();
    const retryAfter = parseInt(res.headers.get("Retry-After")!);
    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(45);
  });

  it("sets rate limit headers on allowed requests", async () => {
    const resetAt = new Date(Date.now() + 60000);
    (checkRateLimit as ReturnType<typeof vi.fn>).mockResolvedValue({
      allowed: true,
      remaining: 7,
      resetAt,
    });

    const app = createTestApp({
      keyPrefix: "test",
      limit: 10,
      windowSeconds: 60,
      getKey: () => "127.0.0.1",
    });

    const res = await app.request("/test", {}, mockEnv);
    expect(res.headers.get("X-RateLimit-Limit")).toBe("10");
    expect(res.headers.get("X-RateLimit-Remaining")).toBe("7");
    expect(res.headers.get("X-RateLimit-Reset")).toBeDefined();
  });

  it("skips rate limiting when getKey returns null", async () => {
    const app = createTestApp({
      keyPrefix: "test",
      limit: 10,
      windowSeconds: 60,
      getKey: () => null,
    });

    const res = await app.request("/test", {}, mockEnv);
    expect(res.status).toBe(200);
    // checkRateLimit should not be called
    expect(checkRateLimit).not.toHaveBeenCalled();
  });

  it("constructs correct key from prefix and key part", async () => {
    (checkRateLimit as ReturnType<typeof vi.fn>).mockResolvedValue({
      allowed: true,
      remaining: 5,
      resetAt: new Date(Date.now() + 60000),
    });

    const app = createTestApp({
      keyPrefix: "magic_email",
      limit: 3,
      windowSeconds: 60,
      getKey: () => "user@example.com",
    });

    await app.request("/test", {}, mockEnv);
    expect(checkRateLimit).toHaveBeenCalledWith(
      expect.anything(),
      "magic_email:user@example.com",
      3,
      60,
    );
  });
});

// =============================================================================
// checkRouteRateLimit (direct function)
// =============================================================================

describe("checkRouteRateLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns allowed=true when under limit", async () => {
    (checkRateLimit as ReturnType<typeof vi.fn>).mockResolvedValue({
      allowed: true,
      remaining: 5,
      resetAt: new Date(Date.now() + 60000),
    });

    const result = await checkRouteRateLimit(
      {} as any,
      "token",
      "127.0.0.1:test-app",
      20,
    );
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(5);
    expect(result.retryAfter).toBeUndefined();
  });

  it("returns allowed=false with retryAfter when over limit", async () => {
    const resetAt = new Date(Date.now() + 30000);
    (checkRateLimit as ReturnType<typeof vi.fn>).mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt,
    });

    const result = await checkRouteRateLimit(
      {} as any,
      "token",
      "127.0.0.1:test-app",
      20,
    );
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfter).toBeGreaterThan(0);
    expect(result.retryAfter).toBeLessThanOrEqual(30);
  });

  it("constructs key from prefix and keyPart", async () => {
    (checkRateLimit as ReturnType<typeof vi.fn>).mockResolvedValue({
      allowed: true,
      remaining: 10,
      resetAt: new Date(Date.now() + 60000),
    });

    await checkRouteRateLimit({} as any, "magic_ip", "192.168.1.1", 10, 60);
    expect(checkRateLimit).toHaveBeenCalledWith(
      expect.anything(),
      "magic_ip:192.168.1.1",
      10,
      60,
    );
  });

  it("uses default window of RATE_LIMIT_WINDOW", async () => {
    (checkRateLimit as ReturnType<typeof vi.fn>).mockResolvedValue({
      allowed: true,
      remaining: 10,
      resetAt: new Date(Date.now() + 60000),
    });

    await checkRouteRateLimit({} as any, "test", "key", 5);
    // Default window is 60 seconds (RATE_LIMIT_WINDOW)
    expect(checkRateLimit).toHaveBeenCalledWith(
      expect.anything(),
      "test:key",
      5,
      60,
    );
  });
});
