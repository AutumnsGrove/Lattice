# Threshold Engine Integration Plan

**Created:** January 3, 2026
**Updated:** January 4, 2026 (PR feedback incorporated)
**Status:** Ready for Implementation
**Approach:** Workers-only (no Cloudflare WAF)

---

## Current State

| Component                 | Status                    | Location                                               |
| ------------------------- | ------------------------- | ------------------------------------------------------ |
| KV-based `rateLimit()`    | ✅ Implemented            | `libs/engine/src/lib/server/services/cache.ts:392-451` |
| Client-side `RateLimiter` | ✅ Implemented & Exported | `libs/engine/src/lib/groveauth/rate-limit.ts`          |
| Quota UI components       | ✅ Implemented & Exported | `libs/engine/src/lib/components/quota/`                |
| Tier-based config         | ❌ Not implemented        | —                                                      |
| Rate limit middleware     | ❌ Not implemented        | —                                                      |
| Graduated response        | ❌ Not implemented        | —                                                      |
| Server exports            | ❌ Not exported           | `cache.rateLimit` is internal only                     |

---

## Design Decisions

Based on PR review feedback:

1. **Type Layering**: The base `rateLimit()` function keeps its simple return type. Extended fields (`warning`, `banned`) come from the abuse tracking layer, not the core function.

2. **Structured Tier Config**: Tier limits include `windowSeconds` directly to eliminate separate mapping.

3. **Race Conditions**: KV read-modify-write is acceptable for abuse tracking (minor undercounting is fine). Document the limitation.

4. **No Shadow Ban Delays**: Skip `setTimeout` delays in Workers (blocks the Worker). Use warning headers and bans only for now.

5. **Single Import Path**: All rate limiting utilities export from `@autumnsgrove/lattice/server` only. No nested paths.

6. **Fail Open**: Rate limit check failures allow the request (fail open) with logging, not fail closed.

---

## Phased Implementation

### Phase 1: Core Rate Limiting (Tasks 1-6, 8-11)

Provides the essential rate limiting infrastructure.

### Phase 2: Graduated Response (Task 7)

Adds abuse tracking after Phase 1 proves stable.

---

## Integration Tasks

Each task is self-contained and can be executed independently by an agent.

---

### Task 1: Export Server-Side Rate Limiting from Engine

**Goal:** Make `cache.rateLimit()` available to engine consumers via a server utilities module.

**Files to modify:**

