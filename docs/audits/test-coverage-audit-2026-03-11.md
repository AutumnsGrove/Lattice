# Test Coverage Audit — 2026-03-11

> **Scope:** Full Lattice monorepo — all apps, libs, services, workers
> **Baseline:** Previous audit 2026-03-06 (311 tests / 1,960 source files)
> **Since last audit:** 190 commits, 14 new test files added

---

## Executive Summary

The Lattice monorepo now has **323 test files** across **1,982 source files** — a **16% test ratio** (up from 13%). Since March 6, **14 new test files** were added and **30 existing tests modified**, primarily in `libs/engine` (friends, GlassChat, GroveIcon, utilities), `libs/foliage` (design tokens), and `libs/prism` (contrast validation). The `workers/onboarding` package gained its first test.

**The 12 zero-test packages remain at zero.** Despite 190 commits of feature work, no tests were added to Warden, Durable Objects, Meadow, Forage, Loft, Domains, Patina, Timeline-Sync, or Shutter. The testing investment went to packages that already had coverage.

### What Changed Since March 6

```
                        March 6          March 11         Delta
Source files:           1,960            1,982            +22
Test files:             311              323              +12
Test ratio:             13%              16%              +3%
Zero-test packages:     12               12               +0  ← NO CHANGE
E2E specs:              6                6                +0
Vitest configs:         17               18               +1 (libs/prism)
```

### New Test Files Added (14)

| File | Package | What It Tests |
|------|---------|--------------|
| `libs/engine/src/lib/server/services/friends.test.ts` | engine | Friends service logic |
| `libs/engine/src/lib/ui/components/ui/glasschat/controller.test.ts` | engine | GlassChat controller factories |
| `libs/engine/src/lib/ui/components/ui/groveicon/groveicon.test.ts` | engine | GroveIcon manifest component |
| `libs/engine/src/lib/utils/date.test.ts` | engine | Date utility functions |
| `libs/engine/src/lib/utils/share.test.ts` | engine | Share utility functions |
| `libs/engine/src/lib/utils/slugify.test.ts` | engine | URL slug generation |
| `libs/engine/src/routes/api/lantern/friends/friends.test.ts` | engine | Friends API endpoint |
| `libs/engine/src/routes/api/lantern/search/search.test.ts` | engine | Lantern search API |
| `libs/foliage/tests/prism-contrast.test.ts` | foliage | Design token contrast validation |
| `libs/foliage/tests/seasonal-palettes.test.ts` | foliage | Seasonal theme palettes |
| `libs/prism/tests/contrast.test.ts` | prism | WCAG contrast checks |
| `libs/prism/tests/seasonal-palettes.test.ts` | prism | Design token palettes |
| `workers/onboarding/src/onboarding.test.ts` | onboarding | Onboarding worker (NEW: was zero-test) |
| `tools/cairn/cairn.test.ts` | cairn | Build tool tests |

---

## Complete Package Inventory

### Apps

| Package | Source Files | Test Files | Ratio | Risk | Change Since 3/6 |
|---------|-------------|-----------|-------|------|-------------------|
| **apps/landing** | 229 | 10 | 4% | LOW | — |
| **apps/plant** | 58 | 3 | 5% | MEDIUM | Modified 2 tests |
| **apps/meadow** | 48 | 0 | 0% | HIGH | **STILL ZERO** |
| **apps/ivy** | 46 | 4 | 9% | LOW | — |
| **apps/domains** | 33 | 0 | 0% | MEDIUM | **STILL ZERO** |
| **apps/clearing** | 29 | 5 | 17% | LOW | — |
| **apps/amber** | 21 | 5 | 24% | LOW | Modified 1 test |
| **apps/login** | 18 | 2 | 11% | LOW | — |
| **apps/terrarium** | 3 | 0 | 0% | LOW | — |
| **APPS TOTAL** | **485** | **29** | **6%** | | |

### Libs

| Package | Source Files | Test Files | Ratio | Risk | Change Since 3/6 |
|---------|-------------|-----------|-------|------|-------------------|
| **libs/engine** | 1,131 | 187 | 17% | LOW | +8 new, 18 modified |
| **libs/foliage** | 52 | 12 | 23% | LOW | +2 new, 3 modified |
| **libs/infra** | 20 | 16 | 80% | LOW | — |
| **libs/gossamer** | 17 | 4 | 24% | LOW | NEW PACKAGE |
| **libs/vineyard** | 14 | 1 | 7% | LOW | — |
| **libs/grove-agent** | 9 | 4 | 44% | LOW | Modified 1 |
| **libs/prism** | 8 | 2 | 25% | LOW | +2 new (NEW PACKAGE) |
| **libs/shutter** | 6 | 0 | 0% | LOW | **STILL ZERO** |
| **LIBS TOTAL** | **1,257** | **226** | **18%** | | |

