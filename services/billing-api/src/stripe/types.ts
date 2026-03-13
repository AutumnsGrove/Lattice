/**
 * Stripe-specific Type Definitions
 *
 * Minimal Stripe resource types needed by billing-api.
 * Adapted from libs/engine/src/lib/payments/stripe/client.ts
 */

// =============================================================================
// STRIPE API TYPES
// =============================================================================

export interface StripeCheckoutSession {
	id: string;
	object: "checkout.session";
	url: string;
	status: "open" | "complete" | "expired";
	mode: "payment" | "subscription" | "setup";
	customer?: string;
	customer_email?: string;
	subscription?: string;
	amount_total: number;
	currency: string;
	payment_status: "unpaid" | "paid" | "no_payment_required";
	metadata: Record<string, string>;
	expires_at: number;
}

export interface StripeCustomer {
	id: string;
	object: "customer";
	email?: string;
	name?: string;
	metadata: Record<string, string>;
	created: number;
}

export interface StripeSubscription {
	id: string;
	object: "subscription";
	status:
		| "incomplete"
		| "incomplete_expired"
		| "trialing"
		| "active"
		| "past_due"
		| "canceled"
		| "unpaid"
		| "paused";
	customer: string;
	items: {
		data: Array<{
			id: string;
			price: {
				id: string;
				product: string;
				unit_amount: number;
				currency: string;
				recurring?: {
					interval: "day" | "week" | "month" | "year";
					interval_count: number;
				};
			};
			quantity: number;
		}>;
	};
	current_period_start: number;
	current_period_end: number;
	cancel_at_period_end: boolean;
	canceled_at?: number;
	metadata: Record<string, string>;
	default_payment_method?: string | { last4?: string; brand?: string };
	created: number;
}

export interface StripeBillingPortalSession {
	id: string;
	object: "billing_portal.session";
	url: string;
	customer: string;
	return_url: string;
	created: number;
}

export interface StripeInvoice {
	id: string;
	object: "invoice";
	customer: string;
	subscription?: string;
	status: "draft" | "open" | "paid" | "uncollectible" | "void";
	amount_paid: number;
	amount_due: number;
	currency: string;
	billing_reason?:
		| "subscription_create"
		| "subscription_cycle"
		| "subscription_update"
		| "subscription_threshold"
		| "manual"
		| "upcoming"
		| string;
	lines?: {
		data: Array<{
			id: string;
			price?: {
				id: string;
				recurring?: {
					interval: "day" | "week" | "month" | "year";
					interval_count: number;
				};
			};
		}>;
	};
}

export interface StripeEvent {
	id: string;
	object: "event";
	type: string;
	data: {
		object: StripeCheckoutSession | StripeSubscription | StripeInvoice | Record<string, unknown>;
		previous_attributes?: Record<string, unknown>;
	};
	created: number;
	livemode: boolean;
}

export interface StripeError {
	type: string;
	code?: string;
	message: string;
	param?: string;
	decline_code?: string;
}

export interface StripeListResponse<T> {
	object: "list";
	data: T[];
	has_more: boolean;
}
