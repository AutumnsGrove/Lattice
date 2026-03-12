# Test Coverage Audit — 2026-03-06

> **Auditors:** Beaver (test quality) + Eagle (architectural view)
> **Scope:** Full Lattice monorepo — all apps, libs, services, workers

---

## Executive Summary

The Lattice monorepo has **311 test files** across **1,960 source files** (a **13% test ratio**) in **18 vitest-configured packages**. The core engine (`libs/engine`) is well-tested with 178 test files covering critical infrastructure. However, **12 packages with significant source code have zero tests**, including the security-critical credential gateway (Warden), the Durable Objects coordination layer, and the entire community feed (Meadow). Test quality is generally strong where tests exist, but there are pockets of **test theatre** and **over-mocking** that provide false confidence.

### Testing Trophy Alignment

```
                    ╭─────────╮
                    │   E2E   │  6 specs (heartwood only) — APPROPRIATE
                    ╰────┬────╯
               ╭─────────┴─────────╮
               │   Integration     │  ~45 files — UNDER-INVESTED
               ╰─────────┬─────────╯
                  ╭──────┴──────╮
                  │    Unit     │  ~260 files — OVER-INDEXED
                  ╰──────┬──────╯
              ╭──────────┴──────────╮
              │   Static Analysis   │  TypeScript + ESLint + oxlint — GOOD
              ╰─────────────────────╯
```

**Verdict: Slightly inverted.** The ratio skews toward unit tests. Integration tests — where confidence lives — are under-represented relative to the codebase size. The E2E layer is correctly narrow (heartwood auth only). Static analysis is solid.

---

## What Has GOOD Coverage

These packages have meaningful, well-structured tests that provide real confidence:

| Package | Test Files | Quality | Highlights |
|---------|-----------|---------|------------|
| **libs/engine** | 178 | STRONG | Security, billing, feature flags, rate limiting, upload validation, markdown, curios, Durable Objects, CSRF, error helpers |
| **services/heartwood** | 36 | STRONG | Auth routes, sessions, JWT, CORS, rate limiting, CDN, 6 E2E Playwright specs |
| **libs/infra** | 16 | STRONG | Conformance tests for database/KV/storage abstractions, Cloudflare adapter tests |
| **libs/foliage** | 10 | STRONG | Theme system with contrast, CSS validation, tier access, font upload testing |
| **services/zephyr** | 7 | STRONG | Email delivery with rate limiting, validation, D1 logging, unsubscribe |
| **workers/lumen** | 8 | STRONG | Auth middleware, rate limiting, transcription, inference, moderation routes |
| **services/og-worker** | 4 | STRONG | OG metadata, SSRF validation, pure function isolation |
| **apps/clearing** | 5 | ADEQUATE | Health checks, incident management, daily history |
| **workers/reverie** | 5 | ADEQUATE | Template validation, routing, conversion, error handling |
| **apps/landing** | 10 | ADEQUATE | Hero component, docs scanner, path utils, OG image routes |

### Standout Tests (Eagle's Picks)

- **`libs/engine/tests/integration/security/full-stack.test.ts`** — Real crypto, real CSRF tokens, constant-time comparison, cross-tenant prevention. This is how security tests should look.
- **`libs/engine/tests/integration/storage/upload.test.ts`** — 30K of real file validation with magic bytes, extension checking, binary data. Catches real attacks.
- **`libs/engine/src/lib/server/services/database.test.ts`** — SQL injection prevention, multi-tenant isolation, constraint validation. Tests the dam, not the water.
- **`services/heartwood/e2e/`** — Playwright WebAuthn with virtual authenticators. Correct use of E2E for critical auth flows.

---

## What Has NO Coverage

These packages have source code but **zero test files**:

| Package | Source Files | Risk Level | Why It Matters |
|---------|-------------|------------|----------------|
| **workers/warden** | 25 | 🔴 CRITICAL | Credential gateway — auth, scoping, key resolution. Security infrastructure with no safety net. |
| **services/durable-objects** | 16 | 🔴 CRITICAL | TenantDO, SentinelDO, triage logic. Coordination layer for the entire platform. |
| **apps/meadow** | 32 | 🟠 HIGH | Community feed: reactions, votes, follows, bookmarks. Core social feature untested. |
| **services/forage** | 17 | 🟠 HIGH | AI agent orchestration, swarm logic, LLM providers. Complex async logic. |
| **apps/domains** | 24 | 🟡 MEDIUM | Domain search, Arbor discovery routes, database queries. |
| **workers/loft** | 15 | 🟠 HIGH | Session management and state machine orchestration. |
| **workers/patina** | 15 | 🟡 MEDIUM | Cleanup and maintenance tasks. |
| **workers/timeline-sync** | 9 | 🟡 MEDIUM | Has vitest config but zero test files. |
| **workers/onboarding** | 4 | 🟢 LOW | Small worker. |
| **workers/vista-collector** | 1 | 🟢 LOW | Tiny. |
| **services/email-render** | 1 | 🟢 LOW | Tiny. |
| **apps/terrarium** | 1 | 🟢 LOW | Types only. |

