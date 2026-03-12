/**
 * LemonSqueezy Checkout URL Generation Tests
 *
 * Tests for checkout URL generation, configuration, and validation.
 */

import { describe, it, expect, vi } from "vitest";
import {
	getCheckoutUrl,
	getAllCheckoutUrls,
	createCheckoutConfigFromEnv,
	type CheckoutConfig,
} from "./checkout";

// ===
// TEST DATA
// ===

const testConfig: CheckoutConfig = {
	storeId: "test-store",
	products: {
		seedling: { monthlyVariantId: "var-s-m", annualVariantId: "var-s-a" },
		sapling: { monthlyVariantId: "var-p-m" },
		oak: { annualVariantId: "var-o-a" },
	},
};

// ===
// getCheckoutUrl TESTS
// ===

describe("getCheckoutUrl", () => {
	it("generates URL for configured tier and monthly period", () => {
		const url = getCheckoutUrl(testConfig, "seedling", "monthly");
		expect(url).toBe("https://test-store.lemonsqueezy.com/checkout/buy/var-s-m");
	});

	it("generates URL for configured tier and annual period", () => {
		const url = getCheckoutUrl(testConfig, "seedling", "annual");
		expect(url).toBe("https://test-store.lemonsqueezy.com/checkout/buy/var-s-a");
	});

	it("returns undefined for unconfigured tier", () => {
		const url = getCheckoutUrl(testConfig, "wanderer", "monthly");
		expect(url).toBeUndefined();
	});

	it("returns undefined when variant ID not configured for period", () => {
		const url = getCheckoutUrl(testConfig, "sapling", "annual");
		expect(url).toBeUndefined();
	});

	it("returns undefined for oak tier when monthly variant not configured", () => {
		const url = getCheckoutUrl(testConfig, "oak", "monthly");
		expect(url).toBeUndefined();
	});

	it("adds email parameter to checkout URL", () => {
		const url = getCheckoutUrl(testConfig, "seedling", "monthly", {
			email: "user@example.com",
		});
		expect(url).toContain("checkout%5Bemail%5D=user%40example.com");
	});

	it("adds discount code to checkout URL", () => {
		const url = getCheckoutUrl(testConfig, "seedling", "monthly", {
			discountCode: "WELCOME10",
		});
		expect(url).toContain("checkout%5Bdiscount_code%5D=WELCOME10");
	});

	it("adds success URL to checkout parameters", () => {
		const url = getCheckoutUrl(testConfig, "seedling", "monthly", {
			successUrl: "https://example.com/success",
		});
		expect(url).toContain("checkout%5Bsuccess_url%5D=https%3A%2F%2Fexample.com%2Fsuccess");
	});

	it("adds cancel URL to checkout parameters", () => {
		const url = getCheckoutUrl(testConfig, "seedling", "monthly", {
			cancelUrl: "https://example.com/cancel",
		});
		expect(url).toContain("checkout%5Bcancel_url%5D=https%3A%2F%2Fexample.com%2Fcancel");
	});

	it("adds custom data with valid keys", () => {
		const url = getCheckoutUrl(testConfig, "seedling", "monthly", {
			customData: {
				tenant_id: "t1",
				user_id: "u123",
			},
		});
		expect(url).toContain("checkout%5Bcustom%5D%5Btenant_id%5D=t1");
		expect(url).toContain("checkout%5Bcustom%5D%5Buser_id%5D=u123");
	});

	it("skips invalid custom data keys with special characters", () => {
		const warnSpy = vi.spyOn(console, "warn").mockImplementation();
		const url = getCheckoutUrl(testConfig, "seedling", "monthly", {
			customData: {
				valid_key: "value",
				"invalid key": "value",
			},
		});
		expect(url).toContain("checkout%5Bcustom%5D%5Bvalid_key%5D=value");
		expect(url).not.toContain("invalid%20key");
		expect(warnSpy).toHaveBeenCalled();
		warnSpy.mockRestore();
	});

	it("console.warns when custom data key contains script tag", () => {
		const warnSpy = vi.spyOn(console, "warn").mockImplementation();
		getCheckoutUrl(testConfig, "seedling", "monthly", {
			customData: {
				"<script>": "malicious",
			},
		});
		expect(warnSpy).toHaveBeenCalledWith(
			expect.stringContaining('Invalid custom data key "<script>"'),
		);
		warnSpy.mockRestore();
	});

	it("console.warns when custom data key contains spaces", () => {
		const warnSpy = vi.spyOn(console, "warn").mockImplementation();
		getCheckoutUrl(testConfig, "seedling", "monthly", {
			customData: {
				"foo bar": "value",
			},
		});
		expect(warnSpy).toHaveBeenCalledWith(
			expect.stringContaining('Invalid custom data key "foo bar"'),
		);
		warnSpy.mockRestore();
	});

	it("combines multiple options in one URL", () => {
		const url = getCheckoutUrl(testConfig, "seedling", "monthly", {
			email: "user@example.com",
			discountCode: "SAVE20",
			successUrl: "https://example.com/success",
			cancelUrl: "https://example.com/cancel",
			customData: {
				tenant_id: "t1",
				source: "pricing-page",
			},
		});
		expect(url).toContain("checkout%5Bemail%5D=user%40example.com");
		expect(url).toContain("checkout%5Bdiscount_code%5D=SAVE20");
		expect(url).toContain("checkout%5Bsuccess_url%5D=https%3A%2F%2Fexample.com%2Fsuccess");
		expect(url).toContain("checkout%5Bcancel_url%5D=https%3A%2F%2Fexample.com%2Fcancel");
		expect(url).toContain("checkout%5Bcustom%5D%5Btenant_id%5D=t1");
		expect(url).toContain("checkout%5Bcustom%5D%5Bsource%5D=pricing-page");
	});
});

