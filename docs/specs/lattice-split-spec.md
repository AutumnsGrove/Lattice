---
title: "The Lattice Split — Untangling Engine from Grove"
description: "Architectural specification for separating the reusable Lattice framework from Grove-specific domain code."
category: specs
specCategory: core-infrastructure
icon: scissors
lastUpdated: "2026-03-01"
aliases: []
date created: Sunday, March 1st 2026
date modified: Sunday, March 1st 2026
tags:
  - core
  - architecture
  - refactor
  - lattice
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

      The vine grew so deep into the trellis
        that you couldn't tell them apart.
            Time to untangle them.
```

> _Separate the structure from what grows on it._

# The Lattice Split

Right now, `libs/engine` is one package that does two things. It's the framework (the lattice itself, the trellis, the structure) and it's also the living Grove (the vine, the domain, the features people actually touch). When something breaks in production, you're debugging inside the framework package, scrolling past rate limiters and Durable Object coordinators to find the curio that's misbehaving. When you want to understand what the engine *is*, you're staring at 140+ exports mixing UI primitives with Stripe billing hooks.

This spec separates them. The lattice stays as the structure. The grove becomes its own thing.

**Type:** Architectural refactor
**Scope:** `libs/engine/`, new `libs/grove/`, new `apps/grove/`
**Breaking:** Yes. All import paths for domain modules change.
**Last Updated:** March 2026

---

## Overview

### What This Is

A plan to split `libs/engine` (published as `@autumnsgrove/lattice`) into two clear layers: the reusable framework and the Grove-specific domain code. Plus a new `apps/grove/` that serves as the tenant-facing live lattice deployment.

### Goals

- **Clarity.** When debugging, you know immediately whether you're in framework code or domain code.
- **Clean boundaries.** The engine has zero knowledge of Grove's business logic. The domain lib depends on the engine, never the reverse.
- **Debuggability.** Stack traces tell you where you are. Import paths tell you what layer you're in.

### Non-Goals (Out of Scope)

- Making the engine reusable for non-Grove projects. This is about clarity within Grove.
- Publishing `libs/grove` to npm. It stays as a workspace-only lib.
- Consolidating existing apps (landing, plant, meadow, etc.) into `apps/grove/`.
- Changing any runtime behavior. This is a structural refactor only.

---

## Architecture

### Before: One Package, Two Concerns

```
libs/engine/  →  @autumnsgrove/lattice
├── ui/              ← framework
├── utils/           ← framework
├── errors/          ← framework
├── config/          ← framework
├── feature-flags/   ← framework
├── threshold/       ← framework
├── loom/            ← framework
├── server/          ← DOMAIN (56 files of business logic)
├── db/              ← DOMAIN (Drizzle schema, Grove tables)
├── curios/          ← DOMAIN (timeline, guestbook, polls...)
├── heartwood/       ← DOMAIN (Grove's auth client)
├── payments/        ← DOMAIN (Stripe, billing tiers)
├── thorn/           ← DOMAIN (content moderation)
├── lumen/           ← DOMAIN (AI gateway)
├── warden/          ← DOMAIN (API gateway)
├── email/           ← DOMAIN (templates, delivery)
├── components/      ← DOMAIN (WispPanel, MarkdownEditor)
├── blazes/          ← DOMAIN (content marking)
└── ...14 more domain modules
```

Everything imports from `@autumnsgrove/lattice/*`. You can't tell from an import whether you're pulling in a UI primitive or a Stripe webhook handler.

### After: Two Packages, Clear Layers

```
libs/
├── engine/          →  @autumnsgrove/lattice     (the trellis)
│   └── src/lib/
│       ├── actions/         Svelte actions
│       ├── auth/            Session verification helpers
│       ├── config/          Configuration presets
│       ├── errors/          Signpost error catalog
│       ├── feature-flags/   Feature management framework
│       ├── foliage/         Theme system bridge
│       ├── loom/            Durable Objects framework
│       ├── styles/          CSS design tokens
│       ├── threshold/       Rate limiting framework
│       ├── ui/              Glass design system
│       └── utils/           Markdown, sanitization, image
│
├── grove/           →  @autumnsgrove/grove       (the vine)
│   └── src/lib/
│       ├── amber/           Storage SDK
│       ├── blazes/          Content marking
│       ├── components/      WispPanel, MarkdownEditor, etc.
│       ├── curios/          Timeline, guestbook, polls, etc.
│       ├── data/            Grove terminology manifest
│       ├── db/              Drizzle schema + clients
│       ├── email/           Email templates
│       ├── firefly/         Server provisioning
│       ├── grafts/          Feature flag UI components
│       ├── heartwood/       Auth client
│       ├── lumen/           AI gateway
│       ├── payments/        Stripe integration
│       ├── scribe/          Activity recording
│       ├── server/          Business logic, DB queries
│       ├── thorn/           Content moderation
│       ├── warden/          API gateway
│       └── zephyr/          Email gateway

apps/
├── grove/           →  The live lattice (tenant-facing SvelteKit app)
├── landing/         →  grove.place marketing
├── plant/           →  Onboarding
├── meadow/          →  Community feed
└── ...              →  Other existing apps unchanged
```

### Dependency Direction

```
                    ┌──────────────────────────┐
                    │       apps/grove/         │
                    │    apps/plant/  etc.       │
                    └─────┬──────────┬──────────┘
                          │          │
              imports     │          │     imports
                          ▼          ▼
         ┌────────────────────┐  ┌────────────────────┐
         │  @autumnsgrove/    │  │  @autumnsgrove/    │
         │      grove         │  │     lattice        │
         │   (domain lib)     │  │   (framework)      │
         └────────┬───────────┘  └────────────────────┘
                  │                        ▲
                  │       depends on       │
                  └────────────────────────┘

         grove depends on lattice.
         lattice knows nothing about grove.
         apps import from both.
```

The arrow only goes one direction. The engine never imports from the domain lib. The domain lib builds on the engine. Apps consume both.

---

## The Split Line

### What Stays in the Engine (`@autumnsgrove/lattice`)

Framework code. Things that have no opinion about what Grove *is*.

| Module | Purpose | Why it's engine |
|--------|---------|-----------------|
| `actions/` | Svelte actions (click-outside) | Generic browser behavior |
| `auth/` | Session verification helpers | Generic auth primitives |
| `config/` | Configuration presets, tiers | Structural definitions |
| `errors/` | Signpost error catalog | Generic error framework |
| `feature-flags/` | Boolean flags, percentage rollouts | Generic feature management |
| `foliage/` | Theme system bridge | Generic theming |
| `loom/` | Durable Objects framework | Generic DO coordination |
| `styles/` | CSS design tokens, fonts, patterns | Generic design tokens |
| `threshold/` | Rate limiting with storage adapters | Generic rate limiting |
| `ui/` | Glass design system, all primitives | Generic UI components |
| `utils/` | Markdown, sanitization, image processing | Generic utilities |

### What Moves to the Domain Lib (`@autumnsgrove/grove`)

Grove's soul. The things that make it *this* platform.

| Module | Files | Purpose | Key dependencies on engine |
|--------|-------|---------|---------------------------|
| `amber/` | 9 | Storage SDK, quotas, exports | `server/db/schema` |
| `blazes/` | 3 | Content marking, custom tags | None (leaf module) |
| `components/` | ~15 | WispPanel, MarkdownEditor, GutterManager | `ui/`, `config/` |
| `curios/` | ~23 dirs | Timeline, guestbook, polls, gallery... | `utils/` |
| `data/` | 1 | Grove terminology manifest (JSON) | None (leaf module) |
| `db/` | ~10 | Drizzle schema, database clients | `errors/` |
| `email/` | ~8 | Email templates, rendering | `config/` |
| `firefly/` | 20 | Server provisioning (Hetzner, Fly) | `loom/`, `errors/` |
| `grafts/` | ~8 | Feature flag UI components | `config/`, `feature-flags/` |
| `heartwood/` | 8 | GroveAuth client, quotas, limits | `config/`, `errors/` |
| `lumen/` | 20 | AI gateway, multi-provider routing | `config/`, `errors/` |
| `payments/` | ~5 | Stripe integration, billing | None (leaf module) |
| `scribe/` | 1 | Activity recording | None (leaf module) |
| `server/` | 56 | Business logic, DB queries, observability | `config/`, `feature-flags/`, `threshold/`, `errors/` |
| `thorn/` | 12 | Content moderation | `lumen/`, `threshold/` |
| `warden/` | 12 | API gateway SDK | None (leaf module) |
| `zephyr/` | ~5 | Email + social broadcasting | None (leaf module) |

### What the New App Is (`apps/grove/`)

The live lattice. The thing tenants interact with every day. Their pages, their admin panels, their posts and curios. It's a SvelteKit app on Cloudflare Pages that imports from both `@autumnsgrove/lattice` (framework) and `@autumnsgrove/grove` (domain).

This is distinct from:
- `apps/landing/` (marketing at grove.place)
- `apps/plant/` (onboarding at plant.grove.place)
- `apps/meadow/` (community feed at meadow.grove.place)

`apps/grove/` is the *grove itself*. The tenant subdomain. The daily experience.

---

## Surgery Points

The split is mostly clean cuts. Dependencies flow downward, no circular imports exist. But five places in the framework currently reach into domain code. These need resolving **before** any modules move.

### 1. `ui/` imports from `blazes/`

**File:** `ui/components/indicators/Blaze.svelte`
**Imports:** `BLAZE_CONFIG`, `BLAZE_COLORS`, `resolveLucideIcon`, `isValidBlazeHexColor`

**Fix:** Move `Blaze.svelte` to `libs/grove`. It's a domain component wearing a framework disguise. The UI layer should have a generic `Badge` or `Indicator` primitive. `Blaze.svelte` wraps that with Grove-specific config.

### 2. `ui/` imports from `data/` (Grove terminology)

**Files:**
- `ui/components/chrome/Header.svelte`
- `ui/components/chrome/Footer.svelte`
- `ui/components/chrome/MobileMenu.svelte`
- `ui/components/ui/groveterm/GroveIntro.svelte`
- `ui/components/ui/groveterm/GroveSwap.svelte`
- `ui/components/ui/groveterm/GroveTerm.svelte`

**Imports:** `grove-term-manifest.json`

**Fix:** The `groveterm/` components are entirely Grove-specific. Move them to `libs/grove`. For `Header.svelte`, `Footer.svelte`, and `MobileMenu.svelte`, either:
- (a) Accept the terminology manifest as a prop instead of importing it, or
- (b) Move these chrome components to `libs/grove` since they're Grove-branded anyway

Option (b) is probably right. A generic engine wouldn't have a branded Header. The engine keeps a `BaseHeader` slot component. Grove wraps it.

### 3. `ui/` imports from `curios/`

**Files:**
- `ui/components/content/curios/CurioMoodring.svelte`
- `ui/components/content/curios/CurioGuestbook.svelte`

**Imports:** Moodring color functions, guestbook types

**Fix:** Move `ui/components/content/curios/` to `libs/grove`. These are domain components, not UI primitives.

### 4. `config/petal.ts` imports from `server/`

**File:** `config/petal.ts`
**Imports:** `PetalCategory`, `PetalProviderConfig` from `$lib/server/petal/types.js`

**Fix:** Extract `PetalCategory` and `PetalProviderConfig` type definitions into `config/petal.ts` directly. The types belong with config. The server implementation uses them, not the other way around.

### 5. `utils/rehype-groveterm` imports from `data/`

**File:** `utils/rehype-groveterm.ts`
**Imports:** `grove-term-manifest.json`

**Fix:** Make the rehype plugin accept a terminology manifest as a parameter instead of hardcoding the import. The engine provides the generic `rehypeTermReplace(manifest)` function. The domain lib calls it with Grove's manifest.

### 6. Root `index.ts` re-exports `heartwood/`

**File:** `libs/engine/src/lib/index.ts` (lines 75-119)
**Exports:** `GroveAuthClient`, `createGroveAuthClient`, `TIER_POST_LIMITS`, `TIER_NAMES`, quota utilities

**Fix:** Remove these re-exports. After the split, apps import heartwood from `@autumnsgrove/grove/heartwood` instead.

---

## Import Migration

### The Clean Break

Every import from a moved module changes package name. The subpath stays the same.

```typescript
// BEFORE (everything from lattice)
import { GlassCard }         from "@autumnsgrove/lattice/ui";
import { createDb }          from "@autumnsgrove/lattice/db";
import { GroveAuthClient }   from "@autumnsgrove/lattice/heartwood";
import { TimelineCurio }     from "@autumnsgrove/lattice/curios/timeline";
import { buildErrorJson }    from "@autumnsgrove/lattice/errors";

// AFTER (framework from lattice, domain from grove)
import { GlassCard }         from "@autumnsgrove/lattice/ui";       // unchanged
import { createDb }          from "@autumnsgrove/grove/db";         // moved
import { GroveAuthClient }   from "@autumnsgrove/grove/heartwood";  // moved
import { TimelineCurio }     from "@autumnsgrove/grove/curios/timeline"; // moved
import { buildErrorJson }    from "@autumnsgrove/lattice/errors";   // unchanged
```

### Scope of Changes

Every file that imports a domain module from `@autumnsgrove/lattice` needs updating. This affects:

- All `apps/*` (9 apps)
- All `services/*` (10 services)
- All `workers/*` (7 workers)
- `libs/gossamer/`, `libs/foliage/`, `libs/vineyard/`

The change is mechanical. `@autumnsgrove/lattice/<domain-module>` becomes `@autumnsgrove/grove/<domain-module>`. The subpath is identical.

### Tailwind Content Paths

Every app's `tailwind.config.js` currently scans `libs/engine/` for classes. After the split, they scan both:

```javascript
// BEFORE
content: [
  "./src/**/*.{html,js,svelte,ts}",
  "../../libs/engine/src/lib/**/*.{html,js,svelte,ts}",
],

