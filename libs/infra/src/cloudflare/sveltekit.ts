/**
 * SvelteKit handle hook for Grove Infra SDK.
 *
 * Automatically creates a GroveContext from platform env bindings
 * and attaches it to `event.locals.ctx` for downstream load/action functions.
 *
 * Raw env bindings are NOT attached to locals — access them via
 * `event.platform.env` directly to avoid accidental serialization
 * of secrets to the browser.
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
 * When `event.platform?.env` is absent (e.g. local dev without the
 * Cloudflare adapter), `event.locals.ctx` will NOT be set and a
 * warning is logged (throttled to once per 60 s to avoid flooding).
 * Routes that access `ctx` should guard against this or use
 * `wrangler pages dev` for local testing.
 *
 * @param configure - Function that maps platform env to CloudflareContextOptions
 */
export function createGroveHandle(
	configure: (env: Record<string, unknown>) => CloudflareContextOptions,
): Handle {
	/** Timestamp (ms) of the last missing-env warning. 0 = never warned. */
	let lastWarnedAt = 0;

	return async ({ event, resolve }) => {
		const env = event.platform?.env;
		if (env) {
			const ctx = createCloudflareContext(configure(env));
			event.locals.ctx = ctx;
		} else {
			const now = Date.now();
			if (now - lastWarnedAt > 60_000) {
				console.warn(
					"[InfraSDK] platform.env not available — GroveContext not created. " +
						"Use `wrangler pages dev` for local Cloudflare bindings.",
				);
				lastWarnedAt = now;
			}
		}
		return resolve(event);
	};
}
