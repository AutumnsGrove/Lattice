---
title: "Grove Code Shape — Module & File Conventions"
description: >-
  Rules for file size, naming, barrel exports, module boundaries, and
  import hygiene across the Lattice monorepo. Designed for token-efficient
  AI-assisted development.
category: specs
specCategory: "conventions"
icon: layout
lastUpdated: "2026-06-23"
aliases: []
tags:
  - conventions
  - refactoring
  - code-shape
  - token-efficiency
  - monorepo
---

# Grove Code Shape

```
          🌿  How Code Grows in the Grove

     ╭──────────────────────────────────────╮
     │                                      │
     │   Small files.  Clear names.         │
     │   Visible boundaries.                │
     │                                      │
     │   A wanderer should find their way   │
     │   without reading the whole forest.  │
     │                                      │
     ╰──────────────────────────────────────╯
```

## Why This Exists

Working with limited context windows means every token counts. When an AI
assistant (or a tired human at midnight) needs to fix a bug in the comment
system, they should be able to:

1. **Find it** — file names tell the story without opening anything
2. **Read it** — the whole file fits in one context load (~300 lines)
3. **Change it** — edits don't cascade through barrel re-exports
4. **Ignore the rest** — module boundaries keep unrelated code out of scope

These conventions optimize for **discoverability**, **isolation**, and
**small surface area per task**.

---

## Rule 1: File Size

### Hard limit: 300 lines of production code

Test files are exempt (they can be as long as they need to be).
Generated files (types, schemas) are exempt.
Svelte components have a soft limit of 250 lines (template + script + style).

**When a file exceeds 300 lines, it's a signal to split, not a sin to confess.**
Look for natural seams:

- A group of related functions → extract to `{topic}.ts`
- A section behind a feature flag → extract to `{feature}.ts`
- A chunk of type definitions → extract to `{module}.types.ts`
- A validation/parsing block → extract to `{module}.validation.ts`
- A Svelte component's complex logic → extract to `{component}.svelte.ts`

### Split strategy

```
Before:
  services/database.ts          (1,071 lines — does everything)

After:
  services/database.ts          (50 lines  — re-exports for backward compat)
  services/db/posts.ts          (120 lines — post CRUD)
  services/db/pages.ts          (90 lines  — page CRUD)
  services/db/media.ts          (80 lines  — media queries)
  services/db/curios.ts         (110 lines — curio queries)
  services/db/subscriptions.ts  (70 lines  — subscription queries)
  services/db/tenant.ts         (60 lines  — tenant-level ops)
  services/db/helpers.ts        (40 lines  — shared query builders)
```

The original file becomes a **thin re-export barrel** so existing imports
don't break. Over time, call sites migrate to direct imports.

---

## Rule 2: One Concept Per File

### The name IS the documentation

A file's name should answer "what does this do?" without opening it.

**Pattern**: `{what-it-does}.ts` or `{what-it-is}.svelte`

```
✅ Good names:
  post-queries.ts         → database queries for posts
  session-validation.ts   → validates session tokens
  rate-limit-middleware.ts → rate limiting HTTP middleware
  ImageCropper.svelte     → an image cropping component
  upload-constraints.ts   → file upload size/type rules
  markdown-directives.ts  → custom markdown directive handlers

❌ Bad names:
  utils.ts          → utils for what?
  helpers.ts        → helps with what?
  index.ts          → barrel? entry point? both?
  types.ts          → types for the whole module? one feature?
  service.ts        → which service?
```

### When multiple concepts live in one file, split by concept

```
Before:
  session.ts (767 lines)
    — session creation
    — session validation
    — session refresh
    — session cookie management
    — session type definitions

After:
  session/create.ts      — creating new sessions
  session/validate.ts    — validating existing sessions
  session/refresh.ts     — token refresh logic
  session/cookies.ts     — cookie read/write helpers
  session/types.ts       — session-related types
  session/index.ts       — re-exports (barrel, no logic)
```

---

## Rule 3: Barrel Files

### Barrels are re-export manifests, never logic

A barrel file (`index.ts`) may ONLY contain:
- `export { thing } from './thing.ts'`
- `export type { Thing } from './thing.types.ts'`
- `export { default as Thing } from './Thing.svelte'`

A barrel file may NEVER contain:
- Function definitions
- Class definitions
- Variable declarations (beyond re-exports)
- Conditional logic
- Side effects

### Barrel depth limit: one level

```
✅ Allowed:
  import { createPost } from '$lib/server/db/posts'

✅ Allowed (through one barrel):
  import { createPost } from '$lib/server/db'
  // where db/index.ts re-exports from db/posts.ts

❌ Discouraged (barrel chain):
  import { createPost } from '$lib/server'
  // where server/index.ts re-exports from server/db/index.ts
  // which re-exports from server/db/posts.ts
  // (3 files traversed, coupling spreads)
```

### Barrel export budget

No barrel file should re-export more than **20 symbols**. If a module
exposes more than 20 things, it's either too big or its consumers are
reaching too deep.

**Current offenders to fix:**
- `ui/components/ui/index.ts` — 56 exports (split into sub-barrels by category)
- `engine/src/lib/index.ts` — 30 exports (consumers should import subpaths)
- `engine/src/lib/utils/index.ts` — 30 exports (group utils by domain)
- `server/services/index.ts` — 23 exports (split by service domain)

---

## Rule 4: Module Boundaries

### Every directory with 3+ files gets an index.ts

This index defines the module's **public API**. Files outside the module
import through the index. Files inside the module import each other directly.

```
auth/
  index.ts          ← public API (what other modules import)
  create.ts         ← internal (imported by siblings only)
  validate.ts       ← internal
  refresh.ts        ← internal
  cookies.ts        ← internal
  types.ts          ← internal (but types may be re-exported)
```

