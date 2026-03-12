/**
 * Pricing Module Tests
 *
 * Tests categorizePrice (via getTldPricing), getDomainPricing,
 * getBatchPricing, and cache behavior.
 *
 * Note: pricing.ts uses module-level cache variables, so we mock fetch
 * and reset the module between test groups to avoid stale state.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock fetch globally before importing the module
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Sample pricing data
const MOCK_PRICING = {
	com: { registration: 9.77, renewal: 9.77 },
	io: { registration: 44.99, renewal: 44.99 },
	co: { registration: 11.5, renewal: 11.5 },
	dev: { registration: 12.0, renewal: 12.0 },
	garden: { registration: 25.0, renewal: 25.0 },
	luxury: { registration: 500.0, renewal: 500.0 },
};

function setupFetchSuccess() {
	mockFetch.mockResolvedValue({
		ok: true,
		json: async () => MOCK_PRICING,
	});
}

function setupFetchFailure() {
	mockFetch.mockResolvedValue({
		ok: false,
		status: 500,
		statusText: "Internal Server Error",
	});
}

describe("pricing", () => {
	let pricing: typeof import("./pricing");

	beforeEach(async () => {
		vi.resetModules();
		mockFetch.mockReset();
		vi.spyOn(console, "log").mockImplementation(() => {});
		vi.spyOn(console, "warn").mockImplementation(() => {});
		vi.spyOn(console, "error").mockImplementation(() => {});
		setupFetchSuccess();
		pricing = await import("./pricing");
	});

	describe("getTldPricing", () => {
		it("should return pricing for known TLD", async () => {
			const result = await pricing.getTldPricing("com");

			expect(result).not.toBeNull();
			expect(result!.tld).toBe("com");
			expect(result!.priceCents).toBe(977);
			expect(result!.renewalCents).toBe(977);
			expect(result!.currency).toBe("USD");
		});

		it("should normalize TLD (lowercase, strip leading dot)", async () => {
			const result = await pricing.getTldPricing(".COM");
			expect(result).not.toBeNull();
			expect(result!.tld).toBe("com");
		});

		it("should return null for unknown TLD", async () => {
			const result = await pricing.getTldPricing("zzz");
			expect(result).toBeNull();
		});

		it("should return domain field with leading dot", async () => {
			const result = await pricing.getTldPricing("io");
			expect(result!.domain).toBe(".io");
		});
	});

	describe("price categorization", () => {
		it("should categorize cheap TLDs as bundled (≤$30)", async () => {
			const result = await pricing.getTldPricing("com"); // $9.77
			expect(result!.category).toBe("bundled");
			expect(result!.isBundled).toBe(true);
		});

		it("should categorize mid-range TLDs as recommended ($30-$50)", async () => {
			const result = await pricing.getTldPricing("io"); // $44.99
			expect(result!.category).toBe("recommended");
			expect(result!.isRecommended).toBe(true);
			expect(result!.isBundled).toBe(false);
		});

		it("should categorize expensive TLDs as premium (≥$50)", async () => {
			const result = await pricing.getTldPricing("luxury"); // $500
			expect(result!.category).toBe("premium");
			expect(result!.isPremium).toBe(true);
		});
	});

	describe("getDomainPricing", () => {
		it("should look up pricing by domain name", async () => {
			const result = await pricing.getDomainPricing("sunrise.com");

			expect(result).not.toBeNull();
			expect(result!.domain).toBe("sunrise.com");
			expect(result!.tld).toBe("com");
			expect(result!.priceCents).toBe(977);
		});

		it("should return null for empty domain", async () => {
			const result = await pricing.getDomainPricing("");
			expect(result).toBeNull();
		});

		it("should return null for unsupported TLD", async () => {
			const result = await pricing.getDomainPricing("test.zzz");
			expect(result).toBeNull();
		});
	});

	describe("getBatchPricing", () => {
		it("should return pricing for multiple domains", async () => {
			const results = await pricing.getBatchPricing(["alpha.com", "beta.io", "gamma.dev"]);

			expect(results.size).toBe(3);
			expect(results.get("alpha.com")!.tld).toBe("com");
			expect(results.get("beta.io")!.tld).toBe("io");
		});

		it("should skip domains with unsupported TLDs", async () => {
			const results = await pricing.getBatchPricing(["alpha.com", "beta.zzz"]);

			expect(results.size).toBe(1);
			expect(results.has("alpha.com")).toBe(true);
			expect(results.has("beta.zzz")).toBe(false);
		});

		it("should handle empty input", async () => {
			const results = await pricing.getBatchPricing([]);
			expect(results.size).toBe(0);
		});
	});

	describe("getSupportedTlds", () => {
		it("should return all TLDs from pricing data", async () => {
			const tlds = await pricing.getSupportedTlds();

			expect(tlds).toContain("com");
			expect(tlds).toContain("io");
			expect(tlds).toContain("dev");
			expect(tlds.length).toBe(Object.keys(MOCK_PRICING).length);
		});
	});

	describe("isTldSupported", () => {
		it("should return true for known TLDs (after cache load)", async () => {
			await pricing.getSupportedTlds(); // Prime the cache
			expect(pricing.isTldSupported("com")).toBe(true);
		});

		it("should return false for unknown TLDs", async () => {
			await pricing.getSupportedTlds();
			expect(pricing.isTldSupported("zzz")).toBe(false);
		});

		it("should normalize TLD input", async () => {
			await pricing.getSupportedTlds();
			expect(pricing.isTldSupported(".COM")).toBe(true);
		});
	});

	describe("getDomainPriceCents", () => {
		it("should return price in cents", async () => {
			const cents = await pricing.getDomainPriceCents("sunrise.com");
			expect(cents).toBe(977);
		});

		it("should return null for unsupported domain", async () => {
			const cents = await pricing.getDomainPriceCents("test.zzz");
			expect(cents).toBeNull();
		});
	});

	describe("cache behavior", () => {
		it("should fetch pricing data only once", async () => {
			await pricing.getTldPricing("com");
			await pricing.getTldPricing("io");
			await pricing.getTldPricing("dev");

			// Only one fetch call (for the initial load)
			expect(mockFetch).toHaveBeenCalledTimes(1);
		});

		it("should refresh cache via refreshPricingCache", async () => {
			await pricing.getTldPricing("com"); // Initial load
			await pricing.refreshPricingCache(); // Force refresh

			expect(mockFetch).toHaveBeenCalledTimes(2);
		});
	});

	describe("error handling", () => {
		it("should throw when fetch fails and no stale cache", async () => {
			vi.resetModules();
			mockFetch.mockReset();
			setupFetchFailure();
			vi.spyOn(console, "error").mockImplementation(() => {});
			const freshPricing = await import("./pricing");

			await expect(freshPricing.getTldPricing("com")).rejects.toThrow("Failed to fetch pricing");
		});
	});
});
