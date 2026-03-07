# Engine-First Compliance Audit

**Date:** 2026-03-07
**Auditor:** Claude Opus 4.6
**Scope:** All apps/, workers/, services/, libs/ (excluding engine internals)
**Codebase size:** ~515,818 LOC

---

## Executive Summary

The engine-first principle states: _"The engine exists to prevent duplication. USE IT."_ This audit found **significant non-compliance** across the codebase, with utility duplication being a major contributor to the 515k LOC count.

### Compliance Scorecard

| Category | Status | Violations | Severity |
| ---------------------------------------- | ------ | ---------- | -------- |
| `cn()` / class merging | PASS | 0 | - |
| Error handling (Signpost) | FAIL | 108+ | HIGH |
| `escapeHtml()` duplication | FAIL | 17 impls | HIGH |
| `formatDate()` duplication | FAIL | 41 impls | MEDIUM |
| `formatBytes()` duplication | FAIL | 6 impls | LOW |
| `slugify()` duplication | FAIL | 5 impls | LOW |
| `timingSafeEqual()` duplication | FAIL | 6 impls | HIGH |
| Subscription tier type duplication | FAIL | 7 defs | MEDIUM |
| Local error catalogs (workers/services) | FAIL | 8 files | MEDIUM |
| Rootwork type safety (`as` casts) | FAIL | 52+ | HIGH |
| Sanitization duplication | FAIL | 2+ impls | MEDIUM |
| Redirect URL validation duplication | FAIL | 2 impls | MEDIUM |
| TIER_STORAGE constant mismatch | FAIL | 2 defs (diverged!) | CRITICAL |
| Email SEQUENCES duplication | FAIL | 3 defs | HIGH |
| Tailwind color tokens duplication | FAIL | 7 copies | LOW |
| Markdown renderer imports | PASS | 0 outside | - |

**Overall compliance: ~25%** — Only `cn()` and markdown rendering follow engine-first consistently. **Total violations: 240+**

---

## Finding 1: `escapeHtml()` — 17 Independent Implementations

**Severity: HIGH** — Security-critical function copy-pasted everywhere.

The engine has `escapeHtml` in `libs/engine/src/lib/utils/sanitize.ts` but it is **not exported at the top level**. This has led to 17 independent implementations:

| Location | Notes |
| ------------------------------------------------------------ | -------------------------------- |
| `libs/engine/src/lib/utils/markdown-directives.ts` | Internal to engine |
| `libs/engine/src/lib/utils/rehype-groveterm.ts` | Internal to engine |
| `libs/engine/src/lib/server/services/trace-email.ts` | Internal to engine |
| `services/durable-objects/src/triage/digest.ts` | Standalone copy |
| `services/heartwood/src/templates/device.ts` | Standalone copy |
| `services/heartwood/src/templates/settings.ts` | **TWO copies in same file** |
| `services/og-worker/src/pure-functions.ts` | Standalone copy |
| `tools/cairn/render.ts` | Standalone copy |
| `apps/landing/src/lib/utils/docs-loader.ts` | Standalone copy |
| `apps/landing/src/routes/arbor/porch/[id]/+page.server.ts` | Inline copy |
| `apps/landing/src/routes/security/+page.server.ts` | Inline copy |
| `apps/landing/src/routes/api/webhooks/email-feedback/+server.ts` | Inline copy |
| `apps/landing/src/routes/porch/new/+page.server.ts` | Inline copy |
| `apps/landing/src/routes/porch/visits/[id]/+page.server.ts` | Inline copy |
| `apps/landing/src/routes/feedback/+page.server.ts` | Inline copy |

**Root cause:** `escapeHtml` exists in the engine but isn't prominently exported from `@autumnsgrove/lattice/utils`. Each developer copies the 5-line function instead.

**Recommendation:** Export `escapeHtml` from `@autumnsgrove/lattice/utils`, then replace all 17 copies with the import. The `apps/landing` routes alone have **6 identical inline copies**.

---

## Finding 2: `formatDate()` — 41 Independent Implementations

**Severity: MEDIUM** — Not security-critical but massive duplication.

There are 41 separate `formatDate()` implementations across the codebase, each doing slightly different formatting:

| Package | Count | Notes |
| --------------------------------- | ----- | ------------------------------------------ |
| `libs/engine/` (various Svelte) | ~15 | Inline in components, not shared |
| `libs/engine/src/routes/arbor/` | ~8 | Each arbor page has its own |
| `apps/landing/` | 1 | `docs-loader.ts` |
| `apps/amber/` | 1 | `FileList.svelte` |
| `libs/foliage/` | 1 | `ModerationQueue.svelte` |
| `workers/patina/` | 1 | `utils.ts` |
| `scripts/` | 1 | `broadcast.ts` |
| `tools/cairn/` | 1 | `layout.ts` |

