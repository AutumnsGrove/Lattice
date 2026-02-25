---
title: "Server SDK Migration — From Direct CF to GroveContext"
status: planned
category: infra
---

```
              🌲         🌲         🌲         🌲
               │           │           │           │
               │     ╭─────┴─────╮     │           │
               │     │ Interface │     │           │
               │     ╰─────┬─────╯     │           │
               │           │           │           │
         ┌─────┴───────────┴───────────┴───────────┴─────┐
         │            ░░░░░░░░░░░░░░░░░░░░░              │
         │          ░ GROVE SERVER SDK ░░░                │
         │            ░░░░░░░░░░░░░░░░░░░░░              │
         ├───────────────────────────────────────────────┤
         │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ │
         │  │   D1   │ │   R2   │ │   KV   │ │  Cron  │ │
         │  └───┬────┘ └───┬────┘ └───┬────┘ └───┬────┘ │
         │      │          │          │          │      │
         └──────┼──────────┼──────────┼──────────┼──────┘
                │          │          │          │
         ═══════╧══════════╧══════════╧══════════╧═══════
                     ▒▒▒ bedrock ▒▒▒

        The roots run deep. The tree stands anywhere.
```

# Infra SDK Migration Plan

**Created:** February 25, 2026
**Status:** Planned
**Spec:** `docs/specs/server-sdk-spec.md`
**SDK Location:** `libs/infra/`
**Package:** `@autumnsgrove/infra`

---

## Where We Are

The Infra SDK exists. It's complete, tested, and well-documented. It wraps every
Cloudflare primitive behind clean TypeScript interfaces (GroveDatabase, GroveStorage,
GroveKV, GroveServiceBus, GroveScheduler, GroveConfig). The Cloudflare adapters work.
The test mocks work. The error catalog is wired into Signpost.

**Nobody uses it.**

Every service, every worker, every app in the entire monorepo still reaches straight
into `env.DB`, `env.BUCKET`, `platform.env.AUTH`, etc. The SDK is a bridge built from
both sides that nobody has walked across yet. The spec's Phase 4 ("First Consumer")
never started.

This plan picks up where the spec left off and maps out a realistic, incremental
migration from direct Cloudflare access to `GroveContext`.

---

## Current State: Who Touches What

### Services

| Service | D1 | R2 | KV | DOs | Service Bindings | Cron | Call Sites | Complexity |
|---------|----|----|-----|-----|-----------------|------|------------|------------|
| **Heartwood** | `env.DB`, `env.ENGINE_DB` | `env.CDN_BUCKET` | `env.SESSION_KV` | `env.SESSIONS` (SessionDO) | `env.ZEPHYR` (email gateway) | Yes (keepalive + daily cleanup) | ~80+ across ~27 files | High |
| **Amber** | `env.DB` | `env.R2_BUCKET` | — | `env.EXPORT_JOBS` (ExportJobV2) | `env.AUTH` (Heartwood) | Yes (every 5min + 3AM cleanup) | ~50+ across ~4 files | Medium |
| **Forage** | `env.DB` | — | — | `env.SEARCH_JOB` (SearchJobDO) | — | — | ~40+ (index.ts, job-index.ts) | Medium |
| **Durable Objects** | `env.DB` | — | — | (is DO host) | — | — | ~20 | High (DOs) |

### Workers

| Worker | D1 | R2 | KV | Service Bindings | Cron | Call Sites | Complexity |
|--------|----|----|-----|-----------------|------|------------|------------|
| **lumen** | `env.DB` | — | `env.RATE_LIMITS` | `env.AI`, `env.WARDEN` | — | ~20+ | Medium |
| **warden** | `env.DB` (delegated to routes) | — | — | (is target) | — | ~10 | Low |
| **timeline-sync** | `env.CURIO_DB` | — | — | — | Yes (daily 1AM) | ~10 | Low |
| **meadow-poller** | `env.DB` | — | — | — | Yes (every 15min) | ~15 | Low |
| **webhook-cleanup** | `env.DB` | `env.BUCKET` | — | — | Yes | ~10 | Low |
| **email-catchup** | `env.DB` | — | — | `env.EMAIL_RENDER` | Yes (weekly) | ~20+ | Low |
| **vista-collector** | `env.DB` | — | `env.KV` | — | — | ~5 | Low |
| **patina** | likely D1/KV | — | — | — | Yes | ~30 | Moderate |

