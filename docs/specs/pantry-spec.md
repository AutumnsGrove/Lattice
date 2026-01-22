---
title: Pantry — Shop & Provisioning
description: 'Grove''s shop for subscriptions, merchandise, gift cards, and credits'
category: specs
specCategory: platform-services
icon: store
lastUpdated: '2026-01-06'
aliases: []
tags:
  - shop
  - e-commerce
  - merchandise
  - provisioning
---

# Pantry: Grove Shop & Provisioning Specification

```
                    ┌─────────────────────┐
                    │  ░░░░░░░░░░░░░░░░░  │
                    │  ┌───┐ ┌───┐ ┌───┐  │
                    │  │🍯 │ │ 🫖 │ │🌿 │  │
                    │  └───┘ └───┘ └───┘  │
                    │  ┌───┐ ┌───┐ ┌───┐  │
                    │  │📦 │ │ 🎁 │ │ ✨│  │
                    │  └───┘ └───┘ └───┘  │
                    │  ┌───┐ ┌───┐ ┌───┐  │
                    │  │🏷️ │ │ 💳 │ │ 🌱│  │
                    │  └───┘ └───┘ └───┘  │
                    └─────────────────────┘

           The cupboard is always stocked.
```

Grove's shop for subscriptions, merchandise, gift cards, and credits. A warm cupboard in a cozy kitchen—you come when you need something, find what you're looking for, and take it home.

---

## Overview

**Pantry** is Grove's unified shop and provisioning system. Everything you can purchase in Grove lives here: subscriptions, storage add-ons, merchandise, gift cards, and credits.

### Why "Pantry"?

A pantry is where you keep what sustains you. Flour, honey, preserves—the things you reach for when you need them. It's not a storefront with bright lights and sales pressure. It's a cupboard in a warm kitchen, stocked and waiting.

| | |
|---|---|
| **Public name** | Pantry |
| **Internal codename** | GroveShop |
| **Domain** | pantry.grove.place |

### Philosophy

Pantry isn't trying to be Amazon or Shopify. It's a simple, warm place to support Grove and get Grove things. No upselling, no dark patterns, no "you might also like." Just what you came for.

- Browse what's available
- Add to cart
- Check out
- Done

---

## What Pantry Sells

### Digital Products

| Product | Description | Fulfillment |
|---------|-------------|-------------|
| **Subscriptions** | Seedling, Sapling, Oak, Evergreen plans | Instant activation via Plant |
| **Storage Add-ons** | +10GB, +50GB, +100GB | Instant activation via Amber |
| **Gift Cards** | Grove credit in fixed amounts | Code delivered via email |
| **Credits** | Account balance top-ups | Instant addition to balance |
| **Custom Domains** | Oak+ domain setup assistance | Manual provisioning |

### Physical Merchandise

| Product | Description | Fulfillment |
|---------|-------------|-------------|
| **Stickers** | Grove logo stickers, seasonal sets | Shipped via partner |
| **Pins** | Enamel pins (tree logo, seasonal) | Shipped via partner |
| **Patches** | Embroidered Grove patches | Shipped via partner |
| **Prints** | Art prints of Grove scenes | Shipped via partner |
| **Apparel** | T-shirts, hoodies (future) | Print-on-demand |

### Future Products

- **Commissioned Themes** — Custom Foliage theme design
- **Priority Support Packs** — Dedicated support hours
- **Grove Zines** — Printed collections of Grove blog posts

---

## Tier Access

Pantry is accessible to everyone, but some products are tier-restricted:

| Product | Free | Seedling | Sapling | Oak | Evergreen |
|---------|:----:|:--------:|:-------:|:---:|:---------:|
| Gift Cards | ✓ | ✓ | ✓ | ✓ | ✓ |
| Merchandise | ✓ | ✓ | ✓ | ✓ | ✓ |
| Subscriptions | ✓ | ✓ | ✓ | ✓ | ✓ |
| Storage Add-ons | — | ✓ | ✓ | ✓ | ✓ |
| Custom Domains | — | — | — | ✓ | ✓ |
| Credits | — | ✓ | ✓ | ✓ | ✓ |

---

## Features

### Day One (MVP)

#### Product Catalog
- **Browse products:** Grid layout with images and prices
- **Product pages:** Description, images, variants (size/color)
- **Categories:** Digital, Merchandise, Subscriptions
- **Search:** Find products by name

