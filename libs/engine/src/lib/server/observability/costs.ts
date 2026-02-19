/**
 * Vista Observability — Cost Calculator
 *
 * Cloudflare pricing constants (last verified 2026-02-18) and per-provider
 * Firefly ephemeral server costs. All prices are in USD.
 *
 * When Cloudflare updates pricing, update the constants here and bump
 * PRICING_LAST_VERIFIED. Historical cost rows in D1 are NOT retroactively
 * recalculated — they reflect pricing at collection time.
 *
 * Sources:
 * - Workers: https://developers.cloudflare.com/workers/platform/pricing/
 * - D1:      https://developers.cloudflare.com/d1/platform/pricing/
 * - R2:      https://developers.cloudflare.com/r2/pricing/
 * - KV:      https://developers.cloudflare.com/kv/platform/pricing/
 * - DO:      https://developers.cloudflare.com/durable-objects/platform/pricing/
 * - AI:      https://developers.cloudflare.com/workers-ai/platform/pricing/
 *
 * @module server/observability/costs
 */

import type { CostBreakdown } from "./types.js";

/** Date when pricing was last verified against official Cloudflare docs */
export const PRICING_LAST_VERIFIED = "2026-02-18";

/**
 * Cloudflare pricing constants.
 * Workers Paid plan ($5/month) — these are the per-unit costs on top of included allotments.
 */
export const CLOUDFLARE_PRICING = {
	workers: {
		/** Cost per million requests beyond the 10M free requests included in Paid plan */
		perMillionRequests: 0.5,
		/** Free requests included in Workers Paid plan per month */
		freeRequests: 10_000_000,
		// https://developers.cloudflare.com/workers/platform/pricing/
	},
	d1: {
		/** Cost per million rows read beyond free tier (25B/month on Paid) */
		perMillionReads: 0.001,
		/** Cost per million rows written beyond free tier (50M/month on Paid) */
		perMillionWrites: 1.0,
		/** Cost per GB of storage beyond 5GB free */
		perGBStorage: 0.75,
		/** Free rows read per month (Workers Paid) */
		freeRowsRead: 25_000_000_000,
		/** Free rows written per month (Workers Paid) */
		freeRowsWritten: 50_000_000,
		/** Free storage in GB (Workers Paid) */
		freeStorageGB: 5,
		// https://developers.cloudflare.com/d1/platform/pricing/
	},
	r2: {
		/** Cost per GB of storage per month */
		perGBStorage: 0.015,
		/** Cost per million Class A operations (PUT, POST, LIST) */
		perMillionClassA: 4.5,
		/** Cost per million Class B operations (GET) */
		perMillionClassB: 0.36,
		/** R2 egress is free (as of 2023) */
		perGBEgress: 0,
		/** Free storage in GB */
		freeStorageGB: 10,
		/** Free Class A operations per month */
		freeClassAOps: 1_000_000,
		/** Free Class B operations per month */
		freeClassBOps: 10_000_000,
		// https://developers.cloudflare.com/r2/pricing/
	},
	kv: {
		/** Cost per million reads beyond free tier */
		perMillionReads: 0.5,
		/** Cost per million writes beyond free tier */
		perMillionWrites: 5.0,
		/** Cost per GB of stored data */
		perGBStorage: 0.5,
		/** Free reads per day (Workers Paid) */
		freeReadsPerDay: 100_000,
		/** Free writes per day (Workers Paid) */
		freeWritesPerDay: 1_000,
		/** Free storage in GB */
		freeStorageGB: 1,
		// https://developers.cloudflare.com/kv/platform/pricing/
	},
	durableObjects: {
		/** Cost per million requests */
		perMillionRequests: 0.15,
		/** Cost per million GB-seconds of active compute */
		perMillionGBSeconds: 12.5,
		/** Cost per GB of storage per month */
		perGBStorage: 0.2,
		/** Free compute duration per day in GB-seconds */
		freeDurationGBSecondsPerDay: 400_000,
		// https://developers.cloudflare.com/durable-objects/platform/pricing/
	},
	workersAI: {
		/** Free neurons per day on Paid plan */
		freeNeuronsPerDay: 10_000,
		/** Cost per thousand neurons beyond free tier */
		perThousandNeurons: 0.011,
		// https://developers.cloudflare.com/workers-ai/platform/pricing/
	},
} as const;

/**
 * External provider costs for Queen Firefly ephemeral servers.
 * All prices are per hour in USD.
 */
