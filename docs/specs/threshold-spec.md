---
title: Threshold — Rate Limiting SDK
description: >-
  Unified rate limiting SDK for all Grove packages. Storage-agnostic core with
  framework adapters for SvelteKit, Hono, and bare Workers.
category: specs
specCategory: infrastructure
icon: gauge
lastUpdated: "2026-02-15"
aliases: []
tags:
  - rate-limiting
  - infrastructure
  - cloudflare-workers
  - security
type: tech-spec
---

# Threshold — Rate Limiting SDK

```
                    ╭─────────────────────────╮
                    │         ┌───┐           │
                    │         │ ◆ │ THRESHOLD  │
                    │         └─┬─┘           │
                    ╰───────────┼─────────────╯
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                 │
         ╭────┴────╮      ╭────┴────╮      ╭────┴────╮
         │   KV    │      │   D1    │      │   DO    │
         │ ░░░░░░░ │      │ ▒▒▒▒▒▒▒ │      │ ▓▓▓▓▓▓▓ │
         ╰────┬────╯      ╰────┬────╯      ╰────┬────╯
              │                 │                 │
              └─────────────────┼─────────────────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                 │
         ╭────┴────╮      ╭────┴────╮      ╭────┴────╮
         │SvelteKit│      │  Hono   │      │ Worker  │
         │  🌿     │      │  🌿     │      │  🌿     │
         ╰─────────╯      ╰─────────╯      ╰─────────╯

            The forest has boundaries.
            Threshold enforces them gently.
```

> _The forest has boundaries. Threshold enforces them gently._

Grove's unified rate limiting SDK. One interface across every package, every framework, every storage backend. Like Lumen for AI and Zephyr for email, Threshold is the single gateway for rate limiting. No more hand-rolled limiters. No more scattered constants. One source of truth.

**Public Name:** Threshold
**Internal Name:** GroveThreshold
**Package:** `@autumnsgrove/lattice/threshold`
**Last Updated:** February 2026

A threshold is the strip of wood at the bottom of a doorway. You cross it to enter. It marks where outside becomes inside, where the wild becomes the sheltered. In the grove, Threshold decides who crosses and how fast. It doesn't slam doors. It holds them open at just the right pace.

---

## The Problem

Rate limiting has grown organically across Grove. Six separate implementations, three storage backends, three framework patterns, zero shared interface.

```
BEFORE (scattered)                    AFTER (unified)

 Engine ── KV ── SvelteKit             ╭───────────────╮
 Heartwood ── D1 ── Hono              │   Threshold   │
 Plant ── KV ── inline                │               │
 OG-Worker ── KV ── inline            │  Threshold    │
 SessionDO ── SQLite ── custom    →   │   .check()    │
 Better Auth ── D1 ── internal        │               │
                                       ╰───────┬───────╯
 6 implementations                             │
 3 storage backends                    ┌───────┼───────┐
 2 error formats                       KV     D1      DO
 17 hardcoded constants                SvelteKit  Hono  Worker
```

**What's wrong today:**

- `rate_limited` (engine) vs `rate_limit` (Heartwood) error keys
- Heartwood has 17 rate limit constants in `constants.ts`, engine has a config module, Plant has inline numbers
- OG-Worker re-implements KV rate limiting from scratch (35 lines that duplicate engine logic)
- Plant's username checker has its own hand-rolled limiter
- SessionDO has a `rate_limits` SQLite table that nothing else can read
- Better Auth's `customStorage` bridges to a D1 `rate_limits` table with its own schema
- No way for a Hono route to use the engine's tier-aware config
- No way for a bare Worker to get proper rate limit headers

---

## Architecture

### Core Principle: Storage-Agnostic, Framework-Agnostic

Threshold splits into three layers:

```
┌─────────────────────────────────────────────────────────────────────┐
│  LAYER 3: Framework Adapters                                        │
│                                                                     │
│  threshold/sveltekit  │  threshold/hono  │  threshold/worker        │
│  Returns Response     │  Returns c.json  │  Returns Response        │
│  Uses json() helper   │  Uses Hono ctx   │  Uses new Response()     │
│                                                                     │
│  Each adapter wraps the core check result into framework-specific   │
│  middleware or response helpers.                                     │
├─────────────────────────────────────────────────────────────────────┤
│  LAYER 2: Feature Modules                                           │
│                                                                     │
│  Config         │  Abuse Tracking     │  Response Builder           │
│  Tier limits    │  Graduated response │  Headers, error body        │
│  Endpoint maps  │  Bans, warnings     │  Consistent format          │
│  Tenant limits  │  Violation decay    │  Retry-After                │
│                                                                     │
│  Pure functions and types. No framework or storage dependencies.    │
├─────────────────────────────────────────────────────────────────────┤
│  LAYER 1: Storage Adapters                                          │
│                                                                     │
│  KVAdapter      │  D1Adapter          │  DOAdapter                  │
│  KVNamespace    │  D1Database         │  DurableObjectStorage       │
│  Eventual cons. │  Strong consistency │  Strong + colocated         │
│  Fast, global   │  Central, reliable  │  Per-entity state           │
│                                                                     │
│  All implement the same ThresholdStore interface.                    │
└─────────────────────────────────────────────────────────────────────┘
```

### Storage Selection Guide

| Storage          | Use When                                             | Consistency        | Latency          | Cost   |
| ---------------- | ---------------------------------------------------- | ------------------ | ---------------- | ------ |
| **KV** (default) | General rate limits, uploads, most endpoints         | Eventual           | Low (global)     | Lowest |
| **D1**           | Auth endpoints, billing ops, where precision matters | Strong             | Medium (central) | Low    |
| **DO SQLite**    | Per-session login tracking, per-tenant state         | Strong + colocated | Low (colocated)  | Medium |

**Rule of thumb:** Start with KV. Move to D1 if you need precision on security-critical paths. Use DO only when state is naturally per-entity (per-session, per-tenant).

---

## API Design

### The Core Interface

```typescript
// packages/engine/src/lib/threshold/types.ts

/** Result from any rate limit check, regardless of storage backend */
export interface ThresholdResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // Unix timestamp (seconds)
  retryAfter?: number; // Seconds until reset (only when denied)
}

/** Configuration for a single rate limit check */
export interface ThresholdCheckOptions {
  /** Unique key identifying what's being limited (e.g., "auth/login:192.168.1.1") */
  key: string;
  /** Maximum requests allowed in the window */
  limit: number;
  /** Time window in seconds */
  windowSeconds: number;
  /**
   * Fail behavior on storage errors.
   * - "open" (default): Allow request, log error
   * - "closed": Deny request with 503. Use for auth-critical paths.
   */
  failMode?: "open" | "closed";
}

/** Storage adapter interface. All backends implement this. */
export interface ThresholdStore {
  check(options: ThresholdCheckOptions): Promise<ThresholdResult>;
}
```

### Storage Adapters

```typescript
// packages/engine/src/lib/threshold/stores/kv.ts

import type {
  ThresholdStore,
  ThresholdCheckOptions,
  ThresholdResult,
} from "../types.js";

/**
 * KV-backed rate limiting. Fast, global, eventually consistent.
 * Default storage for most rate limiting needs.
 *
 * Trade-off: Under high concurrency, counts may slightly undercount
 * due to read-modify-write races. Acceptable for protective limits.
 */
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
```

```typescript
// packages/engine/src/lib/threshold/stores/d1.ts

import type {
  ThresholdStore,
  ThresholdCheckOptions,
  ThresholdResult,
} from "../types.js";

/**
 * D1-backed rate limiting. Strongly consistent, central.
 * Use for auth endpoints and billing-sensitive operations.
 *
 * Requires the rate_limits table:
 *   CREATE TABLE IF NOT EXISTS rate_limits (
 *     key TEXT PRIMARY KEY,
 *     count INTEGER NOT NULL DEFAULT 0,
 *     window_start INTEGER NOT NULL
 *   );
 */
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
```

### The Threshold Class

````typescript
// packages/engine/src/lib/threshold/threshold.ts

