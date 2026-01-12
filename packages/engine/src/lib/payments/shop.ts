/**
 * Shop Database Operations
 *
 * Utilities for managing products, orders, and customers in D1.
 */

import type {
  Product,
  ProductBase,
  ProductVariant,
  ProductType,
  ProductStatus,
  Order,
  OrderStatus,
  PaymentStatus,
  LineItem,
  Customer,
  Money,
  PricingType,
  BillingInterval,
} from "./types.js";

// =============================================================================
// COLUMN WHITELISTS FOR SAFE UPDATES
// =============================================================================

/**
 * Whitelisted columns for product updates.
 * Only these columns can be updated to prevent SQL injection via column names.
 */
const PRODUCT_UPDATE_COLUMNS = new Set([
  "name",
  "slug",
  "description",
  "short_description",
  "type",
  "status",
  "images",
  "featured_image",
  "meta_title",
  "meta_description",
  "category",
  "tags",
  "provider_product_id",
  "metadata",
]);

/**
 * Whitelisted columns for variant updates.
 * Only these columns can be updated to prevent SQL injection via column names.
 */
const VARIANT_UPDATE_COLUMNS = new Set([
  "name",
  "sku",
  "price_amount",
  "compare_at_price",
  "pricing_type",
  "billing_interval",
  "billing_interval_count",
  "inventory_quantity",
  "inventory_policy",
  "track_inventory",
  "download_url",
  "download_limit",
  "requires_shipping",
  "provider_price_id",
  "is_default",
  "position",
  "metadata",
]);

/**
 * Whitelisted columns for customer updates.
 * Only these columns can be updated to prevent SQL injection via column names.
 */
const CUSTOMER_UPDATE_COLUMNS = new Set([
  "name",
  "phone",
  "provider_customer_id",
  "default_shipping_address",
  "default_billing_address",
  "total_orders",
  "total_spent",
]);

/**
 * Whitelisted columns for order status updates.
 * Only these columns can be updated to prevent SQL injection via column names.
 */
const ORDER_UPDATE_COLUMNS = new Set([
  "status",
  "payment_status",
  "provider_payment_id",
  "paid_at",
]);

/**
 * Validates that a column name is in the whitelist.
 * Throws an error if the column is not allowed.
 */
function validateUpdateColumn(
  column: string,
  allowedColumns: Set<string>,
): void {
  if (!allowedColumns.has(column)) {
    throw new Error(`Column "${column}" is not allowed for update operations`);
  }
}

// =============================================================================
// TYPES FOR DATABASE ROWS
// =============================================================================

interface ProductRow {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  type: string;
  status: string;
  images: string;
  featured_image: string | null;
  meta_title: string | null;
  meta_description: string | null;
  category: string | null;
  tags: string;
  provider_product_id: string | null;
  metadata: string;
  created_at: number;
  updated_at: number;
}

interface VariantRow {
  id: string;
  product_id: string;
  tenant_id: string;
  name: string;
  sku: string | null;
  price_amount: number;
  price_currency: string;
  compare_at_price: number | null;
  pricing_type: string;
  billing_interval: string | null;
  billing_interval_count: number | null;
  inventory_quantity: number | null;
  inventory_policy: string;
  track_inventory: number;
  download_url: string | null;
  download_limit: number | null;
  download_expiry_days: number | null;
  weight_grams: number | null;
  requires_shipping: number;
  provider_price_id: string | null;
  is_default: number;
  position: number;
  metadata: string;
  created_at: number;
  updated_at: number;
}

interface OrderRow {
  id: string;
  tenant_id: string;
  order_number: string;
  customer_id: string | null;
  customer_email: string;
  customer_name: string | null;
  subtotal: number;
  tax_total: number;
  shipping_total: number;
  discount_total: number;
  total: number;
  currency: string;
  status: string;
  payment_status: string;
  shipping_address: string | null;
  billing_address: string | null;
  requires_shipping: number;
  fulfilled_at: number | null;
  shipped_at: number | null;
  tracking_number: string | null;
  tracking_url: string | null;
  shipping_carrier: string | null;
  provider_session_id: string | null;
  provider_payment_id: string | null;
  provider_invoice_id: string | null;
  discount_codes: string;
  customer_notes: string | null;
  internal_notes: string | null;
  metadata: string;
  paid_at: number | null;
  canceled_at: number | null;
  refunded_at: number | null;
  created_at: number;
  updated_at: number;
}

