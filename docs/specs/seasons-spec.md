---
title: "Seasons — Versioning System"
description: "Semantic versioning strategy, release workflow, and deployment propagation for the Grove package ecosystem."
category: specs
specCategory: reference
icon: tag
lastUpdated: "2026-02-25"
aliases: []
date created: Tuesday, November 26th 2025
date modified: Tuesday, February 25th 2026
tags:
  - versioning
  - npm
  - semver
  - releases
type: tech-spec
---

# Seasons — Versioning System

```
                    🌸 Spring 🌞 Summer 🍂 Autumn ❄️ Winter

                    .  *  .    .  *  .
                 .      ╭───────╮      .
                *     ╭─┤ 2.0.0 ├─╮     *
               .    ╭─┤ │       │ ├─╮    .
                  ╭─┤ │ │ 1.0.0 │ │ ├─╮
                 ┌┤ │ │ │       │ │ │ ├┐
                 │├─┤ │ │ 0.x.x │ │ │─┤│
                 ││││ │ │       │ │ │ │││
                 ││││ │ │  🌱   │ │ │ │││
                 └┴┴┴─┴─┴───────┴─┴─┴─┴┘
                ╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱
             ────────────────────────────

                 Each ring records a season.
                 Growth in plenty, resilience through hardship.
```

> _Each ring records a season—growth in plenty, resilience through hardship._

Seasons is Grove's versioning system: how Lattice evolves, how releases propagate, how the ecosystem grows through breaking changes and gentle improvements alike.

> **Note:** Not to be confused with the seasonal UI theming system (`seasonStore` in `libs/engine/src/lib/ui/`) — that system handles spring/summer/autumn/winter visual themes for wanderers. This spec covers package versioning.

**Public Name:** Seasons
**Internal Name:** GroveSeasons
**Package:** `@autumnsgrove/lattice`
**Version:** 1.0.0 (stable)
**Registry:** GitHub Packages (`npm.pkg.github.com`)
**License:** AGPL-3.0-only

---

## Overview

