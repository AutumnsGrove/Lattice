---
title: Grove Types — Type Safety at Every Boundary
description: Incremental improvements to type safety across the Lattice monorepo, eliminating unsafe casts and duplicated types
category: specs
specCategory: core-infrastructure
icon: shield-check
date created: Sunday, February 22nd 2026
date modified: Sunday, February 22nd 2026
lastUpdated: 2026-02-22
aliases:
  - rootwork
  - type-safety
tags:
  - types
  - typescript
  - validation
  - engine
  - lattice
  - refactor
type: tech-spec
---

# Grove Types: Type Safety at Every Boundary

```
                    ┌─────────────┐
                    │  TypeScript  │
                    │   Compiler   │
                    └──────┬──────┘
                           │ trusts
              ╭────────────┼────────────╮
              │            │            │
         ┌────┴────┐  ┌───┴────┐  ┌───┴─────┐
         │ formData │  │ D1 row │  │ webhook │
         │ .get()   │  │  <T>   │  │ payload │
         └────┬────┘  └───┬────┘  └───┬─────┘
              │            │            │
              ·            ·            ·
           unknown      unknown      unknown
              ·            ·            ·
              ╰────────────┼────────────╯
                           │
                     ╭─────┴─────╮
                     │  as any   │
                     │  230×     │
                     ╰───────────╯

      The compiler trusts the generic. The generic trusts you.
                    You trust... nothing.
```

> _Types compile. Contracts enforce. The difference shows up at 2 AM._

Grove Types is a specification for closing the gap between TypeScript's compile-time type system and the runtime boundaries where data actually enters the monorepo. The codebase has excellent type discipline (zero unconstrained `any` annotations in production code), but ~230 `as any` casts at trust boundaries reveal where TypeScript stops helping and hope begins.

|                       |                                                      |
| --------------------- | ---------------------------------------------------- |
| **Public name**       | Grove Types                                          |
| **Internal codename** | Rootwork                                             |
| **Domain**            | Cross-cutting (all packages)                         |
| **Safari origin**     | [ShipTypes DX Safari](../../safaris/planned/shiptypes-dx-safari.md) |
| **Last Updated**      | February 2026                                        |

### Why "Rootwork"

Roots are invisible infrastructure. They hold the forest together underground, connecting trees through networks you never see. When roots are healthy, the canopy thrives. When they're shallow, the first storm reveals every weakness. Type contracts are the root system of a codebase. This spec is about deepening them.

---

## Overview

### What This Is

A plan for incremental type safety improvements across the Lattice monorepo. Not a rewrite. A series of focused changes that eliminate unsafe casts, unify duplicated types, and add runtime validation where data crosses trust boundaries.

### Goals

- Eliminate `as any` casts at data boundaries (form data, cache reads, API responses, webhook payloads)
- Unify duplicated type definitions between Heartwood and Engine
- Add runtime validation (Zod schemas) at the boundaries that matter most
- Create shared type utilities that make safe patterns easier than unsafe ones
- Preserve the existing type discipline while closing the gaps it can't reach

### Non-Goals (Out of Scope)

- Rewriting the database layer or query builders
- Adding Zod validation to internal function calls (TypeScript handles those fine)
- Changing the Durable Object RPC protocol
- Adding validation to every route (prioritize highest-risk boundaries)
- Migrating away from TypeScript's structural type system

---

## Current State

### The Landscape

The ShipTypes DX Safari surveyed the entire type landscape and found a codebase with strong bones and soft edges.

| Category | Count | Lines | Type Safety |
|----------|-------|-------|-------------|
| Dedicated type files | 47 | 8,716 | Excellent |
| API routes | 227 | 32,860 | Mixed |
| Form actions | 130 | 16,431 | Mixed |
| App.d.ts platform contracts | 11 | 564 | Good |
| Zod schema files | 7 | ~200 | Excellent (but concentrated) |
| `as any` casts | ~230 | — | Needs work |
| `: any` annotations | 0 | — | Excellent |

### Where Type Safety Breaks Down

Type safety is strong inside the codebase. It breaks at the edges, where data enters from outside TypeScript's control.

**Trust boundary categories:**

```
                        TypeScript's jurisdiction
                    ╭─────────────────────────────╮
                    │                             │
  formData.get() ──▶│  Component ── Service ──    │◀── JSON.parse()
                    │      │          │           │
  D1 query <T>  ──▶│  Route ──── Database ──     │◀── cache.get()
                    │      │          │           │
  webhook body  ──▶│  Action ─── Handler ──      │◀── fetch().json()
                    │                             │
                    ╰─────────────────────────────╯
                    ↑                             ↑
                    └──── trust boundaries ────────┘
```