### Workers

| Package | Source Files | Test Files | Ratio | Risk | Change Since 3/6 |
|---------|-------------|-----------|-------|------|-------------------|
| **workers/warden** | 25 | 0 | 0% | CRITICAL | **STILL ZERO** |
| **workers/reverie** | 19 | 5 | 26% | LOW | Modified 2 |
| **workers/loft** | 15 | 0 | 0% | HIGH | **STILL ZERO** |
| **workers/patina** | 15 | 0 | 0% | MEDIUM | **STILL ZERO** |
| **workers/lumen** | 12 | 8 | 67% | LOW | — |
| **workers/reverie-exec** | 11 | 2 | 18% | LOW | — |
| **workers/timeline-sync** | 10 | 0 | 0% | MEDIUM | **STILL ZERO** |
| **workers/onboarding** | 4 | 1 | 25% | LOW | +1 new (WAS ZERO) |
| **workers/meadow-poller** | 4 | 2 | 50% | LOW | NEW PACKAGE |
| **workers/post-migrator** | 2 | 1 | 50% | LOW | Modified 1 |
| **workers/email-catchup** | 1 | 1 | 100% | LOW | NEW PACKAGE |
| **workers/vista-collector** | 1 | 0 | 0% | LOW | **STILL ZERO** |
| **workers/webhook-cleanup** | 1 | 1 | 100% | LOW | NEW PACKAGE |
| **WORKERS TOTAL** | **120** | **21** | **18%** | | |

### Services

| Package | Source Files | Test Files | Ratio | Risk | Change Since 3/6 |
|---------|-------------|-----------|-------|------|-------------------|
| **services/heartwood** | 49 | 30 | 61% | LOW | Modified 1 |
| **services/forage** | 19 | 0 | 0% | HIGH | **STILL ZERO** |
| **services/durable-objects** | 17 | 0 | 0% | CRITICAL | **STILL ZERO** |
| **services/zephyr** | 16 | 7 | 44% | LOW | — |
| **services/pulse** | 8 | 4 | 50% | LOW | — |
| **services/og-worker** | 4 | 4 | 100% | LOW | — |
| **services/amber** | 4 | 1 | 25% | MEDIUM | — |
| **services/grove-router** | 2 | 1 | 50% | LOW | — |
| **services/email-render** | 1 | 0 | 0% | LOW | **STILL ZERO** |
| **SERVICES TOTAL** | **120** | **47** | **39%** | | |

---

## The 12 Zero-Test Packages

Still at zero. Unchanged from last audit. Sorted by risk.

| # | Package | Source Files | Total Lines | Why It Matters |
|---|---------|-------------|-------------|----------------|
| 1 | **workers/warden** | 25 | ~3,000 | Credential gateway. Every API key in the system flows through here. Auth, scoping, key resolution, dual-auth, signature verification — all untested. |
| 2 | **services/durable-objects** | 17 | ~5,000 | TenantDO, SentinelDO, ExportDO, TriageDO, PostMetaDO. Platform coordination layer — state machines, monitoring, exports. |
| 3 | **services/forage** | 19 | ~3,500 | AI agent orchestration, swarm coordination, durable object (1,094 lines), email generation, prompt management. |
| 4 | **workers/loft** | 15 | ~1,500 | Session management, state machine orchestration, orphan cleanup. |
| 5 | **apps/meadow** | 48 | ~3,000 | Community feed: reactions, votes, follows, bookmarks. Concurrent-write-heavy with race condition potential. |
| 6 | **apps/domains** | 33 | ~2,500 | Domain search, multi-turn search API (8 route handlers), Arbor discovery, database queries. |
| 7 | **workers/patina** | 15 | ~1,000 | Cleanup and maintenance tasks. |
| 8 | **workers/timeline-sync** | 10 | ~1,500 | Post synchronization with voices engine (757 lines). Has vitest config but zero tests. |
| 9 | **libs/shutter** | 6 | ~1,000 | Shared library with canary implementation (603 lines). |
| 10 | **apps/terrarium** | 3 | ~100 | Minecraft panel. Types only. |
| 11 | **workers/vista-collector** | 1 | ~50 | Analytics collection. Tiny. |
| 12 | **services/email-render** | 1 | ~235 | Email rendering worker. |

---

## Financial & Security-Critical Untested Code

These files handle money or auth with zero test coverage:

