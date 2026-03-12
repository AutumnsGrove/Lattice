---
title: "Prism Icon Gateway Migration Plan"
status: planned
category: general
lastUpdated: "2026-03-11"
---

# Prism Icon Gateway Migration Plan

> **Issue:** [#1448](https://github.com/AutumnsGrove/Lattice/issues/1448)
> **Subsumes:** #1444 (standardize service icons), **Enables:** #1445 (GroveIcon swap component)
>
> Route every icon in the monorepo through `@autumnsgrove/prism` —
> the single gateway for all icon identity, enabling clean migration
> between icon packs and future user-customizable icon themes.

## Context

Prism already owns color tokens for the entire Grove ecosystem. Icons are
the natural companion — if Prism is "the light that splits into color,"
icons are the shapes that light illuminates.

**Today:** 384 files import directly from `@lucide/svelte`. Two separate
icon registries exist (Landing ~240 icons, Engine ~125 icons) with
significant overlap but no shared source of truth. Domain-specific icon
files (blazes, chrome, lantern, tenant-nav) each independently import
from lucide. Swapping icon packs means rewriting 384 files.

**After:** Every icon routes through Prism. ONE adapter file maps
semantic names to icon components. Swapping packs = changing one file.

### Audit Results (March 2026)

| Package | Files with bare `@lucide/svelte` imports |
|---------|----------------------------------------|
| libs/engine | 283 |
| apps/landing | 61 |
| libs/vineyard | 21 |
| apps/clearing | 8 |
| apps/meadow | 4 |
| apps/terrarium | 2 |
| apps/domains | 2 |
| apps/plant | 1 |
| _archived/code | 2 |
| **Total** | **384** |

### Existing Registries to Consolidate

| File | Icons | Scope |
|------|-------|-------|
| `apps/landing/src/lib/utils/icons.ts` | ~240 | Landing app (nav, features, workshop tools, roadmap, pricing, knowledge) |
| `libs/engine/src/lib/ui/components/icons/lucide.ts` | ~125 | Engine platform (nav, state, growth, auth, metrics) |
| `libs/engine/src/lib/blazes/palette.ts` | ~45 | Blaze content markers |
| `libs/engine/src/lib/ui/components/chrome/defaults.ts` | ~27 | Navigation chrome |
| `libs/engine/src/lib/ui/components/chrome/lantern/destinations.ts` | ~8 | Lantern panel |
| `libs/engine/src/lib/ui/components/chrome/tenant-nav.ts` | ~6 | Tenant navigation |

---

## Architecture

### Core Principle: Manifest + Adapter

Prism stays zero-dependency at its core. The architecture splits into two layers:

```
@autumnsgrove/prism/icons          (zero-dep — the VOCABULARY)
  │  Defines semantic groups, aliases, and icon pack names
  │  Pure data: string constants, types, groupings
  │
  ▼
@autumnsgrove/prism/icons/lucide   (depends @lucide/svelte — the ADAPTER)
     Resolves manifest names → actual Svelte components
     THE swap point: change this one file to change every icon
```

This mirrors the design token pattern Prism already uses for colors:
colors.ts defines the vocabulary (`grove`, `cream`, `bark`), and consumers
apply those tokens. Here, the manifest defines icon identity, and the
adapter resolves identity to components.

### Why ALL Icons — Including Domain Icons

Workshop tools like `reverie`, `warden`, `gossamer`? Those are Prism icons.
Roadmap phase icons? Prism icons. Blaze palette icons? Prism icons.

Rationale:
- An icon for Reverie might appear on Landing today, in Meadow tomorrow,
  in a Forage search result next week. Domain boundaries shift.
- If we only centralize "common" icons, every new feature triggers the
  debate: "is this common enough for Prism?" That's a tax on every PR.
- User-customizable icon packs (future) require a COMPLETE manifest.
  You can't let users swap 60% of their icons.
- The cost of including a domain icon in the manifest is one line of
  pure data. The cost of NOT including it is a bare import that escapes
  the gateway.

**Rule: If it's an icon, it goes through Prism. No exceptions.**

### Subpath Exports

```jsonc
// libs/prism/package.json exports
{
  ".":              "./src/index.ts",          // existing (colors, glass, contrast)
  "./icons":        "./src/lib/icons/index.ts", // manifest + types (zero-dep)
  "./icons/lucide": "./src/lib/icons/adapters/lucide.ts"  // adapter (@lucide/svelte dep)
}
```

### File Structure

```
libs/prism/src/
├── index.ts                          # existing — colors, glass, contrast
├── lib/
│   ├── tokens/                       # existing
│   ├── utils/                        # existing
│   ├── types.ts                      # existing
│   └── icons/                        # NEW
│       ├── index.ts                  # barrel: manifest + types
│       ├── manifest.ts               # THE vocabulary — all icon groups
│       ├── types.ts                  # IconGroup, IconName, SemanticAlias, etc.
│       └── adapters/
│           └── lucide.ts             # THE swap point — resolves names to components
```

### Manifest Design

The manifest maps **semantic aliases** (what Grove code uses) to
**icon pack names** (what @lucide/svelte exports). Groups are semantic,
not organizational — they describe the icon's role, not where it's used.

**Groups (flat — no sub-groups):**

| Group | Purpose | Example aliases |
|-------|---------|-----------------|
| `nav` | Navigation and wayfinding | `home`, `search`, `menu`, `arrowRight`, `external` |
| `state` | Feedback and status | `check`, `x`, `loader`, `warning`, `help`, `lock` |
| `nature` | Grove's soul — growth and life | `sprout`, `trees`, `leaf`, `flower`, `heart`, `crown` |
| `season` | Seasonal theming system | `spring`, `summer`, `autumn`, `winter`, `midnight` |
| `action` | User-initiated operations | `plus`, `copy`, `trash`, `settings`, `download`, `send` |
| `feature` | Platform capabilities | `mail`, `storage`, `palette`, `shield`, `cloud`, `archive` |
| `auth` | Authentication and security | `fingerprint`, `key`, `lock`, `shield`, `login` |
| `metric` | Analytics and measurement | `clock`, `trending`, `activity`, `users`, `chart` |
| `phase` | Mystical and aspirational | `gem`, `sparkles`, `star`, `moon`, `sun` |
| `tool` | Grove tools and services (flat) | `reverie`, `warden`, `thorn`, `gossamer`, `loom`, `amber` |
| `blaze` | Content marker categories | `notebook`, `feather`, `bell`, `utensils`, `graduation` |
| `chrome` | UI chrome and layout | `dashboard`, `layers`, `component`, `frame`, `layout` |

**Key design decision:** The `tool` group is flat — all Grove services
live in one map. `tool.reverie` → `'Wand2'`, `tool.gossamer` →
`'Sparkles'`, `tool.thorn` → `'ShieldCheck'`. This means any package
can render a tool's icon without knowing which lucide icon it maps to.

### Forgiving Lookups (Case & Delimiter Insensitive)

All icon lookups normalize keys before resolution. Agents and developers
can use whatever casing or delimiter style they prefer:

```ts
// ALL of these resolve to the same icon:
stateIcons.checkCircle
stateIcons.CHECKCIRCLE
stateIcons.checkcircle
stateIcons['check-circle']
stateIcons['check_circle']
stateIcons['CHECK-CIRCLE']
```

The normalizer strips `-` and `_` delimiters and lowercases the result
before matching against the manifest's canonical keys (stored lowercase,
no delimiters). This is intentional — agents frequently pick their own
naming conventions, and the icon system should be forgiving from the
foundation rather than punishing mismatched casing.

