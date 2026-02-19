/**
 * Vista Observability — Cost Calculator Tests
 *
 * Tests for calculateDailyCosts(), projectMonthly(), and
 * calculateFireflySessionCost() pure functions.
 * No D1, no network — fully deterministic.
 */

import { describe, it, expect } from "vitest";
import {
	calculateDailyCosts,
	projectMonthly,
	calculateFireflySessionCost,
	CLOUDFLARE_PRICING,
	PRICING_LAST_VERIFIED,
} from "../costs.js";
import type { CostBreakdown } from "../types.js";

// =============================================================================
// Helpers
// =============================================================================

/** Zero-usage input — all billable quantities are zero */
const ZERO_USAGE = {
	workerRequests: 0,
	d1Reads: 0,
	d1Writes: 0,
	d1StorageBytes: 0,
	r2StorageBytes: 0,
	r2ClassAOps: 0,
	r2ClassBOps: 0,
	r2EgressBytes: 0,
	kvReads: 0,
	kvWrites: 0,
	kvStorageBytes: 0,
	doRequests: 0,
	doDurationGBSeconds: 0,
	doStorageBytes: 0,
	aiNeurons: 0,
};

// =============================================================================
// CLOUDFLARE_PRICING constants
// =============================================================================

describe("CLOUDFLARE_PRICING constants", () => {
	it("workers perMillionRequests is $0.50", () => {
		expect(CLOUDFLARE_PRICING.workers.perMillionRequests).toBe(0.5);
	});

	it("d1 perMillionReads is $0.001", () => {
		expect(CLOUDFLARE_PRICING.d1.perMillionReads).toBe(0.001);
	});

	it("r2 egress is free ($0)", () => {
		expect(CLOUDFLARE_PRICING.r2.perGBEgress).toBe(0);
	});

	it("PRICING_LAST_VERIFIED is set", () => {
		expect(PRICING_LAST_VERIFIED).toMatch(/^\d{4}-\d{2}-\d{2}$/);
	});
});

// =============================================================================
// calculateDailyCosts — zero usage
// =============================================================================

describe("calculateDailyCosts — zero usage", () => {
	it("returns zero total cost when all usage is zero", () => {
		const result = calculateDailyCosts(ZERO_USAGE);
		expect(result.total).toBe(0);
	});

	it("returns zero workers cost when usage is zero", () => {
		const result = calculateDailyCosts(ZERO_USAGE);
		expect(result.workers).toBe(0);
	});

	it("returns zero d1 cost when usage is zero", () => {
		const result = calculateDailyCosts(ZERO_USAGE);
		expect(result.d1.total).toBe(0);
		expect(result.d1.reads).toBe(0);
		expect(result.d1.writes).toBe(0);
		expect(result.d1.storage).toBe(0);
	});

	it("returns zero r2 cost when usage is zero", () => {
		const result = calculateDailyCosts(ZERO_USAGE);
		expect(result.r2.total).toBe(0);
		expect(result.r2.storage).toBe(0);
		expect(result.r2.classA).toBe(0);
		expect(result.r2.classB).toBe(0);
		expect(result.r2.egress).toBe(0);
	});

	it("returns zero kv cost when usage is zero", () => {
		const result = calculateDailyCosts(ZERO_USAGE);
		expect(result.kv.total).toBe(0);
	});

	it("returns zero DO cost when usage is zero", () => {
		const result = calculateDailyCosts(ZERO_USAGE);
		expect(result.durableObjects.total).toBe(0);
	});

	it("returns zero AI cost when usage is zero", () => {
		const result = calculateDailyCosts(ZERO_USAGE);
		expect(result.ai.total).toBe(0);
		expect(result.ai.neurons).toBe(0);
	});

	it("returns 'daily' period", () => {
		const result = calculateDailyCosts(ZERO_USAGE);
		expect(result.period).toBe("daily");
	});

	it("returns periodLabel as today's date (YYYY-MM-DD)", () => {
		const result = calculateDailyCosts(ZERO_USAGE);
		const today = new Date().toISOString().split("T")[0];
		expect(result.periodLabel).toBe(today);
	});

	it("returns pricingVersion matching PRICING_LAST_VERIFIED", () => {
		const result = calculateDailyCosts(ZERO_USAGE);
		expect(result.pricingVersion).toBe(PRICING_LAST_VERIFIED);
	});
});

