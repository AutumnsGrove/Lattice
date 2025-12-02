/// <reference types="@cloudflare/workers-types" />

declare global {
	namespace App {
		interface Locals {
			user: {
				email: string;
				is_admin: boolean;
			} | null;
		}

		interface Platform {
			env: {
				DB: D1Database;
				CDN_BUCKET: R2Bucket;
				CDN_URL: string;
				RESEND_API_KEY: string;
				ADMIN_EMAILS: string;
			};
			context: {
				waitUntil(promise: Promise<unknown>): void;
			};
			caches: CacheStorage & { default: Cache };
		}
	}
}

export {};
