/**
 * Rate Limiting Middleware
 *
 * Per-tenant rate limiting by email type.
 *
 * Uses atomic increment counters to avoid race conditions.
 * Fixed: Previously counted from zephyr_logs which had a race condition
 * where concurrent requests would all see stale counts before logging.
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
 * Get current minute bucket (Unix timestamp truncated to minute)
 */
function getMinuteBucket(timestamp: number): number {
  return Math.floor(timestamp / 60000) * 60;
}

/**
 * Get current day bucket (Unix timestamp truncated to day)
 */
function getDayBucket(timestamp: number): number {
  return Math.floor(timestamp / 86400000) * 86400;
}

/**
 * Atomically increment rate limit counter and return new count
 */
async function incrementCounter(
  db: D1Database,
  table: "zephyr_rate_limits" | "zephyr_rate_limits_daily",
  tenant: string,
  type: EmailType,
  bucket: number,
): Promise<number> {
  const now = Math.floor(Date.now() / 1000);

  // Try to insert, if exists then update
  const result = await db
    .prepare(
      `
      INSERT INTO ${table} (tenant, type, bucket, count, created_at, updated_at)
      VALUES (?, ?, ?, 1, ?, ?)
      ON CONFLICT(tenant, type, bucket) DO UPDATE SET
        count = count + 1,
        updated_at = excluded.updated_at
      RETURNING count
    `,
    )
    .bind(tenant, type, bucket, now, now)
    .first<{ count: number }>();

  return result?.count || 1;
}

/**
 * Get current count for a bucket without incrementing
 */
async function getCounter(
  db: D1Database,
  table: "zephyr_rate_limits" | "zephyr_rate_limits_daily",
  tenant: string,
  type: EmailType,
  bucket: number,
): Promise<number> {
  const result = await db
    .prepare(
      `
      SELECT count FROM ${table}
      WHERE tenant = ? AND type = ? AND bucket = ?
    `,
    )
    .bind(tenant, type, bucket)
    .first<{ count: number }>();

  return result?.count || 0;
}

/**
 * Check if request is within rate limits using atomic increments
 *
 * This approach prevents race conditions by atomically incrementing
 * counters BEFORE allowing the request, rather than counting past sends.
 */
export async function checkRateLimit(
  db: D1Database,
  tenant: string,
  type: EmailType,
  recipient: string,
): Promise<RateLimitResult> {
  const limits = RATE_LIMITS[type];
  const now = Date.now();
  const minuteBucket = getMinuteBucket(now);
  const dayBucket = getDayBucket(now);

  try {
    // Atomically increment both counters and get new values
    const [minuteCount, dayCount] = await Promise.all([
      incrementCounter(db, "zephyr_rate_limits", tenant, type, minuteBucket),
      incrementCounter(db, "zephyr_rate_limits_daily", tenant, type, dayBucket),
    ]);

    // Check minute limit (count includes current request)
    if (minuteCount > limits.perMinute) {
      return {
        allowed: false,
        message: `Rate limit exceeded: ${limits.perMinute} ${type} emails per minute`,
        remaining: 0,
      };
    }

    // Check day limit (count includes current request)
    if (dayCount > limits.perDay) {
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
 *
 * Uses atomic counter tables for accurate counts.
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
  const minuteBucket = getMinuteBucket(now);
  const dayBucket = getDayBucket(now);

  const [minuteCount, dayCount] = await Promise.all([
    getCounter(db, "zephyr_rate_limits", tenant, type, minuteBucket),
    getCounter(db, "zephyr_rate_limits_daily", tenant, type, dayBucket),
  ]);

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
