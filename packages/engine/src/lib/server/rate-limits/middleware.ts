/**
 * Rate Limit Middleware for SvelteKit
 *
 * Provides helper functions for rate limiting in SvelteKit routes.
 * Fails open on KV errors (allows request but logs error).
 *
 * @see docs/patterns/threshold-pattern.md
 */

import { json } from "@sveltejs/kit";
import { rateLimit, type RateLimitResult } from "../services/cache.js";

// ============================================================================
// Types
// ============================================================================

export interface RateLimitMiddlewareOptions {
  kv: KVNamespace;
  key: string;
  limit: number;
  windowSeconds: number;
  namespace?: string;
  /**
   * When true, KV errors return 503 Service Unavailable instead of allowing
   * the request through. Use for security-critical endpoints (login, password
   * reset) where failing open could enable brute-force during KV outages.
   */
  failClosed?: boolean;
}

export interface RateLimitCheckResult {
  result: RateLimitResult;
  response?: Response;
}

// ============================================================================
// Middleware Functions
// ============================================================================

/**
 * Check rate limit and return a 429 response if exceeded.
 *
 * Fails open on KV errors (allows request but logs error).
 *
 * @example
 * ```typescript
 * const { result, response } = await checkRateLimit({
 *   kv: platform.env.CACHE,
 *   key: `endpoint:${userId}`,
 *   limit: 10,
 *   windowSeconds: 60,
 * });
 *
 * if (response) return response; // 429 with headers
 *
 * // Add headers to successful response
 * return json(data, {
 *   headers: rateLimitHeaders(result, 10)
 * });
 * ```
 */
export async function checkRateLimit(
  options: RateLimitMiddlewareOptions,
): Promise<RateLimitCheckResult> {
  let result: RateLimitResult;

  try {
    result = await rateLimit(options.kv, options.key, {
      limit: options.limit,
      windowSeconds: options.windowSeconds,
      namespace: options.namespace,
    });
  } catch (error) {
    if (options.failClosed) {
      // Fail closed: reject request when KV is unavailable
      // Used for auth-critical endpoints to prevent brute-force during outages
      console.error("[rate-limit] KV error, failing closed:", error);
      const response = json(
        {
          error: "service_unavailable",
          message:
            "Unable to process your request right now. Please try again in a moment.",
        },
        {
          status: 503,
          headers: {
            "Retry-After": "30",
          },
        },
      );
      return {
        result: {
          allowed: false,
          remaining: 0,
          resetAt: Math.floor(Date.now() / 1000) + 30,
        },
        response,
      };
    }

    // Fail open: allow request if rate limit check fails
    console.error("[rate-limit] KV error, failing open:", error);
    return {
      result: { allowed: true, remaining: options.limit, resetAt: 0 },
    };
  }

  if (!result.allowed) {
    const retryAfter = Math.max(
      0,
      result.resetAt - Math.floor(Date.now() / 1000),
    );
    const response = json(
      {
        error: "rate_limited",
        message:
          "You're moving faster than we can keep up! Take a moment and try again soon.",
        retryAfter,
        resetAt: new Date(result.resetAt * 1000).toISOString(),
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(options.limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(result.resetAt),
        },
      },
    );
    return { result, response };
  }

  return { result };
}

/**
 * Generate rate limit headers to add to successful responses.
 *
 * @example
 * ```typescript
 * return json(data, {
 *   headers: rateLimitHeaders(result, limit)
 * });
 * ```
 */
export function rateLimitHeaders(
  result: RateLimitResult,
  limit: number,
): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(result.resetAt),
  };
}

/**
 * Build a unique rate limit key from components.
 *
 * @example
 * ```typescript
 * const key = buildRateLimitKey('posts/create', userId);
 * // Returns: 'posts/create:user123'
 * ```
 */
export function buildRateLimitKey(
  endpoint: string,
  identifier: string,
): string {
  return `${endpoint}:${identifier}`;
}

/**
 * Extract client IP from request headers.
 * Works with Cloudflare Workers (CF-Connecting-IP header).
 *
 * @param request - The incoming request
 * @returns Client IP address or 'unknown'
 */
export function getClientIP(request: Request): string {
  // Cloudflare provides the real client IP
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}
