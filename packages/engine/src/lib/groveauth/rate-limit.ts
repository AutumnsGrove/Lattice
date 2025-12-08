/**
 * Rate Limiting Utilities for GroveAuth API
 *
 * Provides CLIENT-SIDE rate limiting and request throttling as a first line
 * of defense to prevent accidental API abuse and improve user experience.
 *
 * IMPORTANT: This is NOT a security measure. Client-side rate limiting can
 * be bypassed. Server-side rate limiting should be the PRIMARY enforcement
 * mechanism. This client-side limiter helps:
 *
 * 1. Reduce unnecessary API calls (fail fast before hitting server limits)
 * 2. Improve UX by showing rate limit errors immediately
 * 3. Prevent accidental DoS from buggy client code
 *
 * Server-side implementation should use Cloudflare Workers rate limiting:
 * @see https://developers.cloudflare.com/workers/runtime-apis/rate-limit/
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
}

/**
 * Default rate limits for different endpoint types.
 * These should match server-side limits.
 */
export const DEFAULT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  token: { maxRequests: 10, windowMs: 60000 }, // 10/min
  subscription: { maxRequests: 60, windowMs: 60000 }, // 60/min
  postCount: { maxRequests: 30, windowMs: 60000 }, // 30/min
  canPost: { maxRequests: 120, windowMs: 60000 }, // 120/min
};

/**
 * Simple in-memory rate limiter for client-side request throttling.
 *
 * Usage:
 * ```typescript
 * const limiter = new RateLimiter();
 *
 * // Before making an API call
 * if (!limiter.checkLimit('subscription', userId)) {
 *   throw new Error('Rate limit exceeded');
 * }
 * ```
 */
export class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private config: Record<string, RateLimitConfig>;

  constructor(config?: Record<string, RateLimitConfig>) {
    this.config = { ...DEFAULT_RATE_LIMITS, ...config };
  }

  /**
   * Check if a request is allowed and increment the counter.
   *
   * @param type - The endpoint type (token, subscription, postCount, canPost)
   * @param key - Unique key for the rate limit (e.g., userId, IP)
   * @returns true if request is allowed, false if rate limited
   */
  checkLimit(type: string, key: string): boolean {
    const limitConfig = this.config[type];
    if (!limitConfig) {
      // Unknown type, allow by default
      return true;
    }

    const limitKey = `${type}:${key}`;
    const now = Date.now();
    const entry = this.limits.get(limitKey);

    // Check if we need to reset the window
    if (!entry || now >= entry.resetAt) {
      this.limits.set(limitKey, {
        count: 1,
        resetAt: now + limitConfig.windowMs,
      });
      return true;
    }

    // Check if we're within limits
    if (entry.count < limitConfig.maxRequests) {
      entry.count++;
      return true;
    }

    return false;
  }

  /**
   * Get remaining requests for a given type and key.
   *
   * @returns Object with remaining count and reset time, or null if no limit tracked
   */
  getRemaining(
    type: string,
    key: string,
  ): { remaining: number; resetAt: number } | null {
    const limitConfig = this.config[type];
    if (!limitConfig) return null;

    const limitKey = `${type}:${key}`;
    const now = Date.now();
    const entry = this.limits.get(limitKey);

    if (!entry || now >= entry.resetAt) {
      return {
        remaining: limitConfig.maxRequests,
        resetAt: now + limitConfig.windowMs,
      };
    }

    return {
      remaining: Math.max(0, limitConfig.maxRequests - entry.count),
      resetAt: entry.resetAt,
    };
  }

  /**
   * Clear rate limit entries (useful for testing or manual reset)
   */
  clear(type?: string, key?: string): void {
    if (type && key) {
      this.limits.delete(`${type}:${key}`);
    } else if (type) {
      for (const limitKey of this.limits.keys()) {
        if (limitKey.startsWith(`${type}:`)) {
          this.limits.delete(limitKey);
        }
      }
    } else {
      this.limits.clear();
    }
  }

  /**
   * Clean up expired entries to prevent memory leaks.
   * Call periodically in long-running processes.
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.limits.entries()) {
      if (now >= entry.resetAt) {
        this.limits.delete(key);
        removed++;
      }
    }

    return removed;
  }
}

/**
 * Error thrown when rate limit is exceeded
 */
export class RateLimitError extends Error {
  readonly retryAfterMs: number;

  constructor(type: string, retryAfterMs: number) {
    super(
      `Rate limit exceeded for ${type}. Retry after ${Math.ceil(retryAfterMs / 1000)} seconds.`,
    );
    this.name = "RateLimitError";
    this.retryAfterMs = retryAfterMs;
  }
}

/**
 * Create a rate-limited wrapper for async functions.
 *
 * Usage:
 * ```typescript
 * const limiter = new RateLimiter();
 * const rateLimitedFetch = withRateLimit(
 *   limiter,
 *   'subscription',
 *   () => userId,
 *   fetchSubscription
 * );
 * ```
 */
export function withRateLimit<
  T extends (...args: unknown[]) => Promise<unknown>,
>(
  limiter: RateLimiter,
  type: string,
  getKey: (...args: Parameters<T>) => string,
  fn: T,
): T {
  return (async (...args: Parameters<T>) => {
    const key = getKey(...args);
    const remaining = limiter.getRemaining(type, key);

    if (!limiter.checkLimit(type, key)) {
      const retryAfterMs = remaining?.resetAt
        ? remaining.resetAt - Date.now()
        : 60000;
      throw new RateLimitError(type, retryAfterMs);
    }

    return fn(...args);
  }) as T;
}
