/**
 * BillingHub API Type Definitions
 *
 * Environment bindings and request/response types for the
 * centralized billing API worker.
 */

// =============================================================================
// ENVIRONMENT
// =============================================================================

export interface Env {
	/** D1 Database (grove-engine-db — shared with engine) */
	DB: D1Database;

	/** KV Namespace for rate limiting */
	CACHE_KV: KVNamespace;

	/** Zephyr email gateway (service binding) */
	ZEPHYR: Fetcher;

	/** Stripe API secret key */
	STRIPE_SECRET_KEY: string;

	/** Stripe webhook signing secret */
	STRIPE_WEBHOOK_SECRET: string;

	/** Environment identifier */
	ENVIRONMENT: string;

	/** Public billing hub URL */
	BILLING_HUB_URL: string;
}

// =============================================================================
// TIERS & BILLING
// =============================================================================

export type PlanTier = "wanderer" | "seedling" | "sapling" | "oak" | "evergreen";
export type BillingCycle = "monthly" | "yearly";
export type SubscriptionStatus = "active" | "past_due" | "paused" | "cancelled" | "expired";

/** Paid tiers that require Stripe */
export const PAID_TIERS: PlanTier[] = ["seedling", "sapling", "oak", "evergreen"];

/**
 * Stripe Price IDs — hardcoded, not secrets.
 * Copied from apps/plant/src/lib/server/stripe.ts (single source of truth during migration).
 */
export const STRIPE_PRICES: Record<string, Record<BillingCycle, string>> = {
	seedling: {
		monthly: "price_1ShXzXRpJ6WVdxl3dwuzZX90",
		yearly: "price_1ShXzXRpJ6WVdxl38ZgKg4Wk",
	},
	sapling: {
		monthly: "price_1ShY0MRpJ6WVdxl33inwSBKH",
		yearly: "price_1ShY0MRpJ6WVdxl3RI7YAUBK",
	},
	oak: {
		monthly: "price_1ShY0yRpJ6WVdxl3GRhURSI8",
		yearly: "price_1ShY0yRpJ6WVdxl38u1qm3EX",
	},
	evergreen: {
		monthly: "price_1ShY1fRpJ6WVdxl3IiVhJ7BQ",
		yearly: "price_1ShY1fRpJ6WVdxl3rOJXhOkP",
	},
};

// =============================================================================
// REQUEST/RESPONSE TYPES
// =============================================================================

export interface CheckoutRequest {
	tenantId?: string;
	onboardingId?: string;
	tier: string;
	billingCycle: string;
	customerEmail?: string;
	successUrl: string;
	cancelUrl: string;
}

export interface PortalRequest {
	tenantId: string;
	returnUrl: string;
}

export interface CancelRequest {
	tenantId: string;
	immediately?: boolean;
}

export interface ResumeRequest {
	tenantId: string;
}

// =============================================================================
// DATABASE RECORD TYPES
// =============================================================================

export interface BillingRecord {
	id: string;
	tenant_id: string;
	plan: string;
	status: string;
	provider_customer_id: string | null;
	provider_subscription_id: string | null;
	current_period_start: number | null;
	current_period_end: number | null;
	cancel_at_period_end: number;
	payment_method_last4: string | null;
	payment_method_brand: string | null;
	created_at: number;
	updated_at: number;
}

export interface TenantRecord {
	id: string;
	subdomain: string;
	display_name: string;
	email: string;
	plan: string;
	active: number;
}

export interface OnboardingRecord {
	id: string;
	username: string;
	display_name: string;
	email: string;
	plan_selected: string;
	favorite_color: string | null;
}