| File | Lines | Risk |
|------|-------|------|
| `apps/plant/src/routes/api/webhooks/stripe/+server.ts` | 547 | Processes ALL subscription changes |
| `apps/plant/src/lib/server/stripe.ts` | 496 | Stripe integration — billing logic |
| `apps/ivy/src/lib/crypto/index.ts` | 380 | Encryption logic for email forwarding |
| `apps/domains/src/routes/auth/callback/+server.ts` | 206 | OAuth callback handler |
| `apps/domains/src/hooks.server.ts` | 268 | First middleware layer for all requests |
| `apps/plant/src/routes/auth/callback/+server.ts` | 406 | Auth callback for billing app |

---

## Largest Untested Source Files

Files with >500 lines that have no corresponding test file:

| File | Lines | Package |
|------|-------|---------|
| `libs/engine/src/lib/server/db/schema/engine.ts` | 1,280 | engine |
| `services/heartwood/src/templates/settings.ts` | 1,187 | heartwood |
| `services/amber/src/index.ts` | 1,097 | amber |
| `services/forage/src/durable-object.ts` | 1,094 | forage |
| `services/forage/src/index.ts` | 916 | forage |
| `services/durable-objects/src/ExportDO.ts` | 874 | durable-objects |
| `libs/engine/src/hooks.server.ts` | 831 | engine |
| `libs/engine/src/lib/sentinel/operations.ts` | 811 | engine |
| `apps/landing/src/routes/arbor/comped-invites/+page.server.ts` | 810 | landing |
| `libs/engine/src/routes/api/billing/+server.ts` | 780 | engine |
| `services/og-worker/src/index.ts` | 758 | og-worker |
| `workers/timeline-sync/src/voices.ts` | 757 | timeline-sync |
| `libs/engine/src/routes/api/curios/timeline/generate/+server.ts` | 757 | engine |
| `libs/engine/src/lib/server/db/schema/curios.ts` | 750 | engine |
| `libs/engine/src/lib/lumen/providers/openrouter.ts` | 742 | engine |
| `apps/domains/src/lib/server/db.ts` | 737 | domains |
| `services/durable-objects/src/sentinel/operations.ts` | 735 | durable-objects |
| `libs/engine/src/routes/arbor/settings/+page.server.ts` | 734 | engine |
| `libs/engine/src/lib/sentinel/runner.ts` | 733 | engine |
| `services/amber/src/services/ExportJobV2.ts` | 717 | amber |
| `libs/engine/src/lib/payments/stripe/provider.ts` | 701 | engine |
| `workers/post-migrator/src/index.ts` | 655 | post-migrator |
| `libs/engine/src/lib/sentinel/scheduler.ts` | 637 | engine |
| `libs/engine/src/routes/arbor/curios/shelves/+page.server.ts` | 622 | engine |
| `libs/shutter/cloudflare/src/canary.ts` | 603 | shutter |
| `services/durable-objects/src/TriageDO.ts` | 594 | durable-objects |
| `libs/engine/src/lib/payments/types.ts` | 582 | engine |
| `services/durable-objects/src/PostMetaDO.ts` | 580 | durable-objects |
| `libs/engine/src/lib/sentinel/profiles.ts` | 571 | engine |
| `apps/plant/src/lib/server/email-templates.ts` | 571 | plant |
| `libs/engine/src/lib/server/petal/vision-client.ts` | 554 | engine |
| `apps/plant/src/routes/api/webhooks/stripe/+server.ts` | 547 | plant |
| `libs/engine/src/routes/api/images/upload/+server.ts` | 546 | engine |
| `services/durable-objects/src/tiers.ts` | 524 | durable-objects |
| `services/durable-objects/src/TenantDO.ts` | 535 | durable-objects |
| `services/durable-objects/src/SentinelDO.ts` | 511 | durable-objects |

---

## New Packages Since Last Audit

These packages appeared between March 6-11:

| Package | Source Files | Test Files | Notes |
|---------|-------------|-----------|-------|
| **libs/gossamer** | 17 | 4 | 24% — shipped with tests |
| **libs/prism** | 8 | 2 | 25% — design token library, contrast tests |
| **workers/meadow-poller** | 4 | 2 | 50% — shipped with tests |
| **workers/email-catchup** | 1 | 1 | 100% — shipped with test |
| **workers/webhook-cleanup** | 1 | 1 | 100% — shipped with test |

All new packages shipped with at least some test coverage. This is a good trend.

---

## Test Theatre (Unchanged)

Still present from last audit:

| File | Issue |
|------|-------|
| `apps/ivy/tests/integration/queue.test.ts` | 5 `it.todo()` stubs, zero implementations |
| `apps/ivy/tests/integration/webhook.test.ts` | 7 `it.todo()` stubs, zero implementations |
| `libs/engine/src/lib/heartwood/client.test.ts` | 54K file, ~60% verifies mock plumbing |

---

## Testing Trophy Alignment

