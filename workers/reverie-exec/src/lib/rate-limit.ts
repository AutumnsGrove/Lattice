/**
 * Rate Limiting for Reverie Exec Worker
 *
 * Uses the Threshold SDK with Durable Object storage for per-tenant rate limiting.
 * DO-backed: zero contention, single-writer consistency, no KV namespace needed.
 * Fails open — a DO outage should not block execution.
 */

import { Threshold, ThresholdDOStore } from "@autumnsgrove/lattice/threshold";
import type { Env } from "../types";

/** Rate limit: 20 requests per 60 seconds per tenant */
const RATE_LIMIT = 20;
const WINDOW_SECONDS = 60;

/**
 * Create Threshold rate-limit middleware for the /execute endpoint.
 *
 * Keyed by tenant ID (set by auth middleware). Each tenant gets its
 * own DO instance for zero-contention rate limiting. Fails open —
 * DO outage should not block change execution.
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
		// Skip if THRESHOLD DO not bound (pre-deployment)
		if (!c.env.THRESHOLD) return next();

		const tenantId = c.get("tenantId") ?? "unknown";

		const threshold = new Threshold({
			store: new ThresholdDOStore(c.env.THRESHOLD, tenantId),
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
			// Fail open — DO outage should not block execution
		}

		return next();
	};
}
