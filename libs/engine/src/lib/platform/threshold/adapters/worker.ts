/**
 * Threshold — Bare Worker Adapter
 *
 * Provides helpers for using Threshold in Cloudflare Workers
 * without any framework dependency. Uses raw Response objects.
 */

import type { ThresholdResult } from "../types.js";
import type { Threshold } from "../threshold.js";
import { resolveClientIP } from "../../../server/utils/client-ip.js";

/**
 * Bare Worker helper. Returns a Response if rate limited, or null to continue.
 *
 * @example
 * ```typescript
 * // In a Worker fetch handler
 * import { thresholdCheck, getClientIP } from "@autumnsgrove/lattice/platform/threshold/worker";
 *
 * export default {
 *   async fetch(request, env) {
 *     const ip = getClientIP(request);
 *     const denied = await thresholdCheck(threshold, {
 *       key: `og:${ip}`,
 *       limit: 100,
 *       windowSeconds: 3600,
 *     });
 *     if (denied) return denied;
 *     // ... handle request
 *   }
 * };
 * ```
 */
export async function thresholdCheck(
	threshold: Threshold,
	options: Parameters<Threshold["check"]>[0],
): Promise<Response | null> {
	const result = await threshold.check(options);

	if (!result.allowed) {
		return new Response(
			JSON.stringify({
				error: "rate_limited",
				message: "Too many requests. Please try again later.",
				retryAfter: result.retryAfter,
			}),
			{
				status: 429,
				headers: {
					"Content-Type": "application/json",
					"Retry-After": String(result.retryAfter ?? 60),
					"X-RateLimit-Limit": String(options.limit),
					"X-RateLimit-Remaining": "0",
					"X-RateLimit-Reset": String(result.resetAt),
				},
			},
		);
	}

	return null;
}

/**
 * Get client IP from a request, for use as a rate-limit key part.
 *
 * Delegates to the shared resolver so a Worker→Worker subrequest never keys
 * on Cloudflare's own egress address — the failure mode that turns every
 * per-IP limit into one global bucket (#1679). "unknown" is kept as the
 * no-address value because callers use it as a key part.
 */
export function getClientIP(request: Request): string {
	return resolveClientIP(request).ip ?? "unknown";
}
