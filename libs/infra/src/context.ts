/**
 * Grove Infra SDK — Context Object
 *
 * Every Grove request handler receives a GroveContext that bundles
 * all infrastructure services together. This is the single entry point
 * for all SDK access.
 *
 * @example
 * ```typescript
 * async function handleRequest(request: Request, ctx: GroveContext): Promise<Response> {
 *   const posts = await ctx.db.execute("SELECT * FROM posts WHERE tenant_id = ?", [tenantId]);
 *   const avatar = await ctx.storage.get(`${tenantId}/avatar.webp`);
 *   const cached = await ctx.kv.get(`cache:${tenantId}:settings`);
 * }
 * ```
 */

import type {
	GroveDatabase,
	GroveStorage,
	GroveKV,
	GroveServiceBus,
	GroveScheduler,
	GroveConfig,
	GroveObserver,
} from "./types.js";

/**
 * The unified context object passed to every Grove request handler.
 * Bundles all infrastructure services behind stable interfaces.
 */
export interface GroveContext {
	/** SQL database operations */
	db: GroveDatabase;
	/** Object/blob storage operations */
	storage: GroveStorage;
	/** Key-value store operations */
	kv: GroveKV;
	/** Inter-service communication */
	services: GroveServiceBus;
	/** Scheduled task management */
	scheduler: GroveScheduler;
	/** Configuration and secrets access */
	config: GroveConfig;
	/** Optional observer for operation events. Set during context creation. */
	observer?: GroveObserver;
}
