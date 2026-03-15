---
title: "The Lattice Split — Engine Cleanup and Aspen Deployment"
description: "Clean up cross-layer tangles inside libs/engine, fix barrel imports, and extract the tenant-facing app into apps/aspen/ as a Cloudflare Worker."
category: specs
specCategory: core-infrastructure
icon: scissors
lastUpdated: "2026-03-14"
aliases: []
date created: Sunday, March 1st 2026
date modified: Friday, March 14th 2026
tags:
  - core
  - architecture
  - refactor
  - lattice
  - aspen
  - engine
type: tech-spec
---

```
              🌿            🌿            🌿
                ╲          ╱  ╲          ╱
                 ╲   ┄┄┄ ╱    ╲ ┄┄┄   ╱
                  ╲ ┆   ╱      ╲   ┆ ╱
                   ╲┆  ╱        ╲  ┆╱
                    ╲ ╱          ╲ ╱
                     ╳     ✂     ╳
                    ╱ ╲          ╱ ╲
                   ╱  ┆╲        ╱┆  ╲
                  ╱   ┆  ╲      ╱  ┆  ╲
                 ╱   ┄┄┄  ╲    ╱  ┄┄┄  ╲
                ╱          ╲  ╱          ╲
              ━━━           ━━━           ━━━

       The lattice held every branch so close
         you couldn't tell root from frame.
            Time to let the aspen grow.
```

> *The lattice stays still. The aspen reaches for the light.*

# The Lattice Split

Right now, `libs/engine` does two things at once. It's a library (UI primitives, error framework, rate limiting, Durable Object coordination) and it's also a deployed app (tenant routes, admin panel, API endpoints, auth hooks). A library shouldn't have `src/routes/`. A deployed app shouldn't be inside `libs/`.

This spec fixes that. The library stays clean. The app moves out.

**Type:** Architectural refactor
**Scope:** `libs/engine/` (internal cleanup) + new `apps/aspen/` (Cloudflare Worker)
**Breaking:** No. All `@autumnsgrove/lattice` import paths stay the same.
**Last Updated:** March 14, 2026

### Naming

| Name | What it is | Location |
|------|-----------|----------|
| **Lattice** | The library. Everything in `libs/engine/src/lib/`. UI, curios, heartwood, server, all of it. Published as `@autumnsgrove/lattice`. | `libs/engine/` |
| **Aspen** | The deployment. A Cloudflare Worker running SvelteKit that serves the tenant experience. Routes, hooks, app shell. | `apps/aspen/` |

No `libs/aspen/`. No `@autumnsgrove/aspen`. Two things, not three.

### Prior Art: Prism

Prism (`libs/prism/`, `@autumnsgrove/prism`) proved that extraction from the engine works. But Prism was a clean leaf module (design tokens, zero deps). The lesson that applies here is simpler: the engine can lose code and keep working.

---

## Overview

### What This Is

Two changes:

1. **Internal cleanup.** Fix cross-layer tangles where framework modules (`ui/`, `config/`, `utils/`) import from domain modules (`blazes/`, `curios/`, `server/`). Fix the 65 barrel cascade imports that bloat bundles. The engine's external API doesn't change. Everything stays in `@autumnsgrove/lattice`.

2. **Route extraction.** Move 291 route files, `hooks.server.ts`, and all app-level files from `libs/engine/` to a new `apps/aspen/` Cloudflare Worker. The engine becomes a pure library.

### Goals

- `libs/engine/` has no `src/routes/`. It's a library package, period.
- Framework modules don't reach into domain modules. Internal boundaries are clean.
- No barrel cascade imports pulling 100+ modules when you only need one component.
- The tenant app deploys as a Cloudflare Worker, giving direct control over routing and bindings.

### Non-Goals

- Splitting the engine into multiple packages. Lattice stays one package.
- Changing any `@autumnsgrove/lattice/*` import paths. External consumers see nothing.
- Consolidating other apps (landing, plant, meadow) into Aspen.
- Rewriting any business logic. Same code, better home.

---

## Architecture

### Before: Library + App Tangled Together

