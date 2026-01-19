/// <reference types="@cloudflare/workers-types" />

// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces

declare global {
  namespace App {
    // interface Error {}

    interface Locals {
      /** Authenticated user from Heartwood OAuth */
      user: {
        /** User ID from Heartwood (sub claim) */
        id: string;
        /** User's email address */
        email: string;
        /** User's display name */
        name?: string;
        /** Profile picture URL */
        picture?: string;
        /** Auth provider (google, magic_code) */
        provider?: string;
        /** Whether user has admin privileges */
        isAdmin?: boolean;
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

        /** GroveAuth Service Binding (Heartwood - fast session validation) */
        AUTH: Fetcher;

        /** TenantDO - Per-tenant Durable Object for config, drafts, analytics */
        TENANTS: DurableObjectNamespace;

        /** PostMetaDO - Per-post reactions, views, real-time presence */
        POST_META: DurableObjectNamespace;

        /** PostContentDO - Per-post content caching */
        POST_CONTENT: DurableObjectNamespace;

        // Secrets
        GITHUB_TOKEN?: string;
        ANTHROPIC_API_KEY?: string;
        SESSION_SECRET?: string; // Deprecated: was used for magic code auth
        RESEND_API_KEY?: string; // Optional: for transactional emails
        ALLOWED_ADMIN_EMAILS?: string;
        TOKEN_ENCRYPTION_KEY?: string; // 256-bit key for encrypting API tokens in D1

        // Wisp AI providers (optional inference APIs)
        FIREWORKS_API_KEY?: string;
        CEREBRAS_API_KEY?: string;
        GROQ_API_KEY?: string;

        // GroveAuth (Heartwood OAuth)
        GROVEAUTH_URL?: string;
        GROVEAUTH_API_URL?: string;
        GROVEAUTH_CLIENT_ID?: string;
        GROVEAUTH_CLIENT_SECRET?: string;

        // Stripe (optional, for shop features)
        STRIPE_SECRET_KEY?: string;
        STRIPE_PUBLISHABLE_KEY?: string;
        STRIPE_WEBHOOK_SECRET?: string;

        // Cloudflare Turnstile (bot protection)
        TURNSTILE_SECRET_KEY?: string;
        TURNSTILE_SITE_KEY?: string;
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
  /** Subscription tier (free, seedling, sapling, oak, evergreen) */
  plan: string;
}

export { AppContext, TenantInfo };