```
                    ╭─────────╮
                    │   E2E   │  6 specs (heartwood only) — UNCHANGED
                    ╰────┬────╯
               ╭─────────┴─────────╮
               │   Integration     │  ~50 files — STILL UNDER-INVESTED
               ╰─────────┬─────────╯
                  ╭──────┴──────╮
                  │    Unit     │  ~270 files — GROWING
                  ╰──────┬──────╯
              ╭──────────┴──────────╮
              │   Static Analysis   │  TypeScript + ESLint + oxlint — GOOD
              ╰─────────────────────╯
```

Shape is still a diamond, not a trophy. Unit tests grew but integration tests remain thin.

---

## The Untested Seams (Updated)

```
┌─────────────┐     ┌─────────────┐     ┌──────────────┐
│  Workers    │────▶│   Warden    │────▶│ External API │
│ (tested)    │     │ (UNTESTED)  │     │              │
└─────────────┘     └─────────────┘     └──────────────┘
                          ▲
                          │ 25 files, 0 tests
                          │ ALL credentials flow here

┌─────────────┐     ┌─────────────┐     ┌──────────────┐
│  Meadow UI  │────▶│ Meadow API  │────▶│   Engine DB  │
│ (untested)  │     │ (UNTESTED)  │     │  (tested)    │
└─────────────┘     └─────────────┘     └──────────────┘
                          ▲
                          │ 48 files, 0 tests
                          │ social features: votes, follows, reactions

┌─────────────┐     ┌─────────────┐     ┌──────────────┐
│  Engine UI  │────▶│ Sentinel    │────▶│ Durable Objs │
│ (tested)    │     │ (untested)  │     │ (UNTESTED)   │
└─────────────┘     └─────────────┘     └──────────────┘
                          ▲
                          │ 17 files, 5K+ lines, 0 tests
                          │ platform coordination layer

┌─────────────┐     ┌─────────────┐     ┌──────────────┐
│  Search UI  │────▶│ Forage Agent│────▶│ LLM Provider │
│ (untested)  │     │ (UNTESTED)  │     │              │
└─────────────┘     └─────────────┘     └──────────────┘
                          ▲
                          │ 19 files, 1,094-line DO, 0 tests
                          │ AI orchestration + swarm logic
```

---

## Metrics Summary

| Metric | March 6 | March 11 | Delta |
|--------|---------|----------|-------|
| Total source files | 1,960 | 1,982 | +22 |
| Total test files | 311 | 323 | +12 |
| Global test ratio | 13% | 16% | +3% |
| Packages with tests | 18 | 24 | +6 |
| Zero-test packages (with source) | 12 | 12 | **+0** |
| E2E specs | 6 | 6 | +0 |
| Vitest configs | 17 | 18 | +1 |
| New packages | — | 5 | — |
| New test files | — | 14 | — |

---

## Recommendations (Updated Priority)

### P0 — Critical Infrastructure (Unchanged, Still Urgent)

| Package | Source Files | Action |
|---------|-------------|--------|
| **workers/warden** | 25 | Integration tests for credential resolution, auth middleware, scope validation, dual-auth |
| **services/durable-objects** | 17 | State machine tests for TenantDO, SentinelDO, ExportDO; alarm scheduling; export pipelines |

### P1 — Core Features (Unchanged)

| Package | Source Files | Action |
|---------|-------------|--------|
| **apps/meadow** | 48 | Integration tests for feed, reactions, votes, follows — especially concurrent writes |
| **services/forage** | 19 | Agent orchestration, swarm coordination, durable object lifecycle |
| **workers/loft** | 15 | Session state machine, orphan cleanup, lifecycle management |

### P2 — Growing Risk

| Package | Source Files | Action |
|---------|-------------|--------|
| **apps/domains** | 33 | Multi-turn search API (8 handlers), Arbor discovery routes |
| **libs/engine sentinel** | ~4 files, 2,700 lines | `runner.ts` (733), `scheduler.ts` (637), `operations.ts` (811), `profiles.ts` (571) — monitoring infrastructure |
| **libs/engine payments** | ~3 files, 1,800 lines | `stripe/provider.ts` (701), `types.ts` (582), billing server route (780) |

### P3 — Cleanup & Maintenance

| Item | Action |
|------|--------|
| Ivy test theatre | Implement or delete the 12 `it.todo()` stubs |
| Heartwood client mocks | Refactor 54K test file to test real behavior |
| Timeline-sync phantom config | Has vitest config, zero tests — add tests or remove config |

### Meta: The Pattern to Break

New packages ship with tests. Existing zero-test packages stay at zero. **The 12 untested packages need a dedicated sprint** — they won't get tests as side effects of feature work.

---

_190 commits flowed through the grove. The tested streams grew stronger. The untested ones just grew wider._
