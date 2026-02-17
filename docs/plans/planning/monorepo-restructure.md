# Monorepo Restructure Plan

> **Status:** Planning
> **Created:** 2026-02-17
> **Scope:** Reorganize GroveEngine from flat `packages/` into categorized directories; import Forage, Shutter, Foliage, and Gossamer.

---

## The Problem

The monorepo has outgrown its flat `packages/` structure. Fourteen packages — SvelteKit apps, core service workers, utility cron workers, and shared libraries — sit side-by-side in one directory with no visual hierarchy. Two critical theming projects (Foliage and Gossamer) have stalled because coordinating work across separate repos is too painful. Meanwhile, Forage's business logic belongs here (the UI already is), and Shutter is becoming integral to multiple Grove services.

## The Solution

1. **Reorganize** existing packages into five categories: `apps/`, `services/`, `workers/`, `libs/`, `tools/`
2. **Import** four external repositories: Foliage, Gossamer, Forage, Shutter
3. **Update** all workspace configs, relative paths, CI workflows, and documentation

---

## Decisions (Confirmed)

| Decision                                               | Answer                                                                   |
| ------------------------------------------------------ | ------------------------------------------------------------------------ |
| Forage                                                 | Bring business logic in. Front-end already in `domains` app.             |
| Shutter                                                | Bring in. TS worker version becoming integral. Stays publishable as npm. |
| Foliage                                                | Bring back in. Themes stalled from cross-repo complexity.                |
| Gossamer                                               | Bring inside. Core part of theming engine, same stall issue.             |
| Press, Verge, Aria, Trove, Clearing (newspaper), Scout | Stay external. Truly independent projects.                               |
| Nook, Outpost, Bloom                                   | Stay external. Will import Lattice SDKs but don't belong here.           |
| Directory structure                                    | `apps/`, `services/`, `workers/`, `libs/`, `tools/`                      |
| npm rename to `@groveplace/lattice`                    | Separate follow-up effort, not part of this migration.                   |

---

## Current Structure

