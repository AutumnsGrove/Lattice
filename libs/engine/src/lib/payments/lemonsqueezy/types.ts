/**
 * Lemon Squeezy Type Definitions
 *
 * Types for Lemon Squeezy API responses and webhook payloads.
 * Based on the official LS API documentation.
 */

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

export interface LemonSqueezyResponse<T> {
  jsonapi: { version: string };
  links?: {
    first?: string;
    last?: string;
    next?: string;
    prev?: string;
  };
  meta?: {
    page?: {
      currentPage: number;
      from: number;
      lastPage: number;
      perPage: number;
      to: number;
      total: number;
    };
  };
  data: T;
  included?: unknown[];
}

export interface LemonSqueezyResource<T extends string, A> {
  type: T;
  id: string;
  attributes: A;
  relationships?: Record<string, unknown>;
  links?: { self: string };
}

// =============================================================================
// STORE & PRODUCTS
// =============================================================================

export interface LemonSqueezyStoreAttributes {
  name: string;
  slug: string;
  domain: string;
  url: string;
  avatar_url: string;
  plan: string;
  country: string;
  country_nicename: string;
  currency: string;
  total_sales: number;
  total_revenue: number;
  thirty_day_sales: number;
  thirty_day_revenue: number;
  created_at: string;
  updated_at: string;
}

export type LemonSqueezyStore = LemonSqueezyResource<
  "stores",
  LemonSqueezyStoreAttributes
>;

export interface LemonSqueezyProductAttributes {
  store_id: number;
  name: string;
  slug: string;
  description: string;
  status: "draft" | "published";
  status_formatted: string;
  thumb_url: string | null;
  large_thumb_url: string | null;
  price: number;
  price_formatted: string;
  from_price: number | null;
  to_price: number | null;
  pay_what_you_want: boolean;
  buy_now_url: string;
  created_at: string;
  updated_at: string;
}

export type LemonSqueezyProduct = LemonSqueezyResource<
  "products",
  LemonSqueezyProductAttributes
>;

export interface LemonSqueezyVariantAttributes {
  product_id: number;
  name: string;
  slug: string;
  description: string;
  price: number;
  price_formatted: string;
  is_subscription: boolean;
  interval: "day" | "week" | "month" | "year" | null;
  interval_count: number | null;
  pay_what_you_want: boolean;
  min_price: number;
  suggested_price: number;
  status: "pending" | "draft" | "published";
  status_formatted: string;
  created_at: string;
  updated_at: string;
}

export type LemonSqueezyVariant = LemonSqueezyResource<
  "variants",
  LemonSqueezyVariantAttributes
>;

// =============================================================================
// CHECKOUT
// =============================================================================

export interface LemonSqueezyCheckoutAttributes {
  store_id: number;
  variant_id: number;
  custom_price: number | null;
  product_options: {
    name?: string;
    description?: string;
    media?: string[];
    redirect_url?: string;
    receipt_button_text?: string;
    receipt_link_url?: string;
    receipt_thank_you_note?: string;
    enabled_variants?: number[];
  };
  checkout_options: {
    embed?: boolean;
    media?: boolean;
    logo?: boolean;
    desc?: boolean;
    discount?: boolean;
    subscription_preview?: boolean;
    button_color?: string;
  };
  checkout_data: {
    email?: string;
    name?: string;
    billing_address?: {
      country: string;
      zip: string;
    };
    tax_number?: string;
    discount_code?: string;
    custom?: Record<string, string | number | boolean>;
    variant_quantities?: Array<{ variant_id: number; quantity: number }>;
  };
  preview?: {
    currency: string;
    currency_rate: number;
    subtotal: number;
    discount_total: number;
    tax: number;
    total: number;
    subtotal_usd: number;
    discount_total_usd: number;
    tax_usd: number;
    total_usd: number;
    subtotal_formatted: string;
    discount_total_formatted: string;
    tax_formatted: string;
    total_formatted: string;
  };
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  test_mode: boolean;
  url: string;
}

export type LemonSqueezyCheckout = LemonSqueezyResource<
  "checkouts",
  LemonSqueezyCheckoutAttributes
>;

// =============================================================================
// CUSTOMERS
// =============================================================================

export interface LemonSqueezyCustomerAttributes {
  store_id: number;
  name: string;
  email: string;
  status:
    | "subscribed"
    | "unsubscribed"
    | "archived"
    | "requires_verification"
    | "invalid_email"
    | "bounced";
  status_formatted: string;
  city: string | null;
  region: string | null;
  country: string | null;
  total_revenue_currency: number;
  mrr: number;
  urls: {
    customer_portal: string;
  };
  created_at: string;
  updated_at: string;
}