export const FIREFLY_PROVIDER_PRICING = {
	hetzner: {
		cx22: 0.008, // 2 vCPU, 4GB RAM
		cx32: 0.016, // 4 vCPU, 8GB RAM
		cx42: 0.032, // 8 vCPU, 16GB RAM
	},
	flyio: {
		"shared-cpu-1x": 0.0101, // 256MB RAM shared CPU
		"performance-1x": 0.02, // 256MB RAM dedicated CPU
		"performance-2x": 0.04, // 512MB RAM dedicated CPU
	},
	railway: {
		starter: 0.015, // ~0.5 vCPU, 512MB RAM (estimated)
		pro: 0.03, // ~1 vCPU, 1GB RAM (estimated)
	},
	digitalocean: {
		"s-1vcpu-1gb": 0.009, // 1 vCPU, 1GB RAM
		"s-1vcpu-2gb": 0.018, // 1 vCPU, 2GB RAM
		"s-2vcpu-2gb": 0.027, // 2 vCPU, 2GB RAM
	},
} as const;

// =============================================================================
// Cost Calculation Functions
// =============================================================================

interface UsageData {
	workerRequests: number;
	d1Reads: number;
	d1Writes: number;
	d1StorageBytes: number;
	r2StorageBytes: number;
	r2ClassAOps: number;
	r2ClassBOps: number;
	r2EgressBytes: number;
	kvReads: number;
	kvWrites: number;
	kvStorageBytes: number;
	doRequests: number;
	doDurationGBSeconds: number;
	doStorageBytes: number;
	aiNeurons: number;
}

/**
 * Calculate estimated daily costs from usage data.
 * Divides monthly free tiers by 30 for daily estimates.
 * All costs in USD.
 */
export function calculateDailyCosts(usage: UsageData): CostBreakdown {
	const p = CLOUDFLARE_PRICING;
	const today = new Date().toISOString().split("T")[0];

	// Workers: daily free tier = monthly / 30
	const freeWorkerRequestsPerDay = p.workers.freeRequests / 30;
	const billableWorkerRequests = Math.max(0, usage.workerRequests - freeWorkerRequestsPerDay);
	const workersCost = (billableWorkerRequests / 1_000_000) * p.workers.perMillionRequests;

	// D1: daily free tier = monthly / 30
	const freeD1ReadsPerDay = p.d1.freeRowsRead / 30;
	const freeD1WritesPerDay = p.d1.freeRowsWritten / 30;
	const billableD1Reads = Math.max(0, usage.d1Reads - freeD1ReadsPerDay);
	const billableD1Writes = Math.max(0, usage.d1Writes - freeD1WritesPerDay);
	const d1StorageGB = usage.d1StorageBytes / 1024 ** 3;
	const freeD1StorageGB = p.d1.freeStorageGB;
	const billableD1StorageGB = Math.max(0, d1StorageGB - freeD1StorageGB);

	const d1Reads = (billableD1Reads / 1_000_000) * p.d1.perMillionReads;
	const d1Writes = (billableD1Writes / 1_000_000) * p.d1.perMillionWrites;
	// Storage cost is monthly — prorate to daily
	const d1Storage = (billableD1StorageGB * p.d1.perGBStorage) / 30;
	const d1Total = d1Reads + d1Writes + d1Storage;

	// R2
	const r2StorageGB = usage.r2StorageBytes / 1024 ** 3;
	const billableR2StorageGB = Math.max(0, r2StorageGB - p.r2.freeStorageGB);
	const billableR2ClassA = Math.max(0, usage.r2ClassAOps - p.r2.freeClassAOps / 30);
	const billableR2ClassB = Math.max(0, usage.r2ClassBOps - p.r2.freeClassBOps / 30);

	const r2Storage = (billableR2StorageGB * p.r2.perGBStorage) / 30;
	const r2ClassA = (billableR2ClassA / 1_000_000) * p.r2.perMillionClassA;
	const r2ClassB = (billableR2ClassB / 1_000_000) * p.r2.perMillionClassB;
	const r2Egress = 0; // R2 egress is free
	const r2Total = r2Storage + r2ClassA + r2ClassB;

	// KV: daily free tier
	const billableKvReads = Math.max(0, usage.kvReads - p.kv.freeReadsPerDay);
	const billableKvWrites = Math.max(0, usage.kvWrites - p.kv.freeWritesPerDay);
	const kvStorageGB = usage.kvStorageBytes / 1024 ** 3;
	const billableKvStorageGB = Math.max(0, kvStorageGB - p.kv.freeStorageGB);

	const kvReads = (billableKvReads / 1_000_000) * p.kv.perMillionReads;
	const kvWrites = (billableKvWrites / 1_000_000) * p.kv.perMillionWrites;
	const kvStorage = (billableKvStorageGB * p.kv.perGBStorage) / 30;
	const kvTotal = kvReads + kvWrites + kvStorage;

	// Durable Objects
	const billableDoRequests = usage.doRequests; // no free tier for DO requests beyond Workers free
	const billableDoDuration = Math.max(
		0,
		usage.doDurationGBSeconds - p.durableObjects.freeDurationGBSecondsPerDay,
	);
	const doStorageGB = usage.doStorageBytes / 1024 ** 3;

	const doRequests = (billableDoRequests / 1_000_000) * p.durableObjects.perMillionRequests;
	const doDuration = (billableDoDuration / 1_000_000) * p.durableObjects.perMillionGBSeconds;
	const doStorage = (doStorageGB * p.durableObjects.perGBStorage) / 30;
	const doTotal = doRequests + doDuration + doStorage;

	// Workers AI
	const billableAiNeurons = Math.max(0, usage.aiNeurons - p.workersAI.freeNeuronsPerDay);
	const aiTotal = (billableAiNeurons / 1_000) * p.workersAI.perThousandNeurons;

	const total = workersCost + d1Total + r2Total + kvTotal + doTotal + aiTotal;

	return {
		workers: workersCost,
		d1: {
			reads: d1Reads,
			writes: d1Writes,
			storage: d1Storage,
			total: d1Total,
		},
		r2: {
			storage: r2Storage,
			classA: r2ClassA,
			classB: r2ClassB,
			egress: r2Egress,
			total: r2Total,
		},
		kv: {
			reads: kvReads,
			writes: kvWrites,
			storage: kvStorage,
			total: kvTotal,
		},
		durableObjects: {
			requests: doRequests,
			duration: doDuration,
			storage: doStorage,
			total: doTotal,
		},
		ai: {
			neurons: usage.aiNeurons,
			total: aiTotal,
		},
		total,
		period: "daily",
		periodLabel: today,
		pricingVersion: PRICING_LAST_VERIFIED,
	};
}

