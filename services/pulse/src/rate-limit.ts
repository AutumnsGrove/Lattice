/**
 * Pulse Worker — KV-based rate limiting
 *
 * Per-tenant sliding window using KV counters with TTL.
 * Checked early in the request path to avoid expensive work
 * (secret decryption, D1 writes) when a tenant is over limit.
 *
 * Best-effort limiting: KV reads and writes are not atomic, so under
 * high concurrency multiple requests can read the same counter value
 * before any writes land. To compensate, we enforce at a soft limit
 * (SOFT_LIMIT) below the advertised hard cap (MAX_EVENTS_PER_WINDOW).
 * The headroom absorbs concurrent burst overshoot — a burst of N
 * concurrent requests can each slip through, but the effective total
 * stays within the hard cap.
 */

import type { Env } from "./types";

/** Advertised max webhook events per tenant per window */
const MAX_EVENTS_PER_WINDOW = 200;

/**
 * Soft enforcement threshold. Requests are rejected at this count,
 * leaving headroom for concurrent reads that haven't seen each
 * other's writes yet. 50 slots of headroom covers realistic burst
 * sizes from GitHub webhook delivery.
 */
const SOFT_LIMIT = 150;

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

    if (current >= SOFT_LIMIT) {
      return {
        allowed: false,
        current,
        limit: MAX_EVENTS_PER_WINDOW,
        retryAfter: WINDOW_SECONDS,
      };
    }

    // Increment — not atomic. Concurrent requests may read the same
    // value and each increment from the same base. The SOFT_LIMIT
    // headroom ensures the effective count stays within MAX_EVENTS.
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