### Engine (libs/engine) — The Final Boss

| Layer | Pattern | Files | Complexity |
|-------|---------|-------|------------|
| `hooks.server.ts` | `platform.env.AUTH`, `platform.env.DB` | 1 | Medium |
| `lib/server/db/` | `platform.env.DB` | 2 | Medium (central DB helper) |
| `lib/server/services/` | `platform.env.DB`, `platform.env.BUCKET` | ~5 | Medium |
| API routes (`routes/api/`) | `platform.env.*` (all primitives) | ~40 | High (sheer volume) |
| Arbor routes (`routes/arbor/`) | `platform.env.DB`, `platform.env.AUTH` | ~8 | Medium |
| Feature flags / grafts | `platform.env.DB` | ~5 | Low |

**57 files** in the engine use direct `platform.env.*` access.

### Apps (SvelteKit)

| App | Files Using `platform.env.*` | Primitives | Complexity |
|-----|------------------------------|------------|------------|
| **landing** | ~25 | D1, AUTH, service bindings | High |
| **domains** | ~12 | D1, AUTH, DOs (`SEARCH_JOB` via Forage) | Medium |
| **clearing** | ~5 | D1, KV (`MONITOR_KV`), `ZEPHYR` (email alerts) | Low–Moderate |
| **login** | ~3 | AUTH (proxy) | Low |
| **plant** | ~5 | D1 (Drizzle ORM), AUTH | Low |
| **meadow** | ~2 | Multi-DB (`DB`, `CURIO_DB`, `OBS_DB`), AUTH | Low–Moderate |
| **ivy** | ~2 | D1 (email metadata), AUTH | Low |

**~58 files** across apps use direct `platform.env.*` access.

---

## Why Migrate

The spec already articulates the long-term portability case. But there are three
practical reasons to start now:

1. **Testability.** Direct `env.DB.prepare(...)` calls can't be unit tested without
   miniflare. `ctx.db.execute(...)` can be tested with `createMockContext()` — the
   mock infrastructure already exists and works.

2. **Consistency.** Right now, every worker invents its own DB helper, its own error
   wrapping, its own retry logic. The SDK centralizes this. One place to add
   observability, one place to add error handling.

3. **The SDK is rotting.** A package with zero consumers accumulates drift. The
   interfaces were designed 3 days ago against the current codebase. The longer we
   wait, the more the codebase and the interfaces diverge, and the harder the
   migration becomes.

---

## Migration Strategy

### Principles

- **Incremental, not big-bang.** One consumer at a time. Never migrate more than one
  service in a single PR.
- **Wrap first, replace later.** The first step for any consumer is adding
  `createCloudflareContext()` at the entry point and passing `ctx` alongside `env`.
  Handlers can mix SDK calls with direct calls during transition.
- **No behavior changes.** Migration PRs must be pure refactors. No new features, no
  bug fixes, no cleanups mixed in.
- **Test both paths.** During migration, existing tests must keep passing. New tests
  should use `createMockContext()` to validate the SDK path.
- **Workers first, engine last.** Small, isolated workers are the safest place to prove
  the pattern. The engine (57 files, every primitive) comes last.

### Migration Flow for a Single Consumer

```
Step 1: Add context          Step 2: Thread context        Step 3: Replace calls
(entry point only)           (pass alongside env)          (one primitive at a time)

  ┌─────────┐                ┌─────────┐                   ┌─────────┐
  │ index.ts│                │ index.ts│                   │ index.ts│
  │         │                │         │                   │         │
  │ const   │                │ const   │                   │ ctx.db  │
  │ ctx =   │                │ ctx =   │                   │ ctx.kv  │
  │ create  │                │ create  │                   │ ctx.stor│
  │ CF()    │                │ CF()    │                   │         │
  │         │                │         │                   │ (no more│
  │ env.DB  │ ← still used  │ env.DB  │ ← being replaced │  env.*) │
  └─────────┘                └─────────┘                   └─────────┘
```

