/**
 * Webhook Sanitizer Tests
 *
 * Tests PII stripping and payload sanitization for webhook storage.
 * Ensures GDPR/PCI DSS compliance by verifying sensitive data removal.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  sanitizeWebhookPayload,
  detectPiiFields,
  calculateWebhookExpiry,
  type SanitizedWebhookPayload,
} from "./webhook-sanitizer";

describe("Webhook Sanitizer", () => {
  // ==========================================================================
  // Test Data
  // ==========================================================================

  const createMockPayload = (overrides: Record<string, unknown> = {}) => ({
    meta: {
      event_name: "subscription_created",
      test_mode: true,
      custom_data: { onboarding_id: "abc123" },
      webhook_id: "wh_123",
    },
    data: {
      id: "sub_123456",
      type: "subscriptions",
      attributes: {
        // Safe fields
        customer_id: 12345,
        product_id: 67890,
        variant_id: 11111,
        subscription_id: 22222,
        status: "active",
        product_name: "Oak Plan",
        variant_name: "Monthly",
        created_at: "2024-01-15T10:00:00Z",
        updated_at: "2024-01-15T10:00:00Z",
        renews_at: "2024-02-15T10:00:00Z",
        ends_at: null,
        total: 999,
        currency: "USD",

        // PII fields (should be stripped)
        user_email: "user@example.com",
        user_name: "John Doe",
        card_brand: "visa",
        card_last_four: "4242",
        billing_address: {
          city: "San Francisco",
          region: "CA",
          country: "US",
          zip: "94102",
        },
        urls: {
          receipt_url: "https://pay.lemonsqueezy.com/receipt/123",
          customer_portal_url: "https://pay.lemonsqueezy.com/portal/123",
        },
        ...overrides,
      },
    },
  });

  // ==========================================================================
  // sanitizeWebhookPayload Tests
  // ==========================================================================

  describe("sanitizeWebhookPayload", () => {
    it("returns null for invalid input", () => {
      expect(sanitizeWebhookPayload(null)).toBeNull();
      expect(sanitizeWebhookPayload(undefined)).toBeNull();
      expect(sanitizeWebhookPayload("string")).toBeNull();
      expect(sanitizeWebhookPayload(123)).toBeNull();
      expect(sanitizeWebhookPayload({})).toBeNull();
      expect(sanitizeWebhookPayload({ meta: {} })).toBeNull();
      expect(sanitizeWebhookPayload({ data: {} })).toBeNull();
    });

    it("preserves safe meta fields", () => {
      const payload = createMockPayload();
      const sanitized = sanitizeWebhookPayload(payload);

      expect(sanitized).not.toBeNull();
      expect(sanitized!.meta.event_name).toBe("subscription_created");
      expect(sanitized!.meta.test_mode).toBe(true);
      expect(sanitized!.meta.custom_data).toEqual({ onboarding_id: "abc123" });
    });

    it("preserves safe data fields", () => {
      const payload = createMockPayload();
      const sanitized = sanitizeWebhookPayload(payload);

      expect(sanitized!.data.id).toBe("sub_123456");
      expect(sanitized!.data.type).toBe("subscriptions");
    });

    it("preserves safe attributes", () => {
      const payload = createMockPayload();
      const sanitized = sanitizeWebhookPayload(payload);

      const attrs = sanitized!.data.attributes;
      expect(attrs.customer_id).toBe(12345);
      expect(attrs.product_id).toBe(67890);
      expect(attrs.variant_id).toBe(11111);
      expect(attrs.status).toBe("active");
      expect(attrs.product_name).toBe("Oak Plan");
      expect(attrs.variant_name).toBe("Monthly");
      expect(attrs.created_at).toBe("2024-01-15T10:00:00Z");
      expect(attrs.renews_at).toBe("2024-02-15T10:00:00Z");
      expect(attrs.total).toBe(999);
      expect(attrs.currency).toBe("USD");
    });

    it("strips user email (PII)", () => {
      const payload = createMockPayload();
      const sanitized = sanitizeWebhookPayload(payload);

      expect(sanitized!.data.attributes).not.toHaveProperty("user_email");
    });

    it("strips user name (PII)", () => {
      const payload = createMockPayload();
      const sanitized = sanitizeWebhookPayload(payload);

      expect(sanitized!.data.attributes).not.toHaveProperty("user_name");
    });

    it("strips card brand (PCI DSS)", () => {
      const payload = createMockPayload();
      const sanitized = sanitizeWebhookPayload(payload);

      expect(sanitized!.data.attributes).not.toHaveProperty("card_brand");
    });

    it("strips card last four (PCI DSS)", () => {
      const payload = createMockPayload();
      const sanitized = sanitizeWebhookPayload(payload);

      expect(sanitized!.data.attributes).not.toHaveProperty("card_last_four");
    });

    it("strips billing address (GDPR)", () => {
      const payload = createMockPayload();
      const sanitized = sanitizeWebhookPayload(payload);

      expect(sanitized!.data.attributes).not.toHaveProperty("billing_address");
    });

    it("strips urls object (contains sensitive links)", () => {
      const payload = createMockPayload();
      const sanitized = sanitizeWebhookPayload(payload);

      expect(sanitized!.data.attributes).not.toHaveProperty("urls");
    });

    it("handles first_subscription_item safely", () => {
      const payload = createMockPayload({
        first_subscription_item: {
          id: 123,
          price_id: 456,
          quantity: 1,
          created_at: "2024-01-15T10:00:00Z", // should be stripped
        },
      });
      const sanitized = sanitizeWebhookPayload(payload);

      const item = sanitized!.data.attributes.first_subscription_item;
      expect(item).toEqual({
        id: 123,
        price_id: 456,
        quantity: 1,
      });
    });

    it("handles missing attributes gracefully", () => {
      const payload = {
        meta: { event_name: "test" },
        data: { id: "123", type: "test" },
      };
      const sanitized = sanitizeWebhookPayload(payload);

      expect(sanitized).not.toBeNull();
      expect(sanitized!.data.attributes).toBeUndefined();
    });
  });

  // ==========================================================================
  // detectPiiFields Tests
  // ==========================================================================

  describe("detectPiiFields", () => {
    it("returns empty array for clean payload", () => {
      const cleanPayload = {
        meta: { event_name: "test" },
        data: {
          id: "123",
          attributes: {
            customer_id: 123,
            product_name: "Test",
          },
        },
      };

      expect(detectPiiFields(cleanPayload)).toEqual([]);
    });

    it("detects user_email", () => {
      const payload = {
        data: { attributes: { user_email: "test@example.com" } },
      };

      const found = detectPiiFields(payload);
      expect(found).toContain("data.attributes.user_email");
    });

    it("detects user_name", () => {
      const payload = {
        data: { attributes: { user_name: "John Doe" } },
      };

      const found = detectPiiFields(payload);
      expect(found).toContain("data.attributes.user_name");
    });

    it("detects card_brand and card_last_four", () => {
      const payload = {
        data: {
          attributes: {
            card_brand: "visa",
            card_last_four: "4242",
          },
        },
      };

      const found = detectPiiFields(payload);
      expect(found).toContain("data.attributes.card_brand");
      expect(found).toContain("data.attributes.card_last_four");
    });

    it("detects billing_address", () => {
      const payload = {
        data: {
          attributes: {
            billing_address: { city: "SF" },
          },
        },
      };

      const found = detectPiiFields(payload);
      expect(found).toContain("data.attributes.billing_address");
    });

    it("detects nested PII fields", () => {
      const payload = {
        data: {
          attributes: {
            billing_address: {
              city: "SF",
              zip: "94102",
            },
          },
        },
      };

      const found = detectPiiFields(payload);
      expect(found).toContain("data.attributes.billing_address");
      expect(found).toContain("data.attributes.billing_address.city");
      expect(found).toContain("data.attributes.billing_address.zip");
    });

    it("returns empty array for null/undefined", () => {
      expect(detectPiiFields(null)).toEqual([]);
      expect(detectPiiFields(undefined)).toEqual([]);
    });
  });

  // ==========================================================================
  // calculateWebhookExpiry Tests
  // ==========================================================================

  describe("calculateWebhookExpiry", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("returns timestamp 120 days in the future", () => {
      const now = new Date("2024-01-15T12:00:00Z");
      vi.setSystemTime(now);

      const expiry = calculateWebhookExpiry();

      // 120 days = 120 * 24 * 60 * 60 = 10,368,000 seconds
      const nowUnix = Math.floor(now.getTime() / 1000);
      const expectedExpiry = nowUnix + 120 * 24 * 60 * 60;

      expect(expiry).toBe(expectedExpiry);
    });

    it("returns integer Unix timestamp", () => {
      const expiry = calculateWebhookExpiry();

      expect(Number.isInteger(expiry)).toBe(true);
    });

    it("returns timestamp in the future", () => {
      const now = Math.floor(Date.now() / 1000);
      const expiry = calculateWebhookExpiry();

      expect(expiry).toBeGreaterThan(now);
    });
  });

  // ==========================================================================
  // Integration / Real-world Scenarios
  // ==========================================================================

  describe("Real-world Scenarios", () => {
    it("sanitizes a subscription_created event", () => {
      const payload = createMockPayload();
      const sanitized = sanitizeWebhookPayload(payload);

      // Verify no PII leaked
      const piiFound = detectPiiFields(sanitized);
      expect(piiFound).toEqual([]);

      // Verify essential data preserved
      expect(sanitized!.meta.event_name).toBe("subscription_created");
      expect(sanitized!.data.attributes.customer_id).toBe(12345);
      expect(sanitized!.data.attributes.status).toBe("active");
    });

    it("preserves custom_data for onboarding linkage", () => {
      const payload = createMockPayload();
      const sanitized = sanitizeWebhookPayload(payload);

      // custom_data is essential for linking webhook to onboarding record
      expect(sanitized!.meta.custom_data).toEqual({ onboarding_id: "abc123" });
    });

    it("produces JSON-serializable output", () => {
      const payload = createMockPayload();
      const sanitized = sanitizeWebhookPayload(payload);

      // Should not throw
      const json = JSON.stringify(sanitized);
      const reparsed = JSON.parse(json);

      expect(reparsed).toEqual(sanitized);
    });
  });
});
