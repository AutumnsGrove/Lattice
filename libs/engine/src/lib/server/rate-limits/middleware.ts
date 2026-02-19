/**
 * @deprecated Use $lib/threshold/ modules instead.
 * This file is a compatibility shim — all real logic lives in threshold/.
 *
 * Migration guide:
 *   checkRateLimit     → createThreshold() + thresholdCheck()
 *   rateLimitHeaders   → thresholdHeaders()
 *   buildRateLimitKey  → template string `a:b`
 *   getClientIP        → import from $lib/threshold/adapters/worker.js
 */

import { json } from "@sveltejs/kit";
import { thresholdHeaders } from "../../threshold/adapters/sveltekit.js";
import type { ThresholdResult } from "../../threshold/types.js";

export { getClientIP } from "../../threshold/adapters/worker.js";
export { thresholdHeaders as rateLimitHeaders } from "../../threshold/adapters/sveltekit.js";

/** @deprecated Use template string `a:b` instead */
export function buildRateLimitKey(
  endpoint: string,
  identifier: string,
): string {
  return `${endpoint}:${identifier}`;
}

// Re-export types for backwards compatibility
export type { ThresholdResult as RateLimitResult } from "../../threshold/types.js";

/**
 * @deprecated Use createThreshold() + thresholdCheckWithResult() instead.
 *
 * Adapter that preserves the old checkRateLimit signature while using
 * the same KV storage format as ThresholdKVStore. Errors propagate
 * to the caller (unlike ThresholdKVStore which catches internally),
 * allowing fail-open/fail-closed handling in the catch block.
 */
export async function checkRateLimit(options: {
  kv: KVNamespace;
  key: string;
  limit: number;
  windowSeconds: number;
  namespace?: string;
  failClosed?: boolean;
}): Promise<{ result: ThresholdResult; response?: Response }> {
  const fullKey = `threshold:${options.namespace ? `${options.namespace}:${options.key}` : options.key}`;

  try {
    const now = Math.floor(Date.now() / 1000);
    const data = await options.kv.get<{ count: number; resetAt: number }>(
      fullKey,
      "json",
    );

    let result: ThresholdResult;

    if (!data || data.resetAt <= now) {
      // New window
      const resetAt = now + options.windowSeconds;
      await options.kv.put(fullKey, JSON.stringify({ count: 1, resetAt }), {
        expirationTtl: options.windowSeconds,
      });
      result = { allowed: true, remaining: options.limit - 1, resetAt };
    } else if (data.count >= options.limit) {
      // Over limit
      result = {
        allowed: false,
        remaining: 0,
        resetAt: data.resetAt,
        retryAfter: data.resetAt - now,
      };
    } else {
      // Increment
      await options.kv.put(
        fullKey,
        JSON.stringify({ count: data.count + 1, resetAt: data.resetAt }),
        { expirationTtl: data.resetAt - now },
      );
      result = {
        allowed: true,
        remaining: options.limit - data.count - 1,
        resetAt: data.resetAt,
      };
    }

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
  } catch (err) {
    console.error("[Rate Limit] KV error:", err);

    if (options.failClosed) {
      return {
        result: { allowed: false, remaining: 0, resetAt: 0, retryAfter: 30 },
        response: json(
          {
            error: "service_unavailable",
            message: "Rate limiting service is temporarily unavailable.",
            retryAfter: 30,
          },
          {
            status: 503,
            headers: { "Retry-After": "30" },
          },
        ),
      };
    }

    return {
      result: {
        allowed: true,
        remaining: options.limit,
        resetAt: Math.floor(Date.now() / 1000) + options.windowSeconds,
      },
    };
  }
}