import type {
  ThresholdStore,
  ThresholdResult,
  ThresholdCheckOptions,
} from "./types.js";
import type {
  TierKey,
  TierRateLimits,
  RateLimitConfig,
} from "../config/tiers.js";
import { TIERS } from "../config/tiers.js";
import {
  ENDPOINT_RATE_LIMITS,
  ENDPOINT_MAP,
  type EndpointKey,
} from "./config.js";
import {
  type AbuseState,
  type ViolationResult,
  getAbuseState,
  recordViolation,
  isBanned,
  getBanRemaining,
  clearAbuseState,
} from "./abuse.js";

export interface ThresholdOptions {
  /** Primary storage backend */
  store: ThresholdStore;
  /** Optional KV for abuse tracking (falls back to skipping abuse checks) */
  abuseKV?: KVNamespace;
}

/**
 * Threshold — unified rate limiting for Grove.
 *
 * @example
 * ```typescript
 * import { Threshold, ThresholdKVStore } from "@autumnsgrove/lattice/threshold";
 *
 * const threshold = new Threshold({
 *   store: new ThresholdKVStore(platform.env.CACHE),
 * });
 *
 * // Simple check
 * const result = await threshold.check({
 *   key: `upload:${userId}`,
 *   limit: 20,
 *   windowSeconds: 3600,
 * });
 *
 * // Tier-aware check
 * const result = await threshold.checkTier("seedling", "writes", userId);
 *
 * // Endpoint-aware check
 * const result = await threshold.checkEndpoint("POST", "/api/posts", userId);
 * ```
 */
export class Threshold {
  private store: ThresholdStore;
  private abuseKV?: KVNamespace;

  constructor(options: ThresholdOptions) {
    this.store = options.store;
    this.abuseKV = options.abuseKV;
  }

  // ===========================================================================
  // Core Check
  // ===========================================================================

  /** Check a rate limit. The lowest-level call. */
  async check(options: ThresholdCheckOptions): Promise<ThresholdResult> {
    return this.store.check(options);
  }

  // ===========================================================================
  // Tier-Aware Check
  // ===========================================================================

  /**
   * Check rate limit based on subscription tier.
   * Looks up limits from the unified tier config.
   */
  async checkTier(
    tier: TierKey,
    category: keyof TierRateLimits,
    identifier: string,
  ): Promise<ThresholdResult> {
    const config = TIERS[tier].rateLimits[category];
    return this.store.check({
      key: `tier:${tier}:${category}:${identifier}`,
      limit: config.limit,
      windowSeconds: config.windowSeconds,
    });
  }

  // ===========================================================================
  // Endpoint-Aware Check
  // ===========================================================================

  /**
   * Check rate limit for a specific endpoint.
   * Maps method + path to endpoint presets.
   */
  async checkEndpoint(
    method: string,
    pathname: string,
    identifier: string,
    overrides?: Partial<RateLimitConfig>,
  ): Promise<ThresholdResult> {
    const mapKey = `${method}:${pathname}`;
    const endpointKey: EndpointKey = ENDPOINT_MAP[mapKey] ?? "default";
    const config = ENDPOINT_RATE_LIMITS[endpointKey];

    return this.store.check({
      key: `ep:${endpointKey}:${identifier}`,
      limit: overrides?.limit ?? config.limit,
      windowSeconds: overrides?.windowSeconds ?? config.windowSeconds,
      failMode: endpointKey.startsWith("auth/") ? "closed" : "open",
    });
  }

  // ===========================================================================
  // Tenant Check
  // ===========================================================================

  /**
   * Check rate limit for a tenant based on their subscription tier.
   * Categorizes the request automatically from method + path.
   */
  async checkTenant(
    tenantId: string,
    tier: TierKey,
    method: string,
    pathname: string,
  ): Promise<ThresholdResult> {
    const category = categorizeRequest(method, pathname);
    return this.checkTier(tier, category, `tenant:${tenantId}`);
  }

  // ===========================================================================
  // Abuse Tracking
  // ===========================================================================

