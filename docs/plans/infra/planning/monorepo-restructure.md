---
title: "Monorepo Restructure Plan"
status: planning
category: infra
---

# Monorepo Restructure Plan

> **Status:** Phase 1 complete (ae296505), Phase 1.5 in progress — documentation updates
> **Created:** 2026-02-17
> **Scope:** Reorganize GroveEngine from flat `packages/` into categorized directories; import Forage, Shutter, Foliage, and Gossamer.

---

## The Problem

The monorepo has outgrown its flat `packages/` structure. Fourteen active packages — SvelteKit apps, core service workers, utility cron workers, and shared libraries — sit side-by-side in one directory with no visual hierarchy, alongside three abandoned artifact packages (`example-site`, `ui`, `zig-core`) that have never been cleaned up. Two critical theming projects (Foliage and Gossamer) have stalled because coordinating work across separate repos is too painful. Meanwhile, Forage's business logic belongs here (the UI already is), and Shutter is becoming integral to multiple Grove services.

## The Solution

1. **Reorganize** existing packages into five categories: `apps/`, `services/`, `workers/`, `libs/`, `tools/`
2. **Import** six repositories: Foliage, Gossamer, Shutter, Forage, Ivy, and Amber
3. **Update** all workspace configs, relative paths, CI workflows, and documentation

---

## Decisions (Confirmed)

| Decision                                               | Answer                                                                                                                                                                                                                     |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Forage                                                 | Bring TS worker in as `services/forage/`. Python predecessor → `archives/` (preserve history, not active code).                                                                                                            |
| Shutter                                                | Bring in **both** Python and TypeScript versions together as `libs/shutter/`. Python preserves dev history; TS worker is the live version.                                                                                 |
| Foliage                                                | `libs/foliage/` as `@autumnsgrove/foliage` — separate lib, not merged into engine. Migrations fold into main D1 pipeline.                                                                                                  |
| Gossamer                                               | `libs/gossamer/` — flatten `packages/core/` from its nested monorepo. Name already `@autumnsgrove/gossamer`, no rename needed.                                                                                             |
| `example-site`, `ui`, `zig-core`                       | Artifact packages with no source. Archive to `archives/` first, then `git rm`. Must be done in Phase 1 before `packages/` is removed.                                                                                      |
| Press, Verge, Aria, Trove, Clearing (newspaper), Scout | Stay external. Truly independent projects.                                                                                                                                                                                 |
| Nook, Outpost, Bloom                                   | Stay external. Will import Lattice SDKs but don't belong here.                                                                                                                                                             |
| Directory structure                                    | `apps/`, `services/`, `workers/`, `libs/`, `tools/`                                                                                                                                                                        |
| Foliage package name                                   | Rename from `@groveengine/foliage` → `@autumnsgrove/foliage` during import. Consistent with org namespace.                                                                                                                 |
| Foliage merged into engine?                            | No. Lives in `libs/foliage/` as its own package. Engine adds `workspace:*` dep + new `./foliage` export paths. Engine has zero foliage today.                                                                              |
| Ivy                                                    | Bring in as `apps/ivy/`. Grove mail client for `@grove.place` addresses. Own D1 (`ivy-db`, `ivy_*` prefixed — stays with package, not main pipeline). Heartwood + Zephyr service bindings replace HTTP calls.              |
| Amber (UI)                                             | Bring in as `apps/amber/`. SvelteKit frontend for unified storage management dashboard.                                                                                                                                    |
| Amber (worker)                                         | Bring in as `services/amber/`. Always-on; manages shared `grove-storage` R2, DOs for exports, cron cleanup. ExportJobV2 → Loom SDK.                                                                                        |
| Amber ZIP export consolidation                         | Engine's `/arbor/export/` gets warm redirect to Amber. Amber becomes the canonical "download your stuff" UX. Engine's ExportDO stays for blog-content Markdown exports (portability format) but users are guided to Amber. |
| `auth-api.grove.place` (deprecated)                    | Both Ivy and Amber call this endpoint for session validation. Deprecated — replaced by Heartwood service binding via `login.grove.place` hub.                                                                              |
| npm rename to `@groveplace/lattice`                    | Separate follow-up effort, not part of this migration.                                                                                                                                                                     |

---

## Current Structure

```
GroveEngine/
├── packages/                    # FLAT — 14 active + 3 artifact packages
│   ├── engine/                  #   Library + SvelteKit app
│   ├── landing/                 #   SvelteKit app
│   ├── plant/                   #   SvelteKit app
│   ├── heartwood/               #   Auth service worker
│   ├── clearing/                #   SvelteKit app
│   ├── meadow/                  #   SvelteKit app
│   ├── terrarium/               #   SvelteKit app
│   ├── vineyard/                #   Component library
│   ├── grove-router/            #   Router worker
│   ├── login/                   #   SvelteKit app
│   ├── domains/                 #   SvelteKit app
│   ├── og-worker/               #   OG image worker
│   ├── post-migrator/           #   Cron worker
│   ├── durable-objects/         #   DO worker
│   ├── example-site/            #   ⚠️ ARTIFACT — only node_modules, no source → archives/
│   ├── ui/                      #   ⚠️ ARTIFACT — only node_modules, no source → archives/
│   ├── zig-core/                #   ⚠️ ARTIFACT — only node_modules, no source → archives/
│   └── workers/                 #   Nested cron workers
│       ├── clearing-monitor/
│       ├── meadow-poller/
│       ├── timeline-sync/
│       └── webhook-cleanup/
├── workers/                     # Root-level workers
│   ├── email-render/
│   ├── email-catchup/
│   ├── pulse/
│   └── zephyr/
├── tools/                       # Dev tools
├── scripts/                     # Automation
├── landing/                     # Root landing assets (2 static icons, different versions from packages/landing)
│   └── static/                  #   icon-192.png, icon-512.png (smaller/older variants)
└── docs/
```

**Workspace config (pnpm-workspace.yaml):**

```yaml
packages:
  - "packages/*"
  - "packages/workers/*"
  - "workers/*"
```

---

## Target Structure

```
GroveEngine/
│
├── apps/                        # SvelteKit applications (serve UI to users)
│   ├── landing/                 #   ⭐ grove.place — the home page, the heart of Grove
│   ├── plant/                   #   plant.grove.place onboarding
│   ├── clearing/                #   status.grove.place status page
│   ├── meadow/                  #   meadow.grove.place community feed
│   ├── terrarium/               #   terrarium.grove.place UI showcase
│   ├── login/                   #   login.grove.place auth UI
│   ├── domains/                 #   domains.grove.place + Forage UI
│   ├── ivy/                     #   [NEW] ivy.grove.place mail client
│   └── amber/                   #   [NEW] amber.grove.place storage management UI
│
├── services/                    # Core infrastructure workers (always-on, handle requests)
│   ├── heartwood/               #   Auth provider (OAuth + PKCE)
│   ├── grove-router/            #   Subdomain routing proxy
│   ├── durable-objects/         #   DO coordination layer (Loom)
│   ├── forage/                  #   [NEW] Domain discovery AI worker
│   ├── amber/                   #   [NEW] Unified storage management (R2, DO exports, crons)
│   ├── zephyr/                  #   Email gateway
│   └── pulse/                   #   GitHub webhook receiver
│
├── workers/                     # Background & cron workers (scheduled tasks)
│   ├── og-worker/               #   OG image generation
│   ├── post-migrator/           #   Data migration cron
│   ├── clearing-monitor/        #   Health monitoring cron
│   ├── meadow-poller/           #   RSS feed poller cron
│   ├── timeline-sync/           #   Nightly timeline generation
│   ├── webhook-cleanup/         #   Webhook retention cleanup
│   ├── email-render/            #   Email rendering
│   └── email-catchup/           #   Weekly email digest cron
│
├── libs/                        # Shared libraries (importable packages)
│   ├── engine/                  #   Lattice core (@autumnsgrove/groveengine)
│   ├── vineyard/                #   Component showcase system
│   ├── foliage/                 #   [NEW] Full theme system (from AutumnsGrove/Foliage)
│   ├── gossamer/                #   [NEW] ASCII visual effects (from AutumnsGrove/Gossamer)
│   └── shutter/                 #   [NEW] Content distillation (from AutumnsGrove/Shutter)
│
├── tools/                       # Development tools (unchanged)
│   ├── grove-find/
│   ├── grove-find-go/
│   ├── gw/
│   └── glimpse/
│
├── scripts/                     # Automation scripts (unchanged)
├── docs/                        # Documentation (unchanged)
├── assets/                      # Shared assets (unchanged)
├── _deprecated/                 # Legacy code (unchanged)
└── archives/                    # Historical archives (unchanged)
```

