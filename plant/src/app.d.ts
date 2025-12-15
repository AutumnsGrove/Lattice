/// <reference types="@sveltejs/kit" />
/// <reference types="@cloudflare/workers-types" />

declare global {
	namespace App {
		interface Error {
			message: string;
			code?: string;
		}

		interface Locals {
			user?: {
				id: string;
				groveauthId: string;
				email: string;
				displayName?: string;
				username?: string;
			};
			onboarding?: {
				id: string;
				step: 'auth' | 'profile' | 'plans' | 'checkout' | 'success' | 'tour';
				profileCompleted: boolean;
				planSelected?: string;
				paymentCompleted: boolean;
				tenantCreated: boolean;
			};
		}

		interface PageData {}

		interface Platform {
			env?: {
				DB: D1Database;
				GROVEAUTH_URL: string;
				GROVEAUTH_CLIENT_ID: string;
				GROVEAUTH_CLIENT_SECRET: string;
				STRIPE_SECRET_KEY: string;
				STRIPE_PUBLISHABLE_KEY: string;
				STRIPE_WEBHOOK_SECRET: string;
				RESEND_API_KEY: string;
			};
			context?: {
				waitUntil(promise: Promise<unknown>): void;
			};
		}
	}
}

export {};
