/**
 * Rate Limiting Middleware for Lumen Worker
 *
 * Uses the Threshold SDK with KV storage to rate limit per caller IP.
 * Limits are defined centrally in the Threshold config (lumen/* endpoint keys).
 */

import { Threshold, ThresholdKVStore } from "@autumnsgrove/lattice/threshold";
import { thresholdMiddleware } from "@autumnsgrove/lattice/threshold/hono";
import { ENDPOINT_RATE_LIMITS } from "@autumnsgrove/lattice/threshold";
import type { Env } from "../types";

/**
 * Create Threshold rate-limit middleware for a Lumen endpoint.
 *
 * Each route gets its own middleware keyed by endpoint name.
 * Limits come from the central Threshold config (lumen/inference, etc.).
 * Fails open — a KV outage should not block AI inference.
 */
export function lumenRateLimit(
	endpointKey: "lumen/inference" | "lumen/embed" | "lumen/moderate" | "lumen/transcribe",
) {
	const config = ENDPOINT_RATE_LIMITS[endpointKey];

	return async (
		c: {
			env: Env;
			req: { header: (name: string) => string | undefined };
			header: (name: string, value: string) => void;
			json: (data: unknown, status?: number) => Response;
		},
		next: () => Promise<void>,
	) => {
		// Skip if KV not bound (pre-deployment)
		if (!c.env.RATE_LIMITS) return next();

		const threshold = new Threshold({
			store: new ThresholdKVStore(c.env.RATE_LIMITS, "lumen"),
		});

		const middleware = thresholdMiddleware({
			threshold,
			limit: config.limit,
			windowSeconds: config.windowSeconds,
			keyPrefix: endpointKey,
			getKey: (ctx) =>
				ctx.req.header("cf-connecting-ip") ?? ctx.req.header("x-forwarded-for") ?? "unknown",
			failMode: "open",
		});

		return middleware(c, next);
	};
}
