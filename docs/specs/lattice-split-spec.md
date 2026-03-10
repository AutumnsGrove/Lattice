---
title: "The Lattice Split — Lattice and Trellis"
description: "Architectural specification for separating the reusable Lattice framework from the Trellis live deployment domain code."
category: specs
specCategory: core-infrastructure
icon: scissors
lastUpdated: "2026-03-10"
aliases: []
date created: Sunday, March 1st 2026
date modified: Tuesday, March 10th 2026
tags:
  - core
  - architecture
  - refactor
  - lattice
  - trellis
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

Right now, `libs/engine` is one package that does two things. It's the framework (Lattice, the structure, the support system) and it's also the living deployment (what tenants interact with daily). When something breaks in production, you're debugging inside the framework package, scrolling past rate limiters and Durable Object coordinators to find the curio that's misbehaving. When you want to understand what the engine *is*, you're staring at 140+ exports mixing UI primitives with Stripe billing hooks.

This spec separates them. The framework stays as **Lattice**. The live deployment becomes **Trellis**.

**Type:** Architectural refactor
**Scope:** `libs/engine/`, new `libs/trellis/`, new `apps/trellis/`
**Breaking:** Yes. All import paths for domain modules change.
**Last Updated:** March 2026

### Naming

| Name | What it is | Package | Location |
|------|-----------|---------|----------|
| **Lattice** | The framework. UI, utilities, error system, feature flags, rate limiting, DO coordination. The structure things grow on. | `@autumnsgrove/lattice` (npm published) | `libs/engine/` |
| **Trellis** | The live deployment. Domain logic, database, auth, payments, curios, moderation. The thing tenants actually use. | `@autumnsgrove/trellis` (workspace lib) | `libs/trellis/` |
| **Trellis App** | The SvelteKit app that serves the live tenant experience. Pages, admin panels, daily interaction. | N/A (app, not a lib) | `apps/trellis/` |

### Prior Art: Prism

This split follows the pattern established by **Prism** (`libs/prism/`, `@autumnsgrove/prism`), which was recently extracted from the engine as a standalone design token package. Prism proved that extraction works: isolate the concern, create the package, update imports. The Lattice/Trellis split is the same idea, just larger.

---

## Overview

### What This Is

A plan to split `libs/engine` (published as `@autumnsgrove/lattice`) into two clear layers: the reusable framework (Lattice) and the Grove-specific domain code (Trellis). Plus a new `apps/trellis/` that serves as the tenant-facing live deployment.

### Goals

- **Clarity.** When debugging, you know immediately whether you're in framework code or domain code. The import path tells you.
- **Clean boundaries.** Lattice has zero knowledge of Grove's business logic. Trellis depends on Lattice, never the reverse.
- **Debuggability.** Stack traces tell you where you are. `@autumnsgrove/lattice/ui` is framework. `@autumnsgrove/trellis/curios/timeline` is domain. No ambiguity.

### Non-Goals (Out of Scope)