Lattice follows [Semantic Versioning 2.0.0](https://semver.org/) for all releases. Grove operates as a single **multi-tenant deployment** — all tenants share one `grove-lattice` Cloudflare Pages deployment, routed via `grove-router` (Passage) at `*.grove.place`. When a new version ships, every grove gets the update simultaneously.

This document defines how versions are managed, how releases are published, and how the package ecosystem grows.

---

## Semantic Versioning Strategy

Version format: `MAJOR.MINOR.PATCH` (e.g., `1.2.3`)

```
            MAJOR  .  MINOR  .  PATCH
               │        │        │
               │        │        │
        ┌──────┴──────┐ │ ┌──────┴──────┐
        │             │ │ │             │
        ▼             │ │ │             ▼
   ╔═════════════╗    │ │ │    ╔═════════════╗
   ║  BREAKING   ║    │ │ │    ║  BUG FIXES  ║
   ║   CHANGES   ║    │ │ │    ║  Security   ║
   ║             ║    │ │ │    ║  patches    ║
   ║  🚨 Action  ║    │ │ │    ║             ║
   ║   required  ║    │ │ │    ║  ✓ Safe to  ║
   ╚═════════════╝    │ │ │    ║   auto-     ║
                      │ │ │    ║   update    ║
                      │ │ │    ╚═════════════╝
                      │ │ │
                 ┌────┴─┴─┴────┐
                 │             │
                 ▼             │
            ╔═════════════╗    │
            ║    NEW      ║    │
            ║  FEATURES   ║    │
            ║             ║    │
            ║  Backwards- ║    │
            ║  compatible ║    │
            ║             ║    │
            ║  ✓ Safe to  ║    │
            ║   auto-     ║    │
            ║   update    ║    │
            ╚═════════════╝────┘

          Example:  2 . 4 . 1
                    │   │   │
                    │   │   └── Bug fix #1
                    │   └────── 4th feature set
                    └────────── 2nd breaking change era
```

### MAJOR Version Changes

Increment MAJOR when making **incompatible API changes** that require action:

- Breaking changes to component props or APIs
- Removal of exported functions, types, or components
- Database schema changes requiring migrations with data transformation
- Changes to required Cloudflare bindings
- Renamed exports without backwards compatibility

**Examples:**

- Loom SDK removes `LoomDO.onAlarm()` callback signature
- Heartwood auth flow changes required session cookie format
- Drizzle schema migration renames a column in `tenants` table
- KV binding renamed from `KV` to `GROVE_CACHE`

### MINOR Version Changes

Increment MINOR when adding **backwards-compatible functionality**:

- New components added to the library
- New optional props on existing components
- New utility functions or server helpers
- New database tables (non-breaking migrations)
- New features that don't affect existing APIs

**Examples:**

- New Blazes content markers system added
- Amber SDK adds optional `quotaManager` to storage context
- New `formatRelativeDate()` utility function
- New `storageAddons` table added via migration

### PATCH Version Changes

Increment PATCH for **backwards-compatible bug fixes**:

- Bug fixes in existing components
- Security patches
- Performance improvements
- Style/CSS fixes
- Documentation corrections
- Dependency updates (non-breaking)

**Examples:**

- Fix XSS vulnerability in markdown renderer
- Fix Svelte 5 rune reactivity in `seasonStore`
- Improve Loom DO query performance
- Update Tailwind CSS peer dependency

---

## Package Landscape

Grove's monorepo contains five publishable packages at different maturity stages:

| Package | Version | Location | Status | Description |
|---------|---------|----------|--------|-------------|
| `@autumnsgrove/lattice` | **1.0.0** | `libs/engine` | Published (GitHub Packages) | Core framework — UI, auth, Loom, Lumen, email |
| `@autumnsgrove/server-sdk` | 0.1.0 | `libs/server-sdk` | Workspace only | Infra SDK — GroveDatabase, GroveStorage, GroveKV |
| `@autumnsgrove/foliage` | 0.1.0 | `libs/foliage` | Workspace only | Theme system and visual customization |
| `@autumnsgrove/gossamer` | 0.2.0 | `libs/gossamer` | Workspace only | ASCII visual effects for Glass UI |

Only `@autumnsgrove/lattice` currently publishes to GitHub Packages. The remaining packages use `workspace:*` references and are consumed within the monorepo. They may be published independently as they mature.

Private apps (`apps/*`), services (`services/*`), and workers (`workers/*`) are deployed directly — they don't follow this versioning spec.

---

## Pre-release Versions

### Lattice (v1.0.0 Stable)

Lattice has graduated past the `0.x.x` development phase. Version 1.0.0 signals a stable API contract: MAJOR bumps for breaking changes, MINOR for features, PATCH for fixes.

### Secondary Packages (0.x.x Development)

Packages still in `0.x.x` (server-sdk, foliage, gossamer, vineyard) follow relaxed semver: MINOR bumps may include breaking changes during initial development.

```
Development Phase:

    0.1.0 ──▶ 0.2.0 ──▶ 0.3.0 ──▶ ... ──▶ 0.9.0 ──▶ 1.0.0
      │         │         │                 │         │
      🌱        🌱        🌱                🌱        🌳
   seedling  seedling  seedling          ready     STABLE!
    growth    growth    growth          to bloom
```

### Beta Releases

Use `-beta.x` suffix for testing before stable releases:

```
1.2.0-beta.1  - First beta of v1.2.0
1.2.0-beta.2  - Second beta with fixes
1.2.0-beta.3  - Release candidate
1.2.0         - Stable release
```

**When to use beta:**

- Major new features that need testing
- Database migrations that affect existing data
- Significant UI/UX changes
- Performance improvements needing validation

### Alpha Releases

Use `-alpha.x` suffix for early experimental features:

```
2.0.0-alpha.1  - Early preview of v2
```

---

## Release Workflow

### How Releases Actually Work

Releases follow a two-stage process: automated tagging and snapshotting via CI, then manual publishing to the registry.

```
    ┌─────────────────┐
    │ 1. Bump version │   libs/engine/package.json
    │    in code      │   Update CHANGELOG.md
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ 2. Merge to     │   PR review + merge
    │    main         │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ 3. auto-tag.yml │   Detects version change
    │    fires        │   Creates annotated git tag (vX.Y.Z)
    │                 │   Generates repository snapshot
    │                 │   AI release summary via OpenRouter
    │                 │   Calculates package size
    │                 │   Syncs to landing page
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ 4. Manual       │   pnpm publish (from libs/engine)
    │    publish      │   → GitHub Packages
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ 5. All tenants  │   Single deployment
    │    updated      │   grove-lattice on Cloudflare Pages
    └─────────────────┘
```

### Step-by-Step

```bash
# 1. Update version in libs/engine/package.json
# 2. Update CHANGELOG.md with release notes
# 3. Commit and push to main (or merge PR)

# auto-tag.yml runs automatically on push to main
# when libs/engine/package.json version changes

# 4. Publish to GitHub Packages (manual)
cd libs/engine
pnpm publish

# 5. Deploy (if not already deployed via CI)
# The Cloudflare Pages deployment picks up the new build
```

### Auto-Tag Workflow (`.github/workflows/auto-tag.yml`)

When a version bump lands on `main`, the `auto-tag.yml` workflow:

1. **Detects** the version change by comparing `libs/engine/package.json` with the previous commit
2. **Creates** an annotated git tag (`vX.Y.Z`) with release metadata
3. **Generates** a repository snapshot appended to `snapshots/history.csv` (46+ versions tracked)
4. **Produces** an AI release summary via OpenRouter (stored alongside the snapshot)
5. **Calculates** package size (tarball + unpacked bytes)
6. **Runs** documentation keyword analysis
7. **Syncs** release data to the landing page

The workflow also supports manual triggers for force-snapshotting and backfilling historical summaries.

### Pre-release Publishing

```bash
# Beta release from libs/engine
pnpm version prerelease --preid=beta  # 1.2.0 -> 1.2.1-beta.0
pnpm publish --tag beta
```

---

## Deployment & Propagation

### Multi-Tenant Model

Grove operates as a **single multi-tenant deployment**. There are no per-customer repositories, no Renovate bot, no customer PRs.

```
    ┌─────────────────┐
    │  grove-lattice   │   Single Cloudflare Pages deployment
    │  (all tenants)   │
    └────────┬─────────┘
             │
    ┌────────┼─────────────────────────┐
    │        │                         │
    ▼        ▼                         ▼
  alice.     bob.                   carol.
  grove.     grove.                grove.
  place      place                 place
```

**How updates reach tenants:**

1. New version merges to `main`
2. CI builds and deploys `grove-lattice` to Cloudflare Pages
3. `grove-router` (Passage) routes all `*.grove.place` subdomains to the single deployment
4. Every tenant is running the new version immediately — no opt-in, no lag

This means breaking changes must be handled with extra care (see Breaking Change Protocol below), since there's no gradual rollout window.

> **Historical note:** An earlier architecture envisioned per-customer GitHub repos with Renovate-powered auto-updates. That model was never built. See `customer-repo-spec.md` for the original design if curious.

---

## Breaking Change Protocol

When a breaking change is necessary:

### 1. Document in CHANGELOG

```markdown
## [2.0.0] - 2026-XX-XX

### BREAKING CHANGES

- **Loom SDK**: `LoomDO.onAlarm()` signature changed to accept `AlarmContext`
  - Migration: Update DO subclasses to use new callback shape

- **Database**: `tenants` table renamed `slug` to `handle`
  - Migration: Run schema migration 095
```

### 2. Provide Migration Guide

Create a migration guide in the release notes:

````markdown
## Migrating to v2.0.0

### Step 1: Update Loom DO subclasses

Find and replace in your Durable Objects:

```typescript
// Before
onAlarm(): Promise<void>

// After
onAlarm(ctx: AlarmContext): Promise<void>
```

### Step 2: Run database migration

```bash
wrangler d1 execute grove-engine-db --command "ALTER TABLE tenants RENAME COLUMN slug TO handle;"
```
````

### Step 3: Build and test

```bash
pnpm build
pnpm test
```

### 3. Consider Deprecation Period

For non-critical changes, provide a deprecation period:

```typescript
// v1.9.0 - Deprecate old API
/** @deprecated Use `handle` prop instead. Will be removed in v2.0.0 */
let slug = $derived(handle);

// v2.0.0 - Remove deprecated API
// slug removed entirely
```

Since all tenants update simultaneously in multi-tenant mode, deprecation periods are primarily for **internal consumers** (apps, services, workers) that import from the engine. Give subsystem maintainers time to migrate before removing deprecated APIs.

---

## Changelog Management

### CHANGELOG.md Format

Follow [Keep a Changelog](https://keepachangelog.com/) format:

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- New feature being developed

## [1.0.0] - 2026-01-XX

### Added

- Loom Durable Objects SDK
- Amber storage management
- Blazes content markers
- Infra SDK integration

### Changed

- Graduated to stable 1.0.0
```

### Categories

Use these categories in the changelog:

- **Added** - New features
- **Changed** - Changes in existing functionality
- **Deprecated** - Soon-to-be removed features
- **Removed** - Now removed features
- **Fixed** - Bug fixes
- **Security** - Vulnerability fixes

### AI Release Summaries

In addition to the manual CHANGELOG, the `auto-tag.yml` workflow generates AI-powered release summaries for each tagged version. These are stored in `snapshots/` and synced to the landing page. See `release-summaries-spec.md` for details on the summary generation pipeline.

---

## Registry Configuration

### GitHub Packages Setup

Lattice publishes to GitHub Packages under the `@autumnsgrove` scope.

**Engine `package.json` configuration:**

```json
{
  "name": "@autumnsgrove/lattice",
  "publishConfig": {
    "access": "public",
    "registry": "https://npm.pkg.github.com"
  }
}
```

**Authentication for publishing:**

Publishing requires a GitHub token with `write:packages` permission. The token is configured via:

1. Generate a Personal Access Token (classic) with `write:packages` scope
2. Authenticate: `npm login --registry=https://npm.pkg.github.com`
3. Or set `NODE_AUTH_TOKEN` in CI environment

**Authentication for consuming (if published externally):**

```bash
# .npmrc
@autumnsgrove:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

> Currently, all consumers are within the monorepo using `workspace:*` references, so registry auth is only needed for the publish step.

---

## Version Query Commands

### Check Current Version

```bash
# Local package version
cat libs/engine/package.json | grep '"version"'

# Check git tags
git tag --list 'v*' --sort=-version:refname | head -5

# View snapshot history
cat snapshots/history.csv | tail -5
```

### Check Published Version

```bash
# Published version on GitHub Packages
npm view @autumnsgrove/lattice version --registry=https://npm.pkg.github.com

# All published versions
npm view @autumnsgrove/lattice versions --json --registry=https://npm.pkg.github.com
```

### Check Workspace Dependencies

```bash
# List all workspace package versions
pnpm ls -r --depth 0 --json | jq '.[].name, .[].version'

# Check a specific package
pnpm ls @autumnsgrove/server-sdk -r
```

---

_Last Updated: February 2026_