  /**
   * Check if a user is banned before performing a rate limit check.
   * Requires abuseKV to be configured.
   */
  async checkWithAbuse(
    options: ThresholdCheckOptions,
    userId: string,
  ): Promise<ThresholdResult & { warning?: boolean; banned?: boolean }> {
    // Check ban status first
    if (this.abuseKV) {
      const state = await getAbuseState(this.abuseKV, userId);
      if (isBanned(state)) {
        return {
          allowed: false,
          remaining: 0,
          resetAt: state.bannedUntil!,
          retryAfter: getBanRemaining(state),
          banned: true,
        };
      }
    }

    // Perform rate limit check
    const result = await this.store.check(options);

    // Record violation if denied
    if (!result.allowed && this.abuseKV) {
      const violation = await recordViolation(this.abuseKV, userId);
      return {
        ...result,
        warning: violation.warning,
        banned: violation.banned,
      };
    }

    return result;
  }

  /**
   * Clear abuse state for a user. Admin action.
   */
  async clearAbuse(userId: string): Promise<void> {
    if (this.abuseKV) {
      await clearAbuseState(this.abuseKV, userId);
    }
  }
}

// =============================================================================
// Request Categorization
// =============================================================================

/**
 * Determine the rate limit category for a request.
 * Used by checkTenant() to auto-categorize.
 */
export function categorizeRequest(
  method: string,
  pathname: string,
): keyof TierRateLimits {
  if (
    pathname.startsWith("/api/ai/") ||
    pathname.startsWith("/api/wisp") ||
    pathname.startsWith("/api/grove/wisp")
  ) {
    return "ai";
  }
  if (
    pathname.startsWith("/api/upload") ||
    pathname.startsWith("/api/images") ||
    pathname.startsWith("/api/cdn")
  ) {
    return "uploads";
  }
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    return "writes";
  }
  return "requests";
}
````

### Framework Adapters

#### SvelteKit Adapter

````typescript
// packages/engine/src/lib/threshold/adapters/sveltekit.ts

import { json } from "@sveltejs/kit";
import type { ThresholdResult } from "../types.js";
import type { Threshold } from "../threshold.js";

/**
 * SvelteKit middleware helper. Returns a Response if rate limited, or null to continue.
 *
 * @example
 * ```typescript
 * // In +server.ts
 * import { thresholdCheck } from "@autumnsgrove/lattice/threshold/sveltekit";
 *
 * export const POST: RequestHandler = async ({ platform, locals }) => {
 *   const denied = await thresholdCheck(threshold, {
 *     key: `posts:${locals.user.id}`,
 *     limit: 10,
 *     windowSeconds: 3600,
 *   });
 *   if (denied) return denied;
 *
 *   // ... handle request
 * };
 * ```
 */
export async function thresholdCheck(
  threshold: Threshold,
  options: Parameters<Threshold["check"]>[0],
): Promise<Response | null> {
  const result = await threshold.check(options);

  if (!result.allowed) {
    return json(
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
  }

  return null;
}

/**
 * Generate rate limit headers for any response.
 */
export function thresholdHeaders(
  result: ThresholdResult,
  limit: number,
): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(result.resetAt),
  };

  if (!result.allowed && result.retryAfter) {
    headers["Retry-After"] = String(result.retryAfter);
  }

  return headers;
}
````

#### Hono Adapter

````typescript
// packages/engine/src/lib/threshold/adapters/hono.ts

import type { MiddlewareHandler, Context } from "hono";
import type { Threshold } from "../threshold.js";

interface ThresholdHonoOptions {
  /** The Threshold instance */
  threshold: Threshold;
  /** Rate limit amount */
  limit: number;
  /** Window in seconds */
  windowSeconds: number;
  /** Key prefix for this middleware */
  keyPrefix: string;
  /** Extract the rate limit key from the request context. Return null to skip. */
  getKey: (c: Context) => string | null;
  /** Fail mode for storage errors */
  failMode?: "open" | "closed";
}

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
): MiddlewareHandler {
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
          retry_after: retryAfter,
        },
        429,
      );
    }

    return next();
  };
}

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
````

#### Bare Worker Adapter

````typescript
// packages/engine/src/lib/threshold/adapters/worker.ts