Inside the box, TypeScript ensures correctness. At the arrows, `as any` bridges the gap between "I told TypeScript this is a `User`" and "this is actually a `User`."

---

## Problem Areas

### 1. Duplicated Types (Heartwood ↔ Engine)

Six interfaces are defined identically in both `services/heartwood/src/types.ts` and `libs/engine/src/lib/heartwood/types.ts`. One has a critical mismatch.

| Type | Heartwood | Engine | Status |
|------|-----------|--------|--------|
| `SubscriptionTier` | `"seedling" \| "sapling" \| "evergreen" \| "canopy" \| "platform"` | `Exclude<TierKey, "free">` → `"seedling" \| "sapling" \| "oak" \| "evergreen"` | **MISMATCH** |
| `UserSubscription` | 16 fields | 16 fields (identical) | Duplicated |
| `SubscriptionStatus` | 11 fields | 11 fields (identical) | Duplicated |
| `TokenResponse` | 6 fields | 6 fields (identical) | Duplicated |
| `TokenInfo` | 8 fields | 8 fields (identical) | Duplicated |
| `UserInfo` | `provider: AuthProvider` | `provider: "google" \| "magic_code"` | Minor drift |
| `AuthError` | 2 fields | 3 fields (engine adds `message?`) | Superset |
| `TIER_POST_LIMITS` | Hardcoded record | Derived from tier config | Different sources |

The `SubscriptionTier` mismatch is the most dangerous. Heartwood defines `canopy` and `platform` tiers. Engine defines `oak`. An app importing from the wrong source gets a type that compiles but doesn't match reality.

### 2. Form Data Boundary

SvelteKit form actions receive `FormData`, which returns `FormDataEntryValue | null`. Every field extraction requires a cast or assertion.

**Current pattern** (found across ~130 form actions):
```typescript
export const actions: Actions = {
  update: async ({ request }) => {
    const data = await request.formData();
    const title = data.get("title") as string;        // Could be File, null
    const published = data.get("published") === "on";  // Stringly typed
    const limit = Number(data.get("limit"));           // NaN if missing
  }
};
```

**Desired pattern:**
```typescript
const UpdateSchema = z.object({
  title: z.string().min(1).max(200),
  published: z.coerce.boolean(),
  limit: z.coerce.number().int().positive().optional(),
});

export const actions: Actions = {
  update: async ({ request }) => {
    const raw = Object.fromEntries(await request.formData());
    const data = UpdateSchema.parse(raw);
    // data.title is string. Guaranteed. At runtime.
  }
};
```

### 3. Cache Boundary

Cache reads return parsed JSON with no runtime type guarantee.

**Current pattern** (from `libs/engine/src/routes/(site)/pulse/+page.server.ts`):
```typescript
const activeData = await cache.get<PulseActive>("pulse:active", tenantId);
const active = (activeData as any) ?? { isActive: false };
```

The generic `<PulseActive>` tells TypeScript what shape to expect, but `cache.get` calls `JSON.parse` internally. The cast discards the type to apply a fallback. If the cached data has a different shape, nothing catches it.

### 4. Webhook/External Data Boundary

External service payloads (GitHub webhooks, Stripe events) arrive as untyped JSON.

**Current pattern** (from `services/pulse/src/store.ts`):
```typescript
today.commits += (event.data as any)?.commits ?? 1;
today.linesAdded += (event.data as any)?.additions ?? 0;
today.linesRemoved += (event.data as any)?.deletions ?? 0;
```

Each `as any` is a prayer that GitHub's webhook schema hasn't changed. The safari found 12+ instances of this pattern in the pulse service alone.

### 5. Error Handling Boundary

SvelteKit throws redirect/error objects that don't extend `Error`. Catching them requires unsafe property access.

**Current pattern** (from `apps/login/src/routes/+page.server.ts`):
```typescript
} catch (err) {
  if ((err as any)?.status && (err as any)?.location) throw err;
}
```

A well-known SvelteKit ergonomic gap. A type guard eliminates the cast.

### 6. Library Version Mismatches

Some `as any` casts bridge version mismatches between dependencies.

**Example** (from `services/heartwood/src/auth/index.ts`):
```typescript
d1: {
  db: db as any, // Bridge drizzle-orm version mismatch (0.45 vs 0.44)
}
```

