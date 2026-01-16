# GroveEngine File Reorganization Plan

> **Status**: ✅ COMPLETE
> **Created**: 2026-01-14
> **Completed**: 2026-01-16
> **Purpose**: Comprehensive guide for reorganizing the GroveEngine codebase structure

---

## Completion Summary

**All phases completed on 2026-01-16.** This document is now archived for historical reference.

### ✅ Phase 1: Quick Wins
- Deleted duplicate `docs/grove-sustainability.md`
- Renamed `_archived/` → `_deprecated/`
- Created README files for `_deprecated/` and `archives/`
- Renamed UPPERCASE docs to lowercase (LEMONSQUEEZY-SETUP.md → lemonsqueezy-setup.md, etc.)

### ✅ Phase 2: Documentation Restructure
- Created new directory structure (setup/, infrastructure/, design-system/, philosophy/naming-research/, developer/, plans/)
- Moved ~36 files from docs/ root to appropriate subdirectories
- Moved 54 files from docs/scratch/ to docs/philosophy/naming-research/
- Created docs/README.md and docs/plans/README.md

### ✅ Phase 3: Root Cleanup
- Moved PLAN.md → docs/plans/completed/payment-migration-stripe-to-lemonsqueezy.md
- Moved CHROME-*.md files to archives/ and docs/plans/
- Moved cloudflare-setup.md → docs/infrastructure/
- Moved cdn-index.html → assets/
- Deleted root plans/ directory

### ✅ Phase 4: Migration Numbering Fix
- Fixed 4 collision pairs in packages/engine/migrations/
- Renumbered all migrations to sequential 001-024

### ✅ Phase 5: App Directory Deduplication (commit `9b96872`)
- **Deleted ~130 duplicate files** from `landing/`, `clearing/`, and `meadow/`
- Removed duplicate nature component subdirectories from all apps
- Migrated apps to use `@autumnsgrove/groveengine` package exports
- Fixed import paths to use `ui/chrome` instead of `ui/components/chrome`
- Deleted unused `cn.ts` utility files across apps

### ✅ Phase 6: Structural Moves
- Moved `domains/` → `packages/domains/`
- Moved `clearing/`, `meadow/`, `plant/`, `landing/` → `packages/`
- Removed empty `vineyard/` directory
- Organized scripts/ into db/, deploy/, generate/, repo/ subdirectories
- Created scripts/README.md
- Simplified pnpm-workspace.yaml to `packages/*` glob
- Updated all GitHub workflows for new paths

### ✅ Legal Pages Consolidation (commit `eaba81f`)
- Moved legal pages into knowledge base at `/knowledge/legal/{slug}`
- Removed 6 hardcoded legal page routes (~1,197 lines deleted)

### ✅ Dependency Unification (2026-01-16)
- Unified `@cloudflare/workers-types` to `^4.20260116.0` across all packages
- Documented vitest version strategy (post-migrator stays at ^3.2.4 for @cloudflare/vitest-pool-workers compatibility)

---

## Overview

This document provides a complete migration plan for reorganizing the GroveEngine repository. An implementing agent should read this document in full, explore the referenced directories to understand current state, then execute the changes systematically.

**Goals:**
1. Eliminate duplicate code and documentation
2. Establish clear, consistent directory structure
3. Improve discoverability and maintainability
4. Standardize naming conventions

---

## Table of Contents