- Making the engine reusable for non-Grove projects. This is about clarity within Grove.
- Publishing `libs/trellis` to npm. It stays as a workspace-only lib.
- Consolidating existing apps (landing, plant, meadow, etc.) into `apps/trellis/`.
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
├── reverie/         ← DOMAIN (schema registry)
├── sentinel/        ← DOMAIN (stress testing)
├── durable-objects/ ← DOMAIN (TenantDO, PostMetaDO)
└── ...more domain modules
```

Everything imports from `@autumnsgrove/lattice/*`. You can't tell from an import whether you're pulling in a UI primitive or a Stripe webhook handler.

### After: Two Packages, Clear Layers

```
libs/
├── engine/          →  @autumnsgrove/lattice     (the framework)
│   └── src/lib/
│       ├── actions/         Svelte actions
│       ├── auth/            Session verification helpers
│       ├── config/          Configuration presets
│       ├── errors/          Signpost error catalog
│       ├── feature-flags/   Feature management framework
│       ├── loom/            Durable Objects framework
│       ├── styles/          CSS design tokens
│       ├── threshold/       Rate limiting framework
│       ├── types/           Shared type definitions (OG, Turnstile)
│       ├── ui/              Glass design system
│       └── utils/           Markdown, sanitization, image
│
├── trellis/         →  @autumnsgrove/trellis     (the live deployment)
│   └── src/lib/
│       ├── amber/           Storage SDK
│       ├── blazes/          Content marking
│       ├── components/      WispPanel, MarkdownEditor, etc.
│       ├── curios/          Timeline, guestbook, polls, etc.
│       ├── data/            Grove terminology manifest
│       ├── db/              Drizzle schema + clients
│       ├── durable-objects/ TenantDO, PostMetaDO, PostContentDO
│       ├── email/           Email templates
│       ├── firefly/         Server provisioning
│       ├── git/             GitHub integration
│       ├── grafts/          Feature flag UI components
│       ├── heartwood/       Auth client
│       ├── lumen/           AI gateway
│       ├── payments/        Stripe integration
│       ├── reverie/         Domain schema registry
│       ├── scribe/          Activity recording
│       ├── sentinel/        Infrastructure stress testing
│       ├── server/          Business logic, DB queries
│       ├── thorn/           Content moderation
│       ├── warden/          API gateway
│       └── zephyr/          Email gateway
│
├── prism/           →  @autumnsgrove/prism       (already extracted)
├── foliage/         →  @autumnsgrove/foliage     (already separate)
└── gossamer/        →  @autumnsgrove/gossamer    (already separate)

apps/
├── trellis/         →  The live deployment (tenant-facing SvelteKit app)
├── landing/         →  grove.place marketing
├── plant/           →  Onboarding
├── meadow/          →  Community feed
└── ...              →  Other existing apps unchanged
```

### Dependency Direction

```
                    ┌───────────────────────────┐
                    │      apps/trellis/         │
                    │    apps/plant/  etc.        │
                    └─────┬──────────┬───────────┘
                          │          │
              imports     │          │     imports
                          ▼          ▼
         ┌────────────────────┐  ┌────────────────────┐
         │  @autumnsgrove/    │  │  @autumnsgrove/    │
         │     trellis        │  │     lattice        │
         │   (domain lib)     │  │   (framework)      │
         └────────┬───────────┘  └────────────────────┘
                  │                        ▲
                  │       depends on       │
                  └────────────────────────┘

         trellis depends on lattice.
         lattice knows nothing about trellis.
         apps import from both.
```

The arrow only goes one direction. Lattice never imports from Trellis. Trellis builds on Lattice. Apps consume both.

---

## The Split Line

### What Stays in Lattice (`@autumnsgrove/lattice`)

Framework code. Things that have no opinion about what Grove *is*.

| Module | Purpose | Why it's framework |
|--------|---------|-------------------|
| `actions/` | Svelte actions (click-outside) | Generic browser behavior |
| `auth/` | Session verification helpers | Generic auth primitives |
| `config/` | Configuration presets, tiers | Structural definitions |
| `errors/` | Signpost error catalog | Generic error framework |
| `feature-flags/` | Boolean flags, percentage rollouts | Generic feature management |
| `loom/` | Durable Objects framework | Generic DO coordination |
| `styles/` | CSS design tokens, fonts, patterns | Generic design tokens |
| `threshold/` | Rate limiting with storage adapters | Generic rate limiting |
| `types/` | OG image types, Turnstile defs | Shared type infrastructure |
| `ui/` | Glass design system, all primitives | Generic UI components |
| `utils/` | Markdown, sanitization, image processing | Generic utilities |

Note: `foliage/` no longer exists in the engine (the theme bridge was removed). The `@autumnsgrove/foliage` package already lives separately in `libs/foliage/`.

### What Moves to Trellis (`@autumnsgrove/trellis`)

Grove's soul. The things that make it *this* platform.

| Module | Files | Purpose | Key deps on Lattice |
|--------|-------|---------|---------------------|
| `amber/` | 9 | Storage SDK, quotas, exports | `db/` (domain-to-domain) |
| `blazes/` | 3 | Content marking, custom tags | None (leaf module) |
| `components/` | ~15 | WispPanel, MarkdownEditor, GutterManager | `ui/`, `config/` |
| `curios/` | ~23 dirs | Timeline, guestbook, polls, gallery... | `utils/` |
| `data/` | 1 | Grove terminology manifest (JSON) | None (leaf module) |
| `db/` | ~10 | Drizzle schema, database clients | `errors/` |
| `durable-objects/` | 4 | TenantDO, PostMetaDO, PostContentDO | `loom/` |
| `email/` | ~8 | Email templates, rendering | `config/` |
| `firefly/` | 20 | Server provisioning (Hetzner, Fly) | `loom/`, `errors/` |
| `git/` | 2 | GitHub integration, contribution stats | None (leaf module) |
| `grafts/` | ~8 | Feature flag UI components | `config/`, `feature-flags/` |
| `heartwood/` | 8 | GroveAuth client, quotas, limits | `config/`, `errors/` |
| `lumen/` | 20 | AI gateway, multi-provider routing | `config/`, `errors/` |
| `payments/` | ~5 | Stripe integration, billing | None (leaf module) |
| `reverie/` | ~30 | Domain schema registry, atmosphere | None (leaf module) |
| `scribe/` | 1 | Activity recording | None (leaf module) |
| `sentinel/` | 7 | Infrastructure stress testing | `loom/` |
| `server/` | 56 | Business logic, DB queries, observability | `config/`, `feature-flags/`, `threshold/`, `errors/` |
| `thorn/` | 12 | Content moderation | `lumen/`, `threshold/` |
| `warden/` | 12 | API gateway SDK | None (leaf module) |
| `zephyr/` | ~5 | Email + social broadcasting | None (leaf module) |

### What the New App Is (`apps/trellis/`)

The live deployment. The thing tenants interact with every day. Their pages, their admin panels, their posts and curios. It's a SvelteKit app on Cloudflare Pages that imports from both `@autumnsgrove/lattice` (framework) and `@autumnsgrove/trellis` (domain).

This is distinct from:
- `apps/landing/` (marketing at grove.place)
- `apps/plant/` (onboarding at plant.grove.place)
- `apps/meadow/` (community feed at meadow.grove.place)

`apps/trellis/` is the *grove itself*. The tenant subdomain. The daily experience.

---

## Surgery Points

The split is mostly clean cuts. Dependencies flow downward, no circular imports exist. But several places in the framework currently reach into domain code. These need resolving **before** any modules move.

### 1. `ui/` imports from `blazes/`

**File:** `ui/components/indicators/Blaze.svelte`
**Imports:** `BLAZE_CONFIG`, `BLAZE_COLORS`, `resolveLucideIcon`, `isValidBlazeHexColor`

**Fix:** Move `Blaze.svelte` to Trellis. It's a domain component wearing a framework disguise. The UI layer should have a generic `Badge` or `Indicator` primitive. `Blaze.svelte` wraps that with Grove-specific config.

### 2. `ui/` imports from `data/` (Grove terminology)

**Files:**
- `ui/components/chrome/Header.svelte`
- `ui/components/chrome/Footer.svelte`
- `ui/components/chrome/MobileMenu.svelte`
- `ui/components/ui/groveterm/GroveIntro.svelte`
- `ui/components/ui/groveterm/GroveSwap.svelte`
- `ui/components/ui/groveterm/GroveTerm.svelte`

**Imports:** `grove-term-manifest.json`

**Fix:** The `groveterm/` components are entirely Grove-specific. Move them to Trellis. For `Header.svelte`, `Footer.svelte`, and `MobileMenu.svelte`, move them to Trellis too. A generic engine wouldn't have a branded Header. Lattice can keep a `BaseHeader` slot component if needed. Trellis wraps it.

### 3. `ui/` imports from `curios/` (expanded since v1 of this spec)

**Files:**
- `ui/components/content/curios/CurioMoodring.svelte` (moodring color functions)
- `ui/components/content/curios/CurioPoll.svelte` (polls types)
- `ui/components/content/curios/CurioGuestbook.svelte` (guestbook types)
- Multiple artifact renderers in `ui/` (Hourglass, TerrariumGlobe, RainbowDivider, etc.) importing from `curios/artifacts`

**Fix:** Move the entire `ui/components/content/curios/` subtree to Trellis. All curio display components are domain components.

### 4. `ui/` imports `Friend` type from `server/`

**Files:**
- `ui/stores/friends.svelte.ts`
- `ui/components/chrome/FriendsLoader.svelte`
- `ui/components/chrome/lantern/LanternFriendCard.svelte`
- `ui/components/chrome/lantern/LanternAddFriends.svelte`

**Imports:** `type Friend` from `$lib/server/services/friends`

**Fix:** Two options:
- (a) Extract the `Friend` type into a shared types location in the engine (`types/` or `config/`)
- (b) Move the friends-related UI components to Trellis

Option (a) if `Friend` is a simple type. Option (b) if the components are tightly coupled to Grove's friend system.

### 5. `utils/rehype-groveterm` imports from `data/`

**File:** `utils/rehype-groveterm.ts`
**Imports:** `grove-term-manifest.json`

**Fix:** Make the rehype plugin accept a terminology manifest as a parameter instead of hardcoding the import. Lattice provides the generic `rehypeTermReplace(manifest)` function. Trellis calls it with Grove's manifest.

### 6. `lumen/` imports from `server/` (encryption)

**File:** `lumen/client.ts`
**Imports:** `safeDecryptToken`, `isEncryptedToken` from `$lib/server/encryption.js`

**Fix:** Both `lumen/` and `server/` are moving to Trellis, so this is a domain-to-domain import. No surgery needed. This was a false alarm for the split, it resolves naturally.

### 7. `errors/` test imports from `heartwood/`

**File:** `errors/integrity.test.ts`
**Imports:** `AUTH_ERRORS` from `../heartwood/errors`

**Fix:** Test-only import. Either move the test to Trellis alongside heartwood, or inline the error code constants in the test file.

### 8. Root `index.ts` re-exports `heartwood/`

**File:** `libs/engine/src/lib/index.ts` (lines 75-119)
**Exports:** `GroveAuthClient`, `createGroveAuthClient`, `TIER_POST_LIMITS`, `TIER_NAMES`, quota utilities

**Fix:** Remove these re-exports. After the split, apps import heartwood from `@autumnsgrove/trellis/heartwood` instead.

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
import { getSchema }         from "@autumnsgrove/lattice/reverie";

// AFTER (framework from lattice, domain from trellis)
import { GlassCard }         from "@autumnsgrove/lattice/ui";            // unchanged
import { createDb }          from "@autumnsgrove/trellis/db";            // moved
import { GroveAuthClient }   from "@autumnsgrove/trellis/heartwood";     // moved
import { TimelineCurio }     from "@autumnsgrove/trellis/curios/timeline"; // moved
import { buildErrorJson }    from "@autumnsgrove/lattice/errors";        // unchanged
import { getSchema }         from "@autumnsgrove/trellis/reverie";       // moved
```

### Scope of Changes

Every file that imports a domain module from `@autumnsgrove/lattice` needs updating. This affects:

- All `apps/*` (9 apps)
- All `services/*` (10 services)
- All `workers/*` (7 workers)
- `libs/gossamer/`, `libs/foliage/`, `libs/vineyard/`

The change is mechanical. `@autumnsgrove/lattice/<domain-module>` becomes `@autumnsgrove/trellis/<domain-module>`. The subpath is identical.

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
  "../../libs/trellis/src/lib/**/*.{html,js,svelte,ts}",   // added
],
```

---

## Execution Plan

### Phase 0: Untangle Cross-Layer Dependencies

Resolve the surgery points listed above while everything still lives in one package. This is the hardest phase. Nothing moves yet. When it's done, every framework module has zero imports from any domain module.

**Requirements:**

| ID | Pattern | Requirement | Priority |
|----|---------|-------------|----------|
| REQ-001 | Ubiquitous | After Phase 0, no file in `actions/`, `auth/`, `config/`, `errors/`, `feature-flags/`, `loom/`, `styles/`, `threshold/`, `types/`, `ui/`, or `utils/` shall import from any domain module. | Must Have |
| REQ-002 | Event-Driven | When a surgery point is resolved, the engine shall build and pass all existing tests without changes to any app code. | Must Have |

**Checklist:**

- [ ] Move `Blaze.svelte` from `ui/indicators/` to a domain-appropriate location
- [ ] Move `groveterm/` components out of `ui/`
- [ ] Move all curio display components out of `ui/components/content/curios/`
- [ ] Move or parameterize Header/Footer/MobileMenu (terminology deps)
- [ ] Resolve `Friend` type dependency (ui/ → server/)
- [ ] Make `rehype-groveterm` accept manifest as parameter
- [ ] Move or inline `errors/integrity.test.ts` heartwood import
- [ ] Remove heartwood re-exports from root `index.ts`
- [ ] Verify: `grep` for any remaining cross-layer imports
- [ ] Verify: engine builds cleanly

### Phase 1: Create `libs/trellis/`

Set up the new workspace library.

**Checklist:**

- [ ] Create `libs/trellis/` directory structure
- [ ] Create `package.json` with name `@autumnsgrove/trellis`, `workspace:*` dep on `@autumnsgrove/lattice`
- [ ] Create `svelte.config.js` (SvelteKit library package format)
- [ ] Create `tsconfig.json` extending the monorepo base
- [ ] Create `vite.config.js` with svelte-package build
- [ ] Add to `pnpm-workspace.yaml` (already covered by `libs/*` glob)
- [ ] Define export map in `package.json` mirroring domain module paths
- [ ] Verify: `pnpm install` resolves the new package

### Phase 2: Move Domain Modules

Move modules from `libs/engine/src/lib/` to `libs/trellis/src/lib/` in dependency order.

**Wave 1 — Leaf modules (no cross-deps):**
- [ ] `data/`
- [ ] `blazes/`
- [ ] `scribe/`
- [ ] `payments/`
- [ ] `warden/`
- [ ] `zephyr/`
- [ ] `git/`
- [ ] `reverie/`

**Wave 2 — Modules depending only on Lattice:**
- [ ] `db/` (depends on `errors/`)
- [ ] `heartwood/` (depends on `config/`, `errors/`)
- [ ] `lumen/` (depends on `config/`, `errors/`)
- [ ] `email/` (depends on `config/`)
- [ ] `grafts/` (depends on `config/`, `feature-flags/`)
- [ ] `durable-objects/` (depends on `loom/`)
- [ ] `sentinel/` (depends on `loom/`)

**Wave 3 — Modules with domain cross-deps:**
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
- [ ] Verify: `libs/trellis` builds with its new export map

### Phase 4: Update All Consumer Imports (Clean Break)

For every file in `apps/`, `services/`, `workers/`, and other `libs/`:

- [ ] Find-and-replace `@autumnsgrove/lattice/<domain-module>` to `@autumnsgrove/trellis/<domain-module>` for all moved modules
- [ ] Add `@autumnsgrove/trellis` as `workspace:*` dependency to every consuming `package.json`
- [ ] Update every `tailwind.config.js` to include `libs/trellis/` content path
- [ ] Update any `tsconfig.json` path aliases if applicable
- [ ] Run `pnpm install` to wire workspace dependencies
- [ ] Verify: every app/service/worker builds

### Phase 5: Create `apps/trellis/`

- [ ] Create SvelteKit app skeleton
- [ ] Set up `wrangler.toml` with all Cloudflare bindings (DB, CURIO_DB, OBS_DB, KV, R2, service bindings)
- [ ] Set up `hooks.server.ts` with auth, session handling
- [ ] Move or create tenant-facing routes (the pages and admin panels tenants use daily)
- [ ] Import from both `@autumnsgrove/lattice` and `@autumnsgrove/trellis`
- [ ] Set up `tailwind.config.js` scanning both libs
- [ ] Verify: app builds and deploys to Cloudflare Pages

### Phase 6: Verify Everything

- [ ] `pnpm install` from root succeeds
- [ ] Every package in the workspace builds: `pnpm -r run build`
- [ ] CI passes: `gw dev ci --affected --fail-fast --diagnose`
- [ ] No remaining imports of `@autumnsgrove/trellis/<domain-module>` referencing old `@autumnsgrove/lattice` path
- [ ] No remaining imports of domain modules from any engine file
- [ ] Staging deploy of at least one app succeeds

---

## Risks and Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Volume of import changes (140+ paths across 26+ packages) | Medium | Mechanical find-and-replace. Script it. Subpaths don't change, only package name. |
| Surgery points in `ui/` require real refactoring (more than originally estimated) | High | Do Phase 0 first, in isolation. Everything still builds as one package during surgery. No consumer changes needed. |
| Build ordering in pnpm workspace | Low | `libs/engine` must build before `libs/trellis`. pnpm workspace protocol handles this via dependency graph. Verify with `pnpm -r run build`. |
| Tailwind class purging | Medium | If any app forgets to add `libs/trellis/` to its content paths, classes from domain components get purged silently. Add a CI check. |
| TypeScript path resolution | Low | `$lib/` alias in `libs/trellis` resolves to `libs/trellis/src/lib/` automatically via SvelteKit conventions. Cross-package imports use full package names. |
| `apps/trellis/` route ownership | Medium | Clarify which routes move to `apps/trellis/` vs stay in existing apps. Tenant-facing routes are the scope. Marketing stays in landing. Onboarding stays in plant. |
| `lumen/` depends on `server/encryption` | Low | Both move to Trellis. This is a domain-to-domain dep that resolves naturally. No action needed. |
| `ui/` → `server/` Friend type imports (new) | Medium | Either extract the `Friend` type to a shared location in Lattice, or move the friends UI to Trellis. Decide during Phase 0. |

---

## Security Considerations

- No auth logic changes. Heartwood moves packages but its behavior is identical.
- No database changes. Schema stays the same, just lives in a different directory.
- No API changes. Endpoints work the same, they just import from `@autumnsgrove/trellis` instead of `@autumnsgrove/lattice`.
- Multi-tenant isolation remains unchanged. `WHERE tenant_id = ?` patterns are structural, not affected by which package they live in.

---

## Changes Since v1 (March 1st)

This spec was originally written March 1st with the domain lib named `@autumnsgrove/grove` and the app as `apps/grove/`. Key updates:

- **Renamed:** Domain lib from `grove` to `trellis` (`@autumnsgrove/trellis`). Similar names to Lattice, but meaningfully different things.
- **New modules classified:** `reverie/` (domain, schema registry), `sentinel/` (domain, stress testing), `durable-objects/` (domain, Grove-specific DOs), `git/` (domain, GitHub integration), `types/` (framework, shared type defs).
- **foliage/ bridge removed:** No longer exists in the engine. Already separate as `libs/foliage/`.
- **Prism extraction noted** as prior art for the same pattern.
- **New surgery points discovered:** `ui/` → `curios/` expanded (artifact renderers, CurioPoll). `ui/` → `server/` (Friend type in 4 files). `errors/` → `heartwood/` (test file). `lumen/` → `server/` (encryption, resolves naturally).
- **Module count:** 21 domain modules to move (was 17).

---

## Implementation Checklist (Summary)

- [ ] **Phase 0:** Resolve 8 surgery points (cross-layer deps)
- [ ] **Phase 1:** Create `libs/trellis/` package
- [ ] **Phase 2:** Move 21 domain modules in 3 waves
- [ ] **Phase 3:** Clean up engine exports
- [ ] **Phase 4:** Update all consumer imports (clean break)
- [ ] **Phase 5:** Create `apps/trellis/` deployment
- [ ] **Phase 6:** Full verification pass

---

*The vine and the trellis, finally, each knowing where they end and the other begins.*
