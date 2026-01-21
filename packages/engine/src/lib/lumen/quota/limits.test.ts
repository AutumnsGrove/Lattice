/**
 * Lumen Quota Limits Tests
 *
 * Tests tier-based quota calculations.
 * These tests ensure quota enforcement works correctly.
 */

import { describe, it, expect } from "vitest";
import {
  LUMEN_QUOTAS,
  getTierQuota,
  getTierQuotas,
  isTaskAvailable,
  formatQuota,
  calculateUsagePercent,
  wouldExceedQuota,
} from "./limits.js";
import type { TierKey } from "$lib/config/tiers.js";
import type { LumenTask } from "../types.js";

// =============================================================================
// QUOTA STRUCTURE
// =============================================================================

describe("Quota Structure", () => {
  const allTiers: TierKey[] = [
    "free",
    "seedling",
    "sapling",
    "oak",
    "evergreen",
  ];
  const allTasks: LumenTask[] = [
    "moderation",
    "generation",
    "summary",
    "embedding",
    "chat",
    "image",
    "code",
  ];

  it("should have quotas defined for all tiers", () => {
    for (const tier of allTiers) {
      expect(LUMEN_QUOTAS[tier]).toBeDefined();
    }
  });

  it("should have quotas for all tasks in each tier", () => {
    for (const tier of allTiers) {
      for (const task of allTasks) {
        expect(LUMEN_QUOTAS[tier][task]).toBeDefined();
        expect(typeof LUMEN_QUOTAS[tier][task]).toBe("number");
      }
    }
  });

  it("should have increasing quotas for higher tiers", () => {
    // For most tasks, higher tiers should have higher limits
    for (const task of allTasks) {
      const freeLimit = LUMEN_QUOTAS.free[task];
      const evergreenLimit = LUMEN_QUOTAS.evergreen[task];

      expect(evergreenLimit).toBeGreaterThanOrEqual(freeLimit);
    }
  });
});

// =============================================================================
// FREE TIER RESTRICTIONS
// =============================================================================

describe("Free Tier Restrictions", () => {
  it("should have no image access", () => {
    expect(getTierQuota("free", "image")).toBe(0);
  });

  it("should have no code access", () => {
    expect(getTierQuota("free", "code")).toBe(0);
  });

  it("should have limited but nonzero moderation", () => {
    const quota = getTierQuota("free", "moderation");
    expect(quota).toBeGreaterThan(0);
    expect(quota).toBeLessThan(1000);
  });

  it("should have very limited generation", () => {
    const quota = getTierQuota("free", "generation");
    expect(quota).toBeGreaterThan(0);
    expect(quota).toBeLessThanOrEqual(20);
  });
});

// =============================================================================
// EVERGREEN TIER BENEFITS
// =============================================================================

describe("Evergreen Tier Benefits", () => {
  it("should have unlimited moderation", () => {
    expect(getTierQuota("evergreen", "moderation")).toBe(Infinity);
  });

  it("should have highest limits for all tasks", () => {
    const tasks: LumenTask[] = [
      "generation",
      "summary",
      "embedding",
      "chat",
      "image",
      "code",
    ];

    for (const task of tasks) {
      const evergreenQuota = getTierQuota("evergreen", task);
      const oakQuota = getTierQuota("oak", task);

      expect(evergreenQuota).toBeGreaterThanOrEqual(oakQuota);
    }
  });
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

describe("getTierQuota", () => {
  it("should return correct quota for valid tier and task", () => {
    expect(getTierQuota("seedling", "generation")).toBe(100);
    expect(getTierQuota("oak", "chat")).toBe(1000);
  });

  it("should return 0 for invalid tier", () => {
    expect(getTierQuota("invalid" as TierKey, "generation")).toBe(0);
  });
});

describe("getTierQuotas", () => {
  it("should return all quotas for a tier", () => {
    const quotas = getTierQuotas("seedling");

    expect(quotas.moderation).toBe(1000);
    expect(quotas.generation).toBe(100);
    expect(quotas.summary).toBe(100);
    expect(quotas.embedding).toBe(500);
    expect(quotas.chat).toBe(50);
    expect(quotas.image).toBe(10);
    expect(quotas.code).toBe(10);
  });

  it("should return free tier quotas for invalid tier", () => {
    const quotas = getTierQuotas("invalid" as TierKey);
    expect(quotas).toEqual(LUMEN_QUOTAS.free);
  });
});

describe("isTaskAvailable", () => {
  it("should return true when quota > 0", () => {
    expect(isTaskAvailable("seedling", "generation")).toBe(true);
    expect(isTaskAvailable("free", "moderation")).toBe(true);
  });

  it("should return false when quota is 0", () => {
    expect(isTaskAvailable("free", "image")).toBe(false);
    expect(isTaskAvailable("free", "code")).toBe(false);
  });

  it("should return true for unlimited quotas", () => {
    expect(isTaskAvailable("evergreen", "moderation")).toBe(true);
  });
});

describe("formatQuota", () => {
  it("should format zero as 'Not available'", () => {
    expect(formatQuota(0)).toBe("Not available");
  });

  it("should format infinity as 'Unlimited'", () => {
    expect(formatQuota(Infinity)).toBe("Unlimited");
  });

  it("should format numbers with locale and '/ day'", () => {
    expect(formatQuota(100)).toBe("100 / day");
    expect(formatQuota(1000)).toBe("1,000 / day");
    expect(formatQuota(10000)).toBe("10,000 / day");
  });
});

describe("calculateUsagePercent", () => {
  it("should calculate percentage correctly", () => {
    expect(calculateUsagePercent(50, 100)).toBe(50);
    expect(calculateUsagePercent(25, 100)).toBe(25);
    expect(calculateUsagePercent(75, 100)).toBe(75);
  });

  it("should return 100 for zero limit", () => {
    expect(calculateUsagePercent(0, 0)).toBe(100);
    expect(calculateUsagePercent(5, 0)).toBe(100);
  });

  it("should return 0 for unlimited", () => {
    expect(calculateUsagePercent(0, Infinity)).toBe(0);
    expect(calculateUsagePercent(10000, Infinity)).toBe(0);
  });

  it("should cap at 100%", () => {
    expect(calculateUsagePercent(150, 100)).toBe(100);
  });

  it("should round to nearest integer", () => {
    expect(calculateUsagePercent(33, 100)).toBe(33);
    expect(calculateUsagePercent(1, 3)).toBe(33); // 33.33...
  });
});

describe("wouldExceedQuota", () => {
  it("should return false when under limit", () => {
    expect(wouldExceedQuota(50, 100)).toBe(false);
    expect(wouldExceedQuota(99, 100)).toBe(false);
  });

  it("should return true when at limit", () => {
    expect(wouldExceedQuota(100, 100)).toBe(true);
  });

  it("should return true when over limit", () => {
    expect(wouldExceedQuota(101, 100)).toBe(true);
  });

  it("should account for request count", () => {
    expect(wouldExceedQuota(95, 100, 5)).toBe(false); // 95 + 5 = 100, not exceeded
    expect(wouldExceedQuota(96, 100, 5)).toBe(true); // 96 + 5 = 101, exceeded
  });

  it("should never exceed for unlimited", () => {
    expect(wouldExceedQuota(0, Infinity)).toBe(false);
    expect(wouldExceedQuota(999999, Infinity)).toBe(false);
    expect(wouldExceedQuota(999999, Infinity, 1000)).toBe(false);
  });
});
