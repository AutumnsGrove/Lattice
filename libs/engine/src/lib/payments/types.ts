/**
 * Abstract Payment Provider Types
 *
 * Provider-agnostic interfaces for payment processing.
 * Designed for easy switching between Stripe, Paddle, LemonSqueezy, etc.
 */

// =============================================================================
// MONEY & PRICING
// =============================================================================

export interface Money {
  amount: number; // Amount in cents (smallest currency unit)
  currency: string; // ISO 4217 currency code (e.g., 'usd')
}

export type PricingType = "one_time" | "recurring";
export type BillingInterval = "day" | "week" | "month" | "year";

export interface RecurringConfig {
  interval: BillingInterval;
  intervalCount: number; // e.g., 2 for "every 2 months"
}

// =============================================================================
// PRODUCTS & VARIANTS
// =============================================================================

export type ProductType = "physical" | "digital" | "subscription" | "service";
export type ProductStatus = "draft" | "active" | "archived";

export interface ProductBase {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  type: ProductType;
  status: ProductStatus;
  images: string[]; // URLs to product images
  metadata?: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductVariant {
  id: string;
  productId: string;
  name: string; // e.g., "Small", "Blue", "Monthly"
  sku?: string; // Stock keeping unit
  price: Money;
  compareAtPrice?: Money; // Original price for sales display
  pricingType: PricingType;
  recurring?: RecurringConfig;

  // Inventory (physical products)
  inventoryQuantity?: number;
  inventoryPolicy?: "deny" | "continue"; // What to do when out of stock

  // Digital products
  downloadUrl?: string;
  downloadLimit?: number;

  // Provider reference
  providerPriceId?: string; // e.g., Stripe price_xxx

  isDefault: boolean;
  position: number; // Sort order
  createdAt: Date;
  updatedAt: Date;
}

export interface Product extends ProductBase {
  variants: ProductVariant[];
  defaultVariantId?: string;
}

// =============================================================================
// CART & LINE ITEMS
// =============================================================================

export interface CartItem {
  variantId: string;
  quantity: number;
  metadata?: Record<string, string>;
}

export interface LineItem {
  id: string;
  variantId: string;
  productId: string;
  productName: string;
  variantName: string;
  quantity: number;
  unitPrice: Money;
  totalPrice: Money;
  taxAmount?: Money;
  metadata?: Record<string, string>;
}

// =============================================================================
// CHECKOUT
// =============================================================================

export type CheckoutMode = "payment" | "subscription" | "setup";

export interface CheckoutOptions {
  mode: CheckoutMode;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  customerId?: string; // Provider customer ID
  metadata?: Record<string, string>;

  // Stripe Connect specific
  connectedAccountId?: string; // For marketplace payments
  applicationFeeAmount?: number; // Platform fee in cents

  // Tax
  automaticTax?: boolean;
  taxIdCollection?: boolean;

  // Shipping (physical products)
  shippingAddressCollection?: {
    allowedCountries: string[];
  };

  // Billing
  billingAddressCollection?: "auto" | "required";

  // Subscription specific
  subscriptionData?: {
    prorationBehavior?: "create_prorations" | "always_invoice" | "none";
  };

  // Discounts
  allowPromotionCodes?: boolean;
}

export interface CheckoutSession {
  id: string;
  url: string; // Redirect URL for hosted checkout
  status: "open" | "complete" | "expired";
  mode: CheckoutMode;
  customerId?: string;
  customerEmail?: string;
  amountTotal?: Money;
  paymentStatus: "unpaid" | "paid" | "no_payment_required";
  metadata?: Record<string, string>;
  expiresAt: Date;
}

// =============================================================================
// PAYMENTS & ORDERS
// =============================================================================

export type PaymentStatus =
  | "pending"
  | "processing"
  | "succeeded"
  | "failed"
  | "canceled"
  | "refunded"
  | "partially_refunded";

export type OrderStatus =
  | "pending" // Order created, awaiting payment
  | "paid" // Payment received
  | "processing" // Being prepared/fulfilled
  | "shipped" // Physical: shipped; Digital: delivered
  | "completed" // Fully delivered
  | "canceled" // Canceled before fulfillment
  | "refunded"; // Refunded after payment

export interface Order {
  id: string;
  tenantId: string;
  customerId?: string;
  customerEmail: string;

  // Items
  lineItems: LineItem[];

  // Pricing
  subtotal: Money;
  taxTotal: Money;
  shippingTotal: Money;
  discountTotal: Money;
  total: Money;