**New workspace config (pnpm-workspace.yaml):**

```yaml
packages:
  - "apps/*"
  - "services/*"
  - "workers/*"
  - "libs/*"
```

---

## Package Classification

### apps/ — SvelteKit Applications

All depend on `@autumnsgrove/groveengine` via `workspace:*`. Serve UI to Wanderers.

| Current Location                 | New Location     | Package Name    | Notes                           |
| -------------------------------- | ---------------- | --------------- | ------------------------------- |
| `packages/landing`               | `apps/landing`   | grove-landing   | **grove.place** — the home page |
| `packages/plant`                 | `apps/plant`     | grove-plant     |                                 |
| `packages/clearing`              | `apps/clearing`  | grove-clearing  |                                 |
| `packages/meadow`                | `apps/meadow`    | grove-meadow    |                                 |
| `packages/terrarium`             | `apps/terrarium` | grove-terrarium |                                 |
| `packages/login`                 | `apps/login`     | grove-login     |                                 |
| `packages/domains`               | `apps/domains`   | grove-domains   |                                 |
| _(external: AutumnsGrove/Ivy)_   | `apps/ivy`       | grove-ivy       | ivy.grove.place mail client     |
| _(external: AutumnsGrove/Amber)_ | `apps/amber`     | grove-amber     | Storage management UI           |

### services/ — Core Infrastructure Workers

Always-on services that handle requests. Core to the platform functioning.

| Current Location                  | New Location               | Package Name          |
| --------------------------------- | -------------------------- | --------------------- | ------------------------------------------------------- |
| `packages/heartwood`              | `services/heartwood`       | grove-heartwood       |
| `packages/grove-router`           | `services/grove-router`    | grove-router          |
| `packages/durable-objects`        | `services/durable-objects` | grove-durable-objects |
| `workers/zephyr`                  | `services/zephyr`          | grove-zephyr          |
| `workers/pulse`                   | `services/pulse`           | grove-pulse           |
| _(external: AutumnsGrove/Forage)_ | `services/forage`          | grove-forage          |
| _(external: AutumnsGrove/Amber)_  | `services/amber`           | grove-amber-worker    | Worker half of Amber; routes to `amber-api.grove.place` |

### workers/ — Background & Cron Workers

Scheduled tasks, data processing, and utility workers.

| Current Location                    | New Location               | Package Name           |
| ----------------------------------- | -------------------------- | ---------------------- |
| `packages/og-worker`                | `workers/og-worker`        | grove-og               |
| `packages/post-migrator`            | `workers/post-migrator`    | grove-post-migrator    |
| `packages/workers/clearing-monitor` | `workers/clearing-monitor` | grove-clearing-monitor |
| `packages/workers/meadow-poller`    | `workers/meadow-poller`    | grove-meadow-poller    |
| `packages/workers/timeline-sync`    | `workers/timeline-sync`    | grove-timeline-sync    |
| `packages/workers/webhook-cleanup`  | `workers/webhook-cleanup`  | grove-webhook-cleanup  |
| `workers/email-render`              | `workers/email-render`     | grove-email-render     |
| `workers/email-catchup`             | `workers/email-catchup`    | grove-email-catchup    |

### libs/ — Shared Libraries

Importable packages. The engine is both a library (npm exports) and a SvelteKit app (blog platform routes). Its primary identity is the shared framework, so it lives in `libs/`.

| Current Location                    | New Location    | Package Name              |
| ----------------------------------- | --------------- | ------------------------- |
| `packages/engine`                   | `libs/engine`   | @autumnsgrove/groveengine |
| `packages/vineyard`                 | `libs/vineyard` | @autumnsgrove/vineyard    |
| _(external: AutumnsGrove/Foliage)_  | `libs/foliage`  | @autumnsgrove/foliage     |
| _(external: AutumnsGrove/Gossamer)_ | `libs/gossamer` | @autumnsgrove/gossamer    |
| _(external: AutumnsGrove/Shutter)_  | `libs/shutter`  | @autumnsgrove/shutter     |

**Why Shutter is a lib, not a service:** The user described Shutter as "a published package" that's "integral to specific services and functions WITHIN the grove" — other services import it directly. If a dedicated CF Worker deployment is needed later, a thin wrapper can be added in `services/shutter-worker/`.

---

## What Gets Imported

### Foliage (libs/foliage/)

**Source:** `AutumnsGrove/Foliage` (available locally at `~/Documents/Projects/Foliage/` — no clone needed)
**What it is:** Full theme customization system — 10 curated themes (zine, minimal, ocean, night-garden, wildflower, cozy-cabin, typewriter, solarpunk, moodboard, grove default), accent colors, custom fonts, live preview customizer, community theme sharing.
**Why it stalled:** Cross-repo coordination with Lattice was too complex. Theme changes require touching both Foliage and the engine simultaneously.
**What changes:** Gets its own workspace package in `libs/foliage/` as `@autumnsgrove/foliage` (renamed from `@groveengine/foliage`). The engine adds a `workspace:*` dependency and new `./foliage` export paths.

**Important — no existing foliage code in engine:** The engine has zero foliage code today. There is no `src/lib/foliage/` and no `./foliage` export path to reconcile. Phase 2A adds these from scratch, pointing directly at `libs/foliage/`. No re-export shim is needed — just new export entries.

**Migrations — fold into main D1 pipeline:** Foliage has 3 SQL migration files that reference `tenants(id) ON DELETE CASCADE`, meaning they belong in the same D1 database as Heartwood — not a separate database. During Phase 2A, these 3 files are numbered sequentially after the current last migration and added to the main migration directory:

- `001_theme_settings.sql` → `theme_settings` table (tenant theme preferences)
- `002_custom_fonts.sql` → `custom_fonts` table (Evergreen tier font uploads)
- `003_community_themes.sql` → `community_themes` table (Oak+ tier theme sharing)

**Integration points:**

- Engine gains new `./foliage`, `./foliage/themes`, `./foliage/components`, `./foliage/server` export paths
- Tier-gated features (Seedling/Sapling/Oak/Evergreen)
- D1 tables: `theme_settings`, `custom_fonts`, `community_themes` (folded into main pipeline)
- TenantDO for live preview

### Gossamer (libs/gossamer/)