// AFTER
content: [
  "./src/**/*.{html,js,svelte,ts}",
  "../../libs/engine/src/lib/**/*.{html,js,svelte,ts}",
  "../../libs/grove/src/lib/**/*.{html,js,svelte,ts}",   // added
],
```

---

## Execution Plan

### Phase 0: Untangle Cross-Layer Dependencies

Resolve the six surgery points listed above while everything still lives in one package. This is the hardest phase. Nothing moves yet. When it's done, every framework module has zero imports from any domain module.

**Requirements:**

| ID | Pattern | Requirement | Priority |
|----|---------|-------------|----------|
| REQ-001 | Ubiquitous | After Phase 0, no file in `actions/`, `auth/`, `config/`, `errors/`, `feature-flags/`, `foliage/`, `loom/`, `styles/`, `threshold/`, `ui/`, or `utils/` shall import from any domain module. | Must Have |
| REQ-002 | Event-Driven | When a surgery point is resolved, the engine shall build and pass all existing tests without changes to any app code. | Must Have |

**Checklist:**

- [ ] Move `Blaze.svelte` from `ui/indicators/` to a domain-appropriate location
- [ ] Move `groveterm/` components out of `ui/`
- [ ] Move `CurioMoodring.svelte` and `CurioGuestbook.svelte` out of `ui/`
- [ ] Evaluate Header/Footer/MobileMenu. Extract or parameterize terminology
- [ ] Extract `PetalCategory`/`PetalProviderConfig` types into `config/`
- [ ] Make `rehype-groveterm` accept manifest as parameter
- [ ] Remove heartwood re-exports from root `index.ts`
- [ ] Verify: `grep` for any remaining cross-layer imports
- [ ] Verify: engine builds cleanly

### Phase 1: Create `libs/grove/`

Set up the new workspace library.

**Checklist:**

- [ ] Create `libs/grove/` directory structure
- [ ] Create `package.json` with name `@autumnsgrove/grove`, `workspace:*` dep on `@autumnsgrove/lattice`
- [ ] Create `svelte.config.js` (SvelteKit library package format)
- [ ] Create `tsconfig.json` extending the monorepo base
- [ ] Create `vite.config.js` with svelte-package build
- [ ] Add to `pnpm-workspace.yaml` (already covered by `libs/*` glob)
- [ ] Define export map in `package.json` mirroring domain module paths
- [ ] Verify: `pnpm install` resolves the new package

### Phase 2: Move Domain Modules

Move modules from `libs/engine/src/lib/` to `libs/grove/src/lib/` in dependency order.

**Wave 1 — Leaf modules (no domain cross-deps):**
- [ ] `data/`
- [ ] `blazes/`
- [ ] `scribe/`
- [ ] `payments/`
- [ ] `warden/`
- [ ] `zephyr/`

**Wave 2 — Engine-dependent modules:**
- [ ] `db/` (depends on `errors/`)
- [ ] `heartwood/` (depends on `config/`, `errors/`)
- [ ] `lumen/` (depends on `config/`, `errors/`)
- [ ] `email/` (depends on `config/`)
- [ ] `grafts/` (depends on `config/`, `feature-flags/`)

**Wave 3 — Domain-cross-dependent modules:**
- [ ] `server/` (depends on `config/`, `feature-flags/`, `threshold/`, `errors/`)
- [ ] `amber/` (depends on `db/`)
- [ ] `thorn/` (depends on `lumen/`, `threshold/`)
- [ ] `firefly/` (depends on `loom/`, `errors/`)
- [ ] `components/` (depends on `ui/`, `config/`)
- [ ] `curios/` (depends on `utils/`)

**For each module:**
1. Move the directory
2. Update internal imports: `$lib/X` stays as `$lib/X` for domain-to-domain refs
3. Update imports from engine modules: `$lib/X` becomes `@autumnsgrove/lattice/X`
4. Verify: the module's TypeScript compiles

### Phase 3: Update Engine Exports

- [ ] Remove all moved module paths from `libs/engine/package.json` exports
- [ ] Clean up root `index.ts` (remove domain re-exports)
- [ ] Verify: engine builds with `pnpm --filter @autumnsgrove/lattice run build:package`
- [ ] Verify: `libs/grove` builds with its new export map

### Phase 4: Update All Consumer Imports (Clean Break)

For every file in `apps/`, `services/`, `workers/`, and other `libs/`:

- [ ] Find-and-replace `@autumnsgrove/lattice/<domain-module>` to `@autumnsgrove/grove/<domain-module>` for all moved modules
- [ ] Add `@autumnsgrove/grove` as `workspace:*` dependency to every consuming `package.json`
- [ ] Update every `tailwind.config.js` to include `libs/grove/` content path
- [ ] Update any `tsconfig.json` path aliases if applicable
- [ ] Run `pnpm install` to wire workspace dependencies
- [ ] Verify: every app/service/worker builds

### Phase 5: Create `apps/grove/`

- [ ] Create SvelteKit app skeleton
- [ ] Set up `wrangler.toml` with all Cloudflare bindings (DB, CURIO_DB, OBS_DB, KV, R2, service bindings)
- [ ] Set up `hooks.server.ts` with auth, session handling
- [ ] Move or create tenant-facing routes (the pages and admin panels tenants use daily)
- [ ] Import from both `@autumnsgrove/lattice` and `@autumnsgrove/grove`
- [ ] Set up `tailwind.config.js` scanning both libs
- [ ] Verify: app builds and deploys to Cloudflare Pages

### Phase 6: Verify Everything

- [ ] `pnpm install` from root succeeds
- [ ] Every package in the workspace builds: `pnpm -r run build`
- [ ] CI passes: `gw dev ci --affected --fail-fast --diagnose`
- [ ] No remaining imports of `@autumnsgrove/lattice/<domain-module>` in any consumer
- [ ] No remaining imports of domain modules from any engine file
- [ ] Staging deploy of at least one app succeeds

---

## Risks and Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Volume of import changes (140+ paths across 26+ packages) | Medium | Mechanical find-and-replace. Script it. Subpaths don't change, only package name. |
| Surgery points in `ui/` require real refactoring | High | Do Phase 0 first, in isolation. Everything still builds as one package during surgery. No consumer changes needed. |
| Build ordering in pnpm workspace | Low | `libs/engine` must build before `libs/grove`. pnpm workspace protocol handles this via dependency graph. Verify with `pnpm -r run build`. |
| Tailwind class purging | Medium | If any app forgets to add `libs/grove/` to its content paths, classes from domain components get purged silently. Add a CI check that greps for the content path. |
| TypeScript path resolution | Low | `$lib/` alias in `libs/grove` resolves to `libs/grove/src/lib/` automatically via SvelteKit conventions. Cross-package imports use full package names. |
| `apps/grove/` route ownership | Medium | Clarify which routes move to `apps/grove/` vs stay in existing apps. The tenant-facing routes are the scope. Marketing stays in landing. Onboarding stays in plant. |

---

## Security Considerations

- No auth logic changes. Heartwood moves packages but its behavior is identical.
- No database changes. Schema stays the same, just lives in a different directory.
- No API changes. Endpoints work the same, they just import from `@autumnsgrove/grove` instead of `@autumnsgrove/lattice`.
- Multi-tenant isolation remains unchanged. `WHERE tenant_id = ?` patterns are structural, not affected by which package they live in.

---

## Implementation Checklist (Summary)

- [ ] **Phase 0:** Resolve 6 surgery points (cross-layer deps)
- [ ] **Phase 1:** Create `libs/grove/` package
- [ ] **Phase 2:** Move 17 domain modules in 3 waves
- [ ] **Phase 3:** Clean up engine exports
- [ ] **Phase 4:** Update all consumer imports (clean break)
- [ ] **Phase 5:** Create `apps/grove/` deployment
- [ ] **Phase 6:** Full verification pass

---

*The vine and the trellis, finally, each knowing where they end and the other begins.*