#### Shopping Cart
- **Add to cart:** Products with quantity
- **Cart persistence:** Survives page refresh (localStorage + DB sync)
- **Cart preview:** Dropdown showing items
- **Edit cart:** Change quantities, remove items

#### Checkout
- **Guest checkout:** For merchandise (no account required)
- **Authenticated checkout:** For digital products (account required)
- **Stripe integration:** Secure payment processing
- **Address collection:** For physical goods
- **Order confirmation:** Email with receipt and tracking

#### Order Management
- **Order history:** View past orders
- **Order status:** Processing, Shipped, Delivered
- **Digital delivery:** Instant access post-purchase
- **Tracking:** Shipping tracking for physical goods

### Later Features

#### Gifting (Phase 2)
- **Gift purchases:** Buy for someone else
- **Gift wrapping:** Optional for merchandise
- **Gift messages:** Personal notes with orders
- **Subscription gifts:** Gift a Grove subscription

#### Loyalty & Credits (Phase 2)
- **Grove Credits:** Account balance for purchases
- **Referral credits:** Earn credits for referrals
- **Loyalty rewards:** Discounts for long-term subscribers

#### Merchandise Expansion (Phase 3)
- **Limited editions:** Seasonal or event merchandise
- **Pre-orders:** Reserve upcoming products
- **Bundles:** Discounted product combinations
- **Print-on-demand:** Expanded apparel options

---

## Technical Architecture

### Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Frontend | SvelteKit | UI, matches Grove stack |
| Backend | Cloudflare Workers | API endpoints |
| Database | Cloudflare D1 | Products, orders, carts |
| Payments | Stripe | Checkout, subscriptions |
| Fulfillment | Printful/Shipstation | Physical goods |
| Auth | Heartwood | SSO with Grove account |
| Email | Resend | Order confirmations |

### Integration Points

```
┌─────────────────────────────────────────────────────────────────┐
│                         pantry.grove.place                      │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │  Catalog │  │   Cart   │  │ Checkout │  │  Orders  │         │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘         │
│       │             │             │             │               │
└───────┼─────────────┼─────────────┼─────────────┼───────────────┘
        │             │             │             │
        ▼             ▼             ▼             ▼
┌───────────────────────────────────────────────────────────────┐
│                        Cloudflare D1                          │
│  products │ variants │ carts │ orders │ order_items │ credits │
└───────────────────────────────────────────────────────────────┘
        │                       │                   │
        │                       ▼                   │
        │            ┌─────────────────┐            │
        │            │     Stripe      │            │
        │            │  (Payments)     │            │
        │            └────────┬────────┘            │
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│    Plant     │    │   Printful   │    │    Amber     │
│ (Subscriptions)│  │ (Fulfillment)│    │  (Storage)   │
└──────────────┘    └──────────────┘    └──────────────┘
```

---

## Database Schema (D1)

### Products & Variants

```sql
-- Product catalog
CREATE TABLE pantry_products (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,              -- URL-friendly identifier
  name TEXT NOT NULL,
  description TEXT,
  description_html TEXT,                  -- Rendered markdown
  category TEXT NOT NULL,                 -- digital, merchandise, subscription
  type TEXT NOT NULL,                     -- gift_card, storage, sticker, pin, etc.

  -- Pricing
  price_cents INTEGER NOT NULL,           -- Base price in cents
  compare_at_cents INTEGER,               -- Original price for sales

  -- Inventory
  track_inventory BOOLEAN DEFAULT FALSE,
  inventory_count INTEGER DEFAULT 0,

  -- Display
  featured BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,

  -- Images (JSON array of R2 keys)
  images TEXT,

  -- Metadata
  metadata TEXT,                          -- JSON: fulfillment details, etc.

  -- Status
  status TEXT DEFAULT 'draft',            -- draft, active, archived
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- Product variants (size, color, etc.)
CREATE TABLE pantry_variants (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  name TEXT NOT NULL,                     -- "Small", "Blue", etc.
  sku TEXT UNIQUE,                        -- For fulfillment

  -- Pricing override
  price_cents INTEGER,                    -- NULL = use product price

  -- Inventory
  inventory_count INTEGER DEFAULT 0,

  -- Attributes (JSON: { "size": "S", "color": "Blue" })
  attributes TEXT,

  -- External IDs
  stripe_price_id TEXT,
  printful_variant_id TEXT,

  sort_order INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch()),

  FOREIGN KEY (product_id) REFERENCES pantry_products(id)
);

-- Product images
CREATE TABLE pantry_product_images (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  alt_text TEXT,
  sort_order INTEGER DEFAULT 0,

  FOREIGN KEY (product_id) REFERENCES pantry_products(id)
);
```