Implementation: a `normalize(key: string)` utility that all lookup
functions (`getIcon`, `getIconFromAll`, Proxy-based map access) route
through. The semantic map objects use `Proxy` to intercept property
access and normalize on the fly, so `stateIcons.CHECK_CIRCLE` works
as a direct property access without explicit function calls.

### Type-Safe Resolution (Rootwork-Inspired)

Icon keys arrive as raw strings from external sources: database rows,
static data objects, API responses, and (future) user configuration.
Today, these boundaries are handled with ad-hoc `as IconKey` casts and
scattered `?? fallback` patterns:

```ts
// TODAY: unsafe cast + manual fallback (repeated everywhere)
const icon = toolIcons[feature.icon as ToolIconKey] ?? stateIcons.circle;
```

Prism formalizes this with type guards and a safe resolver — the icon
equivalent of Rootwork's `safeJsonParse()`. No Zod, no schema overhead —
just validated Set lookups with the forgiving normalizer built in.

**Type Guards:**
```ts
import { isIconKey, isGroupKey } from '@autumnsgrove/prism/icons';

// Is this string a valid icon alias in ANY group?
if (isIconKey(untrustedString)) { /* safe to use */ }

// Is this string a valid alias in a SPECIFIC group?
if (isGroupKey('tool', untrustedString)) { /* safe to use */ }
```

