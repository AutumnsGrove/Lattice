/// <reference types="@cloudflare/workers-types" />

declare global {
  namespace App {
    interface Locals {
      user: {
        id: string;
        email: string;
        name: string | null;
        is_admin: boolean;
      } | null;
      /** D1 database session for consistent reads within a request */
      dbSession: D1DatabaseSession;
    }

    interface Platform {
      env: {
        DB: D1Database;
        CDN_BUCKET: R2Bucket;
        CDN_URL: string;
        RESEND_API_KEY: string;
        ADMIN_EMAILS: string;
        /** GroveAuth Service Binding (Heartwood - fast session validation) */
        AUTH: Fetcher;
        /** Optional KV namespace for caching and rate limiting */
        CACHE_KV?: KVNamespace;
        /** Alias for CACHE_KV (rate limiting) */
        CACHE?: KVNamespace;
        /** Turnstile (Shade) - human verification */
        TURNSTILE_SITE_KEY: string;
        TURNSTILE_SECRET_KEY: string;
        GROVEAUTH_URL?: string;
        GROVEAUTH_CLIENT_ID?: string;
        GROVEAUTH_CLIENT_SECRET?: string;
      };
      context: {
        waitUntil(promise: Promise<unknown>): void;
      };
      caches: CacheStorage & { default: Cache };
    }
  }
}

export {};
