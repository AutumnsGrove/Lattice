import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getAbuseState,
  recordViolation,
  isBanned,
  getBanRemaining,
  clearAbuseState,
} from "./abuse.js";
import { createMockKV } from "./test-utils.js";

describe("abuse tracking", () => {
  let kv: KVNamespace;

  beforeEach(() => {
    kv = createMockKV();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("getAbuseState", () => {
    it("returns fresh state for unknown user", async () => {
      const state = await getAbuseState(kv, "user1");
      expect(state.violations).toBe(0);
      expect(state.bannedUntil).toBeNull();
    });

    it("returns stored state for known user", async () => {
      const now = Math.floor(Date.now() / 1000);
      await kv.put(
        "abuse:user1",
        JSON.stringify({
          violations: 3,
          lastViolation: now,
          bannedUntil: null,
        }),
      );

      const state = await getAbuseState(kv, "user1");
      expect(state.violations).toBe(3);
    });

    it("decays violations after 24 hours", async () => {
      const dayAgo = Math.floor(Date.now() / 1000) - 86401;
      await kv.put(
        "abuse:user1",
        JSON.stringify({
          violations: 4,
          lastViolation: dayAgo,
          bannedUntil: null,
        }),
      );

      const state = await getAbuseState(kv, "user1");
      expect(state.violations).toBe(0);
    });

    it("returns fresh state on KV error", async () => {
      (kv.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error("KV down"),
      );

      const state = await getAbuseState(kv, "user1");
      expect(state.violations).toBe(0);
    });
  });

  describe("recordViolation", () => {
    it("returns warning for first violation", async () => {
      const result = await recordViolation(kv, "user1");
      expect(result.warning).toBe(true);
      expect(result.banned).toBe(false);
    });

    it("bans on 5th violation", async () => {
      for (let i = 0; i < 4; i++) {
        await recordViolation(kv, "user1");
      }

      const result = await recordViolation(kv, "user1");
      expect(result.banned).toBe(true);
      expect(result.bannedUntil).toBeGreaterThan(0);
      expect(result.warning).toBe(false);
    });

    it("stores state in KV", async () => {
      await recordViolation(kv, "user1");
      expect(kv.put).toHaveBeenCalledWith(
        "abuse:user1",
        expect.any(String),
        expect.objectContaining({ expirationTtl: expect.any(Number) }),
      );
    });
  });

  describe("isBanned", () => {
    it("returns false when not banned", () => {
      expect(
        isBanned({ violations: 3, lastViolation: 0, bannedUntil: null }),
      ).toBe(false);
    });

    it("returns true during active ban", () => {
      const future = Math.floor(Date.now() / 1000) + 3600;
      expect(
        isBanned({ violations: 5, lastViolation: 0, bannedUntil: future }),
      ).toBe(true);
    });

    it("returns false after ban expires", () => {
      const past = Math.floor(Date.now() / 1000) - 1;
      expect(
        isBanned({ violations: 5, lastViolation: 0, bannedUntil: past }),
      ).toBe(false);
    });
  });

  describe("getBanRemaining", () => {
    it("returns 0 when not banned", () => {
      expect(
        getBanRemaining({ violations: 0, lastViolation: 0, bannedUntil: null }),
      ).toBe(0);
    });

    it("returns remaining seconds during ban", () => {
      const bannedUntil = Math.floor(Date.now() / 1000) + 3600;
      expect(
        getBanRemaining({ violations: 5, lastViolation: 0, bannedUntil }),
      ).toBe(3600);
    });
  });

  describe("clearAbuseState", () => {
    it("deletes abuse state from KV", async () => {
      await clearAbuseState(kv, "user1");
      expect(kv.delete).toHaveBeenCalledWith("abuse:user1");
    });
  });
});
