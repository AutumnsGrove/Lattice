/**
 * Free Account IP Limit Tests
 *
 * Tests for IP-based rate limiting on free (Wanderer) account creation.
 * Covers: limit boundary conditions, window expiry, and logging.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import type { D1Database } from "@cloudflare/workers-types";
import {
  checkFreeAccountIPLimit,
  logFreeAccountCreation,
} from "./free-account-limits";

/**
 * Mock D1 Database Helper
 * Creates a mock D1 with chainable prepare/bind/first/run pattern
 */
function createMockDb(firstResult: unknown = null): D1Database {
  return {
    prepare: vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue(firstResult),
        run: vi.fn().mockResolvedValue({ success: true }),
      }),
    }),
  } as unknown as D1Database;
}

describe("Free Account IP Limits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // checkFreeAccountIPLimit
  // ==========================================================================

  describe("checkFreeAccountIPLimit", () => {
    it("allows creation when no previous accounts from IP", async () => {
      const db = createMockDb({ count: 0 });
      const allowed = await checkFreeAccountIPLimit(db, "192.168.1.1");
      expect(allowed).toBe(true);
    });

    it("allows creation for 1st and 2nd accounts (under limit)", async () => {
      const db1 = createMockDb({ count: 1 });
      expect(await checkFreeAccountIPLimit(db1, "10.0.0.1")).toBe(true);

      const db2 = createMockDb({ count: 2 });
      expect(await checkFreeAccountIPLimit(db2, "10.0.0.1")).toBe(true);
    });

    it("denies creation at exactly the 3-account limit", async () => {
      const db = createMockDb({ count: 3 });
      const allowed = await checkFreeAccountIPLimit(db, "192.168.1.1");
      expect(allowed).toBe(false);
    });

    it("denies creation above the limit", async () => {
      const db = createMockDb({ count: 5 });
      const allowed = await checkFreeAccountIPLimit(db, "192.168.1.1");
      expect(allowed).toBe(false);
    });

    it("allows creation when result is null (table empty or missing)", async () => {
      const db = createMockDb(null);
      const allowed = await checkFreeAccountIPLimit(db, "192.168.1.1");
      expect(allowed).toBe(true);
    });

    it("queries with correct IP and time window", async () => {
      const db = createMockDb({ count: 0 });
      const now = Date.now();
      vi.spyOn(Date, "now").mockReturnValue(now);

      await checkFreeAccountIPLimit(db, "203.0.113.42");

      const prepare = db.prepare as ReturnType<typeof vi.fn>;
      expect(prepare).toHaveBeenCalledOnce();

      // Verify the SQL includes the right table and conditions
      const sql = prepare.mock.calls[0][0] as string;
      expect(sql).toContain("free_account_creation_log");
      expect(sql).toContain("ip_address");
      expect(sql).toContain("created_at");

      // Verify bind was called with the IP and a cutoff timestamp
      const bind = prepare.mock.results[0].value.bind as ReturnType<
        typeof vi.fn
      >;
      expect(bind).toHaveBeenCalledWith("203.0.113.42", expect.any(Number));

      // The cutoff should be ~30 days ago in unix seconds
      const cutoff = bind.mock.calls[0][1] as number;
      const expectedCutoff = Math.floor(now / 1000) - 30 * 24 * 60 * 60;
      expect(cutoff).toBe(expectedCutoff);

      vi.restoreAllMocks();
    });

    it("propagates DB errors to the caller", async () => {
      const db = {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnValue({
            first: vi.fn().mockRejectedValue(new Error("D1 connection failed")),
          }),
        }),
      } as unknown as D1Database;

      await expect(checkFreeAccountIPLimit(db, "10.0.0.1")).rejects.toThrow(
        "D1 connection failed",
      );
    });
  });

  // ==========================================================================
  // logFreeAccountCreation
  // ==========================================================================

  describe("logFreeAccountCreation", () => {
    it("inserts a log entry with the IP address", async () => {
      const db = createMockDb();
      await logFreeAccountCreation(db, "192.168.1.1");

      const prepare = db.prepare as ReturnType<typeof vi.fn>;
      expect(prepare).toHaveBeenCalledOnce();

      const sql = prepare.mock.calls[0][0] as string;
      expect(sql).toContain("INSERT INTO free_account_creation_log");
      expect(sql).toContain("ip_address");

      const bind = prepare.mock.results[0].value.bind as ReturnType<
        typeof vi.fn
      >;
      // First arg is a UUID, second is the IP
      expect(bind).toHaveBeenCalledWith(expect.any(String), "192.168.1.1");
    });

    it("generates a unique ID for each log entry", async () => {
      const ids: string[] = [];
      const db = {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn((...args: unknown[]) => {
            ids.push(args[0] as string);
            return { run: vi.fn().mockResolvedValue({ success: true }) };
          }),
        }),
      } as unknown as D1Database;

      await logFreeAccountCreation(db, "10.0.0.1");
      await logFreeAccountCreation(db, "10.0.0.1");

      expect(ids).toHaveLength(2);
      expect(ids[0]).not.toBe(ids[1]);
    });

    it("propagates DB errors to the caller", async () => {
      const db = {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnValue({
            run: vi.fn().mockRejectedValue(new Error("D1 write failed")),
          }),
        }),
      } as unknown as D1Database;

      await expect(logFreeAccountCreation(db, "10.0.0.1")).rejects.toThrow(
        "D1 write failed",
      );
    });
  });

  // ==========================================================================
  // IP validation
  // ==========================================================================

  describe("IP address validation", () => {
    it("allows valid IPv4 addresses", async () => {
      const db = createMockDb({ count: 0 });
      const allowed = await checkFreeAccountIPLimit(db, "192.168.1.1");
      expect(allowed).toBe(true);
      expect(db.prepare).toHaveBeenCalled();
    });

    it("allows valid IPv6 addresses", async () => {
      const db = createMockDb({ count: 0 });
      const allowed = await checkFreeAccountIPLimit(db, "2001:db8::1");
      expect(allowed).toBe(true);
      expect(db.prepare).toHaveBeenCalled();
    });

    it("skips check for empty string IP", async () => {
      const db = createMockDb({ count: 0 });
      const allowed = await checkFreeAccountIPLimit(db, "");
      expect(allowed).toBe(true);
      expect(db.prepare).not.toHaveBeenCalled();
    });

    it("skips check for garbage IP values", async () => {
      const db = createMockDb({ count: 0 });
      const allowed = await checkFreeAccountIPLimit(db, "not-an-ip-address!");
      expect(allowed).toBe(true);
      expect(db.prepare).not.toHaveBeenCalled();
    });

    it("skips logging for invalid IP", async () => {
      const db = createMockDb();
      await logFreeAccountCreation(db, "garbage-value");
      expect(db.prepare).not.toHaveBeenCalled();
    });
  });
});
