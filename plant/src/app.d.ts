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
        step: "auth" | "profile" | "plans" | "checkout" | "success" | "tour";
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
        /** Cloudflare KV namespace for rate limiting */
        KV: KVNamespace;
        /** GroveAuth Service Binding (Heartwood - fast session validation) */
        AUTH: Fetcher;
        GROVEAUTH_URL: string;
        GROVEAUTH_CLIENT_ID: string;
        GROVEAUTH_CLIENT_SECRET: string;
        STRIPE_SECRET_KEY: string;
        STRIPE_PUBLISHABLE_KEY: string;
        STRIPE_WEBHOOK_SECRET: string;
        /** Number of trial days for new subscriptions (default: 14) */
        STRIPE_TRIAL_DAYS?: string;
        RESEND_API_KEY: string;
        /** Optional: Base URL for redirects (e.g., https://plant.grove.place) */
        PUBLIC_APP_URL?: string;
      };
      context?: {
        waitUntil(promise: Promise<unknown>): void;
      };
    }
  }
}

export {};
