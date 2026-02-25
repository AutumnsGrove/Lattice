/**
 * Hono middleware for Grove Infra SDK.
 *
 * Automatically creates a GroveContext from Cloudflare env bindings
 * and attaches it to the Hono context as `ctx` for downstream handlers.
 *
 * Raw env bindings are NOT attached — access them via `c.env` directly.
 * This avoids accidentally exposing secrets through response helpers.
 *
 * @example
 * ```typescript
 * import { Hono } from "hono";
 * import { groveInfraMiddleware } from "@autumnsgrove/infra/cloudflare";
 *
 * const app = new Hono();
 * app.use("*", groveInfraMiddleware((env) => ({
 *   db: env.DB as D1Database,
 *   storage: env.BUCKET as R2Bucket,
 *   env: env as Record<string, unknown>,
 * })));
 * ```
 */

import type { CloudflareContextOptions } from "./index.js";
import { createCloudflareContext } from "./index.js";

type MiddlewareHandler = (
	c: { env: Record<string, unknown>; set: (key: string, value: unknown) => void },
	next: () => Promise<void>,
) => Promise<void>;

/**
 * Hono middleware that creates a GroveContext from env bindings.
 *
 * Only `ctx` is set on the Hono context. For raw env bindings,
 * use `c.env` directly in your handlers.
 *
 * @param configure - Function that maps Hono's env to CloudflareContextOptions
 */
export function groveInfraMiddleware(
	configure: (env: Record<string, unknown>) => CloudflareContextOptions,
): MiddlewareHandler {
	return async (c, next) => {
		const ctx = createCloudflareContext(configure(c.env));
		c.set("ctx", ctx);
		await next();
	};
}