```
GroveEngine/
├── packages/                    # FLAT — 14 packages (mixed types)
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
├── landing/                     # Stale reference (packages/landing is canonical)
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
│   ├── landing/                 #   grove.place marketing site
│   ├── plant/                   #   plant.grove.place onboarding
│   ├── clearing/                #   status.grove.place status page
│   ├── meadow/                  #   meadow.grove.place community feed
│   ├── terrarium/               #   terrarium.grove.place UI showcase
│   ├── login/                   #   login.grove.place auth UI
│   └── domains/                 #   domains.grove.place + Forage UI
│
├── services/                    # Core infrastructure workers (always-on, handle requests)
│   ├── heartwood/               #   Auth provider (OAuth + PKCE)
│   ├── grove-router/            #   Subdomain routing proxy
│   ├── durable-objects/         #   DO coordination layer (Loom)
│   ├── forage/                  #   [NEW] Domain discovery AI worker
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

| Current Location     | New Location     | Package Name    |
| -------------------- | ---------------- | --------------- |
| `packages/landing`   | `apps/landing`   | grove-landing   |
| `packages/plant`     | `apps/plant`     | grove-plant     |
| `packages/clearing`  | `apps/clearing`  | grove-clearing  |
| `packages/meadow`    | `apps/meadow`    | grove-meadow    |
| `packages/terrarium` | `apps/terrarium` | grove-terrarium |
| `packages/login`     | `apps/login`     | grove-login     |
| `packages/domains`   | `apps/domains`   | grove-domains   |

### services/ — Core Infrastructure Workers

Always-on services that handle requests. Core to the platform functioning.

| Current Location                  | New Location               | Package Name          |
| --------------------------------- | -------------------------- | --------------------- |
| `packages/heartwood`              | `services/heartwood`       | grove-heartwood       |
| `packages/grove-router`           | `services/grove-router`    | grove-router          |
| `packages/durable-objects`        | `services/durable-objects` | grove-durable-objects |
| `workers/zephyr`                  | `services/zephyr`          | grove-zephyr          |
| `workers/pulse`                   | `services/pulse`           | grove-pulse           |
| _(external: AutumnsGrove/Forage)_ | `services/forage`          | grove-forage          |

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

**Source:** `AutumnsGrove/Foliage`
**What it is:** Full theme customization system — 10 curated themes, accent colors, custom fonts, live preview customizer, community theme sharing.
**Why it stalled:** Cross-repo coordination with Lattice was too complex. Theme changes require touching both Foliage and the engine simultaneously.
**What changes:** Gets its own workspace package in `libs/foliage/` with a proper `package.json`. The engine imports from it via `workspace:*`. The existing `packages/engine/src/lib/foliage/` becomes either:

- A thin re-export layer (engine re-exports Foliage for convenience), or
- Gets replaced entirely by imports from `@autumnsgrove/foliage`

**Integration points:**

- Engine's `foliage/` export path
- Tier-gated features (Seedling/Sapling/Oak/Evergreen)
- D1 tables: `theme_settings`, `custom_fonts`, `community_themes`
- TenantDO for live preview

### Gossamer (libs/gossamer/)

**Source:** `AutumnsGrove/Gossamer`
**What it is:** 2D ASCII visual effects — floating clouds, gentle patterns, image-to-ASCII transforms, decorative borders. The whimsy layer.
**Why it stalled:** Same cross-repo coordination pain. Effects need to integrate with Glass UI and seasonal themes (Foliage).
**What changes:** Source moves into `libs/gossamer/`. Already listed as npm dependency (`@autumnsgrove/gossamer: ^0.1.1` in engine's `package.json`), so the switch is from npm registry to `workspace:*`.

**Integration points:**

- Engine's Glass UI components (GlassCard backgrounds)
- Seasonal presets (grove-mist, grove-fireflies, autumn-leaves, etc.)
- `prefers-reduced-motion` support
- Canvas-based rendering (no WebGL)

### Forage (services/forage/)

**Source:** `AutumnsGrove/Forage` (also referenced as `AutumnsGrove/GroveDomainTool`)
**What it is:** AI-powered domain discovery tool. 5-question quiz → AI generates candidates → Haiku swarm evaluates → RDAP checks availability → email with curated list.
**Front-end:** Already in `packages/domains` (→ `apps/domains`)
**What comes in:** The Cloudflare Worker backend — DO-based orchestration, AI pipeline.

**Key simplification:** As an external repo, Forage needed its own OpenRouter key and Resend integration. Inside the monorepo, it can use **Lumen** for AI and **Zephyr** for email via service bindings — eliminating standalone API keys entirely. See [Integration Upgrades](#integration-upgrades) below.

**Integration points:**

- `apps/domains` calls Forage's API
- Durable Objects for session state
- Lumen for AI/LLM calls (replaces standalone OpenRouter key)
- Zephyr for result emails (replaces standalone Resend key)
- Service bindings in `wrangler.toml` (Forage ↔ Lumen, Forage ↔ Zephyr, Domains ↔ Forage)

### Shutter (libs/shutter/)

**Source:** `AutumnsGrove/Shutter`
**What it is:** Content distillation with prompt injection defense. Sits between LLM agents and untrusted web content. Reduces 20k tokens to 200 with injection detection.
**What comes in:** The TypeScript implementation (exists but not live). Python version stays external.

**Integration points:**

- Mycelium MCP server (all external web access)
- Meadow (link previews)
- Forage (domain research)
- Publishable as `@autumnsgrove/shutter` or `@groveengine/shutter`

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

### Unified Deploy: One Workflow to Rule Them All

**Before:** 17+ nearly identical `deploy-*.yml` workflows, each hardcoding a package path and running the same wrangler deploy logic. Adding a new service means copying a workflow file and updating paths.

**After:** A single `deploy.yml` that detects which directories changed, spins up parallel matrix jobs, and runs the right deploy command per package type (Pages for SvelteKit, Workers for everything else). Adding a new service means... nothing. It auto-deploys. See [CI Workflow Strategy](#ci-workflow-strategy-unified-deploy-workflow) for design.

### Future Opportunities

These don't need to happen during the migration, but become possible afterward:

- **Shared D1 migrations:** A single migration pipeline that knows about all services' schema needs
- **Cross-service type safety:** Services can share TypeScript types directly instead of duplicating them
- **Service binding mesh:** Any service can talk to any other service without external API keys or auth tokens

---

## Migration Phases

### Phase 1: Create Structure & Move Existing Packages

> **Goal:** Reorganize without breaking anything. No new code.

**Step 1.1 — Create directories:**

```bash
mkdir -p apps services libs
# workers/ already exists, tools/ already exists
```

**Step 1.2 — Move apps (7 packages):**

```bash
git mv packages/landing    apps/landing
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

**Step 1.6 — Clean up empty directories:**

