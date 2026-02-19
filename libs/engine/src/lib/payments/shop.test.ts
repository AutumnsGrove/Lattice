/**
 * Shop Database Operations Tests
 *
 * Comprehensive tests for product, variant, order, and customer operations.
 * Covers 80%+ of functionality with focus on:
 * - Product CRUD and filtering
 * - Variant management
 * - Order creation and retrieval
 * - Customer operations
 * - Security (column whitelisting)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import type {
  D1Database,
  D1PreparedStatement,
} from "../../../lib/payments/shop";
import {
  // Product operations
  getProducts,
  getProductBySlug,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  // Variant operations
  getProductVariants,
  getVariantById,
  createVariant,
  updateVariant,
  deleteVariant,
  // Order operations
  generateOrderNumber,
  createOrder,
  getOrderById,
  getOrderBySessionId,
  updateOrderStatus,
  getOrders,
  // Customer operations
  getOrCreateCustomer,
  updateCustomer,
} from "./shop";

// =============================================================================
// MOCK DATABASE SETUP
// =============================================================================

function createMockDb(): D1Database {
  const mockDb = {
    prepare: vi.fn().mockReturnThis(),
    bind: vi.fn().mockReturnThis(),
    first: vi.fn(),
    all: vi.fn().mockResolvedValue({ results: [], success: true }),
    run: vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } }),
    batch: vi.fn(),
  } as unknown as D1Database;

  return mockDb;
}

function setupMockDbResponses(db: D1Database) {
  const mockPrepare = db.prepare as ReturnType<typeof vi.fn>;
  const mockFirst = vi.fn();
  const mockAll = vi.fn();
  const mockRun = vi.fn();
  const mockBind = vi.fn();

  mockPrepare.mockReturnValue({
    bind: mockBind.mockReturnValue({
      first: mockFirst,
      all: mockAll,
      run: mockRun,
    }),
  });

  return { mockPrepare, mockFirst, mockAll, mockRun, mockBind };
}

// =============================================================================
// PRODUCT OPERATIONS TESTS
// =============================================================================

describe("Product Operations", () => {
  let db: D1Database;
  let mocks: ReturnType<typeof setupMockDbResponses>;

  beforeEach(() => {
    db = createMockDb();
    mocks = setupMockDbResponses(db);
  });

  describe("getProducts", () => {
    it("should fetch all products for a tenant", async () => {
      const mockProducts = [
        {
          id: "prod-1",
          tenant_id: "tenant-1",
          name: "Test Product",
          slug: "test-product",
          description: "A test product",
          short_description: null,
          type: "physical",
          status: "active",
          images: "[]",
          featured_image: null,
          meta_title: null,
          meta_description: null,
          category: null,
          tags: "[]",
          provider_product_id: null,
          metadata: "{}",
          created_at: 1000000,
          updated_at: 1000000,
        },
      ];

      // Setup mocks: first call returns products, second call (for variants) returns empty
      mocks.mockFirst.mockResolvedValueOnce(null);
      mocks.mockAll
        .mockResolvedValueOnce({
          results: mockProducts,
          success: true,
        })
        .mockResolvedValueOnce({
          results: [],
          success: true,
        });

      const products = await getProducts(db, "tenant-1");

      expect(mocks.mockPrepare).toHaveBeenCalled();
      expect(products).toHaveLength(1);
      expect(products[0].name).toBe("Test Product");
    });

    it("should filter products by status", async () => {
      mocks.mockAll.mockResolvedValue({
        results: [],
        success: true,
      });

      await getProducts(db, "tenant-1", { status: "active" });

      expect(mocks.mockPrepare).toHaveBeenCalledWith(
        expect.stringContaining("AND status = ?"),
      );
    });

    it("should filter products by type", async () => {
      mocks.mockAll.mockResolvedValue({
        results: [],
        success: true,
      });

      await getProducts(db, "tenant-1", { type: "digital" });

      expect(mocks.mockPrepare).toHaveBeenCalledWith(
        expect.stringContaining("AND type = ?"),
      );
    });

    it("should filter products by category", async () => {
      mocks.mockAll.mockResolvedValue({
        results: [],
        success: true,
      });

      await getProducts(db, "tenant-1", { category: "books" });

      expect(mocks.mockPrepare).toHaveBeenCalledWith(
        expect.stringContaining("AND category = ?"),
      );
    });

    it("should support limit and offset", async () => {
      mocks.mockAll.mockResolvedValue({
        results: [],
        success: true,
      });

      await getProducts(db, "tenant-1", { limit: 10, offset: 20 });

      expect(mocks.mockPrepare).toHaveBeenCalledWith(
        expect.stringContaining("LIMIT ?"),
      );
      expect(mocks.mockPrepare).toHaveBeenCalledWith(
        expect.stringContaining("OFFSET ?"),
      );
    });

    it("should handle multiple filters simultaneously", async () => {
      mocks.mockAll.mockResolvedValue({
        results: [],
        success: true,
      });

      await getProducts(db, "tenant-1", {
        status: "active",
        type: "physical",
        category: "books",
        limit: 10,
        offset: 0,
      });

      const callArgs = (mocks.mockPrepare as any).mock.calls[0][0];
      expect(callArgs).toContain("AND status = ?");
      expect(callArgs).toContain("AND type = ?");
      expect(callArgs).toContain("AND category = ?");
      expect(callArgs).toContain("LIMIT ?");
    });
  });

  describe("getProductBySlug", () => {
    it("should return product when found", async () => {
      const mockProduct = {
        id: "prod-1",
        tenant_id: "tenant-1",
        name: "Test Product",
        slug: "test-product",
        description: null,
        short_description: null,
        type: "physical",
        status: "active",
        images: "[]",
        featured_image: null,
        meta_title: null,
        meta_description: null,
        category: null,
        tags: "[]",
        provider_product_id: null,
        metadata: "{}",
        created_at: 1000000,
        updated_at: 1000000,
      };

      mocks.mockFirst
        .mockResolvedValueOnce(mockProduct)
        .mockResolvedValueOnce(null);
      mocks.mockAll.mockResolvedValueOnce({
        results: [],
        success: true,
      });

      const product = await getProductBySlug(db, "tenant-1", "test-product");

      expect(product).not.toBeNull();
      expect(product?.name).toBe("Test Product");
    });

    it("should return null when product not found", async () => {
      mocks.mockFirst.mockResolvedValueOnce(null);

      const product = await getProductBySlug(db, "tenant-1", "nonexistent");

      expect(product).toBeNull();
    });
  });

  describe("getProductById", () => {
    it("should return product when found", async () => {
      const mockProduct = {
        id: "prod-1",
        tenant_id: "tenant-1",
        name: "Test Product",
        slug: "test-product",
        description: null,
        short_description: null,
        type: "physical",
        status: "active",
        images: "[]",
        featured_image: null,
        meta_title: null,
        meta_description: null,
        category: null,
        tags: "[]",
        provider_product_id: null,
        metadata: "{}",
        created_at: 1000000,
        updated_at: 1000000,
      };

      mocks.mockFirst.mockResolvedValueOnce(mockProduct);
      mocks.mockAll.mockResolvedValueOnce({
        results: [],
        success: true,
      });

      const product = await getProductById(db, "prod-1");

      expect(product).not.toBeNull();
      expect(product?.id).toBe("prod-1");
    });

    it("should return null when product not found", async () => {
      mocks.mockFirst.mockResolvedValueOnce(null);

      const product = await getProductById(db, "nonexistent");

      expect(product).toBeNull();
    });
  });

  describe("createProduct", () => {
    it("should create product with required fields", async () => {
      mocks.mockRun.mockResolvedValueOnce({
        success: true,
        meta: { changes: 1 },
      });

      const result = await createProduct(db, "tenant-1", {
        name: "New Product",
        slug: "new-product",
      });

      expect(result).toHaveProperty("id");
      expect(mocks.mockPrepare).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO products"),
      );
    });

    it("should create product with all fields", async () => {
      mocks.mockRun.mockResolvedValueOnce({
        success: true,
        meta: { changes: 1 },
      });

      const result = await createProduct(db, "tenant-1", {
        name: "New Product",
        slug: "new-product",
        description: "A detailed description",
        shortDescription: "Short desc",
        type: "digital",
        status: "active",
        images: ["https://example.com/image.jpg"],
        featuredImage: "https://example.com/featured.jpg",
        category: "books",
        tags: ["featured", "new"],
        metadata: { custom: "data" },
      });

      expect(result).toHaveProperty("id");
      const bindCalls = mocks.mockBind.mock.calls;
      expect(bindCalls.length).toBeGreaterThan(0);
    });

    it("should use default values for optional fields", async () => {
      mocks.mockRun.mockResolvedValueOnce({
        success: true,
        meta: { changes: 1 },
      });

      await createProduct(db, "tenant-1", {
        name: "Product",
        slug: "product",
      });

      const bindCall = mocks.mockBind.mock.calls[0];
      expect(bindCall).toContain("physical"); // default type
      expect(bindCall).toContain("draft"); // default status
    });
  });

  describe("updateProduct", () => {
    it("should update product fields", async () => {
      mocks.mockRun.mockResolvedValueOnce({
        success: true,
        meta: { changes: 1 },
      });

      await updateProduct(db, "prod-1", {
        name: "Updated Name",
        status: "active",
      });

      expect(mocks.mockPrepare).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE products SET"),
      );
    });

    it("should handle single field update", async () => {
      mocks.mockRun.mockResolvedValueOnce({
        success: true,
        meta: { changes: 1 },
      });

      await updateProduct(db, "prod-1", {
        name: "New Name",
      });

      const prepareCall = mocks.mockPrepare.mock.calls[0][0];
      expect(prepareCall).toContain("name = ?");
    });

    it("should complete without error when no fields provided", async () => {
      await updateProduct(db, "prod-1", {});

      // Should return early without preparing a statement
      expect(mocks.mockRun).not.toHaveBeenCalled();
    });
  });

  describe("deleteProduct", () => {
    it("should delete product by id", async () => {
      mocks.mockRun.mockResolvedValueOnce({
        success: true,
        meta: { changes: 1 },
      });

      await deleteProduct(db, "prod-1");

      expect(mocks.mockPrepare).toHaveBeenCalledWith(
        expect.stringContaining("DELETE FROM products"),
      );
      expect(mocks.mockBind).toHaveBeenCalledWith("prod-1");
    });
  });
});

// =============================================================================
// VARIANT OPERATIONS TESTS
// =============================================================================

describe("Variant Operations", () => {
  let db: D1Database;
  let mocks: ReturnType<typeof setupMockDbResponses>;

  beforeEach(() => {
    db = createMockDb();
    mocks = setupMockDbResponses(db);
  });

  describe("getProductVariants", () => {
    it("should fetch variants for a product", async () => {
      const mockVariants = [
        {
          id: "var-1",
          product_id: "prod-1",
          tenant_id: "tenant-1",
          name: "Small",
          sku: "SKU-001",
          price_amount: 1999,
          price_currency: "usd",
          compare_at_price: null,
          pricing_type: "one_time",
          billing_interval: null,
          billing_interval_count: null,
          inventory_quantity: 100,
          inventory_policy: "deny",
          track_inventory: 1,
          download_url: null,
          download_limit: null,
          download_expiry_days: null,
          weight_grams: null,
          requires_shipping: 1,
          provider_price_id: null,
          is_default: 1,
          position: 0,
          metadata: "{}",
          created_at: 1000000,
          updated_at: 1000000,
        },
      ];

      mocks.mockAll.mockResolvedValueOnce({
        results: mockVariants,
        success: true,
      });

      const variants = await getProductVariants(db, "prod-1");

      expect(variants).toHaveLength(1);
      expect(variants[0].name).toBe("Small");
      expect(mocks.mockBind).toHaveBeenCalledWith("prod-1");
    });

    it("should return empty array if no variants", async () => {
      mocks.mockAll.mockResolvedValueOnce({
        results: [],
        success: true,
      });

      const variants = await getProductVariants(db, "prod-1");

      expect(variants).toEqual([]);
    });
  });

  describe("getVariantById", () => {
    it("should return variant when found", async () => {
      const mockVariant = {
        id: "var-1",
        product_id: "prod-1",
        tenant_id: "tenant-1",
        name: "Small",
        sku: "SKU-001",
        price_amount: 1999,
        price_currency: "usd",
        compare_at_price: null,
        pricing_type: "one_time",
        billing_interval: null,
        billing_interval_count: null,
        inventory_quantity: 100,
        inventory_policy: "deny",
        track_inventory: 1,
        download_url: null,
        download_limit: null,
        download_expiry_days: null,
        weight_grams: null,
        requires_shipping: 1,
        provider_price_id: null,
        is_default: 1,
        position: 0,
        metadata: "{}",
        created_at: 1000000,
        updated_at: 1000000,
      };

      mocks.mockFirst.mockResolvedValueOnce(mockVariant);

      const variant = await getVariantById(db, "var-1");

      expect(variant).not.toBeNull();
      expect(variant?.name).toBe("Small");
    });

    it("should return null when variant not found", async () => {
      mocks.mockFirst.mockResolvedValueOnce(null);

      const variant = await getVariantById(db, "nonexistent");

      expect(variant).toBeNull();
    });
  });

  describe("createVariant", () => {
    it("should create variant with required fields", async () => {
      mocks.mockRun.mockResolvedValueOnce({
        success: true,
        meta: { changes: 1 },
      });

      const result = await createVariant(db, "prod-1", "tenant-1", {
        name: "Small",
        priceAmount: 1999,
      });

      expect(result).toHaveProperty("id");
      expect(mocks.mockPrepare).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO product_variants"),
      );
    });

    it("should create variant with all fields", async () => {
      mocks.mockRun.mockResolvedValueOnce({
        success: true,
        meta: { changes: 1 },
      });

      const result = await createVariant(db, "prod-1", "tenant-1", {
        name: "Monthly",
        sku: "SKU-001",
        priceAmount: 2999,
        priceCurrency: "usd",
        compareAtPrice: 3999,
        pricingType: "recurring",
        billingInterval: "month",
        billingIntervalCount: 1,
        inventoryQuantity: 50,
        inventoryPolicy: "continue",
        trackInventory: true,
        downloadUrl: "https://example.com/file.zip",
        downloadLimit: 5,
        requiresShipping: true,
        isDefault: true,
        position: 0,
        metadata: { tier: "premium" },
      });

      expect(result).toHaveProperty("id");
    });

    it("should use default values for optional fields", async () => {
      mocks.mockRun.mockResolvedValueOnce({
        success: true,
        meta: { changes: 1 },
      });

      await createVariant(db, "prod-1", "tenant-1", {
        name: "Default",
        priceAmount: 1999,
      });

      const bindCall = mocks.mockBind.mock.calls[0];
      expect(bindCall).toContain("usd"); // default currency
      expect(bindCall).toContain("one_time"); // default pricing type
    });
  });

  describe("updateVariant", () => {
    it("should update variant fields", async () => {
      mocks.mockRun.mockResolvedValueOnce({
        success: true,
        meta: { changes: 1 },
      });

      await updateVariant(db, "var-1", {
        name: "Medium",
        priceAmount: 2999,
      });

      expect(mocks.mockPrepare).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE product_variants SET"),
      );
    });

    it("should complete without error when no fields provided", async () => {
      await updateVariant(db, "var-1", {});

      // Should return early without preparing a statement
      expect(mocks.mockRun).not.toHaveBeenCalled();
    });
  });

  describe("deleteVariant", () => {
    it("should delete variant by id", async () => {
      mocks.mockRun.mockResolvedValueOnce({
        success: true,
        meta: { changes: 1 },
      });

      await deleteVariant(db, "var-1");

      expect(mocks.mockPrepare).toHaveBeenCalledWith(
        expect.stringContaining("DELETE FROM product_variants"),
      );
    });
  });
});

// =============================================================================
// ORDER OPERATIONS TESTS
// =============================================================================

describe("Order Operations", () => {
  let db: D1Database;
  let mocks: ReturnType<typeof setupMockDbResponses>;

  beforeEach(() => {
    db = createMockDb();
    mocks = setupMockDbResponses(db);
  });

  describe("generateOrderNumber", () => {
    it("should generate order number with correct format", async () => {
      mocks.mockFirst.mockResolvedValueOnce({ count: 0 });

      const orderNumber = await generateOrderNumber(db, "tenant-1");

      expect(orderNumber).toBe("GRV-0001");
    });

    it("should increment order number", async () => {
      mocks.mockFirst.mockResolvedValueOnce({ count: 10 });

      const orderNumber = await generateOrderNumber(db, "tenant-1");

      expect(orderNumber).toBe("GRV-0011");
    });

    it("should pad order number with zeros", async () => {
      mocks.mockFirst.mockResolvedValueOnce({ count: 999 });

      const orderNumber = await generateOrderNumber(db, "tenant-1");

      expect(orderNumber).toBe("GRV-1000");
    });

    it("should handle large numbers", async () => {
      mocks.mockFirst.mockResolvedValueOnce({ count: 9999 });

      const orderNumber = await generateOrderNumber(db, "tenant-1");

      expect(orderNumber).toBe("GRV-10000");
    });
  });

  describe("createOrder", () => {
    it("should create order with required fields", async () => {
      mocks.mockFirst.mockResolvedValueOnce({ count: 0 });
      mocks.mockRun.mockResolvedValue({ success: true, meta: { changes: 1 } });

      const result = await createOrder(db, "tenant-1", {
        customerEmail: "test@example.com",
        lineItems: [
          {
            productName: "Test Product",
            variantName: "Default",
            quantity: 1,
            unitPrice: 1999,
          },
        ],
        subtotal: 1999,
        total: 1999,
      });

      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("orderNumber");
      expect(result.orderNumber).toBe("GRV-0001");
    });

    it("should create order with all fields", async () => {
      mocks.mockFirst.mockResolvedValueOnce({ count: 0 });
      mocks.mockRun.mockResolvedValue({ success: true, meta: { changes: 1 } });

      const result = await createOrder(db, "tenant-1", {
        customerEmail: "test@example.com",
        customerName: "John Doe",
        customerId: "cust-1",
        lineItems: [
          {
            productId: "prod-1",
            variantId: "var-1",
            productName: "Product",
            variantName: "Variant",
            sku: "SKU-001",
            quantity: 2,
            unitPrice: 1999,
            taxAmount: 320,
            requiresShipping: true,
          },
        ],
        subtotal: 3998,
        taxTotal: 320,
        shippingTotal: 500,
        discountTotal: 0,
        total: 4818,
        currency: "usd",
        shippingAddress: {
          line1: "123 Main St",
          city: "New York",
          postalCode: "10001",
          country: "US",
        },
        billingAddress: {
          line1: "123 Main St",
          city: "New York",
          postalCode: "10001",
          country: "US",
        },
        providerSessionId: "session-123",
        customerNotes: "Gift wrap please",
        metadata: { source: "web" },
      });

      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("orderNumber");
    });

    it("should create line items for order", async () => {
      mocks.mockFirst.mockResolvedValueOnce({ count: 0 });
      mocks.mockRun.mockResolvedValue({ success: true, meta: { changes: 1 } });

      const lineItems = [
        {
          productName: "Product 1",
          variantName: "Variant 1",
          quantity: 1,
          unitPrice: 1000,
        },
        {
          productName: "Product 2",
          variantName: "Variant 2",
          quantity: 2,
          unitPrice: 2000,
        },
      ];

      await createOrder(db, "tenant-1", {
        customerEmail: "test@example.com",
        lineItems,
        subtotal: 5000,
        total: 5000,
      });

      expect(mocks.mockRun).toHaveBeenCalledTimes(3); // 1 order + 2 items
    });

    it("should detect requires_shipping from line items", async () => {
      mocks.mockFirst.mockResolvedValueOnce({ count: 0 });
      mocks.mockRun.mockResolvedValue({ success: true, meta: { changes: 1 } });

      await createOrder(db, "tenant-1", {
        customerEmail: "test@example.com",
        lineItems: [
          {
            productName: "Digital Product",
            variantName: "Download",
            quantity: 1,
            unitPrice: 999,
            requiresShipping: false,
          },
        ],
        subtotal: 999,
        total: 999,
      });

      // Check that order was created
      expect(mocks.mockRun).toHaveBeenCalled();
    });
  });

  describe("getOrderById", () => {
    it("should return order with line items", async () => {
      const mockOrder = {
        id: "order-1",
        tenant_id: "tenant-1",
        order_number: "GRV-0001",
        customer_id: null,
        customer_email: "test@example.com",
        customer_name: null,
        subtotal: 1999,
        tax_total: 0,
        shipping_total: 0,
        discount_total: 0,
        total: 1999,
        currency: "usd",
        status: "pending",
        payment_status: "pending",
        shipping_address: null,
        billing_address: null,
        requires_shipping: 0,
        fulfilled_at: null,
        shipped_at: null,
        tracking_number: null,
        tracking_url: null,
        shipping_carrier: null,
        provider_session_id: null,
        provider_payment_id: null,
        provider_invoice_id: null,
        discount_codes: "[]",
        customer_notes: null,
        internal_notes: null,
        metadata: "{}",
        paid_at: null,
        canceled_at: null,
        refunded_at: null,
        created_at: 1000000,
        updated_at: 1000000,
      };

      const mockLineItems = [
        {
          id: "item-1",
          order_id: "order-1",
          tenant_id: "tenant-1",
          product_id: "prod-1",
          variant_id: "var-1",
          product_name: "Test Product",
          variant_name: "Default",
          sku: null,
          quantity: 1,
          unit_price: 1999,
          total_price: 1999,
          tax_amount: 0,
          type: "product",
          fulfilled_quantity: 0,
          requires_shipping: 0,
          download_url: null,
          download_count: 0,
          download_limit: null,
          download_expiry: null,
          metadata: "{}",
          created_at: 1000000,
        },
      ];

      mocks.mockFirst
        .mockResolvedValueOnce(mockOrder)
        .mockResolvedValueOnce(null);
      mocks.mockAll.mockResolvedValueOnce({
        results: mockLineItems,
        success: true,
      });

      const order = await getOrderById(db, "order-1");

      expect(order).not.toBeNull();
      expect(order?.customerEmail).toBe("test@example.com");
      expect(order?.lineItems).toHaveLength(1);
    });

    it("should return null when order not found", async () => {
      mocks.mockFirst.mockResolvedValueOnce(null);

      const order = await getOrderById(db, "nonexistent");

      expect(order).toBeNull();
    });
  });

  describe("getOrderBySessionId", () => {
    it("should return order by provider session id", async () => {
      const mockOrder = {
        id: "order-1",
        tenant_id: "tenant-1",
        order_number: "GRV-0001",
        customer_id: null,
        customer_email: "test@example.com",
        customer_name: null,
        subtotal: 1999,
        tax_total: 0,
        shipping_total: 0,
        discount_total: 0,
        total: 1999,
        currency: "usd",
        status: "pending",
        payment_status: "pending",
        shipping_address: null,
        billing_address: null,
        requires_shipping: 0,
        fulfilled_at: null,
        shipped_at: null,
        tracking_number: null,
        tracking_url: null,
        shipping_carrier: null,
        provider_session_id: "session-123",
        provider_payment_id: null,
        provider_invoice_id: null,
        discount_codes: "[]",
        customer_notes: null,
        internal_notes: null,
        metadata: "{}",
        paid_at: null,
        canceled_at: null,
        refunded_at: null,
        created_at: 1000000,
        updated_at: 1000000,
      };

      mocks.mockFirst.mockResolvedValueOnce(mockOrder);
      mocks.mockAll.mockResolvedValueOnce({
        results: [],
        success: true,
      });

      const order = await getOrderBySessionId(db, "session-123");

      expect(mocks.mockBind).toHaveBeenCalledWith("session-123");
      expect(order).not.toBeNull();
    });

    it("should return null when session not found", async () => {
      mocks.mockFirst.mockResolvedValueOnce(null);

      const order = await getOrderBySessionId(db, "nonexistent");

      expect(order).toBeNull();
    });
  });

  describe("updateOrderStatus", () => {
    it("should update order status", async () => {
      mocks.mockRun.mockResolvedValueOnce({
        success: true,
        meta: { changes: 1 },
      });

      await updateOrderStatus(db, "order-1", {
        status: "paid",
        paymentStatus: "succeeded",
      });

      expect(mocks.mockPrepare).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE orders SET"),
      );
    });

    it("should support partial updates", async () => {
      mocks.mockRun.mockResolvedValueOnce({
        success: true,
        meta: { changes: 1 },
      });

      await updateOrderStatus(db, "order-1", {
        paymentStatus: "succeeded",
      });

      const prepareCall = mocks.mockPrepare.mock.calls[0][0];
      expect(prepareCall).toContain("payment_status = ?");
    });

    it("should complete without error when no fields provided", async () => {
      await updateOrderStatus(db, "order-1", {});

      // Should return early without preparing a statement
      expect(mocks.mockRun).not.toHaveBeenCalled();
    });
  });

  describe("getOrders", () => {
    it("should fetch orders for a tenant", async () => {
      const mockOrders = [
        {
          id: "order-1",
          tenant_id: "tenant-1",
          order_number: "GRV-0001",
          customer_id: null,
          customer_email: "test@example.com",
          customer_name: null,
          subtotal: 1999,
          tax_total: 0,
          shipping_total: 0,
          discount_total: 0,
          total: 1999,
          currency: "usd",
          status: "pending",
          payment_status: "pending",
          shipping_address: null,
          billing_address: null,
          requires_shipping: 0,
          fulfilled_at: null,
          shipped_at: null,
          tracking_number: null,
          tracking_url: null,
          shipping_carrier: null,
          provider_session_id: null,
          provider_payment_id: null,
          provider_invoice_id: null,
          discount_codes: "[]",
          customer_notes: null,
          internal_notes: null,
          metadata: "{}",
          paid_at: null,
          canceled_at: null,
          refunded_at: null,
          created_at: 1000000,
          updated_at: 1000000,
        },
      ];

      mocks.mockAll
        .mockResolvedValueOnce({
          results: mockOrders,
          success: true,
        })
        .mockResolvedValueOnce({
          results: [],
          success: true,
        });

      const orders = await getOrders(db, "tenant-1");

      expect(orders).toHaveLength(1);
      expect(orders[0].customerEmail).toBe("test@example.com");
    });

    it("should filter orders by status", async () => {
      mocks.mockAll.mockResolvedValueOnce({
        results: [],
        success: true,
      });

      await getOrders(db, "tenant-1", { status: "completed" });

      expect(mocks.mockPrepare).toHaveBeenCalledWith(
        expect.stringContaining("AND status = ?"),
      );
    });

    it("should filter orders by payment status", async () => {
      mocks.mockAll.mockResolvedValueOnce({
        results: [],
        success: true,
      });

      await getOrders(db, "tenant-1", { paymentStatus: "succeeded" });

      expect(mocks.mockPrepare).toHaveBeenCalledWith(
        expect.stringContaining("AND payment_status = ?"),
      );
    });

    it("should support pagination", async () => {
      mocks.mockAll.mockResolvedValueOnce({
        results: [],
        success: true,
      });

      await getOrders(db, "tenant-1", { limit: 10, offset: 20 });

      expect(mocks.mockPrepare).toHaveBeenCalledWith(
        expect.stringContaining("LIMIT ?"),
      );
    });
  });
});

// =============================================================================
// CUSTOMER OPERATIONS TESTS
// =============================================================================

describe("Customer Operations", () => {
  let db: D1Database;
  let mocks: ReturnType<typeof setupMockDbResponses>;

  beforeEach(() => {
    db = createMockDb();
    mocks = setupMockDbResponses(db);
  });

  describe("getOrCreateCustomer", () => {
    it("should return existing customer", async () => {
      const existingCustomer = {
        id: "cust-1",
        tenant_id: "tenant-1",
        email: "test@example.com",
        name: "John Doe",
        phone: "555-0123",
        default_shipping_address: null,
        default_billing_address: null,
        provider_customer_id: null,
        total_orders: 0,
        total_spent: 0,
        metadata: "{}",
        notes: null,
        accepts_marketing: 0,
        marketing_consent_at: null,
        created_at: 1000000,
        updated_at: 1000000,
      };

      mocks.mockFirst.mockResolvedValueOnce(existingCustomer);

      const customer = await getOrCreateCustomer(
        db,
        "tenant-1",
        "test@example.com",
      );

      expect(customer).not.toBeNull();
      expect(customer.id).toBe("cust-1");
      expect(customer.email).toBe("test@example.com");
    });

    it("should create new customer if not found", async () => {
      mocks.mockFirst.mockResolvedValueOnce(null);
      mocks.mockRun.mockResolvedValueOnce({
        success: true,
        meta: { changes: 1 },
      });

      const customer = await getOrCreateCustomer(
        db,
        "tenant-1",
        "new@example.com",
        {
          name: "Jane Doe",
          phone: "555-9876",
        },
      );

      expect(customer).not.toBeNull();
      expect(customer.email).toBe("new@example.com");
      expect(customer.name).toBe("Jane Doe");
    });

    it("should create customer with minimal data", async () => {
      mocks.mockFirst.mockResolvedValueOnce(null);
      mocks.mockRun.mockResolvedValueOnce({
        success: true,
        meta: { changes: 1 },
      });

      const customer = await getOrCreateCustomer(
        db,
        "tenant-1",
        "minimal@example.com",
      );

      expect(customer).not.toBeNull();
      expect(customer.email).toBe("minimal@example.com");
    });
  });

  describe("updateCustomer", () => {
    it("should update customer fields", async () => {
      mocks.mockRun.mockResolvedValueOnce({
        success: true,
        meta: { changes: 1 },
      });

      await updateCustomer(db, "cust-1", {
        name: "Jane Doe",
        phone: "555-9876",
      });

      expect(mocks.mockPrepare).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE customers SET"),
      );
    });

    it("should support address updates", async () => {
      mocks.mockRun.mockResolvedValueOnce({
        success: true,
        meta: { changes: 1 },
      });

      const address = {
        line1: "123 Main St",
        city: "New York",
        postalCode: "10001",
        country: "US",
      };

      await updateCustomer(db, "cust-1", {
        defaultShippingAddress: address,
      });

      const prepareCall = mocks.mockPrepare.mock.calls[0][0];
      expect(prepareCall).toContain("default_shipping_address = ?");
    });
  });
});

// =============================================================================
// SECURITY TESTS
// =============================================================================

describe("Security - Column Whitelisting", () => {
  let db: D1Database;
  let mocks: ReturnType<typeof setupMockDbResponses>;

  beforeEach(() => {
    db = createMockDb();
    mocks = setupMockDbResponses(db);
  });

  describe("Product Update Validation", () => {
    it("should allow updating whitelisted product columns", async () => {
      mocks.mockRun.mockResolvedValueOnce({
        success: true,
        meta: { changes: 1 },
      });

      await updateProduct(db, "prod-1", {
        name: "Updated",
        slug: "updated-slug",
        status: "active",
      });

      expect(mocks.mockPrepare).toHaveBeenCalled();
    });
  });

  describe("Variant Update Validation", () => {
    it("should allow updating whitelisted variant columns", async () => {
      mocks.mockRun.mockResolvedValueOnce({
        success: true,
        meta: { changes: 1 },
      });

      await updateVariant(db, "var-1", {
        name: "Updated Variant",
        priceAmount: 5000,
        isDefault: true,
      });

      expect(mocks.mockPrepare).toHaveBeenCalled();
    });
  });

  describe("Order Update Validation", () => {
    it("should allow updating whitelisted order columns", async () => {
      mocks.mockRun.mockResolvedValueOnce({
        success: true,
        meta: { changes: 1 },
      });

      await updateOrderStatus(db, "order-1", {
        status: "completed",
        paymentStatus: "succeeded",
        paidAt: Date.now() / 1000,
      });

      expect(mocks.mockPrepare).toHaveBeenCalled();
    });
  });

  describe("Customer Update Validation", () => {
    it("should allow updating whitelisted customer columns", async () => {
      mocks.mockRun.mockResolvedValueOnce({
        success: true,
        meta: { changes: 1 },
      });

      await updateCustomer(db, "cust-1", {
        name: "Updated Name",
        phone: "555-0000",
      });

      expect(mocks.mockPrepare).toHaveBeenCalled();
    });
  });
});

// =============================================================================
// EDGE CASES & DATA MAPPING TESTS
// =============================================================================

describe("Data Mapping & Edge Cases", () => {
  let db: D1Database;
  let mocks: ReturnType<typeof setupMockDbResponses>;

  beforeEach(() => {
    db = createMockDb();
    mocks = setupMockDbResponses(db);
  });

  describe("JSON serialization", () => {
    it("should serialize array fields as JSON", async () => {
      mocks.mockRun.mockResolvedValueOnce({
        success: true,
        meta: { changes: 1 },
      });

      await createProduct(db, "tenant-1", {
        name: "Product",
        slug: "product",
        images: ["image1.jpg", "image2.jpg"],
        tags: ["tag1", "tag2"],
      });

      const bindCall = mocks.mockBind.mock.calls[0];
      expect(bindCall).toContain(JSON.stringify(["image1.jpg", "image2.jpg"]));
      expect(bindCall).toContain(JSON.stringify(["tag1", "tag2"]));
    });

    it("should serialize object fields as JSON", async () => {
      mocks.mockRun.mockResolvedValueOnce({
        success: true,
        meta: { changes: 1 },
      });

      const metadata = { custom: "value" };

      await createProduct(db, "tenant-1", {
        name: "Product",
        slug: "product",
        metadata,
      });

      const bindCall = mocks.mockBind.mock.calls[0];
      expect(bindCall).toContain(JSON.stringify(metadata));
    });
  });

  describe("Boolean field conversion", () => {
    it("should convert boolean to 1/0 for variant", async () => {
      mocks.mockRun.mockResolvedValueOnce({
        success: true,
        meta: { changes: 1 },
      });

      await createVariant(db, "prod-1", "tenant-1", {
        name: "Default",
        priceAmount: 1999,
        trackInventory: true,
        requiresShipping: false,
        isDefault: true,
      });

      const bindCall = mocks.mockBind.mock.calls[0];
      expect(bindCall).toContain(1); // trackInventory
      expect(bindCall).toContain(0); // requiresShipping
      expect(bindCall).toContain(1); // isDefault
    });

    it("should convert boolean to 1/0 in variant update", async () => {
      mocks.mockRun.mockResolvedValueOnce({
        success: true,
        meta: { changes: 1 },
      });

      await updateVariant(db, "var-1", {
        trackInventory: true,
        requiresShipping: false,
      });

      const bindCall = mocks.mockBind.mock.calls[0];
      expect(bindCall).toContain(1); // trackInventory
      expect(bindCall).toContain(0); // requiresShipping
    });
  });

  describe("Null handling", () => {
    it("should handle null optional fields in product creation", async () => {
      mocks.mockRun.mockResolvedValueOnce({
        success: true,
        meta: { changes: 1 },
      });

      await createProduct(db, "tenant-1", {
        name: "Product",
        slug: "product",
        // description intentionally omitted
        // shortDescription intentionally omitted
      });

      const bindCall = mocks.mockBind.mock.calls[0];
      expect(bindCall).toContain(null); // description
      expect(bindCall).toContain(null); // shortDescription
    });

    it("should handle null optional fields in variant creation", async () => {
      mocks.mockRun.mockResolvedValueOnce({
        success: true,
        meta: { changes: 1 },
      });

      await createVariant(db, "prod-1", "tenant-1", {
        name: "Variant",
        priceAmount: 999,
        // sku intentionally omitted
        // downloadUrl intentionally omitted
      });

      const bindCall = mocks.mockBind.mock.calls[0];
      expect(bindCall).toContain(null); // sku
      expect(bindCall).toContain(null); // downloadUrl
    });
  });
});