interface LineItemRow {
  id: string;
  order_id: string;
  tenant_id: string;
  product_id: string | null;
  variant_id: string | null;
  product_name: string;
  variant_name: string;
  sku: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  tax_amount: number;
  type: string;
  fulfilled_quantity: number;
  requires_shipping: number;
  download_url: string | null;
  download_count: number;
  download_limit: number | null;
  download_expiry: number | null;
  metadata: string;
  created_at: number;
}

interface CustomerRow {
  id: string;
  tenant_id: string;
  email: string;
  name: string | null;
  phone: string | null;
  default_shipping_address: string | null;
  default_billing_address: string | null;
  provider_customer_id: string | null;
  total_orders: number;
  total_spent: number;
  metadata: string;
  notes: string | null;
  accepts_marketing: number;
  marketing_consent_at: number | null;
  created_at: number;
  updated_at: number;
}

// =============================================================================
// D1 DATABASE TYPE
// =============================================================================

interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(): Promise<T | null>;
  all<T = unknown>(): Promise<D1Result<T>>;
  run(): Promise<D1Result>;
}

interface D1Result<T = unknown> {
  results: T[];
  success: boolean;
  meta?: {
    changes?: number;
    last_row_id?: number;
  };
}

// =============================================================================
// PRODUCT OPERATIONS
// =============================================================================

export async function getProducts(
  db: D1Database,
  tenantId: string,
  options: {
    status?: ProductStatus;
    type?: ProductType;
    category?: string;
    limit?: number;
    offset?: number;
  } = {},
): Promise<Product[]> {
  let query = `
    SELECT * FROM products
    WHERE tenant_id = ?
  `;
  const params: unknown[] = [tenantId];

  if (options.status) {
    query += " AND status = ?";
    params.push(options.status);
  }

  if (options.type) {
    query += " AND type = ?";
    params.push(options.type);
  }

  if (options.category) {
    query += " AND category = ?";
    params.push(options.category);
  }

  query += " ORDER BY created_at DESC";

  if (options.limit) {
    query += " LIMIT ?";
    params.push(options.limit);
  }

  if (options.offset) {
    query += " OFFSET ?";
    params.push(options.offset);
  }

  const result = await db
    .prepare(query)
    .bind(...params)
    .all<ProductRow>();
  const products = result.results.map(mapProductRow);

  // Fetch variants for each product
  for (const product of products) {
    const variants = await getProductVariants(db, product.id);
    (product as Product).variants = variants;
    (product as Product).defaultVariantId = variants.find(
      (v) => v.isDefault,
    )?.id;
  }

  return products as Product[];
}

export async function getProductBySlug(
  db: D1Database,
  tenantId: string,
  slug: string,
): Promise<Product | null> {
  const row = await db
    .prepare("SELECT * FROM products WHERE tenant_id = ? AND slug = ?")
    .bind(tenantId, slug)
    .first<ProductRow>();

  if (!row) return null;

  const product = mapProductRow(row);
  const variants = await getProductVariants(db, product.id);

  return {
    ...product,
    variants,
    defaultVariantId: variants.find((v) => v.isDefault)?.id,
  };
}

export async function getProductById(
  db: D1Database,
  productId: string,
): Promise<Product | null> {
  const row = await db
    .prepare("SELECT * FROM products WHERE id = ?")
    .bind(productId)
    .first<ProductRow>();

  if (!row) return null;

  const product = mapProductRow(row);
  const variants = await getProductVariants(db, product.id);

  return {
    ...product,
    variants,
    defaultVariantId: variants.find((v) => v.isDefault)?.id,
  };
}

