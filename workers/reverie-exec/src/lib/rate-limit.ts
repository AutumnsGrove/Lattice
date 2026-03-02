/**
 * Rate Limiting for Reverie Exec Worker
 *
 * Uses the Threshold SDK with KV storage to rate limit per tenant.
 * Rate limits are keyed by tenant ID (not IP) since all requests are authenticated.
 * Fails open — a KV outage should not block execution.
 */

import { Threshold, ThresholdKVStore } from "@autumnsgrove/lattice/threshold";
import type { Env, ExecVariables } from "../types";

/** Rate limit: 20 requests per 60 seconds per tenant */
const RATE_LIMIT = 20;
const WINDOW_SECONDS = 60;

/**
 * Create Threshold rate-limit middleware for the /execute endpoint.
 *
 * Keyed by tenant ID (set by auth middleware) rather than IP,
 * since reverie-exec is tenant-scoped. Fails open — KV outage
 * should not block change execution.
 *
 * Uses Threshold.check() directly instead of thresholdMiddleware
 * because the Hono structural types don't include .get() for
 * reading variables set by prior middleware.
 */
export function execRateLimit() {
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

		const tenantId = c.get("tenantId") ?? "unknown";

		const threshold = new Threshold({
			store: new ThresholdKVStore(c.env.RATE_LIMITS, "reverie-exec"),
		});

		try {
			const result = await threshold.check({
				key: `reverie-exec/execute:${tenantId}`,
				limit: RATE_LIMIT,
				windowSeconds: WINDOW_SECONDS,
				failMode: "open",
			});

			c.header("X-RateLimit-Limit", String(RATE_LIMIT));
			c.header("X-RateLimit-Remaining", String(result.remaining));
			c.header("X-RateLimit-Reset", String(result.resetAt));

			if (!result.allowed) {
				const retryAfter = result.retryAfter ?? WINDOW_SECONDS;
				c.header("Retry-After", String(retryAfter));
				return c.json(
					{
						success: false,
						error: {
							code: "EXC-008",
							message: "Too many requests — please wait before trying again",
						},
					},
					429,
				);
			}
		} catch {
			// Fail open — KV outage should not block execution
		}

		return next();
	};
}