### No reaching into another module's internals

```
✅ Correct:
  import { validateSession } from '$lib/auth'

❌ Wrong (reaching past the boundary):
  import { parseSessionCookie } from '$lib/auth/cookies'
  // cookies.ts is internal to the auth module
```

**Exception**: Type imports may reach one level deep when the module
re-exports would create circular dependencies.

### Module size guide

A module (directory) should contain **3–12 files**. Fewer than 3 means
it's probably not a real module (just put the files in the parent).
More than 12 means it should be split into sub-modules.

---

## Rule 5: Svelte Component Shape

### Script → Template → Style (in that order, always)

```svelte
<script lang="ts">
  // 1. imports
  // 2. props ($props)
  // 3. derived state ($derived)
  // 4. local state ($state)
  // 5. effects ($effect)
  // 6. functions
</script>

<!-- template -->

<style>
  /* scoped styles */
</style>
```

### Extract complex logic to companion files

When a component's `<script>` block exceeds ~80 lines of logic (not
counting imports and prop declarations), extract the logic:

```
PhotoPicker.svelte           (200 lines — template + minimal script)
PhotoPicker.svelte.ts        (150 lines — state management, API calls)
```

The `.svelte.ts` file can use Svelte 5 runes (`$state`, `$derived`, etc.)
and is the component's "brain". The `.svelte` file becomes a thin template
that binds to the extracted state.

### One component per file, always

Never define multiple components or complex helper functions inline in a
Svelte file. If you need a sub-component, make it a sibling file.

---

## Rule 6: Import Hygiene

### Prefer direct imports over barrel imports for Svelte files

```
✅ Direct (tree-shakeable, no cascade):
  import Button from '$lib/ui/components/ui/Button.svelte'

❌ Barrel (pulls in 56 modules):
  import { Button } from '$lib/ui'
```

### Import order (enforced by existing lint rules)

1. Svelte/SvelteKit imports
2. External packages (`@autumnsgrove/*`, third-party)
3. `$lib/` imports (alphabetical by path)
4. Relative imports (`./`, `../`)
5. Type-only imports last

### No circular imports

If module A imports from module B and module B imports from module A,
one of them is in the wrong place. Extract the shared dependency into
a third module.

---

## Rule 7: Dead Code & Empty Packages

### Remove empty packages

Packages with 0 source files should be removed from the workspace
unless they're actively being built (tracked by an open issue/PR).

**Current empties to evaluate:**
- `apps/ivy`, `apps/meadow`, `apps/terrarium`
- `workers/reverie`, `workers/reverie-exec`, `workers/timeline-sync`,
  `workers/post-migrator`, `workers/meadow-poller`
- `libs/server-sdk`

### The `_junkdrawer/` is fine

Experimental and parked code lives in `_junkdrawer/`. It's excluded from
builds, CI, and linting. Don't clean it up — it's a parking lot, not
a landfill.

### No dead exports

If removing an export from a barrel doesn't break any import, remove it.
Dead exports create false coupling signals for both humans and AI tools.

---

## Enforcement

### Phase 1: Awareness (lint warnings)

Add an ESLint rule or custom script that warns on:
- [ ] Files exceeding 300 lines (production) / 250 lines (Svelte)
- [ ] Barrel files containing logic (function/class/variable declarations)
- [ ] Barrel files exceeding 20 exports

### Phase 2: Pre-commit gate

The existing pre-commit hook (barrel cascade checker) is extended to:
- [ ] Block new files over 300 lines
- [ ] Block new barrel logic
- [ ] Warn (not block) on existing files that grow past the limit

### Phase 3: CI check

A CI step (`gw ci` extension or standalone script) that:
- [ ] Reports file size violations across the repo
- [ ] Tracks the total count of violations over time (should trend down)
- [ ] Flags new violations in PRs (hard fail for new files, soft warn for existing)

---

## Refactoring Playbook

When splitting a large file:

### Step 1: Identify seams

Read the file and mark natural groupings. Look for:
- Comment headers ("// --- Post queries ---")
- Functions that only call each other (they're a cluster)
- Type definitions that only serve one group of functions
- Blocks guarded by feature flags

### Step 2: Extract to sibling files

Create new files next to the original. Move functions + their types.
Update internal imports.

### Step 3: Thin the original

The original file becomes either:
- A **barrel** that re-exports everything (backward compat)
- **Deleted** if all call sites can be updated at once

### Step 4: Update call sites

Find all imports of the original file. Update them to point to the
specific new file (preferred) or the barrel (acceptable).

### Step 5: Verify

Run `gw ci --affected` to ensure nothing broke.

---

## Exceptions

Some files are inherently large and that's okay:

- **Migration files** (`*.sql`) — sequential, append-only
- **Test files** (`*.test.ts`) — thoroughness > brevity
- **Generated files** (`worker-configuration.d.ts`) — not hand-maintained
- **Data files** (`grove-term-manifest.json`) — structured data, not code
- **Configuration** (`tiers.ts`, `config.ts`) — data-heavy, low logic

These files should still follow naming and organization rules, just
not the 300-line limit.

---

## Measuring Progress

Track these metrics over time:

| Metric | Current | Target |
|--------|---------|--------|
| Files over 300 lines (production) | ~35 | 0 (new) / ≤10 (legacy) |
| Barrel files with logic | ~15 | 0 |
| Barrel files over 20 exports | ~4 | 0 |
| Empty packages in workspace | ~11 | 0 |
| Average file size (production) | ~180 lines | ~120 lines |

---

*This spec is a living document. Update it as patterns emerge.*