export async function createProduct(
  db: D1Database,
  tenantId: string,
  data: {
    name: string;
    slug: string;
    description?: string;
    shortDescription?: string;
    type?: ProductType;
    status?: ProductStatus;
    images?: string[];
    featuredImage?: string;
    category?: string;
    tags?: string[];
    metadata?: Record<string, string>;
  },
): Promise<{ id: string }> {
  const id = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);

  await db
    .prepare(
      `INSERT INTO products (
        id, tenant_id, name, slug, description, short_description,
        type, status, images, featured_image, category, tags, metadata,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      tenantId,
      data.name,
      data.slug,
      data.description || null,
      data.shortDescription || null,
      data.type || "physical",
      data.status || "draft",
      JSON.stringify(data.images || []),
      data.featuredImage || null,
      data.category || null,
      JSON.stringify(data.tags || []),
      JSON.stringify(data.metadata || {}),
      now,
      now,
    )
    .run();

  return { id };
}

export async function updateProduct(
  db: D1Database,
  productId: string,
  data: Partial<{
    name: string;
    slug: string;
    description: string;
    shortDescription: string;
    type: ProductType;
    status: ProductStatus;
    images: string[];
    featuredImage: string;
    category: string;
    tags: string[];
    providerProductId: string;
    metadata: Record<string, string>;
  }>,
): Promise<void> {
  const updates: string[] = [];
  const params: unknown[] = [];

  // Map of camelCase keys to database column names for validation
  const columnMap: Record<string, string> = {
    name: "name",
    slug: "slug",
    description: "description",
    shortDescription: "short_description",
    type: "type",
    status: "status",
    images: "images",
    featuredImage: "featured_image",
    category: "category",
    tags: "tags",
    providerProductId: "provider_product_id",
    metadata: "metadata",
  };

  if (data.name !== undefined) {
    validateUpdateColumn(columnMap.name, PRODUCT_UPDATE_COLUMNS);
    updates.push("name = ?");
    params.push(data.name);
  }
  if (data.slug !== undefined) {
    validateUpdateColumn(columnMap.slug, PRODUCT_UPDATE_COLUMNS);
    updates.push("slug = ?");
    params.push(data.slug);
  }
  if (data.description !== undefined) {
    validateUpdateColumn(columnMap.description, PRODUCT_UPDATE_COLUMNS);
    updates.push("description = ?");
    params.push(data.description);
  }
  if (data.shortDescription !== undefined) {
    validateUpdateColumn(columnMap.shortDescription, PRODUCT_UPDATE_COLUMNS);
    updates.push("short_description = ?");
    params.push(data.shortDescription);
  }
  if (data.type !== undefined) {
    validateUpdateColumn(columnMap.type, PRODUCT_UPDATE_COLUMNS);
    updates.push("type = ?");
    params.push(data.type);
  }
  if (data.status !== undefined) {
    validateUpdateColumn(columnMap.status, PRODUCT_UPDATE_COLUMNS);
    updates.push("status = ?");
    params.push(data.status);
  }
  if (data.images !== undefined) {
    validateUpdateColumn(columnMap.images, PRODUCT_UPDATE_COLUMNS);
    updates.push("images = ?");
    params.push(JSON.stringify(data.images));
  }
  if (data.featuredImage !== undefined) {
    validateUpdateColumn(columnMap.featuredImage, PRODUCT_UPDATE_COLUMNS);
    updates.push("featured_image = ?");
    params.push(data.featuredImage);
  }
  if (data.category !== undefined) {
    validateUpdateColumn(columnMap.category, PRODUCT_UPDATE_COLUMNS);
    updates.push("category = ?");
    params.push(data.category);
  }
  if (data.tags !== undefined) {
    validateUpdateColumn(columnMap.tags, PRODUCT_UPDATE_COLUMNS);
    updates.push("tags = ?");
    params.push(JSON.stringify(data.tags));
  }
  if (data.providerProductId !== undefined) {
    validateUpdateColumn(columnMap.providerProductId, PRODUCT_UPDATE_COLUMNS);
    updates.push("provider_product_id = ?");
    params.push(data.providerProductId);
  }
  if (data.metadata !== undefined) {
    validateUpdateColumn(columnMap.metadata, PRODUCT_UPDATE_COLUMNS);
    updates.push("metadata = ?");
    params.push(JSON.stringify(data.metadata));
  }

  if (updates.length === 0) return;

  updates.push("updated_at = ?");
  params.push(Math.floor(Date.now() / 1000));
  params.push(productId);

  await db
    .prepare(`UPDATE products SET ${updates.join(", ")} WHERE id = ?`)
    .bind(...params)
    .run();
}

export async function deleteProduct(
  db: D1Database,
  productId: string,
): Promise<void> {
  await db.prepare("DELETE FROM products WHERE id = ?").bind(productId).run();
}

// =============================================================================
// VARIANT OPERATIONS
// =============================================================================

export async function getProductVariants(
  db: D1Database,
  productId: string,
): Promise<ProductVariant[]> {
  const result = await db
    .prepare(
      "SELECT * FROM product_variants WHERE product_id = ? ORDER BY position",
    )
    .bind(productId)
    .all<VariantRow>();

  return result.results.map(mapVariantRow);
}

export async function getVariantById(
  db: D1Database,
  variantId: string,
): Promise<ProductVariant | null> {
  const row = await db
    .prepare("SELECT * FROM product_variants WHERE id = ?")
    .bind(variantId)
    .first<VariantRow>();

  return row ? mapVariantRow(row) : null;
}

export async function createVariant(
  db: D1Database,
  productId: string,
  tenantId: string,
  data: {
    name: string;
    sku?: string;
    priceAmount: number;
    priceCurrency?: string;
    compareAtPrice?: number;
    pricingType?: PricingType;
    billingInterval?: BillingInterval;
    billingIntervalCount?: number;
    inventoryQuantity?: number;
    inventoryPolicy?: "deny" | "continue";
    trackInventory?: boolean;
    downloadUrl?: string;
    downloadLimit?: number;
    requiresShipping?: boolean;
    isDefault?: boolean;
    position?: number;
    metadata?: Record<string, string>;
  },
): Promise<{ id: string }> {
  const id = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);

  await db
    .prepare(
      `INSERT INTO product_variants (
        id, product_id, tenant_id, name, sku,
        price_amount, price_currency, compare_at_price,
        pricing_type, billing_interval, billing_interval_count,
        inventory_quantity, inventory_policy, track_inventory,
        download_url, download_limit, requires_shipping,
        is_default, position, metadata, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      productId,
      tenantId,
      data.name,
      data.sku || null,
      data.priceAmount,
      data.priceCurrency || "usd",
      data.compareAtPrice || null,
      data.pricingType || "one_time",
      data.billingInterval || null,
      data.billingIntervalCount || 1,
      data.inventoryQuantity ?? null,
      data.inventoryPolicy || "deny",
      data.trackInventory ? 1 : 0,
      data.downloadUrl || null,
      data.downloadLimit || null,
      data.requiresShipping ? 1 : 0,
      data.isDefault ? 1 : 0,
      data.position ?? 0,
      JSON.stringify(data.metadata || {}),
      now,
      now,
    )
    .run();

  return { id };
}