```
libs/engine/  →  @autumnsgrove/lattice
├── src/lib/
│   ├── ui/              ← framework (but imports from blazes, curios, data, server)
│   ├── config/          ← framework (but imports from server/petal)
│   ├── utils/           ← framework (but imports from data)
│   ├── errors/          ← framework (test imports from heartwood)
│   ├── curios/          ← domain
│   ├── heartwood/       ← domain
│   ├── server/          ← domain
│   └── ...21 more modules
│
├── src/routes/          ← 291 route files (why is this in a library?)
├── src/hooks.server.ts  ← 837 lines of auth/routing (why is this in a library?)
├── src/app.html         ← HTML shell (why is this in a library?)
└── wrangler.toml        ← Cloudflare deployment config (why is this in a library?)
```

### After: Clean Library + Separate Worker

```
libs/engine/  →  @autumnsgrove/lattice  (pure library, no routes)
├── src/lib/
│   ├── ui/              framework (clean, no domain imports)
│   ├── config/          framework (clean)
│   ├── utils/           framework (clean)
│   ├── errors/          framework (clean)
│   ├── curios/          domain (with its own Svelte components now)
│   ├── heartwood/       domain
│   ├── server/          domain
│   ├── blazes/          domain (with Blaze.svelte moved here)
│   ├── components/      domain chrome (Header, Footer, GroveTerm)
│   └── ...all other modules unchanged
│
│   NO src/routes/. NO hooks. NO app.html. Pure library.
│
apps/aspen/  →  grove-aspen  (Cloudflare Worker)
├── src/
│   ├── routes/          291 route files (moved from engine)
│   ├── hooks.server.ts  auth, routing, CSRF, rate limiting
│   ├── app.html         Grove Entrance overlay, theme detection
│   ├── app.d.ts         type definitions
│   └── app.css          global styles
├── wrangler.toml        Worker bindings (D1, R2, KV, DOs, services)
└── svelte.config.js     adapter-cloudflare (Worker mode)
```

---

## Phase 0: Internal Cleanup

Fix the tangles inside the engine. Nothing moves out of the package. The engine's external API doesn't change. All work happens inside `libs/engine/src/lib/`.

### Surgery Points

10 places where framework modules import from domain modules. Each one is a dependency going the wrong direction.

#### S1. `ui/` imports from `blazes/`

**File:** `ui/components/indicators/Blaze.svelte`
**Imports:** `BLAZE_CONFIG`, `BLAZE_COLORS`, `resolveLucideIcon`, `isValidBlazeHexColor`

**Fix:** Move `Blaze.svelte` to `blazes/components/Blaze.svelte`. It's a domain component. The remaining indicators (StatusBadge, ScoreBar, CreditBalance) stay in `ui/`. Update barrel in `ui/components/indicators/index.ts`. Add new barrel at `blazes/components/index.ts`. Add `./blazes/components` to engine's package.json exports.

**Scope:** 9 consumers (6 engine routes, 3 meadow components), 2 barrel files, 1 package.json entry. ~13 files total.

#### S2. `ui/` imports from `data/` (Grove terminology)

**Files (groveterm/, 6 files):**
- `ui/components/ui/groveterm/GroveTerm.svelte`
- `ui/components/ui/groveterm/GroveTermPopup.svelte`
- `ui/components/ui/groveterm/GroveText.svelte`
- `ui/components/ui/groveterm/types.ts`
- `ui/components/ui/groveterm/index.ts`
- `ui/components/ui/groveterm/groveterm.test.ts`

**Files (chrome/, 3 files):**
- `ui/components/chrome/Header.svelte`
- `ui/components/chrome/Footer.svelte`
- `ui/components/chrome/MobileMenu.svelte`

All import `grove-term-manifest.json` from `$lib/data/`. None are exported to external packages.

**Fix:** Move groveterm to `components/terminology/`. Move chrome to `components/chrome/`. Both follow the existing `components/` pattern (alongside `components/admin/`, `components/editor/`, `components/reeds/`).

**Scope:** 26 internal groveterm consumers + 3 chrome consumers. ~35 files total.

#### S3. `ui/` imports from `curios/`

**39 files** in `ui/components/content/curios/`:
- 13 main curio components (CurioHitcounter, CurioPoll, CurioMoodring, CurioBadges, etc.)
- 24 artifact components in `artifacts/` (20 individual artifacts + renderers + config form + test)
- 1 barrel `index.ts`

