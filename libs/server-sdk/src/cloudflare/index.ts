/**
 * Grove Server SDK — Cloudflare Adapters
 *
 * Platform-specific adapter wiring for Cloudflare Workers.
 * Import this in your Worker entry point to create a GroveContext
 * backed by D1, R2, KV, and service bindings.
 *
 * @example
 * ```typescript
 * import { createCloudflareContext } from "@autumnsgrove/server-sdk/cloudflare";
 *
 * export default {
 *   async fetch(request: Request, env: Env): Promise<Response> {
 *     const ctx = createCloudflareContext({
 *       db: env.DB,
 *       storage: env.STORAGE,
 *       kv: env.CACHE_KV,
 *       services: { auth: env.AUTH, amber: env.AMBER },
 *       env,
 *     });
 *     return handleRequest(request, ctx);
 *   }
 * };
 * ```
 *
 * @module @autumnsgrove/server-sdk/cloudflare
 */

import { logGroveError } from "@autumnsgrove/lattice/errors";
import { SRV_ERRORS } from "../errors.js";
import type { GroveContext } from "../context.js";
import { CloudflareDatabase } from "./database.js";
import { CloudflareStorage } from "./storage.js";
import { CloudflareKV } from "./kv.js";
import { CloudflareServiceBus } from "./service-bus.js";
import { CloudflareScheduler } from "./scheduler.js";
import { CloudflareConfig } from "./config.js";

/** Options for creating a Cloudflare-backed GroveContext. */
export interface CloudflareContextOptions {
	/** D1 database binding */
	db: D1Database;
	/** R2 bucket binding */
	storage: R2Bucket;
	/** KV namespace binding */
	kv: KVNamespace;
	/** Service bindings for inter-service calls */
	services?: Record<string, Fetcher>;
	/** The full env object for config/secrets access */
	env: Record<string, unknown>;
	/** Optional name for the KV namespace (for diagnostics) */
	kvNamespace?: string;
}

/**
 * Create a GroveContext backed by Cloudflare Workers infrastructure.
 *
 * This is the single wiring point for all Cloudflare adapters.
 * Call this once in your Worker entry point, then pass the context
 * to all request handlers.
 */
export function createCloudflareContext(options: CloudflareContextOptions): GroveContext {
	// Validate required bindings
	if (!options.db) {
		logGroveError("ServerSDK", SRV_ERRORS.DB_NOT_AVAILABLE, {
			detail: "createCloudflareContext: db binding is missing",
		});
		throw new Error(SRV_ERRORS.DB_NOT_AVAILABLE.adminMessage);
	}
	if (!options.storage) {
		logGroveError("ServerSDK", SRV_ERRORS.STORAGE_NOT_AVAILABLE, {
			detail: "createCloudflareContext: storage binding is missing",
		});
		throw new Error(SRV_ERRORS.STORAGE_NOT_AVAILABLE.adminMessage);
	}
	if (!options.kv) {
		logGroveError("ServerSDK", SRV_ERRORS.KV_NOT_AVAILABLE, {
			detail: "createCloudflareContext: kv binding is missing",
		});
		throw new Error(SRV_ERRORS.KV_NOT_AVAILABLE.adminMessage);
	}

	try {
		return {
			db: new CloudflareDatabase(options.db),
			storage: new CloudflareStorage(options.storage),
			kv: new CloudflareKV(options.kv, options.kvNamespace),
			services: new CloudflareServiceBus(options.services ?? {}),
			scheduler: new CloudflareScheduler(),
			config: new CloudflareConfig(options.env),
		};
	} catch (error) {
		logGroveError("ServerSDK", SRV_ERRORS.CONTEXT_INIT_FAILED, {
			cause: error,
		});
		throw error;
	}
}

// Re-export adapter classes for direct use
export { CloudflareDatabase } from "./database.js";
export { CloudflareStorage } from "./storage.js";
export { CloudflareKV } from "./kv.js";
export { CloudflareServiceBus } from "./service-bus.js";
export { CloudflareScheduler } from "./scheduler.js";
export { CloudflareConfig } from "./config.js";
