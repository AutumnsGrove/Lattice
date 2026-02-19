-- Migration: Add Shop & Payment System to GroveEngine
-- Database: D1 (SQLite)
-- Run with: npx wrangler d1 execute grove-engine-db --file=migrations/007_shop_payments.sql --remote
--
-- This migration adds e-commerce capabilities including:
--   - Products & variants (physical, digital, subscription, service)
--   - Customers (for order tracking)
--   - Orders & line items
--   - Subscriptions (tenant products + platform billing)
--   - Stripe Connect accounts (marketplace)
--   - Platform billing (tenant subscriptions to GroveEngine)
--
-- All tables are tenant-scoped except platform_billing which is per-tenant.

-- =============================================================================
-- PRODUCTS TABLE
-- =============================================================================
-- Products are the main sellable items. Each product can have multiple variants.

CREATE TABLE IF NOT EXISTS products (
  -- Identity
  id TEXT PRIMARY KEY,                    -- UUID generated on creation
  tenant_id TEXT NOT NULL,                -- Foreign key to tenants table

  -- Basic info
  name TEXT NOT NULL,                     -- Product name
  slug TEXT NOT NULL,                     -- URL-safe identifier
  description TEXT,                       -- Full description (markdown)
  short_description TEXT,                 -- Brief excerpt for listings

  -- Classification
  type TEXT NOT NULL DEFAULT 'physical'   -- 'physical', 'digital', 'subscription', 'service'
    CHECK (type IN ('physical', 'digital', 'subscription', 'service')),
  status TEXT NOT NULL DEFAULT 'draft'    -- 'draft', 'active', 'archived'
    CHECK (status IN ('draft', 'active', 'archived')),

  -- Media
  images TEXT DEFAULT '[]',               -- JSON array of image URLs
  featured_image TEXT,                    -- Primary image URL

  -- SEO
  meta_title TEXT,
  meta_description TEXT,

  -- Organization
  category TEXT,                          -- Product category
  tags TEXT DEFAULT '[]',                 -- JSON array of tags

  -- Provider sync
  provider_product_id TEXT,               -- e.g., Stripe prod_xxx

  -- Metadata
  metadata TEXT DEFAULT '{}',             -- JSON object for custom data

  -- Timestamps
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),

  -- Constraints
  UNIQUE(tenant_id, slug),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Indexes for products
CREATE INDEX IF NOT EXISTS idx_products_tenant ON products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_products_type ON products(type);
CREATE INDEX IF NOT EXISTS idx_products_tenant_slug ON products(tenant_id, slug);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category) WHERE category IS NOT NULL;

-- =============================================================================
-- PRODUCT VARIANTS TABLE
-- =============================================================================
-- Variants represent purchasable options (size, color, plan tier, etc.)

CREATE TABLE IF NOT EXISTS product_variants (
  -- Identity
  id TEXT PRIMARY KEY,                    -- UUID
  product_id TEXT NOT NULL,               -- Foreign key to products
  tenant_id TEXT NOT NULL,                -- Denormalized for query efficiency

  -- Variant info
  name TEXT NOT NULL,                     -- e.g., "Small", "Monthly", "Blue"
  sku TEXT,                               -- Stock keeping unit

  -- Pricing (in cents, USD)
  price_amount INTEGER NOT NULL,          -- Price in cents
  price_currency TEXT NOT NULL DEFAULT 'usd',
  compare_at_price INTEGER,               -- Original price for sale display

  -- Pricing type
  pricing_type TEXT NOT NULL DEFAULT 'one_time'  -- 'one_time', 'recurring'
    CHECK (pricing_type IN ('one_time', 'recurring')),

  -- Recurring config (for subscriptions)
  billing_interval TEXT                   -- 'day', 'week', 'month', 'year'
    CHECK (billing_interval IS NULL OR billing_interval IN ('day', 'week', 'month', 'year')),
  billing_interval_count INTEGER DEFAULT 1,

  -- Inventory (physical products)
  inventory_quantity INTEGER,
  inventory_policy TEXT DEFAULT 'deny'    -- 'deny', 'continue'
    CHECK (inventory_policy IN ('deny', 'continue')),
  track_inventory INTEGER DEFAULT 0,      -- Boolean: 1 = track, 0 = don't track

  -- Digital products
  download_url TEXT,
  download_limit INTEGER,
  download_expiry_days INTEGER,

  -- Weight/shipping (physical products)
  weight_grams INTEGER,
  requires_shipping INTEGER DEFAULT 0,    -- Boolean

  -- Provider sync
  provider_price_id TEXT,                 -- e.g., Stripe price_xxx

  -- Display
  is_default INTEGER DEFAULT 0,           -- Boolean: default variant
  position INTEGER DEFAULT 0,             -- Sort order

  -- Metadata
  metadata TEXT DEFAULT '{}',             -- JSON object

  -- Timestamps
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),

  -- Constraints
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Indexes for variants
CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_variants_tenant ON product_variants(tenant_id);
CREATE INDEX IF NOT EXISTS idx_variants_sku ON product_variants(sku) WHERE sku IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_variants_default ON product_variants(product_id, is_default) WHERE is_default = 1;