---

## Phase Plan

### Phase 0: SDK Health Check

Before migrating anyone, verify the SDK itself is ready.

- [ ] Verify all Cloudflare adapter tests pass
- [ ] Verify `createMockContext()` provides working mocks for all 6 primitives
- [ ] Ensure the SDK builds cleanly with current TypeScript config
- [ ] Confirm `@autumnsgrove/infra` and re-exports via `@autumnsgrove/lattice/infra` resolve correctly
- [ ] Check for any interface mismatches between Infra SDK types and actual D1/R2/KV APIs
  (the SDK was written 3 days ago — subtle mismatches are possible)

**Exit criteria:** Infra SDK is confirmed working, no changes needed to interfaces.

---

### Phase 1: First Blood — webhook-cleanup

**Why this one:** Smallest worker. Uses only D1 + R2. Cron-triggered. No user-facing
latency concerns. If something goes wrong, the worst case is expired exports linger
a bit longer.

**Current state:**
- `env.DB.prepare(...)` for querying/updating expired exports
- `env.BUCKET.delete(...)` for cleaning R2 objects
- Cron-triggered scheduled handler

**Migration steps:**
1. Add `@autumnsgrove/infra` dependency
2. Create `GroveContext` in the scheduled handler entry point
3. Replace `env.DB.prepare(...)` calls with `ctx.db.execute(...)`
4. Replace `env.BUCKET.delete(...)` calls with `ctx.storage.delete(...)`
5. Add mock-based unit tests alongside existing tests
6. Verify in staging

**Estimated scope:** ~10 call sites, single file, ~2 hours of work.

---

### Phase 2: Simple Workers

Migrate the remaining low-complexity workers one at a time.

| Order | Worker | Primitives | Call Sites | Notes |
|-------|--------|------------|------------|-------|
| 2a | **vista-collector** | D1, KV | ~5 | Analytics, low risk |
| 2b | **email-catchup** | D1, `env.EMAIL_RENDER` (service binding) | ~20+ | Weekly cron + email render binding |
| 2c | **meadow-poller** | D1 | ~15 | Feed polling, cron every 15min |
| 2d | **warden** | D1 (delegated to routes) | ~10 | Credential gateway, Hono-based |

**Per-worker migration:** Same flow as Phase 1. One PR per worker. Each PR is a pure
refactor — no behavior changes.

**Exit criteria:** All simple workers use `GroveContext`. Pattern is proven, documented,
and has zero regressions.

---

### Phase 3: Medium Workers

| Order | Worker | Primitives | Call Sites | Notes |
|-------|--------|------------|------------|-------|
| 3a | **timeline-sync** | D1 (`env.CURIO_DB`) | ~10 | Daily cron at 1AM, RSS generation |
| 3b | **patina** | D1/KV (backup state) | ~30 | Status, list, trigger, download routes |
| 3c | **lumen** | D1, KV (`env.RATE_LIMITS`), AI, service bindings (`env.WARDEN`) | ~20+ | Inference gateway, quota mgmt |

**patina note:** Heavier than initially estimated (~30 call sites). Storage-heavy backup
operations with status, list, trigger, and download routes. Needs its own PR.

**lumen note:** The `env.AI` binding (Cloudflare Workers AI) doesn't map cleanly to any
SDK interface. Options:
- Pass `env.AI` through `ctx.config` as a typed config value
- Add `ctx.ai` as a Cloudflare-specific extension to `GroveContext`
- Keep `env.AI` as a direct access alongside `ctx` (pragmatic, avoids over-abstraction)

**Recommendation:** Keep `env.AI` direct. Workers AI is deeply Cloudflare-specific and
the Infra SDK spec explicitly says "Don't abstract things that are naturally Cloudflare-specific."

---

### Phase 4: Services

