/**
 * Pricing Graft Configuration Tests
 *
 * Tests for pricing transformation, display helpers, and billing period conversion.
 */

import { describe, it, expect } from "vitest";
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
	DEFAULT_ANNUAL_SAVINGS,
	DEFAULT_TIER_ORDER,
} from "./config";
import { TIERS } from "../../config/tiers";
import type { PricingTier } from "./types";

// ===
// TEST HELPERS
// ===

function makeTier(overrides: Partial<PricingTier> = {}): PricingTier {
	return {
		key: "seedling",
		name: "Seedling",
		tagline: "Test",
		icon: "sprout",
		status: "available",
		bestFor: "testing",
		monthlyPrice: 10,
		annualPrice: 102,
		annualSavings: 15,
		limits: {
			posts: "Unlimited",
			storage: "1 GB",
			themes: "3 themes",
			navPages: "5",
			commentsPerWeek: "50/week",
		},
		features: {} as any,
		featureStrings: [],
		supportLevel: "Email",
		checkoutUrls: {},
		...overrides,
	};
}

// ===
// calculateAnnualSavings TESTS
// ===

describe("calculateAnnualSavings", () => {
	it("calculates 15% savings for 10 monthly vs 102 annual", () => {
		const savings = calculateAnnualSavings(10, 102);
		expect(savings).toBe(15);
	});

	it("returns 0 savings when annual equals monthly * 12", () => {
		const savings = calculateAnnualSavings(10, 120);
		expect(savings).toBe(0);
	});

	it("returns 0 savings for free tier", () => {
		const savings = calculateAnnualSavings(0, 0);
		expect(savings).toBe(0);
	});

	it("calculates 50% savings for 20 monthly vs 120 annual", () => {
		const savings = calculateAnnualSavings(20, 120);
		expect(savings).toBe(50);
	});

	it("rounds to nearest percentage", () => {
		const savings = calculateAnnualSavings(10, 101);
		expect(typeof savings).toBe("number");
		expect(savings).toBeLessThanOrEqual(100);
	});
});

// ===
// getDisplayPrice TESTS
// ===

describe("getDisplayPrice", () => {
	it("returns 'Free' for free tier", () => {
		const tier = makeTier({ monthlyPrice: 0 });
		const price = getDisplayPrice(tier, "monthly");
		expect(price).toBe("Free");
	});

	it("returns monthly price formatted with dollar sign", () => {
		const tier = makeTier({ monthlyPrice: 10 });
		const price = getDisplayPrice(tier, "monthly");
		expect(price).toBe("$10");
	});

	it("returns annual price formatted with dollar sign and rounded", () => {
		const tier = makeTier({ annualPrice: 102.4 });
		const price = getDisplayPrice(tier, "annual");
		expect(price).toBe("$102");
	});

	it("returns correct price for annual at 120", () => {
		const tier = makeTier({ annualPrice: 120 });
		const price = getDisplayPrice(tier, "annual");
		expect(price).toBe("$120");
	});
});

// ===
// getPriceSuffix TESTS
// ===

describe("getPriceSuffix", () => {
	it("returns '/mo' for monthly period", () => {
		const suffix = getPriceSuffix("monthly");
		expect(suffix).toBe("/mo");
	});

	it("returns '/yr' for annual period", () => {
		const suffix = getPriceSuffix("annual");
		expect(suffix).toBe("/yr");
	});
});

// ===
// formatAnnualAsMonthly TESTS
// ===

describe("formatAnnualAsMonthly", () => {
	it("formats annual 120 as monthly 10", () => {
		const formatted = formatAnnualAsMonthly(120);
		expect(formatted).toBe("$10.00/mo");
	});

	it("formats annual 102 as monthly 8.50", () => {
		const formatted = formatAnnualAsMonthly(102);
		expect(formatted).toBe("$8.50/mo");
	});
});

// ===
// getMonthlyEquivalentPrice TESTS
// ===

