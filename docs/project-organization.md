# Grove Project Organization

> *Where everything lives and why.*

**Last Updated:** January 2026

This document defines how Grove's projects are organized—what lives in the monorepo, what gets its own repo, and what stays integrated versus external.

---

## Guiding Principles

1. **Minimize overhead** — Separate repos only when there's a clear benefit
2. **Follow the data** — If it shares a database, it probably shares a repo
3. **Consider the consumer** — Who uses this? Grove only, or external devs?
4. **Deployment lifecycle** — Can it deploy independently? Does it need to?

---

## The Monorepo: GroveEngine

Everything that powers the core Grove experience lives here.

```
GroveEngine/
├── packages/
│   └── engine/              # Lattice - the npm package
│       └── src/lib/
│           ├── ui/          # UI components (GlassCard, Logo, etc.)
│           ├── foliage/     # Theme system
│           ├── thorn/       # Content moderation
│           ├── songbird/    # Prompt injection protection
│           ├── rings/       # Analytics
│           ├── reeds/       # Comments
│           ├── shade/       # AI protection
│           ├── trails/      # Personal roadmaps
│           ├── wisp/        # Writing assistant
│           └── arbor/       # Admin panel components
├── landing/                 # grove.place marketing site
├── plant/                   # plant.grove.place (onboarding)
└── docs/                    # Documentation & specs
```

### Why These Stay Integrated

| Component | Reason |
|-----------|--------|
| **Foliage** | Tightly coupled to tier system, database schema |
| **Thorn** | Needs access to tenant context, moderation rules |
| **Songbird** | Shared utility pattern, not standalone |
| **Rings** | Embedded in admin dashboard |
| **Reeds** | Blog post feature, needs post context |
| **Shade** | Integrated robots.txt, meta tags, WAF |
| **Trails** | Route on each blog |
| **Wisp** | Lives in the editor |
| **Arbor** | Admin UI components |
| **Plant** | Shares D1 database, provisions tenants |
| **Landing** | Marketing site, same deployment pipeline |

---

## npm Package Strategy

### One Package, Multiple Exports

We maintain **one npm package** with modular exports:

```json
{
  "name": "@autumnsgrove/lattice",
  "exports": {
    ".": "./dist/index.js",
    "./ui": "./dist/ui/index.js",
    "./foliage": "./dist/foliage/index.js",
    "./thorn": "./dist/thorn/index.js",
    "./songbird": "./dist/songbird/index.js"
  }
}
```

**Usage:**
```typescript
import { GlassCard, Logo } from '@autumnsgrove/lattice/ui';
import { ThemeSelector, applyTheme } from '@autumnsgrove/lattice/foliage';
import { validateContent } from '@autumnsgrove/lattice/thorn';
import { detectInjection } from '@autumnsgrove/lattice/songbird';
```

### Why Not Multiple Packages?

We consolidated from two packages (engine + UI) to one because:

1. **Primary consumer is Grove** — Not building for external devs
2. **Tight coupling** — Shared database schema, tier system, auth
3. **Overhead is real** — Each package needs CI/CD, changelogs, version coordination
4. **"Which package?"** — Confusion about where things live

### When to Separate

Only create a separate npm package if:
- Truly reusable outside Grove ecosystem
- External consumers want to use it
- Needs independent versioning
- No coupling to Grove internals

*Currently: nothing meets these criteria.*

---

## Separate Repositories: Grove Services

These are independent services with their own deployment lifecycle, but exclusively serve Grove:

| Public Name | Internal | Domain | Repo | Why Separate |
|-------------|----------|--------|------|--------------|
| **Heartwood** | GroveAuth | heartwood.grove.place | AutumnsGrove/GroveAuth | Central auth, Cloudflare Workers |
| **Meadow** | GroveSocial | meadow.grove.place | AutumnsGrove/GroveSocial | Own app, own database |
| **Clearing** | GroveClear | status.grove.place | AutumnsGrove/GroveClear | Status page, independent |
| **Vista** | GroveMonitor | vista.grove.place | AutumnsGrove/GroveMonitor | Observability, internal |
| **Patina** | GrovePatina | *(internal)* | AutumnsGrove/Patina | Backup service |
| **Bloom** | GroveBloom | bloom.grove.place | AutumnsGrove/GroveBloom | VPS orchestration (Hetzner) |
| **Mycelium** | GroveMCP | mycelium.grove.place | AutumnsGrove/GroveMCP | MCP server, Durable Objects |
| **Ivy** | GroveMail | ivy.grove.place | AutumnsGrove/Ivy | Email client |
| **Amber** | GroveStorage | amber.grove.place | AutumnsGrove/Amber | Storage dashboard |

### Why These Get Own Repos

- **Different infrastructure** — Workers vs SvelteKit vs Python
- **Independent deployments** — Can update without touching engine
- **Separate databases** — Don't share D1 with engine
- **Different teams** — Could be maintained separately
- **Security boundaries** — Auth should be isolated

---

## Separate Repositories: Standalone Products

Products that could exist independently of Grove:

| Public Name | Domain | Repo | Notes |
|-------------|--------|------|-------|
| **Forage** | forage.grove.place | AutumnsGrove/Forage | Domain discovery tool |
| **CDN Uploader** | *(CLI)* | AutumnsGrove/CDNUploader | CLI tool, standalone |
| **Nook** | nook.grove.place | AutumnsGrove/Nook | Private video sharing |
| **Outpost** | mc.grove.place | AutumnsGrove/GroveMC | Minecraft server |

---

## Beyond the Grove: Truly External

Self-hostable, open source, independent projects:

| Public Name | Internal | Domain | Repo | Stack |
|-------------|----------|--------|------|-------|
| **Aria** | GroveMusic | aria.grove.place | AutumnsGrove/GroveMusic | Python + SvelteKit |
| **Trove** | TreasureTrove | trove.grove.place | AutumnsGrove/TreasureTrove | Python + SvelteKit |
| **The Daily Clearing** | AgenticNewspaper | daily.grove.place | AutumnsGrove/AgenticNewspaper | Python + Workers |
| **Scout** | GroveScout | scout.grove.place | AutumnsGrove/GroveScout | Python + TypeScript |

**Philosophy:** "Run them yourself, or let Grove host them for a small fee."

These are designed to be:
- Fully self-hostable
- Open source (AGPL-3.0)
- Independent of Grove infrastructure
- Useful even without a Grove account

---

## Visual Summary

```
┌─────────────────────────────────────────────────────────────┐
│                    GroveEngine (Monorepo)                    │
├─────────────────────────────────────────────────────────────┤
│  packages/engine/     │  landing/        │  plant/          │
│  └── @autumnsgrove/   │  grove.place     │  plant.grove.    │
│      lattice          │  marketing       │  place           │
│      ├── /ui          │                  │  onboarding      │
│      ├── /foliage     │                  │                  │
│      ├── /thorn       │                  │                  │
│      ├── /songbird    │                  │                  │
│      └── /...         │                  │                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   Grove Services (Own Repos)                 │
├─────────────────────────────────────────────────────────────┤
│  GroveAuth    │  GroveSocial  │  GroveClear  │  GroveBloom  │
│  (Heartwood)  │  (Meadow)     │  (Clearing)  │  (Bloom)     │
├───────────────┼───────────────┼──────────────┼──────────────┤
│  GroveMCP     │  Ivy          │  Amber       │  Patina      │
│  (Mycelium)   │  (Email)      │  (Storage)   │  (Backups)   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                Standalone Products (Own Repos)               │
├─────────────────────────────────────────────────────────────┤
│  Forage       │  Nook         │  Outpost     │  CDN         │
│  (Domains)    │  (Video)      │  (Minecraft) │  Uploader    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              Beyond the Grove (Self-Hostable)                │
├─────────────────────────────────────────────────────────────┤
│  Aria         │  Trove        │  Daily       │  Scout       │
│  (Music)      │  (Library)    │  Clearing    │  (Shopping)  │
└─────────────────────────────────────────────────────────────┘
```

