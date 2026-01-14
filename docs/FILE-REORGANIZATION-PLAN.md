# GroveEngine File Reorganization Plan

> **Status**: Ready for Implementation
> **Created**: 2026-01-14
> **Purpose**: Comprehensive guide for reorganizing the GroveEngine codebase structure

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

- **Directories**: CamelCase (e.g., `AgentUsage`, `UserContent`)
- **Date-based paths**: kebab-case with YYYY-MM-DD (e.g., `archived-2026-01-14`)
- **Documentation dirs**: lowercase with hyphens (e.g., `help-center`, `design-system`)

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

1. **Migration numbering collisions**: Two `014_*` and two `018_*` migrations
2. **Missing documentation**: No `packages/README.md`, no `grove-router/README.md`
3. **TypeScript config drift**: Inconsistent targets and moduleResolution
4. **Confusing nested naming**: `lib/ui/components/ui/` should be `lib/ui/components/glass/`

### Migration Numbering Fix

**Location**: `packages/engine/migrations/`

Renumber migrations to eliminate collisions:

```
Current                              → New Name
014_wisp.sql                         → 014_wisp.sql (keep)
014_wisp_settings.sql                → 015_wisp_settings.sql
015_* through 017_*                  → 016_* through 018_* (increment by 1)
018_feature_flags.sql                → 019_feature_flags.sql
018_storage_tier_indexes.sql         → 020_storage_tier_indexes.sql
019_lemonsqueezy_migration.sql       → 021_lemonsqueezy_migration.sql
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

### Critical: Remove Duplicate Nature Components

**Issue**: `landing/` and `meadow/` both contain identical copies of ~200 nature component files. These are already available in the `@autumnsgrove/groveengine` package.

**Action for `landing/src/lib/components/nature/`**:

1. **DELETE these subdirectories** (after verifying imports work from engine):
   - `sky/` (8 components)
   - `trees/` (2 components)
   - `ground/` (11 components)
   - `creatures/` (11 components)
   - `structural/` (8 components)
   - `water/` (4 components)
   - `botanical/` (10 components)
   - `weather/` (3 components)

2. **KEEP** `palette.ts` (re-exports from engine)

3. **UPDATE imports** throughout `landing/` to use:
   ```typescript
   import { ComponentName } from '@autumnsgrove/groveengine/ui/nature';
   ```

**Action for `meadow/src/lib/components/nature/`**:

Same as landing - delete local copies, import from engine package.

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

### Relocate `domains/` Directory

**Issue**: `domains/` is a full SvelteKit application sitting at root level with configuration directories.

**Action**:
- Move `domains/` → `packages/domains/`
- Update any workspace references in `pnpm-workspace.yaml`
- Update any import paths

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

Execute changes in this order to minimize conflicts:

### Phase 1: Quick Wins (No Dependencies)

1. ✅ Delete duplicate `docs/grove-sustainability.md`
2. ✅ Rename `_archived/` → `_deprecated/`
3. ✅ Add README files to `_deprecated/`, `archives/`
4. ✅ Rename UPPERCASE docs to lowercase (STRIPE-SETUP.md → stripe-setup.md, etc.)

### Phase 2: Documentation Restructure

1. Create new directory structure in `docs/`
2. Move files from `docs/` root to appropriate subdirectories
3. Move `docs/scratch/` contents to `docs/philosophy/naming-research/`
4. Move root plans to `docs/plans/` structure
5. Consolidate sparse directories (`business/`, `schema/`, `concepts/`, `migrations/`)
6. Create `docs/README.md` and `docs/plans/README.md`
7. Delete empty source directories

### Phase 3: Root Cleanup

1. Move root markdown files to appropriate `docs/` locations
2. Move `cdn-index.html` to `assets/`
3. Delete root `plans/` directory after moving contents

### Phase 4: Packages Improvements

1. Fix migration numbering in `packages/engine/migrations/`
2. Create `packages/README.md`
3. Create `packages/grove-router/README.md`
4. Create `tsconfig.base.json` at repository root
5. Update package tsconfigs to extend base
6. Rename `ui/components/ui/` → `ui/components/glass/`

### Phase 5: App Directory Deduplication

1. Verify engine package exports all nature components
2. Update imports in `landing/` to use engine package
3. Delete duplicate nature components from `landing/`
4. Repeat for `meadow/`
5. Consolidate font declarations to engine package
6. Update app CSS files to import from engine

### Phase 6: Structural Moves

1. Move `domains/` → `packages/domains/`
2. Update workspace configuration
3. Organize `scripts/` into subdirectories
4. Create `scripts/README.md`

### Phase 7: Verification

1. Run full build to verify no broken imports
2. Run tests to verify functionality
3. Update any broken cross-references in documentation
4. Commit with comprehensive message

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

1. **Explore before acting**: Read the current state of each directory before making changes
2. **Verify imports**: Before deleting duplicate components, verify the engine package exports them correctly
3. **Update references**: When moving files, grep for references and update them
4. **Commit incrementally**: Commit after each phase for easier rollback if needed
5. **Test after each phase**: Run builds/tests to catch issues early

---

*This plan was generated 2026-01-14 based on comprehensive codebase exploration.*
