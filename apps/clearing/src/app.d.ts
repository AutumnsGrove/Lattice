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
				/** KV namespace for monitor consecutive failure tracking */
				MONITOR_KV: KVNamespace;
				/** Workers Static Assets binding */
				ASSETS: Fetcher;
				CDN_URL?: string;
				/** API key for Sentinel to report status updates */
				SENTINEL_API_KEY?: string;
				/** Zephyr email gateway API key */
				ZEPHYR_API_KEY?: string;
				/** Email address for alert notifications */
				ALERT_EMAIL?: string;
				/** Zephyr email gateway URL */
				ZEPHYR_URL?: string;
			};
			context: {
				waitUntil(promise: Promise<unknown>): void;
			};
			caches: CacheStorage & { default: Cache };
		}
	}
}

export {};
