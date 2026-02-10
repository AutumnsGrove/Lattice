/**
 * Billing Module Tests
 *
 * Tests for subscription status checking and feature access control.
 * Covers:
 * - getTenantSubscription: Retrieves tenant subscription tier and billing status
 * - checkFeatureAccess: Validates feature access based on subscription tier
 * - requireActiveSubscription: Enforces active subscription requirement
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import type { D1Database } from "@cloudflare/workers-types";
import {
  getTenantSubscription,
  checkFeatureAccess,
  requireActiveSubscription,
  type SubscriptionStatus,
} from "./billing";

/**
 * Mock D1 Database Helper
 * Creates a mock D1 database with chainable prepare/bind/first pattern
 */
function createMockDb(): D1Database {
  return {
    prepare: vi.fn().mockReturnThis(),
    bind: vi.fn().mockReturnThis(),
    first: vi.fn(),
  } as unknown as D1Database;
}

describe("Billing Module", () => {
  let mockDb: D1Database;

  beforeEach(() => {
    mockDb = createMockDb();
    vi.clearAllMocks();
  });

  // ==========================================================================
  // getTenantSubscription Tests
  // ==========================================================================

  describe("getTenantSubscription", () => {
    it("returns null when tenant not found", async () => {
      const db = createMockDb();
      (db.prepare as any).mockReturnThis();
      (db.bind as any).mockReturnThis();
      (db.first as any).mockResolvedValueOnce(null);

      const result = await getTenantSubscription(db, "nonexistent-tenant");

      expect(result).toBeNull();
    });

    it("returns subscription with free tier when no plan specified", async () => {
      const db = createMockDb();
      const prepareChain = {
        bind: vi.fn().mockReturnThis(),
        first: vi
          .fn()
          .mockResolvedValueOnce({ plan: null, active: 1 })
          .mockResolvedValueOnce(null),
      };
      (db.prepare as any).mockReturnValue(prepareChain);

      const result = await getTenantSubscription(db, "tenant-1");

      expect(result?.tier).toBe("free");
      expect(result?.status).toBeUndefined();
      expect(result?.isActive).toBe(true);
      expect(result?.currentPeriodEnd).toBeNull();
    });

    it("returns subscription with seedling tier from tenant plan", async () => {
      const db = createMockDb();
      const prepareChain = {
        bind: vi.fn().mockReturnThis(),
        first: vi
          .fn()
          .mockResolvedValueOnce({ plan: "seedling", active: 1 })
          .mockResolvedValueOnce(null),
      };
      (db.prepare as any).mockReturnValue(prepareChain);

      const result = await getTenantSubscription(db, "tenant-1");

      expect(result?.tier).toBe("seedling");
      expect(result?.status).toBeUndefined();
      expect(result?.isActive).toBe(true);
    });

    it("handles free tier (no billing record)", async () => {
      const db = createMockDb();
      const prepareChain = {
        bind: vi.fn().mockReturnThis(),
        first: vi
          .fn()
          .mockResolvedValueOnce({ plan: "free", active: 1 })
          .mockResolvedValueOnce(null),
      };
      (db.prepare as any).mockReturnValue(prepareChain);

      const result = await getTenantSubscription(db, "tenant-1");

      expect(result?.tier).toBe("free");
      expect(result?.isActive).toBe(true); // Active even without billing
    });

    it("sets isActive=true when tenant.active=1 and status=active", async () => {
      const db = createMockDb();
      const prepareChain = {
        bind: vi.fn().mockReturnThis(),
        first: vi
          .fn()
          .mockResolvedValueOnce({ plan: "seedling", active: 1 })
          .mockResolvedValueOnce({
            status: "active",
            current_period_end: 1000,
          }),
      };
      (db.prepare as any).mockReturnValue(prepareChain);

      const result = await getTenantSubscription(db, "tenant-1");

      expect(result?.isActive).toBe(true);
      expect(result?.status).toBe("active");
    });

    it("sets isActive=false when tenant.active=0", async () => {
      const db = createMockDb();
      const prepareChain = {
        bind: vi.fn().mockReturnThis(),
        first: vi
          .fn()
          .mockResolvedValueOnce({ plan: "seedling", active: 0 })
          .mockResolvedValueOnce({
            status: "active",
            current_period_end: 1000,
          }),
      };
      (db.prepare as any).mockReturnValue(prepareChain);

      const result = await getTenantSubscription(db, "tenant-1");

      expect(result?.isActive).toBe(false);
    });

    it("sets isActive=false when status=past_due", async () => {
      const db = createMockDb();
      const prepareChain = {
        bind: vi.fn().mockReturnThis(),
        first: vi
          .fn()
          .mockResolvedValueOnce({ plan: "seedling", active: 1 })
          .mockResolvedValueOnce({
            status: "past_due",
            current_period_end: 1000,
          }),
      };
      (db.prepare as any).mockReturnValue(prepareChain);

      const result = await getTenantSubscription(db, "tenant-1");

      expect(result?.isActive).toBe(false);
      expect(result?.status).toBe("past_due");
    });

    it("sets isActive=false when status=canceled", async () => {
      const db = createMockDb();
      const prepareChain = {
        bind: vi.fn().mockReturnThis(),
        first: vi
          .fn()
          .mockResolvedValueOnce({ plan: "seedling", active: 1 })
          .mockResolvedValueOnce({
            status: "canceled",
            current_period_end: null,
          }),
      };
      (db.prepare as any).mockReturnValue(prepareChain);

      const result = await getTenantSubscription(db, "tenant-1");

      expect(result?.isActive).toBe(false);
      expect(result?.status).toBe("canceled");
    });

    it("sets isActive=false when status=unpaid", async () => {
      const db = createMockDb();
      const prepareChain = {
        bind: vi.fn().mockReturnThis(),
        first: vi
          .fn()
          .mockResolvedValueOnce({ plan: "seedling", active: 1 })
          .mockResolvedValueOnce({
            status: "unpaid",
            current_period_end: 1000,
          }),
      };
      (db.prepare as any).mockReturnValue(prepareChain);

      const result = await getTenantSubscription(db, "tenant-1");

      expect(result?.isActive).toBe(false);
      expect(result?.status).toBe("unpaid");
    });

    it("sets isActive=false when status=paused", async () => {
      const db = createMockDb();
      const prepareChain = {
        bind: vi.fn().mockReturnThis(),
        first: vi
          .fn()
          .mockResolvedValueOnce({ plan: "seedling", active: 1 })
          .mockResolvedValueOnce({
            status: "paused",
            current_period_end: 1000,
          }),
      };
      (db.prepare as any).mockReturnValue(prepareChain);

      const result = await getTenantSubscription(db, "tenant-1");

      // paused is not in the active list, so isActive should be false
      expect(result?.isActive).toBe(false);
      expect(result?.status).toBe("paused");
    });

    it("returns currentPeriodEnd from billing record", async () => {
      const db = createMockDb();
      const futureTimestamp = Math.floor(Date.now() / 1000) + 86400 * 30; // 30 days from now
      const prepareChain = {
        bind: vi.fn().mockReturnThis(),
        first: vi
          .fn()
          .mockResolvedValueOnce({ plan: "seedling", active: 1 })
          .mockResolvedValueOnce({
            status: "active",
            current_period_end: futureTimestamp,
          }),
      };
      (db.prepare as any).mockReturnValue(prepareChain);

      const result = await getTenantSubscription(db, "tenant-1");

      expect(result?.currentPeriodEnd).toBe(futureTimestamp);
    });

    it("returns currentPeriodEnd=null when no billing record", async () => {
      const db = createMockDb();
      const prepareChain = {
        bind: vi.fn().mockReturnThis(),
        first: vi
          .fn()
          .mockResolvedValueOnce({ plan: "free", active: 1 })
          .mockResolvedValueOnce(null),
      };
      (db.prepare as any).mockReturnValue(prepareChain);

      const result = await getTenantSubscription(db, "tenant-1");

      expect(result?.currentPeriodEnd).toBeNull();
    });

    it("queries tenants table with correct SQL", async () => {
      const db = createMockDb();
      const bindFn = vi.fn().mockReturnThis();
      const prepareChain = {
        bind: bindFn,
        first: vi
          .fn()
          .mockResolvedValueOnce({ plan: "seedling", active: 1 })
          .mockResolvedValueOnce(null),
      };
      (db.prepare as any).mockReturnValue(prepareChain);

      await getTenantSubscription(db, "tenant-123");

      // Verify first query was to tenants table
      const calls = (db.prepare as any).mock.calls;
      expect(calls[0][0]).toContain("tenants");
      expect(calls[0][0]).toContain(
        "SELECT plan, active FROM tenants WHERE id = ?",
      );

      // Verify bind was called with tenant ID
      expect(bindFn).toHaveBeenCalledWith("tenant-123");
    });

    it("queries platform_billing table with correct SQL", async () => {
      const db = createMockDb();
      const prepareChain = {
        bind: vi.fn().mockReturnThis(),
        first: vi
          .fn()
          .mockResolvedValueOnce({ plan: "seedling", active: 1 })
          .mockResolvedValueOnce({
            status: "active",
            current_period_end: 1000,
          }),
      };
      (db.prepare as any).mockReturnValue(prepareChain);

      await getTenantSubscription(db, "tenant-456");

      // Verify second query was to platform_billing
      const calls = (db.prepare as any).mock.calls;
      expect(calls[1][0]).toContain("platform_billing");
      expect(calls[1][0]).toContain(
        "SELECT status, current_period_end FROM platform_billing WHERE tenant_id = ?",
      );
    });

    it("handles all valid tier keys", async () => {
      const validTiers = ["free", "seedling", "sapling", "oak", "evergreen"];

      for (const tier of validTiers) {
        const db = createMockDb();
        const prepareChain = {
          bind: vi.fn().mockReturnThis(),
          first: vi
            .fn()
            .mockResolvedValueOnce({ plan: tier, active: 1 })
            .mockResolvedValueOnce(null),
        };
        (db.prepare as any).mockReturnValue(prepareChain);

        const result = await getTenantSubscription(db, "tenant-1");

        expect(result?.tier).toBe(tier);
      }
    });
  });

  // ==========================================================================
  // checkFeatureAccess Tests
  // ==========================================================================

  describe("checkFeatureAccess", () => {
    it("returns allowed=false with 'Tenant not found' reason when tenant doesn't exist", async () => {
      const db = createMockDb();
      const prepareChain = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValueOnce(null),
      };
      (db.prepare as any).mockReturnValue(prepareChain);

      const result = await checkFeatureAccess(db, "nonexistent", "ai");

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("Tenant not found");
    });

    it("returns allowed=false when subscription inactive", async () => {
      const db = createMockDb();
      const prepareChain = {
        bind: vi.fn().mockReturnThis(),
        first: vi
          .fn()
          .mockResolvedValueOnce({ plan: "seedling", active: 0 })
          .mockResolvedValueOnce({
            status: "active",
            current_period_end: 1000,
          }),
      };
      (db.prepare as any).mockReturnValue(prepareChain);

      const result = await checkFeatureAccess(db, "tenant-1", "ai");

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("Subscription inactive or suspended");
    });

    it("returns allowed=false when billing status=canceled", async () => {
      const db = createMockDb();
      const prepareChain = {
        bind: vi.fn().mockReturnThis(),
        first: vi
          .fn()
          .mockResolvedValueOnce({ plan: "seedling", active: 1 })
          .mockResolvedValueOnce({
            status: "canceled",
            current_period_end: null,
          }),
      };
      (db.prepare as any).mockReturnValue(prepareChain);

      const result = await checkFeatureAccess(db, "tenant-1", "ai");

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("Subscription inactive or suspended");
    });

    it("returns allowed=false when tier insufficient for feature", async () => {
      const db = createMockDb();
      const prepareChain = {
        bind: vi.fn().mockReturnThis(),
        first: vi
          .fn()
          .mockResolvedValueOnce({ plan: "free", active: 1 })
          .mockResolvedValueOnce(null),
      };
      (db.prepare as any).mockReturnValue(prepareChain);

      const result = await checkFeatureAccess(db, "tenant-1", "ai");

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("Feature requires");
    });

    it("returns allowed=false with reason for custom_domain on seedling", async () => {
      const db = createMockDb();
      const prepareChain = {
        bind: vi.fn().mockReturnThis(),
        first: vi
          .fn()
          .mockResolvedValueOnce({ plan: "seedling", active: 1 })
          .mockResolvedValueOnce({
            status: "active",
            current_period_end: 1000,
          }),
      };
      (db.prepare as any).mockReturnValue(prepareChain);

      const result = await checkFeatureAccess(db, "tenant-1", "custom_domain");

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("Feature requires");
    });

    it("returns allowed=true for unknown features", async () => {
      const db = createMockDb();
      const prepareChain = {
        bind: vi.fn().mockReturnThis(),
        first: vi
          .fn()
          .mockResolvedValueOnce({ plan: "free", active: 1 })
          .mockResolvedValueOnce(null),
      };
      (db.prepare as any).mockReturnValue(prepareChain);

      // Cast to bypass type checking for invalid feature test
      const result = await checkFeatureAccess(
        db,
        "tenant-1",
        "unknown_feature" as any,
      );

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it("returns allowed=true when tier meets requirement for ai", async () => {
      const db = createMockDb();
      const prepareChain = {
        bind: vi.fn().mockReturnThis(),
        first: vi
          .fn()
          .mockResolvedValueOnce({ plan: "seedling", active: 1 })
          .mockResolvedValueOnce({
            status: "active",
            current_period_end: 1000,
          }),
      };
      (db.prepare as any).mockReturnValue(prepareChain);

      const result = await checkFeatureAccess(db, "tenant-1", "ai");

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it("returns allowed=true when tier meets requirement for shop", async () => {
      const db = createMockDb();
      const prepareChain = {
        bind: vi.fn().mockReturnThis(),
        first: vi
          .fn()
          .mockResolvedValueOnce({ plan: "sapling", active: 1 })
          .mockResolvedValueOnce({
            status: "active",
            current_period_end: 1000,
          }),
      };
      (db.prepare as any).mockReturnValue(prepareChain);

      const result = await checkFeatureAccess(db, "tenant-1", "shop");

      expect(result.allowed).toBe(true);
    });

    it("returns allowed=true when tier meets requirement for custom_domain", async () => {
      const db = createMockDb();
      const prepareChain = {
        bind: vi.fn().mockReturnThis(),
        first: vi
          .fn()
          .mockResolvedValueOnce({ plan: "oak", active: 1 })
          .mockResolvedValueOnce({
            status: "active",
            current_period_end: 1000,
          }),
      };
      (db.prepare as any).mockReturnValue(prepareChain);

      const result = await checkFeatureAccess(db, "tenant-1", "custom_domain");

      expect(result.allowed).toBe(true);
    });

    it("returns allowed=true when tier meets requirement for analytics", async () => {
      const db = createMockDb();
      const prepareChain = {
        bind: vi.fn().mockReturnThis(),
        first: vi
          .fn()
          .mockResolvedValueOnce({ plan: "oak", active: 1 })
          .mockResolvedValueOnce({
            status: "active",
            current_period_end: 1000,
          }),
      };
      (db.prepare as any).mockReturnValue(prepareChain);

      const result = await checkFeatureAccess(db, "tenant-1", "analytics");

      expect(result.allowed).toBe(true);
    });

    it("returns allowed=true when tier meets requirement for email_forwarding", async () => {
      const db = createMockDb();
      const prepareChain = {
        bind: vi.fn().mockReturnThis(),
        first: vi
          .fn()
          .mockResolvedValueOnce({ plan: "sapling", active: 1 })
          .mockResolvedValueOnce({
            status: "active",
            current_period_end: 1000,
          }),
      };
      (db.prepare as any).mockReturnValue(prepareChain);

      const result = await checkFeatureAccess(
        db,
        "tenant-1",
        "email_forwarding",
      );

      expect(result.allowed).toBe(true);
    });

    it("returns allowed=true for evergreen tier on all features", async () => {
      const features = [
        "ai",
        "shop",
        "custom_domain",
        "analytics",
        "email_forwarding",
      ] as const;

      for (const feature of features) {
        const db = createMockDb();
        const prepareChain = {
          bind: vi.fn().mockReturnThis(),
          first: vi
            .fn()
            .mockResolvedValueOnce({ plan: "evergreen", active: 1 })
            .mockResolvedValueOnce({
              status: "active",
              current_period_end: 1000,
            }),
        };
        (db.prepare as any).mockReturnValue(prepareChain);

        const result = await checkFeatureAccess(db, "tenant-1", feature);

        expect(result.allowed).toBe(true);
      }
    });

    it("returns allowed=false for free tier on all premium features", async () => {
      const features = [
        "ai",
        "shop",
        "custom_domain",
        "analytics",
        "email_forwarding",
      ] as const;

      for (const feature of features) {
        const db = createMockDb();
        const prepareChain = {
          bind: vi.fn().mockReturnThis(),
          first: vi
            .fn()
            .mockResolvedValueOnce({ plan: "free", active: 1 })
            .mockResolvedValueOnce(null),
        };
        (db.prepare as any).mockReturnValue(prepareChain);

        const result = await checkFeatureAccess(db, "tenant-1", feature);

        expect(result.allowed).toBe(false);
      }
    });

    it("includes tier name in reason when access denied", async () => {
      const db = createMockDb();
      const prepareChain = {
        bind: vi.fn().mockReturnThis(),
        first: vi
          .fn()
          .mockResolvedValueOnce({ plan: "free", active: 1 })
          .mockResolvedValueOnce(null),
      };
      (db.prepare as any).mockReturnValue(prepareChain);

      const result = await checkFeatureAccess(db, "tenant-1", "custom_domain");

      // Should mention oak since custom_domain requires oak or higher
      expect(result.reason).toContain("oak");
    });
  });

  // ==========================================================================
  // requireActiveSubscription Tests
  // ==========================================================================

  describe("requireActiveSubscription", () => {
    it("throws 'Tenant not found' when tenant doesn't exist", async () => {
      const db = createMockDb();
      const prepareChain = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValueOnce(null),
      };
      (db.prepare as any).mockReturnValue(prepareChain);

      await expect(
        requireActiveSubscription(db, "nonexistent-tenant"),
      ).rejects.toThrow("Tenant not found");
    });

    it("throws 'Subscription inactive' when tenant not active", async () => {
      const db = createMockDb();
      const prepareChain = {
        bind: vi.fn().mockReturnThis(),
        first: vi
          .fn()
          .mockResolvedValueOnce({ plan: "seedling", active: 0 })
          .mockResolvedValueOnce({
            status: "active",
            current_period_end: 1000,
          }),
      };
      (db.prepare as any).mockReturnValue(prepareChain);

      await expect(requireActiveSubscription(db, "tenant-1")).rejects.toThrow(
        "Subscription inactive",
      );
    });

    it("throws 'Subscription inactive' when billing canceled", async () => {
      const db = createMockDb();
      const prepareChain = {
        bind: vi.fn().mockReturnThis(),
        first: vi
          .fn()
          .mockResolvedValueOnce({ plan: "seedling", active: 1 })
          .mockResolvedValueOnce({
            status: "canceled",
            current_period_end: null,
          }),
      };
      (db.prepare as any).mockReturnValue(prepareChain);

      await expect(requireActiveSubscription(db, "tenant-1")).rejects.toThrow(
        "Subscription inactive",
      );
    });

    it("throws 'Subscription inactive' when billing past_due", async () => {
      const db = createMockDb();
      const prepareChain = {
        bind: vi.fn().mockReturnThis(),
        first: vi
          .fn()
          .mockResolvedValueOnce({ plan: "seedling", active: 1 })
          .mockResolvedValueOnce({
            status: "past_due",
            current_period_end: 1000,
          }),
      };
      (db.prepare as any).mockReturnValue(prepareChain);

      await expect(requireActiveSubscription(db, "tenant-1")).rejects.toThrow(
        "Subscription inactive",
      );
    });

    it("succeeds silently for active subscription", async () => {
      const db = createMockDb();
      const prepareChain = {
        bind: vi.fn().mockReturnThis(),
        first: vi
          .fn()
          .mockResolvedValueOnce({ plan: "seedling", active: 1 })
          .mockResolvedValueOnce({
            status: "active",
            current_period_end: 1000,
          }),
      };
      (db.prepare as any).mockReturnValue(prepareChain);

      await expect(
        requireActiveSubscription(db, "tenant-1"),
      ).resolves.toBeUndefined();
    });

    it("succeeds silently for free tier with no billing", async () => {
      const db = createMockDb();
      const prepareChain = {
        bind: vi.fn().mockReturnThis(),
        first: vi
          .fn()
          .mockResolvedValueOnce({ plan: "free", active: 1 })
          .mockResolvedValueOnce(null),
      };
      (db.prepare as any).mockReturnValue(prepareChain);

      await expect(
        requireActiveSubscription(db, "tenant-1"),
      ).resolves.toBeUndefined();
    });

    it("throws Error (not custom exception) for consistency", async () => {
      const db = createMockDb();
      const prepareChain = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValueOnce(null),
      };
      (db.prepare as any).mockReturnValue(prepareChain);

      try {
        await requireActiveSubscription(db, "nonexistent");
        fail("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(Error);
        expect((err as Error).message).toBe("Tenant not found");
      }
    });
  });

  // ==========================================================================
  // Integration Tests
  // ==========================================================================

  describe("Integration scenarios", () => {
    it("handles complete subscription lifecycle: free -> active -> inactive", async () => {
      // Start with free tier
      let db = createMockDb();
      let prepareChain: any = {
        bind: vi.fn().mockReturnThis(),
        first: vi
          .fn()
          .mockResolvedValueOnce({ plan: "free", active: 1 })
          .mockResolvedValueOnce(null),
      };
      (db.prepare as any).mockReturnValue(prepareChain);

      let result = await getTenantSubscription(db, "tenant-1");
      expect(result?.isActive).toBe(true);

      // Upgrade to paid and activate (create fresh db with new mocks)
      db = createMockDb();
      const prepareChain2: any = {
        bind: vi.fn().mockReturnThis(),
        first: vi
          .fn()
          .mockResolvedValueOnce({ plan: "seedling", active: 1 })
          .mockResolvedValueOnce({
            status: "active",
            current_period_end: 9999999,
          }),
      };
      (db.prepare as any).mockReturnValue(prepareChain2);

      result = await getTenantSubscription(db, "tenant-1");
      expect(result?.isActive).toBe(true);
      expect(result?.tier).toBe("seedling");

      // Subscription cancelled (create fresh db with new mocks)
      db = createMockDb();
      const prepareChain3: any = {
        bind: vi.fn().mockReturnThis(),
        first: vi
          .fn()
          .mockResolvedValueOnce({ plan: "seedling", active: 1 })
          .mockResolvedValueOnce({
            status: "canceled",
            current_period_end: null,
          }),
      };
      (db.prepare as any).mockReturnValue(prepareChain3);

      result = await getTenantSubscription(db, "tenant-1");
      expect(result?.isActive).toBe(false);
    });

    it("correctly blocks feature access during cancellation flow", async () => {
      const db = createMockDb();
      const prepareChain = {
        bind: vi.fn().mockReturnThis(),
        first: vi
          .fn()
          .mockResolvedValueOnce({ plan: "oak", active: 1 })
          .mockResolvedValueOnce({
            status: "canceled",
            current_period_end: null,
          }),
      };
      (db.prepare as any).mockReturnValue(prepareChain);

      const result = await checkFeatureAccess(db, "tenant-1", "custom_domain");

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("Subscription inactive or suspended");
    });

    it("correctly blocks feature access when account suspended", async () => {
      const db = createMockDb();
      const prepareChain = {
        bind: vi.fn().mockReturnThis(),
        first: vi
          .fn()
          .mockResolvedValueOnce({ plan: "oak", active: 0 })
          .mockResolvedValueOnce({
            status: "active",
            current_period_end: 9999999,
          }),
      };
      (db.prepare as any).mockReturnValue(prepareChain);

      const result = await checkFeatureAccess(db, "tenant-1", "custom_domain");

      expect(result.allowed).toBe(false);
    });

    it("all functions work with sapling tier for email_forwarding", async () => {
      // getTenantSubscription
      let db = createMockDb();
      let prepareChain: any = {
        bind: vi.fn().mockReturnThis(),
        first: vi
          .fn()
          .mockResolvedValueOnce({ plan: "sapling", active: 1 })
          .mockResolvedValueOnce({
            status: "active",
            current_period_end: 9999999,
          }),
      };
      (db.prepare as any).mockReturnValue(prepareChain);

      const subscription = await getTenantSubscription(db, "tenant-1");
      expect(subscription?.tier).toBe("sapling");
      expect(subscription?.isActive).toBe(true);

      // checkFeatureAccess (fresh db)
      db = createMockDb();
      prepareChain = {
        bind: vi.fn().mockReturnThis(),
        first: vi
          .fn()
          .mockResolvedValueOnce({ plan: "sapling", active: 1 })
          .mockResolvedValueOnce({
            status: "active",
            current_period_end: 9999999,
          }),
      };
      (db.prepare as any).mockReturnValue(prepareChain);

      const access = await checkFeatureAccess(
        db,
        "tenant-1",
        "email_forwarding",
      );
      expect(access.allowed).toBe(true);

      // requireActiveSubscription (fresh db)
      db = createMockDb();
      prepareChain = {
        bind: vi.fn().mockReturnThis(),
        first: vi
          .fn()
          .mockResolvedValueOnce({ plan: "sapling", active: 1 })
          .mockResolvedValueOnce({
            status: "active",
            current_period_end: 9999999,
          }),
      };
      (db.prepare as any).mockReturnValue(prepareChain);

      await expect(
        requireActiveSubscription(db, "tenant-1"),
      ).resolves.not.toThrow();
    });
  });

  // ==========================================================================
  // Edge Cases and Error Scenarios
  // ==========================================================================

  describe("Edge cases", () => {
    it("handles null billing.status gracefully", async () => {
      const db = createMockDb();
      const prepareChain = {
        bind: vi.fn().mockReturnThis(),
        first: vi
          .fn()
          .mockResolvedValueOnce({ plan: "seedling", active: 1 })
          .mockResolvedValueOnce({ status: null, current_period_end: null }),
      };
      (db.prepare as any).mockReturnValue(prepareChain);

      const result = await getTenantSubscription(db, "tenant-1");

      expect(result?.status).toBeNull();
      expect(result?.isActive).toBe(false); // No billing status = not active
    });

    it("handles zero timestamp in current_period_end (treated as null due to || operator)", async () => {
      const db = createMockDb();
      const prepareChain = {
        bind: vi.fn().mockReturnThis(),
        first: vi
          .fn()
          .mockResolvedValueOnce({ plan: "seedling", active: 1 })
          .mockResolvedValueOnce({
            status: "active",
            current_period_end: 0,
          }),
      };
      (db.prepare as any).mockReturnValue(prepareChain);

      const result = await getTenantSubscription(db, "tenant-1");

      // Code uses: billing?.current_period_end || null
      // So 0 (falsy) becomes null
      expect(result?.currentPeriodEnd).toBeNull();
    });

    it("handles very large timestamp values", async () => {
      const db = createMockDb();
      const largeTimestamp = Number.MAX_SAFE_INTEGER;
      const prepareChain = {
        bind: vi.fn().mockReturnThis(),
        first: vi
          .fn()
          .mockResolvedValueOnce({ plan: "seedling", active: 1 })
          .mockResolvedValueOnce({
            status: "active",
            current_period_end: largeTimestamp,
          }),
      };
      (db.prepare as any).mockReturnValue(prepareChain);

      const result = await getTenantSubscription(db, "tenant-1");

      expect(result?.currentPeriodEnd).toBe(largeTimestamp);
    });

    it("distinguishes between undefined and null in plan field", async () => {
      const db = createMockDb();
      const prepareChain = {
        bind: vi.fn().mockReturnThis(),
        first: vi
          .fn()
          .mockResolvedValueOnce({ plan: undefined, active: 1 })
          .mockResolvedValueOnce(null),
      };
      (db.prepare as any).mockReturnValue(prepareChain);

      const result = await getTenantSubscription(db, "tenant-1");

      // Undefined should be treated as free tier (via || operator)
      expect(result?.tier).toBe("free");
    });

    it("handles active field as number (database representation)", async () => {
      const db = createMockDb();
      const prepareChain = {
        bind: vi.fn().mockReturnThis(),
        first: vi
          .fn()
          .mockResolvedValueOnce({ plan: "seedling", active: 1 }) // Active = 1
          .mockResolvedValueOnce({
            status: "active",
            current_period_end: 1000,
          }),
      };
      (db.prepare as any).mockReturnValue(prepareChain);

      const result = await getTenantSubscription(db, "tenant-1");
      expect(result?.isActive).toBe(true);

      // Test inactive case
      const db2 = createMockDb();
      const prepareChain2 = {
        bind: vi.fn().mockReturnThis(),
        first: vi
          .fn()
          .mockResolvedValueOnce({ plan: "seedling", active: 0 }) // Inactive = 0
          .mockResolvedValueOnce({
            status: "active",
            current_period_end: 1000,
          }),
      };
      (db2.prepare as any).mockReturnValue(prepareChain2);

      const result2 = await getTenantSubscription(db2, "tenant-1");
      expect(result2?.isActive).toBe(false);
    });
  });
});