-- =============================================================================
-- CUSTOMERS TABLE
-- =============================================================================
-- Customers who have purchased from a tenant's shop

CREATE TABLE IF NOT EXISTS customers (
  -- Identity
  id TEXT PRIMARY KEY,                    -- UUID
  tenant_id TEXT NOT NULL,                -- Foreign key to tenants

  -- Contact info
  email TEXT NOT NULL,
  name TEXT,
  phone TEXT,

  -- Default addresses (JSON objects)
  default_shipping_address TEXT,          -- JSON: {line1, line2, city, state, postalCode, country}
  default_billing_address TEXT,           -- JSON

  -- Provider sync
  provider_customer_id TEXT,              -- e.g., Stripe cus_xxx

  -- Stats
  total_orders INTEGER DEFAULT 0,
  total_spent INTEGER DEFAULT 0,          -- In cents

  -- Metadata
  metadata TEXT DEFAULT '{}',             -- JSON
  notes TEXT,                             -- Internal notes

  -- Marketing
  accepts_marketing INTEGER DEFAULT 0,    -- Boolean
  marketing_consent_at INTEGER,           -- Unix timestamp

  -- Timestamps
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),

  -- Constraints
  UNIQUE(tenant_id, email),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Indexes for customers
CREATE INDEX IF NOT EXISTS idx_customers_tenant ON customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(tenant_id, email);
CREATE INDEX IF NOT EXISTS idx_customers_provider ON customers(provider_customer_id) WHERE provider_customer_id IS NOT NULL;

-- =============================================================================
-- ORDERS TABLE
-- =============================================================================
-- Orders represent completed or in-progress purchases

CREATE TABLE IF NOT EXISTS orders (
  -- Identity
  id TEXT PRIMARY KEY,                    -- UUID
  tenant_id TEXT NOT NULL,                -- Foreign key to tenants
  order_number TEXT NOT NULL,             -- Human-readable order number

  -- Customer
  customer_id TEXT,                       -- Foreign key to customers (optional for guest checkout)
  customer_email TEXT NOT NULL,
  customer_name TEXT,

  -- Pricing (all in cents)
  subtotal INTEGER NOT NULL DEFAULT 0,
  tax_total INTEGER NOT NULL DEFAULT 0,
  shipping_total INTEGER NOT NULL DEFAULT 0,
  discount_total INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'usd',

  -- Status
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'processing', 'shipped', 'completed', 'canceled', 'refunded')),
  payment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'processing', 'succeeded', 'failed', 'canceled', 'refunded', 'partially_refunded')),

  -- Addresses (JSON objects)
  shipping_address TEXT,                  -- JSON
  billing_address TEXT,                   -- JSON

  -- Shipping/Fulfillment
  requires_shipping INTEGER DEFAULT 0,    -- Boolean
  fulfilled_at INTEGER,                   -- Unix timestamp
  shipped_at INTEGER,
  tracking_number TEXT,
  tracking_url TEXT,
  shipping_carrier TEXT,

  -- Provider references
  provider_session_id TEXT,               -- Stripe checkout session cs_xxx
  provider_payment_id TEXT,               -- Stripe payment intent pi_xxx
  provider_invoice_id TEXT,               -- Stripe invoice in_xxx

  -- Discounts
  discount_codes TEXT DEFAULT '[]',       -- JSON array of applied discount codes

  -- Notes
  customer_notes TEXT,                    -- Notes from customer at checkout
  internal_notes TEXT,                    -- Internal/admin notes

  -- Metadata
  metadata TEXT DEFAULT '{}',             -- JSON

  -- Timestamps
  paid_at INTEGER,                        -- When payment succeeded
  canceled_at INTEGER,
  refunded_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),

  -- Constraints
  UNIQUE(tenant_id, order_number),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
);