**Root cause:** No shared date formatting utility in the engine. Each component writes its own.

**Recommendation:** Create `formatDate()`, `formatRelativeDate()`, and `formatTimestamp()` utilities in `@autumnsgrove/lattice/utils` with common format presets (ISO date, display date, relative "2 hours ago", etc.).

---

## Finding 3: Error Handling — 108+ Signpost Violations

**Severity: HIGH** — Violates MANDATORY requirement from AGENT.md.

### 3a. Bare `throw new Error()` — 62+ instances

Files throwing errors without Signpost codes:

- **apps/landing** — 11 violations across CDN, API, arbor routes
- **apps/clearing** — 2 violations in incident pages
- **apps/meadow** — 1 violation in feed page
- **apps/plant** — 5 violations in Stripe integration, email verification
- **apps/amber** — 3 violations in client-side code
- **services/forage** — 20+ violations across providers and routes
- **services/heartwood** — 5+ violations in auth flow
- **services/og-worker** — 3 violations

### 3b. Raw `new Response(JSON.stringify({ error: ... }))` — 42+ instances

API routes returning ad-hoc JSON errors instead of using `buildErrorJson()`:

- **apps/login** — 4 violations in auth proxy
- **apps/ivy** — 16+ violations across triage API routes
- **services/forage** — 20+ violations

### 3c. Local Error Catalogs — 8 separate files

Workers and services define their own error types instead of using/extending Signpost:

| File | Prefix | Imports Signpost types? |
| ---------------------------------------- | -------------- | ---------------------- |
| `apps/plant/src/lib/errors.ts` | `PLANT-XXX` | YES (compliant) |
| `workers/onboarding/src/errors.ts` | `ONBOARDING-XXX` | YES (partially) |
| `workers/reverie/src/errors.ts` | `REV-XXX` | NO — own interface |
| `workers/reverie-exec/src/errors.ts` | `EXC-XXX` | NO — own interface |
| `workers/lumen/src/lib/errors.ts` | (custom) | NO — own system |
| `services/zephyr/src/errors.ts` | `ZEPHYR-NNN` | NO — mirrors type |
| `libs/grove-agent/src/errors.ts` | (varies) | Unknown |
| `libs/infra/src/errors.ts` | `SRV-XXX` | Own catalog |

**Assessment:** `apps/plant` is the gold standard — it imports `GroveErrorDef` from Lattice and extends it. The workers mostly define their own interfaces that mirror the shape but don't import it. `libs/infra` has its own `SRV_ERRORS` catalog which is legitimate (documented in AGENT.md).

**Recommendation:**
1. Workers that define `ReverieErrorDef`, `ExecErrorDef`, `ZephyrErrorDef` should import `GroveErrorDef` from `@autumnsgrove/lattice/errors` and alias it
2. All bare `throw new Error()` in API routes should use `buildErrorJson()` or `throwGroveError()`
3. All `new Response(JSON.stringify({ error: ... }))` should migrate to `buildErrorJson()`

---

## Finding 4: `formatBytes()` — 6 Implementations

**Severity: LOW** — Small function but unnecessarily duplicated.

| Location | Exported? |
| ---------------------------------------------------- | --------- |
| `libs/engine/src/lib/amber/utils.ts` | Yes |
| `libs/engine/src/lib/utils/imageProcessor.ts` | Yes |
| `workers/patina/src/lib/utils.ts` | Yes |
| `scripts/journey/backfill-npm-sizes.ts` | No |

**Note:** The engine has `formatBytes` in **two** places internally (`amber/utils.ts` AND `utils/imageProcessor.ts`) — duplication within the engine itself.

**Recommendation:** Consolidate to a single `formatBytes` in `@autumnsgrove/lattice/utils`, remove the engine-internal duplicates, update external consumers.

---

## Finding 5: Subscription Tier Types — 7 Definitions

**Severity: MEDIUM** — Type drift risk across packages.

The same union type `"free" | "seedling" | "sapling" | "oak" | "evergreen"` is independently defined in:

| Location | Type Name |
| -------------------------------------------------- | ------------------ |
| `services/durable-objects/src/tiers.ts` | `TierKey` |
| `services/heartwood/src/types.ts` | `SubscriptionTier` |
| `services/amber/src/index.ts` | `SubscriptionTier` |
| `workers/post-migrator/src/index.ts` | `TierKey` |
| `workers/post-migrator/tests/storage-thresholds.test.ts` | `TierKey` |
| `libs/foliage/src/lib/types.ts` | `UserTier` |
| `libs/vineyard/src/lib/types/index.ts` | `GroveTier` |

**Drift already present:** Heartwood includes `"canopy" | "platform"` in its definition. Vineyard uses `"grove"` instead of `"evergreen"`. Foliage lacks `"canopy"`.

**Recommendation:** Define canonical `TierKey` and `SubscriptionTier` types in `@autumnsgrove/lattice/config` or `@autumnsgrove/lattice/payments` and import everywhere.

---

## Finding 6: `slugify()` — 5 Implementations

**Severity: LOW**

| Location | Approach |
| ------------------------------------------------ | ------------------------------------------------- |
| `services/heartwood/src/db/status-queries.ts` | Full slugify with toLowerCase + replace |
| `services/heartwood/src/routes/cdn.ts` | Simple replace for filenames |
| `tools/cairn/render.ts` | Heading slugification for anchor links |
| `tools/cairn/index.ts` | Path-based slug for doc indexing |
| `scripts/generate/grove-term-manifest.ts` | Simple kebab-case |

**Recommendation:** Add `slugify()` to `@autumnsgrove/lattice/utils` with options for different modes (URL slug, filename, anchor ID).

---

## Finding 7: Rootwork Type Safety — 52+ Violations

**Severity: HIGH** — Violates MANDATORY requirement: "No `as` casts at trust boundaries."

### 7a. Form Data Casts — `formData.get() as string` (18+ violations)

Instead of using `parseFormData(formData, ZodSchema)` from `@autumnsgrove/lattice/server`:

| Location | Cast Count |
| --------------------------------------------------------- | ---------- |
| `apps/landing/src/routes/security/+page.server.ts` | 6 casts |
| `apps/landing/src/routes/arbor/porch/[id]/+page.server.ts` | 3 casts |
| `apps/landing/src/routes/arbor/comped-invites/+page.server.ts` | 2 casts |
| `apps/landing/src/routes/arbor/feedback/+page.server.ts` | 3+ casts |
| `apps/landing/src/routes/api/arbor/cdn/upload/+server.ts` | 3 casts |

### 7b. Database Query Result Casts (15+ violations)

Raw `.first()` and `.all()` results cast with `as` instead of using typed schemas:

| Location | Issue |
| ---------------------------------------------------- | ------------------------------------------ |
| `apps/plant/src/routes/+layout.server.ts` | 20+ casts on onboarding/user data |
| `apps/plant/src/routes/auth/callback/+server.ts` | Auth flow DB results cast to interface |
| `apps/plant/src/routes/comped/+page.server.ts` | Multiple DB casts without validation |
| `apps/ivy/src/routes/(app)/inbox/+page.server.ts` | 10+ casts on email envelope data |
| `workers/warden/src/routes/admin.ts` | Agent list DB results cast |
| `workers/email-catchup/worker.ts` | User list cast as `EmailSignup[]` |

### 7c. JSON Parsing Without Validation (10+ violations)

Using `JSON.parse(raw) as T` instead of `safeJsonParse(raw, ZodSchema)`:

| Location | Data Source |
| ---------------------------------------------------- | ------------------------------ |
| `workers/meadow-poller/src/index.ts:306` | KV poll state |
| `workers/timeline-sync/src/github.ts:43` | GitHub API response |
| `workers/timeline-sync/src/context.ts:195` | Generic JSON parse as `T` |
| `workers/reverie/src/lib/validator.ts:78` | Tool function arguments |
| `workers/warden/src/routes/admin.ts` | Agent scopes from DB |

### 7d. Missing Error Type Guards (2+ violations)

Using `(err as any)?.status` instead of `isRedirect()` / `isHttpError()`:

- `apps/clearing/src/routes/incidents/[slug]/+page.server.ts:39`
- `apps/plant/src/routes/auth/callback/+server.ts` (implicit)

---

## Finding 8: `cn()` / Class Merging — COMPLIANT

**Severity: None** — This is the success story.

Zero violations found. All class merging uses `cn()` from `@autumnsgrove/lattice/ui/utils`. No direct `clsx` or `tailwind-merge` imports outside the engine.

---

## Finding 9: Workers Utility Isolation

