/// <reference types="@cloudflare/workers-types" />

// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces

declare global {
  namespace App {
    // interface Error {}

    interface Locals {
      /** Authenticated user from session */
      user: {
        email: string;
        id?: string;
        is_admin?: boolean;
      } | null;

      /** Routing context based on subdomain */
      context: AppContext;

      /** Tenant ID if context.type === 'tenant' */
      tenantId?: string;

      /** CSRF token for form protection */
      csrfToken?: string;
    }

    // interface PageData {}
    // interface PageState {}

    interface Platform {
      env: {
        /** Main D1 database (grove-engine-db) for tenants, users, content */
        DB: D1Database;

        /** KV Namespace for caching */
        CACHE_KV: KVNamespace;

        /** R2 Bucket for images and media */
        IMAGES: R2Bucket;

        // Secrets
        GITHUB_TOKEN?: string;
        ANTHROPIC_API_KEY?: string;
        SESSION_SECRET: string;
        RESEND_API_KEY: string;
        ALLOWED_ADMIN_EMAILS: string;

        // Stripe (optional, for shop features)
        STRIPE_SECRET_KEY?: string;
        STRIPE_PUBLISHABLE_KEY?: string;
        STRIPE_WEBHOOK_SECRET?: string;
      };
      context: {
        waitUntil(promise: Promise<unknown>): void;
      };
      caches: CacheStorage & { default: Cache };
    }
  }
}

/**
 * Application context determined by subdomain routing.
 * Set in hooks.server.ts based on hostname.
 */
type AppContext =
  | { type: "landing" }
  | { type: "app"; app: string; routePrefix: string }
  | { type: "tenant"; tenant: TenantInfo }
  | { type: "not_found"; subdomain: string };

/**
 * Tenant information from the database.
 * Available when context.type === 'tenant'.
 */
interface TenantInfo {
  /** Tenant UUID */
  id: string;
  /** Subdomain (e.g., "autumn", "mom") */
  subdomain: string;
  /** Display name for the blog */
  name: string;
  /** Theme identifier or null for default */
  theme: string | null;
  /** Owner's email address */
  ownerId: string;
}

export { AppContext, TenantInfo };
