/**
 * Tier Configuration Tests
 *
 * Tests the unified tier system — helper functions, data integrity,
 * and the upgrade path logic that drives Grove's pricing.
 */

import { describe, it, expect } from "vitest";
import {
	TIERS,
	TIER_ORDER,
	PAID_TIERS,
	DEFAULT_TIER,
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
} from "./tiers";

describe("TIERS constant", () => {
	it("should define exactly 5 tiers", () => {
		expect(Object.keys(TIERS)).toHaveLength(5);
	});

	it("should have correct order values", () => {
		expect(TIERS.wanderer.order).toBe(0);
		expect(TIERS.seedling.order).toBe(1);
		expect(TIERS.sapling.order).toBe(2);
		expect(TIERS.oak.order).toBe(3);
		expect(TIERS.evergreen.order).toBe(4);
	});

	it("should have wanderer and seedling as available", () => {
		expect(TIERS.wanderer.status).toBe("available");
		expect(TIERS.seedling.status).toBe("available");
	});

	it("should have sapling as coming_soon", () => {
		expect(TIERS.sapling.status).toBe("coming_soon");
	});

	it("should have oak and evergreen as future", () => {
		expect(TIERS.oak.status).toBe("future");
		expect(TIERS.evergreen.status).toBe("future");
	});

	it("should have wanderer at $0", () => {
		expect(TIERS.wanderer.pricing.monthlyPrice).toBe(0);
		expect(TIERS.wanderer.pricing.monthlyPriceCents).toBe(0);
	});

	it("should have increasing storage across tiers", () => {
		const storages = TIER_ORDER.map((k) => TIERS[k].limits.storage);
		for (let i = 1; i < storages.length; i++) {
			expect(storages[i]).toBeGreaterThan(storages[i - 1]);
		}
	});
});

describe("TIER_ORDER", () => {
	it("should list all 5 tiers in order", () => {
		expect(TIER_ORDER).toEqual(["wanderer", "seedling", "sapling", "oak", "evergreen"]);
	});
});

describe("PAID_TIERS", () => {
	it("should exclude wanderer", () => {
		expect(PAID_TIERS).not.toContain("wanderer");
		expect(PAID_TIERS).toHaveLength(4);
	});
});

describe("DEFAULT_TIER", () => {
	it("should be seedling", () => {
		expect(DEFAULT_TIER).toBe("seedling");
	});
});

describe("getTier", () => {
	it("should return tier config for valid key", () => {
		const tier = getTier("wanderer");
		expect(tier.id).toBe("wanderer");
		expect(tier.display.name).toBe("Wanderer");
	});
});

describe("getTierSafe", () => {
	it("should return tier config for valid key", () => {
		const tier = getTierSafe("seedling");
		expect(tier).toBeDefined();
		expect(tier!.id).toBe("seedling");
	});

	it("should return undefined for invalid key", () => {
		expect(getTierSafe("invalid")).toBeUndefined();
		expect(getTierSafe("")).toBeUndefined();
	});
});

describe("isValidTier", () => {
	it("should return true for valid tier keys", () => {
		expect(isValidTier("wanderer")).toBe(true);
		expect(isValidTier("seedling")).toBe(true);
		expect(isValidTier("evergreen")).toBe(true);
	});

	it("should return false for invalid keys", () => {
		expect(isValidTier("invalid")).toBe(false);
		expect(isValidTier("")).toBe(false);
		expect(isValidTier("premium")).toBe(false);
	});
});

describe("isPaidTier", () => {
	it("should return false for wanderer", () => {
		expect(isPaidTier("wanderer")).toBe(false);
	});

	it("should return true for paid tiers", () => {
		expect(isPaidTier("seedling")).toBe(true);
		expect(isPaidTier("oak")).toBe(true);
		expect(isPaidTier("evergreen")).toBe(true);
	});

	it("should return false for invalid keys", () => {
		expect(isPaidTier("invalid")).toBe(false);
	});
});