---

## Decision Checklist

When deciding where something should live:

### Should it be in the monorepo?

- [ ] Does it share the D1 database with the engine?
- [ ] Does it import from `@autumnsgrove/lattice`?
- [ ] Is the primary consumer Grove itself?
- [ ] Would schema changes require coordinated deploys?

**If yes to 2+:** Keep in monorepo.

### Should it be a separate export path?

- [ ] Is it a distinct feature area (themes, moderation, etc.)?
- [ ] Could someone import just this part?
- [ ] Is it logically separable but not deployable alone?

**If yes:** Add as export path (`lattice/foliage`).

### Should it be a separate npm package?

- [ ] Is it truly reusable outside Grove?
- [ ] Do external developers want to use it?
- [ ] Does it need independent versioning?
- [ ] Is it decoupled from Grove internals?

**If yes to ALL:** Consider separate package. Otherwise, no.

### Should it be a separate repo?

- [ ] Does it have different infrastructure (Workers vs SvelteKit)?
- [ ] Can it deploy independently without breaking Grove?
- [ ] Does it have its own database?
- [ ] Is there a security reason to isolate it?

**If yes to 2+:** Separate repo.

---

## Naming Reference

| Public Name | Internal Name | Location |
|-------------|---------------|----------|
| Lattice | GroveEngine | packages/engine |
| Plant | Seedbed | plant/ |
| Foliage | GroveThemes | packages/engine/src/lib/foliage |
| Thorn | GroveThorn | packages/engine/src/lib/thorn |
| Songbird | GroveSongbird | packages/engine/src/lib/songbird |
| Rings | GroveAnalytics | packages/engine/src/lib/rings |
| Reeds | GroveReeds | packages/engine/src/lib/reeds |
| Shade | GroveShade | packages/engine/src/lib/shade |
| Trails | GroveTrails | packages/engine/src/lib/trails |
| Wisp | GroveWisp | packages/engine/src/lib/wisp |
| Arbor | GroveArbor | packages/engine/src/lib/arbor |
| Heartwood | GroveAuth | AutumnsGrove/GroveAuth |
| Meadow | GroveSocial | AutumnsGrove/GroveSocial |
| Bloom | GroveBloom | AutumnsGrove/GroveBloom |
| Mycelium | GroveMCP | AutumnsGrove/GroveMCP |
| Ivy | GroveMail | AutumnsGrove/Ivy |
| Amber | GroveStorage | AutumnsGrove/Amber |
| Vista | GroveMonitor | AutumnsGrove/GroveMonitor |
| Clearing | GroveClear | AutumnsGrove/GroveClear |
| Patina | GrovePatina | AutumnsGrove/Patina |
| Forage | GroveDomainTool | AutumnsGrove/Forage |
| Nook | GroveNook | AutumnsGrove/Nook |
| Outpost | GroveMC | AutumnsGrove/GroveMC |
| Aria | GroveMusic | AutumnsGrove/GroveMusic |
| Trove | TreasureTrove | AutumnsGrove/TreasureTrove |
| The Daily Clearing | AgenticNewspaper | AutumnsGrove/AgenticNewspaper |
| Scout | GroveScout | AutumnsGrove/GroveScout |

---

## Migration: Rename Engine to Lattice

The npm package should be renamed from `@autumnsgrove/groveengine` to `@groveplace/lattice` — matching the domain `grove.place` and the public product name "Lattice".

### Why Rename?

- **Domain match** — `@groveplace` matches `grove.place`
- **Consistency** — Public name is "Lattice", internal is "GroveEngine"
- **Clarity** — Imports like `@groveplace/lattice/ui` are clean and professional
- **Branding** — Clear ownership, memorable package name

### Prerequisites

#### Create the npm Organization

1. Go to https://www.npmjs.com/org/create
2. Create organization named `groveplace`
3. Organizations are free for public packages

### Step-by-Step Migration

#### 1. Update the Engine Package

