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

# Server SDK Migration Plan

**Created:** February 25, 2026
**Status:** Planned
**Spec:** `docs/specs/server-sdk-spec.md`
**SDK Location:** `libs/server-sdk/`
**Package:** `@autumnsgrove/server-sdk`

---

## Where We Are

The Server SDK exists. It's complete, tested, and well-documented. It wraps every
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
| **Heartwood** | `env.DB`, `env.ENGINE_DB` | `env.CDN_BUCKET` | `env.SESSION_KV` | `env.SESSIONS` | — | Yes (keepalive + cleanup) | ~40+ | High |
| **Amber** | `env.DB` | `env.BUCKET` | — | (ExportDO in separate pkg) | — | — | ~15 | Medium |
| **Forage** | `env.DB` | — | — | `env.SEARCH_JOB` | — | — | ~10 | Medium |
| **Durable Objects** | `env.DB` | — | — | (is DO host) | — | — | ~20 | High (DOs) |

### Workers

| Worker | D1 | R2 | KV | Service Bindings | Cron | Call Sites | Complexity |
|--------|----|----|-----|-----------------|------|------------|------------|
| **lumen** | `env.DB` | — | — | `env.AI`, `env.WARDEN` | — | ~15 | Medium |
| **warden** | — | — | — | (is target) | — | ~5 | Low |
| **timeline-sync** | `env.DB` | — | — | — | Yes | ~10 | Medium |
| **meadow-poller** | `env.DB` | — | — | — | Yes | ~10 | Medium |
| **webhook-cleanup** | `env.DB` | `env.BUCKET` | — | — | Yes | ~10 | Low |
| **email-catchup** | `env.DB` | — | — | service bindings | Yes | ~10 | Low |
| **vista-collector** | `env.DB` | — | `env.KV` | — | — | ~5 | Low |
| **patina** | — | — | — | — | — | ~3 | Low |

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
| **domains** | ~12 | D1, AUTH, DOs (SEARCH_JOB) | Medium |
| **clearing** | ~5 | D1, AUTH | Low |
| **login** | ~3 | AUTH (proxy) | Low |
| **plant** | ~5 | AUTH | Low |
| **meadow** | ~2 | AUTH | Low |
| **ivy** | ~2 | AUTH | Low |

**58 files** across apps use direct `platform.env.*` access.

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
- [ ] Confirm `@autumnsgrove/lattice/infra` re-exports resolve correctly
- [ ] Check for any interface mismatches between SDK types and actual D1/R2/KV APIs
  (the SDK was written 3 days ago — subtle mismatches are possible)

**Exit criteria:** SDK is confirmed working, no changes needed to interfaces.

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
1. Add `@autumnsgrove/server-sdk` dependency
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
| 2b | **patina** | minimal | ~3 | Smallest possible |
| 2c | **email-catchup** | D1, service bindings | ~10 | Cron + email render binding |
| 2d | **meadow-poller** | D1 | ~10 | Feed polling, cron |

**Per-worker migration:** Same flow as Phase 1. One PR per worker. Each PR is a pure
refactor — no behavior changes.

**Exit criteria:** All simple workers use `GroveContext`. Pattern is proven, documented,
and has zero regressions.

---

### Phase 3: Medium Workers

| Order | Worker | Primitives | Call Sites | Notes |
|-------|--------|------------|------------|-------|
| 3a | **timeline-sync** | D1, secrets | ~10 | SecretsManager uses env.DB |
| 3b | **lumen** | D1, AI, service bindings | ~15 | Inference gateway, quota mgmt |

**lumen note:** The `env.AI` binding (Cloudflare Workers AI) doesn't map cleanly to any
SDK interface. Options:
- Pass `env.AI` through `ctx.config` as a typed config value
- Add `ctx.ai` as a Cloudflare-specific extension to `GroveContext`
- Keep `env.AI` as a direct access alongside `ctx` (pragmatic, avoids over-abstraction)

**Recommendation:** Keep `env.AI` direct. Workers AI is deeply Cloudflare-specific and
the spec explicitly says "Don't abstract things that are naturally Cloudflare-specific."

---

### Phase 4: Services

| Order | Service | Primitives | Complexity | Notes |
|-------|---------|------------|------------|-------|
| 4a | **Amber** | D1, R2 | Medium | Export jobs, file ops |
| 4b | **Forage** | D1, DOs | Medium | Search jobs, AI agents |
| 4c | **Heartwood** | D1 (x2), R2, KV, DOs, Cron | High | Auth — requires careful testing |

**Heartwood is the riskiest migration.** It touches two D1 databases, KV, R2, Durable
Objects, and cron triggers. It's the auth service — any regression affects every
property. This gets its own dedicated testing phase.

**Heartwood migration sub-steps:**
1. Create context in the Hono app entry point
2. Thread `ctx` through Hono middleware (via `c.set('ctx', ctx)`)
3. Migrate DB queries first (biggest surface, most testable)
4. Migrate KV access (session cache)
5. Migrate R2 access (CDN uploads)
6. Migrate cron handlers
7. Leave Durable Object access as-is (Loom handles DOs, per spec)

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
2. **5b:** Migrate `db/helpers.ts` to use SDK types
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
| 6e | **clearing** | ~5 | D1 + AUTH |
| 6f | **domains** | ~12 | D1, AUTH, DOs |
| 6g | **landing** | ~25 | Largest app, last |

---

### Phase 7: Cleanup

- [ ] Remove all direct `D1Database` type imports from non-adapter code
- [ ] Remove all direct `R2Bucket` type imports from non-adapter code
- [ ] Remove all direct `KVNamespace` type imports from non-adapter code
- [ ] Update `AgentUsage/server_sdk_guide.md` with real migration examples
- [ ] Add a lint rule / eslint plugin that warns on direct CF primitive access
  outside of `libs/server-sdk/src/cloudflare/`

---

## What NOT to Migrate

The spec is clear about scope boundaries. These stay as-is:

- **Durable Objects** — Loom handles DO abstraction. The Server SDK integrates with
  Loom but doesn't wrap DOs.
- **Workers AI** (`env.AI`) — Deeply Cloudflare-specific. No portable interface exists.
- **Service bindings for auth** (`platform.env.AUTH.fetch()`) — The GroveServiceBus
  interface could wrap this, but the auth integration pattern is already consistent
  and tested. Low value to abstract.
- **Wrangler / dev tooling** — The spec explicitly excludes development workflow.
- **Miniflare in tests** — Integration tests that need real D1/R2 behavior should
  continue using miniflare. The SDK mocks are for unit tests.

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

## Success Metrics

- **Phase 1 done:** 1 worker fully on SDK, zero regressions
- **Phase 2 done:** All simple workers on SDK, pattern documented
- **Phase 4 done:** All services on SDK, Heartwood regression-free
- **Phase 5 done:** Engine on SDK, 57 files migrated
- **Phase 7 done:** Lint rule prevents new direct CF access

The migration is complete when `grep -r "env\.DB\|env\.BUCKET\|env\.KV" --include="*.ts"`
returns zero results outside of `libs/server-sdk/src/cloudflare/` and test files.

---

*The roots run deep. The tree stands anywhere.*