export type LemonSqueezyCustomer = LemonSqueezyResource<
  "customers",
  LemonSqueezyCustomerAttributes
>;

// =============================================================================
// SUBSCRIPTIONS
// =============================================================================

export type LemonSqueezySubscriptionStatus =
  | "on_trial"
  | "active"
  | "paused"
  | "past_due"
  | "unpaid"
  | "cancelled"
  | "expired";

export interface LemonSqueezySubscriptionAttributes {
  store_id: number;
  customer_id: number;
  order_id: number;
  order_item_id: number;
  product_id: number;
  variant_id: number;
  product_name: string;
  variant_name: string;
  user_name: string;
  user_email: string;
  status: LemonSqueezySubscriptionStatus;
  status_formatted: string;
  card_brand: string | null;
  card_last_four: string | null;
  pause: {
    mode: "void" | "free";
    resumes_at: string | null;
  } | null;
  cancelled: boolean;
  billing_anchor: number;
  first_subscription_item: {
    id: number;
    subscription_id: number;
    price_id: number;
    quantity: number;
    is_usage_based: boolean;
    created_at: string;
    updated_at: string;
  } | null;
  urls: {
    update_payment_method: string;
    customer_portal: string;
    customer_portal_update_subscription: string;
  };
  renews_at: string;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
  test_mode: boolean;
}

export type LemonSqueezySubscription = LemonSqueezyResource<
  "subscriptions",
  LemonSqueezySubscriptionAttributes
>;

// =============================================================================
// ORDERS
// =============================================================================

export type LemonSqueezyOrderStatus =
  | "pending"
  | "failed"
  | "paid"
  | "refunded"
  | "partial_refund";

export interface LemonSqueezyOrderAttributes {
  store_id: number;
  customer_id: number;
  identifier: string;
  order_number: number;
  user_name: string;
  user_email: string;
  currency: string;
  currency_rate: string;
  subtotal: number;
  discount_total: number;
  tax: number;
  total: number;
  subtotal_usd: number;
  discount_total_usd: number;
  tax_usd: number;
  total_usd: number;
  tax_name: string;
  tax_rate: string;
  status: LemonSqueezyOrderStatus;
  status_formatted: string;
  refunded: boolean;
  refunded_at: string | null;
  subtotal_formatted: string;
  discount_total_formatted: string;
  tax_formatted: string;
  total_formatted: string;
  first_order_item: {
    id: number;
    order_id: number;
    product_id: number;
    variant_id: number;
    product_name: string;
    variant_name: string;
    price: number;
    quantity: number;
    created_at: string;
    updated_at: string;
  } | null;
  urls: {
    receipt: string;
  };
  created_at: string;
  updated_at: string;
}

export type LemonSqueezyOrder = LemonSqueezyResource<
  "orders",
  LemonSqueezyOrderAttributes
>;

// =============================================================================
// WEBHOOKS
// =============================================================================

export type LemonSqueezyWebhookEventName =
  | "order_created"
  | "order_refunded"
  | "subscription_created"
  | "subscription_updated"
  | "subscription_cancelled"
  | "subscription_resumed"
  | "subscription_expired"
  | "subscription_paused"
  | "subscription_unpaused"
  | "subscription_payment_success"
  | "subscription_payment_failed"
  | "subscription_payment_recovered"
  | "subscription_plan_changed"
  | "license_key_created"
  | "license_key_updated";

export interface LemonSqueezyWebhookMeta {
  event_name: LemonSqueezyWebhookEventName;
  custom_data?: Record<string, string | number | boolean>;
  test_mode: boolean;
}

export interface LemonSqueezyWebhookPayload<T = unknown> {
  meta: LemonSqueezyWebhookMeta;
  data: {
    type: string;
    id: string;
    attributes: T;
    relationships?: Record<string, unknown>;
    links?: { self: string };
  };
}

// Typed webhook payloads
export type LemonSqueezySubscriptionWebhook =
  LemonSqueezyWebhookPayload<LemonSqueezySubscriptionAttributes>;
export type LemonSqueezyOrderWebhook =
  LemonSqueezyWebhookPayload<LemonSqueezyOrderAttributes>;

// =============================================================================
// CONFIG
// =============================================================================

export interface LemonSqueezyConfig {
  apiKey: string;
  storeId: string;
  webhookSecret?: string;
}