### Shopping Cart

```sql
-- Shopping carts
CREATE TABLE pantry_carts (
  id TEXT PRIMARY KEY,
  user_id TEXT,                           -- NULL for guest carts
  session_id TEXT,                        -- For guest cart tracking

  -- Totals (calculated, cached)
  subtotal_cents INTEGER DEFAULT 0,
  tax_cents INTEGER DEFAULT 0,
  shipping_cents INTEGER DEFAULT 0,
  total_cents INTEGER DEFAULT 0,

  -- Shipping address (for estimation)
  shipping_country TEXT,
  shipping_postal TEXT,

  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  expires_at INTEGER,                     -- Guest carts expire after 7 days

  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Cart items
CREATE TABLE pantry_cart_items (
  id TEXT PRIMARY KEY,
  cart_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  variant_id TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,

  -- Price at time of adding (for price change handling)
  unit_price_cents INTEGER NOT NULL,

  created_at INTEGER DEFAULT (unixepoch()),

  FOREIGN KEY (cart_id) REFERENCES pantry_carts(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES pantry_products(id),
  FOREIGN KEY (variant_id) REFERENCES pantry_variants(id)
);
```

### Orders

```sql
-- Orders
CREATE TABLE pantry_orders (
  id TEXT PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL,      -- Human-readable: GRV-2026-00001
  user_id TEXT,                           -- NULL for guest orders

  -- Contact
  email TEXT NOT NULL,

  -- Status
  status TEXT DEFAULT 'pending',          -- pending, paid, processing, shipped, delivered, cancelled, refunded
  fulfillment_status TEXT,                -- unfulfilled, partial, fulfilled

  -- Totals
  subtotal_cents INTEGER NOT NULL,
  tax_cents INTEGER DEFAULT 0,
  shipping_cents INTEGER DEFAULT 0,
  discount_cents INTEGER DEFAULT 0,
  total_cents INTEGER NOT NULL,

  -- Currency
  currency TEXT DEFAULT 'usd',

  -- Shipping address
  shipping_name TEXT,
  shipping_address1 TEXT,
  shipping_address2 TEXT,
  shipping_city TEXT,
  shipping_state TEXT,
  shipping_postal TEXT,
  shipping_country TEXT,

  -- Billing address
  billing_same_as_shipping BOOLEAN DEFAULT TRUE,
  billing_name TEXT,
  billing_address1 TEXT,
  billing_address2 TEXT,
  billing_city TEXT,
  billing_state TEXT,
  billing_postal TEXT,
  billing_country TEXT,

  -- Payment
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  paid_at INTEGER,

  -- Fulfillment
  printful_order_id TEXT,
  tracking_number TEXT,
  tracking_url TEXT,
  shipped_at INTEGER,
  delivered_at INTEGER,

  -- Metadata
  notes TEXT,                             -- Internal notes
  customer_notes TEXT,                    -- Customer-provided notes
  metadata TEXT,                          -- JSON

  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),

  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Order line items
CREATE TABLE pantry_order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  variant_id TEXT,

  -- Product snapshot (in case product changes)
  product_name TEXT NOT NULL,
  variant_name TEXT,
  sku TEXT,

  quantity INTEGER NOT NULL,
  unit_price_cents INTEGER NOT NULL,
  total_cents INTEGER NOT NULL,

  -- Fulfillment
  fulfillment_status TEXT DEFAULT 'unfulfilled',
  fulfilled_quantity INTEGER DEFAULT 0,

  -- Digital delivery
  digital_delivered BOOLEAN DEFAULT FALSE,
  digital_delivery_data TEXT,            -- JSON: gift code, activation details

  FOREIGN KEY (order_id) REFERENCES pantry_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES pantry_products(id),
  FOREIGN KEY (variant_id) REFERENCES pantry_variants(id)
);

-- Order status history
CREATE TABLE pantry_order_events (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  event_type TEXT NOT NULL,               -- created, paid, shipped, delivered, etc.
  description TEXT,
  metadata TEXT,                          -- JSON: tracking info, etc.
  created_at INTEGER DEFAULT (unixepoch()),

  FOREIGN KEY (order_id) REFERENCES pantry_orders(id) ON DELETE CASCADE
);
```

