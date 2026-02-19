/**
 * LemonSqueezy Checkout URL Generation Tests
 *
 * Tests for checkout URL generation utilities.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getCheckoutUrl,
  getAllCheckoutUrls,
  createCheckoutConfigFromEnv,
  type CheckoutConfig,
} from "./checkout.js";

describe("Checkout URL Generation", () => {
  const mockConfig: CheckoutConfig = {
    storeId: "test-store",
    products: {
      seedling: {
        monthlyVariantId: "seedling-monthly-123",
        annualVariantId: "seedling-annual-456",
      },
      sapling: {
        monthlyVariantId: "sapling-monthly-789",
        annualVariantId: "sapling-annual-012",
      },
      oak: {
        monthlyVariantId: "oak-monthly-345",
        // No annual variant
      },
    },
  };

  describe("getCheckoutUrl", () => {
    it("generates valid LemonSqueezy URL for monthly billing", () => {
      const url = getCheckoutUrl(mockConfig, "seedling", "monthly");

      expect(url).toBe(
        "https://test-store.lemonsqueezy.com/checkout/buy/seedling-monthly-123",
      );
    });

    it("generates valid LemonSqueezy URL for annual billing", () => {
      const url = getCheckoutUrl(mockConfig, "seedling", "annual");

      expect(url).toBe(
        "https://test-store.lemonsqueezy.com/checkout/buy/seedling-annual-456",
      );
    });

    it("returns undefined for tier not in config", () => {
      const url = getCheckoutUrl(mockConfig, "free", "monthly");
      expect(url).toBeUndefined();
    });

    it("returns undefined for missing variant", () => {
      // oak has monthly but no annual
      const url = getCheckoutUrl(mockConfig, "oak", "annual");
      expect(url).toBeUndefined();
    });

    it("includes email in query params", () => {
      const url = getCheckoutUrl(mockConfig, "seedling", "monthly", {
        email: "user@example.com",
      });

      expect(url).toContain("checkout%5Bemail%5D=user%40example.com");
    });

    it("includes discount code in query params", () => {
      const url = getCheckoutUrl(mockConfig, "seedling", "monthly", {
        discountCode: "WELCOME10",
      });

      expect(url).toContain("checkout%5Bdiscount_code%5D=WELCOME10");
    });

    it("includes success URL in query params", () => {
      const url = getCheckoutUrl(mockConfig, "seedling", "monthly", {
        successUrl: "https://example.com/success",
      });

      expect(url).toContain(
        "checkout%5Bsuccess_url%5D=https%3A%2F%2Fexample.com%2Fsuccess",
      );
    });

    it("includes cancel URL in query params", () => {
      const url = getCheckoutUrl(mockConfig, "seedling", "monthly", {
        cancelUrl: "https://example.com/cancel",
      });

      expect(url).toContain(
        "checkout%5Bcancel_url%5D=https%3A%2F%2Fexample.com%2Fcancel",
      );
    });

    it("includes custom data in query params", () => {
      const url = getCheckoutUrl(mockConfig, "seedling", "monthly", {
        customData: {
          source: "landing-page",
          campaign: "spring-sale",
        },
      });

      expect(url).toContain("checkout%5Bcustom%5D%5Bsource%5D=landing-page");
      expect(url).toContain("checkout%5Bcustom%5D%5Bcampaign%5D=spring-sale");
    });

    it("combines multiple options", () => {
      const url = getCheckoutUrl(mockConfig, "seedling", "monthly", {
        email: "user@example.com",
        discountCode: "SAVE20",
        customData: { ref: "affiliate" },
      });

      expect(url).toContain("checkout%5Bemail%5D=user%40example.com");
      expect(url).toContain("checkout%5Bdiscount_code%5D=SAVE20");
      expect(url).toContain("checkout%5Bcustom%5D%5Bref%5D=affiliate");
    });

    describe("XSS validation for customData keys", () => {
      let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

      beforeEach(() => {
        consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      });

      afterEach(() => {
        consoleWarnSpy.mockRestore();
      });

      it("accepts valid alphanumeric keys", () => {
        const url = getCheckoutUrl(mockConfig, "seedling", "monthly", {
          customData: { valid_key: "value", "another-key": "value2" },
        });

        expect(url).toContain("checkout%5Bcustom%5D%5Bvalid_key%5D=value");
        expect(url).toContain("checkout%5Bcustom%5D%5Banother-key%5D=value2");
        expect(consoleWarnSpy).not.toHaveBeenCalled();
      });

      it("rejects keys with special characters", () => {
        const url = getCheckoutUrl(mockConfig, "seedling", "monthly", {
          customData: { "invalid<script>": "xss", valid: "ok" },
        });

        // Invalid key should be skipped
        expect(url).not.toContain("<script>");
        // Valid key should still be included
        expect(url).toContain("checkout%5Bcustom%5D%5Bvalid%5D=ok");
        // Warning should be logged
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining("Invalid custom data key"),
        );
      });

      it("rejects keys with spaces", () => {
        const url = getCheckoutUrl(mockConfig, "seedling", "monthly", {
          customData: { "key with spaces": "value" },
        });

        expect(url).not.toContain("key with spaces");
        expect(consoleWarnSpy).toHaveBeenCalled();
      });

      it("rejects keys with dots", () => {
        const url = getCheckoutUrl(mockConfig, "seedling", "monthly", {
          customData: { "key.with.dots": "value" },
        });

        expect(url).not.toContain("key.with.dots");
        expect(consoleWarnSpy).toHaveBeenCalled();
      });

      it("rejects keys with brackets", () => {
        const url = getCheckoutUrl(mockConfig, "seedling", "monthly", {
          customData: { "key[injection]": "value" },
        });

        expect(url).not.toContain("key[injection]");
        expect(consoleWarnSpy).toHaveBeenCalled();
      });
    });
  });

  describe("getAllCheckoutUrls", () => {
    it("returns URLs for all tiers", () => {
      const urls = getAllCheckoutUrls(mockConfig);

      expect(urls).toHaveProperty("free");
      expect(urls).toHaveProperty("seedling");
      expect(urls).toHaveProperty("sapling");
      expect(urls).toHaveProperty("oak");
      expect(urls).toHaveProperty("evergreen");
    });

    it("includes monthly and annual for configured tiers", () => {
      const urls = getAllCheckoutUrls(mockConfig);

      expect(urls.seedling.monthly).toBeDefined();
      expect(urls.seedling.annual).toBeDefined();
      expect(urls.sapling.monthly).toBeDefined();
      expect(urls.sapling.annual).toBeDefined();
    });

    it("returns undefined for unconfigured tiers/periods", () => {
      const urls = getAllCheckoutUrls(mockConfig);

      expect(urls.free.monthly).toBeUndefined();
      expect(urls.free.annual).toBeUndefined();
      expect(urls.oak.annual).toBeUndefined(); // No annual for oak in mock
      expect(urls.evergreen.monthly).toBeUndefined();
    });

    it("applies options to all generated URLs", () => {
      const urls = getAllCheckoutUrls(mockConfig, {
        email: "batch@example.com",
      });

      expect(urls.seedling.monthly).toContain(
        "checkout%5Bemail%5D=batch%40example.com",
      );
      expect(urls.sapling.annual).toContain(
        "checkout%5Bemail%5D=batch%40example.com",
      );
    });
  });

  describe("createCheckoutConfigFromEnv", () => {
    it("creates config with store ID from env", () => {
      const config = createCheckoutConfigFromEnv({
        LEMON_SQUEEZY_STORE_ID: "my-grove-store",
      });

      expect(config.storeId).toBe("my-grove-store");
    });

    it("defaults store ID to empty string if not set", () => {
      const config = createCheckoutConfigFromEnv({});

      expect(config.storeId).toBe("");
    });

    it("maps seedling variants from env", () => {
      const config = createCheckoutConfigFromEnv({
        LEMON_SEEDLING_MONTHLY: "seed-m-123",
        LEMON_SEEDLING_ANNUAL: "seed-a-456",
      });

      expect(config.products.seedling?.monthlyVariantId).toBe("seed-m-123");
      expect(config.products.seedling?.annualVariantId).toBe("seed-a-456");
    });

    it("maps sapling variants from env", () => {
      const config = createCheckoutConfigFromEnv({
        LEMON_SAPLING_MONTHLY: "sap-m-123",
        LEMON_SAPLING_ANNUAL: "sap-a-456",
      });

      expect(config.products.sapling?.monthlyVariantId).toBe("sap-m-123");
      expect(config.products.sapling?.annualVariantId).toBe("sap-a-456");
    });

    it("maps oak variants from env", () => {
      const config = createCheckoutConfigFromEnv({
        LEMON_OAK_MONTHLY: "oak-m-123",
        LEMON_OAK_ANNUAL: "oak-a-456",
      });

      expect(config.products.oak?.monthlyVariantId).toBe("oak-m-123");
      expect(config.products.oak?.annualVariantId).toBe("oak-a-456");
    });

    it("maps evergreen variants from env", () => {
      const config = createCheckoutConfigFromEnv({
        LEMON_EVERGREEN_MONTHLY: "ever-m-123",
        LEMON_EVERGREEN_ANNUAL: "ever-a-456",
      });

      expect(config.products.evergreen?.monthlyVariantId).toBe("ever-m-123");
      expect(config.products.evergreen?.annualVariantId).toBe("ever-a-456");
    });

    it("handles partial env (some variants undefined)", () => {
      const config = createCheckoutConfigFromEnv({
        LEMON_SQUEEZY_STORE_ID: "partial-store",
        LEMON_SEEDLING_MONTHLY: "seed-only",
        // No annual, no other tiers
      });

      expect(config.storeId).toBe("partial-store");
      expect(config.products.seedling?.monthlyVariantId).toBe("seed-only");
      expect(config.products.seedling?.annualVariantId).toBeUndefined();
      expect(config.products.sapling?.monthlyVariantId).toBeUndefined();
    });

    it("free tier has no products configured", () => {
      const config = createCheckoutConfigFromEnv({
        LEMON_SQUEEZY_STORE_ID: "test-store",
      });

      // Free tier should not be in products
      expect(config.products.free).toBeUndefined();
    });
  });
});
