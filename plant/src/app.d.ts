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

        // Lemon Squeezy payment processing
        LEMON_SQUEEZY_API_KEY: string;
        LEMON_SQUEEZY_STORE_ID: string;
        LEMON_SQUEEZY_WEBHOOK_SECRET: string;

        // Lemon Squeezy variant IDs (per plan × billing cycle)
        LEMON_SQUEEZY_SEEDLING_VARIANT_MONTHLY?: string;
        LEMON_SQUEEZY_SEEDLING_VARIANT_YEARLY?: string;
        LEMON_SQUEEZY_SAPLING_VARIANT_MONTHLY?: string;
        LEMON_SQUEEZY_SAPLING_VARIANT_YEARLY?: string;
        LEMON_SQUEEZY_OAK_VARIANT_MONTHLY?: string;
        LEMON_SQUEEZY_OAK_VARIANT_YEARLY?: string;
        LEMON_SQUEEZY_EVERGREEN_VARIANT_MONTHLY?: string;
        LEMON_SQUEEZY_EVERGREEN_VARIANT_YEARLY?: string;

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
