/**
 * Threshold — Bare Worker Adapter
 *
 * Provides helpers for using Threshold in Cloudflare Workers
 * without any framework dependency. Uses raw Response objects.
 */

import type { ThresholdResult } from "../types.js";
import type { Threshold } from "../threshold.js";

/**
 * Bare Worker helper. Returns a Response if rate limited, or null to continue.
 *
 * @example
 * ```typescript
 * // In a Worker fetch handler
 * import { thresholdCheck, getClientIP } from "@autumnsgrove/groveengine/threshold/worker";
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
 * Get client IP from Cloudflare request headers.
 * CF-Connecting-IP is set by Cloudflare's edge and cannot be spoofed.
 * Falls back to X-Forwarded-For and X-Real-IP for local development.
 */
export function getClientIP(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}
