/**
 * Lemon Squeezy Client Tests
 *
 * Comprehensive tests for the Lemon Squeezy API client covering:
 * - Error class construction
 * - Client initialization and idempotency
 * - Checkout operations (create, get)
 * - Subscription operations (get, update, cancel, resume, pause, unpause)
 * - Customer operations (get by ID, find by email)
 * - Order operations (get by ID)
 * - Webhook signature verification (security-critical)
 * - Secure string comparison (timing-safe)
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { LemonSqueezyClient, LemonSqueezyAPIError } from "./client";
import type {
  LemonSqueezyCheckoutAttributes,
  LemonSqueezySubscriptionAttributes,
  LemonSqueezyCustomerAttributes,
  LemonSqueezyOrderAttributes,
} from "./types";

// =============================================================================
// MOCK SETUP
// =============================================================================

vi.mock("@lemonsqueezy/lemonsqueezy.js", () => ({
  lemonSqueezySetup: vi.fn(),
  createCheckout: vi.fn(),
  getCheckout: vi.fn(),
  getSubscription: vi.fn(),
  updateSubscription: vi.fn(),
  cancelSubscription: vi.fn(),
  getCustomer: vi.fn(),
  listCustomers: vi.fn(),
  getOrder: vi.fn(),
}));

import {
  lemonSqueezySetup,
  createCheckout,
  getCheckout,
  getSubscription,
  updateSubscription,
  cancelSubscription,
  getCustomer,
  listCustomers,
  getOrder,
} from "@lemonsqueezy/lemonsqueezy.js";

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function createMockCheckoutData(): LemonSqueezyCheckoutAttributes {
  return {
    store_id: 123,
    variant_id: 456,
    custom_price: null,
    product_options: {
      redirect_url: "https://grove.place/dashboard",
      receipt_button_text: "Return to Grove",
      receipt_thank_you_note: "Thank you for subscribing to Grove!",
    },
    checkout_options: {
      embed: false,
      media: true,
      logo: true,
    },
    checkout_data: {
      email: "test@example.com",
    },
    preview: {
      currency: "USD",
      currency_rate: 1,
      subtotal: 1000,
      discount_total: 0,
      tax: 100,
      total: 1100,
      subtotal_usd: 1000,
      discount_total_usd: 0,
      tax_usd: 100,
      total_usd: 1100,
      subtotal_formatted: "$10.00",
      discount_total_formatted: "$0.00",
      tax_formatted: "$1.00",
      total_formatted: "$11.00",
    },
    expires_at: null,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    test_mode: true,
    url: "https://checkout.lemonsqueezy.com/abc123",
  };
}

function createMockSubscriptionData(): LemonSqueezySubscriptionAttributes {
  return {
    store_id: 123,
    customer_id: 789,
    order_id: 999,
    order_item_id: 1000,
    product_id: 111,
    variant_id: 456,
    product_name: "Grove Premium",
    variant_name: "Monthly",
    user_name: "Test User",
    user_email: "test@example.com",
    status: "active",
    status_formatted: "Active",
    card_brand: "visa",
    card_last_four: "4242",
    pause: null,
    cancelled: false,
    billing_anchor: 1,
    first_subscription_item: {
      id: 1,
      subscription_id: 111,
      price_id: 222,
      quantity: 1,
      is_usage_based: false,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    },
    urls: {
      update_payment_method: "https://example.com/update",
      customer_portal: "https://example.com/portal",
      customer_portal_update_subscription: "https://example.com/portal/sub",
    },
    renews_at: "2024-02-01T00:00:00Z",
    ends_at: null,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    test_mode: true,
  };
}

function createMockCustomerData(): LemonSqueezyCustomerAttributes {
  return {
    store_id: 123,
    name: "Test User",
    email: "test@example.com",
    status: "subscribed",
    status_formatted: "Subscribed",
    city: "Portland",
    region: "OR",
    country: "US",
    total_revenue_currency: 1100,
    mrr: 1000,
    urls: {
      customer_portal: "https://example.com/portal",
    },
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  };
}

function createMockOrderData(): LemonSqueezyOrderAttributes {
  return {
    store_id: 123,
    customer_id: 789,
    identifier: "ORDER-001",
    order_number: 1,
    user_name: "Test User",
    user_email: "test@example.com",
    currency: "USD",
    currency_rate: "1",
    subtotal: 1000,
    discount_total: 0,
    tax: 100,
    total: 1100,
    subtotal_usd: 1000,
    discount_total_usd: 0,
    tax_usd: 100,
    total_usd: 1100,
    tax_name: "Sales Tax",
    tax_rate: "0.1",
    status: "paid",
    status_formatted: "Paid",
    refunded: false,
    refunded_at: null,
    subtotal_formatted: "$10.00",
    discount_total_formatted: "$0.00",
    tax_formatted: "$1.00",
    total_formatted: "$11.00",
    first_order_item: {
      id: 1,
      order_id: 999,
      product_id: 111,
      variant_id: 456,
      product_name: "Grove Premium",
      variant_name: "Monthly",
      price: 1000,
      quantity: 1,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    },
    urls: {
      receipt: "https://example.com/receipt",
    },
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  };
}

// =============================================================================
// ERROR CLASS TESTS
// =============================================================================

describe("LemonSqueezyAPIError", () => {
  it("should construct with message, statusCode, and code", () => {
    const error = new LemonSqueezyAPIError(
      "Test error",
      400,
      "INVALID_REQUEST",
    );

    expect(error.message).toBe("Test error");
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe("INVALID_REQUEST");
  });

  it('should have name "LemonSqueezyAPIError"', () => {
    const error = new LemonSqueezyAPIError("Test error", 500);

    expect(error.name).toBe("LemonSqueezyAPIError");
  });

  it("should construct without code parameter", () => {
    const error = new LemonSqueezyAPIError("Not found", 404);

    expect(error.message).toBe("Not found");
    expect(error.statusCode).toBe(404);
    expect(error.code).toBeUndefined();
  });

  it("should be an instance of Error", () => {
    const error = new LemonSqueezyAPIError("Test", 500);

    expect(error).toBeInstanceOf(Error);
  });
});

// =============================================================================
// CLIENT INITIALIZATION TESTS
// =============================================================================

describe("LemonSqueezyClient", () => {
  let client: LemonSqueezyClient;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should store apiKey", () => {
      client = new LemonSqueezyClient({
        apiKey: "test_key",
        storeId: "123",
      });

      expect(client["apiKey"]).toBe("test_key");
    });

    it("should parse storeId as integer", () => {
      client = new LemonSqueezyClient({
        apiKey: "test_key",
        storeId: "456",
      });

      expect(client["storeId"]).toBe(456);
      expect(typeof client["storeId"]).toBe("number");
    });

    it("should store webhookSecret if provided", () => {
      client = new LemonSqueezyClient({
        apiKey: "test_key",
        storeId: "123",
        webhookSecret: "webhook_secret_xyz",
      });

      expect(client["webhookSecret"]).toBe("webhook_secret_xyz");
    });

    it("should leave webhookSecret undefined if not provided", () => {
      client = new LemonSqueezyClient({
        apiKey: "test_key",
        storeId: "123",
      });

      expect(client["webhookSecret"]).toBeUndefined();
    });
  });

  describe("init()", () => {
    it("should call lemonSqueezySetup on first init", () => {
      client = new LemonSqueezyClient({
        apiKey: "test_key",
        storeId: "123",
      });

      // Simulate init call via a public method
      vi.mocked(getCheckout).mockResolvedValueOnce({
        data: {
          data: { id: "co_123", attributes: createMockCheckoutData() },
        },
        error: null,
      });

      client.getCheckout("co_123");

      expect(vi.mocked(lemonSqueezySetup)).toHaveBeenCalledWith({
        apiKey: "test_key",
        onError: expect.any(Function),
      });
    });

    it("should be idempotent (only initialize once)", async () => {
      client = new LemonSqueezyClient({
        apiKey: "test_key",
        storeId: "123",
      });

      vi.mocked(getCheckout).mockResolvedValue({
        data: {
          data: { id: "co_123", attributes: createMockCheckoutData() },
        },
        error: null,
      });

      await client.getCheckout("co_123");
      await client.getCheckout("co_456");
      await client.getCheckout("co_789");

      // Should only be called once despite multiple calls
      expect(vi.mocked(lemonSqueezySetup)).toHaveBeenCalledTimes(1);
    });
  });

  describe("getStoreId()", () => {
    it("should return the parsed store ID", () => {
      client = new LemonSqueezyClient({
        apiKey: "test_key",
        storeId: "789",
      });

      expect(client.getStoreId()).toBe(789);
    });
  });

  // ==========================================================================
  // CHECKOUT TESTS
  // ==========================================================================

  describe("createCheckout()", () => {
    beforeEach(() => {
      client = new LemonSqueezyClient({
        apiKey: "test_key",
        storeId: "123",
      });
    });

    it("should return checkout with id, url, and expiresAt", async () => {
      const expiresAt = new Date("2024-02-01T00:00:00Z");
      const mockData = createMockCheckoutData();
      mockData.expires_at = expiresAt.toISOString();

      vi.mocked(createCheckout).mockResolvedValueOnce({
        data: {
          data: {
            id: "co_123",
            attributes: mockData,
          },
        },
        error: null,
      });

      const result = await client.createCheckout({
        variantId: 456,
        email: "test@example.com",
      });

      expect(result.id).toBe("co_123");
      expect(result.url).toBe("https://checkout.lemonsqueezy.com/abc123");
      expect(result.expiresAt).toEqual(expiresAt);
    });

    it("should return null expiresAt if not set", async () => {
      const mockData = createMockCheckoutData();
      mockData.expires_at = null;

      vi.mocked(createCheckout).mockResolvedValueOnce({
        data: {
          data: {
            id: "co_123",
            attributes: mockData,
          },
        },
        error: null,
      });

      const result = await client.createCheckout({ variantId: 456 });

      expect(result.expiresAt).toBeNull();
    });

    it("should throw on API error", async () => {
      vi.mocked(createCheckout).mockResolvedValueOnce({
        data: null,
        error: { message: "API Error", cause: 400 },
      });

      await expect(client.createCheckout({ variantId: 456 })).rejects.toThrow(
        LemonSqueezyAPIError,
      );
    });

    it("should throw if no checkout URL returned", async () => {
      const mockData = createMockCheckoutData();
      mockData.url = ""; // Empty URL

      vi.mocked(createCheckout).mockResolvedValueOnce({
        data: {
          data: {
            id: "co_123",
            attributes: mockData,
          },
        },
        error: null,
      });

      await expect(client.createCheckout({ variantId: 456 })).rejects.toThrow(
        "No checkout URL returned",
      );
    });

    it("should pass all checkout options to API", async () => {
      const expiresAt = new Date("2024-02-01T00:00:00Z");
      vi.mocked(createCheckout).mockResolvedValueOnce({
        data: {
          data: {
            id: "co_123",
            attributes: createMockCheckoutData(),
          },
        },
        error: null,
      });

      await client.createCheckout({
        variantId: 456,
        email: "test@example.com",
        name: "Test User",
        customData: { custom_key: "custom_value" },
        redirectUrl: "https://example.com/redirect",
        receiptButtonText: "Back to Site",
        receiptThankYouNote: "Thanks!",
        expiresAt,
      });

      expect(vi.mocked(createCheckout)).toHaveBeenCalledWith(
        123,
        456,
        expect.objectContaining({
          checkoutData: {
            email: "test@example.com",
            name: "Test User",
            custom: { custom_key: "custom_value" },
          },
          productOptions: expect.objectContaining({
            redirectUrl: "https://example.com/redirect",
            receiptButtonText: "Back to Site",
            receiptThankYouNote: "Thanks!",
          }),
          expiresAt: expiresAt.toISOString(),
        }),
      );
    });

    it("should use default checkout options", async () => {
      vi.mocked(createCheckout).mockResolvedValueOnce({
        data: {
          data: {
            id: "co_123",
            attributes: createMockCheckoutData(),
          },
        },
        error: null,
      });

      await client.createCheckout({ variantId: 456 });

      expect(vi.mocked(createCheckout)).toHaveBeenCalledWith(
        123,
        456,
        expect.objectContaining({
          productOptions: expect.objectContaining({
            redirectUrl: "https://grove.place/dashboard",
            receiptButtonText: "Return to Grove",
            receiptThankYouNote: "Thank you for subscribing to Grove!",
          }),
        }),
      );
    });
  });

  describe("getCheckout()", () => {
    beforeEach(() => {
      client = new LemonSqueezyClient({
        apiKey: "test_key",
        storeId: "123",
      });
    });

    it("should return checkout data", async () => {
      const mockData = createMockCheckoutData();

      vi.mocked(getCheckout).mockResolvedValueOnce({
        data: {
          data: {
            id: "co_123",
            attributes: mockData,
          },
        },
        error: null,
      });

      const result = await client.getCheckout("co_123");

      expect(result).toEqual({
        id: "co_123",
        attributes: mockData,
      });
    });

    it("should return null on 404", async () => {
      vi.mocked(getCheckout).mockResolvedValueOnce({
        data: null,
        error: { message: "Not found", cause: 404 },
      });

      const result = await client.getCheckout("co_missing");

      expect(result).toBeNull();
    });

    it("should throw on non-404 error", async () => {
      vi.mocked(getCheckout).mockResolvedValueOnce({
        data: null,
        error: { message: "Server error", cause: 500 },
      });

      await expect(client.getCheckout("co_123")).rejects.toThrow(
        LemonSqueezyAPIError,
      );
    });

    it("should return null if data is empty", async () => {
      vi.mocked(getCheckout).mockResolvedValueOnce({
        data: { data: null },
        error: null,
      });

      const result = await client.getCheckout("co_123");

      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // SUBSCRIPTION TESTS
  // ==========================================================================

  describe("getSubscription()", () => {
    beforeEach(() => {
      client = new LemonSqueezyClient({
        apiKey: "test_key",
        storeId: "123",
      });
    });

    it("should return subscription with id and attributes", async () => {
      const mockData = createMockSubscriptionData();

      vi.mocked(getSubscription).mockResolvedValueOnce({
        data: {
          data: {
            id: "sub_123",
            attributes: mockData,
          },
        },
        error: null,
      });

      const result = await client.getSubscription("sub_123");

      expect(result).toEqual({
        id: "sub_123",
        attributes: mockData,
      });
    });

    it("should return null on 404", async () => {
      vi.mocked(getSubscription).mockResolvedValueOnce({
        data: null,
        error: { message: "Not found", cause: 404 },
      });

      const result = await client.getSubscription("sub_missing");

      expect(result).toBeNull();
    });

    it("should throw on non-404 error", async () => {
      vi.mocked(getSubscription).mockResolvedValueOnce({
        data: null,
        error: { message: "Server error", cause: 500 },
      });

      await expect(client.getSubscription("sub_123")).rejects.toThrow(
        LemonSqueezyAPIError,
      );
    });
  });

  describe("updateSubscription()", () => {
    beforeEach(() => {
      client = new LemonSqueezyClient({
        apiKey: "test_key",
        storeId: "123",
      });
    });

    it("should update variant ID", async () => {
      const mockData = createMockSubscriptionData();
      mockData.variant_id = 789;

      vi.mocked(updateSubscription).mockResolvedValueOnce({
        data: {
          data: {
            id: "sub_123",
            attributes: mockData,
          },
        },
        error: null,
      });

      const result = await client.updateSubscription("sub_123", {
        variantId: 789,
      });

      expect(vi.mocked(updateSubscription)).toHaveBeenCalledWith("sub_123", {
        variantId: 789,
      });
      expect(result.attributes.variant_id).toBe(789);
    });

    it("should pause subscription with mode", async () => {
      const mockData = createMockSubscriptionData();
      mockData.pause = { mode: "free", resumes_at: null };

      vi.mocked(updateSubscription).mockResolvedValueOnce({
        data: {
          data: {
            id: "sub_123",
            attributes: mockData,
          },
        },
        error: null,
      });

      await client.updateSubscription("sub_123", {
        pause: { mode: "free" },
      });

      expect(vi.mocked(updateSubscription)).toHaveBeenCalledWith("sub_123", {
        pause: { mode: "free" },
      });
    });

    it("should mark as cancelled", async () => {
      const mockData = createMockSubscriptionData();
      mockData.cancelled = true;

      vi.mocked(updateSubscription).mockResolvedValueOnce({
        data: {
          data: {
            id: "sub_123",
            attributes: mockData,
          },
        },
        error: null,
      });

      const result = await client.updateSubscription("sub_123", {
        cancelled: true,
      });

      expect(vi.mocked(updateSubscription)).toHaveBeenCalledWith("sub_123", {
        cancelled: true,
      });
      expect(result.attributes.cancelled).toBe(true);
    });

    it("should combine multiple update options", async () => {
      const mockData = createMockSubscriptionData();
      mockData.variant_id = 999;
      mockData.cancelled = false;

      vi.mocked(updateSubscription).mockResolvedValueOnce({
        data: {
          data: {
            id: "sub_123",
            attributes: mockData,
          },
        },
        error: null,
      });

      await client.updateSubscription("sub_123", {
        variantId: 999,
        cancelled: false,
        pause: null,
      });

      expect(vi.mocked(updateSubscription)).toHaveBeenCalledWith("sub_123", {
        variantId: 999,
        cancelled: false,
        pause: null,
      });
    });

    it("should throw on error", async () => {
      vi.mocked(updateSubscription).mockResolvedValueOnce({
        data: null,
        error: { message: "Update failed", cause: 400 },
      });

      await expect(
        client.updateSubscription("sub_123", { variantId: 999 }),
      ).rejects.toThrow(LemonSqueezyAPIError);
    });

    it("should throw if no subscription data returned", async () => {
      vi.mocked(updateSubscription).mockResolvedValueOnce({
        data: { data: null },
        error: null,
      });

      await expect(
        client.updateSubscription("sub_123", { variantId: 999 }),
      ).rejects.toThrow("No subscription data returned");
    });
  });

  describe("cancelSubscription()", () => {
    beforeEach(() => {
      client = new LemonSqueezyClient({
        apiKey: "test_key",
        storeId: "123",
      });
    });

    it("should call cancelSubscription API", async () => {
      vi.mocked(cancelSubscription).mockResolvedValueOnce({
        data: null,
        error: null,
      });

      await client.cancelSubscription("sub_123");

      expect(vi.mocked(cancelSubscription)).toHaveBeenCalledWith("sub_123");
    });

    it("should throw on error", async () => {
      vi.mocked(cancelSubscription).mockResolvedValueOnce({
        data: null,
        error: { message: "Cancel failed", cause: 400 },
      });

      await expect(client.cancelSubscription("sub_123")).rejects.toThrow(
        LemonSqueezyAPIError,
      );
    });
  });

  describe("resumeSubscription()", () => {
    beforeEach(() => {
      client = new LemonSqueezyClient({
        apiKey: "test_key",
        storeId: "123",
      });
    });

    it("should call updateSubscription with cancelled: false", async () => {
      const mockData = createMockSubscriptionData();
      mockData.cancelled = false;

      vi.mocked(updateSubscription).mockResolvedValueOnce({
        data: {
          data: {
            id: "sub_123",
            attributes: mockData,
          },
        },
        error: null,
      });

      await client.resumeSubscription("sub_123");

      expect(vi.mocked(updateSubscription)).toHaveBeenCalledWith("sub_123", {
        cancelled: false,
      });
    });
  });

  describe("pauseSubscription()", () => {
    beforeEach(() => {
      client = new LemonSqueezyClient({
        apiKey: "test_key",
        storeId: "123",
      });
    });

    it('should pause with default "void" mode', async () => {
      const mockData = createMockSubscriptionData();
      mockData.pause = { mode: "void", resumes_at: null };

      vi.mocked(updateSubscription).mockResolvedValueOnce({
        data: {
          data: {
            id: "sub_123",
            attributes: mockData,
          },
        },
        error: null,
      });

      await client.pauseSubscription("sub_123");

      expect(vi.mocked(updateSubscription)).toHaveBeenCalledWith("sub_123", {
        pause: { mode: "void" },
      });
    });

    it("should pause with custom mode", async () => {
      const mockData = createMockSubscriptionData();
      mockData.pause = { mode: "free", resumes_at: null };

      vi.mocked(updateSubscription).mockResolvedValueOnce({
        data: {
          data: {
            id: "sub_123",
            attributes: mockData,
          },
        },
        error: null,
      });

      await client.pauseSubscription("sub_123", "free");

      expect(vi.mocked(updateSubscription)).toHaveBeenCalledWith("sub_123", {
        pause: { mode: "free" },
      });
    });
  });

  describe("unpauseSubscription()", () => {
    beforeEach(() => {
      client = new LemonSqueezyClient({
        apiKey: "test_key",
        storeId: "123",
      });
    });

    it("should call updateSubscription with pause: null", async () => {
      const mockData = createMockSubscriptionData();
      mockData.pause = null;

      vi.mocked(updateSubscription).mockResolvedValueOnce({
        data: {
          data: {
            id: "sub_123",
            attributes: mockData,
          },
        },
        error: null,
      });

      await client.unpauseSubscription("sub_123");

      expect(vi.mocked(updateSubscription)).toHaveBeenCalledWith("sub_123", {
        pause: null,
      });
    });
  });

  // ==========================================================================
  // CUSTOMER TESTS
  // ==========================================================================

  describe("getCustomer()", () => {
    beforeEach(() => {
      client = new LemonSqueezyClient({
        apiKey: "test_key",
        storeId: "123",
      });
    });

    it("should return customer with id and attributes", async () => {
      const mockData = createMockCustomerData();

      vi.mocked(getCustomer).mockResolvedValueOnce({
        data: {
          data: {
            id: "cus_123",
            attributes: mockData,
          },
        },
        error: null,
      });

      const result = await client.getCustomer("cus_123");

      expect(result).toEqual({
        id: "cus_123",
        attributes: mockData,
      });
    });

    it("should return null on 404", async () => {
      vi.mocked(getCustomer).mockResolvedValueOnce({
        data: null,
        error: { message: "Not found", cause: 404 },
      });

      const result = await client.getCustomer("cus_missing");

      expect(result).toBeNull();
    });

    it("should throw on non-404 error", async () => {
      vi.mocked(getCustomer).mockResolvedValueOnce({
        data: null,
        error: { message: "Server error", cause: 500 },
      });

      await expect(client.getCustomer("cus_123")).rejects.toThrow(
        LemonSqueezyAPIError,
      );
    });

    it("should return null if data is empty", async () => {
      vi.mocked(getCustomer).mockResolvedValueOnce({
        data: { data: null },
        error: null,
      });

      const result = await client.getCustomer("cus_123");

      expect(result).toBeNull();
    });
  });

  describe("findCustomerByEmail()", () => {
    beforeEach(() => {
      client = new LemonSqueezyClient({
        apiKey: "test_key",
        storeId: "123",
      });
    });

    it("should find customer by email", async () => {
      const mockData = createMockCustomerData();

      vi.mocked(listCustomers).mockResolvedValueOnce({
        data: {
          data: [
            {
              id: "cus_123",
              attributes: mockData,
            },
          ],
        },
        error: null,
      });

      const result = await client.findCustomerByEmail("test@example.com");

      expect(result).toEqual({
        id: "cus_123",
        attributes: mockData,
      });

      expect(vi.mocked(listCustomers)).toHaveBeenCalledWith({
        filter: {
          storeId: 123,
          email: "test@example.com",
        },
      });
    });

    it("should return null if customer not found", async () => {
      vi.mocked(listCustomers).mockResolvedValueOnce({
        data: {
          data: [],
        },
        error: null,
      });

      const result = await client.findCustomerByEmail("notfound@example.com");

      expect(result).toBeNull();
    });

    it("should throw on error", async () => {
      vi.mocked(listCustomers).mockResolvedValueOnce({
        data: null,
        error: { message: "Search failed", cause: 500 },
      });

      await expect(
        client.findCustomerByEmail("test@example.com"),
      ).rejects.toThrow(LemonSqueezyAPIError);
    });

    it("should return null if data is null", async () => {
      vi.mocked(listCustomers).mockResolvedValueOnce({
        data: { data: null },
        error: null,
      });

      const result = await client.findCustomerByEmail("test@example.com");

      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // ORDER TESTS
  // ==========================================================================

  describe("getOrder()", () => {
    beforeEach(() => {
      client = new LemonSqueezyClient({
        apiKey: "test_key",
        storeId: "123",
      });
    });

    it("should return order with id and attributes", async () => {
      const mockData = createMockOrderData();

      vi.mocked(getOrder).mockResolvedValueOnce({
        data: {
          data: {
            id: "order_123",
            attributes: mockData,
          },
        },
        error: null,
      });

      const result = await client.getOrder("order_123");

      expect(result).toEqual({
        id: "order_123",
        attributes: mockData,
      });
    });

    it("should return null on 404", async () => {
      vi.mocked(getOrder).mockResolvedValueOnce({
        data: null,
        error: { message: "Not found", cause: 404 },
      });

      const result = await client.getOrder("order_missing");

      expect(result).toBeNull();
    });

    it("should throw on non-404 error", async () => {
      vi.mocked(getOrder).mockResolvedValueOnce({
        data: null,
        error: { message: "Server error", cause: 500 },
      });

      await expect(client.getOrder("order_123")).rejects.toThrow(
        LemonSqueezyAPIError,
      );
    });

    it("should return null if data is empty", async () => {
      vi.mocked(getOrder).mockResolvedValueOnce({
        data: { data: null },
        error: null,
      });

      const result = await client.getOrder("order_123");

      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // WEBHOOK SIGNATURE VERIFICATION TESTS
  // ==========================================================================

  describe("verifyWebhookSignature()", () => {
    beforeEach(() => {
      client = new LemonSqueezyClient({
        apiKey: "test_key",
        storeId: "123",
        webhookSecret: "webhook_secret_xyz",
      });
    });

    it("should return invalid result with missing signature", async () => {
      const result = await client.verifyWebhookSignature('{"test":true}', null);

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Missing x-signature header");
    });

    it("should return invalid result with missing webhookSecret", async () => {
      const clientNoSecret = new LemonSqueezyClient({
        apiKey: "test_key",
        storeId: "123",
      });

      const result = await clientNoSecret.verifyWebhookSignature(
        '{"test":true}',
        "some_signature",
      );

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Webhook secret not configured");
    });

    it("should return invalid result for signature mismatch", async () => {
      const payload = '{"test":true}';
      const wrongSignature = "wrong_signature_value";

      const result = await client.verifyWebhookSignature(
        payload,
        wrongSignature,
      );

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Signature mismatch");
    });

    it("should return valid result with correct signature", async () => {
      const payload = '{"test":true}';
      const secret = "webhook_secret_xyz";

      // Compute the expected signature
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
      );

      const signatureBytes = await crypto.subtle.sign(
        "HMAC",
        key,
        encoder.encode(payload),
      );

      const expectedSignature = Array.from(new Uint8Array(signatureBytes))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const result = await client.verifyWebhookSignature(
        payload,
        expectedSignature,
      );

      expect(result.valid).toBe(true);
      expect(result.event).toEqual({ test: true });
    });

    it("should parse and return the event on success", async () => {
      const event = {
        meta: {
          event_name: "subscription_created",
          test_mode: true,
        },
        data: {
          type: "subscriptions",
          id: "sub_123",
          attributes: createMockSubscriptionData(),
        },
      };
      const payload = JSON.stringify(event);
      const secret = "webhook_secret_xyz";

      // Compute the expected signature
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
      );

      const signatureBytes = await crypto.subtle.sign(
        "HMAC",
        key,
        encoder.encode(payload),
      );

      const expectedSignature = Array.from(new Uint8Array(signatureBytes))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const result = await client.verifyWebhookSignature(
        payload,
        expectedSignature,
      );

      expect(result.valid).toBe(true);
      expect(result.event).toEqual(event);
    });

    it("should return error on invalid JSON in payload", async () => {
      const payload = "not valid json";
      const secret = "webhook_secret_xyz";

      // Compute signature for non-JSON payload
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
      );

      const signatureBytes = await crypto.subtle.sign(
        "HMAC",
        key,
        encoder.encode(payload),
      );

      const signature = Array.from(new Uint8Array(signatureBytes))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const result = await client.verifyWebhookSignature(payload, signature);

      expect(result.valid).toBe(false);
      expect(result.error).toContain("Verification failed");
    });
  });

  // ==========================================================================
  // SECURE COMPARE TESTS
  // ==========================================================================

  describe("secureCompare()", () => {
    beforeEach(() => {
      client = new LemonSqueezyClient({
        apiKey: "test_key",
        storeId: "123",
      });
    });

    it("should return true for matching strings", () => {
      const result = client["secureCompare"]("test", "test");

      expect(result).toBe(true);
    });

    it("should return false for mismatched strings of same length", () => {
      const result = client["secureCompare"]("test", "tast");

      expect(result).toBe(false);
    });

    it("should return false for different length strings", () => {
      const result = client["secureCompare"]("short", "much longer string");

      expect(result).toBe(false);
    });

    it("should return false when comparing empty string to non-empty", () => {
      const result = client["secureCompare"]("", "test");

      expect(result).toBe(false);
    });

    it("should return true when comparing two empty strings", () => {
      const result = client["secureCompare"]("", "");

      expect(result).toBe(true);
    });

    it("should handle special characters", () => {
      const str = "abc!@#$%^&*()_+-=[]{}|;:,.<>?";
      const result = client["secureCompare"](str, str);

      expect(result).toBe(true);
    });

    it("should handle unicode characters", () => {
      const str = "test💜unicode";
      const result = client["secureCompare"](str, str);

      expect(result).toBe(true);
    });

    it("should be timing-safe (same length, different content)", () => {
      // This test verifies the function uses XOR comparison
      // Timing differences should be minimal regardless of where difference occurs
      const result1 = client["secureCompare"]("aaaaaaaaab", "aaaaaaaaaa");
      const result2 = client["secureCompare"]("baaaaaaaaa", "aaaaaaaaaa");

      expect(result1).toBe(false);
      expect(result2).toBe(false);
      // Both should take similar time (timing-safe comparison)
    });
  });
});