These are legitimate but should be tracked and resolved when versions align.

---

## Architecture

### Type Safety Layers

The fix is layered, not monolithic. Each layer addresses a different boundary.

```
Layer 4: Shared Type Contracts
│  Single source of truth for cross-package types
│  Heartwood types → engine re-exports (no duplication)
│
Layer 3: Runtime Validation Schemas
│  Zod schemas at external boundaries
│  Form data, webhook payloads, API responses
│
Layer 2: Type Utilities
│  Typed wrappers for common unsafe patterns
│  parseFormData(), typedCache.get(), isRedirect()
│
Layer 1: Cast Elimination
│  Replace `as any` with type guards, narrowing, or validation
│  One file at a time. No big bang.
```

### Validation Strategy

Not every boundary needs Zod. The cost of validation varies by context.

```
    High risk, low frequency          High risk, high frequency
    ┌──────────────────────┐          ┌──────────────────────┐
    │  Webhook ingestion   │          │  Form actions        │
    │  External API calls  │          │  API route handlers  │
    │                      │          │                      │
    │  → Full Zod schema   │          │  → Zod with helpers  │
    └──────────────────────┘          └──────────────────────┘

    Low risk, low frequency           Low risk, high frequency
    ┌──────────────────────┐          ┌──────────────────────┐
    │  Admin-only routes   │          │  Internal service     │
    │  Dev tooling         │          │  calls (typed RPC)   │
    │                      │          │                      │
    │  → Type guards only  │          │  → Trust TypeScript  │
    └──────────────────────┘          └──────────────────────┘
```

---

## Implementation

### Phase 1: Unify Duplicated Types

**Priority:** Must Have | **Effort:** Small | **Risk:** Low

The Heartwood service owns the canonical type definitions. Engine re-exports them for consumer convenience. Today, engine has its own copy.

**Steps:**

1. Reconcile `SubscriptionTier`: decide whether `oak`, `canopy`, and `platform` all exist and align both sides
2. Replace engine's duplicated interfaces with re-exports from heartwood
3. Add `AuthError.message?` to heartwood's definition (engine's superset wins)
4. Derive `TIER_POST_LIMITS` from the unified tier config in both locations
5. Update all import paths across consumer apps

**Decision needed:** Where does the canonical `SubscriptionTier` live?

| Option | Approach | Trade-off |
|--------|----------|-----------|
| A: Heartwood owns it | Engine imports from heartwood types package | Requires heartwood to publish types |
| B: Shared `@grove/types` package | New package with zero runtime, types only | Another package to maintain |
| C: Engine owns it, heartwood imports | Engine's tier config is source of truth | Heartwood depends on engine (circular risk) |

**Recommendation:** Option A. Heartwood is the auth service. It defines the subscription contract. Engine re-exports for convenience.

### Phase 2: Type Utilities

**Priority:** Must Have | **Effort:** Small | **Risk:** Low

Create utility functions that make the safe pattern easier than the unsafe one.

**File:** `libs/engine/src/lib/server/utils/type-safety.ts`

```typescript
import { z, type ZodSchema } from "zod";

/** Parse FormData through a Zod schema. Returns typed result or field errors. */
export function parseFormData<T extends ZodSchema>(
  formData: FormData,
  schema: T
): { success: true; data: z.infer<T> }
 | { success: false; errors: Record<string, string[]> } {
  const raw = Object.fromEntries(formData);
  const result = schema.safeParse(raw);
  if (result.success) return { success: true, data: result.data };
  return {
    success: false,
    errors: result.error.flatten().fieldErrors as Record<string, string[]>,
  };
}

/** Type guard for SvelteKit redirect exceptions. */
export function isRedirect(
  err: unknown
): err is { status: number; location: string } {
  return (
    typeof err === "object" && err !== null &&
    "status" in err && "location" in err
  );
}

/** Type guard for SvelteKit HttpError exceptions. */
export function isHttpError(
  err: unknown
): err is { status: number; body: { message: string } } {
  return (
    typeof err === "object" && err !== null &&
    "status" in err && "body" in err
  );
}
```

**File:** `libs/engine/src/lib/server/utils/typed-cache.ts`

```typescript
import { z, type ZodSchema } from "zod";

/** Typed cache reader. Validates on read, falls back on failure. */
export function createTypedCacheReader(cache: CacheService) {
  return {
    async get<T>(
      key: string, tenantId: string,
      schema: ZodSchema<T>, fallback: T
    ): Promise<T> {
      const raw = await cache.get(key, tenantId);
      if (raw === null || raw === undefined) return fallback;
      const result = schema.safeParse(raw);
      return result.success ? result.data : fallback;
    },
  };
}
```