export async function updateVariant(
  db: D1Database,
  variantId: string,
  data: Partial<{
    name: string;
    sku: string;
    priceAmount: number;
    compareAtPrice: number;
    pricingType: PricingType;
    billingInterval: BillingInterval;
    billingIntervalCount: number;
    inventoryQuantity: number;
    inventoryPolicy: "deny" | "continue";
    trackInventory: boolean;
    downloadUrl: string;
    downloadLimit: number;
    requiresShipping: boolean;
    providerPriceId: string;
    isDefault: boolean;
    position: number;
    metadata: Record<string, string>;
  }>,
): Promise<void> {
  const updates: string[] = [];
  const params: unknown[] = [];

  // Map of camelCase keys to database column names for validation
  const columnMap: Record<string, string> = {
    name: "name",
    sku: "sku",
    priceAmount: "price_amount",
    compareAtPrice: "compare_at_price",
    pricingType: "pricing_type",
    billingInterval: "billing_interval",
    billingIntervalCount: "billing_interval_count",
    inventoryQuantity: "inventory_quantity",
    inventoryPolicy: "inventory_policy",
    trackInventory: "track_inventory",
    downloadUrl: "download_url",
    downloadLimit: "download_limit",
    requiresShipping: "requires_shipping",
    providerPriceId: "provider_price_id",
    isDefault: "is_default",
    position: "position",
    metadata: "metadata",
  };

  if (data.name !== undefined) {
    validateUpdateColumn(columnMap.name, VARIANT_UPDATE_COLUMNS);
    updates.push("name = ?");
    params.push(data.name);
  }
  if (data.sku !== undefined) {
    validateUpdateColumn(columnMap.sku, VARIANT_UPDATE_COLUMNS);
    updates.push("sku = ?");
    params.push(data.sku);
  }
  if (data.priceAmount !== undefined) {
    validateUpdateColumn(columnMap.priceAmount, VARIANT_UPDATE_COLUMNS);
    updates.push("price_amount = ?");
    params.push(data.priceAmount);
  }
  if (data.compareAtPrice !== undefined) {
    validateUpdateColumn(columnMap.compareAtPrice, VARIANT_UPDATE_COLUMNS);
    updates.push("compare_at_price = ?");
    params.push(data.compareAtPrice);
  }
  if (data.pricingType !== undefined) {
    validateUpdateColumn(columnMap.pricingType, VARIANT_UPDATE_COLUMNS);
    updates.push("pricing_type = ?");
    params.push(data.pricingType);
  }
  if (data.billingInterval !== undefined) {
    validateUpdateColumn(columnMap.billingInterval, VARIANT_UPDATE_COLUMNS);
    updates.push("billing_interval = ?");
    params.push(data.billingInterval);
  }
  if (data.billingIntervalCount !== undefined) {
    validateUpdateColumn(
      columnMap.billingIntervalCount,
      VARIANT_UPDATE_COLUMNS,
    );
    updates.push("billing_interval_count = ?");
    params.push(data.billingIntervalCount);
  }
  if (data.inventoryQuantity !== undefined) {
    validateUpdateColumn(columnMap.inventoryQuantity, VARIANT_UPDATE_COLUMNS);
    updates.push("inventory_quantity = ?");
    params.push(data.inventoryQuantity);
  }
  if (data.inventoryPolicy !== undefined) {
    validateUpdateColumn(columnMap.inventoryPolicy, VARIANT_UPDATE_COLUMNS);
    updates.push("inventory_policy = ?");
    params.push(data.inventoryPolicy);
  }
  if (data.trackInventory !== undefined) {
    validateUpdateColumn(columnMap.trackInventory, VARIANT_UPDATE_COLUMNS);
    updates.push("track_inventory = ?");
    params.push(data.trackInventory ? 1 : 0);
  }
  if (data.downloadUrl !== undefined) {
    validateUpdateColumn(columnMap.downloadUrl, VARIANT_UPDATE_COLUMNS);
    updates.push("download_url = ?");
    params.push(data.downloadUrl);
  }
  if (data.downloadLimit !== undefined) {
    validateUpdateColumn(columnMap.downloadLimit, VARIANT_UPDATE_COLUMNS);
    updates.push("download_limit = ?");
    params.push(data.downloadLimit);
  }
  if (data.requiresShipping !== undefined) {
    validateUpdateColumn(columnMap.requiresShipping, VARIANT_UPDATE_COLUMNS);
    updates.push("requires_shipping = ?");
    params.push(data.requiresShipping ? 1 : 0);
  }
  if (data.providerPriceId !== undefined) {
    validateUpdateColumn(columnMap.providerPriceId, VARIANT_UPDATE_COLUMNS);
    updates.push("provider_price_id = ?");
    params.push(data.providerPriceId);
  }
  if (data.isDefault !== undefined) {
    validateUpdateColumn(columnMap.isDefault, VARIANT_UPDATE_COLUMNS);
    updates.push("is_default = ?");
    params.push(data.isDefault ? 1 : 0);
  }
  if (data.position !== undefined) {
    validateUpdateColumn(columnMap.position, VARIANT_UPDATE_COLUMNS);
    updates.push("position = ?");
    params.push(data.position);
  }
  if (data.metadata !== undefined) {
    validateUpdateColumn(columnMap.metadata, VARIANT_UPDATE_COLUMNS);
    updates.push("metadata = ?");
    params.push(JSON.stringify(data.metadata));
  }

  if (updates.length === 0) return;

  updates.push("updated_at = ?");
  params.push(Math.floor(Date.now() / 1000));
  params.push(variantId);

  await db
    .prepare(`UPDATE product_variants SET ${updates.join(", ")} WHERE id = ?`)
    .bind(...params)
    .run();
}

