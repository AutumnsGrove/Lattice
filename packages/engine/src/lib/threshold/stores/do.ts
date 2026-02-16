/**
 * Threshold — Durable Object Storage Adapter
 *
 * Per-identifier rate limiting via ThresholdDO. Each identifier gets its
 * own DO instance with a private SQLite database — zero shared-state
 * contention, single-writer consistency, and no per-op KV/D1 costs.
 *
 * This is the preferred storage backend when:
 * 1. The package has a THRESHOLD DO binding
 * 2. An identifier is available (userId, IP, tenantId)
 *
 * Falls back to fail-open/closed on DO communication errors.
 */

import type {
  ThresholdStore,
  ThresholdCheckOptions,
  ThresholdResult,
} from "../types.js";

export class ThresholdDOStore implements ThresholdStore {
  constructor(
    private doNamespace: DurableObjectNamespace,
    private identifier: string,
  ) {}

  async check(options: ThresholdCheckOptions): Promise<ThresholdResult> {
    const id = this.doNamespace.idFromName(`threshold:${this.identifier}`);
    const stub = this.doNamespace.get(id);

    try {
      const res = await stub.fetch("https://threshold.internal/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: options.key,
          limit: options.limit,
          windowSeconds: options.windowSeconds,
        }),
      });

      if (!res.ok) {
        const errorBody = await res.text().catch(() => "unknown");
        throw new Error(`DO returned ${res.status}: ${errorBody}`);
      }

      return (await res.json()) as ThresholdResult;
    } catch (error) {
      return this.handleError(error, options);
    }
  }

  private handleError(
    error: unknown,
    options: ThresholdCheckOptions,
  ): ThresholdResult {
    console.error(
      "[threshold:do] DO fetch error, failing",
      options.failMode ?? "open",
      error,
    );

    const now = Math.floor(Date.now() / 1000);

    if (options.failMode === "closed") {
      return {
        allowed: false,
        remaining: 0,
        resetAt: now + 30,
        retryAfter: 30,
      };
    }

    // Fail open — allow the request through
    return { allowed: true, remaining: options.limit, resetAt: 0 };
  }
}