### Gift Cards & Credits

```sql
-- Gift cards
CREATE TABLE pantry_gift_cards (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,              -- Redemption code

  -- Value
  initial_value_cents INTEGER NOT NULL,
  balance_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'usd',

  -- Source
  order_id TEXT,                          -- Order that created this gift card
  order_item_id TEXT,

  -- Recipient
  recipient_email TEXT,
  recipient_name TEXT,
  sender_name TEXT,
  message TEXT,

  -- Status
  status TEXT DEFAULT 'active',           -- active, redeemed, expired, disabled

  -- Usage
  redeemed_by_user_id TEXT,
  redeemed_at INTEGER,

  -- Expiry
  expires_at INTEGER,

  created_at INTEGER DEFAULT (unixepoch()),

  FOREIGN KEY (order_id) REFERENCES pantry_orders(id),
  FOREIGN KEY (redeemed_by_user_id) REFERENCES users(id)
);

-- User credits/balance
CREATE TABLE pantry_credits (
  user_id TEXT PRIMARY KEY,
  balance_cents INTEGER DEFAULT 0,
  lifetime_earned_cents INTEGER DEFAULT 0,
  lifetime_spent_cents INTEGER DEFAULT 0,
  updated_at INTEGER DEFAULT (unixepoch()),

  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Credit transactions
CREATE TABLE pantry_credit_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,

  -- Transaction
  amount_cents INTEGER NOT NULL,          -- Positive = credit, negative = debit
  balance_after_cents INTEGER NOT NULL,

  -- Type
  type TEXT NOT NULL,                     -- gift_card_redemption, purchase, refund, referral, manual

  -- Reference
  reference_type TEXT,                    -- order, gift_card, referral
  reference_id TEXT,

  description TEXT,
  created_at INTEGER DEFAULT (unixepoch()),

  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### Indexes

```sql
-- Products
CREATE INDEX idx_products_category ON pantry_products(category, status);
CREATE INDEX idx_products_slug ON pantry_products(slug);
CREATE INDEX idx_products_featured ON pantry_products(featured, status);
CREATE INDEX idx_variants_product ON pantry_variants(product_id);

-- Carts
CREATE INDEX idx_carts_user ON pantry_carts(user_id);
CREATE INDEX idx_carts_session ON pantry_carts(session_id);
CREATE INDEX idx_carts_expires ON pantry_carts(expires_at);
CREATE INDEX idx_cart_items_cart ON pantry_cart_items(cart_id);

-- Orders
CREATE INDEX idx_orders_user ON pantry_orders(user_id);
CREATE INDEX idx_orders_number ON pantry_orders(order_number);
CREATE INDEX idx_orders_status ON pantry_orders(status);
CREATE INDEX idx_orders_email ON pantry_orders(email);
CREATE INDEX idx_order_items_order ON pantry_order_items(order_id);
CREATE INDEX idx_order_events_order ON pantry_order_events(order_id);

-- Gift cards & credits
CREATE INDEX idx_gift_cards_code ON pantry_gift_cards(code);
CREATE INDEX idx_gift_cards_status ON pantry_gift_cards(status);
CREATE INDEX idx_credit_transactions_user ON pantry_credit_transactions(user_id, created_at DESC);
```

---

## API Endpoints

### Products (Public)

```
GET /api/products
→ Query: category, featured, limit, offset
→ Returns: paginated product list

GET /api/products/:slug
→ Returns: product with variants and images

GET /api/categories
→ Returns: list of categories with counts
```

### Cart

```
GET /api/cart
→ Returns: current cart with items

POST /api/cart/items
→ Body: { product_id, variant_id?, quantity }
→ Returns: updated cart

PATCH /api/cart/items/:id
→ Body: { quantity }
→ Returns: updated cart

DELETE /api/cart/items/:id
→ Returns: updated cart

DELETE /api/cart
→ Clears cart
```

### Checkout

```
POST /api/checkout/session
→ Body: { email, shipping_address?, use_credits? }
→ Returns: { checkout_session_id, stripe_client_secret }

POST /api/checkout/complete
→ Body: { checkout_session_id, payment_intent_id }
→ Returns: { order_id, order_number }