export async function deleteVariant(
  db: D1Database,
  variantId: string,
): Promise<void> {
  await db
    .prepare("DELETE FROM product_variants WHERE id = ?")
    .bind(variantId)
    .run();
}

// =============================================================================
// ORDER OPERATIONS
// =============================================================================

export async function generateOrderNumber(
  db: D1Database,
  tenantId: string,
): Promise<string> {
  // Get the count of orders for this tenant
  const result = await db
    .prepare("SELECT COUNT(*) as count FROM orders WHERE tenant_id = ?")
    .bind(tenantId)
    .first<{ count: number }>();

  const count = (result?.count || 0) + 1;
  return `GRV-${count.toString().padStart(4, "0")}`;
}

export async function createOrder(
  db: D1Database,
  tenantId: string,
  data: {
    customerEmail: string;
    customerName?: string;
    customerId?: string;
    lineItems: Array<{
      productId?: string;
      variantId?: string;
      productName: string;
      variantName: string;
      sku?: string;
      quantity: number;
      unitPrice: number;
      taxAmount?: number;
      requiresShipping?: boolean;
    }>;
    subtotal: number;
    taxTotal?: number;
    shippingTotal?: number;
    discountTotal?: number;
    total: number;
    currency?: string;
    shippingAddress?: object;
    billingAddress?: object;
    providerSessionId?: string;
    customerNotes?: string;
    metadata?: Record<string, string>;
  },
): Promise<{ id: string; orderNumber: string }> {
  const id = crypto.randomUUID();
  const orderNumber = await generateOrderNumber(db, tenantId);
  const now = Math.floor(Date.now() / 1000);
  const requiresShipping = data.lineItems.some((item) => item.requiresShipping);

  // Insert order
  await db
    .prepare(
      `INSERT INTO orders (
        id, tenant_id, order_number, customer_id, customer_email, customer_name,
        subtotal, tax_total, shipping_total, discount_total, total, currency,
        status, payment_status, shipping_address, billing_address, requires_shipping,
        provider_session_id, customer_notes, metadata, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      tenantId,
      orderNumber,
      data.customerId || null,
      data.customerEmail,
      data.customerName || null,
      data.subtotal,
      data.taxTotal || 0,
      data.shippingTotal || 0,
      data.discountTotal || 0,
      data.total,
      data.currency || "usd",
      "pending",
      "pending",
      data.shippingAddress ? JSON.stringify(data.shippingAddress) : null,
      data.billingAddress ? JSON.stringify(data.billingAddress) : null,
      requiresShipping ? 1 : 0,
      data.providerSessionId || null,
      data.customerNotes || null,
      JSON.stringify(data.metadata || {}),
      now,
      now,
    )
    .run();

  // Insert line items
  for (const item of data.lineItems) {
    const lineItemId = crypto.randomUUID();
    await db
      .prepare(
        `INSERT INTO order_line_items (
          id, order_id, tenant_id, product_id, variant_id, product_name, variant_name,
          sku, quantity, unit_price, total_price, tax_amount, type, requires_shipping,
          metadata, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        lineItemId,
        id,
        tenantId,
        item.productId || null,
        item.variantId || null,
        item.productName,
        item.variantName,
        item.sku || null,
        item.quantity,
        item.unitPrice,
        item.unitPrice * item.quantity,
        item.taxAmount || 0,
        "product",
        item.requiresShipping ? 1 : 0,
        "{}",
        now,
      )
      .run();
  }

  return { id, orderNumber };
}