```bash
# packages/engine/package.json
```

Change:
```json
{
  "name": "@autumnsgrove/groveengine",
  ...
}
```

To:
```json
{
  "name": "@groveplace/lattice",
  ...
}
```

#### 2. Update All Import Statements

Search and replace across the entire codebase:

| Find | Replace |
|------|---------|
| `@autumnsgrove/groveengine` | `@groveplace/lattice` |

**Files to check:**
- `landing/package.json` (dependency)
- `plant/package.json` (dependency)
- All `.svelte` and `.ts` files with imports
- Any `tsconfig.json` paths
- Documentation files

#### 3. Update Workspace References

```bash
# In landing/package.json and plant/package.json
```

Change:
```json
{
  "dependencies": {
    "@autumnsgrove/groveengine": "workspace:*"
  }
}
```

To:
```json
{
  "dependencies": {
    "@groveplace/lattice": "workspace:*"
  }
}
```

#### 4. Run Search to Find All References

```bash
# Find all references to the old name
grep -r "groveengine" --include="*.json" --include="*.ts" --include="*.svelte" --include="*.md"
grep -r "autumnsgrove" --include="*.json" --include="*.ts" --include="*.svelte"
```

#### 5. Update pnpm Workspace

If using pnpm workspaces, update any workspace protocol references.

#### 6. Reinstall Dependencies

```bash
pnpm install
```

#### 7. Test the Build

```bash
pnpm build
pnpm check
```

#### 8. Publish to npm

```bash
# Publish new package under new org
cd packages/engine
npm publish --access public
```

If the old package was published:
```bash
# Deprecate old package pointing to new name
npm deprecate @autumnsgrove/groveengine "Moved to @groveplace/lattice"
```

### Checklist

- [ ] Create `groveplace` organization on npm
- [ ] Update `packages/engine/package.json` name to `@groveplace/lattice`
- [ ] Update `landing/package.json` dependency
- [ ] Update `plant/package.json` dependency
- [ ] Search/replace all imports in `.svelte` files
- [ ] Search/replace all imports in `.ts` files
- [ ] Update any documentation references
- [ ] Run `pnpm install`
- [ ] Run `pnpm build` and verify no errors
- [ ] Run `pnpm check` for type checking
- [ ] Test landing site locally
- [ ] Test plant site locally
- [ ] Publish to npm under `@groveplace`
- [ ] Deprecate old `@autumnsgrove/groveengine` if it existed
- [ ] Commit with message: `refactor: migrate to @groveplace/lattice`

### Export Path Structure (Post-Rename)

After renaming, the package exports should look like:

```json
{
  "name": "@groveplace/lattice",
  "exports": {
    ".": "./dist/index.js",
    "./ui": "./dist/ui/index.js",
    "./ui/nature": "./dist/ui/nature/index.js",
    "./ui/glass": "./dist/ui/glass/index.js",
    "./foliage": "./dist/foliage/index.js",
    "./thorn": "./dist/thorn/index.js",
    "./songbird": "./dist/songbird/index.js",
    "./services": "./dist/services/index.js"
  }
}
```

**Example imports after migration:**

```typescript
// UI components
import { GlassCard, Logo } from '@groveplace/lattice/ui';
import { FallingLeaves, Lantern } from '@groveplace/lattice/ui/nature';

// Feature modules
import { ThemeSelector, applyTheme } from '@groveplace/lattice/foliage';
import { validateContent } from '@groveplace/lattice/thorn';
import { detectInjection } from '@groveplace/lattice/songbird';

// Services
import { db, auth } from '@groveplace/lattice/services';
```

### Future Packages

With the `@groveplace` org, you can publish additional packages:

| Package | Purpose |
|---------|---------|
| `@groveplace/lattice` | Core engine (UI, themes, services) |
| `@groveplace/heartwood` | Auth utilities (if needed externally) |
| `@groveplace/foliage` | Theme package (if extracted later) |

---

*This document is the source of truth for where things live. When in doubt, default to the monorepo—extract later if needed.*
