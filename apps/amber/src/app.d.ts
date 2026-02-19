// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces

declare global {
	namespace App {
		interface Error {
			message: string;
			code?: string;
		}
		interface Locals {
			user: {
				id: string;
				email: string;
				tier: "free" | "seedling" | "sapling" | "oak" | "evergreen";
			} | null;
		}
		interface PageData {
			user?: App.Locals["user"];
		}
		interface Platform {
			env: {
				DB: D1Database;
				R2_BUCKET: R2Bucket;
			};
			context: ExecutionContext;
			caches: CacheStorage;
		}
	}
}

export {};
