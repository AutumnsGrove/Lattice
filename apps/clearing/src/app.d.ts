/// <reference types="@cloudflare/workers-types" />

declare global {
  namespace App {
    interface Locals {
      /** D1 database session for consistent reads within a request */
      dbSession: D1DatabaseSession;
    }

    interface Platform {
      env: {
        DB: D1Database;
        BACKUPS_DB: D1Database;
        CDN_URL?: string;
        /** API key for Sentinel to report status updates */
        SENTINEL_API_KEY?: string;
      };
      context: {
        waitUntil(promise: Promise<unknown>): void;
      };
      caches: CacheStorage & { default: Cache };
    }
  }
}

export {};