export async function getOrderById(
  db: D1Database,
  orderId: string,
): Promise<Order | null> {
  const row = await db
    .prepare("SELECT * FROM orders WHERE id = ?")
    .bind(orderId)
    .first<OrderRow>();

  if (!row) return null;

  const lineItemRows = await db
    .prepare("SELECT * FROM order_line_items WHERE order_id = ?")
    .bind(orderId)
    .all<LineItemRow>();

  return mapOrderRow(row, lineItemRows.results);
}

export async function getOrderBySessionId(
  db: D1Database,
  sessionId: string,
): Promise<Order | null> {
  const row = await db
    .prepare("SELECT * FROM orders WHERE provider_session_id = ?")
    .bind(sessionId)
    .first<OrderRow>();

  if (!row) return null;

  const lineItemRows = await db
    .prepare("SELECT * FROM order_line_items WHERE order_id = ?")
    .bind(row.id)
    .all<LineItemRow>();

  return mapOrderRow(row, lineItemRows.results);
}

export async function updateOrderStatus(
  db: D1Database,
  orderId: string,
  data: {
    status?: OrderStatus;
    paymentStatus?: PaymentStatus;
    providerPaymentId?: string;
    paidAt?: number;
  },
): Promise<void> {
  const updates: string[] = [];
  const params: unknown[] = [];

  // Map of camelCase keys to database column names for validation
  const columnMap: Record<string, string> = {
    status: "status",
    paymentStatus: "payment_status",
    providerPaymentId: "provider_payment_id",
    paidAt: "paid_at",
  };

  if (data.status !== undefined) {
    validateUpdateColumn(columnMap.status, ORDER_UPDATE_COLUMNS);
    updates.push("status = ?");
    params.push(data.status);
  }
  if (data.paymentStatus !== undefined) {
    validateUpdateColumn(columnMap.paymentStatus, ORDER_UPDATE_COLUMNS);
    updates.push("payment_status = ?");
    params.push(data.paymentStatus);
  }
  if (data.providerPaymentId !== undefined) {
    validateUpdateColumn(columnMap.providerPaymentId, ORDER_UPDATE_COLUMNS);
    updates.push("provider_payment_id = ?");
    params.push(data.providerPaymentId);
  }
  if (data.paidAt !== undefined) {
    validateUpdateColumn(columnMap.paidAt, ORDER_UPDATE_COLUMNS);
    updates.push("paid_at = ?");
    params.push(data.paidAt);
  }

  if (updates.length === 0) return;

  updates.push("updated_at = ?");
  params.push(Math.floor(Date.now() / 1000));
  params.push(orderId);

  await db
    .prepare(`UPDATE orders SET ${updates.join(", ")} WHERE id = ?`)
    .bind(...params)
    .run();
}

