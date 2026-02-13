/**
 * Tier Configuration Tests
 *
 * Tests for the unified tier config to ensure consistency and correctness.
 */

import { describe, it, expect } from "vitest";
import {
  TIERS,
  TIER_ORDER,
  PAID_TIERS,
  getTier,
  getTierSafe,
  isValidTier,
  isPaidTier,
  getAvailableTiers,
  getTiersInOrder,
  tierHasFeature,
  getTierLimit,
  getTierRateLimits,
  formatStorage,
  formatLimit,
  getNextTier,
  getTiersWithFeature,
  type TierKey,
  type PaidTierKey,
} from "./tiers.js";

describe("Tier Configuration", () => {
  describe("TIER_ORDER", () => {
    it("defines all 5 tiers in correct order", () => {
      expect(TIER_ORDER).toHaveLength(5);
      expect(TIER_ORDER).toEqual([
        "free",
        "seedling",
        "sapling",
        "oak",
        "evergreen",
      ]);
    });
  });

  describe("PAID_TIERS", () => {
    it("defines all 4 paid tiers", () => {
      expect(PAID_TIERS).toHaveLength(4);
      expect(PAID_TIERS).toEqual(["seedling", "sapling", "oak", "evergreen"]);
    });

    it("excludes free tier", () => {
      expect(PAID_TIERS).not.toContain("free");
    });
  });

  describe("TIERS", () => {
    it("has all tiers with required fields", () => {
      for (const key of TIER_ORDER) {
        const tier = TIERS[key];
        expect(tier.id).toBe(key);
        expect(tier.order).toBeTypeOf("number");
        expect(tier.status).toMatch(
          /^(available|coming_soon|future|deprecated)$/,
        );
        expect(tier.limits).toBeDefined();
        expect(tier.features).toBeDefined();
        expect(tier.rateLimits).toBeDefined();
        expect(tier.pricing).toBeDefined();
        expect(tier.display).toBeDefined();
        expect(tier.support).toBeDefined();
      }
    });

    it("has correct order values", () => {
      expect(TIERS.free.order).toBe(0);
      expect(TIERS.seedling.order).toBe(1);
      expect(TIERS.sapling.order).toBe(2);
      expect(TIERS.oak.order).toBe(3);
      expect(TIERS.evergreen.order).toBe(4);
    });

    it("has increasing post limits", () => {
      expect(TIERS.free.limits.posts).toBe(25);
      expect(TIERS.seedling.limits.posts).toBe(100);
      expect(TIERS.sapling.limits.posts).toBe(Infinity);
      expect(TIERS.oak.limits.posts).toBe(Infinity);
      expect(TIERS.evergreen.limits.posts).toBe(Infinity);
    });

    it("has increasing storage limits", () => {
      const freeStorage = TIERS.free.limits.storage;
      const seedlingStorage = TIERS.seedling.limits.storage;
      const saplingStorage = TIERS.sapling.limits.storage;
      const oakStorage = TIERS.oak.limits.storage;
      const evergreenStorage = TIERS.evergreen.limits.storage;

      expect(freeStorage).toBe(100 * 1024 * 1024); // 100 MB
      expect(seedlingStorage).toBeGreaterThan(freeStorage);
      expect(saplingStorage).toBeGreaterThan(seedlingStorage);
      expect(oakStorage).toBeGreaterThan(saplingStorage);
      expect(evergreenStorage).toBeGreaterThan(oakStorage);
    });

    it("has draft limits for free tier and unlimited for paid", () => {
      expect(TIERS.free.limits.drafts).toBe(100);
      expect(TIERS.seedling.limits.drafts).toBe(Infinity);
      expect(TIERS.sapling.limits.drafts).toBe(Infinity);
      expect(TIERS.oak.limits.drafts).toBe(Infinity);
      expect(TIERS.evergreen.limits.drafts).toBe(Infinity);
    });

    it("has correct pricing in dollars and cents", () => {
      expect(TIERS.seedling.pricing.monthlyPrice).toBe(8);
      expect(TIERS.seedling.pricing.monthlyPriceCents).toBe(800);
      expect(TIERS.sapling.pricing.monthlyPrice).toBe(12);
      expect(TIERS.sapling.pricing.monthlyPriceCents).toBe(1200);
      expect(TIERS.oak.pricing.monthlyPrice).toBe(25);
      expect(TIERS.oak.pricing.monthlyPriceCents).toBe(2500);
      expect(TIERS.evergreen.pricing.monthlyPrice).toBe(35);
      expect(TIERS.evergreen.pricing.monthlyPriceCents).toBe(3500);
    });
  });

  describe("Helper Functions", () => {
    describe("getTier", () => {
      it("returns tier config for valid keys", () => {
        const seedling = getTier("seedling");
        expect(seedling.id).toBe("seedling");
        expect(seedling.display.name).toBe("Seedling");
      });
    });

    describe("getTierSafe", () => {
      it("returns tier config for valid keys", () => {
        const tier = getTierSafe("oak");
        expect(tier?.id).toBe("oak");
      });

      it("returns undefined for invalid keys", () => {
        const tier = getTierSafe("invalid");
        expect(tier).toBeUndefined();
      });
    });

    describe("isValidTier", () => {
      it("returns true for valid tier keys", () => {
        expect(isValidTier("free")).toBe(true);
        expect(isValidTier("seedling")).toBe(true);
        expect(isValidTier("evergreen")).toBe(true);
      });

      it("returns false for invalid keys", () => {
        expect(isValidTier("invalid")).toBe(false);
        expect(isValidTier("")).toBe(false);
      });
    });

    describe("isPaidTier", () => {
      it("returns true for paid tiers", () => {
        expect(isPaidTier("seedling")).toBe(true);
        expect(isPaidTier("sapling")).toBe(true);
        expect(isPaidTier("oak")).toBe(true);
        expect(isPaidTier("evergreen")).toBe(true);
      });

      it("returns false for free tier", () => {
        expect(isPaidTier("free")).toBe(false);
      });

      it("returns false for invalid keys", () => {
        expect(isPaidTier("invalid")).toBe(false);
      });
    });

    describe("getNextTier", () => {
      it("returns correct next tier in progression", () => {
        expect(getNextTier("free")).toBe("seedling");
        expect(getNextTier("seedling")).toBe("sapling");
        expect(getNextTier("sapling")).toBe("oak");
        expect(getNextTier("oak")).toBe("evergreen");
      });

      it("returns null for highest tier", () => {
        expect(getNextTier("evergreen")).toBeNull();
      });
    });

    describe("getTiersWithFeature", () => {
      it("returns tiers with AI feature", () => {
        const aiTiers = getTiersWithFeature("ai");
        expect(aiTiers).not.toContain("free");
        expect(aiTiers).toContain("seedling");
        expect(aiTiers).toContain("evergreen");
      });

      it("returns tiers with customDomain feature", () => {
        const domainTiers = getTiersWithFeature("customDomain");
        expect(domainTiers).not.toContain("free");
        expect(domainTiers).not.toContain("seedling");
        expect(domainTiers).not.toContain("sapling");
        expect(domainTiers).toContain("oak");
        expect(domainTiers).toContain("evergreen");
      });

      it("returns tiers with meadow feature (all tiers)", () => {
        const meadowTiers = getTiersWithFeature("meadow");
        expect(meadowTiers).toContain("free");
        expect(meadowTiers).toContain("seedling");
        expect(meadowTiers).toContain("evergreen");
      });
    });

    describe("getAvailableTiers", () => {
      it("returns only tiers with available status", () => {
        const available = getAvailableTiers();
        expect(available.every((t) => t.status === "available")).toBe(true);
      });
    });

    describe("tierHasFeature", () => {
      it("correctly checks feature availability", () => {
        expect(tierHasFeature("free", "blog")).toBe(true);
        expect(tierHasFeature("seedling", "blog")).toBe(true);
        expect(tierHasFeature("seedling", "customDomain")).toBe(false);
        expect(tierHasFeature("oak", "customDomain")).toBe(true);
      });

      it("free tier has limited features", () => {
        expect(tierHasFeature("free", "ai")).toBe(false);
        expect(tierHasFeature("free", "customDomain")).toBe(false);
        expect(tierHasFeature("free", "themeCustomizer")).toBe(false);
        expect(tierHasFeature("free", "emailForwarding")).toBe(false);
        expect(tierHasFeature("free", "shop")).toBe(false);
        expect(tierHasFeature("free", "analytics")).toBe(false);
      });

      it("free tier has blog and meadow", () => {
        expect(tierHasFeature("free", "blog")).toBe(true);
        expect(tierHasFeature("free", "meadow")).toBe(true);
      });
    });

    describe("getTierLimit", () => {
      it("returns correct limits", () => {
        expect(getTierLimit("seedling", "posts")).toBe(100);
        expect(getTierLimit("sapling", "navPages")).toBe(3);
        expect(getTierLimit("oak", "posts")).toBe(Infinity);
      });
    });

    describe("getTierRateLimits", () => {
      it("returns rate limits object", () => {
        const limits = getTierRateLimits("seedling");
        expect(limits.requests).toBeDefined();
        expect(limits.requests.limit).toBe(100);
        expect(limits.requests.windowSeconds).toBe(60);
      });
    });
  });

  describe("Wanderer (Free) Tier", () => {
    it("has correct status and pricing", () => {
      expect(TIERS.free.status).toBe("available");
      expect(TIERS.free.pricing.monthlyPrice).toBe(0);
      expect(TIERS.free.pricing.yearlyPrice).toBe(0);
    });

    it("has blog enabled with correct limits", () => {
      expect(TIERS.free.features.blog).toBe(true);
      expect(TIERS.free.limits.posts).toBe(25);
      expect(TIERS.free.limits.drafts).toBe(100);
      expect(TIERS.free.limits.storage).toBe(100 * 1024 * 1024);
      expect(TIERS.free.limits.themes).toBe(1);
    });

    it("has correct display strings", () => {
      expect(TIERS.free.display.name).toBe("Wanderer");
      expect(TIERS.free.display.standardName).toBe("Free");
      expect(TIERS.free.display.icon).toBe("footprints");
      expect(TIERS.free.display.tagline).toBe("Your first steps in the grove");
      expect(TIERS.free.display.bestFor).toBe("Trying it out");
    });

    it("has restrictive rate limits", () => {
      expect(TIERS.free.rateLimits.requests.limit).toBe(60);
      expect(TIERS.free.rateLimits.uploads.limit).toBe(5);
      expect(TIERS.free.rateLimits.ai.limit).toBe(0);
    });

    it("disables premium features", () => {
      expect(TIERS.free.features.ai).toBe(false);
      expect(TIERS.free.features.customDomain).toBe(false);
      expect(TIERS.free.features.themeCustomizer).toBe(false);
      expect(TIERS.free.features.emailForwarding).toBe(false);
      expect(TIERS.free.features.shop).toBe(false);
      expect(TIERS.free.features.analytics).toBe(false);
    });
  });

  describe("Format Functions", () => {
    describe("formatStorage", () => {
      it("formats zero as dash", () => {
        expect(formatStorage(0)).toBe("—");
      });

      it("formats infinity as Unlimited", () => {
        expect(formatStorage(Infinity)).toBe("Unlimited");
      });

      it("formats GB correctly", () => {
        expect(formatStorage(1024 * 1024 * 1024)).toBe("1 GB");
        expect(formatStorage(5 * 1024 * 1024 * 1024)).toBe("5 GB");
      });

      it("formats MB for small values", () => {
        expect(formatStorage(512 * 1024 * 1024)).toBe("512 MB");
      });
    });

    describe("formatLimit", () => {
      it("formats zero as dash", () => {
        expect(formatLimit(0)).toBe("—");
      });

      it("formats infinity as Unlimited", () => {
        expect(formatLimit(Infinity)).toBe("Unlimited");
      });

      it("formats numbers as strings", () => {
        expect(formatLimit(50)).toBe("50");
        expect(formatLimit(250)).toBe("250");
      });
    });
  });
});
