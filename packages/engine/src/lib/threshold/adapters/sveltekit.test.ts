import { describe, it, expect, beforeEach } from "vitest";
import {
  thresholdCheck,
  thresholdCheckWithResult,
  thresholdHeaders,
} from "./sveltekit.js";
import { Threshold } from "../threshold.js";
import { createMockStore } from "../test-utils.js";

describe("SvelteKit adapter", () => {
  let store: ReturnType<typeof createMockStore>;
  let threshold: Threshold;

  beforeEach(() => {
    store = createMockStore();
    threshold = new Threshold({ store });
  });

  describe("thresholdCheck()", () => {
    it("returns null when allowed", async () => {
      const response = await thresholdCheck(threshold, {
        key: "test:user1",
        limit: 10,
        windowSeconds: 60,
      });

      expect(response).toBeNull();
    });

    it("returns 429 Response when denied", async () => {
      // Exhaust limit
      for (let i = 0; i < 10; i++) {
        await threshold.check({
          key: "test:user1",
          limit: 10,
          windowSeconds: 60,
        });
      }

      const response = await thresholdCheck(threshold, {
        key: "test:user1",
        limit: 10,
        windowSeconds: 60,
      });

      expect(response).not.toBeNull();
      expect(response!.status).toBe(429);

      const body = await response!.json();
      expect(body.error).toBe("rate_limited");
      expect(body.retryAfter).toBeGreaterThan(0);
      expect(body.resetAt).toBeDefined();
      expect(body.message).toContain("moving faster");
    });

    it("includes rate limit headers on 429", async () => {
      for (let i = 0; i < 5; i++) {
        await threshold.check({
          key: "test:user1",
          limit: 5,
          windowSeconds: 60,
        });
      }

      const response = await thresholdCheck(threshold, {
        key: "test:user1",
        limit: 5,
        windowSeconds: 60,
      });

      expect(response!.headers.get("X-RateLimit-Limit")).toBe("5");
      expect(response!.headers.get("X-RateLimit-Remaining")).toBe("0");
      expect(response!.headers.get("Retry-After")).toBeDefined();
    });
  });

  describe("thresholdCheckWithResult()", () => {
    it("returns result without response when allowed", async () => {
      const { result, response } = await thresholdCheckWithResult(threshold, {
        key: "test:user1",
        limit: 10,
        windowSeconds: 60,
      });

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
      expect(response).toBeUndefined();
    });

    it("returns result with 429 response when denied", async () => {
      // Exhaust limit
      for (let i = 0; i < 10; i++) {
        await threshold.check({
          key: "test:user1",
          limit: 10,
          windowSeconds: 60,
        });
      }

      const { result, response } = await thresholdCheckWithResult(threshold, {
        key: "test:user1",
        limit: 10,
        windowSeconds: 60,
      });

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(response).toBeDefined();
      expect(response!.status).toBe(429);

      const body = await response!.json();
      expect(body.error).toBe("rate_limited");
      expect(body.retryAfter).toBeGreaterThan(0);
      expect(body.message).toContain("moving faster");
    });

    it("result can be used for success headers after passing", async () => {
      const { result, response } = await thresholdCheckWithResult(threshold, {
        key: "test:user1",
        limit: 10,
        windowSeconds: 60,
      });

      expect(response).toBeUndefined();

      const headers = thresholdHeaders(result, 10);
      expect(headers["X-RateLimit-Limit"]).toBe("10");
      expect(headers["X-RateLimit-Remaining"]).toBe("9");
    });
  });

  describe("thresholdHeaders()", () => {
    it("generates correct headers for allowed request", () => {
      const headers = thresholdHeaders(
        { allowed: true, remaining: 8, resetAt: 1739620800 },
        10,
      );

      expect(headers["X-RateLimit-Limit"]).toBe("10");
      expect(headers["X-RateLimit-Remaining"]).toBe("8");
      expect(headers["X-RateLimit-Reset"]).toBe("1739620800");
      expect(headers["Retry-After"]).toBeUndefined();
    });

    it("includes Retry-After for denied request", () => {
      const headers = thresholdHeaders(
        { allowed: false, remaining: 0, resetAt: 1739620800, retryAfter: 45 },
        10,
      );

      expect(headers["Retry-After"]).toBe("45");
    });
  });
});