**Source:** `AutumnsGrove/Gossamer` (available locally at `~/Documents/Projects/Gossamer/` — no clone needed)
**What it is:** 2D ASCII visual effects — floating clouds, gentle patterns, image-to-ASCII transforms, decorative borders. The whimsy layer.
**Why it stalled:** Same cross-repo coordination pain. Effects need to integrate with Glass UI and seasonal themes (Foliage).
**What changes:** Gossamer is itself a nested monorepo (`packages/core/` is its only package). We flatten it — copy `packages/core/` contents directly into `libs/gossamer/`. The package name is already `@autumnsgrove/gossamer` (no rename needed). Already listed as npm dependency (`@autumnsgrove/gossamer: ^0.1.1` in engine's `package.json`), so the switch is simply from npm registry pin to `workspace:*`.

**Integration points:**

- Engine's Glass UI components (GlassCard backgrounds)
- Seasonal presets (grove-mist, grove-fireflies, autumn-leaves, etc.)
- `prefers-reduced-motion` support
- Canvas-based rendering (no WebGL)

### Forage (services/forage/)

**Source:** `AutumnsGrove/GroveDomainTool` (available locally at `~/Documents/Projects/GroveDomainTool/` — no clone needed)
**What it is:** AI-powered domain discovery tool. 5-question quiz → AI generates candidates → Haiku swarm evaluates → RDAP checks availability → email with curated list.
**Front-end:** Already in `packages/domains` (→ `apps/domains`)
**What comes in:** The TypeScript Cloudflare Worker in `worker/` → `services/forage/`.

**Python predecessor — preserve in archives:** GroveDomainTool began as a Python script that ran on Claude.ai web, iterated into a proper backend over time. This Python source (`src/`, `tests/`, `pyproject.toml`) is _not_ active code — the TS worker is — but it represents meaningful development history. It is archived to `archives/GroveDomainTool-python/` during Phase 2D, not deleted.

**Key simplification:** As an external repo, Forage needed its own OpenRouter key and Resend integration. Inside the monorepo, it can use **Lumen** for AI and **Zephyr** for email via service bindings — eliminating standalone API keys entirely. See [Integration Upgrades](#integration-upgrades) below.

**Integration points:**

- `apps/domains` calls Forage's API
- Durable Objects for session state
- Lumen for AI/LLM calls (replaces standalone OpenRouter key)
- Zephyr for result emails (replaces standalone Resend key)
- Service bindings in `wrangler.toml` (Forage ↔ Lumen, Forage ↔ Zephyr, Domains ↔ Forage)

### Shutter (libs/shutter/)

**Source:** `AutumnsGrove/Shutter` (available locally at `~/Documents/Projects/Shutter/` — no clone needed)
**What it is:** Content distillation with prompt injection defense. Sits between LLM agents and untrusted web content. Reduces 20k tokens to 200 with injection detection.
**What comes in:** **Both versions together.** Shutter is the one import that maintains both a Python implementation and a TypeScript/Cloudflare Worker implementation side by side. The local Shutter repo already carries this structure naturally:

```
Shutter/
├── src/            # Python implementation (pyproject.toml at root)
├── tests/          # Python tests
├── pyproject.toml  # Python project config
├── cloudflare/     # TypeScript Cloudflare Worker (package.json inside)
│   ├── src/
│   ├── migrations/
│   ├── wrangler.toml
│   └── package.json  (name: "shutter-worker")
└── docs/
```

The entire Shutter repo becomes `libs/shutter/` — no restructuring, just a copy. The Python version preserves the development lineage (similar to how gf went bash → Python → Go). The TS worker in `cloudflare/` is the active implementation.

**Integration points:**

- Mycelium MCP server (all external web access)
- Meadow (link previews)
- Forage (domain research)
- Publishable as `@autumnsgrove/shutter` (the TS worker package name needs updating from `shutter-worker`)

### Ivy (apps/ivy/)

**Source:** `AutumnsGrove/Ivy` (available locally at `~/Documents/Projects/Ivy/` — no clone needed)
**What it is:** Grove's first-party mail client for `@grove.place` email addresses — focused, privacy-first, Grove-integrated. Not trying to replace Gmail; scoped to Grove correspondence.
**Why it belongs here:** It's a Grove-native first-party product. It's tightly coupled to Zephyr (email delivery) and Heartwood (auth), and stalls on the same cross-repo coordination pain as everything else.
**What changes:** Engine `^0.9.99` → `workspace:*`. Auth and email calls become service bindings.

**Integration points:**

- Heartwood service binding replaces HTTP session validation (currently calling `auth-api.grove.place` — deprecated)
- Zephyr service binding for email sending/receiving (replaces any direct Resend calls)
- Own D1 database (`ivy-db`) with 3 migrations — all `ivy_*` prefixed. **Stays with the package** — not folded into main D1 pipeline. Ivy's DB is self-contained.
- `postal-mime` and `bip39` remain as package dependencies (third-party, not Grove-owned)

### Amber (apps/amber/ + services/amber/)

**Source:** `AutumnsGrove/Amber` (available locally at `~/Documents/Projects/Amber/` — no clone needed)
**What it is:** Grove's unified storage management — every file across every product (blog images, Ivy attachments, profile photos, custom fonts) visible and downloadable in one place. The worker manages the shared `grove-storage` R2 bucket.
**Why it belongs here:** Amber's worker manages the R2 bucket that every other Grove service writes to. Having it external means the storage layer is disconnected from the platform that depends on it. It's core infrastructure.
**What changes:** Two-part import — SvelteKit UI to `apps/amber/`, worker to `services/amber/`. ExportJobV2 → Loom SDK. Auth becomes Heartwood service binding. Engine `^0.6.4` → `workspace:*`.

**The "inspired by Forage" DO — Loom SDK target:**
`ExportJobV2.ts` opens with _"Architecture (inspired by Forage)"_ — it's the same alarm-based chunk processing + SQLite DO pattern. The boilerplate to eliminate: `ensureSchema()`, manual alarm scheduling, chunk offset tracking, parallel status updates to SQLite and D1. What stays: `ZipStreamer` + multipart R2 upload (streaming ZIP creation is genuinely unique and well-implemented).

**The broken tier TODO — Heartwood service binding fixes it:**
The auth middleware currently defaults every user to `'seedling'` tier regardless of actual plan, with a TODO comment:

```typescript
// TODO: Get user's subscription tier from subscription service
// For now, default to seedling
const tier: SubscriptionTier = "seedling";
```

A Heartwood service binding returns full user context including subscription tier. This TODO has been open since Amber was written; it gets resolved here.

**ZIP export UX consolidation:**
The engine already has a full ZIP export system at `/arbor/export/` (ExportDO in `services/durable-objects`). These serve different purposes:

- **Engine's ExportDO:** exports blog content as portable Markdown + YAML frontmatter (Hugo/Jekyll/Astro/Ghost compatible) — the "take your writing somewhere else" export
- **Amber's ExportJobV2:** exports all raw storage files by product/category — the "download everything you've ever uploaded" export

These are complementary, not duplicates. The consolidation: engine's `/arbor/export/` page gets a warm redirect to Amber with context ("want to download your files? Amber is where you can see everything clearly"). Amber becomes the primary download UX. ExportDO remains for the Markdown portability export.

**Note on `ZipStreamer`:** Amber's `zipStream.ts` is a well-implemented streaming ZIP utility using `fflate`. It's a candidate for extraction to a shared util (e.g., into `libs/engine/` or a future shared package) so ExportDO can also benefit from streaming multipart uploads for large exports.

**Integration points:**

- Heartwood service binding replaces `fetch('auth-api.grove.place/api/auth/session')` — fixes auth latency AND resolves the tier TODO
- `grove-storage` R2 binding (shared bucket — same one all Grove services write to)
- ExportJobV2 Durable Object → Loom SDK (alarm scheduling, state management, chunk orchestration)
- Cron simplification: `processPendingExports` (every 5 min) becomes lightweight orphaned-job recovery rather than primary trigger
- `apps/amber/` engine upgrade: `^0.6.4` → `workspace:*`; replace `lucide-svelte` imports with engine icons
- Engine's `/arbor/export/` page gets redirect/pointer to Amber

---

## Integration Upgrades

Co-location isn't just about file organization — it simplifies architecture. When services live in the same monorepo and deploy to the same Cloudflare account, they can talk to each other via service bindings (zero-latency, no network hop, no external API keys). Several imported services get simpler as a result.

### Forage: Massive Simplification via Internal Services + Loom SDK

**Before (external repo):** Forage managed its own OpenRouter API key for AI calls, its own Resend API key for result emails, and its own hand-rolled DO orchestration for session state. Two secrets to rotate, two external dependencies to monitor, and a bespoke coordination layer that predated the Loom SDK.

**After (monorepo):**

- **AI → Lumen:** Forage calls Lumen via service binding for all LLM work. Lumen already manages AI provider keys, rate limits, and fallbacks. Forage becomes a consumer, not an operator.
- **Email → Zephyr:** Forage calls Zephyr via service binding to send result emails. Zephyr already handles Resend integration, email templates, and delivery tracking. One email gateway for the whole platform.
- **DO orchestration → Loom SDK:** Forage was the _first_ Loom-style service — it pioneered the DO session orchestration pattern before there was a proper SDK. Now there is one (`services/durable-objects`). Forage's entire bespoke DO coordination layer can be replaced with Loom SDK calls, eliminating hundreds of lines of hand-rolled session management.
- **Result:** Forage's architecture collapses from "standalone service with its own infra" to "thin orchestration layer over Loom + Lumen + Zephyr." Zero secrets in `wrangler.toml` — just service bindings. The import isn't just moving code; it's a chance to dramatically simplify it.

### Shutter: Direct Import Instead of API Calls

**Before (external package):** Services that needed content distillation had to either install the npm package OR call Shutter's API endpoint. Cross-worker calls add latency and complexity.

**After (monorepo):** Services can `import { distill } from '@autumnsgrove/shutter'` directly via `workspace:*`. No API call, no network hop, no auth token. In-process content distillation for any service that needs it. (A standalone worker endpoint can still exist for external consumers.)

### Foliage + Gossamer: Unified Theming Pipeline

**Before (separate repos):** Theme changes required coordinating PRs across three repos (Foliage, Gossamer, Engine). A theme that used Gossamer effects needed version pinning and publish cycles. This is why both stalled.

**After (monorepo):** A single PR can touch the theme definition (Foliage), its visual effects (Gossamer), and the engine integration — all type-checked and built together. `workspace:*` means no version mismatches, no publish-wait-install cycles.

### Deploy Workflows: Reusable Core + Thin Callers

**Before:** 17+ nearly identical `deploy-*.yml` workflows, each copy-pasting 40-80 lines of the same install/build/deploy logic with different paths and project names.

**After:** A reusable `_deploy.yml` workflow with all shared logic, called by thin ~10-line `deploy-*.yml` files that just specify the path, deploy type, and project name. Each service stays its own file (unique entity, easy debugging, clear history), but zero duplicated logic. Adding a new service = copy a template, fill in 3 values. See [CI Workflow Strategy](#ci-workflow-strategy-reusable-workflow--thin-callers) for design.

### Future Opportunities

These don't need to happen during the migration, but become possible afterward:

- **Shared D1 migrations:** A single migration pipeline that knows about all services' schema needs
- **Cross-service type safety:** Services can share TypeScript types directly instead of duplicating them
- **Service binding mesh:** Any service can talk to any other service without external API keys or auth tokens

---

## Migration Phases

### Phase 0: Preparatory Tooling Updates

> **Completed** (bbfd215c, 36be1740) — gw and gf updated to support both layouts.

> **Goal:** Make gw and gf work with _both_ old and new directory layouts. This lands as its own commit _before_ any packages move, so it's a safe no-op if we need to abort Phase 1.

**Step 0.1 — Update `gw` tool to scan both old and new directories:**

> gw's `discover_packages()` hardcodes `root / "packages"` for detection. Update it to scan `apps/`, `services/`, `workers/`, `libs/` **in addition to** `packages/`. This way it works both before and after the move.

- `tools/gw/src/gw/packages.py` → Update `discover_packages()` (lines 260-273) to scan both `packages/` and `apps/`, `services/`, `workers/`, `libs/`
- `tools/gw/src/gw/commands/db.py` — Make D1 migration path detection flexible (check both old and new)
- `tools/gw/src/gw/commands/dev/format.py` — Same treatment
- Update tests: `tools/gw/tests/test_packages.py`

**Step 0.2 — Update `gf` tool to handle both old and new paths:**

> gf hardcodes `packages/` in 20+ locations. Update these to check both layouts, so the tool works before and after the move.

- **Go version (`tools/grove-find-go/cmd/`):**
  - `impact.go` — hardcodes `packages/` for import path conversion and package detection (lines 66, 201, 481)
  - `infra.go` — hardcodes `packages/` for migration discovery and package paths (lines 381, 929, 1035, 1135)
  - `quality.go` — hardcodes `!packages/engine` exclusion pattern (line 435)
- **Python version (`tools/grove-find/src/grove_find/commands/`):**
  - `impact.py` — same `packages/` assumptions (lines 103, 166, 325)
  - `infra.py` — same `packages/` assumptions (lines 219-220, 481, 520-521, 561-562)
  - `quality.py` — hardcoded `!packages/engine` exclusions (lines 380-477)
- **Rebuild gf Go binaries** for all 4 platforms:
  - Run `tools/grove-find-go/build-all.sh` (or equivalent cross-compile script)
  - Verify new binaries in `tools/grove-find-go/dist/` for linux-x86_64, linux-arm64, darwin-arm64, windows-x86_64

**Step 0.3 — Verify Phase 0 is a no-op on current layout:**

```bash
gw context           # still works with packages/
gf --agent impact packages/engine/src/lib/ui/GlassCard.svelte  # still resolves
gf --agent migrations  # still finds migrations
```

**Step 0.4 — Commit Phase 0:**

This commit is safe to land independently. If Phase 1 gets delayed or aborted, gw and gf still work fine — they just also understand the new layout for when it arrives.

---

### Phase 1: Create Structure & Move Existing Packages

> **Completed** (ae296505) — All 20 packages moved, workspace configs updated, CI workflows updated.

> **Goal:** Reorganize without breaking anything. No new code. Tooling already updated in Phase 0.

**Step 1.1 — Create directories:**

```bash
mkdir -p apps services libs
# workers/ already exists, tools/ already exists
```

**Step 1.2 — Move landing first (the grove.place home page):**

> Landing is the heart of Grove — grove.place itself. It gets moved first and verified independently before everything else. This isn't just another package; it's the front door.

```bash
git mv packages/landing    apps/landing
```

After moving, verify landing's critical integration points:

- `apps/landing/wrangler.toml` — Cloudflare Pages project binding
- `apps/landing/tailwind.config.js` — Engine preset import path (updates in Step 1.8)
- `apps/landing/static/data/` — Auto-tag workflow syncs snapshot data here (workflow update in Step 1.10)
- `.github/workflows/deploy-landing.yml` — Path trigger and working directory (update in Step 1.10)

**Step 1.2b — Move remaining apps (6 packages):**

```bash
git mv packages/plant       apps/plant
git mv packages/clearing    apps/clearing
git mv packages/meadow      apps/meadow
git mv packages/terrarium   apps/terrarium
git mv packages/login       apps/login
git mv packages/domains     apps/domains
```

**Step 1.3 — Move services (5 packages):**

```bash
git mv packages/heartwood       services/heartwood
git mv packages/grove-router    services/grove-router
git mv packages/durable-objects services/durable-objects
git mv workers/zephyr           services/zephyr
git mv workers/pulse            services/pulse
```

**Step 1.4 — Move workers (6 packages → flatten nested workers):**

```bash
git mv packages/og-worker       workers/og-worker
git mv packages/post-migrator   workers/post-migrator

# Flatten packages/workers/* into workers/
git mv packages/workers/clearing-monitor  workers/clearing-monitor
git mv packages/workers/meadow-poller     workers/meadow-poller
git mv packages/workers/timeline-sync     workers/timeline-sync
git mv packages/workers/webhook-cleanup   workers/webhook-cleanup

# email-render and email-catchup are already in workers/
```

**Step 1.5 — Move libs (2 packages):**

```bash
git mv packages/engine    libs/engine
git mv packages/vineyard  libs/vineyard
```

**Step 1.6 — Archive artifact packages and clean up empty directories:**

Three packages in `packages/` contain only `node_modules/` and no source files. They are artifacts of past experiments. Before removing `packages/`, archive them so history is preserved:

```bash
# Confirm they're truly empty (only node_modules)
ls packages/example-site  # should only show: node_modules
ls packages/ui            # should only show: node_modules
ls packages/zig-core      # should only show: node_modules

# Archive them (git mv preserves history)
mkdir -p archives
git mv packages/example-site  archives/example-site
git mv packages/ui            archives/ui
git mv packages/zig-core      archives/zig-core
```

Then remove the now-empty `packages/` directory:

```bash
# packages/ directory should now be empty
ls packages/workers  # confirm empty
rmdir packages/workers
ls packages          # confirm empty
rmdir packages
```

**Root `landing/` directory — handle with care:**

Root `landing/` contains 2 static icons that are **different versions** from what's in `apps/landing/static/` (the canonical landing site):

| File           | Root `landing/static/` | `apps/landing/static/` | Notes                         |
| -------------- | ---------------------- | ---------------------- | ----------------------------- |
| `icon-192.png` | 6,999 bytes            | 16,504 bytes           | Root version is smaller/older |
| `icon-512.png` | 20,431 bytes           | 50,893 bytes           | Root version is smaller/older |

These are NOT identical files — the root versions appear to be older/smaller variants. Since landing is the grove.place home page and a very special folder, do NOT silently delete these. Instead:

```bash
# Visually compare the icons to confirm they're just older versions
# (open both side by side, or use ImageMagick identify)

# If confirmed as older versions that aren't needed:
git rm -r landing
# The canonical icons live in apps/landing/static/

# If they're intentionally different (e.g., separate PWA manifest targets):
git mv landing _deprecated/landing-root-icons
# Then investigate whether apps/landing/ needs these specific sizes
```

**Important:** The auto-tag workflow (`auto-tag.yml`) syncs snapshot data to `packages/landing/static/data/` — after the move, this becomes `apps/landing/static/data/`. This is handled in the workflow update (Step 1.10), but verify the data sync still works after the move.

> **Safety rule:** Never `rm -rf` during migration. Use `git mv` to preserve history, `git rm` to remove tracked files, and `rmdir` only on confirmed-empty directories.

**Step 1.7 — Update pnpm-workspace.yaml:**

```yaml
packages:
  - "apps/*"
  - "services/*"
  - "workers/*"
  - "libs/*"
```

**Step 1.8 — Update relative paths:**

Every app's `tailwind.config.js` currently imports from `../engine/...`. After the move:

- Apps are at `apps/<name>/` depth
- Engine is at `libs/engine/`
- New relative path: `../../libs/engine/...`

Files to update (7 tailwind configs):

```
apps/landing/tailwind.config.js
apps/plant/tailwind.config.js
apps/clearing/tailwind.config.js
apps/meadow/tailwind.config.js
apps/terrarium/tailwind.config.js
apps/login/tailwind.config.js
apps/domains/tailwind.config.js
```

Change pattern:

```javascript
// Before:
import grovePreset from "../engine/src/lib/ui/tailwind.preset.js";
// content: "../engine/src/lib/**/*.{html,js,svelte,ts}"

// After:
import grovePreset from "../../libs/engine/src/lib/ui/tailwind.preset.js";
// content: "../../libs/engine/src/lib/**/*.{html,js,svelte,ts}"
```

Also search for any other `../engine` relative paths in:

- `svelte.config.js` files
- `tsconfig.json` files
- `vite.config.ts` files
- Any other config files

**Step 1.9 — Audit wrangler.toml cross-references:**

> This must happen **before** committing Phase 1 — not during verification after.

```bash
# Check for any relative paths that reference sibling packages
grep -r '\.\.\/' apps/*/wrangler.toml services/*/wrangler.toml workers/*/wrangler.toml libs/*/wrangler.toml
# Check for any stale packages/ references
grep -r 'packages/' apps/*/wrangler.toml services/*/wrangler.toml workers/*/wrangler.toml libs/*/wrangler.toml
```

Also check any `build.ts`, `build.sh`, or custom build scripts referenced from wrangler `[build]` sections. Verify zero hits referencing old paths, or fix any that do.

**Step 1.10 — Refactor deploy workflows (reusable core + thin callers):**

Extract shared deploy logic into a reusable workflow, then slim each `deploy-*.yml` down to ~10 lines. See [CI Workflow Strategy](#ci-workflow-strategy-reusable-workflow--thin-callers) for full design.

1. Create `.github/workflows/_deploy.yml` — reusable workflow with all shared logic (checkout, pnpm install, build, wrangler deploy). Accepts inputs: `package-path`, `deploy-type` (pages/worker), `project-name`.
2. Rewrite each `deploy-*.yml` as a thin caller:
   - Update path triggers from old locations to new (`packages/landing/**` → `apps/landing/**`, etc.)
   - Replace the 40-80 lines of duplicated logic with a `uses: ./.github/workflows/_deploy.yml` call
   - Each file becomes ~10 lines: trigger, path filter, reusable workflow call with 3 inputs
3. Update `ci.yml` to scan across `apps/`, `services/`, `workers/`, `libs/` instead of `packages/*`
4. Update non-deploy workflows (`claude.yml`, `codeql.yml`, `semgrep.yml`, etc.) — fix any `packages/` path references individually
5. **Update `auto-tag.yml`** — this workflow syncs snapshot data directly into landing's static directory (`packages/landing/static/data/` → `apps/landing/static/data/`). There are 10+ path references to update. This is critical because landing is the grove.place home page — stale snapshot data means the knowledge base breaks.

**Step 1.11 — Update root package.json:**

The root `package.json` has test scripts with `--filter` flags. These use package names (not paths), so they should still work. But any scripts referencing paths directly need updating.

**Step 1.12 — Update documentation:**

- `AGENT.md` — Path references throughout (including the hardcoded `cat packages/engine/package.json | grep -A2 '"\./'` one-liner — replace with `gf --agent engine` or update the path to `libs/engine`)
- `CONTRIBUTING.md` — Dev setup instructions say `cd packages/engine && pnpm dev`, must become `cd libs/engine && pnpm dev`
- `docs/developer/decisions/project-organization.md` — Directory structure diagrams
- `CLAUDE.md` — Tailwind preset path example
- Any other docs referencing `packages/`

**Step 1.13 — Verify:**

> gw and gf tooling was already updated in Phase 0. This verification confirms they work with the new layout.

```bash
pnpm install
pnpm -r run build
pnpm -r run test:run
pnpm -r run check
```

---

### Phase 2: Import External Services

> **Goal:** Bring Foliage, Gossamer, Shutter, Forage, Ivy, and Amber into the monorepo. One at a time, each verified before the next.

#### 2A: Import Foliage → libs/foliage/

**Priority: Highest** — Themes have been stalled the longest.

**Pre-check:** Confirm the current last migration number in the main D1 migration directory so Foliage's 3 files are numbered correctly:

```bash
ls services/heartwood/migrations/  # or wherever the main migrations live — note highest number N
```

**Steps:**

1. Copy `~/Documents/Projects/Foliage/` source into `libs/foliage/` (no clone needed — available locally)
2. Update `package.json` name from `@groveengine/foliage` → `@autumnsgrove/foliage`
3. Add `"@autumnsgrove/foliage": "workspace:*"` to engine's `package.json` dependencies
4. **Add new export paths to engine's `package.json`** — the engine has zero foliage today, these are entirely new entries:
   ```json
   "./foliage": { "types": "./dist/foliage/index.d.ts", "svelte": "./dist/foliage/index.js", "default": "./dist/foliage/index.js" },
   "./foliage/themes": { "types": "./dist/foliage/themes/index.d.ts", "default": "./dist/foliage/themes/index.js" },
   "./foliage/components": { "types": "./dist/foliage/components/index.d.ts", "svelte": "./dist/foliage/components/index.js", "default": "./dist/foliage/components/index.js" },
   "./foliage/server": { "types": "./dist/foliage/server/index.d.ts", "default": "./dist/foliage/server/index.js" }
   ```
5. Create `libs/engine/src/lib/foliage/` re-export shims pointing to `@autumnsgrove/foliage` so consumers can import from either package
6. **Fold Foliage's 3 migrations into the main D1 pipeline:** Renumber the files sequentially after `N` and copy them into the main migrations directory:
   - `libs/foliage/migrations/001_theme_settings.sql` → main migrations as `(N+1)_theme_settings.sql`
   - `libs/foliage/migrations/002_custom_fonts.sql` → `(N+2)_custom_fonts.sql`
   - `libs/foliage/migrations/003_community_themes.sql` → `(N+3)_community_themes.sql`
   - Remove the original `libs/foliage/migrations/` directory (now canonical location is main pipeline)
7. Verify: build, test, type-check
8. Verify migrations: confirm `theme_settings`, `custom_fonts`, `community_themes` tables are present in D1

#### 2B: Import Gossamer → libs/gossamer/

Gossamer is a nested monorepo with a single package (`packages/core/`). Flatten it — only `packages/core/` comes in.

1. Copy `~/Documents/Projects/Gossamer/packages/core/` into `libs/gossamer/` (no clone needed — available locally)
2. Package name is **already** `@autumnsgrove/gossamer` — no rename needed
3. In engine's `package.json`, change `"@autumnsgrove/gossamer": "^0.1.1"` → `"@autumnsgrove/gossamer": "workspace:*"`
4. Do NOT copy Gossamer's root `pnpm-workspace.yaml` or its examples — only the `core/` package contents
5. Verify all existing Gossamer imports still resolve
6. Verify: build, test

#### 2C: Import Shutter → libs/shutter/

Shutter maintains both a Python and TypeScript implementation. Both come in together — the repo structure is preserved as-is.

1. Copy `~/Documents/Projects/Shutter/` into `libs/shutter/` (no clone needed — available locally)
   - Python root (`src/`, `tests/`, `pyproject.toml`, `uv.lock`) stays at `libs/shutter/` root
   - TypeScript Worker stays at `libs/shutter/cloudflare/` (no restructuring)
2. Update `libs/shutter/cloudflare/package.json` name from `"shutter-worker"` → `"@autumnsgrove/shutter"` (or keep `shutter-worker` for the worker and add a root `package.json` for the lib — decide at implementation time based on how consumers will import it)
3. Wire up any internal consumers that can use direct import instead of API call (Mycelium integration can come later)
4. Verify: TypeScript worker builds (`cd libs/shutter/cloudflare && pnpm build`), Python tests pass (`uv run pytest libs/shutter/tests`)

#### 2D: Import Forage → services/forage/

> Forage gets the most dramatic simplification of any import. It was the first Loom-style service, built before the SDK existed. Bringing it in means it can shed its bespoke infrastructure and become a thin orchestrator.

1. **Archive the Python predecessor first:**
   ```bash
   mkdir -p archives/GroveDomainTool-python
   cp -r ~/Documents/Projects/GroveDomainTool/src        archives/GroveDomainTool-python/
   cp -r ~/Documents/Projects/GroveDomainTool/tests      archives/GroveDomainTool-python/
   cp    ~/Documents/Projects/GroveDomainTool/pyproject.toml archives/GroveDomainTool-python/
   cp    ~/Documents/Projects/GroveDomainTool/README.md  archives/GroveDomainTool-python/
   # Add a README note explaining this is the predecessor to the TS worker
   git add archives/GroveDomainTool-python/
   ```
2. Copy the TS Worker source from `~/Documents/Projects/GroveDomainTool/worker/` into `services/forage/` (no clone needed — available locally)
3. Set up `package.json` with name `grove-forage`
4. Set up `wrangler.toml` with service bindings (no secrets needed):
   - Bind to Zephyr (email), Lumen (AI), Loom/durable-objects (session orchestration)
   - For local dev, configure `[env.dev]` service binding stubs or `--local` mode
5. **Replace bespoke DO orchestration with Loom SDK:**
   - Forage's hand-rolled DO session management predates the Loom SDK
   - Replace with Loom SDK calls from `services/durable-objects`
   - This is the biggest code reduction — potentially hundreds of lines
6. **Replace Resend with Zephyr service binding:**
   - Remove `@resend/node` dependency and direct Resend API calls
   - Call Zephyr's internal API for result emails
7. **Replace OpenRouter with Lumen service binding:**
   - Remove standalone OpenRouter key and direct API calls
   - Route AI calls through Lumen (already manages provider keys, rate limits, fallbacks)
8. Update `apps/domains/wrangler.toml` service binding to use the local Forage worker
9. Add deploy workflow: `.github/workflows/deploy-forage.yml`
10. Verify: build, type-check, test full quiz flow end-to-end (Loom session → Lumen AI → Zephyr email)

#### 2E: Import Ivy → apps/ivy/

> Ivy becomes immensely easier to develop once it's inside the monorepo. Engine upgrades land without publish cycles, auth becomes a service binding instead of an external HTTP call, and email goes through Zephyr — one gateway for the whole platform.

**Steps:**

1. Copy `~/Documents/Projects/Ivy/` into `apps/ivy/` (no clone needed — available locally)
   - Preserve all source files, migrations, wrangler.toml, and package.json
2. **Update engine dependency:** `@autumnsgrove/groveengine: ^0.9.99` → `workspace:*`
3. **Replace `lucide-svelte` imports with engine icons** — Ivy likely imports icons directly from lucide-svelte; swap to `@autumnsgrove/groveengine/icons`
4. **Replace auth HTTP call with Heartwood service binding:**
   - Remove: `fetch('https://auth-api.grove.place/api/auth/session')` (deprecated endpoint)
   - Add: Heartwood service binding in `wrangler.toml`
   - Update auth middleware to call `env.AUTH.fetch(...)` instead of external HTTP
5. **Wire up Zephyr service binding for email:**
   - Add Zephyr binding to `wrangler.toml`
   - Replace any direct Resend API calls with Zephyr service calls
   - Ivy's email flow (send/receive for `@grove.place` addresses) routes through Zephyr, same as Heartwood
6. **Ivy's D1 stays with the package:**
   - D1 database: `ivy-db` with 3 migrations (all `ivy_*` prefixed, self-contained)
   - Do NOT fold Ivy's migrations into the main D1 pipeline — Ivy's schema is scoped to Ivy, not platform-wide
   - Keep the `ivy-db` binding in `wrangler.toml` as-is
7. **Add deploy workflow:** `.github/workflows/deploy-ivy.yml` using the reusable `_deploy.yml` template
8. Verify: build (`pnpm --filter apps/ivy build`), type-check, test auth flow end-to-end (session → Heartwood → response)

---

#### 2F: Import Amber → apps/amber/ + services/amber/

> Amber is the storage layer for the entire platform. External development has meant the R2 bucket manager was disconnected from the platform that depends on it. Bringing it in means: the tier TODO finally gets resolved (four years of `'seedling'` for everyone), ExportJobV2 sheds its bespoke DO boilerplate, and the auth call to a deprecated endpoint disappears.

Amber is a two-part import: SvelteKit UI to `apps/amber/` and the CF Worker to `services/amber/`.

**Part A — SvelteKit UI (`apps/amber/`):**

1. Copy the Amber SvelteKit root (everything _except_ the `worker/` directory) into `apps/amber/`
2. **Update engine dependency:** `@autumnsgrove/groveengine: ^0.6.4` → `workspace:*`
   - This is a large version jump — audit for any breaking changes between 0.6.4 and current engine
3. **Replace `lucide-svelte` imports with engine icons** — same pattern as other apps
4. **Add deploy workflow:** `.github/workflows/deploy-amber.yml` using the reusable `_deploy.yml` template
5. Verify: build, type-check

**Part B — CF Worker (`services/amber/`):**

1. Copy `~/Documents/Projects/Amber/worker/` into `services/amber/`
2. **Remove the `X-Test-User-ID` bypass header** from `index.ts`:
   - This header allows unauthenticated impersonation in production — it must go before any other work
   - Search for `X-Test-User-ID` and remove the entire bypass branch
3. **Replace `getAuthUser()` HTTP auth with Heartwood service binding:**
   - Remove: `fetch('https://auth-api.grove.place/api/auth/session')` (deprecated)
   - Add Heartwood service binding to `wrangler.toml`
   - Update the auth middleware to call `env.AUTH.fetch(...)` — same pattern as other services
   - **This also resolves the tier TODO:** Heartwood returns full user context including subscription plan. Replace:
     ```typescript
     // TODO: Get user's subscription tier from subscription service
     const tier: SubscriptionTier = "seedling";
     ```
     with the actual tier from Heartwood's session response. Every user gets their real plan enforced.
4. **Replace ExportJobV2 bespoke DO orchestration with Loom SDK:**
   - What stays: `ZipStreamer` + multipart R2 upload logic in `zipStream.ts` (well-implemented streaming ZIP — keep it)
   - What goes: `ensureSchema()`, manual `scheduleAlarm()`, chunk offset tracking, parallel SQLite + D1 state updates
   - Replace with Loom SDK abstractions from `services/durable-objects` — same transformation as Forage
   - `processPendingExports` cron (`*/5 * * * *`) becomes lightweight orphaned-job recovery (Loom handles the primary trigger via alarms)
   - `deleteExpiredTrash` and `deleteExpiredExports` crons (`0 3 * * *`) stay as-is
5. **Add deploy workflow:** `.github/workflows/deploy-amber-worker.yml`
6. Verify: build, type-check, test end-to-end export flow (request → ExportJobV2 via Loom → ZipStreamer → R2 multipart upload → download link)

**Part C — ZIP export UX consolidation:**

1. In engine's `apps/arbor/export/+page.svelte` (or equivalent), add a warm redirect/pointer to Amber:
   - Engine's export = Markdown portability (Hugo/Jekyll/Astro/Ghost compatible, "take your writing somewhere else")
   - Amber's export = raw file download ("download everything you've ever uploaded")
   - The copy should feel welcoming: "Looking to download your files? Amber is where you can see everything clearly, organized by product."
   - Keep ExportDO functional — it serves a different purpose and should remain available
2. **Defer `ZipStreamer` extraction** — it's a good candidate for a shared util (so ExportDO could also use streaming multipart for large exports), but this is post-import work, not a blocking requirement

---

### Phase 3: Documentation Sync

> **Goal:** All documentation reflects the new structure.
>
> **Note:** gw and gf tooling updates landed in Phase 0, not here. Those are structural, not documentation.

1. **Update `AGENT.md`:**
   - Directory structure references
   - Tailwind preset path example
   - Package listing
   - Naming reference table

2. **Update `docs/developer/decisions/project-organization.md`:**
   - New directory structure diagram
   - Updated naming reference with new locations
   - Note Foliage, Gossamer, Shutter, Forage as now in-monorepo

3. **Update `CLAUDE.md`:**
   - Tailwind preset import path example

4. **Update `CONTRIBUTING.md`:**
   - Dev setup instructions: `cd packages/engine && pnpm dev` → `cd libs/engine && pnpm dev` (line 86)
   - Any other `packages/` path references in setup or build steps

5. **Clean up stale references:**
   - Search entire codebase for remaining `packages/` path references
   - Root `landing/` was already handled in Phase 1 Step 1.6

6. **README navigation system:**

   The restructure creates real categories. The README system should reflect that, so anyone exploring the repo can orient themselves quickly.

   **Directory-level READMEs** for each category:
   - `apps/README.md` — indexes all apps with Grove names, one-line descriptions, and links
   - `services/README.md` — indexes all services
   - `workers/README.md` — indexes all workers
   - `libs/README.md` — indexes all libraries

   **Breadcrumb navigation** at the top of every README:
   - Root README: none (it IS home)
   - Directory README: `[Lattice](../README.md) > Apps`
   - Package README: `[Lattice](../../README.md) > [Apps](../README.md) > Landing`

   **Root README path updates:**
   - Update the ecosystem table links from `packages/*` to `apps/*`, `services/*`, `libs/*`, `workers/*`
   - This should be done as part of this step, after all moves are verified

   **Package README standardization** — each package README should have:
   - Breadcrumb navigation (links back to category and root)
   - Grove name + standard name (e.g., "Heartwood — Authentication Service")
   - Brief description in Grove voice
   - Technical details (setup, bindings, architecture notes)
   - Packages that currently lack a README get one; packages that have one get the breadcrumb + Grove name added

   > **Why this comes last in Phase 3:** README paths must resolve correctly. Directory moves (Phase 1) and imports (Phase 2) must be complete before writing navigation links that depend on the final structure. Writing READMEs against stale paths creates broken links that erode trust in the docs.

---

## Relative Path Impact Analysis

The most fragile part of this migration is relative path imports. Here's every pattern that needs updating:

### Tailwind Config (7 files)

```
../engine/src/lib/ui/tailwind.preset.js  →  ../../libs/engine/src/lib/ui/tailwind.preset.js
../engine/src/lib/**/*.{html,js,svelte,ts}  →  ../../libs/engine/src/lib/**/*.{html,js,svelte,ts}
```

**Affected files:**

- `apps/landing/tailwind.config.js`
- `apps/plant/tailwind.config.js`
- `apps/clearing/tailwind.config.js`
- `apps/meadow/tailwind.config.js`
- `apps/terrarium/tailwind.config.js`
- `apps/login/tailwind.config.js`
- `apps/domains/tailwind.config.js`

### Package.json (workspace:\* deps)

These use package names, **not** paths — no changes needed. pnpm resolves by name.

### TypeScript / SvelteKit Imports

These use `@autumnsgrove/groveengine/...` package imports — **no changes needed**. Resolved via `node_modules`.

### GitHub Actions Workflows

Every deploy workflow has `packages/<name>` in path triggers and working directories. All must be updated to the new locations.

### wrangler.toml Files

Promoted to an explicit pre-commit step (Step 1.9). See Phase 1 above.

---

## CI Workflow Strategy: Reusable Workflow + Thin Callers

Keep separate `deploy-*.yml` files — each service is its own entity, easy to reason about, easy to debug. But eliminate the copy-paste by extracting all shared logic into a reusable workflow that each caller invokes with just its specifics.

### Current State: 17+ Copy-Pasted Deploy Workflows

Each `deploy-*.yml` is 40-80 lines of nearly identical YAML: install pnpm, install deps, run wrangler deploy. The only differences are the path trigger, working directory, and project name.

### Target State: Reusable Workflow + Thin Callers

**The reusable workflow** (all shared deploy logic in one place):

```yaml
# .github/workflows/_deploy.yml (underscore = convention for reusable)
name: Reusable Deploy

on:
  workflow_call:
    inputs:
      package-path:
        description: "Path to the package (e.g., apps/landing)"
        required: true
        type: string
      deploy-type:
        description: "pages (SvelteKit) or worker (Cloudflare Worker)"
        required: true
        type: string
      project-name:
        description: "Cloudflare project name"
        required: true
        type: string

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile

      # SvelteKit → build + pages deploy
      - if: inputs.deploy-type == 'pages'
        run: pnpm --filter ./${{ inputs.package-path }} build
      - if: inputs.deploy-type == 'pages'
        run: wrangler pages deploy ...
        working-directory: ${{ inputs.package-path }}

      # Worker → wrangler deploy
      - if: inputs.deploy-type == 'worker'
        run: wrangler deploy
        working-directory: ${{ inputs.package-path }}
```

**Each service's caller** (~10 lines):

```yaml
# .github/workflows/deploy-landing.yml
name: Deploy Landing
on:
  push:
    branches: [main]
    paths: [apps/landing/**]
jobs:
  deploy:
    uses: ./.github/workflows/_deploy.yml
    with:
      package-path: apps/landing
      deploy-type: pages
      project-name: grove-landing
    secrets: inherit
```

### What This Gets You

- **Each service is its own file.** You see `deploy-landing.yml` in the workflow list, click it, see its history. Unique entities, clear debugging.
- **Zero duplicated logic.** The reusable workflow has the install/build/deploy steps once. Fix a bug, update Node version, change caching strategy → one file.
- **Adding a new service = copy a 10-line template.** Fill in `package-path`, `deploy-type`, `project-name`. Done.
- **Path triggers stay per-service.** Engine update → only engine deploys. Router update → only router deploys. Same behavior as today.

### Caller Template

When adding a new service, copy this and fill in the blanks:

```yaml
# .github/workflows/deploy-SERVICENAME.yml
name: Deploy DISPLAYNAME
on:
  push:
    branches: [main]
    paths: [CATEGORY/DIRNAME/**]
jobs:
  deploy:
    uses: ./.github/workflows/_deploy.yml
    with:
      package-path: CATEGORY/DIRNAME
      deploy-type: pages|worker
      project-name: CLOUDFLARE_PROJECT_NAME
    secrets: inherit
```

### CI (Non-Deploy) Workflow

Same pattern for `ci.yml`. Create a reusable `_ci.yml` with the test/check/lint steps. The main `ci.yml` detects which packages changed and runs the reusable workflow for each. Update the hardcoded `for config in packages/*/svelte.config.*` to scan across `apps/`, `services/`, `workers/`, `libs/`.

---

## Risk Assessment

| Risk                                  | Impact                                                   | Mitigation                                                                                 |
| ------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **Broken relative paths**             | High — builds fail                                       | Comprehensive search-and-replace; verify with full build                                   |
| **CI deploy paths wrong**             | High — deploys stop working                              | Update all workflow files; test with dry-run before merge                                  |
| **gw package detection breaks**       | High — `gw context`, `gw packages` fail                  | Update `packages.py` discover logic to scan new dirs (confirmed)                           |
| **gf impact/infra commands break**    | High — `gf impact`, `gf migrations` fail                 | Update hardcoded `packages/` in Go + Python (confirmed, 20+ refs)                          |
| **wrangler.toml cross-references**    | Medium — workers can't build                             | Explicit audit step; grep for `../` and `packages/` in all configs                         |
| **Forage service binding wiring**     | Medium — Forage deploys but calls fail                   | Test Zephyr + Lumen service bindings end-to-end before going live                          |
| **Git history fragmentation**         | Medium — blame/log harder to trace                       | `git log --follow` still works; accept trade-off                                           |
| **Foliage migration numbering clash** | Medium — migrations out of order                         | Check current last migration number before running Phase 2A; slot as N+1, N+2, N+3         |
| **Foliage missing export paths**      | Medium — `@autumnsgrove/groveengine/foliage` returns 404 | Engine has no foliage today — add export paths in Phase 2A step 4; verify build            |
| **Shutter package naming ambiguity**  | Low — unclear import path for consumers                  | Decide on root-level `package.json` vs worker-only at implementation time; document choice |
| **Gossamer examples lost**            | Low — useful demo code disappears                        | Gossamer's `examples/` stay in the external repo; only `core/` is imported. Acceptable.    |
| **npm publish pipeline break**        | Medium — can't release engine                            | Verify publish workflow uses correct new path                                              |
| **Stale path references in docs**     | Low — confusion but no breakage                          | Global search for `packages/` after migration                                              |
| **Ivy auth to deprecated endpoint**   | High — `auth-api.grove.place` may be removed anytime     | Phase 2E step 4: replace with Heartwood service binding before deploying                   |
| **Amber hardcoded `'seedling'` tier** | High — all users get seedling plan enforcement           | Phase 2F step B-3: Heartwood service binding returns real tier; remove TODO on day one     |
| **Amber `X-Test-User-ID` bypass**     | Critical — unauthenticated impersonation in production   | Phase 2F step B-2: remove bypass header as the very first change; do not import without it |
| **Amber engine version gap (0.6.4)**  | Medium — nearly a year of breaking changes to absorb     | Audit diff between 0.6.4 and current engine before updating `workspace:*`                  |
| **Amber Loom migration complexity**   | Medium — ExportJobV2 is 400+ lines of bespoke DO code    | Keep ZipStreamer as-is; only replace orchestration layer; test export end-to-end           |
| **ZIP consolidation UX regression**   | Low — `/arbor/export/` users may be confused by redirect | Add warm redirect with clear explanation of both export paths; keep ExportDO functional    |

---

## What NOT to Do in This Migration

1. **Do NOT rename the npm package** (`@autumnsgrove/groveengine` → `@groveplace/lattice`). That's a separate effort with its own blast radius.
2. **Do NOT restructure the engine's internal `src/lib/` layout.** Only its location in the monorepo changes.
3. **Do NOT change package names** in `package.json` files. Only locations change. (Exception: Foliage is intentionally renamed from `@groveengine/foliage` → `@autumnsgrove/foliage` — this is a one-time correction to align with the org namespace.)
4. **Do NOT refactor imports** from `@autumnsgrove/groveengine` to anything else.
5. **Do NOT update Cloudflare project names** or resource IDs. Those are infrastructure, not code organization.
6. **Do NOT merge Foliage into the engine.** It lives in `libs/foliage/` as its own package. The engine gains export paths that point at it, but the source stays separate.
7. **Do NOT `rm -rf` the artifact packages** (`example-site`, `ui`, `zig-core`) — archive them with `git mv` first so history is preserved.

---

## Verification Checklist

After Phase 0 (tooling prep):

- [ ] gw and gf updated to handle both old and new directory layouts
- [ ] gf Go binaries rebuilt for all 4 platforms and committed
- [ ] `gw context` still works with current `packages/` layout
- [ ] `gf --agent impact packages/engine/src/lib/ui/GlassCard.svelte` still resolves
- [ ] `gf --agent migrations` still finds migrations

After Phase 1 (restructure):

- [ ] `pnpm install` succeeds
- [ ] `pnpm -r run build` succeeds for all packages
- [ ] `pnpm -r run check` succeeds (TypeScript)
- [ ] `pnpm -r run test:run` passes
- [ ] **Landing specifically:** `pnpm --filter grove-landing build` succeeds (grove.place must always build)
- [ ] **Landing specifically:** `auto-tag.yml` snapshot data paths point to `apps/landing/static/data/`
- [ ] `gw context` reports correct packages under new directories (not zero)
- [ ] `gw packages list` shows correct paths
- [ ] `gf --agent search "test"` still finds files correctly
- [ ] `gf --agent impact libs/engine/src/lib/ui/GlassCard.svelte` resolves correctly (not empty)
- [ ] `gf --agent migrations` finds D1 migrations in new paths
- [ ] No remaining references to `packages/` in workspace config
- [ ] All deploy workflows point to new paths
- [ ] Root `landing/` icons resolved (removed or moved to `_deprecated/`)

After Phase 2 (imports):

- [ ] Each imported package builds independently
- [ ] Engine can import from Foliage (`@autumnsgrove/foliage`) via `workspace:*`
- [ ] Engine's new `./foliage`, `./foliage/themes`, `./foliage/components`, `./foliage/server` export paths resolve
- [ ] Gossamer imports in engine still resolve (now via `workspace:*` instead of npm registry)
- [ ] Forage worker type-checks
- [ ] Forage service bindings to Zephyr and Lumen connect (verify locally)
- [ ] Shutter TypeScript worker builds (`libs/shutter/cloudflare`)
- [ ] Shutter Python tests pass (`uv run pytest libs/shutter/tests`)
- [ ] Foliage migrations applied: `theme_settings`, `custom_fonts`, `community_themes` tables exist in D1
- [ ] Python predecessor archived at `archives/GroveDomainTool-python/`
- [ ] Artifact packages archived at `archives/example-site/`, `archives/ui/`, `archives/zig-core/`
- [ ] No circular dependencies
- [ ] Ivy builds and type-checks at `apps/ivy/`
- [ ] Ivy auth flow works end-to-end (session via Heartwood service binding, NOT `auth-api.grove.place`)
- [ ] Ivy's D1 (`ivy-db`) binding intact — 3 migrations still applied to correct database
- [ ] Ivy Zephyr service binding connects (verify email send/receive path)
- [ ] Amber UI builds at `apps/amber/`
- [ ] Amber engine upgrade (`^0.6.4` → `workspace:*`) produces no type errors
- [ ] Amber worker builds at `services/amber/`
- [ ] `X-Test-User-ID` bypass header **completely removed** from `services/amber/` — verify with grep
- [ ] Amber auth uses Heartwood service binding (no calls to `auth-api.grove.place`)
- [ ] Amber tier enforcement resolved: users get actual plan tier from Heartwood, NOT hardcoded `'seedling'`
- [ ] ExportJobV2 → Loom SDK migration passes end-to-end test (create export → chunk processing → ZIP → download link)
- [ ] `ZipStreamer` multipart R2 upload still produces valid ZIP files
- [ ] Engine's `/arbor/export/` page has warm redirect/pointer to Amber

After Phase 3 (docs):

- [ ] `AGENT.md` reflects new structure
- [ ] `project-organization.md` updated
- [ ] `CONTRIBUTING.md` dev setup paths updated (line 86: `cd libs/engine`)
- [ ] No stale `packages/` references in docs
- [ ] `CLAUDE.md` examples use correct paths
- [ ] Directory READMEs exist: `apps/README.md`, `services/README.md`, `workers/README.md`, `libs/README.md`
- [ ] All directory READMEs have breadcrumb navigation linking back to root
- [ ] All package READMEs have breadcrumbs (category + root) and Grove names
- [ ] Root README ecosystem table links point to new paths (`apps/*`, `services/*`, etc.)

---

## Execution Notes

- **Phase 0 lands first as its own commit.** Tooling updates that handle both old and new layouts. Safe no-op on the current structure — if Phase 1 gets delayed, nothing breaks.
- **Phase 1 is a single atomic commit.** Directory moves (1.1–1.6), config updates (1.7–1.12), verification (1.13). Tooling already prepared in Phase 0, so the blast radius is just the structural changes.
- **Phase 2 can be one commit per import** (Foliage, Gossamer, Shutter, Forage, Ivy, Amber — each separately). This keeps the blame history clean and makes rollback granular. Amber is two commits: UI (`apps/amber/`) and worker (`services/amber/`) are independent deploys. **Import Amber worker only after removing `X-Test-User-ID` bypass and replacing the auth call — do not commit Amber worker with the bypass still in place.**
- **Phase 3 is safe to do incrementally.** Docs updates can land as follow-ups without breaking anything.
- **Test locally before pushing.** The full `pnpm install && pnpm -r run build && pnpm -r run check` cycle is non-negotiable. Also verify `gw context` and `gf --agent impact` return non-empty results.

---

_This plan restructures the house. The furniture (code) stays the same — it just finally has rooms instead of one big hallway._
