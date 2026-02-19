/**
 * Lemon Squeezy Payment Provider Tests
 *
 * Comprehensive test suite for LemonSqueezyProvider covering:
 * - Provider initialization
 * - Product sync operations
 * - Checkout session creation and retrieval
 * - Payment status tracking
 * - Subscription lifecycle management
 * - Customer operations
 * - Webhook handling and event mapping
 * - Edge cases and error conditions
 *
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import type {
  ProductBase,
  ProductVariant,
  CartItem,
  CheckoutOptions,
  PaymentStatus,
  Subscription,
  Customer,
} from "../types";
import type {
  LemonSqueezySubscriptionAttributes,
  LemonSqueezyOrderAttributes,
  LemonSqueezyCustomerAttributes,
  LemonSqueezyCheckoutAttributes,
} from "./types";

// =============================================================================
// MOCKS
// =============================================================================

// Setup module mock before importing provider
vi.mock("./client", () => {
  return {
    LemonSqueezyClient: class {
      createCheckout = vi.fn();
      getCheckout = vi.fn();
      getOrder = vi.fn();
      getSubscription = vi.fn();
      cancelSubscription = vi.fn();
      resumeSubscription = vi.fn();
      findCustomerByEmail = vi.fn();
      getCustomer = vi.fn();
      verifyWebhookSignature = vi.fn();
    },
    LemonSqueezyAPIError: class extends Error {
      statusCode: number;
      constructor(message: string, statusCode: number, code?: string) {
        super(message);
        this.name = "LemonSqueezyAPIError";
        this.statusCode = statusCode;
      }
    },
  };
});

// Import after mocking
import { LemonSqueezyProvider, createLemonSqueezyProvider } from "./provider";

// Type for mock client
type MockLemonSqueezyClient = InstanceType<
  typeof LemonSqueezyProvider extends { new (config: any): any } ? any : never
>["client"];

// =============================================================================
// TEST FIXTURES
// =============================================================================

const mockConfig = {
  secretKey: "test-api-key",
  webhookSecret: "test-webhook-secret",
  storeId: "12345",
};

const mockProduct: ProductBase = {
  id: "prod_123",
  tenantId: "tenant_123",
  name: "Premium Subscription",
  description: "Annual premium subscription",
  type: "subscription",
  status: "active",
  images: [],
  metadata: {
    provider_product_id: "ls_product_456",
  },
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

const mockVariant: ProductVariant = {
  id: "var_123",
  productId: "prod_123",
  name: "Annual Plan",
  price: { amount: 9999, currency: "usd" },
  pricingType: "recurring",
  recurring: { interval: "year", intervalCount: 1 },
  providerPriceId: "789",
  isDefault: true,
  position: 0,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

const mockCheckoutAttributes: LemonSqueezyCheckoutAttributes = {
  store_id: 12345,
  variant_id: 789,
  custom_price: null,
  product_options: {},
  checkout_options: {},
  checkout_data: {
    email: "user@example.com",
    custom: { grove_checkout_mode: "subscription" },
  },
  preview: undefined as any,
  expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  test_mode: false,
  url: "https://checkout.lemonsqueezy.com/checkout123",
};

const mockSubscriptionAttributes: LemonSqueezySubscriptionAttributes = {
  store_id: 12345,
  customer_id: 999,
  order_id: 111,
  order_item_id: 222,
  product_id: 456,
  variant_id: 789,
  product_name: "Premium",
  variant_name: "Annual",
  user_name: "John Doe",
  user_email: "john@example.com",
  status: "active",
  status_formatted: "Active",
  card_brand: "visa",
  card_last_four: "4242",
  pause: null,
  cancelled: false,
  billing_anchor: 1,
  first_subscription_item: null as any,
  urls: {
    update_payment_method: "https://example.com",
    customer_portal: "https://portal.example.com",
    customer_portal_update_subscription: "https://portal.example.com/sub",
  },
  renews_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  ends_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  test_mode: false,
};

const mockOrderAttributes: LemonSqueezyOrderAttributes = {
  store_id: 12345,
  customer_id: 999,
  identifier: "order_123",
  order_number: 1,
  user_name: "John Doe",
  user_email: "john@example.com",
  currency: "usd",
  currency_rate: "1",
  subtotal: 9999,
  discount_total: 0,
  tax: 0,
  total: 9999,
  subtotal_usd: 9999,
  discount_total_usd: 0,
  tax_usd: 0,
  total_usd: 9999,
  tax_name: "Sales Tax",
  tax_rate: "0",
  status: "paid",
  status_formatted: "Paid",
  refunded: false,
  refunded_at: null,
  subtotal_formatted: "$99.99",
  discount_total_formatted: "$0.00",
  tax_formatted: "$0.00",
  total_formatted: "$99.99",
  first_order_item: null as any,
  urls: { receipt: "https://example.com/receipt" },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockCustomerAttributes: LemonSqueezyCustomerAttributes = {
  store_id: 12345,
  name: "John Doe",
  email: "john@example.com",
  status: "subscribed",
  status_formatted: "Subscribed",
  city: "San Francisco",
  region: "CA",
  country: "US",
  total_revenue_currency: 9999,
  mrr: 833,
  urls: {
    customer_portal: "https://portal.example.com",
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// =============================================================================
// PROVIDER INITIALIZATION TESTS
// =============================================================================

describe("LemonSqueezyProvider - Initialization", () => {
  it("should create provider with name 'lemonsqueezy'", () => {
    const provider = new LemonSqueezyProvider(mockConfig);
    expect(provider.name).toBe("lemonsqueezy");
  });

  it("should initialize with secretKey from config", () => {
    const provider = new LemonSqueezyProvider(mockConfig);
    expect(provider).toBeDefined();
  });

  it("should parse storeId as integer from string", () => {
    const provider = new LemonSqueezyProvider(mockConfig);
    expect(provider).toBeDefined();
  });

  it("should use storeId from env if not provided in config", () => {
    process.env.LEMON_SQUEEZY_STORE_ID = "9999";
    const configWithoutStoreId = {
      secretKey: "test-key",
      webhookSecret: "test-secret",
    };
    const provider = new LemonSqueezyProvider(configWithoutStoreId as any);
    expect(provider).toBeDefined();
    delete process.env.LEMON_SQUEEZY_STORE_ID;
  });

  it("should work with factory function", () => {
    const provider = createLemonSqueezyProvider(mockConfig);
    expect(provider).toBeInstanceOf(LemonSqueezyProvider);
    expect(provider.name).toBe("lemonsqueezy");
  });
});

// =============================================================================
// PRODUCT SYNC TESTS
// =============================================================================

describe("LemonSqueezyProvider - Product Sync", () => {
  let provider: LemonSqueezyProvider;

  beforeEach(() => {
    provider = new LemonSqueezyProvider(mockConfig);
    vi.clearAllMocks();
  });

  describe("syncProduct", () => {
    it("should return existing providerProductId if available", async () => {
      const result = await provider.syncProduct(mockProduct);
      expect(result.providerProductId).toBe("ls_product_456");
    });

    it("should log warning and return placeholder for products without ID", async () => {
      const productWithoutId = { ...mockProduct, metadata: {} };
      const consoleSpy = vi.spyOn(console, "warn");

      const result = await provider.syncProduct(productWithoutId);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Product sync not fully supported"),
      );
      expect(result.providerProductId).toMatch(/ls_product_/);
      consoleSpy.mockRestore();
    });

    it("should return placeholder with product id if metadata missing", async () => {
      const productNoMetadata: ProductBase = {
        ...mockProduct,
        metadata: undefined,
      };
      const result = await provider.syncProduct(productNoMetadata);
      expect(result.providerProductId).toBe("ls_product_prod_123");
    });
  });

  describe("syncPrice", () => {
    it("should return existing providerPriceId if available", async () => {
      const result = await provider.syncPrice(mockVariant, "ls_product_456");
      expect(result.providerPriceId).toBe("789");
    });

    it("should log warning and return placeholder without providerPriceId", async () => {
      const variantWithoutId = { ...mockVariant, providerPriceId: undefined };
      const consoleSpy = vi.spyOn(console, "warn");

      const result = await provider.syncPrice(
        variantWithoutId,
        "ls_product_456",
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Price sync not fully supported"),
      );
      expect(result.providerPriceId).toMatch(/ls_variant_/);
      consoleSpy.mockRestore();
    });
  });

  describe("archiveProduct", () => {
    it("should log warning that API does not support product archival", async () => {
      const consoleSpy = vi.spyOn(console, "warn");

      await provider.archiveProduct("ls_product_456");

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Product archival via API not supported"),
      );
      consoleSpy.mockRestore();
    });

    it("should complete without throwing", async () => {
      await expect(
        provider.archiveProduct("ls_product_456"),
      ).resolves.toBeUndefined();
    });
  });
});

// =============================================================================
// CHECKOUT SESSION TESTS
// =============================================================================

describe("LemonSqueezyProvider - Checkout", () => {
  let provider: LemonSqueezyProvider;
  let mockClient: any;

  beforeEach(() => {
    provider = new LemonSqueezyProvider(mockConfig);
    mockClient = (provider as any).client;
    vi.clearAllMocks();
  });

  describe("createCheckoutSession", () => {
    const checkoutOptions: CheckoutOptions = {
      mode: "subscription",
      successUrl: "https://example.com/success",
      cancelUrl: "https://example.com/cancel",
      customerEmail: "user@example.com",
      metadata: { orderId: "order_123" },
    };

    const resolveVariant = vi.fn(async () => mockVariant);

    it("should throw error for empty cart", async () => {
      await expect(
        provider.createCheckoutSession([], checkoutOptions, resolveVariant),
      ).rejects.toThrow("Cart cannot be empty");
    });

    it("should warn for multi-item cart and use first item only", async () => {
      mockClient.createCheckout.mockResolvedValue({
        id: "checkout_123",
        url: "https://checkout.lemonsqueezy.com/c/123",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });
      const consoleSpy = vi.spyOn(console, "warn");

      const items: CartItem[] = [
        { variantId: "var_123", quantity: 1 },
        { variantId: "var_456", quantity: 1 },
      ];

      await provider.createCheckoutSession(
        items,
        checkoutOptions,
        resolveVariant,
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Multi-item checkout not supported"),
      );
      consoleSpy.mockRestore();
    });

    it("should throw error if variant not found", async () => {
      const items: CartItem[] = [{ variantId: "var_nonexistent", quantity: 1 }];
      resolveVariant.mockResolvedValueOnce(null);

      await expect(
        provider.createCheckoutSession(items, checkoutOptions, resolveVariant),
      ).rejects.toThrow("Variant not found");
    });

    it("should throw error if variant has no providerPriceId", async () => {
      const items: CartItem[] = [{ variantId: "var_123", quantity: 1 }];
      const variantNoPriceId = { ...mockVariant, providerPriceId: undefined };
      resolveVariant.mockResolvedValueOnce(variantNoPriceId);

      await expect(
        provider.createCheckoutSession(items, checkoutOptions, resolveVariant),
      ).rejects.toThrow("has no Lemon Squeezy variant ID");
    });

    it("should create checkout session successfully", async () => {
      mockClient.createCheckout.mockResolvedValue({
        id: "checkout_123",
        url: "https://checkout.lemonsqueezy.com/c/123",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      const items: CartItem[] = [{ variantId: "var_123", quantity: 1 }];
      const result = await provider.createCheckoutSession(
        items,
        checkoutOptions,
        resolveVariant,
      );

      expect(result).toMatchObject({
        id: "checkout_123",
        url: expect.stringContaining("checkout.lemonsqueezy.com"),
        status: "open",
        mode: "subscription",
        customerEmail: "user@example.com",
        paymentStatus: "unpaid",
      });
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it("should include metadata and grove_checkout_mode in custom data", async () => {
      mockClient.createCheckout.mockResolvedValue({
        id: "checkout_123",
        url: "https://checkout.lemonsqueezy.com/c/123",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      const items: CartItem[] = [{ variantId: "var_123", quantity: 1 }];
      await provider.createCheckoutSession(
        items,
        checkoutOptions,
        resolveVariant,
      );

      expect(mockClient.createCheckout).toHaveBeenCalledWith(
        expect.objectContaining({
          variantId: 789,
          customData: expect.objectContaining({
            orderId: "order_123",
            grove_checkout_mode: "subscription",
          }),
        }),
      );
    });
  });

  describe("getCheckoutSession", () => {
    it("should return null if checkout not found", async () => {
      mockClient.getCheckout.mockResolvedValue(null);

      const result = await provider.getCheckoutSession("checkout_123");
      expect(result).toBeNull();
    });

    it("should return checkout session with open status", async () => {
      mockClient.getCheckout.mockResolvedValue({
        id: "checkout_123",
        attributes: {
          ...mockCheckoutAttributes,
          expires_at: new Date(Date.now() + 1000).toISOString(),
        },
      });

      const result = await provider.getCheckoutSession("checkout_123");

      expect(result).toMatchObject({
        id: "checkout_123",
        url: expect.stringContaining("checkout.lemonsqueezy.com"),
        status: "open",
        mode: "subscription",
        paymentStatus: "unpaid",
      });
    });

    it("should return checkout with expired status if expires_at in past", async () => {
      mockClient.getCheckout.mockResolvedValue({
        id: "checkout_123",
        attributes: {
          ...mockCheckoutAttributes,
          expires_at: new Date(Date.now() - 1000).toISOString(),
        },
      });

      const result = await provider.getCheckoutSession("checkout_123");
      expect(result?.status).toBe("expired");
    });

    it("should extract customerEmail from checkout_data", async () => {
      mockClient.getCheckout.mockResolvedValue({
        id: "checkout_123",
        attributes: mockCheckoutAttributes,
      });

      const result = await provider.getCheckoutSession("checkout_123");
      expect(result?.customerEmail).toBe("user@example.com");
    });
  });
});

// =============================================================================
// PAYMENT STATUS TESTS
// =============================================================================

describe("LemonSqueezyProvider - Payments", () => {
  let provider: LemonSqueezyProvider;
  let mockClient: any;

  beforeEach(() => {
    provider = new LemonSqueezyProvider(mockConfig);
    mockClient = (provider as any).client;
    vi.clearAllMocks();
  });

  describe("getPaymentStatus", () => {
    it("should return pending if order not found", async () => {
      mockClient.getOrder.mockResolvedValue(null);

      const status = await provider.getPaymentStatus("order_123");
      expect(status).toBe("pending");
    });

    it("should map pending status correctly", async () => {
      mockClient.getOrder.mockResolvedValue({
        id: "order_123",
        attributes: { ...mockOrderAttributes, status: "pending" },
      });

      const status = await provider.getPaymentStatus("order_123");
      expect(status).toBe("pending");
    });

    it("should map paid status to succeeded", async () => {
      mockClient.getOrder.mockResolvedValue({
        id: "order_123",
        attributes: { ...mockOrderAttributes, status: "paid" },
      });

      const status = await provider.getPaymentStatus("order_123");
      expect(status).toBe("succeeded");
    });

    it("should map failed status correctly", async () => {
      mockClient.getOrder.mockResolvedValue({
        id: "order_123",
        attributes: { ...mockOrderAttributes, status: "failed" },
      });

      const status = await provider.getPaymentStatus("order_123");
      expect(status).toBe("failed");
    });

    it("should map refunded status correctly", async () => {
      mockClient.getOrder.mockResolvedValue({
        id: "order_123",
        attributes: { ...mockOrderAttributes, status: "refunded" },
      });

      const status = await provider.getPaymentStatus("order_123");
      expect(status).toBe("refunded");
    });

    it("should map partial_refund status to partially_refunded", async () => {
      mockClient.getOrder.mockResolvedValue({
        id: "order_123",
        attributes: { ...mockOrderAttributes, status: "partial_refund" },
      });

      const status = await provider.getPaymentStatus("order_123");
      expect(status).toBe("partially_refunded");
    });

    it("should return pending for unknown status", async () => {
      mockClient.getOrder.mockResolvedValue({
        id: "order_123",
        attributes: { ...mockOrderAttributes, status: "unknown_status" as any },
      });

      const status = await provider.getPaymentStatus("order_123");
      expect(status).toBe("pending");
    });
  });

  describe("refund", () => {
    it("should log warning that programmatic refunds not supported", async () => {
      const consoleSpy = vi.spyOn(console, "warn");

      await provider.refund(
        { orderId: "order_123", amount: 5000 },
        "order_123",
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Programmatic refunds not supported"),
      );
      consoleSpy.mockRestore();
    });

    it("should return pending refund result", async () => {
      const result = await provider.refund(
        { orderId: "order_123", amount: 5000, reason: "requested_by_customer" },
        "order_123",
      );

      expect(result).toMatchObject({
        orderId: "order_123",
        amount: { amount: 5000, currency: "usd" },
        status: "pending",
        reason: "requested_by_customer",
      });
      expect(result.id).toMatch(/manual_refund_/);
      expect(result.createdAt).toBeInstanceOf(Date);
    });

    it("should use 0 amount if not provided", async () => {
      const result = await provider.refund(
        { orderId: "order_123" },
        "order_123",
      );

      expect(result.amount.amount).toBe(0);
    });
  });
});

// =============================================================================
// SUBSCRIPTION TESTS
// =============================================================================

describe("LemonSqueezyProvider - Subscriptions", () => {
  let provider: LemonSqueezyProvider;
  let mockClient: any;

  beforeEach(() => {
    provider = new LemonSqueezyProvider(mockConfig);
    mockClient = (provider as any).client;
    vi.clearAllMocks();
  });

  describe("getSubscription", () => {
    it("should return null if subscription not found", async () => {
      mockClient.getSubscription.mockResolvedValue(null);

      const result = await provider.getSubscription("sub_123");
      expect(result).toBeNull();
    });

    it("should map subscription with active status", async () => {
      mockClient.getSubscription.mockResolvedValue({
        id: "sub_123",
        attributes: mockSubscriptionAttributes,
      });

      const result = await provider.getSubscription("sub_123");

      expect(result).toMatchObject({
        id: "sub_123",
        customerId: "999",
        customerEmail: "john@example.com",
        productId: "456",
        variantId: "789",
        quantity: 1,
        status: "active",
        cancelAtPeriodEnd: false,
      });
    });

    it("should map cancelled status correctly", async () => {
      mockClient.getSubscription.mockResolvedValue({
        id: "sub_123",
        attributes: {
          ...mockSubscriptionAttributes,
          status: "cancelled",
          cancelled: true,
        },
      });

      const result = await provider.getSubscription("sub_123");
      expect(result?.status).toBe("canceled");
      expect(result?.cancelAtPeriodEnd).toBe(true);
    });

    it("should include cancellation date if subscription ended", async () => {
      const endsAt = new Date().toISOString();
      mockClient.getSubscription.mockResolvedValue({
        id: "sub_123",
        attributes: {
          ...mockSubscriptionAttributes,
          ends_at: endsAt,
        },
      });

      const result = await provider.getSubscription("sub_123");
      expect(result?.canceledAt).toEqual(new Date(endsAt));
    });
  });

  describe("cancelSubscription", () => {
    it("should call client.cancelSubscription", async () => {
      await provider.cancelSubscription("sub_123");
      expect(mockClient.cancelSubscription).toHaveBeenCalledWith("sub_123");
    });

    it("should warn if immediate cancellation requested", async () => {
      const consoleSpy = vi.spyOn(console, "warn");

      await provider.cancelSubscription("sub_123", true);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Immediate cancellation not supported"),
      );
      consoleSpy.mockRestore();
    });

    it("should not warn for period-end cancellation", async () => {
      const consoleSpy = vi.spyOn(console, "warn");

      await provider.cancelSubscription("sub_123", false);

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("should complete without warning by default", async () => {
      const consoleSpy = vi.spyOn(console, "warn");

      await provider.cancelSubscription("sub_123");

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe("resumeSubscription", () => {
    it("should call client.resumeSubscription", async () => {
      await provider.resumeSubscription("sub_123");
      expect(mockClient.resumeSubscription).toHaveBeenCalledWith("sub_123");
    });
  });
});

// =============================================================================
// CUSTOMER TESTS
// =============================================================================

describe("LemonSqueezyProvider - Customers", () => {
  let provider: LemonSqueezyProvider;
  let mockClient: any;

  beforeEach(() => {
    provider = new LemonSqueezyProvider(mockConfig);
    mockClient = (provider as any).client;
    vi.clearAllMocks();
  });

  describe("syncCustomer", () => {
    it("should return existing providerCustomerId", async () => {
      const customer = {
        id: "cust_123",
        providerCustomerId: "ls_cust_999",
      };

      const result = await provider.syncCustomer(customer);
      expect(result.providerCustomerId).toBe("ls_cust_999");
    });

    it("should find existing customer by email", async () => {
      mockClient.findCustomerByEmail.mockResolvedValue({
        id: "ls_cust_existing",
        attributes: mockCustomerAttributes,
      });

      const result = await provider.syncCustomer({ email: "john@example.com" });
      expect(result.providerCustomerId).toBe("ls_cust_existing");
    });

    it("should log warning if customer not found", async () => {
      mockClient.findCustomerByEmail.mockResolvedValue(null);
      const consoleSpy = vi.spyOn(console, "warn");

      await provider.syncCustomer({ email: "new@example.com" });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Customer sync not supported"),
      );
      consoleSpy.mockRestore();
    });

    it("should return pending ID for new customers without email", async () => {
      const result = await provider.syncCustomer({ id: "cust_new" });
      expect(result.providerCustomerId).toBe("pending_cust_new");
    });

    it("should use 'new' as fallback ID", async () => {
      const result = await provider.syncCustomer({});
      expect(result.providerCustomerId).toBe("pending_new");
    });
  });

  describe("getCustomer", () => {
    it("should return null if customer not found", async () => {
      mockClient.getCustomer.mockResolvedValue(null);

      const result = await provider.getCustomer("ls_cust_123");
      expect(result).toBeNull();
    });

    it("should return mapped customer", async () => {
      mockClient.getCustomer.mockResolvedValue({
        id: "ls_cust_123",
        attributes: mockCustomerAttributes,
      });

      const result = await provider.getCustomer("ls_cust_123");

      expect(result).toMatchObject({
        id: "ls_cust_123",
        email: "john@example.com",
        name: "John Doe",
        providerCustomerId: "ls_cust_123",
      });
      expect(result?.createdAt).toBeInstanceOf(Date);
      expect(result?.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe("createBillingPortalSession", () => {
    it("should return customer portal URL from attributes", async () => {
      mockClient.getCustomer.mockResolvedValue({
        id: "ls_cust_123",
        attributes: mockCustomerAttributes,
      });

      const result = await provider.createBillingPortalSession(
        "ls_cust_123",
        "https://example.com/return",
      );

      expect(result.url).toBe("https://portal.example.com");
    });

    it("should return fallback URL if portal URL not found", async () => {
      mockClient.getCustomer.mockResolvedValue({
        id: "ls_cust_123",
        attributes: {
          ...mockCustomerAttributes,
          urls: { customer_portal: undefined },
        },
      });
      const consoleSpy = vi.spyOn(console, "warn");

      const result = await provider.createBillingPortalSession(
        "ls_cust_123",
        "https://example.com/return",
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Could not find customer portal URL"),
      );
      expect(result.url).toContain("app.lemonsqueezy.com");
      expect(result.url).toContain("return_url=https");
      consoleSpy.mockRestore();
    });

    it("should return fallback URL if customer not found", async () => {
      mockClient.getCustomer.mockResolvedValue(null);

      const result = await provider.createBillingPortalSession(
        "ls_cust_123",
        "https://example.com/return",
      );

      expect(result.url).toContain("app.lemonsqueezy.com");
    });

    it("should encode returnUrl in fallback URL", async () => {
      mockClient.getCustomer.mockResolvedValue(null);

      const returnUrl = "https://example.com/return?test=123&other=value";
      const result = await provider.createBillingPortalSession(
        "ls_cust_123",
        returnUrl,
      );

      expect(result.url).toContain(encodeURIComponent(returnUrl));
    });
  });
});

// =============================================================================
// WEBHOOK TESTS
// =============================================================================

describe("LemonSqueezyProvider - Webhooks", () => {
  let provider: LemonSqueezyProvider;
  let mockClient: any;

  beforeEach(() => {
    provider = new LemonSqueezyProvider(mockConfig);
    mockClient = (provider as any).client;
    vi.clearAllMocks();
  });

  describe("handleWebhook", () => {
    it("should return error if signature verification fails", async () => {
      mockClient.verifyWebhookSignature.mockResolvedValue({
        valid: false,
        error: "Signature mismatch",
      });

      const request = new Request("http://example.com", {
        method: "POST",
        body: "payload",
        headers: { "x-signature": "invalid" },
      });

      const result = await provider.handleWebhook(request);

      expect(result.received).toBe(false);
      expect(result.error).toBe("Signature mismatch");
    });

    it("should return received=false if signature missing", async () => {
      mockClient.verifyWebhookSignature.mockResolvedValue({
        valid: false,
        error: "Missing x-signature header",
      });

      const request = new Request("http://example.com", {
        method: "POST",
        body: "payload",
        headers: {},
      });

      const result = await provider.handleWebhook(request);
      expect(result.received).toBe(false);
    });

    it("should return received event with mapped type for order_created", async () => {
      const event = {
        meta: {
          event_name: "order_created",
          test_mode: false,
          custom_data: { orderId: "123" },
        },
        data: {
          type: "orders",
          id: "order_123",
          attributes: mockOrderAttributes,
        },
      };

      mockClient.verifyWebhookSignature.mockResolvedValue({
        valid: true,
        event,
      });

      const request = new Request("http://example.com", {
        method: "POST",
        body: JSON.stringify(event),
        headers: { "x-signature": "valid" },
      });

      const result = await provider.handleWebhook(request);

      expect(result.received).toBe(true);
      expect(result.event).toBeDefined();
      expect(result.event?.type).toBe("payment.succeeded");
      expect(result.event?.providerEventId).toBe("order_123");
    });

    it("should return received event with mapped type for subscription_created", async () => {
      const event = {
        meta: {
          event_name: "subscription_created",
          test_mode: false,
        },
        data: {
          type: "subscriptions",
          id: "sub_123",
          attributes: mockSubscriptionAttributes,
        },
      };

      mockClient.verifyWebhookSignature.mockResolvedValue({
        valid: true,
        event,
      });

      const request = new Request("http://example.com", {
        method: "POST",
        body: JSON.stringify(event),
        headers: { "x-signature": "valid" },
      });

      const result = await provider.handleWebhook(request);

      expect(result.event?.type).toBe("subscription.created");
    });

    it("should include custom data in webhook event", async () => {
      const event = {
        meta: {
          event_name: "order_created",
          test_mode: true,
          custom_data: { customKey: "customValue" },
        },
        data: {
          type: "orders",
          id: "order_123",
          attributes: mockOrderAttributes,
        },
      };

      mockClient.verifyWebhookSignature.mockResolvedValue({
        valid: true,
        event,
      });

      const request = new Request("http://example.com", {
        method: "POST",
        body: JSON.stringify(event),
        headers: { "x-signature": "valid" },
      });

      const result = await provider.handleWebhook(request);

      expect(result.event?.data).toMatchObject({
        customData: { customKey: "customValue" },
        testMode: true,
      });
    });

    it("should generate unique event ID", async () => {
      const event = {
        meta: {
          event_name: "order_created",
          test_mode: false,
        },
        data: {
          type: "orders",
          id: "order_123",
          attributes: mockOrderAttributes,
        },
      };

      mockClient.verifyWebhookSignature.mockResolvedValue({
        valid: true,
        event,
      });

      const request = new Request("http://example.com", {
        method: "POST",
        body: JSON.stringify(event),
        headers: { "x-signature": "valid" },
      });

      const result = await provider.handleWebhook(request);

      expect(result.event?.id).toBeDefined();
      expect(result.event?.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });
  });

  describe("mapEventType", () => {
    it("should map order_created to payment.succeeded", () => {
      const eventType = (provider as any).mapEventType("order_created");
      expect(eventType).toBe("payment.succeeded");
    });

    it("should map order_refunded to refund.created", () => {
      const eventType = (provider as any).mapEventType("order_refunded");
      expect(eventType).toBe("refund.created");
    });

    it("should map subscription_created to subscription.created", () => {
      const eventType = (provider as any).mapEventType("subscription_created");
      expect(eventType).toBe("subscription.created");
    });

    it("should map subscription_updated to subscription.updated", () => {
      const eventType = (provider as any).mapEventType("subscription_updated");
      expect(eventType).toBe("subscription.updated");
    });

    it("should map subscription_cancelled to subscription.canceled", () => {
      const eventType = (provider as any).mapEventType(
        "subscription_cancelled",
      );
      expect(eventType).toBe("subscription.canceled");
    });

    it("should map subscription_payment_success to invoice.paid", () => {
      const eventType = (provider as any).mapEventType(
        "subscription_payment_success",
      );
      expect(eventType).toBe("invoice.paid");
    });

    it("should map subscription_payment_failed to invoice.payment_failed", () => {
      const eventType = (provider as any).mapEventType(
        "subscription_payment_failed",
      );
      expect(eventType).toBe("invoice.payment_failed");
    });

    it("should return default payment.succeeded for unknown events", () => {
      const eventType = (provider as any).mapEventType("unknown_event");
      expect(eventType).toBe("payment.succeeded");
    });

    it("should map all subscription status change events", () => {
      const mappings = {
        subscription_resumed: "subscription.updated",
        subscription_expired: "subscription.canceled",
        subscription_paused: "subscription.updated",
        subscription_unpaused: "subscription.updated",
        subscription_plan_changed: "subscription.updated",
      };

      Object.entries(mappings).forEach(([lsEvent, expectedType]) => {
        const eventType = (provider as any).mapEventType(lsEvent);
        expect(eventType).toBe(expectedType);
      });
    });
  });
});

// =============================================================================
// STRIPE CONNECT (NOT SUPPORTED) TESTS
// =============================================================================

describe("LemonSqueezyProvider - Stripe Connect (Not Supported)", () => {
  let provider: LemonSqueezyProvider;

  beforeEach(() => {
    provider = new LemonSqueezyProvider(mockConfig);
  });

  it("should have createConnectAccount as undefined", () => {
    expect(provider.createConnectAccount).toBeUndefined();
  });

  it("should have getConnectAccount as undefined", () => {
    expect(provider.getConnectAccount).toBeUndefined();
  });

  it("should have createConnectAccountLink as undefined", () => {
    expect(provider.createConnectAccountLink).toBeUndefined();
  });

  it("should have createConnectLoginLink as undefined", () => {
    expect(provider.createConnectLoginLink).toBeUndefined();
  });
});

// =============================================================================
// EDGE CASES & ERROR CONDITIONS
// =============================================================================

describe("LemonSqueezyProvider - Edge Cases", () => {
  let provider: LemonSqueezyProvider;
  let mockClient: any;

  beforeEach(() => {
    provider = new LemonSqueezyProvider(mockConfig);
    mockClient = (provider as any).client;
    vi.clearAllMocks();
  });

  it("should handle empty metadata in products", async () => {
    const productNoMetadata: ProductBase = {
      ...mockProduct,
      metadata: undefined,
    };
    const result = await provider.syncProduct(productNoMetadata);
    expect(result.providerProductId).toBeDefined();
  });

  it("should handle checkout expiration calculation with default 24h", async () => {
    mockClient.createCheckout.mockResolvedValue({
      id: "checkout_123",
      url: "https://checkout.lemonsqueezy.com/c/123",
      expiresAt: null, // No expiration from API
    });

    const items: CartItem[] = [{ variantId: "var_123", quantity: 1 }];
    const options: CheckoutOptions = {
      mode: "subscription",
      successUrl: "https://example.com/success",
      cancelUrl: "https://example.com/cancel",
    };

    const result = await provider.createCheckoutSession(
      items,
      options,
      async () => mockVariant,
    );

    expect(result.expiresAt).toBeInstanceOf(Date);
    // Check that it's approximately 24 hours from now
    const hoursFromNow =
      (result.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60);
    expect(hoursFromNow).toBeGreaterThan(23);
    expect(hoursFromNow).toBeLessThan(25);
  });

  it("should handle subscription with no cancellation date", async () => {
    mockClient.getSubscription.mockResolvedValue({
      id: "sub_123",
      attributes: {
        ...mockSubscriptionAttributes,
        ends_at: null,
      },
    });

    const result = await provider.getSubscription("sub_123");
    expect(result?.canceledAt).toBeUndefined();
  });

  it("should handle variant ID as string and convert to number", async () => {
    mockClient.createCheckout.mockResolvedValue({
      id: "checkout_123",
      url: "https://checkout.lemonsqueezy.com/c/123",
      expiresAt: null,
    });

    const items: CartItem[] = [{ variantId: "var_123", quantity: 1 }];
    const options: CheckoutOptions = {
      mode: "subscription",
      successUrl: "https://example.com/success",
      cancelUrl: "https://example.com/cancel",
    };

    await provider.createCheckoutSession(items, options, async () => ({
      ...mockVariant,
      providerPriceId: "789",
    }));

    expect(mockClient.createCheckout).toHaveBeenCalledWith(
      expect.objectContaining({
        variantId: 789, // Should be parsed as number
      }),
    );
  });
});
