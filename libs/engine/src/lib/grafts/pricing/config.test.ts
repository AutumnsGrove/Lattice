/**
 * Pricing Graft Configuration Tests
 *
 * Tests for tier transformation and display helpers.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  calculateAnnualSavings,
  transformTier,
  transformAllTiers,
  getDisplayPrice,
  getPriceSuffix,
  formatAnnualAsMonthly,
  getMonthlyEquivalentPrice,
  getYearlySavingsAmount,
  billingPeriodToDbFormat,
  dbFormatToBillingPeriod,
  DEFAULT_TIER_ORDER,
  DEFAULT_ANNUAL_SAVINGS,
} from "./config.js";
import { TIERS, type TierKey } from "../../config/tiers.js";
import type { PricingTier } from "./types.js";

describe("Pricing Graft Configuration", () => {
  describe("Constants", () => {
    it("exports default tier order matching TIER_ORDER", () => {
      expect(DEFAULT_TIER_ORDER).toEqual([
        "free",
        "seedling",
        "sapling",
        "oak",
        "evergreen",
      ]);
    });

    it("exports default annual savings of 15%", () => {
      expect(DEFAULT_ANNUAL_SAVINGS).toBe(15);
    });
  });

  describe("calculateAnnualSavings", () => {
    it("returns 0 for free tier (monthly price 0)", () => {
      expect(calculateAnnualSavings(0, 0)).toBe(0);
    });

    it("returns 0 for negative monthly price", () => {
      expect(calculateAnnualSavings(-5, 100)).toBe(0);
    });

    it("calculates 15% savings correctly", () => {
      // Monthly $10, Annual $102 (equivalent to $8.50/mo = 15% off)
      const savings = calculateAnnualSavings(10, 102);
      expect(savings).toBe(15);
    });

    it("calculates exact savings for seedling tier", () => {
      const seedling = TIERS.seedling;
      const savings = calculateAnnualSavings(
        seedling.pricing.monthlyPrice,
        seedling.pricing.yearlyPrice,
      );
      // Seedling: $8/mo, $81.60/yr → 15% savings
      expect(savings).toBe(15);
    });

    it("handles 0% savings (same price)", () => {
      expect(calculateAnnualSavings(10, 120)).toBe(0);
    });

    it("handles scenarios where annual is more expensive", () => {
      // If annual divided by 12 is MORE than monthly, savings would be negative
      // But we round, so let's test it
      const savings = calculateAnnualSavings(10, 130);
      expect(savings).toBeLessThan(0);
    });
  });

  describe("transformTier", () => {
    it("transforms free tier correctly", () => {
      const tier = transformTier("free", TIERS.free);

      expect(tier.key).toBe("free");
      expect(tier.name).toBe("Wanderer");
      expect(tier.standardName).toBe("Free");
      expect(tier.monthlyPrice).toBe(0);
      expect(tier.annualPrice).toBe(0);
      expect(tier.annualSavings).toBe(0);
      expect(tier.limits.posts).toBe("25");
      expect(tier.limits.storage).toBe("100 MB");
    });

    it("transforms seedling tier with correct limits", () => {
      const tier = transformTier("seedling", TIERS.seedling);

      expect(tier.key).toBe("seedling");
      expect(tier.name).toBe("Seedling");
      expect(tier.monthlyPrice).toBe(8);
      expect(tier.annualSavings).toBe(15);
      expect(tier.limits.posts).toBe("100");
    });

    it("transforms oak tier with unlimited posts", () => {
      const tier = transformTier("oak", TIERS.oak);

      expect(tier.limits.posts).toBe("Unlimited");
    });

    it("includes checkout URLs when provided", () => {
      const tier = transformTier("seedling", TIERS.seedling, {
        monthly: "https://checkout.example.com/monthly",
        annual: "https://checkout.example.com/annual",
      });

      expect(tier.checkoutUrls.monthly).toBe(
        "https://checkout.example.com/monthly",
      );
      expect(tier.checkoutUrls.annual).toBe(
        "https://checkout.example.com/annual",
      );
    });

    it("sets highlight and badge from options", () => {
      const tier = transformTier(
        "seedling",
        TIERS.seedling,
        {},
        { highlight: true, badge: "Most Popular" },
      );

      expect(tier.highlight).toBe(true);
      expect(tier.badge).toBe("Most Popular");
    });

    it("includes tier status", () => {
      const seedling = transformTier("seedling", TIERS.seedling);
      expect(seedling.status).toBe("available");
    });

    it("includes icon from display config", () => {
      const seedling = transformTier("seedling", TIERS.seedling);
      expect(seedling.icon).toBe("sprout");
    });

    it("includes feature availability", () => {
      const seedling = transformTier("seedling", TIERS.seedling);
      expect(seedling.features.blog).toBe(true);
      expect(seedling.features.customDomain).toBe(false);
    });

    it("includes feature strings for display", () => {
      const seedling = transformTier("seedling", TIERS.seedling);
      expect(seedling.featureStrings).toBeDefined();
      expect(Array.isArray(seedling.featureStrings)).toBe(true);
    });

    it("includes support level string", () => {
      const seedling = transformTier("seedling", TIERS.seedling);
      expect(seedling.supportLevel).toBeDefined();
      expect(typeof seedling.supportLevel).toBe("string");
    });
  });

  describe("transformAllTiers", () => {
    it("transforms all tiers in default order", () => {
      const tiers = transformAllTiers();

      expect(tiers).toHaveLength(5);
      expect(tiers[0].key).toBe("free");
      expect(tiers[1].key).toBe("seedling");
      expect(tiers[2].key).toBe("sapling");
      expect(tiers[3].key).toBe("oak");
      expect(tiers[4].key).toBe("evergreen");
    });

    it("applies highlightTier option", () => {
      const tiers = transformAllTiers({ highlightTier: "seedling" });

      const highlighted = tiers.filter((t) => t.highlight);
      expect(highlighted).toHaveLength(1);
      expect(highlighted[0].key).toBe("seedling");
    });

    it("applies badges option", () => {
      const tiers = transformAllTiers({
        badges: {
          seedling: "Start Here",
          oak: "Best Value",
        },
      });

      expect(tiers.find((t) => t.key === "seedling")?.badge).toBe("Start Here");
      expect(tiers.find((t) => t.key === "oak")?.badge).toBe("Best Value");
      expect(tiers.find((t) => t.key === "sapling")?.badge).toBeUndefined();
    });

    it("applies checkoutUrls option", () => {
      const tiers = transformAllTiers({
        checkoutUrls: {
          seedling: {
            monthly: "https://checkout.example.com/seedling-monthly",
          },
          sapling: { annual: "https://checkout.example.com/sapling-annual" },
        } as Record<TierKey, { monthly?: string; annual?: string }>,
      });

      expect(
        tiers.find((t) => t.key === "seedling")?.checkoutUrls.monthly,
      ).toBe("https://checkout.example.com/seedling-monthly");
      expect(tiers.find((t) => t.key === "sapling")?.checkoutUrls.annual).toBe(
        "https://checkout.example.com/sapling-annual",
      );
    });

    it("respects custom tierOrder", () => {
      const tiers = transformAllTiers({
        tierOrder: ["evergreen", "oak", "seedling"],
      });

      expect(tiers).toHaveLength(3);
      expect(tiers[0].key).toBe("evergreen");
      expect(tiers[1].key).toBe("oak");
      expect(tiers[2].key).toBe("seedling");
    });

    it("filters with includeTiers", () => {
      const tiers = transformAllTiers({
        includeTiers: ["seedling", "oak"],
      });

      expect(tiers).toHaveLength(2);
      expect(tiers.map((t) => t.key)).toEqual(["seedling", "oak"]);
    });

    it("filters with excludeTiers", () => {
      const tiers = transformAllTiers({
        excludeTiers: ["free", "evergreen"],
      });

      expect(tiers).toHaveLength(3);
      expect(tiers.map((t) => t.key)).toEqual(["seedling", "sapling", "oak"]);
    });

    it("combines includeTiers and excludeTiers", () => {
      const tiers = transformAllTiers({
        includeTiers: ["seedling", "sapling", "oak"],
        excludeTiers: ["sapling"],
      });

      expect(tiers).toHaveLength(2);
      expect(tiers.map((t) => t.key)).toEqual(["seedling", "oak"]);
    });
  });

  describe("Display Helpers", () => {
    let seedlingTier: PricingTier;
    let freeTier: PricingTier;

    beforeEach(() => {
      seedlingTier = transformTier("seedling", TIERS.seedling);
      freeTier = transformTier("free", TIERS.free);
    });

    describe("getDisplayPrice", () => {
      it("returns 'Free' for free tier", () => {
        expect(getDisplayPrice(freeTier, "monthly")).toBe("Free");
        expect(getDisplayPrice(freeTier, "annual")).toBe("Free");
      });

      it("returns monthly price for monthly period", () => {
        expect(getDisplayPrice(seedlingTier, "monthly")).toBe("$8");
      });

      it("returns rounded annual price for annual period", () => {
        const price = getDisplayPrice(seedlingTier, "annual");
        expect(price).toMatch(/^\$\d+$/);
      });
    });

    describe("getPriceSuffix", () => {
      it("returns '/mo' for monthly", () => {
        expect(getPriceSuffix("monthly")).toBe("/mo");
      });

      it("returns '/yr' for annual", () => {
        expect(getPriceSuffix("annual")).toBe("/yr");
      });
    });

    describe("formatAnnualAsMonthly", () => {
      it("formats annual price as monthly equivalent", () => {
        // $120/year = $10/month
        expect(formatAnnualAsMonthly(120)).toBe("$10.00/mo");
      });

      it("handles decimal results", () => {
        // $100/year = $8.33/month
        expect(formatAnnualAsMonthly(100)).toBe("$8.33/mo");
      });

      it("handles 0", () => {
        expect(formatAnnualAsMonthly(0)).toBe("$0.00/mo");
      });
    });

    describe("getMonthlyEquivalentPrice", () => {
      it("returns monthly price as string for monthly period", () => {
        // Seedling: $8/month
        expect(getMonthlyEquivalentPrice(seedlingTier, "monthly")).toBe("8");
      });

      it("returns monthly equivalent with 2 decimals for annual period", () => {
        // Seedling: $81.60/year ÷ 12 = $6.80/month
        const price = getMonthlyEquivalentPrice(seedlingTier, "annual");
        expect(price).toBe("6.80");
      });

      it("returns 2 decimal places for oak tier", () => {
        // Oak: $255/year ÷ 12 = $21.25/month
        const oakTier = transformTier("oak", TIERS.oak);
        const price = getMonthlyEquivalentPrice(oakTier, "annual");
        expect(price).toBe("21.25");
      });

      it("returns 2 decimal places for sapling tier", () => {
        // Sapling: $122.40/year ÷ 12 = $10.20/month
        const saplingTier = transformTier("sapling", TIERS.sapling);
        const price = getMonthlyEquivalentPrice(saplingTier, "annual");
        expect(price).toBe("10.20");
      });

      it("returns '0' for free tier monthly", () => {
        expect(getMonthlyEquivalentPrice(freeTier, "monthly")).toBe("0");
      });

      it("returns '0' for free tier annual", () => {
        // Free: $0/year ÷ 12 = $0/month (integer, so no decimals)
        expect(getMonthlyEquivalentPrice(freeTier, "annual")).toBe("0");
      });

      it("formats annual correctly for evergreen tier", () => {
        // Evergreen: $357/year ÷ 12 = $29.75/month
        const evergreenTier = transformTier("evergreen", TIERS.evergreen);
        const price = getMonthlyEquivalentPrice(evergreenTier, "annual");
        expect(price).toBe("29.75");
      });
    });

    describe("getYearlySavingsAmount", () => {
      it("calculates savings for seedling tier", () => {
        // Seedling: $8/month × 12 = $96/year, annual price $81.60
        // Savings: $96 - $81.60 = $14.40, rounds to "14"
        const savings = getYearlySavingsAmount(seedlingTier);
        expect(savings).toBe("14");
      });

      it("calculates savings for sapling tier", () => {
        // Sapling: $12/month × 12 = $144/year, annual price $122.40
        // Savings: $144 - $122.40 = $21.60, rounds to "22"
        const saplingTier = transformTier("sapling", TIERS.sapling);
        const savings = getYearlySavingsAmount(saplingTier);
        expect(savings).toBe("22");
      });

      it("calculates savings for oak tier", () => {
        // Oak: $25/month × 12 = $300/year, annual price $255
        // Savings: $300 - $255 = $45
        const oakTier = transformTier("oak", TIERS.oak);
        const savings = getYearlySavingsAmount(oakTier);
        expect(savings).toBe("45");
      });

      it("calculates savings for evergreen tier", () => {
        // Evergreen: $35/month × 12 = $420/year, annual price $357
        // Savings: $420 - $357 = $63
        const evergreenTier = transformTier("evergreen", TIERS.evergreen);
        const savings = getYearlySavingsAmount(evergreenTier);
        expect(savings).toBe("63");
      });

      it("returns '0' for free tier", () => {
        const savings = getYearlySavingsAmount(freeTier);
        expect(savings).toBe("0");
      });

      it("returns integer string without decimal places", () => {
        const savings = getYearlySavingsAmount(seedlingTier);
        expect(savings).toMatch(/^\d+$/);
        expect(savings).not.toContain(".");
      });
    });
  });

  describe("Billing Period Utilities", () => {
    describe("billingPeriodToDbFormat", () => {
      it("converts 'monthly' to 'monthly'", () => {
        expect(billingPeriodToDbFormat("monthly")).toBe("monthly");
      });

      it("converts 'annual' to 'yearly'", () => {
        expect(billingPeriodToDbFormat("annual")).toBe("yearly");
      });

      it("is type-safe for BillingPeriod input", () => {
        // TypeScript should enforce these are the only valid inputs
        const monthly: "monthly" | "annual" = "monthly";
        const annual: "monthly" | "annual" = "annual";

        expect(billingPeriodToDbFormat(monthly)).toBe("monthly");
        expect(billingPeriodToDbFormat(annual)).toBe("yearly");
      });
    });

    describe("dbFormatToBillingPeriod", () => {
      it("converts 'monthly' to 'monthly'", () => {
        expect(dbFormatToBillingPeriod("monthly")).toBe("monthly");
      });

      it("converts 'yearly' to 'annual'", () => {
        expect(dbFormatToBillingPeriod("yearly")).toBe("annual");
      });

      it("is type-safe for DbBillingCycle input", () => {
        // TypeScript should enforce these are the only valid inputs
        const monthly: "monthly" | "yearly" = "monthly";
        const yearly: "monthly" | "yearly" = "yearly";

        expect(dbFormatToBillingPeriod(monthly)).toBe("monthly");
        expect(dbFormatToBillingPeriod(yearly)).toBe("annual");
      });
    });

    describe("round-trip conversion", () => {
      it("monthly survives round-trip", () => {
        const original: "monthly" | "annual" = "monthly";
        const dbFormat = billingPeriodToDbFormat(original);
        const backToGraft = dbFormatToBillingPeriod(dbFormat);
        expect(backToGraft).toBe(original);
      });

      it("annual survives round-trip", () => {
        const original: "monthly" | "annual" = "annual";
        const dbFormat = billingPeriodToDbFormat(original);
        const backToGraft = dbFormatToBillingPeriod(dbFormat);
        expect(backToGraft).toBe(original);
      });

      it("yearly survives round-trip from db side", () => {
        const original: "monthly" | "yearly" = "yearly";
        const graftFormat = dbFormatToBillingPeriod(original);
        const backToDb = billingPeriodToDbFormat(graftFormat);
        expect(backToDb).toBe(original);
      });
    });
  });
});