**Safe Resolver:**
```ts
import { resolveIcon } from '@autumnsgrove/prism/icons/lucide';

// Validate + normalize + resolve in one step
// Returns the component or the fallback — never throws, never casts
const icon = resolveIcon('tool', feature.icon, stateIcons.circle);
```

`resolveIcon()` does three things:
1. Normalizes the key (forgiving lookup — case/delimiter insensitive)
2. Validates it exists in the specified group's manifest
3. Returns the resolved component, or the fallback if invalid

This eliminates every `as ToolIconKey` / `as IconKey` / `as RoadmapFeatureIconKey`
cast in the codebase. During migration (Phases 1-4), every file that does
an unsafe icon cast gets replaced with `resolveIcon()`.

**Where this matters today:**
- Blaze API (`src/routes/api/blazes/+server.ts`) — validates icon keys
  from D1 against `VALID_BLAZE_ICONS` whitelist → replaced by `isGroupKey('blaze', icon)`
- Roadmap feature items (`RoadmapFeatureItem.svelte`) — `as RoadmapFeatureIconKey`
  cast → replaced by `resolveIcon('tool', feature.icon, fallback)`
- Workshop page (`+page.svelte`) — `getToolIcon()` with `as ToolIconKey`
  cast → replaced by `resolveIcon('tool', icon, fallback)`
- Any future user-customizable icon selection — validated at the API
  boundary with `isIconKey()` before storage

**Implementation note:** `resolveIcon()` lives in the adapter (not the
manifest) because it returns actual components. `isIconKey()` and
`isGroupKey()` live in the manifest subpath (`./icons`) because they're
pure string validation — zero-dep.

### Semantic Maps Only (No Direct Re-exports)

Consumers access icons ONLY through semantic maps — there are no
direct re-exports of individual icon components from the adapter.

```ts
// YES — semantic map access
import { stateIcons, natureIcons } from '@autumnsgrove/prism/icons/lucide';
const icon = stateIcons.check;

// NO — this pattern does NOT exist in Prism
import { Check } from '@autumnsgrove/prism/icons/lucide';
```

This keeps one clear path to every icon and prevents the "two ways to
import the same thing" problem. It also means agents MUST know which
semantic group an icon belongs to — see the Icon Reference section below.

### Icon Reference for Agent Skills

Because semantic maps are the only access pattern, agent skills need a
reference to look up which group an icon lives in. A single reference
file will be created:

```
.claude/references/prism-icon-reference.md
```

This file lists every icon alias organized by group, and is linked from
any animal skill that renders icons (chameleon-adapt, deer-sense,
grove-ui-design, etc.). Skills that render UI should verify icon names
against this reference before using them. The reference is generated
from the manifest — one source of truth.

