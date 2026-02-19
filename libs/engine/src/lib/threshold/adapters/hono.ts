/**
 * Threshold — Hono Adapter
 *
 * Provides middleware and helpers for using Threshold in Hono applications.
 * Uses structural types instead of importing hono — the engine package
 * doesn't depend on Hono, but TypeScript structural typing ensures compatibility.
 */

import type { Threshold } from "../threshold.js";

// ============================================================================
// Structural Types (compatible with Hono's types without importing them)
// ============================================================================

/** Minimal context shape matching Hono's Context */
export interface ThresholdHonoContext {
  env: Record<string, unknown>;
  req: { url: string; header: (name: string) => string | undefined };
  header: (name: string, value: string) => void;
  json: (data: unknown, status?: number) => Response;
}

/** Minimal next function shape */
export type ThresholdHonoNext = () => Promise<void>;

/** Middleware function shape */
export type ThresholdHonoMiddleware = (
  c: ThresholdHonoContext,
  next: ThresholdHonoNext,
) => Promise<Response | void>;

// ============================================================================
// Options
// ============================================================================

export interface ThresholdHonoOptions {
  /** The Threshold instance */
  threshold: Threshold;
  /** Rate limit amount */
  limit: number;
  /** Window in seconds */
  windowSeconds: number;
  /** Key prefix for this middleware */
  keyPrefix: string;
  /** Extract the rate limit key from the request context. Return null to skip. */
  getKey: (c: ThresholdHonoContext) => string | null;
  /** Fail mode for storage errors */
  failMode?: "open" | "closed";
}

// ============================================================================
// Middleware
// ============================================================================

/**
 * Hono middleware factory for rate limiting.
 *
 * @example
 * ```typescript
 * import { thresholdMiddleware } from "@autumnsgrove/lattice/threshold/hono";
 *
 * app.use("/api/auth/*", thresholdMiddleware({
 *   threshold,
 *   limit: 20,
 *   windowSeconds: 300,
 *   keyPrefix: "auth",
 *   getKey: (c) => c.req.header("cf-connecting-ip") ?? null,
 *   failMode: "closed",
 * }));
 * ```
 */
export function thresholdMiddleware(
  options: ThresholdHonoOptions,
): ThresholdHonoMiddleware {
  return async (c, next) => {
    // Skip in test environment
    if ((c.env as Record<string, string>)?.ENVIRONMENT === "test") {
      return next();
    }

    const keyPart = options.getKey(c);
    if (!keyPart) return next();

    const result = await options.threshold.check({
      key: `${options.keyPrefix}:${keyPart}`,
      limit: options.limit,
      windowSeconds: options.windowSeconds,
      failMode: options.failMode,
    });

    // Always set headers
    c.header("X-RateLimit-Limit", String(options.limit));
    c.header("X-RateLimit-Remaining", String(result.remaining));
    c.header("X-RateLimit-Reset", String(result.resetAt));

    if (!result.allowed) {
      const retryAfter = result.retryAfter ?? 60;
      c.header("Retry-After", String(retryAfter));
      return c.json(
        {
          error: "rate_limited",
          message: "Too many requests. Please try again later.",
          retryAfter,
          retry_after: retryAfter, // backwards compat with existing Heartwood clients
        },
        429,
      );
    }

    return next();
  };
}

// ============================================================================
// Inline Check
// ============================================================================

/**
 * Inline rate limit check for Hono routes.
 * Use when you need more control than middleware provides.
 */
export async function thresholdCheck(
  threshold: Threshold,
  keyPrefix: string,
  keyPart: string,
  limit: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; remaining: number; retryAfter?: number }> {
  const result = await threshold.check({
    key: `${keyPrefix}:${keyPart}`,
    limit,
    windowSeconds,
  });

  if (!result.allowed) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: result.retryAfter,
    };
  }

  return { allowed: true, remaining: result.remaining };
}