| Order | Service | Primitives | Call Sites | Complexity | Notes |
|-------|---------|------------|------------|------------|-------|
| 4a | **Forage** | D1, DOs (SearchJobDO via Loom) | ~40+ | Medium | Search jobs, AI agents. Already uses Loom SDK. |
| 4b | **Amber** | D1, R2, DOs (ExportJobV2), service binding (AUTH) | ~50+ | Medium | Export jobs, file ops, auth validation via Heartwood. |
| 4c | **Heartwood** | D1 (x2), R2, KV, DOs (SessionDO), service binding (ZEPHYR), Cron | ~80+ | High | Auth — requires careful testing |

**Forage first:** Already uses Loom SDK for DO communication, making it the cleanest
service to migrate. The ~40 call sites are primarily DO stub fetch() calls (transparent)
and straightforward D1 queries for job indexing.

**Amber second:** ~50+ call sites across ~4 files. R2 operations (get/delete/list) are
straightforward. ExportJobV2 is DO-backed via Loom. The `env.AUTH` service binding for
session validation is a simple fetch() pattern. Cron runs every 5 minutes (export
processing) and at 3 AM UTC (trash/export cleanup).

**Heartwood is the riskiest migration.** ~80+ call sites across ~27 files. It touches
two D1 databases (`env.DB` + `env.ENGINE_DB` with read replication via D1 sessions),
KV (`SESSION_KV`), R2 (`CDN_BUCKET`), Durable Objects (`SessionDO` with SQLite storage,
alarms, and rate limiting), a service binding (`ZEPHYR` for email), and cron triggers
(keepalive every minute + daily audit log cleanup). It's the auth service — any
regression affects every property. This gets its own dedicated testing phase.

**Heartwood migration sub-steps:**
1. Create context in the Hono app entry point
2. Thread `ctx` through Hono middleware (via `c.set('ctx', ctx)`)
3. Migrate `env.DB` queries first (~60+ direct D1 queries — biggest surface, most testable)
4. Migrate `env.ENGINE_DB` access (read replication via `withSession()`)
5. Migrate `env.SESSION_KV` access (session cache get/put)
6. Migrate `env.CDN_BUCKET` R2 access (CDN uploads)
7. Migrate `env.ZEPHYR` service binding (email gateway fetch)
8. Migrate cron handlers (keepalive + audit cleanup)
9. Leave `env.SESSIONS` Durable Object access as-is (SessionDO has deep SQLite
   storage, alarms, and rate limiting — Loom handles DOs, per spec)

---

### Phase 5: Engine (libs/engine)

The big one. 57 files. Every primitive. The engine is the shared SvelteKit library
powering every tenant blog.

**Strategy: Central DB helper first.**

The engine already has `libs/engine/src/lib/server/db/client.ts` which creates a DB
helper from `platform.env.DB`. This is the natural migration point — change the helper
to accept `GroveContext` instead of raw `D1Database`, and every consumer downstream
gets the SDK for free.

**Sub-phases:**
1. **5a:** Migrate `db/client.ts` to use `GroveContext.db` internally
2. **5b:** Migrate `db/helpers.ts` to use Infra SDK types
3. **5c:** Migrate `services/database.ts` (central service layer)
4. **5d:** Migrate API routes (batch by domain: posts, images, auth, export, etc.)
5. **5e:** Migrate Arbor routes
6. **5f:** Migrate feature flags / grafts
7. **5g:** Update `hooks.server.ts` to create `GroveContext` and pass it through

**Exit criteria:** No file in `libs/engine` directly accesses `platform.env.DB`,
`platform.env.BUCKET`, or `platform.env.KV`. The only remaining `platform.env` access
is for `AUTH` (service binding to Heartwood) and Cloudflare-specific bindings (AI, DOs).

---

### Phase 6: Apps

Once the engine is migrated, apps inherit most of the benefit automatically (they
call engine helpers, not raw CF). The remaining work is app-specific server routes.

| Order | App | Files | Notes |
|-------|-----|-------|-------|
| 6a | **login** | ~3 | Just AUTH proxy |
| 6b | **plant** | ~5 | AUTH + passkeys |
| 6c | **ivy** | ~2 | AUTH only |
| 6d | **meadow** | ~2 | AUTH only |
| 6e | **clearing** | ~5 | D1, KV (`MONITOR_KV`), `ZEPHYR` (email alerts) |
| 6f | **domains** | ~12 | D1, AUTH, DOs |
| 6g | **landing** | ~25 | Largest app, last |