GET /api/checkout/shipping-rates
→ Query: country, postal
→ Returns: available shipping options with prices
```

### Orders (Authenticated)

```
GET /api/orders
→ Returns: user's order history

GET /api/orders/:id
→ Returns: order details with items and events

GET /api/orders/:id/tracking
→ Returns: shipping tracking information
```

### Gift Cards & Credits

```
POST /api/gift-cards/redeem
→ Body: { code }
→ Returns: { amount_cents, new_balance_cents }

GET /api/credits
→ Returns: current balance and transaction history

GET /api/credits/transactions
→ Query: limit, offset
→ Returns: paginated credit transactions
```

### Admin (Authenticated, Admin Only)

```
POST /api/admin/products
PATCH /api/admin/products/:id
DELETE /api/admin/products/:id

GET /api/admin/orders
PATCH /api/admin/orders/:id
POST /api/admin/orders/:id/fulfill
POST /api/admin/orders/:id/refund

POST /api/admin/gift-cards
GET /api/admin/gift-cards
PATCH /api/admin/gift-cards/:id

POST /api/admin/credits/:user_id/adjust
```

---

## Checkout Flow

### Standard Checkout

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    Cart      │────▶│   Checkout   │────▶│ Confirmation │
│              │     │              │     │              │
│ - Items      │     │ - Email      │     │ - Order #    │
│ - Quantities │     │ - Shipping   │     │ - Receipt    │
│ - Subtotal   │     │ - Payment    │     │ - Tracking   │
└──────────────┘     └──────────────┘     └──────────────┘
```