### Phase 3: Form Action Schemas (High-Traffic Routes)

**Priority:** Should Have | **Effort:** Medium | **Risk:** Low

Add Zod validation to the highest-traffic form actions first. Each route is independent.

| Route | Risk | Reason |
|-------|------|--------|
| `arbor/garden/new/+page.server.ts` | High | Creates blog posts |
| `arbor/settings/+page.server.ts` | High | Modifies profile and site settings |
| `plant/checkout/+page.server.ts` | Critical | Handles Stripe checkout flow |
| `plant/profile/+page.server.ts` | Medium | Sets display name during onboarding |
| `curios/*/+page.server.ts` | Medium | Widget configuration (many routes) |

**Pattern for each route:**

1. Define a Zod schema above the action in the same file
2. Replace `formData.get() as string` with `parseFormData(formData, schema)`
3. Return validation errors using SvelteKit's `fail()` helper
4. Remove the `as any` / `as string` casts

### Phase 4: Webhook Validation Schemas

**Priority:** Should Have | **Effort:** Medium | **Risk:** Low

Add Zod schemas for external webhook payloads. Start with pulse (GitHub) and plant (Stripe).

**Pulse store event schema** (for `services/pulse/src/store.ts`):

This validates the pulse store's internal event shape after ingestion, not the raw GitHub push webhook. The raw webhook arrives with a `commits` array of objects; by the time it reaches the store, it's been aggregated into numeric fields.

```typescript
const PulseStoreEvent = z.object({
  commits: z.number().optional().default(1),
  additions: z.number().optional().default(0),
  deletions: z.number().optional().default(0),
  sha: z.string().optional(),
});
```

