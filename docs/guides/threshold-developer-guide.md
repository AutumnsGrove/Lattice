---
title: "Threshold Developer Guide"
description: "Rate limiting SDK providing a single interface across every package and framework."
category: guides
guideCategory: operations
lastUpdated: "2026-03-12"
aliases: []
tags:
  - threshold
  - rate-limiting
  - kv
  - cloudflare-workers
---

# Threshold Developer Guide

Threshold is Grove's rate limiting SDK. It provides a single interface for rate limiting across every package, framework, and storage backend in the monorepo. This guide covers how to use it in practice.

For the full architectural spec, see `docs/specs/threshold-spec.md`. For the original vision and layered architecture overview, see `docs/guides/rate-limiting-guide.md`.

## How Threshold works

Threshold enforces rate limits through four layers, each catching a different category of abuse.

**Layer 1: Cloudflare Edge.** WAF rules block volumetric attacks by IP before requests reach Workers. This is configured in the Cloudflare dashboard, not in code. It catches DDoS and spray attacks.

**Layer 2: Tenant fairness.** Each tenant (site) gets rate limits based on their subscription tier. A Wanderer site can make 60 requests/min. An Evergreen site gets 5,000/min. This prevents one tenant's traffic from degrading everyone else.

**Layer 3: User abuse detection.** Per-user tracking with graduated escalation. Violations within a 24-hour decay window accumulate. Repeated violations result in a 24-hour ban.

**Layer 4: Endpoint-specific limits.** Individual endpoints have their own limits tuned to their cost and sensitivity. Auth endpoints are strict (5 login attempts per 5 minutes). General reads are generous (100/min).

These layers are independent. A request can pass tenant limits and still be blocked by endpoint limits. The Threshold SDK handles layers 2-4. Layer 1 is pure Cloudflare config.

---

## The Threshold class

The `Threshold` class is the central API. It wraps a storage backend and provides four levels of rate limit checks.

```typescript
import { Threshold, ThresholdKVStore } from "@autumnsgrove/lattice/threshold";

const threshold = new Threshold({
  store: new ThresholdKVStore(platform.env.CACHE_KV),
  abuseKV: platform.env.CACHE_KV, // optional, for graduated response
});
```

### Core methods

| Method | What it does | Key format |
|--------|-------------|------------|
| `check(options)` | Low-level check with explicit key, limit, window | You define the key |
| `checkTier(tier, category, identifier)` | Looks up limits from tier config automatically | `tier:{tier}:{category}:{identifier}` |
| `checkEndpoint(method, pathname, identifier)` | Maps HTTP method + path to preconfigured limits | `ep:{endpointKey}:{identifier}` |
| `checkTenant(tenantId, tier, method, pathname)` | Combines tier lookup with auto-categorization | `tier:{tier}:{category}:tenant:{tenantId}` |
| `checkWithAbuse(options, userId)` | Core check plus graduated response tracking | Same as `check()`, plus `abuse:{userId}` |

All methods return a `ThresholdResult`:

```typescript
interface ThresholdResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;      // Unix timestamp (seconds)
  retryAfter?: number;  // seconds until reset (only when denied)
}
```

---

## How to add rate limiting to a new endpoint

### Step 1: Pick your framework adapter

Threshold has three framework adapters. Pick the one that matches your service.

| Adapter | Import path | Use for |
|---------|------------|---------|
| SvelteKit | `@autumnsgrove/lattice/threshold/sveltekit` | Engine routes (`+server.ts` files) |
| Hono | `@autumnsgrove/lattice/threshold/hono` | Hono-based workers (Heartwood, Reverie) |
| Worker | `@autumnsgrove/lattice/threshold/worker` | Bare Cloudflare Workers (OG Worker) |

### Step 2: Create a Threshold instance

Use the factory helper. It picks the best available storage backend automatically (DO if available with an identifier, KV as fallback).

```typescript
import { createThreshold } from "$lib/threshold/factory.js";

const threshold = createThreshold(platform?.env, {
  identifier: locals.user?.id,
});
```

