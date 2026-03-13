/**
 * SvelteKit Type Augmentation — billing.grove.place
 *
 * Platform.env has BILLING_API (billing backend service binding),
 * AUTH (Heartwood session validation), and STRIPE_WEBHOOK_SECRET.
 * No DB binding — this is a billing UI + proxy layer only.
 */

/// <reference types="@sveltejs/kit" />
/// <reference types="@cloudflare/workers-types" />

declare global {
	namespace App {
		interface Error {
			message: string;
			code?: string;
		}

		interface Locals {
			tenantId?: string;
			userId?: string;
		}

		interface PageData {}

		interface Platform {
			env?: {
				/** Billing API Service Binding (grove-billing-api) */
				BILLING_API: Fetcher;
				/** GroveAuth Service Binding (Heartwood — session validation) */
				AUTH: Fetcher;
				/** Stripe webhook signing secret (belt-and-suspenders verification) */
				STRIPE_WEBHOOK_SECRET: string;
			};
			context?: {
				waitUntil(promise: Promise<unknown>): void;
			};
		}
	}
}

export {};
