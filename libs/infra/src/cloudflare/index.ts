/**
 * Grove Infra SDK — Cloudflare Adapters
 *
 * Platform-specific adapter wiring for Cloudflare Workers.
 * Import this in your Worker entry point to create a GroveContext
 * backed by D1, R2, KV, and service bindings.
 *
 * @example
 * ```typescript
 * import { createCloudflareContext } from "@autumnsgrove/infra/cloudflare";
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
 * @module @autumnsgrove/infra/cloudflare
 */

import { logGroveError } from "@autumnsgrove/lattice/errors";
import { SRV_ERRORS } from "../errors.js";
import type { GroveContext } from "../context.js";
import type { GroveObserver } from "../types.js";
import { CloudflareDatabase } from "./database.js";
import { CloudflareStorage } from "./storage.js";
import { CloudflareKV } from "./kv.js";
import { CloudflareServiceBus } from "./service-bus.js";
import { CloudflareScheduler } from "./scheduler.js";
import { CloudflareConfig } from "./config.js";
import {
	createUnavailableDatabase,
	createUnavailableStorage,
	createUnavailableKV,
} from "./unavailable.js";

/** Options for creating a Cloudflare-backed GroveContext. */
export interface CloudflareContextOptions {
	/** D1 database binding (optional — throws SRV-001 on access if omitted) */
	db?: D1Database;
	/** R2 bucket binding (optional — throws SRV-002 on access if omitted) */
	storage?: R2Bucket;
	/** KV namespace binding (optional — throws SRV-003 on access if omitted) */
	kv?: KVNamespace;
	/** Service bindings for inter-service calls */
	services?: Record<string, Fetcher>;
	/** The full env object for config/secrets access */
	env: Record<string, unknown>;
	/** Optional name for the D1 database (for diagnostics) */
	dbName?: string;
	/** Optional name for the R2 bucket (for diagnostics) */
	bucketName?: string;
	/** Optional name for the KV namespace (for diagnostics) */
	kvNamespace?: string;
	/** Optional observer for operation events (timing, errors, diagnostics) */
	observer?: GroveObserver;
}

/**
 * Create a GroveContext backed by Cloudflare Workers infrastructure.
 *
 * This is the single wiring point for all Cloudflare adapters.
 * Call this once in your Worker entry point, then pass the context
 * to all request handlers.
 *
 * Bindings are optional — omitted bindings are replaced with "unavailable"
 * proxies that throw descriptive SRV-00X errors on first access. This
 * enables partial-context creation for workers that don't need every service.
 */
export function createCloudflareContext(options: CloudflareContextOptions): GroveContext {
	try {
		const obs = options.observer;
		return {
			db: options.db
				? new CloudflareDatabase(options.db, options.dbName, obs)
				: createUnavailableDatabase(),
			storage: options.storage
				? new CloudflareStorage(options.storage, options.bucketName, obs)
				: createUnavailableStorage(),
			kv: options.kv
				? new CloudflareKV(options.kv, options.kvNamespace, obs)
				: createUnavailableKV(),
			services: new CloudflareServiceBus(options.services ?? {}, obs),
			scheduler: new CloudflareScheduler(obs),
			config: new CloudflareConfig(options.env),
			observer: obs,
		};
	} catch (error) {
		logGroveError("InfraSDK", SRV_ERRORS.CONTEXT_INIT_FAILED, {
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
export {
	createUnavailableDatabase,
	createUnavailableStorage,
	createUnavailableKV,
} from "./unavailable.js";

// Framework middleware
export { groveInfraMiddleware } from "./hono.js";
export { createGroveHandle } from "./sveltekit.js";