describe("getMonthlyEquivalentPrice", () => {
	it("returns monthly price for monthly period", () => {
		const tier = makeTier({ monthlyPrice: 10 });
		const price = getMonthlyEquivalentPrice(tier, "monthly");
		expect(price).toBe("10");
	});

	it("returns integer string when annual divides evenly by 12", () => {
		const tier = makeTier({ annualPrice: 120 });
		const price = getMonthlyEquivalentPrice(tier, "annual");
		expect(price).toBe("10");
	});

	it("returns 2 decimal places when annual doesn't divide evenly", () => {
		const tier = makeTier({ annualPrice: 102 });
		const price = getMonthlyEquivalentPrice(tier, "annual");
		expect(price).toBe("8.50");
	});

	it("handles edge case of 0 monthly price", () => {
		const tier = makeTier({ monthlyPrice: 0 });
		const price = getMonthlyEquivalentPrice(tier, "monthly");
		expect(price).toBe("0");
	});

	it("handles annual price with more decimal precision", () => {
		const tier = makeTier({ annualPrice: 119.99 });
		const price = getMonthlyEquivalentPrice(tier, "annual");
		// 119.99 / 12 = 9.9991... → toFixed(2) = "10.00"
		expect(price).toBe("10.00");
	});
});

// ===
// getYearlySavingsAmount TESTS
// ===

describe("getYearlySavingsAmount", () => {
	it("calculates savings for 10 monthly vs 102 annual", () => {
		const tier = makeTier({ monthlyPrice: 10, annualPrice: 102 });
		const savings = getYearlySavingsAmount(tier);
		expect(savings).toBe("18");
	});

	it("returns '0' for free tier", () => {
		const tier = makeTier({ monthlyPrice: 0, annualPrice: 0 });
		const savings = getYearlySavingsAmount(tier);
		expect(savings).toBe("0");
	});

	it("calculates large savings amount", () => {
		const tier = makeTier({ monthlyPrice: 20, annualPrice: 180 });
		const savings = getYearlySavingsAmount(tier);
		expect(savings).toBe("60");
	});
});

// ===
// billingPeriodToDbFormat TESTS
// ===

describe("billingPeriodToDbFormat", () => {
	it("converts 'annual' to 'yearly'", () => {
		const format = billingPeriodToDbFormat("annual");
		expect(format).toBe("yearly");
	});

	it("converts 'monthly' to 'monthly'", () => {
		const format = billingPeriodToDbFormat("monthly");
		expect(format).toBe("monthly");
	});
});

// ===
// dbFormatToBillingPeriod TESTS
// ===

describe("dbFormatToBillingPeriod", () => {
	it("converts 'yearly' to 'annual'", () => {
		const period = dbFormatToBillingPeriod("yearly");
		expect(period).toBe("annual");
	});

	it("converts 'monthly' to 'monthly'", () => {
		const period = dbFormatToBillingPeriod("monthly");
		expect(period).toBe("monthly");
	});
});

// ===
// transformTier TESTS
// ===

describe("transformTier", () => {
	it("returns pricing tier with key, name, and tagline from wanderer config", () => {
		const tier = transformTier("wanderer", TIERS.wanderer, {});
		expect(tier.key).toBe("wanderer");
		expect(tier.name).toBe(TIERS.wanderer.display.name);
		expect(tier.tagline).toBe(TIERS.wanderer.display.tagline);
	});

	it("computes annual savings from monthly and annual prices", () => {
		const tier = transformTier("wanderer", TIERS.wanderer, {});
		const expectedSavings = calculateAnnualSavings(
			TIERS.wanderer.pricing.monthlyPrice,
			TIERS.wanderer.pricing.yearlyPrice,
		);
		expect(tier.annualSavings).toBe(expectedSavings);
	});

	it("includes checkout URLs in transformed tier", () => {
		const checkoutUrls = {
			monthly: "https://checkout.example.com/monthly",
			annual: "https://checkout.example.com/annual",
		};
		const tier = transformTier("wanderer", TIERS.wanderer, checkoutUrls);
		expect(tier.checkoutUrls).toEqual(checkoutUrls);
	});

	it("applies highlight option to tier", () => {
		const tier = transformTier("wanderer", TIERS.wanderer, {}, { highlight: true });
		expect(tier.highlight).toBe(true);
	});

	it("applies badge option to tier", () => {
		const tier = transformTier("wanderer", TIERS.wanderer, {}, { badge: "Best Value" });
		expect(tier.badge).toBe("Best Value");
	});

	it("includes feature limits and feature strings", () => {
		const tier = transformTier("wanderer", TIERS.wanderer, {});
		expect(tier.limits).toBeDefined();
		expect(tier.features).toBeDefined();
		expect(Array.isArray(tier.featureStrings)).toBe(true);
	});

	it("includes pricing information", () => {
		const tier = transformTier("seedling", TIERS.seedling, {});
		expect(tier.monthlyPrice).toBe(TIERS.seedling.pricing.monthlyPrice);
		expect(tier.annualPrice).toBe(TIERS.seedling.pricing.yearlyPrice);
	});
});

