/**
 * Rate Limiting Middleware for Reverie Worker
 *
 * Uses the Threshold SDK with KV storage to rate limit per tenant.
 * Rate limits are keyed by tenant ID (not IP) since all requests are authenticated.
 * Fails open — a KV outage should not block configuration.
 */

import { Threshold, ThresholdKVStore } from "@autumnsgrove/lattice/threshold";
import { thresholdMiddleware } from "@autumnsgrove/lattice/threshold/hono";
import { ENDPOINT_RATE_LIMITS } from "@autumnsgrove/lattice/threshold";
import type { Env, ReverieVariables } from "../types";

type ReverieEndpointKey = "reverie/configure" | "reverie/execute" | "reverie/query";

/**
 * Create Threshold rate-limit middleware for a Reverie endpoint.
 *
 * Keyed by tenant ID (set by auth middleware) rather than IP,
 * since Reverie is tenant-scoped. Fails open — KV outage
 * should not block configuration requests.
 */
export function reverieRateLimit(endpointKey: ReverieEndpointKey) {
	const config = ENDPOINT_RATE_LIMITS[endpointKey];

	return async (
		c: {
			env: Env;
			get: (key: "tenantId") => string;
			req: { url: string; header: (name: string) => string | undefined };
			header: (name: string, value: string) => void;
			json: (data: unknown, status?: number) => Response;
		},
		next: () => Promise<void>,
	) => {
		// Skip if KV not bound (pre-deployment)
		if (!c.env.RATE_LIMITS) return next();

		const threshold = new Threshold({
			store: new ThresholdKVStore(c.env.RATE_LIMITS, "reverie"),
		});

		const middleware = thresholdMiddleware({
			threshold,
			limit: config.limit,
			windowSeconds: config.windowSeconds,
			keyPrefix: endpointKey,
			// Key by tenant ID since all requests are authenticated
			getKey: (ctx) => ctx.get("tenantId") ?? "unknown",
			failMode: "open",
		});

		return middleware(c, next);
	};
}