export async function getOrders(
  db: D1Database,
  tenantId: string,
  options: {
    status?: OrderStatus;
    paymentStatus?: PaymentStatus;
    limit?: number;
    offset?: number;
  } = {},
): Promise<Order[]> {
  let query = "SELECT * FROM orders WHERE tenant_id = ?";
  const params: unknown[] = [tenantId];

  if (options.status) {
    query += " AND status = ?";
    params.push(options.status);
  }

  if (options.paymentStatus) {
    query += " AND payment_status = ?";
    params.push(options.paymentStatus);
  }

  query += " ORDER BY created_at DESC";

  if (options.limit) {
    query += " LIMIT ?";
    params.push(options.limit);
  }

  if (options.offset) {
    query += " OFFSET ?";
    params.push(options.offset);
  }

  const result = await db
    .prepare(query)
    .bind(...params)
    .all<OrderRow>();

  const orders: Order[] = [];
  for (const row of result.results) {
    const lineItemRows = await db
      .prepare("SELECT * FROM order_line_items WHERE order_id = ?")
      .bind(row.id)
      .all<LineItemRow>();

    orders.push(mapOrderRow(row, lineItemRows.results));
  }

  return orders;
}

// =============================================================================
// CUSTOMER OPERATIONS
// =============================================================================

