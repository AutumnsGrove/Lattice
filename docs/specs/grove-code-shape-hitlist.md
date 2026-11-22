---
title: "Grove Code Shape — Refactor Hitlist"
description: >-
  Priority-ranked list of files that violate Grove Code Shape conventions,
  ordered by impact (size × coupling). Work through top-to-bottom.
category: specs
specCategory: "conventions"
icon: list
lastUpdated: "2026-06-23"
aliases: []
tags:
  - conventions
  - refactoring
  - code-shape
  - hitlist
---

# Refactor Hitlist

```
     🪓  Biggest Trees to Split

     Priority = file size × importer count
     Higher score = fix this first
```

Companion to: [grove-code-shape-spec.md](./grove-code-shape-spec.md)

---

## Tier 1 — High Impact (split these first)

These files are both large AND widely imported. Splitting them gives
the biggest payoff for token efficiency and maintainability.

### 1. `libs/engine/src/lib/auth/session.ts`
- **Lines**: 767 | **Importers**: 56 | **Impact score**: 42,952
- **Why first**: Most-imported large file in the codebase. Every route
  handler that checks auth touches this file. Splitting it means 56 call
  sites can import only what they need.
- **Split plan**:
  ```
  auth/session.ts           → thin re-export barrel
  auth/session/create.ts    → session creation (login flow)
  auth/session/validate.ts  → token/cookie validation (most importers need only this)
  auth/session/refresh.ts   → token refresh logic
  auth/session/cookies.ts   → cookie serialization helpers
  auth/session/types.ts     → SessionData, SessionOptions, etc.
  ```
- **Key insight**: Most of those 56 importers likely only need `validate`.
  After splitting, a typical route pulls in ~80 lines instead of 767.

### 2. `libs/engine/src/lib/platform/tiers.ts`
- **Lines**: 578 | **Importers**: 42 | **Impact score**: 24,276
- **Why**: Tier configuration is referenced everywhere for feature gating.
  But it's mostly data — the logic can separate from the data.
- **Split plan**:
  ```
  platform/tiers.ts            → thin re-export barrel
  platform/tiers/definitions.ts → tier data (seedling, sapling definitions)
  platform/tiers/limits.ts      → per-tier resource limits
  platform/tiers/features.ts    → per-tier feature flags
  platform/tiers/helpers.ts     → lookup functions (getTierConfig, canAccess)
  platform/tiers/types.ts       → TierKey, TierConfig, TierLimits
  ```

### 3. `libs/engine/src/lib/server/services/database.ts`
- **Lines**: 1,071 | **Importers**: 19 | **Impact score**: 20,349
- **Why**: The single largest service file. All DB queries in one place.
- **Split plan**:
  ```
  services/database.ts      → thin re-export barrel
  services/db/posts.ts      → post CRUD queries
  services/db/pages.ts      → page CRUD queries
  services/db/media.ts      → media/file queries
  services/db/curios.ts     → curio queries
  services/db/social.ts     → friends, subscriptions, messages
  services/db/tenant.ts     → tenant-level operations
  services/db/helpers.ts    → shared query builders, pagination
  services/db/types.ts      → query result types
  ```

### 4. `services/heartwood/src/db/queries.ts`
- **Lines**: 1,355 | **Importers**: ~15 (internal service)
- **Why**: Heartwood's monolith query file. Same pattern as database.ts.
- **Split plan**:
  ```
  db/queries.ts             → thin re-export barrel
  db/queries/oauth.ts       → OAuth flow queries
  db/queries/users.ts       → user CRUD
  db/queries/sessions.ts    → session management
  db/queries/subscriptions.ts → subscription queries
  db/queries/devices.ts     → device/token queries
  db/queries/admin.ts       → admin-only queries
  ```

---

## Tier 2 — Medium Impact (split when you're in the neighborhood)

These files are large but fewer things depend on them. Split them
when you're already working in that module.

### 5. `libs/engine/src/lib/content/editor/GutterManager.svelte`
- **Lines**: 1,693 | **Importers**: ~3
- **Split plan**: Extract logic to `GutterManager.svelte.ts`, then break
  the template into sub-components:
  ```
  editor/GutterManager.svelte       → slim orchestrator (template + bindings)
  editor/GutterManager.svelte.ts    → state management, calculations
  editor/gutter/LineNumbers.svelte   → line number rendering
  editor/gutter/Annotations.svelte   → annotation markers
  editor/gutter/FoldButtons.svelte   → code folding UI
  ```

### 6. `libs/engine/src/lib/content/editor/MarkdownEditor.svelte`
- **Lines**: 1,084 | **Importers**: ~4
- **Split plan**: Same pattern — companion `.svelte.ts` for logic,
  sub-components for toolbar sections.

### 7. `libs/engine/src/lib/content/markdown.ts`
- **Lines**: 1,070 | **Importers**: 7
- **Split plan**:
  ```
  content/markdown.ts          → re-export barrel
  content/markdown/parse.ts    → markdown → AST
  content/markdown/render.ts   → AST → HTML
  content/markdown/plugins.ts  → custom plugins/extensions
  content/markdown/sanitize.ts → output sanitization
  content/markdown/types.ts    → AST node types
  ```

