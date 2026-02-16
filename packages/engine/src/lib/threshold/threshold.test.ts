import { describe, it, expect, beforeEach, vi } from "vitest";
import { Threshold, categorizeRequest } from "./threshold.js";
import { createMockStore, createMockKV } from "./test-utils.js";

describe("Threshold", () => {
  let store: ReturnType<typeof createMockStore>;
  let threshold: Threshold;

  beforeEach(() => {
    store = createMockStore();
    threshold = new Threshold({ store });
  });

  describe("check()", () => {
    it("delegates to the store", async () => {
      const result = await threshold.check({
        key: "test:user1",
        limit: 10,
        windowSeconds: 60,
      });

      expect(store.check).toHaveBeenCalledTimes(1);
      expect(result.allowed).toBe(true);
    });
  });

  describe("checkTier()", () => {
    it("looks up limits from tier config", async () => {
      const result = await threshold.checkTier("seedling", "writes", "user1");

      expect(store.check).toHaveBeenCalledWith(
        expect.objectContaining({
          key: "tier:seedling:writes:user1",
          limit: 50,
          windowSeconds: 3600,
        }),
      );
      expect(result.allowed).toBe(true);
    });

    it("uses free tier limits correctly", async () => {
      await threshold.checkTier("free", "requests", "user1");

      expect(store.check).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 60,
          windowSeconds: 60,
        }),
      );
    });
  });

  describe("checkEndpoint()", () => {
    it("maps known endpoint to preset limits", async () => {
      await threshold.checkEndpoint("POST", "/api/auth/login", "192.168.1.1");

      expect(store.check).toHaveBeenCalledWith(
        expect.objectContaining({
          key: "ep:auth/login:192.168.1.1",
          limit: 5,
          windowSeconds: 300,
          failMode: "closed",
        }),
      );
    });

    it("falls back to default for unknown endpoints", async () => {
      await threshold.checkEndpoint("GET", "/api/unknown", "user1");

      expect(store.check).toHaveBeenCalledWith(
        expect.objectContaining({
          key: "ep:default:user1",
          limit: 100,
          windowSeconds: 60,
          failMode: "open",
        }),
      );
    });

    it("applies overrides when provided", async () => {
      await threshold.checkEndpoint("POST", "/api/auth/login", "user1", {
        limit: 99,
      });

      expect(store.check).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 99,
          windowSeconds: 300, // keeps config default
        }),
      );
    });

    it("sets failMode to closed for auth endpoints", async () => {
      await threshold.checkEndpoint("POST", "/api/auth/token", "user1");

      expect(store.check).toHaveBeenCalledWith(
        expect.objectContaining({
          failMode: "closed",
        }),
      );
    });

    it("sets failMode to open for non-auth endpoints", async () => {
      await threshold.checkEndpoint("POST", "/api/blooms", "user1");

      expect(store.check).toHaveBeenCalledWith(
        expect.objectContaining({
          failMode: "open",
        }),
      );
    });
  });

  describe("checkTenant()", () => {
    it("categorizes and delegates to checkTier", async () => {
      await threshold.checkTenant("alice", "seedling", "POST", "/api/blooms");

      expect(store.check).toHaveBeenCalledWith(
        expect.objectContaining({
          key: "tier:seedling:writes:tenant:alice",
          limit: 50,
          windowSeconds: 3600,
        }),
      );
    });

    it("categorizes AI requests correctly", async () => {
      await threshold.checkTenant("alice", "seedling", "POST", "/api/ai/wisp");

      expect(store.check).toHaveBeenCalledWith(
        expect.objectContaining({
          key: "tier:seedling:ai:tenant:alice",
          limit: 25,
          windowSeconds: 86400,
        }),
      );
    });
  });

  describe("checkWithAbuse()", () => {
    it("works without abuseKV configured", async () => {
      const result = await threshold.checkWithAbuse(
        { key: "test", limit: 10, windowSeconds: 60 },
        "user1",
      );

      expect(result.allowed).toBe(true);
      expect(result.banned).toBeUndefined();
    });

    it("blocks banned users", async () => {
      const kv = createMockKV();
      const now = Math.floor(Date.now() / 1000);
      await kv.put(
        "abuse:user1",
        JSON.stringify({
          violations: 5,
          lastViolation: now,
          bannedUntil: now + 3600,
        }),
      );

      const thresholdWithAbuse = new Threshold({ store, abuseKV: kv });
      const result = await thresholdWithAbuse.checkWithAbuse(
        { key: "test", limit: 10, windowSeconds: 60 },
        "user1",
      );

      expect(result.allowed).toBe(false);
      expect(result.banned).toBe(true);
      // Store should NOT have been called (short-circuited by ban)
      expect(store.check).not.toHaveBeenCalled();
    });

    it("records violation when rate limited", async () => {
      const kv = createMockKV();
      const thresholdWithAbuse = new Threshold({ store, abuseKV: kv });

      // Exhaust limit
      for (let i = 0; i < 10; i++) {
        await thresholdWithAbuse.check({
          key: "test",
          limit: 10,
          windowSeconds: 60,
        });
      }

      const result = await thresholdWithAbuse.checkWithAbuse(
        { key: "test", limit: 10, windowSeconds: 60 },
        "user1",
      );

      expect(result.allowed).toBe(false);
      expect(result.warning).toBe(true);
    });
  });

  describe("clearAbuse()", () => {
    it("clears abuse state when KV is configured", async () => {
      const kv = createMockKV();
      const thresholdWithAbuse = new Threshold({ store, abuseKV: kv });

      await thresholdWithAbuse.clearAbuse("user1");
      expect(kv.delete).toHaveBeenCalledWith("abuse:user1");
    });

    it("does nothing when KV is not configured", async () => {
      await threshold.clearAbuse("user1");
      // No error thrown
    });
  });
});

describe("categorizeRequest()", () => {
  it("categorizes AI endpoints", () => {
    expect(categorizeRequest("POST", "/api/ai/wisp")).toBe("ai");
    expect(categorizeRequest("POST", "/api/wisp")).toBe("ai");
    expect(categorizeRequest("POST", "/api/grove/wisp")).toBe("ai");
  });

  it("categorizes upload endpoints", () => {
    expect(categorizeRequest("POST", "/api/upload")).toBe("uploads");
    expect(categorizeRequest("POST", "/api/images")).toBe("uploads");
    expect(categorizeRequest("POST", "/api/cdn/image")).toBe("uploads");
  });

  it("categorizes write methods", () => {
    expect(categorizeRequest("POST", "/api/blooms")).toBe("writes");
    expect(categorizeRequest("PUT", "/api/blooms")).toBe("writes");
    expect(categorizeRequest("PATCH", "/api/settings")).toBe("writes");
    expect(categorizeRequest("DELETE", "/api/posts/123")).toBe("writes");
  });

  it("categorizes everything else as requests", () => {
    expect(categorizeRequest("GET", "/api/posts")).toBe("requests");
    expect(categorizeRequest("GET", "/api/settings")).toBe("requests");
  });
});
