/**
 * Rate Limiting Middleware for Reverie Worker
 *
 * Uses the Threshold SDK with Durable Object storage for per-tenant rate limiting.
 * DO-backed: zero contention, single-writer consistency, no KV namespace needed.
 * Fails open — a DO outage should not block configuration.
 */

import { Threshold, ThresholdDOStore } from "@autumnsgrove/lattice/threshold";
import { thresholdMiddleware } from "@autumnsgrove/lattice/threshold/hono";
import { ENDPOINT_RATE_LIMITS } from "@autumnsgrove/lattice/threshold";
import type { Env, ReverieVariables } from "../types";

type ReverieEndpointKey = "reverie/configure" | "reverie/execute" | "reverie/query";

/**
 * Create Threshold rate-limit middleware for a Reverie endpoint.
 *
 * Keyed by tenant ID (set by auth middleware) rather than IP,
 * since Reverie is tenant-scoped. Each tenant gets its own DO
 * instance for zero-contention rate limiting.
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
		// Skip if THRESHOLD DO not bound (pre-deployment)
		if (!c.env.THRESHOLD) return next();

		const tenantId = c.get("tenantId") ?? "unknown";

		const threshold = new Threshold({
			store: new ThresholdDOStore(c.env.THRESHOLD, tenantId),
		});

		const middleware = thresholdMiddleware({
			threshold,
			limit: config.limit,
			windowSeconds: config.windowSeconds,
			keyPrefix: endpointKey,
			getKey: () => tenantId,
			failMode: "open",
		});

		return middleware(c, next);
	};
}
