/**
 * Pulse Worker — KV-based rate limiting
 *
 * Per-tenant sliding window using KV counters with TTL.
 * Checked early in the request path to avoid expensive work
 * (secret decryption, D1 writes) when a tenant is over limit.
 */

import type { Env } from "./types";

/** Max webhook events per tenant per window */
const MAX_EVENTS_PER_WINDOW = 200;

/** Window duration in seconds (5 minutes) */
const WINDOW_SECONDS = 300;

export interface RateLimitResult {
  allowed: boolean;
  current: number;
  limit: number;
  retryAfter?: number;
}

/**
 * Check and increment the rate limit counter for a tenant.
 * Uses a KV key with TTL so counters self-clean.
 *
 * Fail-open: if KV is unavailable, allow the request.
 */
export async function checkRateLimit(
  env: Env,
  tenantId: string,
): Promise<RateLimitResult> {
  const bucket = Math.floor(Date.now() / (WINDOW_SECONDS * 1000));
  const key = `pulse:rl:${tenantId}:${bucket}`;

  try {
    const current = parseInt((await env.KV.get(key)) ?? "0", 10);

    if (current >= MAX_EVENTS_PER_WINDOW) {
      return {
        allowed: false,
        current,
        limit: MAX_EVENTS_PER_WINDOW,
        retryAfter: WINDOW_SECONDS,
      };
    }

    // Increment — not atomic, but close enough for rate limiting.
    // Worst case: a few extra events slip through under high concurrency.
    await env.KV.put(key, String(current + 1), {
      expirationTtl: WINDOW_SECONDS,
    });

    return {
      allowed: true,
      current: current + 1,
      limit: MAX_EVENTS_PER_WINDOW,
    };
  } catch {
    // Fail-open: KV errors shouldn't block legitimate webhooks
    return { allowed: true, current: 0, limit: MAX_EVENTS_PER_WINDOW };
  }
}
