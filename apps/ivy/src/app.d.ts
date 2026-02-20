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
			} | null;
			session: {
				valid: boolean;
			} | null;
			isOwner: boolean;
		}
		// interface PageData {}
		// interface PageState {}
		interface Platform {
			env: {
				DB: D1Database;
				R2: R2Bucket;
				KV: KVNamespace;
				AI: Ai;
				AUTH: Fetcher;
				TRIAGE: DurableObjectNamespace;
				ZEPHYR: {
					fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
				};
				WEBHOOK_SECRET: string;
				OPENROUTER_API_KEY: string;
				ZEPHYR_API_KEY: string;
				OWNER_EMAIL?: string;
			};
			context?: ExecutionContext;
		}
	}
}

export {};