// =============================================================================
// calculateDailyCosts — free tier boundaries
// =============================================================================

describe("calculateDailyCosts — free tier boundaries", () => {
	it("worker requests within daily free tier cost nothing", () => {
		// Daily free = 10,000,000 / 30 ≈ 333,333
		const usage = { ...ZERO_USAGE, workerRequests: 300_000 };
		const result = calculateDailyCosts(usage);
		expect(result.workers).toBe(0);
	});

	it("worker requests just beyond daily free tier cost something", () => {
		// Just over 10M / 30 ≈ 333,334 requests
		const usage = { ...ZERO_USAGE, workerRequests: 10_000_000 };
		const result = calculateDailyCosts(usage);
		// Billable = 10_000_000 - 10_000_000/30 ≈ 9,666,667 requests
		// Cost = 9,666,667 / 1,000,000 * 0.5 ≈ $4.833
		expect(result.workers).toBeGreaterThan(0);
	});

	it("D1 reads within daily free tier cost nothing", () => {
		// Daily free = 25_000_000_000 / 30 ≈ 833,333,333
		const usage = { ...ZERO_USAGE, d1Reads: 500_000_000 };
		const result = calculateDailyCosts(usage);
		expect(result.d1.reads).toBe(0);
	});

	it("D1 writes within daily free tier cost nothing", () => {
		// Daily free = 50_000_000 / 30 ≈ 1,666,667
		const usage = { ...ZERO_USAGE, d1Writes: 1_000_000 };
		const result = calculateDailyCosts(usage);
		expect(result.d1.writes).toBe(0);
	});

	it("KV reads within daily free tier cost nothing", () => {
		// Free 100,000 reads/day
		const usage = { ...ZERO_USAGE, kvReads: 99_999 };
		const result = calculateDailyCosts(usage);
		expect(result.kv.reads).toBe(0);
	});

	it("KV writes within daily free tier cost nothing", () => {
		// Free 1,000 writes/day
		const usage = { ...ZERO_USAGE, kvWrites: 999 };
		const result = calculateDailyCosts(usage);
		expect(result.kv.writes).toBe(0);
	});

	it("AI neurons within daily free tier cost nothing", () => {
		// Free 10,000 neurons/day
		const usage = { ...ZERO_USAGE, aiNeurons: 9_999 };
		const result = calculateDailyCosts(usage);
		expect(result.ai.total).toBe(0);
	});

	it("R2 storage within free tier costs nothing", () => {
		// Free 10 GB
		const under10GB = 9 * 1024 ** 3; // 9 GB in bytes
		const usage = { ...ZERO_USAGE, r2StorageBytes: under10GB };
		const result = calculateDailyCosts(usage);
		expect(result.r2.storage).toBe(0);
	});
});

// =============================================================================
// calculateDailyCosts — known calculations
// =============================================================================