All import types and utilities from `$lib/curios/*`. The `curios/` domain directory already contains Svelte components in `pulse/`, `shrines/`, `guestbook/`, and `timeline/`.

**Fix:** Move the entire `ui/components/content/curios/` subtree into the `curios/` domain module. Update `ContentWithGutter.svelte`'s dynamic import path.

**Scope:** 3 consumers. ~44 files total.

#### S4. `ui/` imports `Friend` type from `server/`

**Files:** `ui/stores/friends.svelte.ts`, `ui/components/chrome/FriendsLoader.svelte`, `ui/components/chrome/lantern/LanternFriendCard.svelte`, `ui/components/chrome/lantern/LanternAddFriends.svelte`

The `Friend` interface is 4 string properties (`tenantId`, `name`, `subdomain`, `source`). No dependencies on other server types.

**Fix:** Extract `Friend` to `types/friend.ts`. Update 4 consumers. ~5 files.

#### S5. `utils/rehype-groveterm` imports from `data/`

**File:** `utils/rehype-groveterm.ts` (line 27)

The plugin API already accepts an optional `manifest` parameter. Tests pass custom manifests. The module-level `import manifestData from "$lib/data/grove-term-manifest.json"` is the only problem.

**Fix:** Remove the hardcoded import. Make `manifest` required, or move the default into the caller. ~2 files.

#### S6. `lumen/` imports from `server/` (encryption)

Both `lumen/` and `server/` are domain modules in the same package. Domain-to-domain. No surgery needed.

#### S7. `errors/` test imports from `heartwood/`

**File:** `errors/integrity.test.ts` (line 17)
**Imports:** `AUTH_ERRORS` from `../heartwood/errors`

Test-only import. The test validates the real auth error catalog, which is valuable. Inlining constants would decouple the test from reality.

**Fix:** Leave as-is. Both modules stay in the same package. This is an internal cross-reference, not a layer violation worth breaking. ~0 files.

#### S8. Root `index.ts` re-exports `heartwood/`

**File:** `libs/engine/src/lib/index.ts` (lines 75-119)
**Exports:** 23 items (GroveAuthClient, quota utils, rate limiting, types)

Zero external consumers. Every app imports heartwood through `@autumnsgrove/lattice/heartwood`, not the root barrel.

**Fix:** Remove 45 lines of dead re-exports. ~1 file.

#### S9. `config/` imports from `server/` (Petal types)

**File:** `config/petal.ts` (lines 10-13)
**Imports:** `PetalCategory`, `PetalProviderConfig` from `$lib/server/petal/types.js`

Type-only. No runtime coupling.

**Fix:** Extract types to `types/petal.ts`. Update `config/petal.ts`. ~2 files.

#### S10. `ui/` imports from `server/` (Chat WebSocket types)

**Files:** `ui/chat/types.ts`, `ui/chat/connection.svelte.ts`, `ui/stores/chat.svelte.ts`
**Imports:** 14 chat protocol types from `$lib/server/services/chat.types.js`

All type-only. Protocol definitions (message shapes, content types).

**Fix:** Extract chat protocol types to `types/chat.ts`. Update 3 consumers. ~4 files.

### Barrel Cascade Cleanup

65 files import through mega-barrels like `$lib/ui` or `$lib/ui/components/ui`, pulling CSS side effects that Vite can't tree-shake. This bloats route bundles and can break hydration.

**Rule:** Svelte files use direct imports, not barrel imports. `import X from "$lib/ui/components/ui/X.svelte"`, not `import { X } from "$lib/ui"`.

**Fix:** Update all 65 files to use direct imports. Suppress intentional barrel usage with `// barrel-ok`. The pre-commit hook (added March 2026) already checks for new violations.

**Scope:** ~65 files.

### Phase 0 PR Strategy

**PR 1: "Extract cross-layer types to framework boundary"** (~14 files, low risk)
Surgeries S4, S5, S8, S9, S10. Type extractions and dead re-export removal. No component moves. Validates the approach.

**PR 2: "Move domain components out of ui/"** (~97 files, medium risk)
Surgeries S1, S2, S3. The big component move. Blaze, groveterm, chrome, and all curio display components relocate to their domain directories.