  // Status
  status: OrderStatus;
  paymentStatus: PaymentStatus;

  // Payment reference
  providerOrderId?: string; // e.g., Stripe payment_intent_xxx
  providerSessionId?: string; // e.g., Stripe cs_xxx

  // Shipping (physical products)
  shippingAddress?: Address;
  billingAddress?: Address;

  // Fulfillment
  fulfilledAt?: Date;
  shippedAt?: Date;
  trackingNumber?: string;
  trackingUrl?: string;

  // Notes
  notes?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface Address {
  name?: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string; // ISO 3166-1 alpha-2 country code
  phone?: string;
}

// =============================================================================
// REFUNDS
// =============================================================================

export type RefundReason =
  | "duplicate"
  | "fraudulent"
  | "requested_by_customer"
  | "other";

export interface RefundRequest {
  orderId: string;
  amount?: number; // Partial refund amount in cents (omit for full refund)
  reason?: RefundReason;
  notes?: string;
}

export interface RefundResult {
  id: string;
  orderId: string;
  amount: Money;
  status: "pending" | "succeeded" | "failed" | "canceled";
  reason?: RefundReason;
  providerRefundId?: string;
  createdAt: Date;
}

// =============================================================================
// SUBSCRIPTIONS
// =============================================================================

export type SubscriptionStatus =
  | "active"
  | "past_due"
  | "paused"
  | "canceled"
  | "unpaid";

export interface Subscription {
  id: string;
  tenantId: string;
  customerId: string;
  customerEmail: string;

  // Plan
  productId: string;
  variantId: string;
  quantity: number;

  // Status
  status: SubscriptionStatus;

  // Billing
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt?: Date;

  // Provider reference
  providerSubscriptionId?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// CUSTOMERS
// =============================================================================

export interface Customer {
  id: string;
  tenantId: string;
  email: string;
  name?: string;
  phone?: string;

  // Default addresses
  defaultShippingAddress?: Address;
  defaultBillingAddress?: Address;

  // Provider reference
  providerCustomerId?: string; // e.g., Stripe cus_xxx

  // Metadata
  metadata?: Record<string, string>;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// WEBHOOKS
// =============================================================================

export type WebhookEventType =
  // Checkout
  | "checkout.session.completed"
  | "checkout.session.expired"
  // Payments
  | "payment.succeeded"
  | "payment.failed"
  // Subscriptions
  | "subscription.created"
  | "subscription.updated"
  | "subscription.canceled"
  // Invoices
  | "invoice.paid"
  | "invoice.payment_failed"
  // Refunds
  | "refund.created"
  | "refund.updated"
  // Connect (marketplace)
  | "account.updated"
  | "payout.paid";

export interface WebhookEvent {
  id: string;
  type: WebhookEventType;
  data: unknown;
  createdAt: Date;
  providerEventId?: string;
}

export interface WebhookResult {
  received: boolean;
  event?: WebhookEvent;
  error?: string;
}

// =============================================================================
// STRIPE CONNECT (MARKETPLACE)
// =============================================================================

export type ConnectAccountStatus =
  | "pending" // Account created, onboarding incomplete
  | "enabled" // Can accept payments
  | "restricted" // Limited functionality
  | "disabled"; // Cannot process payments

export interface ConnectAccount {
  id: string;
  tenantId: string;
  providerAccountId: string; // e.g., Stripe acct_xxx
  status: ConnectAccountStatus;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  email?: string;
  country?: string;
  defaultCurrency?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConnectOnboardingOptions {
  tenantId: string;
  returnUrl: string;
  refreshUrl: string;
  type?: "standard" | "express" | "custom";
  country?: string;
  email?: string;
  businessType?: "individual" | "company" | "non_profit";
}

export interface ConnectOnboardingResult {
  accountId: string;
  onboardingUrl: string;
  expiresAt?: Date;
}

// =============================================================================
// PLATFORM BILLING (TENANT SUBSCRIPTIONS)
// =============================================================================

export type PlanTier = "seedling" | "sapling" | "oak" | "evergreen";

export interface PlatformPlan {
  tier: PlanTier;
  name: string;
  price: Money;
  yearlyPrice?: Money; // 15% discount for yearly
  interval: BillingInterval;
  features: string[];
  limits: {
    posts?: number; // undefined = unlimited
    storage?: number; // MB
    customDomain?: boolean;
    byod?: boolean; // Bring Your Own Domain
    email?: "none" | "forward" | "full";
    analytics?: "basic" | "full";
    supportHours?: number; // Included support hours (first month)
    shop?: boolean;
  };
  providerPriceId?: string;
  yearlyPriceId?: string;
}

export interface TenantBilling {
  tenantId: string;
  plan: PlanTier;
  status: SubscriptionStatus;
  customerId?: string;
  subscriptionId?: string;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
}

// =============================================================================
// PROVIDER INTERFACE
// =============================================================================

export interface PaymentProviderConfig {
  secretKey: string;
  publishableKey?: string;
  webhookSecret?: string;