export async function getOrCreateCustomer(
  db: D1Database,
  tenantId: string,
  email: string,
  data?: {
    name?: string;
    phone?: string;
  },
): Promise<Customer> {
  // Try to find existing customer
  const existing = await db
    .prepare("SELECT * FROM customers WHERE tenant_id = ? AND email = ?")
    .bind(tenantId, email)
    .first<CustomerRow>();

  if (existing) {
    return mapCustomerRow(existing);
  }

  // Create new customer
  const id = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);

  await db
    .prepare(
      `INSERT INTO customers (
        id, tenant_id, email, name, phone, metadata, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      tenantId,
      email,
      data?.name || null,
      data?.phone || null,
      "{}",
      now,
      now,
    )
    .run();

  return {
    id,
    tenantId,
    email,
    name: data?.name,
    phone: data?.phone,
    metadata: {},
    createdAt: new Date(now * 1000),
    updatedAt: new Date(now * 1000),
  };
}

export async function updateCustomer(
  db: D1Database,
  customerId: string,
  data: Partial<{
    name: string;
    phone: string;
    providerCustomerId: string;
    defaultShippingAddress: object;
    defaultBillingAddress: object;
    totalOrders: number;
    totalSpent: number;
  }>,
): Promise<void> {
  const updates: string[] = [];
  const params: unknown[] = [];

  // Map of camelCase keys to database column names for validation
  const columnMap: Record<string, string> = {
    name: "name",
    phone: "phone",
    providerCustomerId: "provider_customer_id",
    defaultShippingAddress: "default_shipping_address",
    defaultBillingAddress: "default_billing_address",
    totalOrders: "total_orders",
    totalSpent: "total_spent",
  };

  if (data.name !== undefined) {
    validateUpdateColumn(columnMap.name, CUSTOMER_UPDATE_COLUMNS);
    updates.push("name = ?");
    params.push(data.name);
  }
  if (data.phone !== undefined) {
    validateUpdateColumn(columnMap.phone, CUSTOMER_UPDATE_COLUMNS);
    updates.push("phone = ?");
    params.push(data.phone);
  }
  if (data.providerCustomerId !== undefined) {
    validateUpdateColumn(columnMap.providerCustomerId, CUSTOMER_UPDATE_COLUMNS);
    updates.push("provider_customer_id = ?");
    params.push(data.providerCustomerId);
  }
  if (data.defaultShippingAddress !== undefined) {
    validateUpdateColumn(
      columnMap.defaultShippingAddress,
      CUSTOMER_UPDATE_COLUMNS,
    );
    updates.push("default_shipping_address = ?");
    params.push(JSON.stringify(data.defaultShippingAddress));
  }
  if (data.defaultBillingAddress !== undefined) {
    validateUpdateColumn(
      columnMap.defaultBillingAddress,
      CUSTOMER_UPDATE_COLUMNS,
    );
    updates.push("default_billing_address = ?");
    params.push(JSON.stringify(data.defaultBillingAddress));
  }
  if (data.totalOrders !== undefined) {
    validateUpdateColumn(columnMap.totalOrders, CUSTOMER_UPDATE_COLUMNS);
    updates.push("total_orders = ?");
    params.push(data.totalOrders);
  }
  if (data.totalSpent !== undefined) {
    validateUpdateColumn(columnMap.totalSpent, CUSTOMER_UPDATE_COLUMNS);
    updates.push("total_spent = ?");
    params.push(data.totalSpent);
  }

  if (updates.length === 0) return;

  updates.push("updated_at = ?");
  params.push(Math.floor(Date.now() / 1000));
  params.push(customerId);

  await db
    .prepare(`UPDATE customers SET ${updates.join(", ")} WHERE id = ?`)
    .bind(...params)
    .run();
}

// =============================================================================
// ROW MAPPERS
// =============================================================================

function mapProductRow(row: ProductRow): ProductBase {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    description: row.description || undefined,
    type: row.type as ProductType,
    status: row.status as ProductStatus,
    images: JSON.parse(row.images || "[]"),
    metadata: JSON.parse(row.metadata || "{}"),
    createdAt: new Date(row.created_at * 1000),
    updatedAt: new Date(row.updated_at * 1000),
  };
}

function mapVariantRow(row: VariantRow): ProductVariant {
  return {
    id: row.id,
    productId: row.product_id,
    name: row.name,
    sku: row.sku || undefined,
    price: {
      amount: row.price_amount,
      currency: row.price_currency,
    },
    compareAtPrice: row.compare_at_price
      ? { amount: row.compare_at_price, currency: row.price_currency }
      : undefined,
    pricingType: row.pricing_type as PricingType,
    recurring:
      row.billing_interval && row.pricing_type === "recurring"
        ? {
            interval: row.billing_interval as BillingInterval,
            intervalCount: row.billing_interval_count || 1,
          }
        : undefined,
    inventoryQuantity: row.inventory_quantity ?? undefined,
    inventoryPolicy: row.inventory_policy as "deny" | "continue",
    downloadUrl: row.download_url || undefined,
    downloadLimit: row.download_limit ?? undefined,
    providerPriceId: row.provider_price_id || undefined,
    isDefault: row.is_default === 1,
    position: row.position,
    createdAt: new Date(row.created_at * 1000),
    updatedAt: new Date(row.updated_at * 1000),
  };
}

function mapOrderRow(row: OrderRow, lineItemRows: LineItemRow[]): Order {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    customerId: row.customer_id || undefined,
    customerEmail: row.customer_email,
    lineItems: lineItemRows.map(mapLineItemRow),
    subtotal: { amount: row.subtotal, currency: row.currency },
    taxTotal: { amount: row.tax_total, currency: row.currency },
    shippingTotal: { amount: row.shipping_total, currency: row.currency },
    discountTotal: { amount: row.discount_total, currency: row.currency },
    total: { amount: row.total, currency: row.currency },
    status: row.status as OrderStatus,
    paymentStatus: row.payment_status as PaymentStatus,
    providerOrderId: row.provider_payment_id || undefined,
    providerSessionId: row.provider_session_id || undefined,
    shippingAddress: row.shipping_address
      ? JSON.parse(row.shipping_address)
      : undefined,
    billingAddress: row.billing_address
      ? JSON.parse(row.billing_address)
      : undefined,
    fulfilledAt: row.fulfilled_at
      ? new Date(row.fulfilled_at * 1000)
      : undefined,
    shippedAt: row.shipped_at ? new Date(row.shipped_at * 1000) : undefined,
    trackingNumber: row.tracking_number || undefined,
    trackingUrl: row.tracking_url || undefined,
    notes: row.internal_notes || undefined,
    createdAt: new Date(row.created_at * 1000),
    updatedAt: new Date(row.updated_at * 1000),
  };
}

function mapLineItemRow(row: LineItemRow): LineItem {
  return {
    id: row.id,
    variantId: row.variant_id || "",
    productId: row.product_id || "",
    productName: row.product_name,
    variantName: row.variant_name,
    quantity: row.quantity,
    unitPrice: { amount: row.unit_price, currency: "usd" },
    totalPrice: { amount: row.total_price, currency: "usd" },
    taxAmount: row.tax_amount
      ? { amount: row.tax_amount, currency: "usd" }
      : undefined,
    metadata: JSON.parse(row.metadata || "{}"),
  };
}

function mapCustomerRow(row: CustomerRow): Customer {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    email: row.email,
    name: row.name || undefined,
    phone: row.phone || undefined,
    defaultShippingAddress: row.default_shipping_address
      ? JSON.parse(row.default_shipping_address)
      : undefined,
    defaultBillingAddress: row.default_billing_address
      ? JSON.parse(row.default_billing_address)
      : undefined,
    providerCustomerId: row.provider_customer_id || undefined,
    metadata: JSON.parse(row.metadata || "{}"),
    createdAt: new Date(row.created_at * 1000),
    updatedAt: new Date(row.updated_at * 1000),
  };
}