**PR 3: "Fix barrel cascade imports"** (~65 files, low risk per file)
All 65 barrel imports updated to direct imports. Mechanical change. Each file is independent.

**PR 4: "Verify clean internal boundaries"** (trivial)
Grep for remaining framework-to-domain imports. Full engine build + test suite.

---

## Phase 1: Create `apps/aspen/` Worker

Set up the Cloudflare Worker that will serve the tenant experience.

**Why a Worker, not Pages:** The engine currently deploys as a Cloudflare Pages project (`grove-lattice`). Workers give better control over routing, native Durable Object bindings without the Pages Functions abstraction, `wrangler dev` with full binding simulation, and cleaner deployment via `wrangler deploy`. For an app with 7 DOs, 2 D1 databases, 3 R2 buckets, and 3 service bindings, Workers is the right choice.

**Checklist:**

- [ ] Create `apps/aspen/` directory
- [ ] `package.json` with deps on `@autumnsgrove/lattice`, `@autumnsgrove/prism`, `@autumnsgrove/foliage`
- [ ] `svelte.config.js` with `@sveltejs/adapter-cloudflare` (Worker mode)
- [ ] `tsconfig.json` extending monorepo base
- [ ] `vite.config.ts`
- [ ] `wrangler.toml` with all bindings (see Aspen spec for full list):
  - D1: `DB` (grove-engine-db), `CURIO_DB` (grove-curios-db)
  - R2: `IMAGES` (grove-media), `EXPORTS_BUCKET` (grove-exports), `IMAGES_SOURCE`
  - KV: `CACHE_KV`, `FLAGS_KV`
  - DOs: `TENANTS`, `POST_META`, `POST_CONTENT`, `SENTINEL`, `EXPORTS`, `THRESHOLD`, `CHAT`
  - Services: `AUTH` (groveauth), `ZEPHYR` (grove-zephyr), `REVERIE` (grove-reverie)
  - AI: `AI` (Petal image moderation)
  - 30+ env vars and secrets
- [ ] `tailwind.config.js` scanning `libs/engine/src/lib/`
- [ ] Verify: `pnpm install` resolves, `wrangler dev` starts

---

## Phase 2: Move Routes and App Files

One big PR. All 291 route files, hooks, and app-level files move from `libs/engine/src/` to `apps/aspen/src/`.

**App-level files:**
- `hooks.server.ts` (837 lines: subdomain routing, auth, CSRF, rate limiting, CSP, security headers)
- `app.html` (249 lines: Grove Entrance overlay, theme detection, PWA manifest)
- `app.d.ts` (197 lines: App.Locals, App.Platform, tenant types, env bindings)
- `app.css` (global styles)

**Route groups (291 files):**
- `arbor/` (admin panel, 99 files)
- `api/` (144 files across 31 endpoint groups)
- `garden/` (blog content)
- `auth/` (login, callback, logout, magic link)
- `(tenant)/`, `(site)/`, `(apps)/` (layout groups)
- Root routes (`+layout.svelte`, `+page.svelte`, etc.)