If neither `THRESHOLD` (DO binding) nor `CACHE_KV` is available, `createThreshold` returns `null`. Decide how to handle that based on how critical rate limiting is for your endpoint.

### Step 3: Add the check

**SvelteKit pattern** (most common in the engine):

```typescript
import { createThreshold } from "$lib/threshold/factory.js";
import { thresholdCheck } from "$lib/threshold/adapters/sveltekit.js";

export const POST: RequestHandler = async ({ platform, locals }) => {
  const threshold = createThreshold(platform?.env, {
    identifier: locals.user?.id,
  });

  if (threshold) {
    const denied = await thresholdCheck(threshold, {
      key: `wisp:${locals.user.id}`,
      limit: 50,
      windowSeconds: 3600,
      failMode: "closed",
    });
    if (denied) return denied; // returns a 429 Response
  }

  // ... handle request
};
```

`thresholdCheck` returns `null` when the request is allowed and a `Response` (429) when denied. The `if (denied) return denied` pattern keeps things clean.

**Hono middleware pattern** (for workers using Hono):

```typescript
import { thresholdMiddleware } from "@autumnsgrove/lattice/threshold/hono";

app.use("/api/auth/*", thresholdMiddleware({
  threshold,
  limit: 20,
  windowSeconds: 300,
  keyPrefix: "auth",
  getKey: (c) => c.req.header("cf-connecting-ip") ?? null,
  failMode: "closed",
}));
```

The middleware automatically skips rate limiting when `ENVIRONMENT === "test"`. If `getKey` returns `null`, the middleware also skips (useful for optional auth routes).

**Bare Worker pattern** (no framework):

```typescript
import { thresholdCheck, getClientIP } from "@autumnsgrove/lattice/threshold/worker";

export default {
  async fetch(request, env) {
    const threshold = new Threshold({
      store: new ThresholdKVStore(env.CACHE_KV),
    });
    const ip = getClientIP(request);
    const denied = await thresholdCheck(threshold, {
      key: `og:${ip}`,
      limit: 100,
      windowSeconds: 3600,
    });
    if (denied) return denied;
    // ... handle request
  }
};
```

### Step 4: Register the endpoint (if applicable)

If you want your endpoint to work with `checkEndpoint()` auto-detection, add it to two places in `libs/engine/src/lib/threshold/config.ts`:

1. Add an entry to `ENDPOINT_RATE_LIMITS` with the limit and window.
2. Add a mapping in `ENDPOINT_MAP` from `"METHOD:/path"` to the endpoint key.

This is optional. Most endpoints use direct `check()` calls with explicit limits.

---

## The adapter system

All three adapters follow the same pattern: check the rate limit, return a 429 response if denied, continue if allowed. They differ only in how they construct the response.

### SvelteKit adapter

Two helpers are available:

- `thresholdCheck(threshold, options)` returns `Response | null`. Simple early-return pattern.
- `thresholdCheckWithResult(threshold, options)` returns `{ result, response? }`. Use this when you need the `ThresholdResult` to attach rate limit headers to success responses too.

```typescript
import { thresholdCheckWithResult, thresholdHeaders } from "$lib/threshold/adapters/sveltekit.js";

const { result, response } = await thresholdCheckWithResult(threshold, {
  key: `upload/image:${locals.user.id}`,
  limit: 50,
  windowSeconds: 3600,
});
if (response) return response;

// Later, attach headers to the success response:
return json(data, { headers: thresholdHeaders(result, 50) });
```

There is also `createThresholdForUser(env, userId)`, a convenience wrapper around `createThreshold` that handles the DO-first-KV-fallback logic for user-scoped rate limiting.

### Hono adapter

Two options:

- `thresholdMiddleware(options)` is a Hono middleware factory. Apply it to route groups with `app.use()`. It automatically sets `X-RateLimit-*` headers on all responses, not just 429s.
- `thresholdCheck(threshold, keyPrefix, keyPart, limit, windowSeconds)` is a lower-level inline check for when middleware is too coarse.