---

### Phase 7: Cleanup

- [ ] Remove all direct `D1Database` type imports from non-adapter code
- [ ] Remove all direct `R2Bucket` type imports from non-adapter code
- [ ] Remove all direct `KVNamespace` type imports from non-adapter code
- [ ] Update `AgentUsage/infra_sdk_guide.md` with real migration examples
- [ ] Add a lint rule / eslint plugin that warns on direct CF primitive access
  outside of `libs/infra/src/cloudflare/`

---

## What NOT to Migrate

The Infra SDK spec is clear about scope boundaries. These stay as-is:

- **Durable Objects** — Loom handles DO abstraction. The Infra SDK integrates with
  Loom but doesn't wrap DOs.
- **Workers AI** (`env.AI`) — Deeply Cloudflare-specific. No portable interface exists.
- **Service bindings for auth** (`platform.env.AUTH.fetch()`) — The GroveServiceBus
  interface could wrap this, but the auth integration pattern is already consistent
  and tested. Low value to abstract.
- **Wrangler / dev tooling** — The Infra SDK spec explicitly excludes development workflow.
- **Miniflare in tests** — Integration tests that need real D1/R2 behavior should
  continue using miniflare. The Infra SDK mocks are for unit tests.

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| SDK interface doesn't match real D1 behavior | Medium | High | Phase 0 conformance testing |
| Performance regression from wrapper overhead | Low | Medium | Benchmark before/after per phase |
| Migration fatigue (too many PRs) | Medium | Medium | Batch workers in Phase 2, celebrate milestones |
| Heartwood regression breaks all auth | Low | Critical | Dedicated staging test cycle for Phase 4c |
| Engine migration causes tenant-facing bugs | Low | High | Phase 5 sub-steps, one domain at a time |
| SDK drift during long migration | Medium | Medium | Freeze SDK interfaces after Phase 0 |

---

## Open Questions

1. **Should we add observability hooks to the SDK?** The adapters could emit timing
   metrics and error counts automatically. This would make the migration immediately
   valuable, not just a refactor. But it adds scope.

2. **Should Hono middleware create the context?** For Heartwood (and any future Hono
   services), a middleware that creates `GroveContext` from `c.env` and sets it on
   `c.var` would make every route handler clean. Worth building as a shared pattern?

3. **Should SvelteKit hooks create the context?** For the engine and all apps, the
   `hooks.server.ts` could create `GroveContext` from `platform.env` and attach it to
   `event.locals`. This is the natural injection point for SvelteKit. It would mean
   every `+server.ts` and `+page.server.ts` gets `ctx` from `locals` instead of
   reaching into `platform.env`.

4. **Do we need a partial context?** Some workers only use D1. Should
   `createCloudflareContext()` support partial construction (only db, no storage/kv)?
   The current implementation requires all bindings. Workers that don't use storage
   would need to pass a dummy.

---

## Total Scope

**~300+ direct Cloudflare access points** across the entire monorepo (services, workers,
engine, apps). Breakdown:

- Services: ~170+ (Heartwood ~80, Amber ~50, Forage ~40)
- Workers: ~130+ (lumen ~20, patina ~30, email-catchup ~20, others ~60)
- Engine: ~57 files with `platform.env.*` access
- Apps: ~58 files with `platform.env.*` access

---

## Success Metrics

- **Phase 1 done:** 1 worker fully on SDK, zero regressions
- **Phase 2 done:** All simple workers on SDK (~50 call sites migrated), pattern documented
- **Phase 3 done:** Medium workers on SDK (~60 call sites migrated)
- **Phase 4 done:** All services on SDK (~170 call sites migrated), Heartwood regression-free
- **Phase 5 done:** Engine on SDK, 57 files migrated
- **Phase 6 done:** All apps on SDK, 58 files migrated
- **Phase 7 done:** Lint rule prevents new direct CF access

The migration is complete when `grep -r "env\.DB\|env\.BUCKET\|env\.KV" --include="*.ts"`
returns zero results outside of `libs/infra/src/cloudflare/` and test files.

---

*The roots run deep. The tree stands anywhere.*