### Largest Untested Files (by line count)

The background scout identified the biggest untested source files in the repo:

| File | Lines | Package |
|------|-------|---------|
| `services/durable-objects/src/ExportDO.ts` | 858 | durable-objects |
| `services/durable-objects/src/operations.ts` | 735 | durable-objects |
| `services/durable-objects/src/TriageDO.ts` | 598 | durable-objects |
| `services/durable-objects/src/PostMetaDO.ts` | 578 | durable-objects |
| `services/durable-objects/src/tiers.ts` | 553 | durable-objects |
| `services/durable-objects/src/TenantDO.ts` | 535 | durable-objects |
| `services/durable-objects/src/SentinelDO.ts` | 511 | durable-objects |
| `services/durable-objects/src/digest.ts` | 454 | durable-objects |

The `services/durable-objects` package alone has **5,000+ lines** of untested coordination logic — state machines, monitoring, export pipelines, and tenant orchestration.

### Minimal Coverage (Not Zero, But Thin)

| Package | Tests | Source Files | Gap |
|---------|-------|-------------|-----|
| **apps/plant** | 3 | 43 | Subscription management — 93% untested |
| **apps/login** | 2 | 14 | Auth hub — missing route tests |
| **services/amber** | 1 | 4 | Only zip stream tested |
| **libs/vineyard** | 1 | 4 | Minimal auth library coverage |

---

## Test Theatre

Tests that exist but provide false confidence:

### Confirmed Theatre

| File | Verdict | Issue |
|------|---------|-------|
| **`apps/ivy/tests/integration/queue.test.ts`** (449 bytes) | THEATRE | 5 `it.todo()` stubs. Zero implementations. Pure placeholder. |
| **`apps/ivy/tests/integration/webhook.test.ts`** (517 bytes) | THEATRE | 7 `it.todo()` stubs. Zero implementations. Pure placeholder. |

### Over-Mocked (Weak Confidence)

| File | Verdict | Issue |
|------|---------|-------|
| **`libs/engine/src/lib/heartwood/client.test.ts`** (54K, 1,805 lines) | WEAK | ~60% of tests verify mock interactions rather than real behavior. Pattern: `mockFetchResponse() → call function → expect(mockFetch).toHaveBeenCalledWith()`. Tests that the mock returns what you told it to. Cache deduplication tests (~40%) are meaningful. |
| **`libs/grove-agent/src/init.test.ts`** (754 bytes) | WEAK | 2 tests — verifies constructor doesn't log and accepts config. No error cases, no initialization behavior. |
| **`apps/plant/src/lib/server/onboarding-helper.test.ts`** (951 bytes) | WEAK | Boolean return checks only. No edge cases, no error conditions. Technically correct but paper-thin. |

### Theatre Impact

The Ivy queue/webhook stubs count as 4 "test files" in CI metrics but test **nothing**. The heartwood client file is the largest test file in the repo (54K) but ~60% of its assertions verify mock plumbing, not real behavior. Together these inflate test counts without proportional confidence.

---

## Testing Trophy Score Card

| Layer | Current State | Trophy Target | Assessment |
|-------|--------------|---------------|------------|
| **Static Analysis** | TypeScript strict + ESLint + oxlint, always-on in CI | Always on | ✅ Well-aligned |
| **Unit Tests** | ~260 files, strong in utilities/pure functions | Some | ⚠️ Slightly over-indexed |
| **Integration Tests** | ~45 files, concentrated in engine + heartwood | Many (sweet spot) | ❌ Under-invested |
| **E2E Tests** | 6 Playwright specs, heartwood auth only | Few (critical journeys) | ✅ Appropriately narrow |

**The shape is closer to a diamond than a trophy.** Heavy unit testing at the base, thin integration layer, correct E2E top. The biggest gap is in integration tests — especially for cross-service flows, multi-tenant scenarios, and the packages with zero coverage.

---

## Architectural Observations (Eagle's View)

### What's Working

