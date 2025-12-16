/**
 * Abstract Payment Provider Types
 *
 * Provider-agnostic interfaces for payment processing.
 * Designed for easy switching between Stripe, Paddle, LemonSqueezy, etc.
 */
export interface Money {
    amount: number;
    currency: string;
}
export type PricingType = 'one_time' | 'recurring';
export type BillingInterval = 'day' | 'week' | 'month' | 'year';
export interface RecurringConfig {
    interval: BillingInterval;
    intervalCount: number;
}
export type ProductType = 'physical' | 'digital' | 'subscription' | 'service';
export type ProductStatus = 'draft' | 'active' | 'archived';
export interface ProductBase {
    id: string;
    tenantId: string;
    name: string;
    description?: string;
    type: ProductType;
    status: ProductStatus;
    images: string[];
    metadata?: Record<string, string>;
    createdAt: Date;
    updatedAt: Date;
}
export interface ProductVariant {
    id: string;
    productId: string;
    name: string;
    sku?: string;
    price: Money;
    compareAtPrice?: Money;
    pricingType: PricingType;
    recurring?: RecurringConfig;
    inventoryQuantity?: number;
    inventoryPolicy?: 'deny' | 'continue';
    downloadUrl?: string;
    downloadLimit?: number;
    providerPriceId?: string;
    isDefault: boolean;
    position: number;
    createdAt: Date;
    updatedAt: Date;
}
export interface Product extends ProductBase {
    variants: ProductVariant[];
    defaultVariantId?: string;
}
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
export type CheckoutMode = 'payment' | 'subscription' | 'setup';
export interface CheckoutOptions {
    mode: CheckoutMode;
    successUrl: string;
    cancelUrl: string;
    customerEmail?: string;
    customerId?: string;
    metadata?: Record<string, string>;
    connectedAccountId?: string;
    applicationFeeAmount?: number;
    automaticTax?: boolean;
    taxIdCollection?: boolean;
    shippingAddressCollection?: {
        allowedCountries: string[];
    };
    billingAddressCollection?: 'auto' | 'required';
    trialPeriodDays?: number;
    allowPromotionCodes?: boolean;
}
export interface CheckoutSession {
    id: string;
    url: string;
    status: 'open' | 'complete' | 'expired';
    mode: CheckoutMode;
    customerId?: string;
    customerEmail?: string;
    amountTotal?: Money;
    paymentStatus: 'unpaid' | 'paid' | 'no_payment_required';
    metadata?: Record<string, string>;
    expiresAt: Date;
}
export type PaymentStatus = 'pending' | 'processing' | 'succeeded' | 'failed' | 'canceled' | 'refunded' | 'partially_refunded';
export type OrderStatus = 'pending' | 'paid' | 'processing' | 'shipped' | 'completed' | 'canceled' | 'refunded';
export interface Order {
    id: string;
    tenantId: string;
    customerId?: string;
    customerEmail: string;
    lineItems: LineItem[];
    subtotal: Money;
    taxTotal: Money;
    shippingTotal: Money;
    discountTotal: Money;
    total: Money;
    status: OrderStatus;
    paymentStatus: PaymentStatus;
    providerOrderId?: string;
    providerSessionId?: string;
    shippingAddress?: Address;
    billingAddress?: Address;
    fulfilledAt?: Date;
    shippedAt?: Date;
    trackingNumber?: string;
    trackingUrl?: string;
    notes?: string;
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
    country: string;
    phone?: string;
}
export type RefundReason = 'duplicate' | 'fraudulent' | 'requested_by_customer' | 'other';
export interface RefundRequest {
    orderId: string;
    amount?: number;
    reason?: RefundReason;
    notes?: string;
}
export interface RefundResult {
    id: string;
    orderId: string;
    amount: Money;
    status: 'pending' | 'succeeded' | 'failed' | 'canceled';
    reason?: RefundReason;
    providerRefundId?: string;
    createdAt: Date;
}
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'paused' | 'canceled' | 'unpaid';
export interface Subscription {
    id: string;
    tenantId: string;
    customerId: string;
    customerEmail: string;
    productId: string;
    variantId: string;
    quantity: number;
    status: SubscriptionStatus;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    cancelAtPeriodEnd: boolean;
    canceledAt?: Date;
    trialStart?: Date;
    trialEnd?: Date;
    providerSubscriptionId?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface Customer {
    id: string;
    tenantId: string;
    email: string;
    name?: string;
    phone?: string;
    defaultShippingAddress?: Address;
    defaultBillingAddress?: Address;
    providerCustomerId?: string;
    metadata?: Record<string, string>;
    createdAt: Date;
    updatedAt: Date;
}
export type WebhookEventType = 'checkout.session.completed' | 'checkout.session.expired' | 'payment.succeeded' | 'payment.failed' | 'subscription.created' | 'subscription.updated' | 'subscription.canceled' | 'subscription.trial_will_end' | 'invoice.paid' | 'invoice.payment_failed' | 'refund.created' | 'refund.updated' | 'account.updated' | 'payout.paid';
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
export type ConnectAccountStatus = 'pending' | 'enabled' | 'restricted' | 'disabled';
export interface ConnectAccount {
    id: string;
    tenantId: string;
    providerAccountId: string;
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
    type?: 'standard' | 'express' | 'custom';
    country?: string;
    email?: string;
    businessType?: 'individual' | 'company' | 'non_profit';
}
export interface ConnectOnboardingResult {
    accountId: string;
    onboardingUrl: string;
    expiresAt?: Date;
}
export type PlanTier = 'seedling' | 'sapling' | 'oak' | 'evergreen';
export interface PlatformPlan {
    tier: PlanTier;
    name: string;
    price: Money;
    yearlyPrice?: Money;
    interval: BillingInterval;
    features: string[];
    limits: {
        posts?: number;
        storage?: number;
        customDomain?: boolean;
        byod?: boolean;
        email?: 'none' | 'forward' | 'full';
        analytics?: 'basic' | 'full';
        supportHours?: number;
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
export interface PaymentProviderConfig {
    secretKey: string;
    publishableKey?: string;
    webhookSecret?: string;
    connectClientId?: string;
    platformAccountId?: string;
}
/**
 * Abstract Payment Provider Interface
 *
 * Implement this interface for each payment provider (Stripe, Paddle, etc.)
 */
export interface PaymentProvider {
    readonly name: string;
    /**
     * Sync a product to the payment provider
     * Creates/updates product in Stripe/Paddle/etc.
     */
    syncProduct(product: ProductBase): Promise<{
        providerProductId: string;
    }>;
    /**
     * Sync a price/variant to the payment provider
     */
    syncPrice(variant: ProductVariant, providerProductId: string): Promise<{
        providerPriceId: string;
    }>;
    /**
     * Archive a product in the provider
     */
    archiveProduct(providerProductId: string): Promise<void>;
    /**
     * Create a checkout session for purchasing items
     */
    createCheckoutSession(items: CartItem[], options: CheckoutOptions, resolveVariant: (variantId: string) => Promise<ProductVariant | null>): Promise<CheckoutSession>;
    /**
     * Retrieve a checkout session by ID
     */
    getCheckoutSession(sessionId: string): Promise<CheckoutSession | null>;
    /**
     * Get payment status for an order
     */
    getPaymentStatus(providerPaymentId: string): Promise<PaymentStatus>;
    /**
     * Process a refund
     */
    refund(request: RefundRequest, providerPaymentId: string): Promise<RefundResult>;
    /**
     * Get subscription details
     */
    getSubscription(providerSubscriptionId: string): Promise<Subscription | null>;
    /**
     * Cancel a subscription
     */
    cancelSubscription(providerSubscriptionId: string, cancelImmediately?: boolean): Promise<void>;
    /**
     * Resume a canceled subscription (if not yet ended)
     */
    resumeSubscription(providerSubscriptionId: string): Promise<void>;
    /**
     * Create or update a customer in the provider
     */
    syncCustomer(customer: Partial<Customer>): Promise<{
        providerCustomerId: string;
    }>;
    /**
     * Get customer by provider ID
     */
    getCustomer(providerCustomerId: string): Promise<Customer | null>;
    /**
     * Create a billing portal session for customer self-service
     */
    createBillingPortalSession(providerCustomerId: string, returnUrl: string): Promise<{
        url: string;
    }>;
    /**
     * Verify and parse a webhook payload
     */
    handleWebhook(request: Request): Promise<WebhookResult>;
    /**
     * Create a Connect account for a tenant
     */
    createConnectAccount?(options: ConnectOnboardingOptions): Promise<ConnectOnboardingResult>;
    /**
     * Get Connect account status
     */
    getConnectAccount?(providerAccountId: string): Promise<ConnectAccount | null>;
    /**
     * Create an account link for onboarding/updating
     */
    createConnectAccountLink?(providerAccountId: string, options: Pick<ConnectOnboardingOptions, 'returnUrl' | 'refreshUrl'>): Promise<{
        url: string;
        expiresAt?: Date;
    }>;
    /**
     * Create a login link for the Connect dashboard
     */
    createConnectLoginLink?(providerAccountId: string): Promise<{
        url: string;
    }>;
}