**For each route file:**
1. Move the file
2. Update `$lib/` imports to `@autumnsgrove/lattice/` imports
3. No subpath changes needed (the modules haven't moved, just the routes)

**Checklist:**

- [ ] Move all app-level files to `apps/aspen/src/`
- [ ] Move all route files to `apps/aspen/src/routes/`
- [ ] Update `$lib/` imports in routes to `@autumnsgrove/lattice/` package imports
- [ ] Remove `src/routes/`, `src/hooks.server.ts`, `src/app.html`, `src/app.d.ts`, `src/app.css` from `libs/engine/`
- [ ] Remove `wrangler.toml` deployment config from `libs/engine/`
- [ ] Update `libs/engine/svelte.config.js` (no more adapter, no more prerendering)
- [ ] Update `services/grove-router/` to point default fallback to `grove-aspen` Worker
- [ ] Deploy secrets via `gw secret apply --worker grove-aspen`
- [ ] Verify: `wrangler dev` runs locally with all bindings
- [ ] Verify: `wrangler deploy` succeeds
- [ ] Verify: tenant subdomain routing works via X-Forwarded-Host
- [ ] Verify: auth flow (SessionDO + Heartwood OAuth + JWT fallback)
- [ ] Verify: CSRF, rate limiting, CSP headers all function
- [ ] Verify: engine still builds as a library (`pnpm --filter @autumnsgrove/lattice run build:package`)

---

## Phase 3: Verify Everything

- [ ] `pnpm install` from root succeeds
- [ ] Every package builds: `pnpm -r run build`
- [ ] CI passes: `gw ci`
- [ ] `libs/engine/` has no `src/routes/` directory
- [ ] No framework module imports from domain modules (grep check)
- [ ] No barrel cascade imports remain (pre-commit hook passes)
- [ ] Staging deploy of `grove-aspen` Worker succeeds
- [ ] Blue-green traffic shift from `grove-lattice` Pages to `grove-aspen` Worker
- [ ] Monitor error rates, DO performance, auth success rates

---

## Risks and Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Phase 0 surgery volume (~116 files across 10 points) | Medium | Group into 4 PRs by risk profile. Type extractions first. |
| `ContentWithGutter.svelte` dynamic imports | Medium | Uses `` import(`$lib/ui/components/content/curios/Curio${name}.svelte`) `` which breaks after S3. Update dynamic import path. |
| `hooks.server.ts` complexity (837 lines) | High | Copy to `apps/aspen/`, don't rewrite. Diff-based review. Test auth, CSRF, rate limiting, CSP independently. |
| Worker vs Pages migration | Medium | SvelteKit's `adapter-cloudflare` supports Workers. Bindings are the same, just configured in `wrangler.toml` instead of Pages Functions. |
| Router cutover | Medium | Blue-green deployment. Run both `grove-lattice` (Pages) and `grove-aspen` (Worker). Gradual traffic shift via router config. Rollback is one line change. |
| Binding mismatch | Medium | If `wrangler.toml` bindings don't match what `hooks.server.ts` expects, the app fails. Copy bindings exactly from engine's wrangler.toml. Test each binding class. |
| Barrel cleanup scope (65 files) | Low | Each file is independent. Mechanical find-replace. Pre-commit hook validates. |
| Route import updates | Medium | 291 files need `$lib/` changed to `@autumnsgrove/lattice/`. Scriptable, but needs verification. TypeScript compiler catches misses. |

---

## Security Considerations

- No auth logic changes. `hooks.server.ts` moves to `apps/aspen/` with identical behavior.
- No database changes. Same schema, same queries.
- No API changes. Same endpoints, same handlers. They import from `@autumnsgrove/lattice` instead of `$lib`.
- Multi-tenant isolation unchanged. `WHERE tenant_id = ?` patterns are structural.
- Worker deployment inherits the same Cloudflare security model (DDoS protection, TLS, WAF).

---

## Spec History

### v1 (March 1st, 2026)

Original spec proposed a three-way split: `@autumnsgrove/lattice` (framework lib), `@autumnsgrove/grove` (domain lib), and `apps/grove/` (app). Domain lib was later renamed from `grove` to `trellis` to `aspen`. Identified 8 surgery points and 17 domain modules.

### v2 (March 10th, 2026)

Module count updated to 21. Surgery points expanded. Prism extraction noted as prior art. GroveTerm files updated after PR #1470 consolidation.

### v3 (March 14th, 2026)

Full codebase audit. Scope changed from three-way to two-way split. No `libs/aspen/` package. All modules stay in Lattice. `apps/aspen/` deploys as a Cloudflare Worker (not Pages). Two new surgery points found (S9: config/petal types, S10: ui/chat types). Barrel cascade cleanup (65 files) added to scope. Surgery counts verified with exact file numbers. Phase 0 PR strategy defined. Total scope: ~180 files changed across 4 phases.

---

## Implementation Checklist (Summary)

- [ ] **Phase 0:** Internal cleanup (10 surgeries + 65 barrel fixes, 4 PRs)
- [ ] **Phase 1:** Create `apps/aspen/` Worker scaffold
- [ ] **Phase 2:** Move 291 routes + app files (1 PR)
- [ ] **Phase 3:** Verify everything, blue-green cutover

---

*The lattice stays whole. The aspen finds its own light.*