-- Indexes for orders
CREATE INDEX IF NOT EXISTS idx_orders_tenant ON orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_tenant_number ON orders(tenant_id, order_number);
CREATE INDEX IF NOT EXISTS idx_orders_provider_session ON orders(provider_session_id) WHERE provider_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_provider_payment ON orders(provider_payment_id) WHERE provider_payment_id IS NOT NULL;

-- =============================================================================
-- ORDER LINE ITEMS TABLE
-- =============================================================================
-- Individual items within an order

CREATE TABLE IF NOT EXISTS order_line_items (
  -- Identity
  id TEXT PRIMARY KEY,                    -- UUID
  order_id TEXT NOT NULL,                 -- Foreign key to orders
  tenant_id TEXT NOT NULL,                -- Denormalized for queries

  -- Product reference (snapshot at time of order)
  product_id TEXT,                        -- May be null if product deleted
  variant_id TEXT,                        -- May be null if variant deleted
  product_name TEXT NOT NULL,             -- Snapshot
  variant_name TEXT NOT NULL,             -- Snapshot
  sku TEXT,                               -- Snapshot

  -- Quantity & pricing (in cents)
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price INTEGER NOT NULL,            -- Price per unit
  total_price INTEGER NOT NULL,           -- unit_price * quantity
  tax_amount INTEGER DEFAULT 0,

  -- Type
  type TEXT NOT NULL DEFAULT 'product'    -- 'product', 'shipping', 'discount', 'tax'
    CHECK (type IN ('product', 'shipping', 'discount', 'tax')),

  -- Fulfillment (for physical products)
  fulfilled_quantity INTEGER DEFAULT 0,
  requires_shipping INTEGER DEFAULT 0,    -- Boolean

  -- Digital products
  download_url TEXT,
  download_count INTEGER DEFAULT 0,
  download_limit INTEGER,
  download_expiry INTEGER,                -- Unix timestamp

  -- Metadata
  metadata TEXT DEFAULT '{}',             -- JSON

  -- Timestamps
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),

  -- Constraints
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Indexes for line items
CREATE INDEX IF NOT EXISTS idx_line_items_order ON order_line_items(order_id);
CREATE INDEX IF NOT EXISTS idx_line_items_tenant ON order_line_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_line_items_product ON order_line_items(product_id) WHERE product_id IS NOT NULL;

-- =============================================================================
-- SUBSCRIPTIONS TABLE (TENANT PRODUCTS)
-- =============================================================================
-- Subscriptions to tenant products (not platform billing)

CREATE TABLE IF NOT EXISTS subscriptions (
  -- Identity
  id TEXT PRIMARY KEY,                    -- UUID
  tenant_id TEXT NOT NULL,                -- Foreign key to tenants
  customer_id TEXT NOT NULL,              -- Foreign key to customers

  -- Product/Plan
  product_id TEXT NOT NULL,               -- Foreign key to products
  variant_id TEXT NOT NULL,               -- Foreign key to variants
  quantity INTEGER NOT NULL DEFAULT 1,

  -- Status
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('trialing', 'active', 'past_due', 'paused', 'canceled', 'unpaid')),

  -- Billing periods (Unix timestamps)
  current_period_start INTEGER NOT NULL,
  current_period_end INTEGER NOT NULL,
  cancel_at_period_end INTEGER DEFAULT 0, -- Boolean
  canceled_at INTEGER,

  -- Trial
  trial_start INTEGER,
  trial_end INTEGER,

  -- Provider reference
  provider_subscription_id TEXT,          -- e.g., Stripe sub_xxx

  -- Metadata
  metadata TEXT DEFAULT '{}',             -- JSON

  -- Timestamps
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),

  -- Constraints
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE RESTRICT
);

-- Indexes for subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant ON subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_customer ON subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_provider ON subscriptions(provider_subscription_id) WHERE provider_subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subscriptions_period_end ON subscriptions(current_period_end);

-- =============================================================================
-- CONNECT ACCOUNTS TABLE (STRIPE CONNECT)
-- =============================================================================
-- Stripe Connect accounts for tenants to receive payments

