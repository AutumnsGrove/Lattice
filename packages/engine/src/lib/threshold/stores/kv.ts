/**
 * Threshold — KV Storage Adapter
 *
 * Fast, global, eventually consistent rate limiting via Cloudflare KV.
 * Default storage for most rate limiting needs.
 *
 * Trade-off: Under high concurrency, counts may slightly undercount
 * due to read-modify-write races. Acceptable for protective limits.
 */

import type {
  ThresholdStore,
  ThresholdCheckOptions,
  ThresholdResult,
} from "../types.js";

export class ThresholdKVStore implements ThresholdStore {
  constructor(
    private kv: KVNamespace,
    private namespace = "threshold",
  ) {}

  async check(options: ThresholdCheckOptions): Promise<ThresholdResult> {
    const fullKey = `${this.namespace}:${options.key}`;
    const now = Math.floor(Date.now() / 1000);

    try {
      const data = await this.kv.get<{ count: number; resetAt: number }>(
        fullKey,
        "json",
      );

      // New window or expired window
      if (!data || data.resetAt <= now) {
        const resetAt = now + options.windowSeconds;
        await this.kv.put(fullKey, JSON.stringify({ count: 1, resetAt }), {
          expirationTtl: options.windowSeconds,
        });
        return { allowed: true, remaining: options.limit - 1, resetAt };
      }

      // Over limit
      if (data.count >= options.limit) {
        return {
          allowed: false,
          remaining: 0,
          resetAt: data.resetAt,
          retryAfter: data.resetAt - now,
        };
      }

      // Increment
      await this.kv.put(
        fullKey,
        JSON.stringify({ count: data.count + 1, resetAt: data.resetAt }),
        { expirationTtl: data.resetAt - now },
      );

      return {
        allowed: true,
        remaining: options.limit - data.count - 1,
        resetAt: data.resetAt,
      };
    } catch (error) {
      return this.handleError(error, options, now);
    }
  }

  private handleError(
    error: unknown,
    options: ThresholdCheckOptions,
    now: number,
  ): ThresholdResult {
    console.error(
      "[threshold:kv] Storage error, failing",
      options.failMode ?? "open",
      error,
    );

    if (options.failMode === "closed") {
      return {
        allowed: false,
        remaining: 0,
        resetAt: now + 30,
        retryAfter: 30,
      };
    }

    // Fail open
    return { allowed: true, remaining: options.limit, resetAt: 0 };
  }
}