For the raw GitHub webhook shape (validated at the ingestion boundary), see the [ShipTypes DX Safari](../../safaris/planned/shiptypes-dx-safari.md#webhook-schemas).

Stripe already provides typed event objects via the SDK. Validate the signature (already done) and narrow the event type to access typed fields.

### Phase 5: Cache Boundary Hardening

**Priority:** Could Have | **Effort:** Small per route | **Risk:** Very low

Replace `(cacheData as any) ?? fallback` patterns with the typed cache reader from Phase 2.

**Before:**
```typescript
const active = (activeData as any) ?? { isActive: false };
```

**After:**
```typescript
const active = await typedCache.get(
  "pulse:active", tenantId, PulseActiveSchema, { isActive: false }
);
```

### Phase 6: Version Mismatch Tracking

**Priority:** Could Have | **Effort:** Ongoing | **Risk:** None

Some `as any` casts are legitimate bridges for dependency version mismatches. Don't eliminate these. Track them.

Add a `// ROOTWORK: version-mismatch` comment to each:

```typescript
db: db as any, // ROOTWORK: version-mismatch — drizzle-orm 0.45 vs 0.44
```

This makes them searchable (`grep ROOTWORK: version-mismatch`) and distinguishable from casts that should be eliminated.

---

## Requirements

| ID | Pattern | Requirement | Priority |
|----|---------|-------------|----------|
| RT-001 | Ubiquitous | The monorepo shall have a single canonical definition for each shared type | Must Have |
| RT-002 | Event-Driven | When form data is submitted to a route with a validation schema, the system shall validate all fields before processing | Must Have |
| RT-003 | Unwanted | If cached data fails schema validation, the system shall use the provided fallback value and log a warning | Should Have |
| RT-004 | Ubiquitous | The type utilities shall be importable from `@autumnsgrove/lattice/server` | Must Have |
| RT-005 | Event-Driven | When an external webhook payload arrives, the system shall validate it against a Zod schema before processing | Should Have |
| RT-006 | Ubiquitous | All `as any` casts at trust boundaries shall either be replaced with validation or annotated with a `ROOTWORK:` comment | Could Have |
| RT-007 | Unwanted | If a form data field fails validation, the system shall return field-level errors via SvelteKit's `fail()` helper | Must Have |

---

## Security Considerations

- **Form data validation** prevents injection via unexpected field types (File objects where strings are expected, numeric overflow, missing required fields)
- **Webhook validation** prevents processing of malformed or spoofed payloads that match the type signature but carry unexpected values
- **Cache validation** prevents stale or corrupted cache entries from propagating through the application
- **Type unification** eliminates the risk of logic errors caused by importing incompatible type definitions from different packages
- **No new attack surface.** Validation is additive defense. It does not change how data flows, only whether it's verified before use

---

## Migration Strategy

This is not a flag day. Each phase is independent. Each route is independent within a phase.

```
Week 1-2:  Phase 1 (Unify types) + Phase 2 (Utilities)
           └─ Foundation. Everything else builds on this.

Week 3-4:  Phase 3 (Top 5 form actions)
           └─ Highest-impact routes. Proves the pattern.

Week 5-6:  Phase 4 (Webhook schemas) + Phase 5 (Cache)
           └─ External boundaries. Parallel work.

Ongoing:   Phase 6 (Track version mismatches)
           └─ Comment audit. No code changes.

Remaining: Phase 3 continued (remaining form actions)
           └─ Spread across feature work. Not a dedicated sprint.
```

**Key principle:** Every form action and API route is a self-contained migration. You can add a Zod schema to one route without touching any others. There is no "halfway migrated" state that breaks things. Old routes keep working. New routes get validation. The ratio shifts over time.

---

## Metrics

### Before (Current State)

- ~230 `as any` casts at trust boundaries
- 6 duplicated type definitions across packages
- 1 critical type mismatch (`SubscriptionTier`)
- 7 files with Zod schemas (all in warden/heartwood)
- 0 form actions with runtime validation

### After (Target State)

- <50 `as any` casts (all annotated with `ROOTWORK:` reason)
- 0 duplicated type definitions
- 0 type mismatches across packages
- 20+ files with Zod schemas (spread across high-traffic routes)
- Top 10 form actions with runtime validation

### How to Measure

```bash
# Count remaining as-any casts
rg "as any" --type ts -c libs/ apps/ services/ | sort -t: -k2 -rn

# Count ROOTWORK-annotated casts (legitimate)
rg "ROOTWORK:" --type ts -c

# Count Zod schema files
rg "from ['\"]zod['\"]" --type ts --files-with-matches | wc -l

# Verify no duplicated heartwood types
rg "export (interface|type) (SubscriptionTier|UserSubscription|TokenResponse)" --type ts
```

---

## Implementation Checklist

- [ ] **Phase 1: Unify types**
  - [ ] Reconcile `SubscriptionTier` definition (resolve oak/canopy/platform)
  - [ ] Move canonical types to heartwood, engine re-exports
  - [ ] Align `UserInfo.provider` type
  - [ ] Merge `AuthError.message?` upstream
  - [ ] Unify `TIER_POST_LIMITS` derivation
  - [ ] Update all import paths in consumer apps

- [ ] **Phase 2: Type utilities**
  - [ ] Create `parseFormData()` utility
  - [ ] Create `isRedirect()` / `isHttpError()` type guards
  - [ ] Create `createTypedCacheReader()` wrapper
  - [ ] Export from `@autumnsgrove/lattice/server`
  - [ ] Add tests for each utility

- [ ] **Phase 3: Form action schemas (top 5)**
  - [ ] `arbor/garden/new/+page.server.ts`
  - [ ] `arbor/settings/+page.server.ts`
  - [ ] `plant/checkout/+page.server.ts`
  - [ ] `plant/profile/+page.server.ts`
  - [ ] One curios route (prove the pattern for widgets)

- [ ] **Phase 4: Webhook schemas**
  - [ ] GitHub push/PR event schemas for pulse
  - [ ] Stripe webhook event narrowing for plant

- [ ] **Phase 5: Cache boundary**
  - [ ] Pulse page cache reads
  - [ ] Any other `(cacheData as any)` patterns

- [ ] **Phase 6: Version mismatch tracking**
  - [ ] Annotate drizzle-orm bridge cast in heartwood
  - [ ] Annotate any other legitimate version bridge casts

---

## Related Specifications

- **[Heartwood](heartwood-spec.md)** — Canonical auth types and subscription contracts
- **[Lattice](lattice-spec.md)** — Core framework and engine exports
- **[Testing](testing-spec.md)** — Test strategy (Zod schemas improve testability)
- **[Warden](warden-spec.md)** — Existing Zod validation patterns (reference implementation)

## Related Documentation

- **[ShipTypes DX Safari](../../safaris/planned/shiptypes-dx-safari.md)** — Full survey findings that motivated this spec
- **[Signpost Error Framework](../../patterns/signpost-error-pattern.md)** — Error codes for validation failures

---

*The roots you can't see hold up the trees you can.*
