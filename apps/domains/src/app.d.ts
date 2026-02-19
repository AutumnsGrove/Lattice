/// <reference types="@cloudflare/workers-types" />

declare global {
  namespace App {
    interface Locals {
      user: {
        id: string;
        email: string;
        is_admin: boolean;
      } | null;
      /** D1 database session for consistent reads within a request */
      dbSession: D1DatabaseSession;
    }

    interface Platform {
      env: {
        DB: D1Database;
        /** GroveAuth Service Binding (Heartwood - fast session validation) */
        AUTH: Fetcher;
        SITE_NAME: string;
        SITE_URL: string;
        RESEND_API_KEY: string;
        ADMIN_EMAILS: string;
        ANTHROPIC_API_KEY?: string;
        DOMAIN_WORKER_URL?: string;
        GROVEAUTH_URL?: string;
        GROVEAUTH_CLIENT_ID?: string;
        GROVEAUTH_CLIENT_SECRET?: string;
        GROVEAUTH_REDIRECT_URI?: string;
      };
      context: {
        waitUntil(promise: Promise<unknown>): void;
      };
      caches: CacheStorage & { default: Cache };
    }
  }
}

export {};