### Digital-Only Checkout

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    Cart      │────▶│   Checkout   │────▶│   Instant    │
│              │     │              │     │   Delivery   │
│ - Gift card  │     │ - Email      │     │              │
│ - Credits    │     │ - Payment    │     │ - Code sent  │
│              │     │ (no shipping)│     │ - Activated  │
└──────────────┘     └──────────────┘     └──────────────┘
```

### Stripe Integration

```typescript
// Create checkout session
async function createCheckoutSession(cart: Cart, email: string, shippingAddress?: Address) {
  const lineItems = cart.items.map(item => ({
    price_data: {
      currency: 'usd',
      product_data: {
        name: item.product.name,
        description: item.variant?.name,
        images: item.product.images,
      },
      unit_amount: item.unit_price_cents,
    },
    quantity: item.quantity,
  }));

  // Add shipping if physical goods
  if (cart.hasPhysicalGoods && shippingAddress) {
    lineItems.push({
      price_data: {
        currency: 'usd',
        product_data: { name: 'Shipping' },
        unit_amount: cart.shipping_cents,
      },
      quantity: 1,
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: email,
    line_items: lineItems,
    success_url: `${PANTRY_URL}/orders/{CHECKOUT_SESSION_ID}/success`,
    cancel_url: `${PANTRY_URL}/cart`,
    metadata: {
      cart_id: cart.id,
      user_id: cart.user_id,
    },
  });

  return session;
}
```

---

## Fulfillment

### Digital Products

Digital products are fulfilled immediately after payment:

| Product Type | Fulfillment Action |
|--------------|-------------------|
| Gift Card | Generate code, send email |
| Credits | Add to user balance |
| Storage Add-on | Update user quota, activate in Stripe |
| Subscription | Create/upgrade via Plant |
| Custom Domain | Queue for manual setup |

```typescript
async function fulfillDigitalItem(order: Order, item: OrderItem) {
  switch (item.product.type) {
    case 'gift_card':
      const code = generateGiftCardCode();
      await createGiftCard({
        code,
        value_cents: item.unit_price_cents,
        order_id: order.id,
        recipient_email: order.email,
      });
      await sendGiftCardEmail(order.email, code, item.unit_price_cents);
      break;

    case 'credits':
      await addUserCredits(order.user_id, item.unit_price_cents);
      break;

    case 'storage':
      await activateStorageAddon(order.user_id, item.variant.sku);
      break;

    case 'subscription':
      await upgradeSubscription(order.user_id, item.product.metadata.plan);
      break;
  }

  await markItemFulfilled(item.id);
}
```

### Physical Products (Printful)

Physical merchandise is fulfilled via Printful:

```typescript
async function createPrintfulOrder(order: Order) {
  const physicalItems = order.items.filter(i => i.product.category === 'merchandise');

  if (physicalItems.length === 0) return;

  const printfulOrder = await printful.orders.create({
    external_id: order.id,
    recipient: {
      name: order.shipping_name,
      address1: order.shipping_address1,
      address2: order.shipping_address2,
      city: order.shipping_city,
      state_code: order.shipping_state,
      zip: order.shipping_postal,
      country_code: order.shipping_country,
      email: order.email,
    },
    items: physicalItems.map(item => ({
      sync_variant_id: item.variant.printful_variant_id,
      quantity: item.quantity,
    })),
  });

  await db.run(`
    UPDATE pantry_orders
    SET printful_order_id = ?
    WHERE id = ?
  `, [printfulOrder.id, order.id]);
}

// Webhook handler for Printful status updates
async function handlePrintfulWebhook(event: PrintfulWebhook) {
  switch (event.type) {
    case 'package_shipped':
      await db.run(`
        UPDATE pantry_orders
        SET status = 'shipped',
            tracking_number = ?,
            tracking_url = ?,
            shipped_at = unixepoch()
        WHERE printful_order_id = ?
      `, [event.data.shipment.tracking_number, event.data.shipment.tracking_url, event.data.order.external_id]);

      await sendShippingConfirmationEmail(order);
      break;
  }
}
```

---

## UI/UX Considerations

### Product Grid

```
┌─────────────────────────────────────────────────────────────────┐
│  Pantry                                    🔍 Search...   🛒 2   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Categories: [All] [Digital] [Stickers] [Pins] [Apparel]        │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │    🌿        │  │    🎁         │  │    📍        │           │
│  │              │  │              │  │              │           │
│  │  Grove Logo  │  │  Gift Card   │  │  Tree Pin    │           │
│  │   Sticker    │  │   $25-$100   │  │              │           │
│  │              │  │              │  │              │           │
│  │    $3.00     │  │  from $25    │  │    $12.00    │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │    💾        │  │     🍂        │  │     ☁️       │           │
│  │              │  │              │  │              │           │
│  │  +10GB       │  │  Autumn      │  │  +50GB       │           │
│  │  Storage     │  │  Sticker Set │  │  Storage     │           │
│  │              │  │              │  │              │           │
│  │   $1/mo      │  │    $8.00     │  │   $4/mo      │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Cart Dropdown

```
┌──────────────────────────────────────┐
│  Your Cart (2 items)                 │
├──────────────────────────────────────┤
│                                      │
│  ┌────┐  Grove Logo Sticker          │
│  │ 🌿 │  Qty: 2         $6.00        │
│  └────┘  [- 2 +]  [Remove]           │
│                                      │
│  ┌────┐  Gift Card ($25)             │
│  │ 🎁 │  Qty: 1        $25.00        │
│  └────┘  [Remove]                    │
│                                      │
│  ──────────────────────────────────  │
│                                      │
│  Subtotal:                  $31.00   │
│                                      │
│  [View Cart]    [Checkout →]         │
│                                      │
└──────────────────────────────────────┘
```

### Checkout Page

```
┌─────────────────────────────────────────────────────────────────┐
│  Checkout                                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────┐  ┌─────────────────────────┐   │
│  │  Contact & Shipping         │  │  Order Summary          │   │
│  │                             │  │                         │   │
│  │  Email *                    │  │  Grove Logo Sticker ×2  │   │
│  │  [________________]         │  │                  $6.00  │   │
│  │                             │  │                         │   │
│  │  Name *                     │  │  Gift Card ($25)        │   │
│  │  [________________]         │  │                 $25.00  │   │
│  │                             │  │                         │   │
│  │  Address *                  │  │  ─────────────────────  │   │
│  │  [________________]         │  │  Subtotal       $31.00  │   │
│  │                             │  │  Shipping        $4.99  │   │
│  │  City *                     │  │  ─────────────────────  │   │
│  │  [________________]         │  │  Total          $35.99  │   │
│  │                             │  │                         │   │
│  │  [State ▼] [Postal]         │  │  [ ] Use Grove Credits  │   │
│  │                             │  │      Balance: $5.00     │   │
│  │  [Country          ▼]       │  │                         │   │
│  │                             │  │                         │   │
│  └─────────────────────────────┘  └─────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Payment                                                │    │
│  │  ┌───────────────────────────────────────────────────┐  │    │
│  │  │  Card number                                      │  │    │
│  │  │  [____________________________________]           │  │    │
│  │  │                                                   │  │    │
│  │  │  Expiry        CVC                                │  │    │
│  │  │  [MM/YY]       [___]                              │  │    │
│  │  └───────────────────────────────────────────────────┘  │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  [← Back to Cart]                          [Complete Order →]   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Mobile Considerations

- Bottom sheet cart on mobile
- Single-column checkout
- Apple Pay / Google Pay support
- Touch-friendly quantity controls

---

## Email Templates

### Order Confirmation

```
Subject: Your Grove order #GRV-2026-00042

Hey there! 🌿

Thanks for your order from the Grove Pantry.

Order #GRV-2026-00042
───────────────────────────────────

Grove Logo Sticker × 2          $6.00
Gift Card ($25)                $25.00
───────────────────────────────────
Subtotal                       $31.00
Shipping                        $4.99
───────────────────────────────────
Total                          $35.99

Shipping to:
Alex Johnson
123 Forest Lane
Portland, OR 97201


What's next?

• Your stickers will ship within 3-5 business days
• Your gift card code has been sent to recipient@email.com
• Track your order: [View Order →]


Questions? Just reply to this email.

With warmth,
The Grove Team

───────────────────────────────────
grove.place/pantry
```

### Gift Card Delivery

```
Subject: You've received a $25 Grove gift card! 🎁

Someone thinks you're pretty great.

You've received a Grove gift card worth $25.00

From: Alex
Message: "Happy birthday! Start your blog 🌱"

Your gift card code:
┌─────────────────────────┐
│     GROVE-XXXX-XXXX     │
└─────────────────────────┘

Redeem it at grove.place/pantry or apply it
to your subscription at plant.grove.place.

This code never expires.

[Redeem Gift Card →]

───────────────────────────────────
grove.place
```

---

## Security Considerations

### Payment Security

- All payments processed via Stripe (PCI compliant)
- No card data stored in Grove systems
- Stripe Elements for secure card input
- 3D Secure supported for high-risk transactions

### Gift Card Security

- Codes generated with cryptographically secure randomness
- Codes are one-time use
- Rate limiting on redemption attempts
- Codes stored hashed (only shown once at purchase)

### Fraud Prevention

- Email verification for guest checkout
- Shipping address validation
- Velocity checks (multiple orders from same IP)
- Integration with Stripe Radar

---

## Implementation Phases

### Phase 1: Foundation (MVP)

- [ ] D1 schema and migrations
- [ ] Product catalog CRUD (admin)
- [ ] Product display pages
- [ ] Shopping cart (localStorage + D1)
- [ ] Stripe checkout integration
- [ ] Order creation and storage
- [ ] Order confirmation emails

### Phase 2: Digital Products

- [ ] Gift card generation and delivery
- [ ] Gift card redemption
- [ ] Credits system
- [ ] Storage add-on integration with Amber
- [ ] Subscription upgrade flow

### Phase 3: Physical Fulfillment

- [ ] Printful integration
- [ ] Shipping rate calculation
- [ ] Tracking integration
- [ ] Shipping notification emails

### Phase 4: Polish

- [ ] Order history UI
- [ ] Mobile optimization
- [ ] Apple Pay / Google Pay
- [ ] Gifting flow (buy for others)
- [ ] Admin dashboard

---

## Success Metrics

1. **Conversion rate** — Cart → Order completion
2. **Average order value** — Revenue per order
3. **Gift card redemption rate** — % of gift cards used
4. **Customer satisfaction** — Post-purchase survey
5. **Fulfillment time** — Order to delivery (physical)

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Stripe outage | Can't process payments | Clear error messaging, retry logic |
| Printful delays | Late merchandise | Set expectations, provide tracking |
| Gift card fraud | Financial loss | Rate limiting, code complexity |
| Inventory sync | Overselling | Real-time inventory checks |
| Scope creep | Delayed launch | Strict MVP, defer features |

---

## References

### External

- [Stripe Checkout](https://stripe.com/docs/payments/checkout)
- [Printful API](https://developers.printful.com/)
- [Cloudflare D1](https://developers.cloudflare.com/d1/)

### Grove Internal

- Grove Pricing: `/docs/grove-pricing.md`
- Grove Naming: `/docs/grove-naming.md`
- Amber Spec: `/docs/specs/amber-spec.md`
- Plant Spec: `/docs/specs/plant-spec.md`

---

*This is a living document. Update as decisions are made and implementation progresses.*