### 8. `libs/engine/src/lib/server/services/reeds.ts`
- **Lines**: 962 | **Importers**: 8
- **Split plan**:
  ```
  services/reeds.ts             → re-export barrel
  services/reeds/comments.ts    → comment CRUD
  services/reeds/threads.ts     → thread management
  services/reeds/moderation.ts  → comment moderation
  services/reeds/types.ts       → comment/thread types
  ```

### 9. `libs/engine/src/lib/server/services/storage.ts`
- **Lines**: 910 | **Importers**: low (accessed via service layer)
- **Split plan**: Split by operation type (upload, download, delete, quota).

### 10. `libs/engine/src/lib/monitoring/sentinel/operations.ts`
- **Lines**: 811 | **Importers**: 1
- **Split plan**: Split by operation category (health checks, DB ops,
  KV ops, DO ops). Low priority due to single importer.

---

## Tier 3 — Barrel Cleanup (do alongside other work)

### 11. `libs/engine/src/lib/ui/components/ui/index.ts`
- **Exports**: 56
- **Action**: Split into category sub-barrels:
  ```
  ui/components/ui/index.ts       → max 20 most-used re-exports
  ui/components/ui/buttons.ts     → Button, IconButton, etc.
  ui/components/ui/forms.ts       → Input, Select, Checkbox, etc.
  ui/components/ui/layout.ts      → Card, Stack, Grid, etc.
  ui/components/ui/feedback.ts    → Toast, Alert, Badge, etc.
  ```
- **Or better**: Consumers import components directly (Rule 6 in spec).
  The barrel becomes optional, not the primary import path.

### 12. `libs/engine/src/lib/index.ts`
- **Exports**: 30
- **Action**: Consumers already use subpath imports
  (`@autumnsgrove/lattice/auth`, `/server`, etc.). Evaluate whether
  this root barrel is even needed. If not, deprecate it.

### 13. `libs/engine/src/lib/utils/index.ts`
- **Exports**: 30
- **Action**: Group into `utils/validation.ts`, `utils/formatting.ts`,
  `utils/http.ts`, etc. Each util file stays small.

### 14. `libs/engine/src/lib/server/services/index.ts`
- **Exports**: 23
- **Action**: After splitting the service files (Tier 1–2), this barrel
  naturally shrinks.

---

## Tier 4 — Dead Weight Removal

### Empty packages to remove (unless tracked by an open issue):
- `apps/ivy` — 0 files
- `apps/meadow` — 0 files
- `apps/terrarium` — 0 files
- `libs/server-sdk` — 0 files
- `workers/reverie` — 0 files
- `workers/reverie-exec` — 0 files
- `workers/timeline-sync` — 0 files
- `workers/post-migrator` — 0 files
- `workers/meadow-poller` — 0 files

**Before removing**: Check `pnpm-workspace.yaml` and any CI config that
references these. Remove from workspace config, then delete the directory.

---

## Working Session Template

When you sit down to refactor one of these files, follow this checklist:

```
□ Read the target file fully
□ Identify 3-5 natural seams (function clusters, type groups)
□ Create the new directory/files
□ Move functions + their types (keep imports working)
□ Create thin re-export barrel at the original path
□ Find all importers: grep -rl "from.*{old-path}" --include='*.ts' --include='*.svelte'
□ Update importers to use direct paths (or leave on barrel for now)
□ Run: gw ci --affected
□ Commit with: refactor({module}): split {file} into focused modules
```

---

## Progress Tracker

| # | File | Status | Session |
|---|------|--------|---------|
| 1 | auth/session.ts | ✅ skip (91 lines — already clean) | 2026-06-23 |
| 2 | platform/tiers.ts | ✅ done → 3 files (max 80 lines types) | 2026-06-23 |
| 3 | server/services/database.ts | ✅ done → 7 files (max 223 lines) | 2026-06-23 |
| 4 | heartwood/db/queries.ts | ✅ done → 9 files (max 245 lines) | 2026-06-23 |
| 5 | GutterManager.svelte | ✅ done → types + utils extracted | 2026-06-23 |
| 6 | MarkdownEditor.svelte | ✅ done → types + upload composable | 2026-06-23 |
| 7 | content/markdown.ts | ✅ done → 8 files (max 162 lines) | 2026-06-23 |
| 8 | services/reeds.ts | ✅ done → 5 files (max 130 lines) | 2026-06-23 |
| 9 | services/storage.ts | ✅ done → 6 files (max 165 lines) | 2026-06-23 |
| 10 | sentinel/operations.ts | ✅ done → 6 files (max 190 lines) | 2026-06-23 |
| 11 | ui/components/ui barrel | ✅ done — export * → named exports | 2026-06-23 |
| 12 | engine root barrel | ⬜ pending (has export * from ui/index) | — |
| 13 | utils barrel | ✅ done — export * → 80+ named exports | 2026-06-23 |
| 14 | services barrel | ✅ done (auto-shrunk from file splits) | 2026-06-23 |
| 15 | empty packages | ⬜ deferred (CI scripts reference them) | — |

---

*Update this file as you work through the list. Check off items,
note which session tackled them, and add any new files discovered
along the way.*