```bash
# packages/ directory should now be empty (or contain only stale files)
# Verify first, then remove empty dirs
ls packages/workers  # confirm empty
rmdir packages/workers
ls packages          # confirm empty
rmdir packages

# If root landing/ is stale (symlink or duplicate of packages/landing):
# Move it to _deprecated/ for safety rather than deleting
git mv landing _deprecated/landing-root-stale
# Or if it's a symlink:
git rm landing
```

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

**Step 1.10 — Replace deploy workflows with unified system:**

Instead of updating 17+ individual `deploy-*.yml` workflows to point at new paths, replace them all with a single unified deploy workflow. See [CI Workflow Strategy](#ci-workflow-strategy-unified-deploy-workflow) for full design.

1. Create `.github/workflows/deploy.yml` — unified deploy with change detection + matrix dispatch
2. Create `.github/workflows/ci.yml` (updated) — unified CI with dynamic package detection
3. Delete all individual `deploy-*.yml` workflows (17+ files):
   - `deploy-engine.yml`, `deploy-landing.yml`, `deploy-plant.yml`, `deploy-clearing.yml`
   - `deploy-meadow.yml`, `deploy-terrarium.yml`, `deploy-login.yml`, `deploy-domains.yml`
   - `deploy-heartwood.yml`, `deploy-router.yml`, `deploy-durable-objects.yml`
   - `deploy-zephyr.yml`, `deploy-clearing-monitor.yml`, `deploy-meadow-poller.yml`
   - `deploy-post-migrator.yml`, `deploy-timeline-sync.yml`, and any others
4. Keep non-deploy workflows (`claude.yml`, `codeql.yml`, `semgrep.yml`, etc.) — update any `packages/` path references in those individually

**Step 1.11 — Update root package.json:**

The root `package.json` has test scripts with `--filter` flags. These use package names (not paths), so they should still work. But any scripts referencing paths directly need updating.

**Step 1.12 — Update documentation:**

- `AGENT.md` — Path references throughout (including the hardcoded `cat packages/engine/package.json | grep -A2 '"\./'` one-liner — replace with `gf --agent engine` or update the path to `libs/engine`)
- `CONTRIBUTING.md` — Dev setup instructions say `cd packages/engine && pnpm dev`, must become `cd libs/engine && pnpm dev`
- `docs/developer/decisions/project-organization.md` — Directory structure diagrams
- `CLAUDE.md` — Tailwind preset path example
- Any other docs referencing `packages/`

**Step 1.13 — Update `gw` tool (REQUIRED — breaks immediately after moves):**

> gw's `discover_packages()` hardcodes `root / "packages"` for detection. After Step 1.2–1.5, `gw context` and `gw packages list` return zero packages.

- `tools/gw/src/gw/packages.py` → Update `discover_packages()` (lines 260-273) to scan `apps/`, `services/`, `workers/`, `libs/` instead of `packages/`
- `tools/gw/src/gw/commands/db.py` — Update `packages/` references in D1 migration paths
- `tools/gw/src/gw/commands/dev/format.py` — Update `packages/` references
- Update tests: `tools/gw/tests/test_packages.py`

**Step 1.14 — Update `gf` tool (REQUIRED — breaks immediately after moves):**

> gf hardcodes `packages/` in 20+ locations across Go and Python. After Step 1.2–1.5, `gf impact`, `gf migrations`, and quality commands return wrong results silently.

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
  - **This blocks the Phase 1 commit.** Stale binaries mean `gf impact` and `gf migrations` silently return wrong results.
  - Commit the rebuilt binaries as part of the Phase 1 atomic commit.

**Step 1.15 — Verify:**

```bash
pnpm install
pnpm -r run build
pnpm -r run test:run
pnpm -r run check
```

---

### Phase 2: Import External Services

> **Goal:** Bring Foliage, Gossamer, Shutter, and Forage into the monorepo. One at a time, each verified before the next.

#### 2A: Import Foliage → libs/foliage/

**Priority: Highest** — Themes have been stalled the longest.

1. Clone `AutumnsGrove/Foliage` into a temp directory
2. Copy source into `libs/foliage/`
3. Set up `package.json` with name `@autumnsgrove/foliage`
4. Add `workspace:*` dependency in engine's `package.json`
5. Reconcile with existing `libs/engine/src/lib/foliage/`:
   - Determine what's already in the engine vs what's in the external repo
   - Engine's foliage becomes a re-export layer, or gets replaced entirely
   - Keep the engine's `./foliage` export path working
6. Update imports in any consuming packages
7. Verify: build, test, type-check

#### 2B: Import Gossamer → libs/gossamer/

1. Clone `AutumnsGrove/Gossamer` into a temp directory
2. Copy source into `libs/gossamer/`
3. Set up `package.json` with name `@autumnsgrove/gossamer`
4. In engine's `package.json`, change `@autumnsgrove/gossamer: ^0.1.1` to `workspace:*`
5. Verify all existing Gossamer imports still resolve
6. Verify: build, test

#### 2C: Import Shutter → libs/shutter/

1. Clone `AutumnsGrove/Shutter` into a temp directory
2. Copy the TypeScript/Worker source into `libs/shutter/`
3. Set up `package.json` with name `@autumnsgrove/shutter` (or `@groveengine/shutter`)
4. Configure as publishable (for external consumption)
5. Wire up any internal consumers (Mycelium integration can come later)
6. Verify: build, test

#### 2D: Import Forage → services/forage/

> Forage gets the most dramatic simplification of any import. It was the first Loom-style service, built before the SDK existed. Bringing it in means it can shed its bespoke infrastructure and become a thin orchestrator.

1. Clone `AutumnsGrove/Forage` (or `AutumnsGrove/GroveDomainTool`) into a temp directory
2. Copy the Worker source into `services/forage/`
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

---

### Phase 3: Documentation Sync

> **Goal:** All documentation reflects the new structure.
>
> **Note:** gw and gf tooling updates are in Phase 1 (Steps 1.13–1.14), not here. Those are structural breakages, not documentation sync.

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

4. **Clean up stale references:**
   - Search entire codebase for remaining `packages/` path references
   - Move root `landing/` directory safely if stale (git mv to `_deprecated/`, never rm -rf)

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

## CI Workflow Strategy: Unified Deploy Workflow

The migration is the perfect moment to consolidate 17+ individual deploy workflows into a single unified deployment system. Instead of updating each `deploy-*.yml` file to point at new paths (and maintaining 17+ near-identical workflows forever), we replace them all with one smart workflow.

### Current State: 17+ Individual Deploy Workflows

```
.github/workflows/
├── deploy-engine.yml
├── deploy-landing.yml
├── deploy-plant.yml
├── deploy-clearing.yml
├── deploy-meadow.yml
├── deploy-terrarium.yml
├── deploy-login.yml
├── deploy-domains.yml
├── deploy-heartwood.yml
├── deploy-router.yml
├── deploy-durable-objects.yml
├── deploy-zephyr.yml
├── deploy-clearing-monitor.yml
├── deploy-meadow-poller.yml
├── deploy-post-migrator.yml
├── deploy-timeline-sync.yml
└── ... (more)
```

Each one is nearly identical: detect path change → install deps → run wrangler deploy. 17 copies of the same logic with different paths and project names.

### Target State: One Unified Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  detect-changes:
    # Use path-based change detection to figure out which packages changed
    # Output: list of changed package directories

  deploy:
    needs: detect-changes
    strategy:
      matrix:
        package: ${{ fromJson(needs.detect-changes.outputs.packages) }}
    steps:
      # Each package knows how to deploy itself via its wrangler.toml
      # The workflow just runs the right command in the right directory
```

**How it works:**

1. **Change detection:** On push to main, diff against previous commit to find which directories under `apps/`, `services/`, `workers/`, `libs/` changed
2. **Matrix dispatch:** Spin up parallel deploy jobs for each changed package
3. **Package-local config:** Each package's `wrangler.toml` (or `wrangler.json`) already knows its project name, routes, and bindings — the workflow just runs `wrangler deploy` in the right directory
4. **SvelteKit apps:** Detected by presence of `svelte.config.js` → run `pnpm build` then `wrangler pages deploy`
5. **Workers:** Detected by `wrangler.toml` without `svelte.config.js` → run `wrangler deploy`
6. **Libs:** Engine deploy triggered when `libs/engine/` changes → build + publish

**Benefits:**

- Add a new service → it auto-deploys. No new workflow file needed.
- One place to update deploy logic, not 17.
- Matrix strategy gives parallel deploys with clear per-package status.
- Path-based detection is resilient to future directory changes.

**Implementation:** This should be built as part of Phase 1's Step 1.10 instead of individually updating 17 workflow files. The old `deploy-*.yml` files get deleted, replaced by a single `deploy.yml`.

### CI (Non-Deploy) Workflow

The `ci.yml` workflow also needs updating. Similar approach:

```yaml
# .github/workflows/ci.yml — detect changed packages, run their tests/checks in matrix
```

Instead of hardcoding `for config in packages/*/svelte.config.*`, detect SvelteKit apps dynamically across `apps/`, `services/`, `workers/`, `libs/`.

---

## Risk Assessment

| Risk                                  | Impact                                   | Mitigation                                                         |
| ------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------ |
| **Broken relative paths**             | High — builds fail                       | Comprehensive search-and-replace; verify with full build           |
| **CI deploy paths wrong**             | High — deploys stop working              | Update all workflow files; test with dry-run before merge          |
| **gw package detection breaks**       | High — `gw context`, `gw packages` fail  | Update `packages.py` discover logic to scan new dirs (confirmed)   |
| **gf impact/infra commands break**    | High — `gf impact`, `gf migrations` fail | Update hardcoded `packages/` in Go + Python (confirmed, 20+ refs)  |
| **wrangler.toml cross-references**    | Medium — workers can't build             | Explicit audit step; grep for `../` and `packages/` in all configs |
| **Forage service binding wiring**     | Medium — Forage deploys but calls fail   | Test Zephyr + Lumen service bindings end-to-end before going live  |
| **Git history fragmentation**         | Medium — blame/log harder to trace       | `git log --follow` still works; accept trade-off                   |
| **Foliage/Gossamer import conflicts** | Medium — existing code vs imported code  | Reconcile carefully in Phase 2; engine foliage re-exports          |
| **npm publish pipeline break**        | Medium — can't release engine            | Verify publish workflow uses correct new path                      |
| **Stale path references in docs**     | Low — confusion but no breakage          | Global search for `packages/` after migration                      |

---

## What NOT to Do in This Migration

1. **Do NOT rename the npm package** (`@autumnsgrove/groveengine` → `@groveplace/lattice`). That's a separate effort with its own blast radius.
2. **Do NOT restructure the engine's internal `src/lib/` layout.** Only its location in the monorepo changes.
3. **Do NOT change package names** in `package.json` files. Only locations change.
4. **Do NOT refactor imports** from `@autumnsgrove/groveengine` to anything else.
5. **Do NOT update Cloudflare project names** or resource IDs. Those are infrastructure, not code organization.

---

## Verification Checklist

After Phase 1 (restructure + tooling):

- [ ] `pnpm install` succeeds
- [ ] `pnpm -r run build` succeeds for all packages
- [ ] `pnpm -r run check` succeeds (TypeScript)
- [ ] `pnpm -r run test:run` passes
- [ ] `gw context` reports correct packages (not zero)
- [ ] `gw packages list` shows correct paths under new directories
- [ ] `gf --agent search "test"` still finds files correctly
- [ ] `gf --agent impact libs/engine/src/lib/ui/GlassCard.svelte` resolves correctly (not empty)
- [ ] `gf --agent migrations` finds D1 migrations in new paths
- [ ] gf Go binaries rebuilt for all 4 platforms and committed
- [ ] No remaining references to `packages/` in workspace config
- [ ] All deploy workflows point to new paths

After Phase 2 (imports):

- [ ] Each imported package builds independently
- [ ] Engine can import from Foliage and Gossamer
- [ ] Forage worker type-checks
- [ ] Shutter library type-checks and exports work
- [ ] No circular dependencies

After Phase 3 (docs):

- [ ] `AGENT.md` reflects new structure
- [ ] `project-organization.md` updated
- [ ] No stale `packages/` references in docs
- [ ] `CLAUDE.md` examples use correct paths
- [ ] `CONTRIBUTING.md` dev setup paths updated

---

## Execution Notes

- **Do Phase 1 as a single atomic commit.** This includes the directory moves (1.1–1.6), config updates (1.7–1.12), **and** the gw/gf tooling fixes + binary rebuild (1.13–1.14). Moving packages without updating the tools that scan them creates a broken-but-silent state.
- **Phase 2 can be one commit per import** (Foliage, Gossamer, Shutter, Forage separately). This keeps the blame history clean and makes rollback granular.
- **Phase 3 is safe to do incrementally.** Docs updates can land as follow-ups without breaking anything.
- **Test locally before pushing.** The full `pnpm install && pnpm -r run build && pnpm -r run check` cycle is non-negotiable. Also verify `gw context` and `gf --agent impact` return non-empty results.

---

_This plan restructures the house. The furniture (code) stays the same — it just finally has rooms instead of one big hallway._