  // Stripe Connect
  connectClientId?: string;

  // Platform account (for Connect)
  platformAccountId?: string;

  // LemonSqueezy
  storeId?: string;
}

/**
 * Abstract Payment Provider Interface
 *
 * Implement this interface for each payment provider (Stripe, Paddle, etc.)
 */
export interface PaymentProvider {
  readonly name: string;

  // ==========================================================================
  // PRODUCTS & PRICES (Provider sync)
  // ==========================================================================

  /**
   * Sync a product to the payment provider
   * Creates/updates product in Stripe/Paddle/etc.
   */
  syncProduct(product: ProductBase): Promise<{ providerProductId: string }>;

  /**
   * Sync a price/variant to the payment provider
   */
  syncPrice(
    variant: ProductVariant,
    providerProductId: string,
  ): Promise<{ providerPriceId: string }>;

  /**
   * Archive a product in the provider
   */
  archiveProduct(providerProductId: string): Promise<void>;

  // ==========================================================================
  // CHECKOUT
  // ==========================================================================

  /**
   * Create a checkout session for purchasing items
   */
  createCheckoutSession(
    items: CartItem[],
    options: CheckoutOptions,
    resolveVariant: (variantId: string) => Promise<ProductVariant | null>,
  ): Promise<CheckoutSession>;

  /**
   * Retrieve a checkout session by ID
   */
  getCheckoutSession(sessionId: string): Promise<CheckoutSession | null>;

  // ==========================================================================
  // PAYMENTS
  // ==========================================================================

  /**
   * Get payment status for an order
   */
  getPaymentStatus(providerPaymentId: string): Promise<PaymentStatus>;

  /**
   * Process a refund
   */
  refund(
    request: RefundRequest,
    providerPaymentId: string,
  ): Promise<RefundResult>;

  // ==========================================================================
  // SUBSCRIPTIONS
  // ==========================================================================

  /**
   * Get subscription details
   */
  getSubscription(providerSubscriptionId: string): Promise<Subscription | null>;

  /**
   * Cancel a subscription
   */
  cancelSubscription(
    providerSubscriptionId: string,
    cancelImmediately?: boolean,
  ): Promise<void>;

  /**
   * Resume a canceled subscription (if not yet ended)
   */
  resumeSubscription(providerSubscriptionId: string): Promise<void>;

  // ==========================================================================
  // CUSTOMERS
  // ==========================================================================

  /**
   * Create or update a customer in the provider
   */
  syncCustomer(
    customer: Partial<Customer>,
  ): Promise<{ providerCustomerId: string }>;

  /**
   * Get customer by provider ID
   */
  getCustomer(providerCustomerId: string): Promise<Customer | null>;

  /**
   * Create a billing portal session for customer self-service
   */
  createBillingPortalSession(
    providerCustomerId: string,
    returnUrl: string,
  ): Promise<{ id: string; url: string }>;

  // ==========================================================================
  // WEBHOOKS
  // ==========================================================================

  /**
   * Verify and parse a webhook payload
   */
  handleWebhook(request: Request): Promise<WebhookResult>;

  // ==========================================================================
  // STRIPE CONNECT (Optional - marketplace features)
  // ==========================================================================

  /**
   * Create a Connect account for a tenant
   */
  createConnectAccount?(
    options: ConnectOnboardingOptions,
  ): Promise<ConnectOnboardingResult>;

  /**
   * Get Connect account status
   */
  getConnectAccount?(providerAccountId: string): Promise<ConnectAccount | null>;

  /**
   * Create an account link for onboarding/updating
   */
  createConnectAccountLink?(
    providerAccountId: string,
    options: Pick<ConnectOnboardingOptions, "returnUrl" | "refreshUrl">,
  ): Promise<{ url: string; expiresAt?: Date }>;

  /**
   * Create a login link for the Connect dashboard
   */
  createConnectLoginLink?(providerAccountId: string): Promise<{ url: string }>;
}