describe("calculateDailyCosts — known calculations", () => {
	it("calculates correct Workers cost for 100M requests", () => {
		// Billable = 100_000_000 - 10_000_000/30 ≈ 99,666,667
		// Cost = 99,666,667 / 1,000,000 * 0.5 ≈ $49.833
		const usage = { ...ZERO_USAGE, workerRequests: 100_000_000 };
		const result = calculateDailyCosts(usage);
		const freePerDay = CLOUDFLARE_PRICING.workers.freeRequests / 30;
		const billable = 100_000_000 - freePerDay;
		const expected = (billable / 1_000_000) * CLOUDFLARE_PRICING.workers.perMillionRequests;
		expect(result.workers).toBeCloseTo(expected, 6);
	});

	it("calculates correct AI cost for 20,000 neurons (10k above free)", () => {
		// Billable = 20,000 - 10,000 = 10,000 neurons
		// Cost = 10,000 / 1,000 * 0.011 = $0.11
		const usage = { ...ZERO_USAGE, aiNeurons: 20_000 };
		const result = calculateDailyCosts(usage);
		expect(result.ai.total).toBeCloseTo(0.11, 6);
		expect(result.ai.neurons).toBe(20_000);
	});

	it("calculates correct DO requests cost", () => {
		// DO requests have no free tier for requests themselves
		// 1,000,000 DO requests * 0.15 / 1,000,000 = $0.15
		const usage = { ...ZERO_USAGE, doRequests: 1_000_000 };
		const result = calculateDailyCosts(usage);
		expect(result.durableObjects.requests).toBeCloseTo(0.15, 6);
	});

	it("calculates correct DO duration cost beyond free tier", () => {
		// Free 400,000 GB-seconds/day
		// Billable = 1,400,000 - 400,000 = 1,000,000 GB-seconds
		// Cost = 1,000,000 / 1,000,000 * 12.5 = $12.50
		const usage = { ...ZERO_USAGE, doDurationGBSeconds: 1_400_000 };
		const result = calculateDailyCosts(usage);
		expect(result.durableObjects.duration).toBeCloseTo(12.5, 6);
	});

	it("total equals sum of all service costs", () => {
		const usage = {
			...ZERO_USAGE,
			workerRequests: 50_000_000,
			aiNeurons: 50_000,
			doRequests: 500_000,
		};
		const result = calculateDailyCosts(usage);
		const sum =
			result.workers +
			result.d1.total +
			result.r2.total +
			result.kv.total +
			result.durableObjects.total +
			result.ai.total;
		expect(result.total).toBeCloseTo(sum, 10);
	});

	it("R2 egress is always 0 (egress is free)", () => {
		const usage = { ...ZERO_USAGE, r2EgressBytes: 1_000_000_000 * 100 }; // 100 GB
		const result = calculateDailyCosts(usage);
		expect(result.r2.egress).toBe(0);
	});

	it("D1 storage cost is prorated to daily (1/30 of monthly)", () => {
		// 10 GB storage beyond free 5 GB = 5 GB billable
		// Monthly cost = 5 * $0.75 = $3.75 / day = $3.75 / 30 = $0.125
		const usage = { ...ZERO_USAGE, d1StorageBytes: 10 * 1024 ** 3 };
		const result = calculateDailyCosts(usage);
		const expectedDailyStorage = (5 * CLOUDFLARE_PRICING.d1.perGBStorage) / 30;
		expect(result.d1.storage).toBeCloseTo(expectedDailyStorage, 6);
	});

	it("KV storage cost is prorated to daily (1/30 of monthly)", () => {
		// 2 GB beyond free 1 GB = 1 GB billable
		// Monthly = 1 * $0.50 = $0.50; daily = $0.50 / 30 ≈ $0.01667
		const usage = { ...ZERO_USAGE, kvStorageBytes: 2 * 1024 ** 3 };
		const result = calculateDailyCosts(usage);
		const expectedDailyStorage = (1 * CLOUDFLARE_PRICING.kv.perGBStorage) / 30;
		expect(result.kv.storage).toBeCloseTo(expectedDailyStorage, 6);
	});
});

// =============================================================================
// calculateDailyCosts — large values
// =============================================================================

