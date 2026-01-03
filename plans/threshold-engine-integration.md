# Threshold Engine Integration Plan

**Created:** January 3, 2026
**Status:** Ready for Implementation
**Approach:** Workers-only (no Cloudflare WAF)

---

## Current State

| Component | Status | Location |
|-----------|--------|----------|
| KV-based `rateLimit()` | ✅ Implemented | `packages/engine/src/lib/server/services/cache.ts:392-451` |
| Client-side `RateLimiter` | ✅ Implemented & Exported | `packages/engine/src/lib/groveauth/rate-limit.ts` |
| Quota UI components | ✅ Implemented & Exported | `packages/engine/src/lib/components/quota/` |
| Tier-based config | ❌ Not implemented | — |
| Rate limit middleware | ❌ Not implemented | — |
| Graduated response | ❌ Not implemented | — |
| Server exports | ❌ Not exported | `cache.rateLimit` is internal only |

---

## Integration Tasks

Each task is self-contained and can be executed independently by an agent.

---

### Task 1: Export Server-Side Rate Limiting from Engine

**Goal:** Make `cache.rateLimit()` available to engine consumers via a server utilities module.

**Files to modify:**
- `packages/engine/src/lib/server/index.ts` (create if doesn't exist)
- `packages/engine/package.json` (add export)

**Steps:**
1. Create `packages/engine/src/lib/server/index.ts` with exports:
   ```typescript
   export { rateLimit } from './services/cache';
   export type { RateLimitResult } from './services/cache';
   ```
2. Add to `package.json` exports:
   ```json
   "./server": {
     "types": "./dist/lib/server/index.d.ts",
     "default": "./dist/lib/server/index.js"
   }
   ```
3. Verify build succeeds with `pnpm build`

**Acceptance:** Consumers can `import { rateLimit } from '@autumnsgrove/groveengine/server'`

---

### Task 2: Create Tier-Based Rate Limit Configuration

**Goal:** Define tier-based rate limits as a shared configuration that matches the Threshold pattern.

**Files to create:**
- `packages/engine/src/lib/server/rate-limits/config.ts`

**Implementation:**
```typescript
export const TIER_RATE_LIMITS = {
  seedling: { requestsPerMin: 100, writesPerHour: 50, uploadsPerDay: 10, aiPerDay: 25 },
  sapling: { requestsPerMin: 500, writesPerHour: 200, uploadsPerDay: 50, aiPerDay: 100 },
  oak: { requestsPerMin: 1000, writesPerHour: 500, uploadsPerDay: 200, aiPerDay: 500 },
  evergreen: { requestsPerMin: 5000, writesPerHour: 2000, uploadsPerDay: 1000, aiPerDay: 2500 },
} as const;

export const ENDPOINT_RATE_LIMITS = {
  'auth/login': { limit: 5, windowSeconds: 300 },
  'auth/token': { limit: 10, windowSeconds: 60 },
  'posts/create': { limit: 10, windowSeconds: 3600 },
  'comments/create': { limit: 20, windowSeconds: 300 },
  'upload/image': { limit: 20, windowSeconds: 3600 },
  'ai/wisp': { limit: 50, windowSeconds: 86400 },
  'default': { limit: 100, windowSeconds: 60 },
} as const;

export type SubscriptionTier = keyof typeof TIER_RATE_LIMITS;
export type EndpointKey = keyof typeof ENDPOINT_RATE_LIMITS;
```

**Acceptance:** Configuration is importable and type-safe.

---

### Task 3: Create Rate Limit Result Type

**Goal:** Define a shared type for rate limit results with optional warning/ban fields for graduated response.

**Files to modify:**
- `packages/engine/src/lib/server/services/cache.ts` (add type export)

**Implementation:**
```typescript
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
  warning?: boolean;
  banned?: boolean;
}
```

**Acceptance:** Type is exported and used by `rateLimit()` function.

---

### Task 4: Create Rate Limit Middleware Helper

**Goal:** Create a reusable middleware function for SvelteKit routes that handles rate limiting with proper headers.

**Files to create:**
- `packages/engine/src/lib/server/rate-limits/middleware.ts`

**Implementation:**
```typescript
import { json } from '@sveltejs/kit';
import { rateLimit } from '../services/cache';
import type { RateLimitResult } from '../services/cache';

export interface RateLimitMiddlewareOptions {
  kv: KVNamespace;
  key: string;
  limit: number;
  windowSeconds: number;
  namespace?: string;
}

export async function checkRateLimit(
  options: RateLimitMiddlewareOptions
): Promise<{ result: RateLimitResult; response?: Response }> {
  const result = await rateLimit(options.kv, options.key, {
    limit: options.limit,
    windowSeconds: options.windowSeconds,
    namespace: options.namespace,
  });

  if (!result.allowed) {
    const response = json(
      {
        error: 'rate_limited',
        message: 'Too many requests. Please try again later.',
        retryAfter: result.resetAt - Math.floor(Date.now() / 1000),
        resetAt: new Date(result.resetAt * 1000).toISOString(),
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(result.resetAt - Math.floor(Date.now() / 1000)),
          'X-RateLimit-Limit': String(options.limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(result.resetAt),
        },
      }
    );
    return { result, response };
  }

  return { result };
}

export function rateLimitHeaders(result: RateLimitResult, limit: number): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(result.resetAt),
  };
}
```

**Acceptance:** Middleware can be used in any SvelteKit route with one function call.

---

### Task 5: Create Endpoint Rate Limit Helper

**Goal:** Create a helper that automatically looks up endpoint-specific limits based on route path.

**Files to create:**
- `packages/engine/src/lib/server/rate-limits/endpoint.ts`

**Implementation:**
```typescript
import { ENDPOINT_RATE_LIMITS, type EndpointKey } from './config';

export function getEndpointLimit(
  method: string,
  pathname: string
): { limit: number; windowSeconds: number } {
  // Map common paths to endpoint keys
  const endpointMap: Record<string, EndpointKey> = {
    'POST:/api/auth/login': 'auth/login',
    'POST:/api/auth/token': 'auth/token',
    'POST:/api/posts': 'posts/create',
    'POST:/api/comments': 'comments/create',
    'POST:/api/upload': 'upload/image',
    'POST:/api/grove/wisp': 'ai/wisp',
  };

  const key = `${method}:${pathname}`;
  const endpointKey = endpointMap[key] ?? 'default';

  return ENDPOINT_RATE_LIMITS[endpointKey];
}

export function buildRateLimitKey(
  endpoint: string,
  identifier: string
): string {
  return `${endpoint}:${identifier}`;
}
```

**Acceptance:** Routes can get their rate limit config by passing method + path.

---

### Task 6: Create Tenant Rate Limit Helper

**Goal:** Create a helper for tier-based tenant rate limiting.

**Files to create:**
- `packages/engine/src/lib/server/rate-limits/tenant.ts`

**Implementation:**
```typescript
import { rateLimit } from '../services/cache';
import { TIER_RATE_LIMITS, type SubscriptionTier } from './config';
import type { RateLimitResult } from '../services/cache';

export type RateLimitCategory = 'requests' | 'writes' | 'uploads' | 'ai';

const CATEGORY_CONFIG: Record<RateLimitCategory, { field: string; windowSeconds: number }> = {
  requests: { field: 'requestsPerMin', windowSeconds: 60 },
  writes: { field: 'writesPerHour', windowSeconds: 3600 },
  uploads: { field: 'uploadsPerDay', windowSeconds: 86400 },
  ai: { field: 'aiPerDay', windowSeconds: 86400 },
};

export async function checkTenantRateLimit(
  kv: KVNamespace,
  tenantId: string,
  tier: SubscriptionTier,
  category: RateLimitCategory
): Promise<RateLimitResult> {
  const tierLimits = TIER_RATE_LIMITS[tier];
  const categoryConfig = CATEGORY_CONFIG[category];
  const limit = tierLimits[categoryConfig.field as keyof typeof tierLimits];

  return rateLimit(kv, `tenant:${tenantId}:${category}`, {
    limit,
    windowSeconds: categoryConfig.windowSeconds,
    namespace: 'tenant-ratelimit',
  });
}

export function categorizRequest(method: string, pathname: string): RateLimitCategory {
  if (pathname.includes('/api/ai/') || pathname.includes('/api/wisp')) {
    return 'ai';
  }
  if (pathname.includes('/api/upload') || pathname.includes('/api/images')) {
    return 'uploads';
  }
  if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
    return 'writes';
  }
  return 'requests';
}
```

**Acceptance:** Tenant-level rate limiting works with subscription tier awareness.

---

### Task 7: Create Graduated Response System

**Goal:** Implement abuse tracking with warning → slowdown → ban escalation.

**Files to create:**
- `packages/engine/src/lib/server/rate-limits/abuse.ts`

**Implementation:**
```typescript
import type { KVNamespace } from '@cloudflare/workers-types';

export interface AbuseState {
  violations: number;
  lastViolation: number;
  shadowBanned: boolean;
  bannedUntil: number | null;
}

const VIOLATION_DECAY_SECONDS = 86400; // 24 hours

export async function getAbuseState(kv: KVNamespace, userId: string): Promise<AbuseState> {
  const key = `abuse:${userId}`;
  const data = await kv.get<AbuseState>(key, 'json');

  if (!data) {
    return { violations: 0, lastViolation: 0, shadowBanned: false, bannedUntil: null };
  }

  const now = Math.floor(Date.now() / 1000);

  // Reset violations if last violation was > 24h ago
  if (now - data.lastViolation > VIOLATION_DECAY_SECONDS) {
    return { violations: 0, lastViolation: 0, shadowBanned: false, bannedUntil: null };
  }

  return data;
}

export async function recordViolation(
  kv: KVNamespace,
  userId: string
): Promise<{ warning: boolean; shadowBanned: boolean; bannedUntil: number | null }> {
  const state = await getAbuseState(kv, userId);
  const now = Math.floor(Date.now() / 1000);

  const newViolations = state.violations + 1;
  let shadowBanned = state.shadowBanned;
  let bannedUntil: number | null = null;

  // Graduated response
  if (newViolations >= 5) {
    bannedUntil = now + 86400; // 24-hour ban
  } else if (newViolations >= 3) {
    shadowBanned = true;
  }

  const newState: AbuseState = {
    violations: newViolations,
    lastViolation: now,
    shadowBanned,
    bannedUntil,
  };

  await kv.put(`abuse:${userId}`, JSON.stringify(newState), {
    expirationTtl: VIOLATION_DECAY_SECONDS * 2,
  });

  return {
    warning: newViolations < 3,
    shadowBanned,
    bannedUntil,
  };
}

export function getShadowBanDelay(state: AbuseState): number {
  if (state.shadowBanned) {
    return 1000 + Math.random() * 2000; // 1-3 second random delay
  }
  return 0;
}

export function isBanned(state: AbuseState): boolean {
  if (!state.bannedUntil) return false;
  return Math.floor(Date.now() / 1000) < state.bannedUntil;
}
```

**Acceptance:** Abuse tracking persists in KV with graduated escalation.

---

### Task 8: Create Rate Limits Module Index

**Goal:** Create a clean index file exporting all rate limiting utilities.

**Files to create:**
- `packages/engine/src/lib/server/rate-limits/index.ts`

**Implementation:**
```typescript
// Configuration
export { TIER_RATE_LIMITS, ENDPOINT_RATE_LIMITS } from './config';
export type { SubscriptionTier, EndpointKey } from './config';

// Core rate limiting
export { rateLimit } from '../services/cache';
export type { RateLimitResult } from '../services/cache';

// Middleware helpers
export { checkRateLimit, rateLimitHeaders } from './middleware';
export type { RateLimitMiddlewareOptions } from './middleware';

// Endpoint helpers
export { getEndpointLimit, buildRateLimitKey } from './endpoint';

// Tenant rate limiting
export { checkTenantRateLimit, categorizRequest } from './tenant';
export type { RateLimitCategory } from './tenant';

// Abuse tracking (graduated response)
export { getAbuseState, recordViolation, getShadowBanDelay, isBanned } from './abuse';
export type { AbuseState } from './abuse';
```

**Acceptance:** All rate limiting utilities available from single import path.

---

### Task 9: Update Server Index to Export Rate Limits

**Goal:** Export rate limiting module from the server entry point.

**Files to modify:**
- `packages/engine/src/lib/server/index.ts`

**Implementation:**
```typescript
// Cache utilities
export { rateLimit } from './services/cache';
export type { RateLimitResult } from './services/cache';

// Rate limiting module
export * from './rate-limits/index';
```

**Acceptance:** `import { checkRateLimit, TIER_RATE_LIMITS } from '@autumnsgrove/groveengine/server'` works.

---

### Task 10: Add Server Export to Package.json

**Goal:** Ensure the server subpath export is properly configured.

**Files to modify:**
- `packages/engine/package.json`

**Changes:**
1. Add to `exports` field:
   ```json
   "./server": {
     "types": "./dist/lib/server/index.d.ts",
     "svelte": "./dist/lib/server/index.js",
     "default": "./dist/lib/server/index.js"
   }
   ```

2. Ensure `files` includes `dist/lib/server/**`

**Acceptance:** Package builds and exports are valid.

---

### Task 11: Update Wisp Route to Use New Middleware

**Goal:** Refactor the existing Wisp rate limiting to use the new middleware helper.

**Files to modify:**
- `packages/engine/src/routes/api/grove/wisp/+server.ts`

**Changes:**
Replace lines 120-134 with:
```typescript
import { checkRateLimit, rateLimitHeaders } from '$lib/server/rate-limits';

// In the POST handler:
if (kv) {
  const { result, response } = await checkRateLimit({
    kv,
    key: `wisp:${locals.user.id}`,
    limit: RATE_LIMIT.maxRequestsPerHour,
    windowSeconds: RATE_LIMIT.windowSeconds,
    namespace: 'wisp',
  });

  if (response) return response;

  // Add rate limit headers to successful response later
}
```

**Acceptance:** Wisp endpoint uses new middleware, behavior unchanged.

---

### Task 12: Create Rate Limiting Tests

**Goal:** Add tests for the new rate limiting utilities.

**Files to create:**
- `packages/engine/src/lib/server/rate-limits/config.test.ts`
- `packages/engine/src/lib/server/rate-limits/abuse.test.ts`

**Test coverage:**
1. Tier configuration validity (all tiers have all fields)
2. Endpoint mapping returns correct limits
3. Abuse state escalation (violations → warning → shadow ban → ban)
4. Violation decay after 24 hours
5. Shadow ban delay range (1-3 seconds)

**Acceptance:** `pnpm test` passes with new tests.

---

### Task 13: Add Rate Limiting Documentation

**Goal:** Document the rate limiting API for engine consumers.

**Files to modify:**
- `packages/engine/README.md` (add section)

**Content:**
```markdown
## Server-Side Rate Limiting

The engine provides server-side rate limiting utilities:

### Basic Usage
\`\`\`typescript
import { checkRateLimit } from '@autumnsgrove/groveengine/server';

const { result, response } = await checkRateLimit({
  kv: platform.env.CACHE,
  key: `endpoint:${userId}`,
  limit: 10,
  windowSeconds: 60,
});

if (response) return response; // 429 with headers
\`\`\`

### Tier-Based Limits
\`\`\`typescript
import { checkTenantRateLimit, TIER_RATE_LIMITS } from '@autumnsgrove/groveengine/server';

const result = await checkTenantRateLimit(kv, tenantId, 'sapling', 'writes');
\`\`\`
```

**Acceptance:** README includes rate limiting documentation.

---

## Execution Order

Tasks can be executed in this order (some can be parallelized):

```
Task 1 (exports) ─────────────────────────────────────────────────┐
Task 2 (config) ──────────┐                                       │
Task 3 (types) ───────────┼─→ Task 4 (middleware) ────────────────┤
                          │                                       │
Task 5 (endpoint) ────────┤                                       │
Task 6 (tenant) ──────────┤                                       ├─→ Task 8 (index)
Task 7 (abuse) ───────────┘                                       │         │
                                                                  │         ▼
                                                                  └─→ Task 9 (server index)
                                                                            │
                                                                            ▼
                                                                      Task 10 (package.json)
                                                                            │
                                                                            ▼
                                                                      Task 11 (refactor wisp)
                                                                            │
                                                                            ▼
                                                                      Task 12 (tests)
                                                                            │
                                                                            ▼
                                                                      Task 13 (docs)
```

---

## Verification Checklist

After all tasks complete:

- [ ] `pnpm build` succeeds in engine package
- [ ] `pnpm test` passes all new tests
- [ ] Import `@autumnsgrove/groveengine/server` works
- [ ] Wisp endpoint still rate limits correctly
- [ ] Rate limit headers appear in 429 responses
- [ ] Graduated response escalates correctly