### Adapter Design

The adapter file is the ONE place that imports from `@lucide/svelte`.
It reads the manifest, builds typed icon maps with Proxy-based forgiving
lookups, and exports ONLY semantic maps — no individual icon re-exports.

`@lucide/svelte` is a **direct dependency** of `@autumnsgrove/prism`,
not a peer dependency. This means only Prism itself needs lucide
installed — consumers get icons through Prism and never touch lucide
directly. Prism owns the entire icon pipeline end-to-end.

```ts
// Conceptual — exact API designed during implementation
import { ICON_MANIFEST, normalize } from '../manifest.js';
import * as Lucide from '@lucide/svelte';

// Each group is a Proxy that normalizes property access
export const navIcons = resolveGroup(ICON_MANIFEST.nav);
export const stateIcons = resolveGroup(ICON_MANIFEST.state);
export const natureIcons = resolveGroup(ICON_MANIFEST.nature);
// ... all groups

export const allIcons = { ...navIcons, ...stateIcons, /* ... */ };

// Utility functions with forgiving lookups
export function getIcon<T>(map: T, key: string) { ... }
export function getIconFromAll(key: string) { ... }

// Safe resolver — the icon trust boundary (Rootwork-inspired)
// Normalizes, validates, resolves — never throws, never casts
export function resolveIcon(group: string, key: string, fallback?: Component) { ... }

// Type exports
export type IconKey = keyof typeof allIcons;
export type NavIconKey = keyof typeof navIcons;
// ... etc
```

### Consumer Migration Pattern

**Before:**
```svelte
<script>
  import { Sprout, Check, Settings } from '@lucide/svelte';
</script>
```

**After:**
```svelte
<script>
  import { natureIcons, stateIcons, actionIcons } from '@autumnsgrove/prism/icons/lucide';
</script>

<natureIcons.sprout class="w-5 h-5" />
<stateIcons.check class="w-5 h-5" />
<actionIcons.settings class="w-5 h-5" />
```

### The Magic Flip

To swap from Lucide to another icon pack:

1. Write `libs/prism/src/lib/icons/adapters/phosphor.ts`
2. Map the same manifest aliases to Phosphor component names
3. Find-and-replace import paths across the monorepo:
   `@autumnsgrove/prism/icons/lucide` → `@autumnsgrove/prism/icons/phosphor`
4. Every icon in the grove changes.

For **user-customizable** icon packs (future): the adapter could accept
a runtime configuration, resolving aliases to user-selected icon sets.
The manifest's semantic structure makes this possible — you're not
mapping 384 bare component names, you're mapping ~12 semantic groups.

### Barrel Import Safety

The lucide adapter exports Proxy-wrapped semantic map objects. It does NOT
use `export *` from barrels containing Svelte components. This avoids the
barrel cascade problem documented in MEMORY.md.

Consumers import semantic maps only:
```ts
import { natureIcons, stateIcons } from '@autumnsgrove/prism/icons/lucide';
```

The adapter file itself imports from `@lucide/svelte` using named imports
(not `import *`) to preserve tree-shaking.

### What About `@lucide/lab`?

Lab icons (e.g., `BeeIcon`) are experimental and require a custom Svelte
wrapper component. These live in the manifest under a `lab` group with a
note that they require a custom adapter wrapper. The adapter handles the
wrapping internally — consumers just see `labIcons.bee` like any other icon.

---

## Migration Phases

### Phase 0: Build Prism Icon System

**Scope:** libs/prism only — no consumer changes.
Split into two sub-phases for separation of concerns.

#### Phase 0a: Build the System (structure, types, resolver, forgiving lookups)

- Create `icons/manifest.ts` — group structure, `normalize()` utility,
  empty/stub groups ready to receive icon entries
- Create `icons/types.ts` — `IconGroup`, `IconName`, `SemanticAlias`, etc.
- Create `icons/index.ts` barrel for `./icons` subpath — exports manifest,
  types, and type guards (`isIconKey()`, `isGroupKey()`)