1. **Smart CI matrix** — `affected-packages.mjs` only runs tests for changed packages with transitive dependency tracking. Efficient.
2. **Cloudflare worker testing** — Packages using `@cloudflare/vitest-pool-workers` with miniflare bindings test real D1/KV/R2 behavior, not just mocks.
3. **Security tests are real** — Full-stack security tests use actual crypto, not mocked crypto.subtle. CSRF, HMAC, constant-time comparison tested properly.
4. **Test utilities are focused** — Only 4 test-utils files, each solving real problems (feature-flag factories, Durable Object mocks, rate-limit helpers).
5. **Co-location** — Most tests live next to source code. Easy to find, easy to maintain.

### What's Concerning

1. **Warden has no tests** — The credential gateway that every worker depends on. If Warden breaks, credentials stop resolving across the platform. This is the single biggest architectural test gap.
2. **Durable Objects tested in engine, not in services/durable-objects** — Engine has TenantDO/PostContentDO/PostMetaDO tests, but the standalone DO service package (16 files) has zero. Unclear which is the source of truth.
3. **No cross-service integration tests** — Individual services are tested in isolation, but there are no tests verifying the flow: `Worker → Warden → credential → external API`. The architecture diagram has untested seams.
4. **Meadow is a social system with no tests** — Reactions, votes, follows, bookmarks. These are concurrent-write-heavy operations with race condition potential. Zero tests.
5. **Three vitest versions** — v4.0.18, v3.2.4, v2.x coexist. Not a test quality issue directly, but creates maintenance friction.

### The Untested Seams

```
┌─────────────┐     ┌─────────────┐     ┌──────────────┐
│  Workers    │────▶│   Warden    │────▶│ External API │
│ (tested)    │     │ (UNTESTED)  │     │              │
└─────────────┘     └─────────────┘     └──────────────┘
                          ▲
                          │ no test coverage
                          │ for this critical path

┌─────────────┐     ┌─────────────┐     ┌──────────────┐
│  Meadow UI  │────▶│ Meadow API  │────▶│   Engine DB  │
│ (untested)  │     │ (UNTESTED)  │     │  (tested)    │
└─────────────┘     └─────────────┘     └──────────────┘
```

---

## Recommendations

### Tier 1 — Security & Infrastructure (Do First)

| Priority | Package | Action | Trophy Layer |
|----------|---------|--------|-------------|
| P0 | **workers/warden** | Integration tests for credential resolution, auth middleware, scope validation | Integration |
| P0 | **services/durable-objects** | Unit + integration tests for TenantDO, SentinelDO coordination | Integration |

### Tier 2 — Core Features (Do Next)

| Priority | Package | Action | Trophy Layer |
|----------|---------|--------|-------------|
| P1 | **apps/meadow** | Integration tests for feed, reactions, votes, follows (race conditions!) | Integration |
| P1 | **services/forage** | Integration tests for agent orchestration, provider error handling | Integration |
| P1 | **apps/plant** | Expand from 3 → meaningful coverage of subscription flows | Integration |

### Tier 3 — Clean Up Theatre

| Priority | Package | Action | Trophy Layer |
|----------|---------|--------|-------------|
| P2 | **apps/ivy** | Either implement the todo stubs or delete them | — |
| P2 | **libs/engine/heartwood/client** | Refactor to test real behavior, not mock interactions | Integration |

### Tier 4 — Fill Gaps

| Priority | Package | Action | Trophy Layer |
|----------|---------|--------|-------------|
| P3 | **apps/domains** | Route tests for search API, Arbor discovery | Integration |
| P3 | **workers/loft, patina** | Assess what's worth testing | Unit |
| P3 | **apps/login** | Route-level tests for auth flows | Integration |

### Meta Recommendation

**Shift investment from unit → integration.** The codebase has strong unit tests for utilities and pure functions. The next dollar of test confidence comes from integration tests that verify real request flows through the system — especially at the seams between services.

---

## Metrics Summary

| Metric | Value |
|--------|-------|
| Total source files | 1,960 |
| Total test files | 311 |
| Global test ratio | 13% |
| Packages with tests | 18 of ~38 |
| Packages with zero tests (with source) | 12 |
| Confirmed theatre files | 2 (Ivy stubs) |
| Over-mocked/weak files | 3 |
| E2E specs | 6 (heartwood) |
| Coverage configs | 2 (engine, heartwood) |
| Vitest versions in use | 3 (v2, v3, v4) |
| CI strategy | Affected-only matrix |
| Trophy alignment | Diamond (unit-heavy, integration-light) |

---

_The dam is solid where it's built. But there are stretches of the stream with no dam at all._ 🦫

_From altitude, the gaps are clear. The forest is protected in the center but exposed at the edges._ 🦅