// ===
// getAllCheckoutUrls TESTS
// ===

describe("getAllCheckoutUrls", () => {
	it("returns all five tier keys in result", () => {
		const urls = getAllCheckoutUrls(testConfig);
		expect(Object.keys(urls)).toEqual(["wanderer", "seedling", "sapling", "oak", "evergreen"]);
	});

	it("populates monthly URLs for configured tiers", () => {
		const urls = getAllCheckoutUrls(testConfig);
		expect(urls.seedling.monthly).toBe("https://test-store.lemonsqueezy.com/checkout/buy/var-s-m");
		expect(urls.sapling.monthly).toBe("https://test-store.lemonsqueezy.com/checkout/buy/var-p-m");
	});

	it("populates annual URLs for configured tiers", () => {
		const urls = getAllCheckoutUrls(testConfig);
		expect(urls.seedling.annual).toBe("https://test-store.lemonsqueezy.com/checkout/buy/var-s-a");
		expect(urls.oak.annual).toBe("https://test-store.lemonsqueezy.com/checkout/buy/var-o-a");
	});

	it("returns undefined for unconfigured tier URLs", () => {
		const urls = getAllCheckoutUrls(testConfig);
		expect(urls.wanderer.monthly).toBeUndefined();
		expect(urls.wanderer.annual).toBeUndefined();
	});

	it("returns undefined for unconfigured period on configured tier", () => {
		const urls = getAllCheckoutUrls(testConfig);
		expect(urls.sapling.annual).toBeUndefined();
		expect(urls.oak.monthly).toBeUndefined();
	});

	it("passes options through to each checkout URL", () => {
		const urls = getAllCheckoutUrls(testConfig, {
			email: "user@example.com",
			discountCode: "BULK10",
		});
		expect(urls.seedling.monthly).toContain("checkout%5Bemail%5D=user%40example.com");
		expect(urls.seedling.monthly).toContain("checkout%5Bdiscount_code%5D=BULK10");
		expect(urls.sapling.monthly).toContain("checkout%5Bemail%5D=user%40example.com");
	});
});

// ===
// createCheckoutConfigFromEnv TESTS
// ===

describe("createCheckoutConfigFromEnv", () => {
	it("creates config from environment variables", () => {
		const env = {
			LEMON_SQUEEZY_STORE_ID: "my-store",
			LEMON_SEEDLING_MONTHLY: "var1",
			LEMON_SEEDLING_ANNUAL: "var2",
		};
		const config = createCheckoutConfigFromEnv(env);
		expect(config.storeId).toBe("my-store");
		expect(config.products.seedling?.monthlyVariantId).toBe("var1");
		expect(config.products.seedling?.annualVariantId).toBe("var2");
	});

	it("uses empty string for missing store ID", () => {
		const config = createCheckoutConfigFromEnv({});
		expect(config.storeId).toBe("");
	});

	it("handles partial environment variables (undefined variant IDs)", () => {
		const env = {
			LEMON_SQUEEZY_STORE_ID: "my-store",
			LEMON_SEEDLING_MONTHLY: "var1",
		};
		const config = createCheckoutConfigFromEnv(env);
		expect(config.products.seedling?.monthlyVariantId).toBe("var1");
		expect(config.products.seedling?.annualVariantId).toBeUndefined();
	});

	it("maps all tier variant IDs from environment", () => {
		const env = {
			LEMON_SQUEEZY_STORE_ID: "store",
			LEMON_SEEDLING_MONTHLY: "sm",
			LEMON_SEEDLING_ANNUAL: "sa",
			LEMON_SAPLING_MONTHLY: "pm",
			LEMON_SAPLING_ANNUAL: "pa",
			LEMON_OAK_MONTHLY: "om",
			LEMON_OAK_ANNUAL: "oa",
			LEMON_EVERGREEN_MONTHLY: "em",
			LEMON_EVERGREEN_ANNUAL: "ea",
		};
		const config = createCheckoutConfigFromEnv(env);
		expect(config.products.seedling).toEqual({
			monthlyVariantId: "sm",
			annualVariantId: "sa",
		});
		expect(config.products.sapling).toEqual({
			monthlyVariantId: "pm",
			annualVariantId: "pa",
		});
		expect(config.products.oak).toEqual({
			monthlyVariantId: "om",
			annualVariantId: "oa",
		});
		expect(config.products.evergreen).toEqual({
			monthlyVariantId: "em",
			annualVariantId: "ea",
		});
	});

	it("excludes wanderer tier from products", () => {
		const config = createCheckoutConfigFromEnv({
			LEMON_SQUEEZY_STORE_ID: "store",
		});
		// Wanderer should not be in products at all (or be undefined)
		expect(config.products.wanderer).toBeUndefined();
	});
});