- Create `icons/adapters/lucide.ts` — `resolveGroup()` with Proxy-based
  forgiving lookups, `getIcon()`, `getIconFromAll()`, and `resolveIcon()`
  (the safe boundary resolver)
- Add subpath exports to `package.json`
- Add `@lucide/svelte` as **direct dependency** (not peer)
- Write tests for normalizer (`checkCircle` = `CHECK_CIRCLE` = `check-circle`)
- Write tests for Proxy-based map access
- Write tests for `resolveIcon()` — valid keys, invalid keys, fallback
  behavior, forgiving normalization through the resolver
- Write tests for `isIconKey()` / `isGroupKey()` type guards
- Verify Prism core (`"."` entry) is untouched — no breaking changes

#### Phase 0b: Build the Manifest (icon inventory — safari-style)

Separate effort. Scan the entire codebase to build the complete icon
inventory:

- Extract every unique icon name from all 384 files with bare imports
- Extract from both existing registries (landing + engine)
- Extract from domain files (blazes, chrome, lantern, tenant-nav)
- Deduplicate and assign every icon to a semantic group
- Populate `manifest.ts` with the full inventory
- Generate `.claude/references/prism-icon-reference.md` from the manifest
- Write tests for manifest completeness (every icon in use is covered)

This is a mechanical, high-volume task — likely done safari-style with
agent assistance.

**Verification:**
```bash
cd libs/prism && bun svelte-check
cd libs/prism && pnpm run test:run
```

### Phase 1: Bridge Existing Registries

**Scope:** Engine + Landing icon files become thin wrappers

- `libs/engine/src/lib/ui/components/icons/lucide.ts` →
  Re-exports from `@autumnsgrove/prism/icons/lucide` + engine-specific additions
- `apps/landing/src/lib/utils/icons.ts` →
  Re-exports from `@autumnsgrove/prism/icons/lucide` + landing-specific additions
  (color maps like `seasonalIconColors`, `statusIconColors` stay here)
- Domain files (`blazes/palette.ts`, `chrome/defaults.ts`, etc.) →
  Import from Prism adapter instead of bare lucide

**Zero breaking changes** — all existing import paths continue to work.
The source of truth silently shifts to Prism underneath.

**Verification:**
```bash
gw ci --affected --fail-fast --diagnose
```

### Phase 2: Migrate Small Packages

Quick wins to validate the pattern before the bulk migration.

| Package | Files | Approach |
|---------|-------|----------|
| libs/vineyard | 21 | Library — sets the standard for other consumers |
| apps/clearing | 8 | Small app, straightforward |
| apps/meadow | 4 | Small app, RSS-focused |
| apps/terrarium | 2 | Canvas app |
| apps/domains | 2 | Domain management |
| apps/plant | 1 | Onboarding (already partially correct) |

**Verification:** `gw ci --affected` after each package.

### Phase 3: Migrate Engine (Bulk)

283 files — the largest effort. Migrate incrementally by directory:

Suggested order (by independence, smallest first):
1. `src/lib/components/admin/` — admin panels
2. `src/lib/components/` — shared components
3. `src/routes/arbor/` — tenant routes (largest group)
4. `src/lib/ui/` — UI primitives
5. Everything else

This phase can span multiple PRs. Each PR migrates one directory,
runs `gw ci --affected`, and merges independently.

### Phase 4: Migrate Landing

61 files. Landing's `icons.ts` shrinks to only the color maps
(`seasonalIconColors`, `statusIconColors`, `getPhaseColor`, `getStatusColor`)
since all icon re-exports now come from Prism.

### Phase 5: Enforcement

Add enforcement to prevent regression:

