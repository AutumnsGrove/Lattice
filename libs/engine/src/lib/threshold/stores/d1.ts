/**
 * Threshold — D1 Storage Adapter
 *
 * Strongly consistent, central rate limiting via Cloudflare D1.
 * Use for auth endpoints and billing-sensitive operations.
 *
 * Requires the rate_limits table:
 *   CREATE TABLE IF NOT EXISTS rate_limits (
 *     key TEXT PRIMARY KEY,
 *     count INTEGER NOT NULL DEFAULT 0,
 *     window_start INTEGER NOT NULL
 *   );
 *
 * Uses a single atomic INSERT ON CONFLICT RETURNING statement
 * for one-roundtrip, race-safe rate limiting.
 */

import type {
  ThresholdStore,
  ThresholdCheckOptions,
  ThresholdResult,
} from "../types.js";

export class ThresholdD1Store implements ThresholdStore {
  constructor(private db: D1Database) {}

  async check(options: ThresholdCheckOptions): Promise<ThresholdResult> {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const windowStart = nowSeconds - options.windowSeconds;

    try {
      // Single atomic statement: insert-or-increment with window expiry.
      // If the key doesn't exist or the window has expired, start fresh at count=1.
      // If the key exists within the current window, increment count.
      // Returns the resulting row so we can compute remaining/resetAt.
      const row = await this.db
        .prepare(
          `INSERT INTO rate_limits (key, count, window_start)
					 VALUES (?, 1, ?)
					 ON CONFLICT(key) DO UPDATE SET
					   count = CASE
					     WHEN window_start < ? THEN 1
					     ELSE count + 1
					   END,
					   window_start = CASE
					     WHEN window_start < ? THEN excluded.window_start
					     ELSE window_start
					   END
					 RETURNING count, window_start`,
        )
        .bind(options.key, nowSeconds, windowStart, windowStart)
        .first<{ count: number; window_start: number }>();

      if (!row) {
        // Should never happen with RETURNING, but fail safely
        return this.handleError(
          new Error("RETURNING clause returned no row"),
          options,
          nowSeconds,
        );
      }

      const resetAt = row.window_start + options.windowSeconds;

      if (row.count > options.limit) {
        return {
          allowed: false,
          remaining: 0,
          resetAt,
          retryAfter: resetAt - nowSeconds,
        };
      }

      return {
        allowed: true,
        remaining: options.limit - row.count,
        resetAt,
      };
    } catch (error) {
      return this.handleError(error, options, nowSeconds);
    }
  }

  private handleError(
    error: unknown,
    options: ThresholdCheckOptions,
    nowSeconds: number,
  ): ThresholdResult {
    console.error(
      "[threshold:d1] Storage error, failing",
      options.failMode ?? "open",
      error,
    );

    if (options.failMode === "closed") {
      return {
        allowed: false,
        remaining: 0,
        resetAt: nowSeconds + 30,
        retryAfter: 30,
      };
    }

    return { allowed: true, remaining: options.limit, resetAt: 0 };
  }
}