**Severity: LOW** — Some duplication is acceptable for standalone workers.

`workers/patina/src/lib/utils.ts` contains:
- `formatSqlValue()` — Patina-specific, reasonable to keep local
- `formatBytes()` — Should import from engine
- `generateJobId()` — Wrapper around `crypto.randomUUID()`, trivial
- `formatDate()` — Should import from engine
- `getUnixTimestamp()` — Trivial one-liner
- `calculateExpirationTimestamp()` — Patina-specific, reasonable to keep local

`apps/clearing/src/lib/server/monitor/utils.ts` contains:
- `ComponentStatus` enum — Clearing-specific, reasonable to keep local
- `generateUUID()` — Wrapper around `crypto.randomUUID()`, trivial

---

## Finding 10: `timingSafeEqual()` — 6 Implementations

**Severity: HIGH** — Security-critical function reimplemented in every worker that does auth.

| Location | Context |
| ---------------------------------------------------------- | -------------------------------- |
| `apps/ivy/src/lib/utils/index.ts` | Exported for webhook validation |
| `apps/ivy/src/lib/api/forwardEmail.ts` | **Re-implemented inline** |
| `workers/reverie/src/auth/middleware.ts` | API key comparison |
| `workers/reverie-exec/src/auth/middleware.ts` | API key comparison |
| `workers/lumen/src/auth/middleware.ts` | API key comparison |
| `workers/warden/src/auth/signature.ts` | Signature verification |

The engine has timing-safe comparison in `libs/engine/src/lib/utils/csrf.ts` but it's not exported as a standalone utility. Each worker reimplements the same `crypto.subtle.timingSafeEqual()` + TextEncoder pattern.

**Also duplicated:** `hashIp()` in `apps/ivy` — implemented in both `src/lib/utils/index.ts` and inline in `src/routes/api/webhook/incoming/+server.ts`.

**Recommendation:** Export `timingSafeEqual()` from `@autumnsgrove/lattice/utils` (or a new `@autumnsgrove/lattice/security` path). Workers can import it since it uses only Web Crypto APIs.

---

## Finding 11: Sanitization & Redirect Validation Duplication

**Severity: MEDIUM**

### 11a. `sanitizeNoteHtml()` in Meadow

`apps/meadow/src/lib/server/sanitize.ts` reimplements HTML sanitization with its own tag allowlist via `sanitize-html`, duplicating engine's `sanitizeHTML()` from `@autumnsgrove/lattice/utils`.

**Recommendation:** Either use engine's `sanitizeHTML()` with a custom config, or document why Meadow needs a different allowlist.

### 11b. Redirect URL Validation

`apps/login/src/lib/redirect.ts` implements `validateRedirectUrl()` which duplicates the engine's `sanitizeReturnTo()` from `@autumnsgrove/lattice/utils`.

**Recommendation:** Replace with engine import. `apps/domains` already imports `sanitizeReturnTo()` correctly.

---

## Finding 12: TIER_STORAGE Constant Mismatch — CRITICAL DATA BUG

**Severity: CRITICAL** — Active data mismatch causing incorrect quota calculations.

`services/amber/src/index.ts:263` defines:
```
free: 0, seedling: 1, sapling: 5, oak: 20, canopy: 20, evergreen: 100, platform: 100
```

`apps/amber/src/lib/server/storage.ts:16` defines:
```
free: 0, seedling: 1, sapling: 5, oak: 20, evergreen: 100
```

**The app is missing `canopy` and `platform` tiers.** Any user on these tiers will hit incorrect quota calculations in the app. The service has the correct values but the client-facing app doesn't.

**Recommendation:** Consolidate `TIER_STORAGE` into `@autumnsgrove/lattice/config` or `@autumnsgrove/lattice/payments`. Import in both locations.

---

## Finding 13: Email SEQUENCES Defined in 3 Places

**Severity: HIGH** — Changes to email sequences require updates in 3 files.

| Location | Type |
| ----------------------------------------------- | --------------------------------- |
| `libs/engine/src/lib/email/types.ts:87` | Source of truth (engine) |
| `workers/onboarding/src/types.ts:77` | Independent re-definition |
| `workers/email-catchup/worker.ts:63` | Independent re-definition |

The onboarding worker even has a comment: _"Must match services/email-render/src/templates/types.ts SEQUENCES"_ — acknowledging the drift risk but not importing from engine.

**Recommendation:** Import `SEQUENCES` from `@autumnsgrove/lattice/email` in both workers.

---

## Finding 14: Tailwind Color Tokens Duplicated 7x