1. [Naming Conventions](#1-naming-conventions)
2. [Root-Level Files](#2-root-level-files)
3. [Packages Directory](#3-packages-directory)
4. [Documentation Structure](#4-documentation-structure)
5. [App Directories](#5-app-directories)
6. [Configuration Directories](#6-configuration-directories)
7. [Scripts Organization](#7-scripts-organization)
8. [Implementation Order](#8-implementation-order)

---

## 1. Naming Conventions

### Package Naming Standard

| Package | Current Name | Target Name | Scoped? |
|---------|--------------|-------------|---------|
| Engine (main) | `@autumnsgrove/groveengine` | `@autumnsgrove/groveengine` | YES (only one) |
| Durable Objects | `grove-durable-objects` | `grove-durable-objects` | No |
| Router | `grove-router` | `grove-router` | No |
| OG Worker | `grove-og` | `grove-og` | No |
| Post Migrator | `grove-post-migrator` | `grove-post-migrator` | No |

**Rule**: Only the main engine package uses the `@autumnsgrove/` scope. All other packages use the `grove-` prefix without scoping.

### Directory Naming Standard

- **Code directories**: CamelCase (e.g., `AgentUsage`, `UserContent`, `DurableObjects`)
- **Documentation directories**: lowercase with hyphens (e.g., `help-center`, `design-system`, `naming-research`)
- **Date-based paths**: kebab-case with YYYY-MM-DD (e.g., `archived-2026-01-14`)

**Clarification**: Use CamelCase for directories containing code or agent workflows. Use lowercase-with-hyphens for documentation-only directories within `docs/`.

### File Naming Standard

- **Markdown files**: lowercase with hyphens (e.g., `stripe-setup.md`, not `STRIPE-SETUP.md`)
- **Exception**: Project root files may use UPPERCASE (e.g., `README.md`, `CHANGELOG.md`, `TODOS.md`)

---

## 2. Root-Level Files

### Files to KEEP at Root (Essential)

These files are foundational and must remain at the repository root:

| File | Purpose | Action |
|------|---------|--------|
| `AGENT.md` | Primary agent instructions | Keep - essential |
| `CLAUDE.md` | Claude Code entry point | Keep - essential |
| `README.md` | Public project overview | Keep - essential |
| `CONTRIBUTING.md` | Contribution guidelines | Keep - essential |
| `CHANGELOG.md` | Version history | Keep - essential |
| `TODOS.md` | Active task tracking | Keep - essential |
| `COMPLETED.md` | Historical task reference | Keep - essential |
| `LICENSE` | Legal | Keep - essential |
| `package.json` | Monorepo root config | Keep - essential |
| `pnpm-workspace.yaml` | Workspace config | Keep - essential |
| `pnpm-lock.yaml` | Lock file | Keep - essential |
| `.gitignore` | Git config | Keep - essential |
| `.nvmrc` | Node version | Keep - essential |

### Files to MOVE from Root

| File | Current Location | New Location | Reason |
|------|------------------|--------------|--------|
| `PLAN.md` | Root | `docs/plans/completed/payment-migration-stripe-to-lemonsqueezy.md` | Completed migration plan |
| `CHROME-EXTRACTION-PLAN.md` | Root | `archives/chrome-extraction-plan-v1-superseded.md` | Superseded by V2 |
| `CHROME-MIGRATION-V2.md` | Root | `docs/plans/planned/chrome-migration-v2.md` | Ready for implementation |
| `CHROME-ROLLBACK-ANALYSIS.md` | Root | `archives/chrome-rollback-analysis-2026-01.md` | Post-mortem reference |
| `cloudflare-setup.md` | Root | `docs/infrastructure/cloudflare-setup.md` | Infrastructure reference |
| `icon-analysis.md` | Root | `docs/design-system/icon-standardization.md` | Design system reference |
| `cdn-index.html` | Root | `assets/cdn-index.html` | Asset file, not project doc |

### Files to DELETE from Root

| File | Reason |
|------|--------|
| None | All root files have a destination |

---

## 3. Packages Directory

### Current Structure Issues

> **Updated 2026-01-15**: Verified current collision state

1. **Migration numbering collisions**: Three collision pairs exist:
   - Two `010_*` migrations: `010_example_tenant_content.sql` and `010_update_tier_names.sql`
   - Two `014_*` migrations: `014_wisp.sql` and `014_wisp_settings.sql`
   - Two `018_*` migrations: `018_feature_flags.sql` and `018_storage_tier_indexes.sql`
2. **Missing documentation**: No `packages/README.md`, no `grove-router/README.md`
3. **TypeScript config drift**: Inconsistent targets and moduleResolution
4. **Confusing nested naming**: `lib/ui/components/ui/` should be `lib/ui/components/glass/`

### Migration Numbering Fix

**Location**: `packages/engine/migrations/`

**Step 1: Audit Current State (REQUIRED)**

Before renumbering, dynamically audit the migrations directory:

```bash
# List all migrations sorted by number prefix
ls -1 packages/engine/migrations/*.sql | sort -t'_' -k1 -n

# Find duplicates by prefix number
ls -1 packages/engine/migrations/*.sql | sed 's/.*\/\([0-9]*\)_.*/\1/' | sort | uniq -d
```

Document the actual collisions found before proceeding. The example below is based on exploration findings, but **verify current state first**.

**Step 2: Renumber to Eliminate Collisions**

Example renumbering (verify against audit results - updated 2026-01-15):

```
Current                              → New Name
# Fix 010_* collision first
010_example_tenant_content.sql       → 010_example_tenant_content.sql (keep)
010_update_tier_names.sql            → 011_update_tier_names.sql
011_* through 013_*                  → 012_* through 014_* (increment by 1)

# Then fix 014_* collision (now at 015)
015_wisp.sql                         → 015_wisp.sql (keep, was 014)
015_wisp_settings.sql                → 016_wisp_settings.sql
016_* through 018_*                  → 017_* through 019_* (increment by 1)

# Then fix 018_* collision (now at 020)
020_feature_flags.sql                → 020_feature_flags.sql (keep)
020_storage_tier_indexes.sql         → 021_storage_tier_indexes.sql
021_lemonsqueezy_migration.sql       → 022_lemonsqueezy_migration.sql
022_timeline_curio.sql               → 023_timeline_curio.sql
```

**Simpler approach**: Renumber ALL migrations starting from the first collision to avoid cascading renumbers. Work backwards from highest collision.

**Step 3: Use `git mv` for History**

```bash
# Preserve git history when renaming
git mv packages/engine/migrations/014_wisp_settings.sql packages/engine/migrations/015_wisp_settings.sql
```

**Step 4: Verify No Gaps After Renumbering**

```bash
# Extract all migration numbers and check for gaps
ls -1 packages/engine/migrations/*.sql | \
  sed 's/.*\/0*\([0-9]*\)_.*/\1/' | \
  sort -n | \
  awk 'NR>1 && $1!=prev+1 {print "Gap between " prev " and " $1} {prev=$1}'
```

Also check for duplicate `010_*` migrations and renumber if found.

### Documentation to Create

1. **Create `packages/README.md`**:
   - Package overview table (name, purpose, deployment target)
   - Dependency graph showing inter-package relationships
   - Development setup instructions
   - Deployment order (durable-objects → engine → workers)

2. **Create `packages/grove-router/README.md`**:
   - Purpose: Subdomain routing for *.grove.place
   - How routing decisions are made
   - Configuration options
   - Deployment instructions

### TypeScript Configuration

**Create `tsconfig.base.json` at repository root**:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

Update each package's `tsconfig.json` to extend this base config.

### Component Rename

**Rename for clarity**:
- `packages/engine/src/lib/ui/components/ui/` → `packages/engine/src/lib/ui/components/glass/`
- Update all imports referencing this path
- Update exports in `packages/engine/src/lib/ui/components/index.ts`

**⚠️ Breaking Change Warning**

This rename changes import paths. If the engine package is published to npm:

1. **Before renaming**: Check current published version (`npm view @autumnsgrove/groveengine version`)
2. **Add backward compatibility** (temporary):
   ```typescript
   // In packages/engine/src/lib/ui/components/index.ts
   // Re-export from new location with old name for transition period
   export * from './glass';
   export * as ui from './glass'; // Deprecated alias
   ```
3. **Bump minor version** after rename (breaking change = minor bump pre-1.0)
4. **Document in CHANGELOG.md** with migration instructions
5. **Remove deprecated alias** in next minor version

**If package is NOT yet published externally**: Skip backward compatibility, just rename.

---

## 4. Documentation Structure

### Current Issues

- 42 files at `docs/` root level (too many)
- Duplicate file: `docs/grove-sustainability.md` AND `docs/philosophy/grove-sustainability.md`
- Scattered planning docs: `plans/`, `docs/plans/`, and `PLAN.md` at root
- Scratch directory with 51 naming research files cluttering docs
- Inconsistent file naming (UPPERCASE vs lowercase)

### Target Structure

```
docs/
├── README.md                           [NEW - documentation index/guide]
│
├── setup/                              [NEW - configuration guides]
│   ├── stripe-setup.md                 [MOVED + RENAMED from STRIPE-SETUP.md]
│   ├── lemonsqueezy-setup.md           [MOVED + RENAMED from LEMONSQUEEZY-SETUP.md]
│   ├── release-summary-setup.md        [MOVED + RENAMED from RELEASE-SUMMARY-SETUP.md]
│   └── oauth-client-setup.md           [MOVED from root]
│
├── infrastructure/                     [NEW - infrastructure docs]
│   ├── cloudflare-setup.md             [MOVED from root]
│   └── cloudflare-architecture-guide.md [MOVED from docs root]
│
├── developer/                          [EXPAND existing]
│   ├── architecture/
│   │   ├── multi-tenant-architecture.md
│   │   └── diagrams.md                 [MOVED from docs root]
│   ├── database/
│   │   ├── d1-replication-analysis.md  [MOVED from docs root]
│   │   ├── d1-sessions-api-guide.md    [MOVED from docs root]
│   │   ├── d1-sessions-migration.md    [MOVED from docs root]
│   │   └── schema/
│   │       └── multi-tenant-schema.sql [MOVED from docs/schema/]
│   ├── integration/
│   │   ├── rings-analytics-do-integration.md [MOVED from docs root]
│   │   └── grove-ai-gateway-integration.md   [MOVED from docs root]
│   └── decisions/
│       ├── belongs-in-engine.md        [MOVED from docs root]
│       ├── site-specific-code.md       [MOVED from docs root]
│       └── project-organization.md     [MOVED from docs root]
│
├── design-system/                      [NEW - design documentation]
│   ├── icon-standardization.md         [MOVED from root icon-analysis.md]
│   ├── grove-product-standards.md      [MOVED from docs root]
│   └── grove-ui-patterns.md            [existing]
│
├── philosophy/                         [CONSOLIDATE]
│   ├── grove-naming.md                 [MOVED from docs root]
│   ├── grove-the-vision.md             [MOVED from docs root]
│   ├── grove-voice.md                  [existing]
│   ├── grove-sustainability.md         [existing - DELETE duplicate at docs root]
│   ├── walking-through-the-grove.md    [existing]
│   └── naming-research/                [NEW - archive exploratory work]
│       ├── README.md                   [NEW - explains this is archived research]
│       └── [51 files from scratch/]    [MOVED from docs/scratch/]
│
├── plans/                              [RESTRUCTURE]
│   ├── README.md                       [NEW - explains planning workflow]
│   ├── planning/                       [NEW - active work in progress]
│   │   ├── sentinel-threshold-integration-plan.md [MOVED from /plans/]
│   │   └── threshold-engine-integration.md        [MOVED from /plans/]
│   ├── planned/                        [NEW - ready for implementation]
│   │   ├── chrome-migration-v2.md      [MOVED from root]
│   │   ├── heartwood-to-better-auth-migration.md [existing in docs/plans]
│   │   ├── jxl-migration-spec.md       [existing in docs/plans]
│   │   ├── blog-post-optimization-roadmap.md     [existing in docs/plans]
│   │   └── feature-flags-expansion-roadmap.md    [existing in docs/plans]
│   └── completed/                      [NEW - finished plans for reference]
│       ├── payment-migration-stripe-to-lemonsqueezy.md [MOVED from root PLAN.md]
│       ├── feature-flags-spec.md       [existing in docs/plans - if implemented]
│       └── tier-centralization.md      [existing in docs/plans - if implemented]
│
├── specs/                              [KEEP - well organized]
├── patterns/                           [KEEP - well organized]
├── help-center/                        [KEEP - well organized]
├── guides/                             [KEEP]
├── marketing/                          [KEEP]
├── security/                           [KEEP]
├── legal/                              [KEEP]
├── internal/                           [REORGANIZE]
│   ├── business/
│   │   └── development-expenses.md     [MOVED from docs/business/]
│   ├── email/                          [existing]
│   └── communications/                 [existing]
└── templates/                          [KEEP]
```

### Files to DELETE (Duplicates)

| File | Reason |
|------|--------|
| `docs/grove-sustainability.md` | Duplicate of `docs/philosophy/grove-sustainability.md` |

### Directories to DELETE (After Moving Contents)

| Directory | Action |
|-----------|--------|
| `docs/scratch/` | Move 51 files to `docs/philosophy/naming-research/`, then delete |
| `docs/business/` | Move to `docs/internal/business/`, then delete |
| `docs/schema/` | Move to `docs/developer/database/schema/`, then delete |
| `docs/concepts/` | Move to `docs/marketing/concepts/`, then delete |
| `docs/migrations/` | Move to `docs/plans/completed/`, then delete |
| `/plans/` (root) | Move 2 files to `docs/plans/planning/`, then delete |

### Documentation README to Create

**Create `docs/README.md`**:

```markdown
# GroveEngine Documentation

This directory contains all project documentation organized by audience and purpose.

## Directory Structure

| Directory | Audience | Purpose |
|-----------|----------|---------|
| `setup/` | Developers | Configuration and setup guides |
| `infrastructure/` | DevOps | Cloud infrastructure documentation |
| `developer/` | Engineers | Architecture, database, integration docs |
| `design-system/` | Designers/Frontend | UI patterns, icons, standards |
| `philosophy/` | Everyone | Project vision, voice, naming |
| `plans/` | Team | Planning workflow (planning → planned → completed) |
| `specs/` | Engineers | Technical specifications |
| `patterns/` | Engineers | Architectural patterns |
| `help-center/` | Users | End-user help articles |
| `guides/` | Various | Implementation guides |
| `marketing/` | Marketing | Marketing materials |
| `security/` | Security | Security documentation |
| `legal/` | Legal | Policies and terms |
| `internal/` | Team | Internal communications |

## Plans Workflow

Documentation moves through the planning pipeline:

1. **`plans/planning/`** - Active work in progress, being researched/designed
2. **`plans/planned/`** - Ready for implementation, fully specified
3. **`plans/completed/`** - Implemented, kept for historical reference

## Adding New Documentation

- User-facing content → `help-center/articles/`
- Technical specs → `specs/`
- Architecture decisions → `developer/decisions/`
- Setup guides → `setup/`
```

**Create `docs/plans/README.md`**:

```markdown
# Planning Documents

This directory organizes planning documentation through its lifecycle.

## Workflow

```
planning/ ──→ planned/ ──→ completed/
   ↑            ↑            ↑
   │            │            │
 Active      Ready for    Implemented
 research    implementation
```

## Directories

### `planning/`
Documents actively being researched or designed. May be incomplete or have open questions.

### `planned/`
Fully specified documents ready for implementation. All questions resolved, implementation approach defined.

### `completed/`
Implemented plans kept for historical reference. Useful for understanding past decisions.

## Moving Documents

When a plan is ready for implementation:
1. Review for completeness
2. Move from `planning/` to `planned/`
3. Update any cross-references

When implementation is complete:
1. Move from `planned/` to `completed/`
2. Add completion date to document header
3. Link to relevant code/PRs if applicable
```

---

## 5. App Directories

### ✅ COMPLETED: Remove Duplicate Nature Components

> **Status**: DONE (commit `9b96872` on 2026-01-14)
>
> This section documents what was completed. The ~130 duplicate nature component files were deleted from `landing/`, `meadow/`, and `clearing/`. Apps now import from `@autumnsgrove/groveengine`.

**Original Issue**: `landing/` and `meadow/` both contained identical copies of ~200 nature component files. These are already available in the `@autumnsgrove/groveengine` package.

**⚠️ VERIFICATION REQUIRED BEFORE DELETION**

Before deleting any local components, verify the engine package exports them correctly:

```bash
# Step 1: Check engine package exports
grep -r "export.*from.*nature" packages/engine/src/lib/ui/index.ts
grep -r "export.*from.*nature" packages/engine/src/lib/index.ts

# Step 2: Create a test file to verify imports work
cat > /tmp/test-import.ts << 'EOF'
// Test that nature components are exported from engine
import {
  // Try importing a few key components
  Sun, Moon, Cloud, Tree, Flower, Bird
} from '@autumnsgrove/groveengine/ui/nature';
console.log('Imports work:', { Sun, Moon, Cloud, Tree, Flower, Bird });
EOF

# Step 3: Attempt to compile (from landing/ directory)
cd landing && npx tsc --noEmit /tmp/test-import.ts

# Step 4: Runtime verification (run from project root)
cd packages/engine && pnpm build
node -e "const m = require('./dist/ui/nature'); console.log('Exports:', Object.keys(m).length, 'components')"
```

**Only proceed with deletion if BOTH compile-time AND runtime verification pass.**

**Action for `landing/src/lib/components/nature/`**: ✅ COMPLETED

1. ~~**VERIFY** engine package exports work (steps above)~~ ✅ Done
2. ~~**DELETE these subdirectories** (using `git rm -r` to preserve history)~~ ✅ Done - all subdirectories removed
3. ~~**KEEP** `palette.ts` (re-exports from engine)~~ ✅ Handled
4. ~~**UPDATE imports** throughout `landing/` to use engine package~~ ✅ Done
5. ~~**RUN BUILD** to verify no broken imports~~ ✅ Build passes

**Action for `meadow/src/lib/components/nature/`**: ✅ COMPLETED

Same as landing - completed in same commit. Also included `clearing/` app.

### Font Declaration Consolidation

**Issue**: `landing/src/app.css` has 17 `@font-face` declarations that should be in the engine package.

**Action**:
1. Move font declarations to `packages/engine/src/lib/ui/styles/fonts.css`
2. Export from engine package
3. Update `landing/src/app.css` to import:
   ```css
   @import "@autumnsgrove/groveengine/ui/styles/fonts.css";
   ```
4. Apply same pattern to `plant/` and `clearing/`

**⚠️ Performance Note**

CSS `@import` can block parallel font downloads, potentially impacting page load. Consider these alternatives:

**Option A: CSS @import (simpler, slight performance cost)**
```css
/* app.css */
@import "@autumnsgrove/groveengine/ui/styles/fonts.css";
```

**Option B: HTML link preload (better performance)**
```html
<!-- app.html -->
<link rel="preload" href="/fonts/lexend.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/styles/fonts.css">
```

**Option C: JavaScript dynamic import (for code-split scenarios)**
```typescript
// +layout.svelte
onMount(() => import('@autumnsgrove/groveengine/ui/styles/fonts.css'));
```

**Recommendation**: Use Option B (HTML preload) from the start for better Core Web Vitals. The slight added complexity is worth avoiding font-related layout shifts and blocking behavior. Option A is acceptable for local development or if deployment constraints prevent HTML modifications.

### Relocate `domains/` Directory

**Issue**: `domains/` is a full SvelteKit application sitting at root level with configuration directories.

**Pre-Move Audit**:
```bash
# Find all references to domains/ in workspace configs
grep -r "domains" pnpm-workspace.yaml package.json

# Find any import references
grep -rn "from.*domains" --include="*.ts" --include="*.js" --include="*.svelte" .

# Check GitHub Actions workflows
grep -r "domains" .github/workflows/

# Check for separate deployment config (wrangler, Cloudflare Pages, etc.)
ls -la domains/wrangler.toml domains/.cloudflare 2>/dev/null
cat domains/wrangler.toml 2>/dev/null | grep -E "^name|^route|pages_build"
```

**⚠️ Deployment Config Warning**: If `domains/` has its own `wrangler.toml` or Cloudflare Pages config, the deployment pipeline may reference absolute paths. Update deployment scripts and CI/CD after moving.

**Action**:
1. Audit references (commands above)
2. Move using git: `git mv domains/ packages/domains/`
3. Update `pnpm-workspace.yaml` if needed
4. Update any workflow paths in `.github/workflows/`
5. Update any import paths found in audit
6. Run `pnpm install` to refresh workspace links

---

## 6. Configuration Directories

### Rename Archive Directories for Clarity

**Current confusion**: `_archived/` and `archives/` have similar names but different purposes.

| Directory | Current Purpose | New Name | New Purpose |
|-----------|-----------------|----------|-------------|
| `_archived/` | Deprecated code with expiration dates | `_deprecated/` | Code marked for deletion |
| `archives/` | Historical reference materials | `archives/` | Keep as-is |

**Action**:
1. Rename `_archived/` → `_deprecated/`
2. Add `_deprecated/README.md` explaining:
   - Contains deprecated code with expiration dates in filenames
   - Safe to delete after expiration date passes
   - Review before major releases

### Consolidate Root `plans/` Directory

**Issue**: `plans/` at root has 2 files that belong in `docs/plans/planning/`

**Action**:
1. Move `plans/sentinel-threshold-integration-plan.md` → `docs/plans/planning/`
2. Move `plans/threshold-engine-integration.md` → `docs/plans/planning/`
3. Delete empty `plans/` directory

---

## 7. Scripts Organization

### Current State

`scripts/` contains 11 files of mixed types with no internal organization.

### Target Structure

```
scripts/
├── README.md                    [NEW - explains script categories]
├── db/                          [NEW - database scripts]
│   ├── seed-midnight-bloom.sql
│   ├── add-midnight-bloom-pages.sql
│   └── fix-midnight-bloom-content.sql
├── deploy/                      [NEW - deployment scripts]
│   ├── backfill-history.sh
│   ├── backfill-summaries.sh
│   ├── get-subscribers.sh
│   └── wisp-setup.sh
├── generate/                    [NEW - generation utilities]
│   ├── generate-logo-pngs.mjs
│   └── generate-release-summary.sh
└── repo/                        [NEW - repository tools]
    ├── repo-snapshot.sh
    └── with-secrets.js
```

**Create `scripts/README.md`**:

```markdown
# Scripts

Utility scripts organized by purpose.

## Directories

### `db/`
SQL scripts for database seeding and data fixes.
- Run via: `wrangler d1 execute grove-engine-db --file=scripts/db/script.sql`

### `deploy/`
Deployment and operational scripts.
- Backfill operations
- Service setup

### `generate/`
Asset and documentation generation.
- Logo generation
- Release notes

### `repo/`
Repository management tools.
- Snapshots
- Secret handling
```

---

## 8. Implementation Order

> **All phases completed 2026-01-16**

### Phase 1: Quick Wins ✅

1. ✅ Delete duplicate `docs/grove-sustainability.md`
2. ✅ Rename `_archived/` → `_deprecated/`
3. ✅ Add README files to `_deprecated/`, `archives/`
4. ✅ Rename UPPERCASE docs to lowercase

### Phase 2: Documentation Restructure ✅

1. ✅ Create new directory structure in `docs/`
2. ✅ Move files from `docs/` root to appropriate subdirectories
3. ✅ Move `docs/scratch/` contents to `docs/philosophy/naming-research/`
4. ✅ Move root plans to `docs/plans/` structure
5. ✅ Consolidate sparse directories
6. ✅ Create `docs/README.md` and `docs/plans/README.md`
7. ✅ Delete empty source directories

### Phase 3: Root Cleanup ✅

1. ✅ Move root markdown files to appropriate `docs/` locations
2. ✅ Move `cdn-index.html` to `assets/`
3. ✅ Delete root `plans/` directory after moving contents

### Phase 4: Packages Improvements ✅

1. ✅ Fix migration numbering in `packages/engine/migrations/` (001-024 sequential)
2. ⬚ Create `packages/README.md` (optional - skipped)
3. ⬚ Create `packages/grove-router/README.md` (optional - skipped)
4. ⬚ Create `tsconfig.base.json` (optional - skipped, packages work independently)
5. ⬚ Rename `ui/components/ui/` → `ui/components/glass/` (deferred - breaking change)

### Phase 5: App Directory Deduplication ✅

1. ✅ Verify engine package exports all nature components
2. ✅ Update imports in `landing/` to use engine package
3. ✅ Delete duplicate nature components from `landing/`
4. ✅ Repeat for `meadow/` and `clearing/`
5. ⬚ Consolidate font declarations (deferred - performance considerations)

### Phase 6: Structural Moves ✅

1. ✅ Move `domains/` → `packages/domains/`
2. ✅ Move `clearing/`, `meadow/`, `plant/`, `landing/` → `packages/`
3. ✅ Remove empty `vineyard/` directory
4. ✅ Update workspace configuration (`packages/*` glob)
5. ✅ Organize `scripts/` into subdirectories
6. ✅ Create `scripts/README.md`
7. ✅ Update GitHub workflows for new paths

### Phase 7: Verification ✅

1. ✅ Builds verified working
2. ✅ GitHub workflows updated
3. ✅ Dependency versions unified

---

## Verification Checklist

After implementation, verify:

- [ ] All builds pass (`pnpm build` in each app/package)
- [ ] All tests pass
- [ ] No duplicate files remain
- [ ] All moved documentation is accessible
- [ ] Cross-references in docs are updated
- [ ] Import paths are correct after moves
- [ ] Migration numbering is sequential with no gaps/duplicates
- [ ] README files exist for all major directories

---

## Notes for Implementing Agent

### Critical Guidelines

1. **Explore before acting**: Read the current state of each directory before making changes
2. **Verify imports**: Before deleting duplicate components, verify the engine package exports them correctly
3. **Use `git mv` for all moves**: Preserve git history by using `git mv source destination` instead of regular mv/rename
4. **Update references**: When moving files, grep for references and update them
5. **Commit incrementally**: Commit after each phase for easier rollback if needed
6. **Test after each phase**: Run builds/tests to catch issues early

### Cross-Reference Verification

After moving documentation files, verify cross-references are updated:

```bash
# Find broken markdown links (references to moved files)
grep -rn "\](.*\.md)" docs/ | grep -v node_modules

# Find references to old locations in markdown
grep -rn "docs/scratch" .
grep -rn "plans/" . --include="*.md" | grep -v "docs/plans"

# Find references in code files (TS/JS/Svelte may import from docs or reference paths)
grep -rn "docs/scratch\|/plans/" --include="*.ts" --include="*.js" --include="*.svelte" .

# Check for hardcoded paths in configs
grep -rn "docs/\|plans/" --include="*.json" --include="*.yaml" --include="*.toml" . | grep -v node_modules
```

### TypeScript Compatibility

Ensure `tsconfig.base.json` is compatible with all consumers:

```bash
# Check TypeScript versions across packages
grep -r "\"typescript\":" */package.json packages/*/package.json

# Verify moduleResolution compatibility (bundler requires TS 5.0+)
npx tsc --version
```

### Path Aliases (Optional Enhancement)

Consider adding path aliases to `tsconfig.base.json` for cleaner imports after reorganization:

```json
{
  "compilerOptions": {
    "paths": {
      "$lib/*": ["./src/lib/*"],
      "@grove/ui/*": ["./packages/engine/src/lib/ui/*"],
      "@grove/types/*": ["./packages/engine/src/lib/types/*"]
    }
  }
}
```

**Benefits**:
- Cleaner imports: `import { GlassCard } from '@grove/ui/glass'`
- Easier refactoring: Change alias target, not every import
- Self-documenting: Makes package boundaries explicit

**Note**: SvelteKit already provides `$lib` alias. Additional aliases are optional but helpful for cross-package imports.

### Rollback Strategy

If issues arise during implementation:

1. **Per-phase rollback**: `git reset --hard HEAD~1` to undo last commit
2. **Full rollback**: `git reset --hard <commit-before-reorganization>`
3. **Partial rollback**: Cherry-pick working commits to a new branch

Keep the original branch available until verification is complete.

---

*This plan was generated 2026-01-14 based on comprehensive codebase exploration.*
*Updated 2026-01-14 to incorporate PR review feedback.*