CREATE TABLE IF NOT EXISTS connect_accounts (
  -- Identity
  id TEXT PRIMARY KEY,                    -- UUID
  tenant_id TEXT NOT NULL UNIQUE,         -- One Connect account per tenant

  -- Stripe Connect
  provider_account_id TEXT NOT NULL,      -- Stripe acct_xxx
  account_type TEXT DEFAULT 'express'     -- 'standard', 'express', 'custom'
    CHECK (account_type IN ('standard', 'express', 'custom')),

  -- Status
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'enabled', 'restricted', 'disabled')),
  charges_enabled INTEGER DEFAULT 0,      -- Boolean
  payouts_enabled INTEGER DEFAULT 0,      -- Boolean
  details_submitted INTEGER DEFAULT 0,    -- Boolean

  -- Account info
  email TEXT,
  country TEXT,                           -- ISO 3166-1 alpha-2
  default_currency TEXT,

  -- Capabilities
  capabilities TEXT DEFAULT '{}',         -- JSON object of capability statuses

  -- Onboarding
  onboarding_complete INTEGER DEFAULT 0,  -- Boolean
  requirements TEXT DEFAULT '{}',         -- JSON object of pending requirements

  -- Metadata
  metadata TEXT DEFAULT '{}',             -- JSON

  -- Timestamps
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),

  -- Constraints
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Indexes for Connect accounts
CREATE INDEX IF NOT EXISTS idx_connect_tenant ON connect_accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_connect_provider ON connect_accounts(provider_account_id);
CREATE INDEX IF NOT EXISTS idx_connect_status ON connect_accounts(status);

-- =============================================================================
-- PLATFORM BILLING TABLE
-- =============================================================================
-- GroveEngine subscriptions (tenants paying for the platform)

CREATE TABLE IF NOT EXISTS platform_billing (
  -- Identity
  id TEXT PRIMARY KEY,                    -- UUID
  tenant_id TEXT NOT NULL UNIQUE,         -- One billing record per tenant

  -- Plan
  plan TEXT NOT NULL DEFAULT 'starter'
    CHECK (plan IN ('starter', 'professional', 'business')),

  -- Status
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('trialing', 'active', 'past_due', 'paused', 'canceled', 'unpaid')),

  -- Provider references
  provider_customer_id TEXT,              -- Stripe cus_xxx (platform account)
  provider_subscription_id TEXT,          -- Stripe sub_xxx (platform account)

  -- Billing period (Unix timestamps)
  current_period_start INTEGER,
  current_period_end INTEGER,
  cancel_at_period_end INTEGER DEFAULT 0, -- Boolean

  -- Trial
  trial_end INTEGER,

  -- Payment method
  payment_method_last4 TEXT,              -- Last 4 digits of card
  payment_method_brand TEXT,              -- visa, mastercard, etc.

  -- Timestamps
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),

  -- Constraints
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Indexes for platform billing
CREATE INDEX IF NOT EXISTS idx_platform_billing_tenant ON platform_billing(tenant_id);
CREATE INDEX IF NOT EXISTS idx_platform_billing_status ON platform_billing(status);
CREATE INDEX IF NOT EXISTS idx_platform_billing_plan ON platform_billing(plan);

-- =============================================================================
-- REFUNDS TABLE
-- =============================================================================
-- Track refunds for orders

