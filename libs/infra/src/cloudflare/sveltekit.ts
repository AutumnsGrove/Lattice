/**
 * SvelteKit handle hook for Grove Infra SDK.
 *
 * Automatically creates a GroveContext from platform env bindings
 * and attaches it to event.locals for downstream load/action functions.
 *
 * @example
 * ```typescript
 * // src/hooks.server.ts
 * import { createGroveHandle } from "@autumnsgrove/infra/cloudflare";
 *
 * export const handle = createGroveHandle((env) => ({
 *   db: env.DB as D1Database,
 *   storage: env.BUCKET as R2Bucket,
 *   kv: env.CACHE_KV as KVNamespace,
 *   env: env as Record<string, unknown>,
 * }));
 * ```
 */

import type { CloudflareContextOptions } from "./index.js";
import { createCloudflareContext } from "./index.js";

interface SvelteKitEvent {
	platform?: { env?: Record<string, unknown> };
	locals: Record<string, unknown>;
}

type Handle = (input: {
	event: SvelteKitEvent;
	resolve: (event: SvelteKitEvent) => Promise<Response>;
}) => Promise<Response>;

/**
 * Create a SvelteKit handle hook that wires up GroveContext.
 *
 * @param configure - Function that maps platform env to CloudflareContextOptions
 */
export function createGroveHandle(
	configure: (env: Record<string, unknown>) => CloudflareContextOptions,
): Handle {
	return async ({ event, resolve }) => {
		const env = event.platform?.env;
		if (env) {
			const ctx = createCloudflareContext(configure(env));
			event.locals.ctx = ctx;
			event.locals.rawEnv = env;
		}
		return resolve(event);
	};
}
