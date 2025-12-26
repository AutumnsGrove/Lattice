/// <reference types="@cloudflare/workers-types" />

declare global {
  namespace App {
    interface Locals {
      user: {
        email: string;
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