### Worker adapter

- `thresholdCheck(threshold, options)` returns `Response | null`, same pattern as SvelteKit.
- `getClientIP(request)` extracts the client IP from Cloudflare headers. It trusts `CF-Connecting-IP` first (set by Cloudflare's edge, cannot be spoofed), falling back to `X-Forwarded-For` and `X-Real-IP` for local dev.

---

## Storage backends

Threshold has three storage backends. All implement the same `ThresholdStore` interface.

### KV store (default)

```typescript
import { ThresholdKVStore } from "@autumnsgrove/lattice/threshold";

const store = new ThresholdKVStore(env.CACHE_KV);
```

KV is the default storage backend. Fast, globally distributed, eventually consistent. Good enough for most rate limits.

**How counters work in KV.** Each rate limit key maps to a JSON blob: `{ count: number, resetAt: number }`. On each check, Threshold reads the blob, checks the count against the limit, and writes an incremented count back. The KV entry uses `expirationTtl` set to the remaining window time, so expired entries are automatically cleaned up.

**Key format.** The full key is `${namespace}:${options.key}`, where namespace defaults to `"threshold"`. For example, a wisp rate limit for user `abc123` becomes `threshold:wisp:abc123`.

**Trade-off.** KV uses read-modify-write, so under high concurrency, counts can undercount slightly. Two simultaneous requests might both read `count: 4`, both write `count: 5`, and the user gets one extra request through. This is acceptable for protective rate limits.

### D1 store

```typescript
import { ThresholdD1Store } from "@autumnsgrove/lattice/threshold";

const store = new ThresholdD1Store(env.DB);
```

Strongly consistent. Uses a single atomic `INSERT ON CONFLICT ... RETURNING` statement, so there are no race conditions. Requires a `rate_limits` table:

```sql
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  window_start INTEGER NOT NULL
);
```

Use D1 for auth endpoints and billing-sensitive operations where precision matters. D1 entries do not auto-expire, so old rows accumulate. They are harmless (the window check resets them), but keep this in mind for very large deployments.

### DO store (preferred when available)

```typescript
import { ThresholdDOStore } from "@autumnsgrove/lattice/threshold";

const store = new ThresholdDOStore(env.THRESHOLD, userId);
```

Durable Object storage gives strong consistency with per-identifier isolation. Each identifier gets its own DO instance with a private SQLite database. Zero shared-state contention. The `createThreshold` factory selects this automatically when a `THRESHOLD` binding and identifier are both available.

### Choosing a backend

| Backend | Consistency | Latency | Auto-cleanup | Use for |
|---------|------------|---------|-------------|---------|
| KV | Eventual | Low (global) | Yes (TTL) | General limits, uploads, reads |
| D1 | Strong | Medium (central) | No | Auth, billing, security-critical |
| DO | Strong | Low (colocated) | Yes (per-DO) | Per-user isolation, high precision |

The factory helper (`createThreshold`) makes the choice for you: DO if available with an identifier, KV as fallback, `null` if neither is available.

---

## Tier-based limits

Rate limits scale with subscription tiers. Tier config lives in `libs/engine/src/lib/config/tiers.ts`, and Threshold reads from it directly. Four categories of rate limits are defined per tier:

| Tier | Requests/min | Writes/hour | Uploads/day | AI calls/day |
|------|-------------|-------------|-------------|-------------|
| Wanderer (free) | 60 | 20 | 5 | 0 |
| Seedling ($8/mo) | 100 | 50 | 10 | 25 |
| Sapling ($12/mo) | 500 | 200 | 50 | 100 |
| Oak ($25/mo) | 1,000 | 500 | 200 | 500 |
| Evergreen ($35/mo) | 5,000 | 2,000 | 1,000 | 2,500 |

To check a tier-based limit:

```typescript
const result = await threshold.checkTier("seedling", "writes", userId);
```

The `checkTenant` method combines tier lookup with automatic request categorization. Given a method and path, it figures out whether the request is a read, write, upload, or AI call:

```typescript
const result = await threshold.checkTenant(tenantId, "seedling", "POST", "/api/posts");
// Categorized as "writes" automatically
```

Categorization rules (from `categorizeRequest()`):
- Paths starting with `/api/ai/`, `/api/wisp`, or `/api/grove/wisp` are `"ai"`.
- Paths starting with `/api/upload`, `/api/images`, or `/api/cdn` are `"uploads"`.
- POST, PUT, PATCH, DELETE methods are `"writes"`.
- Everything else is `"requests"`.

---

## Graduated response

When `abuseKV` is configured, Threshold tracks rate limit violations per user and escalates its response over time.

### How it works

Use `checkWithAbuse()` instead of `check()` to enable this:

```typescript
const threshold = new Threshold({
  store: new ThresholdKVStore(env.CACHE_KV),
  abuseKV: env.CACHE_KV,
});

const result = await threshold.checkWithAbuse(
  { key: `posts:${userId}`, limit: 10, windowSeconds: 3600 },
  userId,
);

if (!result.allowed) {
  if (result.banned) {
    // User is banned for 24 hours
  } else if (result.warning) {
    // User is getting close to a ban, add X-RateLimit-Warning header
  }
}
```

### Escalation timeline

```
Violations 1-4:   Rate limit denied + warning flag
Violation 5+:     24-hour ban
After 24 hours of no violations:  Violation count resets to 0
```

There are no shadow bans or artificial delays. Workers have execution time limits, so adding intentional delays would block the Worker.

### Abuse state storage

Abuse state is stored in KV under the key `abuse:{userId}`. Each entry contains:

```json
{
  "violations": 3,
  "lastViolation": 1710288000,
  "bannedUntil": null
}
```

KV entries auto-expire via `expirationTtl` (set to 2x the decay window). No manual cleanup is needed. The eventual consistency of KV means violation counts might undercount slightly under high concurrency, which is fine for abuse tracking.

### Admin actions

To clear a user's abuse state (admin tool):

```typescript
await threshold.clearAbuse(userId);
```

---

## Fail modes

Every rate limit check accepts a `failMode` option that controls behavior when storage is unreachable.

| Mode | What happens on storage error | Use for |
|------|------------------------------|---------|
| `"open"` (default) | Allow the request, log a warning | General endpoints, reads, uploads |
| `"closed"` | Deny with 503 | Auth, password reset, AI (expensive) |

Auth endpoints automatically use `failMode: "closed"` when checked through `checkEndpoint()`. This is determined by the endpoint key starting with `"auth/"`.

For AI endpoints where every request costs money, use `failMode: "closed"` explicitly:

```typescript
const denied = await thresholdCheck(threshold, {
  key: `wisp:${locals.user.id}`,
  limit: 50,
  windowSeconds: 3600,
  failMode: "closed",
});
```

If `createThreshold` returns `null` and you need fail-closed behavior, reject the request yourself:

```typescript
const threshold = createThreshold(platform?.env, { identifier: locals.user?.id });
if (!threshold) {
  return json({ error: "Service temporarily unavailable" }, { status: 503 });
}
```

---

## Response headers

All adapters set consistent rate limit headers on responses:

| Header | Present on | Description |
|--------|-----------|-------------|
| `X-RateLimit-Limit` | Success + 429 | Maximum requests in the window |
| `X-RateLimit-Remaining` | Success + 429 | Requests remaining in the window |
| `X-RateLimit-Reset` | Success + 429 | Unix timestamp when the window resets |
| `Retry-After` | 429 only | Seconds until the client should retry |

All 429 responses use this JSON body shape:

```json
{
  "error": "rate_limited",
  "message": "You're moving faster than we can keep up! Take a moment and try again soon.",
  "retryAfter": 45,
  "resetAt": "2026-02-15T12:00:00.000Z"
}
```

The Hono adapter also includes `retry_after` (snake_case) for backwards compatibility with existing Heartwood clients.

---

## RSS feed rate limiting

Threshold includes a specialized module for RSS feeds (`rss.ts`). It classifies feed clients by User-Agent and applies different limits:

| Classification | Limit | Window | Examples |
|---------------|-------|--------|----------|
| `known-reader` | 600 | 1 hour | Feedly, NetNewsWire, Miniflux |
| `unknown` | 60 | 1 hour | Generic HTTP clients |
| `suspicious` | 10 | 1 hour | Empty User-Agent, bot-like patterns |
| `blocked` | N/A | N/A | GPTBot, ClaudeBot, AI scrapers (403) |

Known AI scrapers get a 403 XML response. Rate-limited clients get a 429 XML response. The RSS module uses `failMode: "open"` because feed availability matters more than rate limiting precision.

---

## Why things break

### KV latency spikes

KV reads occasionally spike to 200ms+ in regions far from the nearest Cloudflare data center. Rate limit checks add this latency to every request. If you see p99 latency increases, check whether KV is the bottleneck. The DO store avoids this by colocating state with the user.

### Misconfigured limits

The most common mistake is setting limits too low during development and forgetting to adjust them. The `ENDPOINT_RATE_LIMITS` in `config.ts` has sensible defaults, but inline `check()` calls with hardcoded limits are easy to forget.

### Tenant vs user confusion

Tenant rate limits (`checkTenant`) protect per-site fairness. User rate limits (`check` with a user ID key) protect per-user fairness. Mixing these up means either (a) one abusive user can exhaust an entire tenant's quota, or (b) legitimate users on a quiet site hit limits that were meant for cross-tenant fairness.

When protecting an endpoint, consider which identity matters. An upload limit should usually be per-user (one user should not fill the site's storage). A general request limit should be per-tenant (the site as a whole should not overwhelm the system).

### Null threshold

`createThreshold` returns `null` when no storage backend is available. This happens in local development without KV bindings, or in test environments. If your code does not handle this case, rate limiting silently disappears.

The pattern is: check for `null`, then decide whether to fail open (skip rate limiting) or fail closed (reject the request).

### Window alignment

KV-backed windows start from the first request, not from clock boundaries. Two users making their first request at different times have different window start times. This is expected behavior. It means there is no "thundering herd" effect at window boundaries, which is good.

---

## Error codes

Threshold errors use the `GROVE-THRESHOLD-XXX` prefix.

| Range | Category | Examples |
|-------|----------|---------|
| 001-019 | Storage and infrastructure | KV unavailable, D1 unavailable, storage read/write failures |
| 020-039 | Rate limiting responses | Rate limited (general, auth, upload, AI, tenant) |
| 040-059 | Abuse and ban enforcement | Abuse warning, user banned, abuse state errors |
| 060-079 | Configuration and usage | Unknown endpoint, invalid tier |
| 080-099 | Internal | Unhandled errors |

Use `logThresholdError` for structured error logging:

```typescript
import { THRESHOLD_ERRORS, logThresholdError } from "@autumnsgrove/lattice/threshold";

logThresholdError(THRESHOLD_ERRORS.KV_UNAVAILABLE, {
  key: "wisp:abc123",
  store: "kv",
  failMode: "closed",
});
```

---

## Testing

Threshold provides test utilities in `test-utils.ts`:

```typescript
import { createMockKV, createMockD1, createMockStore } from "@autumnsgrove/lattice/threshold";
```

- `createMockKV()` returns an in-memory KV backed by a Map. Supports `get`, `put`, `delete`.
- `createMockD1()` returns a mock D1 that handles the atomic `INSERT ON CONFLICT RETURNING` pattern.
- `createMockStore()` returns a minimal `ThresholdStore` backed by a Map. Use this when testing the Threshold class or adapters without caring about storage internals.

```typescript
import { Threshold } from "@autumnsgrove/lattice/threshold";
import { createMockStore } from "@autumnsgrove/lattice/threshold";

const store = createMockStore();
const threshold = new Threshold({ store });

const result = await threshold.check({
  key: "test:user123",
  limit: 5,
  windowSeconds: 60,
});
expect(result.allowed).toBe(true);
expect(result.remaining).toBe(4);
```

---

## Key files

| File | Purpose |
|------|---------|
| `libs/engine/src/lib/threshold/types.ts` | Core types: `ThresholdResult`, `ThresholdCheckOptions`, `ThresholdStore` |
| `libs/engine/src/lib/threshold/threshold.ts` | `Threshold` class with `check`, `checkTier`, `checkEndpoint`, `checkTenant`, `checkWithAbuse` |
| `libs/engine/src/lib/threshold/config.ts` | `ENDPOINT_RATE_LIMITS` and `ENDPOINT_MAP` (single source of truth for endpoint limits) |
| `libs/engine/src/lib/threshold/factory.ts` | `createThreshold` factory (DO-first, KV-fallback) |
| `libs/engine/src/lib/threshold/abuse.ts` | Graduated response: `getAbuseState`, `recordViolation`, `isBanned`, `clearAbuseState` |
| `libs/engine/src/lib/threshold/errors.ts` | `THRESHOLD_ERRORS` catalog and `logThresholdError` helper |
| `libs/engine/src/lib/threshold/rss.ts` | RSS feed client classification and rate limiting |
| `libs/engine/src/lib/threshold/stores/kv.ts` | `ThresholdKVStore` (default, eventually consistent) |
| `libs/engine/src/lib/threshold/stores/d1.ts` | `ThresholdD1Store` (strongly consistent, atomic) |
| `libs/engine/src/lib/threshold/stores/do.ts` | `ThresholdDOStore` (per-identifier Durable Object isolation) |
| `libs/engine/src/lib/threshold/adapters/sveltekit.ts` | SvelteKit helpers: `thresholdCheck`, `thresholdCheckWithResult`, `thresholdHeaders` |
| `libs/engine/src/lib/threshold/adapters/hono.ts` | Hono middleware factory and inline check |
| `libs/engine/src/lib/threshold/adapters/worker.ts` | Bare Worker helpers: `thresholdCheck`, `getClientIP` |
| `libs/engine/src/lib/threshold/test-utils.ts` | Mock KV, D1, and ThresholdStore for tests |
| `libs/engine/src/lib/threshold/index.ts` | Barrel export |
| `libs/engine/src/lib/config/tiers.ts` | Tier-based rate limits (single source of truth for `checkTier`) |

---

## Quick checklist: adding rate limiting to a new endpoint

1. Decide whether to limit by user ID, tenant ID, IP, or some combination.
2. Pick `failMode`: `"closed"` for auth, AI, and billing. `"open"` for everything else.
3. Create the Threshold instance with `createThreshold(platform?.env, { identifier })`.
4. Handle the `null` case (no storage available).
5. Import the right adapter (`sveltekit`, `hono`, or `worker`).
6. Call `thresholdCheck` (or `thresholdMiddleware` for Hono) with a descriptive key, limit, and window.
7. If using `thresholdCheckWithResult`, attach `thresholdHeaders` to success responses too.
8. If the endpoint is sensitive enough for abuse tracking, use `checkWithAbuse()` with `abuseKV`.
9. If other routes should auto-detect this endpoint, add entries to `ENDPOINT_RATE_LIMITS` and `ENDPOINT_MAP` in `config.ts`.
10. Write tests using `createMockStore()` or `createMockKV()`.

---

## Further reading

- `docs/specs/threshold-spec.md` for the full technical specification, migration plan, and design decisions.
- `docs/patterns/threshold-pattern.md` for the original four-layer architecture vision.
- `docs/guides/rate-limiting-guide.md` for the earlier step-by-step guide (covers Cloudflare WAF setup and monitoring).