1. **Pre-commit hook check** — same pattern as the barrel import cascade check:
   scan staged `.svelte` and `.ts` files for `from "@lucide/svelte"` or
   `from '@lucide/svelte'`. Only `libs/prism/src/lib/icons/adapters/lucide.ts`
   is whitelisted. Suppressible with `// lucide-ok` comment for edge cases.

2. **Crane audit category** — add "Icon Gateway Compliance" as category 10
   in `.claude/skills/crane-audit/references/compliance-checks.md`:
   - Flag: bare `@lucide/svelte` imports in non-adapter files
   - Flag: new icons added to components without adding to Prism manifest
   - Flag: `import *` from icon adapter (tree-shaking risk)
   - Add `@autumnsgrove/prism/icons/lucide` to the SDK Quick Reference table

3. **Documentation** — update AGENT.md with the icon import rule,
   similar to the existing barrel import and `api.*()` fetch rules.

4. **Agent skill updates** — any animal skill that renders icons must
   verify icon names against the Prism reference. Update these skills to
   include a note linking to `.claude/references/prism-icon-reference.md`:
   - `chameleon-adapt` (UI adaptation)
   - `deer-sense` (accessibility)
   - `grove-ui-design` (UI design patterns)
   - `elephant-build` (feature implementation)
   - `gathering-ui` (combined UI work)
   - Any other skill that generates `<svelte:component>` or icon markup

   Each skill gets a brief addition like:
   > When using icons, verify names against the Prism icon reference
   > (`.claude/references/prism-icon-reference.md`). Import from
   > `@autumnsgrove/prism/icons/lucide` semantic maps only — never
   > from `@lucide/svelte` directly.

### Phase 6: Cleanup

- Remove the old icon re-exports from engine's `lucide.ts` once all
  consumers import from Prism directly
- Remove the old icon imports from landing's `icons.ts` (keep color maps)
- Delete any `// lucide-ok` suppressions that are no longer needed
- Update MEMORY.md with the Prism icon pattern

---

## Execution Notes

### Worktree Strategy

This migration is large enough to warrant its own worktree:
```bash
gw worktree start 0000 --branch feat/prism-icon-gateway
```

Phase 0 (build Prism icons) can land as its own PR — it's purely additive.
Phases 1-4 can be one or many PRs depending on review comfort.
Phase 5 (enforcement) lands last, after migration is substantially complete.

### Risk Mitigation

- **No breaking changes until Phase 6.** Every phase is additive —
  old import paths work alongside new ones.
- **Incremental verification.** Each directory migration gets `gw ci --affected`.
- **Suppression escape hatch.** `// lucide-ok` comment for any edge case
  where bare imports are genuinely needed (test mocks, adapter internals).

### Icon Inventory Tracking

See Phase 0b. The manifest build is a separate sub-phase from the
system build, done safari-style. The manifest must cover ALL icons
in use before Phase 1 (bridging) begins.

### Svelte 4/5 Compatibility

Use the same `typeof import('@lucide/svelte').Home` bridge pattern
that `blazes/palette.ts` already uses. The adapter's type exports
work in both Svelte 4 and Svelte 5 component contexts.

---

## Verification

After full migration:

```bash
# No bare lucide imports outside the adapter
rg "from ['\"]@lucide/svelte['\"]" --type ts --type svelte \
  | grep -v "libs/prism/src/lib/icons/adapters/"
# Should return zero results

# CI passes
gw ci

# Pre-commit hook catches new bare imports
echo "import { Home } from '@lucide/svelte';" > /tmp/test.ts
# Hook should warn/block
```

---

## Future: User-Customizable Icon Packs

Once every icon routes through Prism, user-selectable icon packs become
architecturally possible. The semantic manifest means users choose between
complete, consistent icon sets — not individual icons. A "playful" pack
could map `nature.sprout` to a cartoon seedling; a "minimal" pack could
map it to a simple dot. The manifest guarantees every alias resolves,
regardless of which pack is active.

This is out of scope for this migration but is the long-term vision
that motivates routing ALL icons through the gateway now.
