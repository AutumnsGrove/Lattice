import { describe, it, expect, beforeEach } from "vitest";
import { thresholdCheck, getClientIP } from "./worker.js";
import { Threshold } from "../threshold.js";
import { createMockStore } from "../test-utils.js";

describe("Worker adapter", () => {
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
    });

    it("includes correct headers on 429", async () => {
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

      expect(response!.headers.get("Content-Type")).toBe("application/json");
      expect(response!.headers.get("X-RateLimit-Limit")).toBe("5");
      expect(response!.headers.get("X-RateLimit-Remaining")).toBe("0");
      expect(response!.headers.get("Retry-After")).toBeDefined();
    });
  });

  describe("getClientIP()", () => {
    it("prefers cf-connecting-ip", () => {
      const request = new Request("https://example.com", {
        headers: {
          "cf-connecting-ip": "1.2.3.4",
          "x-forwarded-for": "5.6.7.8",
        },
      });
      expect(getClientIP(request)).toBe("1.2.3.4");
    });

    it("falls back to x-forwarded-for", () => {
      const request = new Request("https://example.com", {
        headers: { "x-forwarded-for": "5.6.7.8, 10.0.0.1" },
      });
      expect(getClientIP(request)).toBe("5.6.7.8");
    });

    it("falls back to x-real-ip", () => {
      const request = new Request("https://example.com", {
        headers: { "x-real-ip": "9.10.11.12" },
      });
      expect(getClientIP(request)).toBe("9.10.11.12");
    });

    it('returns "unknown" when no IP headers', () => {
      const request = new Request("https://example.com");
      expect(getClientIP(request)).toBe("unknown");
    });
  });
});