import type { ThresholdResult } from "../types.js";
import type { Threshold } from "../threshold.js";

/**
 * Bare Worker helper. Returns a Response if rate limited, or null to continue.
 *
 * @example
 * ```typescript
 * // In a Worker fetch handler
 * import { thresholdCheck } from "@autumnsgrove/lattice/threshold/worker";
 *
 * export default {
 *   async fetch(request, env) {
 *     const denied = await thresholdCheck(threshold, {
 *       key: `og:${ip}`,
 *       limit: 100,
 *       windowSeconds: 3600,
 *     });
 *     if (denied) return denied;
 *     // ... handle request
 *   }
 * };
 * ```
 */
export async function thresholdCheck(
  threshold: Threshold,
  options: Parameters<Threshold["check"]>[0],
): Promise<Response | null> {
  const result = await threshold.check(options);

  if (!result.allowed) {
    return new Response(
      JSON.stringify({
        error: "rate_limited",
        message: "Too many requests. Please try again later.",
        retryAfter: result.retryAfter,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(result.retryAfter ?? 60),
          "X-RateLimit-Limit": String(options.limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(result.resetAt),
        },
      },
    );
  }

  return null;
}

/**
 * Get client IP from Cloudflare request headers.
 */
export function getClientIP(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}
````

---

## Configuration

### Endpoint Presets

All endpoint rate limits live in one file. This is the single source of truth.

```typescript
// packages/engine/src/lib/threshold/config.ts

import type { RateLimitConfig } from "../config/tiers.js";

export type EndpointKey = keyof typeof ENDPOINT_RATE_LIMITS;

/**
 * Endpoint-specific rate limits.
 * Applied in addition to tier-based limits.
 */
export const ENDPOINT_RATE_LIMITS = {
  // Auth endpoints (most sensitive, fail closed)
  "auth/login": { limit: 5, windowSeconds: 300 },
  "auth/callback": { limit: 10, windowSeconds: 300 },
  "auth/token": { limit: 20, windowSeconds: 60 },
  "auth/password-reset": { limit: 3, windowSeconds: 3600 },
  "auth/magic-link": { limit: 5, windowSeconds: 900 },
  "auth/verify": { limit: 100, windowSeconds: 60 },

  // Passkey endpoints
  "auth/passkey-register": { limit: 5, windowSeconds: 3600 },
  "auth/passkey-delete": { limit: 10, windowSeconds: 3600 },
  "auth/passkey-auth": { limit: 20, windowSeconds: 60 },

  // Session endpoints
  "session/validate": { limit: 30, windowSeconds: 60 },
  "session/revoke": { limit: 30, windowSeconds: 60 },
  "session/revoke-all": { limit: 3, windowSeconds: 3600 },
  "session/list": { limit: 30, windowSeconds: 60 },
  "session/delete": { limit: 20, windowSeconds: 60 },
  "session/check": { limit: 60, windowSeconds: 60 },
  "session/service": { limit: 100, windowSeconds: 60 },

  // Device code flow
  "device/init": { limit: 10, windowSeconds: 60 },
  "device/poll": { limit: 12, windowSeconds: 60 },

  // Admin endpoints
  "admin/general": { limit: 30, windowSeconds: 60 },

  // Subscription endpoints
  "subscription/read": { limit: 30, windowSeconds: 60 },
  "subscription/write": { limit: 10, windowSeconds: 60 },

  // Write endpoints
  "posts/create": { limit: 10, windowSeconds: 3600 },
  "posts/update": { limit: 30, windowSeconds: 3600 },
  "comments/create": { limit: 20, windowSeconds: 300 },

  // Upload endpoints
  "upload/image": { limit: 20, windowSeconds: 3600 },
  "upload/media": { limit: 10, windowSeconds: 3600 },

  // AI endpoints (expensive)
  "ai/wisp": { limit: 50, windowSeconds: 86400 },
  "ai/fireside": { limit: 50, windowSeconds: 86400 },
  "ai/draft": { limit: 20, windowSeconds: 86400 },

  // Data operations
  "export/data": { limit: 10, windowSeconds: 3600 },
  "export/zip-start": { limit: 3, windowSeconds: 86400 },
  "billing/operations": { limit: 20, windowSeconds: 3600 },

  // Feedback
  "trace/submit": { limit: 10, windowSeconds: 86400 },

  // Username checking (anti-enumeration)
  "check/username": { limit: 30, windowSeconds: 60 },

  // OG image generation
  "og/generate": { limit: 100, windowSeconds: 3600 },

  // Default for unspecified endpoints
  default: { limit: 100, windowSeconds: 60 },
} as const satisfies Record<string, RateLimitConfig>;

/**
 * Map of HTTP method:path patterns to endpoint keys.
 * Extend this as new endpoints are added.
 */
export const ENDPOINT_MAP: Record<string, EndpointKey> = {
  "POST:/api/auth/login": "auth/login",
  "POST:/api/auth/token": "auth/token",
  "POST:/api/auth/password-reset": "auth/password-reset",
  "POST:/api/auth/magic-link": "auth/magic-link",
  "POST:/api/blooms": "posts/create",
  "PUT:/api/blooms": "posts/update",
  "PATCH:/api/blooms": "posts/update",
  "POST:/api/posts": "posts/create",
  "PUT:/api/posts": "posts/update",
  "PATCH:/api/posts": "posts/update",
  "POST:/api/comments": "comments/create",
  "POST:/api/upload": "upload/image",
  "POST:/api/images": "upload/image",
  "POST:/api/grove/wisp": "ai/wisp",
  "POST:/api/ai/wisp": "ai/wisp",
  "POST:/api/ai/fireside": "ai/fireside",
  "POST:/api/ai/draft": "ai/draft",
  "POST:/api/export": "export/data",
  "POST:/api/export/start": "export/zip-start",
  "POST:/api/billing": "billing/operations",
  "PATCH:/api/billing": "billing/operations",
  "PUT:/api/billing": "billing/operations",
  "POST:/api/trace": "trace/submit",
  "GET:/api/check-username": "check/username",
};
```

### Tier Limits

Tier-based rate limits are NOT duplicated here. They live in the unified tier config at `packages/engine/src/lib/config/tiers.ts` and Threshold reads them directly. This means tier limits stay in sync with pricing, features, and display automatically.

---

## Abuse Tracking

The graduated response system stays largely as-is (it's well-built), but moves under the `threshold/` directory.

```
Violation 1-4:  Warning (X-RateLimit-Warning header)
Violation 5+:   24-hour ban
Decay:          Violations reset after 24h of no violations
```

Abuse tracking always uses KV (it's protective, not billing-critical, and eventual consistency is fine for counting violations).

---

## Export Structure

```
@autumnsgrove/lattice/threshold
├── Threshold (class)
├── ThresholdKVStore
├── ThresholdD1Store
├── categorizeRequest()
├── ENDPOINT_RATE_LIMITS
├── ENDPOINT_MAP
├── getAbuseState(), recordViolation(), isBanned(), getBanRemaining(), clearAbuseState()
├── types: ThresholdResult, ThresholdCheckOptions, ThresholdStore, AbuseState, ViolationResult

@autumnsgrove/lattice/threshold/sveltekit
├── thresholdCheck()
├── thresholdHeaders()

@autumnsgrove/lattice/threshold/hono
├── thresholdMiddleware()
├── thresholdCheck()

@autumnsgrove/lattice/threshold/worker
├── thresholdCheck()
├── getClientIP()
```

### Package.json Exports

```json
{
  "./threshold": {
    "types": "./dist/threshold/index.d.ts",
    "default": "./dist/threshold/index.js"
  },
  "./threshold/sveltekit": {
    "types": "./dist/threshold/adapters/sveltekit.d.ts",
    "default": "./dist/threshold/adapters/sveltekit.js"
  },
  "./threshold/hono": {
    "types": "./dist/threshold/adapters/hono.d.ts",
    "default": "./dist/threshold/adapters/hono.js"
  },
  "./threshold/worker": {
    "types": "./dist/threshold/adapters/worker.d.ts",
    "default": "./dist/threshold/adapters/worker.js"
  }
}
```

---

## Migration Plan

### What Gets Replaced

| Current Location                                           | What It Does                               | Replaced By                            |
| ---------------------------------------------------------- | ------------------------------------------ | -------------------------------------- |
| `engine/src/lib/server/rate-limits/*`                      | KV rate limiting, tiers, middleware, abuse | `threshold/*` (moved + refactored)     |
| `heartwood/src/middleware/rateLimit.ts`                    | D1 Hono middleware (7 limiters)            | `threshold/hono` adapter               |
| `heartwood/src/utils/constants.ts` (17 rate limit exports) | Hardcoded limits                           | `threshold/config.ts` endpoint presets |
| `heartwood/src/db/queries.ts:checkRateLimit()`             | D1 rate limit query                        | `ThresholdD1Store`                     |
| `heartwood/src/auth/index.ts` Better Auth customStorage    | D1 bridge for BA rate limits               | `ThresholdD1Store` (same table)        |
| `heartwood/src/durables/SessionDO.ts` rate_limits table    | Login attempt tracking                     | `ThresholdD1Store` or kept as DO-local |
| `plant/src/routes/api/check-username/+server.ts`           | Hand-rolled KV limiter                     | `threshold/sveltekit` adapter          |
| `og-worker/src/index.ts:checkRateLimit()`                  | Hand-rolled KV limiter                     | `threshold/worker` adapter             |

### What Stays

- **Better Auth's internal rate limiting** — Better Auth has its own built-in rate limiter. We keep it enabled as a catch-all safety net, but configure its `customStorage` to use `ThresholdD1Store` so counts are visible to Threshold.
- **Cloudflare WAF** — The one existing rule (leaked credential check) stays. We're on the Free plan, so no additional WAF rate limit rules.
- **SessionDO login tracking** — Per-session login attempt tracking in the Durable Object stays as DO-local state. It's naturally per-entity and benefits from colocation. Threshold provides the `check()` logic, SessionDO provides the storage.

### Migration Order

```
Phase 1: Build the SDK
  ├── Create threshold/ directory structure
  ├── Implement ThresholdKVStore (port from cache.ts)
  ├── Implement ThresholdD1Store (port from heartwood/queries.ts)
  ├── Implement Threshold class
  ├── Move config (merge engine + heartwood constants)
  ├── Move abuse tracking
  ├── Build SvelteKit adapter
  ├── Build Hono adapter
  ├── Build Worker adapter
  ├── Add package.json exports
  ├── Tests for all of the above
  └── Build engine, verify exports resolve

Phase 2: Migrate Engine consumers
  ├── Update engine API routes (git stats, hum/resolve)
  ├── Update import paths from server/rate-limits → threshold
  └── Delete engine/src/lib/server/rate-limits/ (after re-export shim)

Phase 3: Migrate Heartwood
  ├── Replace middleware/rateLimit.ts with threshold/hono adapter
  ├── Replace db/queries.ts checkRateLimit with ThresholdD1Store
  ├── Remove 17 rate limit constants from utils/constants.ts
  ├── Update Better Auth customStorage to use ThresholdD1Store
  ├── Update all route files (token, session, device, admin, etc.)
  └── Run Heartwood test suite

Phase 4: Migrate remaining packages
  ├── Plant: Replace check-username inline limiter
  ├── OG-Worker: Replace inline limiter
  └── Login: Verify hooks.server.ts comment is still accurate

Phase 5: Cleanup
  ├── Remove old rate-limits/ directory (keep re-export shim for 1 release)
  ├── Update threshold-pattern.md knowledge page
  ├── Close issues #582, #590, #943, #511
  └── Update MEMORY.md with new patterns
```

---

## Consistency Guarantees

### Error Response Format (ALL packages)

Every 429 response, regardless of framework, uses this shape:

```json
{
  "error": "rate_limited",
  "message": "You're moving faster than we can keep up! Take a moment and try again soon.",
  "retryAfter": 45,
  "resetAt": "2026-02-15T12:00:00.000Z"
}
```

Note: Hono adapter also includes `retry_after` (snake_case) for backwards compatibility with existing Heartwood clients. The canonical field is `retryAfter`.

### Headers (ALL packages)

Every response (success and 429) includes:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 73
X-RateLimit-Reset: 1739620800
```

429 responses additionally include:

```
Retry-After: 45
```

### Fail Modes

| Mode             | Behavior                                    | Use For                                 |
| ---------------- | ------------------------------------------- | --------------------------------------- |
| `open` (default) | Allow request on storage error, log warning | General endpoints, uploads, reads       |
| `closed`         | Deny request with 503 on storage error      | Auth endpoints, password reset, billing |

---

## Testing Strategy

```
threshold/
├── stores/
│   ├── kv.test.ts           — Mock KVNamespace, test all paths
│   └── d1.test.ts           — Mock D1Database, test all paths
├── threshold.test.ts         — Threshold class with mock store
├── config.test.ts            — Endpoint presets, map coverage
├── abuse.test.ts             — Graduated response (existing tests, moved)
└── adapters/
    ├── sveltekit.test.ts     — Response format, headers
    ├── hono.test.ts          — Middleware behavior, skip on test env
    └── worker.test.ts        — Response format, getClientIP
```

All tests use Vitest. KV and D1 mocked with miniflare or simple mocks. No real Cloudflare bindings needed.

---

## Security Considerations

- **Auth endpoints fail closed.** If KV/D1 is down, auth routes return 503 rather than allowing unlimited login attempts.
- **IP extraction trusts CF-Connecting-IP.** This is set by Cloudflare's edge and cannot be spoofed by clients. Falls back to X-Forwarded-For only when CF header is absent (local dev).
- **Abuse state uses KV TTL.** Abuse records auto-expire via KV's expirationTtl. No manual cleanup needed.
- **No shadow ban delays.** Workers have execution time limits. Artificial delays would block the Worker. Use warnings and bans only.
- **Rate limit keys are not user-visible.** Keys contain internal identifiers (user IDs, IPs), never exposed in responses.

---

## Implementation Checklist

### Phase 1: Build the SDK

- [ ] Create `packages/engine/src/lib/threshold/` directory
- [ ] `types.ts` — ThresholdResult, ThresholdCheckOptions, ThresholdStore
- [ ] `stores/kv.ts` — ThresholdKVStore
- [ ] `stores/d1.ts` — ThresholdD1Store
- [ ] `config.ts` — ENDPOINT_RATE_LIMITS, ENDPOINT_MAP (merge all constants)
- [ ] `abuse.ts` — Move from rate-limits/, keep existing logic
- [ ] `threshold.ts` — Threshold class with check, checkTier, checkEndpoint, checkTenant, checkWithAbuse
- [ ] `adapters/sveltekit.ts` — thresholdCheck, thresholdHeaders
- [ ] `adapters/hono.ts` — thresholdMiddleware, thresholdCheck
- [ ] `adapters/worker.ts` — thresholdCheck, getClientIP
- [ ] `index.ts` — Barrel export
- [ ] Add 4 export paths to `package.json`
- [ ] Full test suite
- [ ] Build + verify all exports resolve

### Phase 2: Migrate Engine

- [ ] Update engine API routes to import from threshold
- [ ] Add re-export shim at old path for transition
- [ ] Verify no broken imports across monorepo

### Phase 3: Migrate Heartwood

- [ ] Replace `middleware/rateLimit.ts` with threshold/hono
- [ ] Replace `db/queries.ts` checkRateLimit with ThresholdD1Store
- [ ] Remove rate limit constants from `utils/constants.ts`
- [ ] Update Better Auth customStorage
- [ ] Update all route files
- [ ] Full Heartwood test suite passes

### Phase 4: Migrate remaining

- [ ] Plant username checker
- [ ] OG-Worker
- [ ] Login package comment update

### Phase 5: Cleanup

- [ ] Remove old `server/rate-limits/` directory
- [ ] Update knowledge page
- [ ] Close related issues
- [ ] Update agent memory

---

_Spec created: February 2026_
_For use by: All Grove packages_
_Replaces: threshold-pattern.md (vision doc), threshold-engine-integration.md (completed plan)_
