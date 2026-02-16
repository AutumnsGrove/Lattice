/**
 * Threshold — SvelteKit Adapter
 *
 * Provides helpers for using Threshold in SvelteKit routes and hooks.
 * Returns SvelteKit-compatible Response objects.
 */

import { json } from "@sveltejs/kit";
import type { ThresholdResult } from "../types.js";
import type { Threshold } from "../threshold.js";

/**
 * SvelteKit middleware helper. Returns a Response if rate limited, or null to continue.
 *
 * @example
 * ```typescript
 * // In +server.ts
 * import { thresholdCheck } from "@autumnsgrove/groveengine/threshold/sveltekit";
 *
 * export const POST: RequestHandler = async ({ platform, locals }) => {
 *   const denied = await thresholdCheck(threshold, {
 *     key: `posts:${locals.user.id}`,
 *     limit: 10,
 *     windowSeconds: 3600,
 *   });
 *   if (denied) return denied;
 *   // ... handle request
 * };
 * ```
 */
export async function thresholdCheck(
  threshold: Threshold,
  options: Parameters<Threshold["check"]>[0],
): Promise<Response | null> {
  const result = await threshold.check(options);

  if (!result.allowed) {
    return json(
      {
        error: "rate_limited",
        message:
          "You're moving faster than we can keep up! Take a moment and try again soon.",
        retryAfter: result.retryAfter,
        resetAt: new Date(result.resetAt * 1000).toISOString(),
      },
      {
        status: 429,
        headers: thresholdHeaders(result, options.limit),
      },
    );
  }

  return null;
}

/**
 * SvelteKit middleware helper that returns both the result and an optional Response.
 * Use this when you need access to the ThresholdResult for success response headers.
 *
 * @example
 * ```typescript
 * const { result, response } = await thresholdCheckWithResult(threshold, {
 *   key: `billing:${tenantId}`,
 *   limit: 20,
 *   windowSeconds: 3600,
 * });
 * if (response) return response;
 * // ... later, attach headers to success response:
 * return json(data, { headers: thresholdHeaders(result, 20) });
 * ```
 */
export async function thresholdCheckWithResult(
  threshold: Threshold,
  options: Parameters<Threshold["check"]>[0],
): Promise<{ result: ThresholdResult; response?: Response }> {
  const result = await threshold.check(options);

  if (!result.allowed) {
    const response = json(
      {
        error: "rate_limited",
        message:
          "You're moving faster than we can keep up! Take a moment and try again soon.",
        retryAfter: result.retryAfter,
        resetAt: new Date(result.resetAt * 1000).toISOString(),
      },
      {
        status: 429,
        headers: thresholdHeaders(result, options.limit),
      },
    );
    return { result, response };
  }

  return { result };
}

/**
 * Generate rate limit headers for any response.
 */
export function thresholdHeaders(
  result: ThresholdResult,
  limit: number,
): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(result.resetAt),
  };

  if (!result.allowed && result.retryAfter) {
    headers["Retry-After"] = String(result.retryAfter);
  }

  return headers;
}