CREATE TABLE IF NOT EXISTS refunds (
  -- Identity
  id TEXT PRIMARY KEY,                    -- UUID
  order_id TEXT NOT NULL,                 -- Foreign key to orders
  tenant_id TEXT NOT NULL,                -- Denormalized

  -- Amount (in cents)
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',

  -- Status
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'succeeded', 'failed', 'canceled')),

  -- Reason
  reason TEXT
    CHECK (reason IS NULL OR reason IN ('duplicate', 'fraudulent', 'requested_by_customer', 'other')),
  notes TEXT,

  -- Provider reference
  provider_refund_id TEXT,                -- Stripe re_xxx

  -- Timestamps
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),

  -- Constraints
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Indexes for refunds
CREATE INDEX IF NOT EXISTS idx_refunds_order ON refunds(order_id);
CREATE INDEX IF NOT EXISTS idx_refunds_tenant ON refunds(tenant_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON refunds(status);

-- =============================================================================
-- DISCOUNT CODES TABLE
-- =============================================================================
-- Discount/promo codes for shops

CREATE TABLE IF NOT EXISTS discount_codes (
  -- Identity
  id TEXT PRIMARY KEY,                    -- UUID
  tenant_id TEXT NOT NULL,                -- Foreign key to tenants

  -- Code
  code TEXT NOT NULL,                     -- The actual code (case-insensitive)
  description TEXT,                       -- Internal description

  -- Type
  type TEXT NOT NULL DEFAULT 'percentage' -- 'percentage', 'fixed_amount', 'free_shipping'
    CHECK (type IN ('percentage', 'fixed_amount', 'free_shipping')),

  -- Value
  value INTEGER NOT NULL,                 -- Percentage (0-100) or amount in cents

  -- Limits
  minimum_amount INTEGER,                 -- Minimum order amount in cents
  maximum_uses INTEGER,                   -- Max total uses (null = unlimited)
  uses_per_customer INTEGER,              -- Max uses per customer (null = unlimited)
  current_uses INTEGER DEFAULT 0,         -- Current use count

  -- Validity
  starts_at INTEGER,                      -- Unix timestamp
  ends_at INTEGER,                        -- Unix timestamp
  is_active INTEGER DEFAULT 1,            -- Boolean

  -- Restrictions
  applies_to_products TEXT,               -- JSON array of product IDs (null = all)
  applies_to_variants TEXT,               -- JSON array of variant IDs (null = all)

  -- Provider reference
  provider_coupon_id TEXT,                -- Stripe coupon ID

  -- Timestamps
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),

  -- Constraints
  UNIQUE(tenant_id, code),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Indexes for discount codes
CREATE INDEX IF NOT EXISTS idx_discounts_tenant ON discount_codes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_discounts_code ON discount_codes(tenant_id, code);
CREATE INDEX IF NOT EXISTS idx_discounts_active ON discount_codes(is_active) WHERE is_active = 1;

-- =============================================================================
-- WEBHOOK EVENTS TABLE
-- =============================================================================
-- Store webhook events for debugging and idempotency

CREATE TABLE IF NOT EXISTS webhook_events (
  -- Identity
  id TEXT PRIMARY KEY,                    -- UUID
  tenant_id TEXT,                         -- May be null for platform webhooks

  -- Event
  provider TEXT NOT NULL DEFAULT 'stripe',
  provider_event_id TEXT NOT NULL,        -- e.g., evt_xxx
  event_type TEXT NOT NULL,               -- e.g., 'checkout.session.completed'

  -- Payload
  payload TEXT NOT NULL,                  -- JSON

  -- Processing
  processed INTEGER DEFAULT 0,            -- Boolean
  processed_at INTEGER,                   -- Unix timestamp
  error TEXT,                             -- Error message if processing failed
  retry_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),

  -- Constraints (idempotency)
  UNIQUE(provider, provider_event_id)
);

-- Indexes for webhook events
CREATE INDEX IF NOT EXISTS idx_webhooks_tenant ON webhook_events(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_webhooks_type ON webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_webhooks_processed ON webhook_events(processed) WHERE processed = 0;
CREATE INDEX IF NOT EXISTS idx_webhooks_created ON webhook_events(created_at DESC);

-- =============================================================================
-- MIGRATION NOTES
-- =============================================================================
--
-- 1. STRIPE SETUP:
--    - Platform account: Main GroveEngine Stripe account for tenant billing
--    - Connect accounts: Each tenant gets their own Connect account for their shop
--    - Webhooks: Set up endpoints for both platform and Connect events
--
-- 2. SECRETS REQUIRED (add to wrangler.toml):
--    - STRIPE_SECRET_KEY: Platform Stripe secret key
--    - STRIPE_PUBLISHABLE_KEY: Platform publishable key
--    - STRIPE_WEBHOOK_SECRET: Webhook signing secret
--    - STRIPE_CONNECT_WEBHOOK_SECRET: Connect webhook signing secret
--
-- 3. TAX HANDLING:
--    - Using Stripe Tax for automatic tax calculation
--    - Tax is calculated during checkout, stored in order
--    - Enable Stripe Tax in Dashboard before going live
--
-- 4. ORDER NUMBERS:
--    - Generate human-readable order numbers like "GRV-1001"
--    - Each tenant gets their own sequence
--
-- 5. INVENTORY:
--    - track_inventory = 1: Check stock before purchase
--    - inventory_policy = 'deny': Prevent overselling
--    - inventory_policy = 'continue': Allow overselling
--
-- =============================================================================
