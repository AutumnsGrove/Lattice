---
title: "Threshold SDK — Phase 2: Migrate Engine Consumers"
status: planned
category: infra
---

# Threshold SDK — Phase 2: Migrate Engine Consumers

## Context

Phase 1 built the Threshold SDK at `libs/engine/src/lib/threshold/`. Phase 2 migrates all **29 engine-internal files** that import from the old `$lib/server/rate-limits/` system to use the new Threshold SDK instead. The old `rate-limits/` directory stays as a deprecated re-export shim until Phase 5 cleanup.

**What changes:** Every engine route that does `checkRateLimit({ kv, key, ... })` switches to `createThreshold(env) → thresholdCheck(threshold, { key, ... })`. Same behavior, same headers, same status codes.

---

## New Code (2 files created, 1 modified)

### 1. Factory helper: `threshold/factory.ts` (NEW)

```typescript
import { Threshold, ThresholdKVStore } from "./index.js";

export function createThreshold(
  env: { CACHE_KV?: KVNamespace } | undefined,
): Threshold | null {
  const kv = env?.CACHE_KV;
  if (!kv) return null;
  return new Threshold({ store: new ThresholdKVStore(kv) });
}
```

Every route currently does `const kv = platform?.env?.CACHE_KV; if (kv) { ... }`. The factory centralizes this into one null check. Returns `Threshold | null`.

Re-export from `threshold/index.ts`.

### 2. Result helper: add `thresholdCheckWithResult()` to `threshold/adapters/sveltekit.ts` (MODIFIED)

```typescript
export async function thresholdCheckWithResult(
  threshold: Threshold,
  options: Parameters<Threshold["check"]>[0],
): Promise<{ result: ThresholdResult; response?: Response }> {
  const result = await threshold.check(options);
  if (!result.allowed) {
    const response = json(/* same 429 body as thresholdCheck */);
    return { result, response };
  }
  return { result };
}
```

Needed by ~10 routes that attach `rateLimitHeaders()` to success responses. Returns `{ result, response? }` matching the old `checkRateLimit` shape.

### 3. SvelteKit adapter test: update `threshold/adapters/sveltekit.test.ts` (MODIFIED)

Add tests for `thresholdCheckWithResult()` — returns `{ result }` when allowed, `{ result, response }` when denied.

---

## Migration Patterns

### Pattern A — Simple check (19 files)

Most common. Route checks rate limit and returns 429 if denied.

```typescript
// BEFORE
import { checkRateLimit } from "$lib/server/rate-limits/index.js";
const kv = platform?.env?.CACHE_KV;
if (kv) {
  const { response } = await checkRateLimit({
    kv,
    key: `pages/create:${locals.user.id}`,
    limit: 20,
    windowSeconds: 3600,
  });
  if (response) return response;
}

// AFTER
import { createThreshold } from "$lib/threshold/factory.js";
import { thresholdCheck } from "$lib/threshold/adapters/sveltekit.js";
const threshold = createThreshold(platform?.env);
if (threshold) {
  const denied = await thresholdCheck(threshold, {
    key: `pages/create:${locals.user.id}`,
    limit: 20,
    windowSeconds: 3600,
  });
  if (denied) return denied;
}
```

`buildRateLimitKey("a", "b")` is just `` `${a}:${b}` `` — inline it.

### Pattern B — Check + success headers (8 files)

Route needs the `ThresholdResult` to attach headers on success responses.

```typescript
// BEFORE
import {
  checkRateLimit,
  rateLimitHeaders,
  type RateLimitResult,
} from "$lib/server/rate-limits/index.js";
let rateLimitResult: RateLimitResult;
const { result, response } = await checkRateLimit({
  kv,
  key,
  limit,
  windowSeconds,
});
if (response) return response;
rateLimitResult = result;
// ... later ...
return json(data, { headers: rateLimitHeaders(rateLimitResult, limit) });

// AFTER
import { createThreshold } from "$lib/threshold/factory.js";
import {
  thresholdCheckWithResult,
  thresholdHeaders,
} from "$lib/threshold/adapters/sveltekit.js";
import type { ThresholdResult } from "$lib/threshold/types.js";
let rateLimitResult: ThresholdResult;
const { result, response } = await thresholdCheckWithResult(threshold, {
  key,
  limit,
  windowSeconds,
});
if (response) return response;
rateLimitResult = result;
// ... later ...
return json(data, { headers: thresholdHeaders(rateLimitResult, limit) });
```

### Pattern C — Auth with failClosed (5 files)

Add `failMode: "closed"`. Import `getClientIP` from `threshold/adapters/worker.js`, `getEndpointLimitByKey` from `threshold/config.js`.

```typescript
// AFTER
import { getClientIP } from "$lib/threshold/adapters/worker.js";
import { getEndpointLimitByKey } from "$lib/threshold/config.js";
const denied = await thresholdCheck(threshold, {
  key: `auth/callback:${getClientIP(request)}`,
  ...getEndpointLimitByKey("auth/callback"),
  failMode: "closed",
});
```