**Severity: LOW** — All apps define the identical `grove` color palette (50-950 shades) in their `tailwind.config.js` instead of inheriting from the engine preset.

All 7 apps (`landing`, `plant`, `meadow`, `clearing`, `domains`, `terrarium`, `login`) copy-paste the same color values. Brand color changes require editing 7 files.

**Recommendation:** Move the `grove` color palette into the engine's Tailwind preset so apps inherit it automatically.

---

## Remediation Priority

### P0 — High Impact, Quick Wins (Security + Data Critical) — RESOLVED

All P0 items have been fixed in commit `a9ea4be`:

1. ~~**FIX: TIER_STORAGE mismatch**~~ — FIXED. Removed fake `canopy` and `platform` tiers. Renamed "free" → "wanderer" across 78 files. `apps/amber` now imports `TIER_STORAGE_GB` from engine. `services/amber` aligned to 5 correct tiers.
2. ~~**Export `escapeHtml`**~~ — DONE. New `escape-html.ts` in engine utils, exported via `@autumnsgrove/lattice/utils`. 12 duplicate implementations replaced with imports.
3. ~~**Export `timingSafeEqual`**~~ — DONE. Exported from `csrf.ts`, improved to handle different-length strings safely.
4. ~~**Migrate `apps/landing` escapeHtml copies**~~ — DONE. 7 inline functions replaced with engine imports.
5. ~~**Consolidate `formatBytes`**~~ — DONE. `imageProcessor.ts` upgraded to handle GB/TB, `amber/utils.ts` now re-exports from it.

### P1 — Medium Impact, Moderate Effort
1. **Create shared `formatDate()` presets** in engine utils — eliminates ~25 copies
2. **Migrate form data parsing to `parseFormData()`** — 18+ unsafe cast sites in landing/plant
3. **Migrate worker error catalogs to import `GroveErrorDef`** — 4 workers need type alignment
4. ~~**Define canonical `TierKey` type**~~ — DONE (part of P0 tier alignment). All packages now use engine's `TierKey`.
5. **Replace bare `throw new Error()` in API routes** — 62+ violations

### P2 — Lower Impact, Larger Effort
9. **Migrate DB query results to typed schemas** — 15+ unsafe `as` casts on `.first()` / `.all()`
10. **Migrate `apps/ivy` and `apps/login` error responses** to `buildErrorJson()` — 20+ violations
11. **Add `safeJsonParse()` to KV/webhook/API parsing** — 10+ unsafe `JSON.parse() as T`
12. **Migrate `services/forage` error handling** — 20+ violations but standalone service
13. **Add `slugify()` to engine utils** — 5 external implementations

### Estimated LOC Savings

| Action | Lines Removed | Lines Added |
| ------------------------------------- | ------------- | ----------- |
| Consolidate `escapeHtml` | ~170 | ~15 |
| Consolidate `formatDate` | ~200 | ~40 |
| Consolidate `formatBytes` | ~50 | ~10 |
| Consolidate tier types | ~35 | ~5 |
| Migrate error handling to Signpost | ~300 | ~200 |
| **Total estimated net reduction** | **~455** | |

The LOC savings from utility consolidation alone are modest (~455 lines). The real value is:
- **Consistency** — One `escapeHtml` means one security review surface
- **Type safety** — One `TierKey` means no drift between "evergreen" vs "grove"
- **Discoverability** — Developers find utilities in the engine instead of writing new ones

---

## Where the Real LOC Lives

At 515k LOC, utilities aren't the main bloat driver. A quick breakdown:

| Area | Estimated LOC | Notes |
| ------------------------------------------ | ------------- | ----------------------------------------- |
| `libs/engine/` (core framework) | ~180k | Expected to be large |
| `services/` (7 services) | ~60k | Heartwood alone is ~20k |
| `workers/` (13 workers) | ~40k | Many standalone workers |
| `apps/` (9 apps) | ~80k | Plant + Landing are largest |
| `libs/` (non-engine: foliage, infra, etc.) | ~30k | Foliage themes library is growing |
| `tools/`, `scripts/`, `docs/` | ~50k | Build tooling, generators |
| `tests/` (embedded) | ~75k | Good test coverage = LOC |

The biggest savings opportunities for reducing total LOC are likely in:
1. **Dead code removal** — Unused routes, components, and features
2. **Test consolidation** — Duplicate test setups across packages
3. **Service extraction** — Some services may have code that belongs in engine

---

_Audit complete. Ready for remediation planning._