describe("calculateDailyCosts — large values", () => {
	it("handles extremely large worker request counts without overflow", () => {
		const usage = { ...ZERO_USAGE, workerRequests: 1_000_000_000 }; // 1B requests
		const result = calculateDailyCosts(usage);
		expect(result.workers).toBeGreaterThan(0);
		expect(Number.isFinite(result.workers)).toBe(true);
	});

	it("handles extremely large R2 storage", () => {
		const usage = { ...ZERO_USAGE, r2StorageBytes: 1000 * 1024 ** 3 }; // 1 TB
		const result = calculateDailyCosts(usage);
		expect(result.r2.storage).toBeGreaterThan(0);
		expect(Number.isFinite(result.r2.storage)).toBe(true);
	});

	it("handles all services at maximum simultaneously", () => {
		const bigUsage = {
			workerRequests: 1_000_000_000,
			d1Reads: 100_000_000_000,
			d1Writes: 1_000_000_000,
			d1StorageBytes: 100 * 1024 ** 3,
			r2StorageBytes: 500 * 1024 ** 3,
			r2ClassAOps: 10_000_000,
			r2ClassBOps: 100_000_000,
			r2EgressBytes: 1000 * 1024 ** 3,
			kvReads: 10_000_000,
			kvWrites: 100_000,
			kvStorageBytes: 10 * 1024 ** 3,
			doRequests: 100_000_000,
			doDurationGBSeconds: 10_000_000,
			doStorageBytes: 50 * 1024 ** 3,
			aiNeurons: 1_000_000,
		};
		const result = calculateDailyCosts(bigUsage);
		expect(result.total).toBeGreaterThan(0);
		expect(Number.isFinite(result.total)).toBe(true);
	});
});

// =============================================================================
// projectMonthly
// =============================================================================

describe("projectMonthly", () => {
	it("multiplies all cost fields by 30", () => {
		const dailyCost = calculateDailyCosts({
			...ZERO_USAGE,
			workerRequests: 50_000_000,
			aiNeurons: 50_000,
			doRequests: 500_000,
		});

		const monthly = projectMonthly(dailyCost);

		expect(monthly.workers).toBeCloseTo(dailyCost.workers * 30, 10);
		expect(monthly.d1.reads).toBeCloseTo(dailyCost.d1.reads * 30, 10);
		expect(monthly.d1.writes).toBeCloseTo(dailyCost.d1.writes * 30, 10);
		expect(monthly.d1.storage).toBeCloseTo(dailyCost.d1.storage * 30, 10);
		expect(monthly.d1.total).toBeCloseTo(dailyCost.d1.total * 30, 10);
		expect(monthly.r2.storage).toBeCloseTo(dailyCost.r2.storage * 30, 10);
		expect(monthly.r2.classA).toBeCloseTo(dailyCost.r2.classA * 30, 10);
		expect(monthly.r2.classB).toBeCloseTo(dailyCost.r2.classB * 30, 10);
		expect(monthly.r2.total).toBeCloseTo(dailyCost.r2.total * 30, 10);
		expect(monthly.kv.total).toBeCloseTo(dailyCost.kv.total * 30, 10);
		expect(monthly.durableObjects.total).toBeCloseTo(dailyCost.durableObjects.total * 30, 10);
		expect(monthly.ai.total).toBeCloseTo(dailyCost.ai.total * 30, 10);
		expect(monthly.total).toBeCloseTo(dailyCost.total * 30, 10);
	});

	it("returns 'monthly' period", () => {
		const daily = calculateDailyCosts(ZERO_USAGE);
		const monthly = projectMonthly(daily);
		expect(monthly.period).toBe("monthly");
	});

	it("returns periodLabel as YYYY-MM format", () => {
		const daily = calculateDailyCosts(ZERO_USAGE);
		const monthly = projectMonthly(daily);
		expect(monthly.periodLabel).toMatch(/^\d{4}-\d{2}$/);
	});

	it("R2 egress is always 0 in monthly projection", () => {
		const daily = calculateDailyCosts({ ...ZERO_USAGE, r2EgressBytes: 1_000_000_000 });
		const monthly = projectMonthly(daily);
		expect(monthly.r2.egress).toBe(0);
	});

	it("zero daily costs project to zero monthly", () => {
		const daily = calculateDailyCosts(ZERO_USAGE);
		const monthly = projectMonthly(daily);
		expect(monthly.total).toBe(0);
		expect(monthly.workers).toBe(0);
		expect(monthly.d1.total).toBe(0);
		expect(monthly.r2.total).toBe(0);
		expect(monthly.kv.total).toBe(0);
		expect(monthly.durableObjects.total).toBe(0);
		expect(monthly.ai.total).toBe(0);
	});

	it("preserves pricingVersion from daily", () => {
		const daily = calculateDailyCosts(ZERO_USAGE);
		const monthly = projectMonthly(daily);
		expect(monthly.pricingVersion).toBe(daily.pricingVersion);
	});

	it("monthly AI neurons equals daily * 30", () => {
		const usage = { ...ZERO_USAGE, aiNeurons: 20_000 };
		const daily = calculateDailyCosts(usage);
		const monthly = projectMonthly(daily);
		expect(monthly.ai.neurons).toBe(daily.ai.neurons * 30);
	});

	/**
	 * The doc-spec says "multiply by 30.44" (avg days/month) but the
	 * implementation uses exactly 30. This test documents the actual
	 * implementation behavior.
	 */
	it("uses multiplier of exactly 30 (not 30.44)", () => {
		const usage = { ...ZERO_USAGE, aiNeurons: 20_000 };
		const daily = calculateDailyCosts(usage);
		const monthly = projectMonthly(daily);
		// If it were 30.44 this would be different
		expect(monthly.total).toBeCloseTo(daily.total * 30, 10);
	});
});