### Pattern D — Dynamic import in hooks.server.ts (1 file)

```typescript
// BEFORE (line ~609)
const { checkRateLimit, getClientIP, buildRateLimitKey } =
  await import("$lib/server/rate-limits/middleware.js");

// AFTER
const { createThreshold } = await import("$lib/threshold/factory.js");
const { thresholdCheck } = await import("$lib/threshold/adapters/sveltekit.js");
const { getClientIP } = await import("$lib/threshold/adapters/worker.js");
```

### Pattern E — Direct cache.ts rateLimit (oembed, 1 file)

Replace `rateLimit(kv, key, opts)` with `createThreshold` + `thresholdCheck`.

---

## File List (29 consumers + 5 infra files)

### Route files to migrate (26)

| #   | File                                                 | Pattern        | Key imports to replace                                                            |
| --- | ---------------------------------------------------- | -------------- | --------------------------------------------------------------------------------- |
| 1   | `routes/api/grove/wisp/+server.ts`                   | A              | checkRateLimit                                                                    |
| 2   | `routes/api/grove/wisp/fireside/+server.ts`          | A              | checkRateLimit                                                                    |
| 3   | `routes/api/pages/+server.ts`                        | A              | checkRateLimit, buildRateLimitKey                                                 |
| 4   | `routes/api/blooms/+server.ts`                       | A              | checkRateLimit                                                                    |
| 5   | `routes/api/reeds/[slug]/+server.ts`                 | A              | checkRateLimit                                                                    |
| 6   | `routes/api/trace/+server.ts`                        | A              | checkRateLimit, getClientIP                                                       |
| 7   | `routes/api/verify/turnstile/+server.ts`             | A              | checkRateLimit, getClientIP                                                       |
| 8   | `routes/api/images/analyze/+server.ts`               | A              | checkRateLimit                                                                    |
| 9   | `routes/api/images/delete/+server.ts`                | A              | checkRateLimit                                                                    |
| 10  | `routes/api/images/delete-batch/+server.ts`          | A              | checkRateLimit                                                                    |
| 11  | `routes/api/passkey/authenticate/verify/+server.ts`  | A+C            | checkRateLimit, getClientIP, getEndpointLimitByKey, buildRateLimitKey             |
| 12  | `routes/api/billing/+server.ts`                      | B              | checkRateLimit, getEndpointLimitByKey, rateLimitHeaders, RateLimitResult          |
| 13  | `routes/api/git/+server.ts`                          | B              | checkRateLimit, rateLimitHeaders, buildRateLimitKey                               |
| 14  | `routes/api/git/contributions/[username]/+server.ts` | B              | checkRateLimit, rateLimitHeaders, buildRateLimitKey, getClientIP, RateLimitResult |
| 15  | `routes/api/git/stats/[username]/+server.ts`         | B              | checkRateLimit, rateLimitHeaders                                                  |
| 16  | `routes/api/git/user/[username]/+server.ts`          | B              | checkRateLimit, rateLimitHeaders                                                  |
| 17  | `routes/api/export/+server.ts`                       | B              | checkRateLimit, rateLimitHeaders                                                  |
| 18  | `routes/api/export/start/+server.ts`                 | A              | checkRateLimit                                                                    |
| 19  | `routes/api/hum/resolve/+server.ts`                  | B              | checkRateLimit, buildRateLimitKey, getClientIP, rateLimitHeaders                  |
| 20  | `routes/api/settings/avatar/+server.ts`              | B              | checkRateLimit                                                                    |
| 21  | `routes/api/images/upload/+server.ts`                | B              | checkRateLimit                                                                    |
| 22  | `routes/auth/callback/+server.ts`                    | C              | checkRateLimit, buildRateLimitKey, getClientIP, getEndpointLimitByKey             |
| 23  | `routes/auth/magic-link/callback/+server.ts`         | C              | checkRateLimit, buildRateLimitKey, getClientIP, getEndpointLimitByKey             |
| 24  | `routes/api/passkey/authenticate/options/+server.ts` | C              | checkRateLimit, buildRateLimitKey, getClientIP, getEndpointLimitByKey             |
| 25  | `routes/api/lumen/transcribe/+server.ts`             | A (failClosed) | checkRateLimit                                                                    |
| 26  | `routes/api/curios/timeline/generate/+server.ts`     | A (failClosed) | checkRateLimit                                                                    |

### Other source files (3)

| #   | File                                          | Pattern |
| --- | --------------------------------------------- | ------- |
| 27  | `lib/grafts/upgrades/server/api/cultivate.ts` | A       |
| 28  | `lib/grafts/upgrades/server/api/growth.ts`    | A       |
| 29  | `lib/grafts/upgrades/server/api/tend.ts`      | A       |

### Special files (2)

