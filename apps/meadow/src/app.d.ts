// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user: {
				id: string;
				email: string;
				name: string | null;
				tenantId: string | null;
				subdomain: string | null;
			} | null;
			/** Set when auth validation fails — distinguishes "logged out" from "auth broken" */
			authError?: string;
		}
		// interface PageData {}
		// interface PageState {}
		interface Platform {
			env: {
				DB: D1Database;
				CACHE_KV: KVNamespace;
				AUTH: Fetcher;
				/** ThresholdDO - Per-identifier rate limiting (Loom pattern) */
				THRESHOLD?: DurableObjectNamespace;
			};
		}
	}
}

export {};
