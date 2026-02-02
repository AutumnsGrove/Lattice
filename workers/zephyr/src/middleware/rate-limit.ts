/**
 * Rate Limiting Middleware
 *
 * Per-tenant rate limiting by email type.
 */

import type { EmailType, RateLimitConfig } from "../types";

const RATE_LIMITS: Record<EmailType, RateLimitConfig> = {
  transactional: { perMinute: 60, perDay: 1000 },
  notification: { perMinute: 60, perDay: 1000 },
  verification: { perMinute: 10, perDay: 100 },
  sequence: { perMinute: 100, perDay: 5000 },
  lifecycle: { perMinute: 60, perDay: 500 },
  broadcast: { perMinute: 1000, perDay: 10000 },
};

export interface RateLimitResult {
  allowed: boolean;
  message?: string;
  remaining?: number;
}

/**
 * Check if request is within rate limits
 *
 * Uses D1 for persistence. In production, this should use
 * Cloudflare Rate Limiting API or Durable Objects for higher throughput.
 */
export async function checkRateLimit(
  db: D1Database,
  tenant: string,
  type: EmailType,
  recipient: string,
): Promise<RateLimitResult> {
  const limits = RATE_LIMITS[type];
  const now = Date.now();
  const oneMinuteAgo = now - 60 * 1000;
  const oneDayAgo = now - 24 * 60 * 60 * 1000;

  try {
    // Run minute and day count queries in parallel
    const preparedQuery = db.prepare(
      `
        SELECT COUNT(*) as count FROM zephyr_logs
        WHERE tenant = ?
        AND type = ?
        AND created_at > ?
        AND success = 1
      `,
    );

    const [minuteResult, dayResult] = await Promise.all([
      preparedQuery.bind(tenant, type, oneMinuteAgo).first<{ count: number }>(),
      preparedQuery.bind(tenant, type, oneDayAgo).first<{ count: number }>(),
    ]);

    const minuteCount = minuteResult?.count || 0;
    const dayCount = dayResult?.count || 0;

    // Check minute limit
    if (minuteCount >= limits.perMinute) {
      return {
        allowed: false,
        message: `Rate limit exceeded: ${limits.perMinute} ${type} emails per minute`,
        remaining: 0,
      };
    }

    // Check day limit
    if (dayCount >= limits.perDay) {
      return {
        allowed: false,
        message: `Rate limit exceeded: ${limits.perDay} ${type} emails per day`,
        remaining: 0,
      };
    }

    return {
      allowed: true,
      remaining: Math.min(
        limits.perMinute - minuteCount,
        limits.perDay - dayCount,
      ),
    };
  } catch (error) {
    // Log error but don't block the request
    console.error("[Zephyr] Rate limit check failed:", error);
    // Fail open - allow the request if we can't check rate limits
    return { allowed: true };
  }
}

/**
 * Get rate limit status for a tenant
 */
export async function getRateLimitStatus(
  db: D1Database,
  tenant: string,
  type: EmailType,
): Promise<{
  perMinute: { limit: number; used: number; remaining: number };
  perDay: { limit: number; used: number; remaining: number };
}> {
  const limits = RATE_LIMITS[type];
  const now = Date.now();
  const oneMinuteAgo = now - 60 * 1000;
  const oneDayAgo = now - 24 * 60 * 60 * 1000;

  const [minuteResult, dayResult] = await Promise.all([
    db
      .prepare(
        `
        SELECT COUNT(*) as count FROM zephyr_logs
        WHERE tenant = ?
        AND type = ?
        AND created_at > ?
        AND success = 1
      `,
      )
      .bind(tenant, type, oneMinuteAgo)
      .first<{ count: number }>(),
    db
      .prepare(
        `
        SELECT COUNT(*) as count FROM zephyr_logs
        WHERE tenant = ?
        AND type = ?
        AND created_at > ?
        AND success = 1
      `,
      )
      .bind(tenant, type, oneDayAgo)
      .first<{ count: number }>(),
  ]);

  const minuteCount = minuteResult?.count || 0;
  const dayCount = dayResult?.count || 0;

  return {
    perMinute: {
      limit: limits.perMinute,
      used: minuteCount,
      remaining: Math.max(0, limits.perMinute - minuteCount),
    },
    perDay: {
      limit: limits.perDay,
      used: dayCount,
      remaining: Math.max(0, limits.perDay - dayCount),
    },
  };
}