- `libs/engine/src/lib/server/index.ts` (create if doesn't exist)
- `libs/engine/package.json` (add export)

**Steps:**

1. Create `libs/engine/src/lib/server/index.ts` with exports:
   ```typescript
   export { rateLimit } from "./services/cache";
   ```
2. Add to `package.json` exports field:
   ```json
   "./server": {
     "types": "./dist/lib/server/index.d.ts",
     "default": "./dist/lib/server/index.js"
   }
   ```
3. Verify build succeeds with `pnpm build`

**Acceptance:** Consumers can `import { rateLimit } from '@autumnsgrove/lattice/server'`

---

### Task 2: Create Tier-Based Rate Limit Configuration

**Goal:** Define tier-based rate limits as a shared configuration with embedded window durations.

**Files to create:**

- `libs/engine/src/lib/server/rate-limits/config.ts`

**Implementation:**

```typescript
/**
 * Tier-based rate limits with embedded window durations.
 * Each category specifies both the limit and the time window.
 */
export const TIER_RATE_LIMITS = {
	seedling: {
		requests: { limit: 100, windowSeconds: 60 },
		writes: { limit: 50, windowSeconds: 3600 },
		uploads: { limit: 10, windowSeconds: 86400 },
		ai: { limit: 25, windowSeconds: 86400 },
	},
	sapling: {
		requests: { limit: 500, windowSeconds: 60 },
		writes: { limit: 200, windowSeconds: 3600 },
		uploads: { limit: 50, windowSeconds: 86400 },
		ai: { limit: 100, windowSeconds: 86400 },
	},
	oak: {
		requests: { limit: 1000, windowSeconds: 60 },
		writes: { limit: 500, windowSeconds: 3600 },
		uploads: { limit: 200, windowSeconds: 86400 },
		ai: { limit: 500, windowSeconds: 86400 },
	},
	evergreen: {
		requests: { limit: 5000, windowSeconds: 60 },
		writes: { limit: 2000, windowSeconds: 3600 },
		uploads: { limit: 1000, windowSeconds: 86400 },
		ai: { limit: 2500, windowSeconds: 86400 },
	},
} as const;

export const ENDPOINT_RATE_LIMITS = {
	"auth/login": { limit: 5, windowSeconds: 300 },
	"auth/token": { limit: 10, windowSeconds: 60 },
	"posts/create": { limit: 10, windowSeconds: 3600 },
	"comments/create": { limit: 20, windowSeconds: 300 },
	"upload/image": { limit: 20, windowSeconds: 3600 },
	"ai/wisp": { limit: 50, windowSeconds: 86400 },
	default: { limit: 100, windowSeconds: 60 },
} as const;

export type SubscriptionTier = keyof typeof TIER_RATE_LIMITS;
export type RateLimitCategory = keyof typeof TIER_RATE_LIMITS.seedling;
export type EndpointKey = keyof typeof ENDPOINT_RATE_LIMITS;
```

**Acceptance:** Configuration is importable and type-safe. No separate category mapping needed.

---

### Task 3: Add RateLimitResult Type to Cache Module

**Goal:** Export a named type for the rate limit return value from cache.ts.

**Files to modify:**

- `libs/engine/src/lib/server/services/cache.ts`

**Changes:**

1. Add type definition above the `rateLimit` function:

   ```typescript
   /** Result from a rate limit check */
   export interface RateLimitResult {
   	allowed: boolean;
   	remaining: number;
   	resetAt: number;
   }
   ```

2. Update the function signature to use the type:
   ```typescript
   export async function rateLimit(
     kv: KVNamespace,
     key: string,
     options: {
       limit: number;
       windowSeconds: number;
       namespace?: string;
     }
   ): Promise<RateLimitResult> {
   ```

**Note:** The base type stays simple. Extended fields (`warning`, `banned`) are added by the abuse tracking layer, not here.

**Acceptance:** Type is exported and function uses it.

---

### Task 4: Create Rate Limit Middleware Helper

**Goal:** Create a reusable middleware function for SvelteKit routes that handles rate limiting with proper headers and error handling.

**Files to create:**

- `libs/engine/src/lib/server/rate-limits/middleware.ts`

**Implementation:**

````typescript
import { json } from "@sveltejs/kit";
import { rateLimit, type RateLimitResult } from "../services/cache";

export interface RateLimitMiddlewareOptions {
	kv: KVNamespace;
	key: string;
	limit: number;
	windowSeconds: number;
	namespace?: string;
}

export interface RateLimitCheckResult {
	result: RateLimitResult;
	response?: Response;
}

/**
 * Check rate limit and return a 429 response if exceeded.
 *
 * Fails open on KV errors (allows request but logs error).
 *
 * @example
 * ```typescript
 * const { result, response } = await checkRateLimit({
 *   kv: platform.env.CACHE,
 *   key: `endpoint:${userId}`,
 *   limit: 10,
 *   windowSeconds: 60,
 * });
 *
 * if (response) return response; // 429 with headers
 * ```
 */
export async function checkRateLimit(
	options: RateLimitMiddlewareOptions,
): Promise<RateLimitCheckResult> {
	let result: RateLimitResult;

	try {
		result = await rateLimit(options.kv, options.key, {
			limit: options.limit,
			windowSeconds: options.windowSeconds,
			namespace: options.namespace,
		});
	} catch (error) {
		// Fail open: allow request if rate limit check fails
		console.error("[rate-limit] KV error, failing open:", error);
		return {
			result: { allowed: true, remaining: options.limit, resetAt: 0 },
		};
	}

	if (!result.allowed) {
		const retryAfter = Math.max(0, result.resetAt - Math.floor(Date.now() / 1000));
		const response = json(
			{
				error: "rate_limited",
				message: "Too many requests. Please try again later.",
				retryAfter,
				resetAt: new Date(result.resetAt * 1000).toISOString(),
			},
			{
				status: 429,
				headers: {
					"Retry-After": String(retryAfter),
					"X-RateLimit-Limit": String(options.limit),
					"X-RateLimit-Remaining": "0",
					"X-RateLimit-Reset": String(result.resetAt),
				},
			},
		);
		return { result, response };
	}

	return { result };
}

/**
 * Generate rate limit headers to add to successful responses.
 */
export function rateLimitHeaders(result: RateLimitResult, limit: number): Record<string, string> {
	return {
		"X-RateLimit-Limit": String(limit),
		"X-RateLimit-Remaining": String(result.remaining),
		"X-RateLimit-Reset": String(result.resetAt),
	};
}
````

**Acceptance:** Middleware can be used in any SvelteKit route with one function call. Fails open on errors.

---

### Task 5: Create Endpoint Rate Limit Helper

**Goal:** Create a helper that automatically looks up endpoint-specific limits based on route path.

**Files to create:**

- `libs/engine/src/lib/server/rate-limits/endpoint.ts`

**Implementation:**

```typescript
import { ENDPOINT_RATE_LIMITS, type EndpointKey } from "./config";

/**
 * Map of method:path patterns to endpoint keys.
 * Extend this as new endpoints are added.
 */
const ENDPOINT_MAP: Record<string, EndpointKey> = {
	"POST:/api/auth/login": "auth/login",
	"POST:/api/auth/token": "auth/token",
	"POST:/api/posts": "posts/create",
	"POST:/api/comments": "comments/create",
	"POST:/api/upload": "upload/image",
	"POST:/api/grove/wisp": "ai/wisp",
};

/**
 * Get rate limit configuration for a given endpoint.
 * Returns default limits if endpoint is not explicitly configured.
 */
export function getEndpointLimit(
	method: string,
	pathname: string,
): { limit: number; windowSeconds: number } {
	const key = `${method}:${pathname}`;
	const endpointKey = ENDPOINT_MAP[key] ?? "default";
	return ENDPOINT_RATE_LIMITS[endpointKey];
}

/**
 * Build a rate limit key from endpoint and identifier.
 */
export function buildRateLimitKey(endpoint: string, identifier: string): string {
	return `${endpoint}:${identifier}`;
}
```

**Acceptance:** Routes can get their rate limit config by passing method + path.

---

### Task 6: Create Tenant Rate Limit Helper

**Goal:** Create a helper for tier-based tenant rate limiting using the structured config.

**Files to create:**

- `libs/engine/src/lib/server/rate-limits/tenant.ts`

**Implementation:**

````typescript
import { rateLimit, type RateLimitResult } from "../services/cache";
import { TIER_RATE_LIMITS, type SubscriptionTier, type RateLimitCategory } from "./config";

/**
 * Check rate limit for a tenant based on their subscription tier.
 *
 * @example
 * ```typescript
 * // In a SvelteKit hook or route
 * const tenantId = event.url.hostname.split('.')[0]; // e.g., 'alice' from alice.grove.place
 * const tier = await getTenantTier(tenantId); // Your tier lookup
 *
 * const result = await checkTenantRateLimit(kv, tenantId, tier, 'writes');
 * if (!result.allowed) {
 *   return json({ error: 'Tenant rate limited' }, { status: 429 });
 * }
 * ```
 */
export async function checkTenantRateLimit(
	kv: KVNamespace,
	tenantId: string,
	tier: SubscriptionTier,
	category: RateLimitCategory,
): Promise<RateLimitResult> {
	const tierConfig = TIER_RATE_LIMITS[tier];
	const categoryConfig = tierConfig[category];

	return rateLimit(kv, `tenant:${tenantId}:${category}`, {
		limit: categoryConfig.limit,
		windowSeconds: categoryConfig.windowSeconds,
		namespace: "tenant-ratelimit",
	});
}

/**
 * Determine the rate limit category for a request based on method and path.
 */
export function categorizeRequest(method: string, pathname: string): RateLimitCategory {
	if (pathname.includes("/api/ai/") || pathname.includes("/api/wisp")) {
		return "ai";
	}
	if (pathname.includes("/api/upload") || pathname.includes("/api/images")) {
		return "uploads";
	}
	if (method === "POST" || method === "PUT" || method === "DELETE") {
		return "writes";
	}
	return "requests";
}
````

**Acceptance:** Tenant-level rate limiting works with subscription tier awareness. No separate category mapping needed.

---

### Task 7: Create Graduated Response System (Phase 2)

**Goal:** Implement abuse tracking with warning → ban escalation (no shadow ban delays).

**Note:** This task is Phase 2. Implement after Phase 1 tasks are stable.

**Limitations:**

- Uses KV with read-modify-write pattern. Minor undercounting under high concurrency is acceptable for abuse tracking.
- No shadow ban delays (would block Worker). Use warnings and bans only.

**Files to create:**

- `libs/engine/src/lib/server/rate-limits/abuse.ts`

**Implementation:**

```typescript
import type { KVNamespace } from "@cloudflare/workers-types";

export interface AbuseState {
	violations: number;
	lastViolation: number;
	bannedUntil: number | null;
}

const VIOLATION_DECAY_SECONDS = 86400; // 24 hours
const BAN_THRESHOLD = 5;
const WARNING_THRESHOLD = 3;
const BAN_DURATION_SECONDS = 86400; // 24 hours

/**
 * Get abuse state for a user.
 * Returns fresh state if violations have decayed (>24h since last violation).
 */
export async function getAbuseState(kv: KVNamespace, userId: string): Promise<AbuseState> {
	const key = `abuse:${userId}`;

	try {
		const data = await kv.get<AbuseState>(key, "json");

		if (!data) {
			return { violations: 0, lastViolation: 0, bannedUntil: null };
		}

		const now = Math.floor(Date.now() / 1000);

		// Decay: reset violations if last violation was > 24h ago
		if (now - data.lastViolation > VIOLATION_DECAY_SECONDS) {
			return { violations: 0, lastViolation: 0, bannedUntil: null };
		}

		return data;
	} catch (error) {
		console.error("[abuse] Failed to get abuse state:", error);
		return { violations: 0, lastViolation: 0, bannedUntil: null };
	}
}

/**
 * Record a rate limit violation and escalate response if needed.
 *
 * Escalation:
 * - 1-2 violations: Warning (X-RateLimit-Warning header)
 * - 3-4 violations: Warning continues
 * - 5+ violations: 24-hour ban
 *
 * Note: Uses read-modify-write pattern. Under high concurrency,
 * violation counts may undercount slightly. This is acceptable
 * for abuse tracking purposes.
 */
export async function recordViolation(
	kv: KVNamespace,
	userId: string,
): Promise<{ warning: boolean; banned: boolean; bannedUntil: number | null }> {
	const state = await getAbuseState(kv, userId);
	const now = Math.floor(Date.now() / 1000);

	const newViolations = state.violations + 1;
	let bannedUntil: number | null = null;

	// Graduated response
	if (newViolations >= BAN_THRESHOLD) {
		bannedUntil = now + BAN_DURATION_SECONDS;
	}

	const newState: AbuseState = {
		violations: newViolations,
		lastViolation: now,
		bannedUntil,
	};

	try {
		await kv.put(`abuse:${userId}`, JSON.stringify(newState), {
			expirationTtl: VIOLATION_DECAY_SECONDS * 2,
		});
	} catch (error) {
		console.error("[abuse] Failed to record violation:", error);
	}

	// Log for monitoring/alerting
	console.log(
		JSON.stringify({
			event: "rate_limit_violation",
			userId,
			violations: newViolations,
			banned: bannedUntil !== null,
			timestamp: new Date().toISOString(),
		}),
	);

	return {
		warning: newViolations < BAN_THRESHOLD,
		banned: bannedUntil !== null,
		bannedUntil,
	};
}

/**
 * Check if a user is currently banned.
 */
export function isBanned(state: AbuseState): boolean {
	if (!state.bannedUntil) return false;
	return Math.floor(Date.now() / 1000) < state.bannedUntil;
}

/**
 * Get remaining ban time in seconds, or 0 if not banned.
 */
export function getBanRemaining(state: AbuseState): number {
	if (!state.bannedUntil) return 0;
	const remaining = state.bannedUntil - Math.floor(Date.now() / 1000);
	return Math.max(0, remaining);
}
```

**Acceptance:** Abuse tracking persists in KV with graduated escalation. Logs violations for monitoring.

---

### Task 8: Create Rate Limits Module Index

**Goal:** Create a clean index file exporting all rate limiting utilities.

**Files to create:**

- `libs/engine/src/lib/server/rate-limits/index.ts`

**Implementation:**

```typescript
// Configuration
export { TIER_RATE_LIMITS, ENDPOINT_RATE_LIMITS } from "./config";
export type { SubscriptionTier, RateLimitCategory, EndpointKey } from "./config";

// Core rate limiting (re-exported from cache for convenience)
export { rateLimit, type RateLimitResult } from "../services/cache";

// Middleware helpers
export { checkRateLimit, rateLimitHeaders } from "./middleware";
export type { RateLimitMiddlewareOptions, RateLimitCheckResult } from "./middleware";

// Endpoint helpers
export { getEndpointLimit, buildRateLimitKey } from "./endpoint";

// Tenant rate limiting
export { checkTenantRateLimit, categorizeRequest } from "./tenant";

// Abuse tracking (graduated response) - Phase 2
export { getAbuseState, recordViolation, isBanned, getBanRemaining } from "./abuse";
export type { AbuseState } from "./abuse";
```

**Acceptance:** All rate limiting utilities available from single import.

---

### Task 9: Update Server Index to Export Rate Limits

**Goal:** Export rate limiting module from the server entry point. This is the only public import path.

**Files to modify:**

- `libs/engine/src/lib/server/index.ts`

**Implementation:**

```typescript
// Rate limiting module - this is the canonical import path
// Use: import { checkRateLimit, TIER_RATE_LIMITS } from '@autumnsgrove/lattice/server'
export * from "./rate-limits/index";
```

**Note:** Do NOT create additional subpath exports like `/server/rate-limits`. Keep one canonical path.

**Acceptance:** `import { checkRateLimit, TIER_RATE_LIMITS } from '@autumnsgrove/lattice/server'` works.

---

### Task 10: Add Server Export to Package.json

**Goal:** Ensure the server subpath export is properly configured.

**Files to modify:**

- `libs/engine/package.json`

**Changes:**

1. Add to `exports` field:

   ```json
   "./server": {
     "types": "./dist/lib/server/index.d.ts",
     "default": "./dist/lib/server/index.js"
   }
   ```

2. Ensure `files` array includes server dist:
   ```json
   "files": [
     "dist",
     "!dist/**/*.test.*"
   ]
   ```

**Acceptance:** Package builds and exports are valid. `pnpm build` succeeds.

---

### Task 11: Update Wisp Route to Use New Middleware

**Goal:** Refactor the existing Wisp rate limiting to use the new middleware helper.

**API Compatibility Note:** This changes the error response format:

- **Old:** `{ "error": "Rate limit exceeded. Try again in an hour.", "resetAt": ... }`
- **New:** `{ "error": "rate_limited", "message": "Too many requests...", "retryAfter": ..., "resetAt": ... }`

The new format is more structured and includes machine-readable `retryAfter`. Update any clients consuming this endpoint.

**Files to modify:**

- `libs/engine/src/routes/api/grove/wisp/+server.ts`

**Changes:**
Replace the rate limiting block (approximately lines 120-134) with:

```typescript
import { checkRateLimit } from "$lib/server/rate-limits";

// In the POST handler, replace existing rate limit code:
if (kv) {
	const { result, response } = await checkRateLimit({
		kv,
		key: `wisp:${locals.user.id}`,
		limit: RATE_LIMIT.maxRequestsPerHour,
		windowSeconds: RATE_LIMIT.windowSeconds,
		namespace: "wisp",
	});

	if (response) return response;
}
```

**Acceptance:** Wisp endpoint uses new middleware. Returns 429 with proper headers when rate limited.

---

### Task 12: Create Rate Limiting Tests

**Goal:** Add comprehensive tests for the new rate limiting utilities.

**Files to create:**

- `libs/engine/src/lib/server/rate-limits/config.test.ts`
- `libs/engine/src/lib/server/rate-limits/abuse.test.ts`
- `libs/engine/src/lib/server/rate-limits/middleware.test.ts`

**Test Framework:** Vitest with miniflare for KV mocking.

**config.test.ts coverage:**

```typescript
describe("TIER_RATE_LIMITS", () => {
	it("all tiers have all categories");
	it("all categories have limit and windowSeconds");
	it("higher tiers have higher limits");
});

describe("ENDPOINT_RATE_LIMITS", () => {
	it("has default fallback");
	it("auth endpoints have stricter limits than default");
});

describe("getEndpointLimit", () => {
	it("returns correct limit for known endpoints");
	it("returns default for unknown endpoints");
});
```

**abuse.test.ts coverage:**

```typescript
describe("getAbuseState", () => {
	it("returns fresh state for new users");
	it("returns stored state within decay window");
	it("resets state after decay period (24h)");
	it("handles KV errors gracefully");
});

describe("recordViolation", () => {
	it("increments violation count");
	it("returns warning for violations 1-4");
	it("returns banned for violation 5+");
	it("sets bannedUntil to 24h from now");
	it("logs violation events");
});

describe("isBanned", () => {
	it("returns false when bannedUntil is null");
	it("returns false when ban has expired");
	it("returns true when ban is active");
});
```

**middleware.test.ts coverage:**

```typescript
describe("checkRateLimit", () => {
	it("allows requests under limit");
	it("returns 429 response when limit exceeded");
	it("includes proper headers in 429 response");
	it("fails open on KV errors");
});

describe("rateLimitHeaders", () => {
	it("returns correct header values");
});
```

**Mock Setup:**

```typescript
import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
// Or use miniflare for local KV simulation
```

**Acceptance:** `pnpm test` passes with new tests. Coverage includes error paths.

---

### Task 13: Add Rate Limiting Documentation

**Goal:** Document the rate limiting API for engine consumers.

**Files to modify:**

- `libs/engine/README.md` (add section)

**Content to add:**

````markdown
## Server-Side Rate Limiting

The engine provides server-side rate limiting utilities for Cloudflare Workers.

### Installation

Rate limiting requires a KV namespace bound to your worker:

```toml
# wrangler.toml
[[kv_namespaces]]
binding = "CACHE"
id = "your-kv-namespace-id"
```
````

### Basic Usage

```typescript
import { checkRateLimit } from "@autumnsgrove/lattice/server";

export async function POST({ request, platform, locals }) {
	const { result, response } = await checkRateLimit({
		kv: platform.env.CACHE,
		key: `endpoint:${locals.user.id}`,
		limit: 10,
		windowSeconds: 60,
	});

	if (response) return response; // 429 with headers

	// Process request...
}
```

### Tier-Based Limits

For multi-tenant applications with subscription tiers:

```typescript
import { checkTenantRateLimit, categorizeRequest } from "@autumnsgrove/lattice/server";

// Determine tenant from request
const tenantId = event.url.hostname.split(".")[0]; // e.g., 'alice' from alice.grove.place
const tier = await getTenantTier(tenantId); // Your tier lookup

// Categorize request type
const category = categorizeRequest(request.method, event.url.pathname);

const result = await checkTenantRateLimit(kv, tenantId, tier, category);
if (!result.allowed) {
	return json({ error: "Rate limit exceeded" }, { status: 429 });
}
```

### Available Tiers

| Tier      | Requests/min | Writes/hour | Uploads/day | AI/day |
| --------- | ------------ | ----------- | ----------- | ------ |
| seedling  | 100          | 50          | 10          | 25     |
| sapling   | 500          | 200         | 50          | 100    |
| oak       | 1,000        | 500         | 200         | 500    |
| evergreen | 5,000        | 2,000       | 1,000       | 2,500  |

### Error Handling

Rate limit checks fail open by default (allow request on KV errors):

```typescript
// The middleware logs errors and allows requests if KV fails
const { result, response } = await checkRateLimit({ ... });
// If KV is unreachable, result.allowed will be true
```

### Response Format

When rate limited, the response includes:

```json
{
	"error": "rate_limited",
	"message": "Too many requests. Please try again later.",
	"retryAfter": 45,
	"resetAt": "2026-01-04T12:00:00.000Z"
}
```

Headers included:

- `Retry-After`: Seconds until limit resets
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining in window
- `X-RateLimit-Reset`: Unix timestamp when window resets

```

**Acceptance:** README includes rate limiting documentation with examples.

---

## Execution Order

**Phase 1 (Core):** Tasks 1-6, 8-11 can be parallelized with dependencies:

```

Task 1 (exports) ──────────────────────────────────────────────────┐
Task 2 (config) ──────────┐ │
Task 3 (types) ───────────┼─→ Task 4 (middleware) ─────────────────┤
│ │
Task 5 (endpoint) ────────┤ ├─→ Task 8 (index)
Task 6 (tenant) ──────────┘ │ │
│ ▼
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

**Phase 2 (Graduated Response):** Task 7 after Phase 1 is stable.

---

## Verification Checklist

### Phase 1 Complete:
- [ ] `pnpm build` succeeds in engine package
- [ ] `pnpm test` passes all new tests
- [ ] Import `@autumnsgrove/lattice/server` works
- [ ] Wisp endpoint returns 429 with proper headers when rate limited
- [ ] Rate limit headers appear in responses
- [ ] KV errors fail open (requests allowed, errors logged)

### Phase 2 Complete:
- [ ] Abuse tracking records violations
- [ ] Users get warnings on violations 1-4
- [ ] Users get banned (24h) on violation 5+
- [ ] Ban state expires correctly
- [ ] Violation decay works (reset after 24h)
```