/**
 * Project daily costs to monthly estimate (multiply by 30).
 *
 * Uses 30 days rather than the astronomical average (30.44) because:
 * - Cloudflare bills per calendar month, not per rolling 30.44 days
 * - Free tier allotments (e.g., 10M Worker requests/month) are per calendar month
 * - Rounding to 30 is intentional: it produces a slight underestimate,
 *   which is safer than an overestimate when projecting costs
 * - The error is <1.5% across all months — acceptable for budget projection
 */
export function projectMonthly(dailyCost: CostBreakdown): CostBreakdown {
	const month = new Date().toISOString().substring(0, 7); // YYYY-MM
	return {
		workers: dailyCost.workers * 30,
		d1: {
			reads: dailyCost.d1.reads * 30,
			writes: dailyCost.d1.writes * 30,
			storage: dailyCost.d1.storage * 30,
			total: dailyCost.d1.total * 30,
		},
		r2: {
			storage: dailyCost.r2.storage * 30,
			classA: dailyCost.r2.classA * 30,
			classB: dailyCost.r2.classB * 30,
			egress: 0,
			total: dailyCost.r2.total * 30,
		},
		kv: {
			reads: dailyCost.kv.reads * 30,
			writes: dailyCost.kv.writes * 30,
			storage: dailyCost.kv.storage * 30,
			total: dailyCost.kv.total * 30,
		},
		durableObjects: {
			requests: dailyCost.durableObjects.requests * 30,
			duration: dailyCost.durableObjects.duration * 30,
			storage: dailyCost.durableObjects.storage * 30,
			total: dailyCost.durableObjects.total * 30,
		},
		ai: {
			neurons: dailyCost.ai.neurons * 30,
			total: dailyCost.ai.total * 30,
		},
		total: dailyCost.total * 30,
		period: "monthly",
		periodLabel: month,
		pricingVersion: PRICING_LAST_VERIFIED,
	};
}

/**
 * Calculate Firefly session cost for a given provider, instance type, and duration.
 */
export function calculateFireflySessionCost(
	provider: keyof typeof FIREFLY_PROVIDER_PRICING,
	instanceType: string,
	durationSeconds: number,
): number {
	const providerPricing = FIREFLY_PROVIDER_PRICING[provider] as Record<string, number>;
	const hourlyRate = providerPricing[instanceType];
	if (!hourlyRate) return 0;
	const durationHours = durationSeconds / 3600;
	return hourlyRate * durationHours;
}