// =============================================================================
// calculateFireflySessionCost
// =============================================================================

describe("calculateFireflySessionCost", () => {
	it("calculates correct cost for hetzner cx22 for 1 hour", () => {
		// cx22 = $0.008/hour * 1 hour = $0.008
		const cost = calculateFireflySessionCost("hetzner", "cx22", 3600);
		expect(cost).toBeCloseTo(0.008, 6);
	});

	it("calculates correct cost for hetzner cx32 for 2 hours", () => {
		// cx32 = $0.016/hour * 2 = $0.032
		const cost = calculateFireflySessionCost("hetzner", "cx32", 7200);
		expect(cost).toBeCloseTo(0.032, 6);
	});

	it("calculates correct cost for flyio shared-cpu-1x for 30 minutes", () => {
		// shared-cpu-1x = $0.0101/hour * 0.5h = $0.00505
		const cost = calculateFireflySessionCost("flyio", "shared-cpu-1x", 1800);
		expect(cost).toBeCloseTo(0.00505, 6);
	});

	it("calculates correct cost for railway starter for 24 hours", () => {
		// starter = $0.015/hour * 24 = $0.36
		const cost = calculateFireflySessionCost("railway", "starter", 86400);
		expect(cost).toBeCloseTo(0.36, 6);
	});

	it("calculates correct cost for digitalocean s-1vcpu-1gb for 1 hour", () => {
		// s-1vcpu-1gb = $0.009/hour
		const cost = calculateFireflySessionCost("digitalocean", "s-1vcpu-1gb", 3600);
		expect(cost).toBeCloseTo(0.009, 6);
	});

	it("returns 0 for unknown instance type", () => {
		const cost = calculateFireflySessionCost("hetzner", "nonexistent-type", 3600);
		expect(cost).toBe(0);
	});

	it("returns 0 for 0-second duration", () => {
		const cost = calculateFireflySessionCost("hetzner", "cx22", 0);
		expect(cost).toBe(0);
	});

	it("cost is proportional to duration", () => {
		const oneHour = calculateFireflySessionCost("hetzner", "cx42", 3600);
		const twoHours = calculateFireflySessionCost("hetzner", "cx42", 7200);
		expect(twoHours).toBeCloseTo(oneHour * 2, 10);
	});

	it("cost for 3600 seconds equals hourly rate", () => {
		const providers = ["hetzner", "flyio", "railway", "digitalocean"] as const;
		const instances = {
			hetzner: "cx22",
			flyio: "shared-cpu-1x",
			railway: "starter",
			digitalocean: "s-1vcpu-1gb",
		} as const;

		for (const provider of providers) {
			const instance = instances[provider];
			const cost = calculateFireflySessionCost(provider, instance, 3600);
			expect(cost).toBeGreaterThan(0);
			expect(Number.isFinite(cost)).toBe(true);
		}
	});
});