describe("getAvailableTiers", () => {
	it("should return only tiers with available status", () => {
		const available = getAvailableTiers();
		expect(available.every((t) => t.status === "available")).toBe(true);
		expect(available.length).toBeGreaterThanOrEqual(2); // wanderer + seedling
	});
});

describe("getTiersInOrder", () => {
	it("should return all tiers ordered by order field", () => {
		const tiers = getTiersInOrder();
		expect(tiers).toHaveLength(5);
		for (let i = 1; i < tiers.length; i++) {
			expect(tiers[i].order).toBeGreaterThan(tiers[i - 1].order);
		}
	});
});

describe("tierHasFeature", () => {
	it("should return true when tier has the feature", () => {
		expect(tierHasFeature("wanderer", "blog")).toBe(true);
		expect(tierHasFeature("oak", "customDomain")).toBe(true);
	});

	it("should return false when tier lacks the feature", () => {
		expect(tierHasFeature("wanderer", "customDomain")).toBe(false);
		expect(tierHasFeature("wanderer", "ai")).toBe(false);
	});
});

describe("getTierLimit", () => {
	it("should return the correct limit value", () => {
		expect(getTierLimit("wanderer", "posts")).toBe(25);
		expect(getTierLimit("sapling", "posts")).toBe(Infinity);
	});

	it("should return storage display string", () => {
		expect(getTierLimit("wanderer", "storageDisplay")).toBe("100 MB");
		expect(getTierLimit("seedling", "storageDisplay")).toBe("1 GB");
	});
});

describe("getTierRateLimits", () => {
	it("should return rate limit config", () => {
		const limits = getTierRateLimits("wanderer");
		expect(limits.requests.limit).toBe(60);
		expect(limits.requests.windowSeconds).toBe(60);
	});

	it("should have higher limits for higher tiers", () => {
		const wandererLimits = getTierRateLimits("wanderer");
		const oakLimits = getTierRateLimits("oak");
		expect(oakLimits.requests.limit).toBeGreaterThan(wandererLimits.requests.limit);
	});
});

describe("formatStorage", () => {
	it("should format 0 as 0 MB", () => {
		expect(formatStorage(0)).toBe("0 MB");
	});

	it("should format Infinity as Unlimited", () => {
		expect(formatStorage(Infinity)).toBe("Unlimited");
	});

	it("should format GB values", () => {
		expect(formatStorage(1024 * 1024 * 1024)).toBe("1 GB");
		expect(formatStorage(5 * 1024 * 1024 * 1024)).toBe("5 GB");
	});

	it("should format MB values", () => {
		expect(formatStorage(100 * 1024 * 1024)).toBe("100.0 MB");
	});
});

describe("formatLimit", () => {
	it("should format 0 as dash", () => {
		expect(formatLimit(0)).toBe("—");
	});

	it("should format Infinity as Unlimited", () => {
		expect(formatLimit(Infinity)).toBe("Unlimited");
	});

	it("should format numbers as strings", () => {
		expect(formatLimit(25)).toBe("25");
		expect(formatLimit(100)).toBe("100");
	});
});

describe("getNextTier", () => {
	it("should return the next tier in order", () => {
		expect(getNextTier("wanderer")).toBe("seedling");
		expect(getNextTier("seedling")).toBe("sapling");
		expect(getNextTier("oak")).toBe("evergreen");
	});

	it("should return null for the highest tier", () => {
		expect(getNextTier("evergreen")).toBeNull();
	});
});

describe("getTiersWithFeature", () => {
	it("should return all tiers with blog feature", () => {
		const tiers = getTiersWithFeature("blog");
		expect(tiers).toHaveLength(5); // All tiers have blog
	});

	it("should return only higher tiers for customDomain", () => {
		const tiers = getTiersWithFeature("customDomain");
		expect(tiers).toContain("oak");
		expect(tiers).toContain("evergreen");
		expect(tiers).not.toContain("wanderer");
		expect(tiers).not.toContain("seedling");
	});

	it("should return correct tiers for ai feature", () => {
		const tiers = getTiersWithFeature("ai");
		expect(tiers).not.toContain("wanderer");
		expect(tiers).toContain("seedling");
	});
});