// ===
// transformAllTiers TESTS
// ===

describe("transformAllTiers", () => {
	it("returns all five tiers by default", () => {
		const tiers = transformAllTiers();
		expect(tiers).toHaveLength(5);
		expect(tiers.map((t) => t.key)).toEqual([
			"wanderer",
			"seedling",
			"sapling",
			"oak",
			"evergreen",
		]);
	});

	it("respects includeTiers filter", () => {
		const tiers = transformAllTiers({ includeTiers: ["seedling", "sapling"] });
		expect(tiers).toHaveLength(2);
		expect(tiers.map((t) => t.key)).toEqual(["seedling", "sapling"]);
	});

	it("respects excludeTiers filter", () => {
		const tiers = transformAllTiers({ excludeTiers: ["wanderer", "evergreen"] });
		expect(tiers).toHaveLength(3);
		expect(tiers.map((t) => t.key)).toEqual(["seedling", "sapling", "oak"]);
	});

	it("applies highlightTier to correct tier", () => {
		const tiers = transformAllTiers({ highlightTier: "seedling" });
		const seedling = tiers.find((t) => t.key === "seedling");
		const sapling = tiers.find((t) => t.key === "sapling");
		expect(seedling?.highlight).toBe(true);
		expect(sapling?.highlight).toBe(false);
	});

	it("applies badges to specified tiers", () => {
		const tiers = transformAllTiers({
			badges: {
				seedling: "Most Popular",
				oak: "Best Value",
			},
		});
		const seedling = tiers.find((t) => t.key === "seedling");
		const oak = tiers.find((t) => t.key === "oak");
		const sapling = tiers.find((t) => t.key === "sapling");
		expect(seedling?.badge).toBe("Most Popular");
		expect(oak?.badge).toBe("Best Value");
		expect(sapling?.badge).toBeUndefined();
	});

	it("passes checkout URLs to each tier", () => {
		const checkoutUrls = {
			seedling: {
				monthly: "https://checkout.example.com/seedling/monthly",
				annual: "https://checkout.example.com/seedling/annual",
			},
			sapling: {
				monthly: "https://checkout.example.com/sapling/monthly",
			},
		};
		const tiers = transformAllTiers({ checkoutUrls });
		const seedling = tiers.find((t) => t.key === "seedling");
		expect(seedling?.checkoutUrls).toEqual(checkoutUrls.seedling);
	});

	it("respects custom tier order", () => {
		const customOrder = ["oak", "seedling", "wanderer"];
		const tiers = transformAllTiers({
			tierOrder: customOrder as any,
		});
		expect(tiers.map((t) => t.key)).toEqual(customOrder);
	});

	it("combines includeTiers and excludeTiers filters", () => {
		const tiers = transformAllTiers({
			includeTiers: ["seedling", "sapling", "oak"],
			excludeTiers: ["sapling"],
		});
		expect(tiers.map((t) => t.key)).toEqual(["seedling", "oak"]);
	});
});

// ===
// CONSTANTS TESTS
// ===

describe("Constants", () => {
	it("DEFAULT_ANNUAL_SAVINGS is 15", () => {
		expect(DEFAULT_ANNUAL_SAVINGS).toBe(15);
	});

	it("DEFAULT_TIER_ORDER contains all five tiers", () => {
		expect(DEFAULT_TIER_ORDER).toHaveLength(5);
		expect(DEFAULT_TIER_ORDER).toEqual(["wanderer", "seedling", "sapling", "oak", "evergreen"]);
	});

	it("DEFAULT_TIER_ORDER maintains correct tier sequence", () => {
		expect(DEFAULT_TIER_ORDER[0]).toBe("wanderer");
		expect(DEFAULT_TIER_ORDER[1]).toBe("seedling");
		expect(DEFAULT_TIER_ORDER[2]).toBe("sapling");
		expect(DEFAULT_TIER_ORDER[3]).toBe("oak");
		expect(DEFAULT_TIER_ORDER[4]).toBe("evergreen");
	});
});
