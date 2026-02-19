import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  thresholdMiddleware,
  thresholdCheck,
  type ThresholdHonoContext,
} from "./hono.js";
import { Threshold } from "../threshold.js";
import { createMockStore } from "../test-utils.js";

function createMockContext(
  env: Record<string, unknown> = {},
): ThresholdHonoContext {
  const headers: Record<string, string> = {};
  return {
    env,
    req: {
      url: "https://example.com/api/test",
      header: vi.fn((name: string) => undefined),
    },
    header: vi.fn((name: string, value: string) => {
      headers[name] = value;
    }),
    json: vi.fn((data: unknown, status?: number) => {
      return new Response(JSON.stringify(data), { status: status ?? 200 });
    }),
  };
}

describe("Hono adapter", () => {
  let store: ReturnType<typeof createMockStore>;
  let threshold: Threshold;

  beforeEach(() => {
    store = createMockStore();
    threshold = new Threshold({ store });
  });

  describe("thresholdMiddleware()", () => {
    it("calls next() when allowed", async () => {
      const middleware = thresholdMiddleware({
        threshold,
        limit: 10,
        windowSeconds: 60,
        keyPrefix: "test",
        getKey: () => "user1",
      });

      const ctx = createMockContext();
      const next = vi.fn();
      await middleware(ctx, next);

      expect(next).toHaveBeenCalled();
      expect(ctx.header).toHaveBeenCalledWith("X-RateLimit-Limit", "10");
    });

    it("returns 429 when denied", async () => {
      // Exhaust limit
      for (let i = 0; i < 5; i++) {
        await threshold.check({
          key: "test:user1",
          limit: 5,
          windowSeconds: 60,
        });
      }

      const middleware = thresholdMiddleware({
        threshold,
        limit: 5,
        windowSeconds: 60,
        keyPrefix: "test",
        getKey: () => "user1",
      });

      const ctx = createMockContext();
      const next = vi.fn();
      const result = await middleware(ctx, next);

      expect(next).not.toHaveBeenCalled();
      expect(ctx.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "rate_limited",
          retry_after: expect.any(Number), // backwards compat field
        }),
        429,
      );
    });

    it("skips in test environment", async () => {
      const middleware = thresholdMiddleware({
        threshold,
        limit: 1,
        windowSeconds: 60,
        keyPrefix: "test",
        getKey: () => "user1",
      });

      const ctx = createMockContext({ ENVIRONMENT: "test" });
      const next = vi.fn();
      await middleware(ctx, next);

      expect(next).toHaveBeenCalled();
      expect(store.check).not.toHaveBeenCalled();
    });

    it("skips when getKey returns null", async () => {
      const middleware = thresholdMiddleware({
        threshold,
        limit: 10,
        windowSeconds: 60,
        keyPrefix: "test",
        getKey: () => null,
      });

      const ctx = createMockContext();
      const next = vi.fn();
      await middleware(ctx, next);

      expect(next).toHaveBeenCalled();
      expect(store.check).not.toHaveBeenCalled();
    });
  });

  describe("thresholdCheck()", () => {
    it("returns allowed result", async () => {
      const result = await thresholdCheck(threshold, "test", "user1", 10, 60);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
    });

    it("returns denied result with retryAfter", async () => {
      for (let i = 0; i < 10; i++) {
        await threshold.check({
          key: "test:user1",
          limit: 10,
          windowSeconds: 60,
        });
      }

      const result = await thresholdCheck(threshold, "test", "user1", 10, 60);
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeGreaterThan(0);
    });
  });
});