| #   | File                           | Pattern             |
| --- | ------------------------------ | ------------------- |
| 30  | `hooks.server.ts`              | D (dynamic import)  |
| 31  | `routes/api/oembed/+server.ts` | E (direct cache.ts) |

### Infra files (3)

| #   | File                                   | Action                                           |
| --- | -------------------------------------- | ------------------------------------------------ |
| 32  | `lib/server/rate-limits/index.ts`      | Convert to deprecated re-export shim → threshold |
| 33  | `lib/server/rate-limits/middleware.ts` | Convert to deprecated re-export shim → threshold |
| 34  | `lib/server/index.ts`                  | Update re-export to point through shim           |

### Test files (3)

| #   | File                                        | Action                                   |
| --- | ------------------------------------------- | ---------------------------------------- |
| 35  | `lib/grafts/upgrades/upgrades.test.ts`      | Update mocks                             |
| 36  | `routes/api/export/export.test.ts`          | Update mocks                             |
| 37  | `lib/server/rate-limits/middleware.test.ts` | Keep as-is (tests the shim) or deprecate |

Note: `routes/api/curios/timeline/backfill/+server.ts` also uses checkRateLimit — include in batch.

---

## Build Order

### Step 1: Foundation (non-breaking)

1. Create `threshold/factory.ts` with `createThreshold()`
2. Add `thresholdCheckWithResult()` to `threshold/adapters/sveltekit.ts`
3. Re-export `createThreshold` from `threshold/index.ts`
4. Add tests for `thresholdCheckWithResult` in `sveltekit.test.ts`
5. Run threshold tests → all pass
6. **Commit:** `feat(threshold): add factory helper and result-returning check`

### Step 2: Migrate Pattern A routes (simple check) — ~19 files

Mechanical: swap imports, replace `checkRateLimit` with `createThreshold` + `thresholdCheck`, inline `buildRateLimitKey`.

Batch into 2-3 haiku agent passes:

- Batch 2a: wisp, wisp/fireside, pages, blooms, reeds, trace, turnstile (7 files)
- Batch 2b: images/analyze, images/delete, images/delete-batch, cultivate, growth, tend (6 files)
- Batch 2c: export/start, lumen/transcribe, curios/timeline/generate, curios/timeline/backfill (4 files — these add `failMode: "closed"`)

### Step 3: Migrate Pattern B routes (check + headers) — ~8 files

Use `thresholdCheckWithResult` + `thresholdHeaders`. Replace `RateLimitResult` type with `ThresholdResult`.

- Batch 3a: billing, git, git/contributions, git/stats (4 files)
- Batch 3b: git/user, export, hum/resolve, settings/avatar, images/upload (5 files)

### Step 4: Migrate Pattern C routes (auth/failClosed) — 4 files

auth/callback, magic-link/callback, passkey/options, passkey/verify

### Step 5: Migrate special files — 3 files

- hooks.server.ts (dynamic import pattern)
- oembed (direct cache.ts → threshold)
- upgrades.test.ts (update mocks)

### Step 6: Convert old barrel to shim

- `rate-limits/index.ts` → deprecated re-exports from `../../threshold/`
- `rate-limits/middleware.ts` → deprecated re-exports
- Keep `rate-limits/config.ts`, `abuse.ts`, `tenant.ts` source intact (Phase 5 cleanup)

### Step 7: Verify

```bash
cd packages/engine
pnpm run test                              # All tests pass
pnpm run package                           # Engine builds
npx svelte-check --tsconfig ./tsconfig.json # Type check
```

---

## Accepted Behavioral Changes

| Change                                                   | Impact                                       | Acceptable?                          |
| -------------------------------------------------------- | -------------------------------------------- | ------------------------------------ |
| KV key prefix changes (`auth-ratelimit:` → `threshold:`) | In-flight rate limit windows reset on deploy | Yes — windows are short-lived        |
| failClosed returns 429 instead of 503                    | Clients see "retry later" either way         | Yes — no client inspects status code |
| oembed error message changes to Grove standard           | Warmer, brand-aligned message                | Yes                                  |
| `namespace` param dropped                                | Keys already unique via `threshold:` prefix  | Yes                                  |

---

## Critical Source Files

| File                                       | Role                              |
| ------------------------------------------ | --------------------------------- |
| `src/lib/threshold/adapters/sveltekit.ts`  | Add `thresholdCheckWithResult()`  |
| `src/lib/threshold/factory.ts`             | NEW — `createThreshold()` factory |
| `src/lib/threshold/index.ts`               | Re-export factory                 |
| `src/lib/server/rate-limits/index.ts`      | Convert to shim                   |
| `src/lib/server/rate-limits/middleware.ts` | Convert to shim                   |
| `src/routes/api/billing/+server.ts`        | Most complex Pattern B route      |
| `src/routes/auth/callback/+server.ts`      | Reference Pattern C route         |
| `src/hooks.server.ts`                      | Dynamic import pattern            |
