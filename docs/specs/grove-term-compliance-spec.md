---
title: Grove Term Compliance
description: Achieving 100% Grove terminology coverage across all user-facing text, with wrapping guidelines, pre-commit enforcement, and phased rollout
category: specs
specCategory: core-infrastructure
icon: languages
date created: Monday, March 10th 2026
date modified: Monday, March 10th 2026
lastUpdated: 2026-03-10
aliases:
  - grove-term-audit
  - terminology-compliance
tags:
  - grove-terms
  - accessibility
  - i18n
  - pre-commit
  - engine
  - lattice
type: tech-spec
---

```
              ┌─────────────────────────────────────────────┐
              │     G R O V E          S T A N D A R D      │
              │                                             │
              │     Meadow      ↔     Community Feed       │
              │     Arbor       ↔     Dashboard            │
              │     Blooms      ↔     Posts                │
              │     Wanderer    ↔     Visitor              │
              │     Curios      ↔     Custom Pages         │
              │     · · ·       ↔     · · ·               │
              │                                             │
              │      ┌──────┐         ┌──────┐             │
              │      │  ON  │ ◀─────▶ │  OFF │             │
              │      └──────┘  toggle  └──────┘             │
              └─────────────────────────────────────────────┘

              Two languages. One forest. Every term accounted for.
```

# Grove Term Compliance

> *Two languages. One forest. Every term accounted for.*

Grove speaks two dialects: the nature language of the forest (Meadow, Arbor, Blooms) and the standard language of the web (Community Feed, Dashboard, Posts). The `GroveTerm` and `GroveSwap` components, the `resolveTerm()` utility, and the `[[term]]` markdown syntax make this bilingualism possible. The infrastructure works. The adoption doesn't.

This spec defines what full compliance looks like, how to get there, and how to keep it.

**Last Updated:** March 2026

---

## Overview

### What This Is

A plan to wrap every user-facing occurrence of Grove terminology in the appropriate swapping mechanism, a pre-commit hook to prevent regression, and guidelines for choosing the right wrapping component in each context.

### Goals

- 100% coverage of user-facing Grove terms across all apps and libraries
- Clear rules for when to use `GroveTerm` vs `GroveSwap` vs `resolveTerm()`
- A pre-commit hook that catches bare terms in new code
- An escape hatch (`grove-term-ok`) for intentional prose usage of ambiguous words
- Integration with Deer Sense for ongoing accessibility auditing

### Non-Goals

- Changing the manifest itself (adding/removing/renaming terms)
- Wrapping code-only references (imports, variable names, types, CSS classes)
- Wrapping terms inside the GroveTerm component suite's own source files
- Wrapping terms in documentation, specs, or markdown files (these use `[[term]]` syntax via rehype)

---

## The "Grove" Distinction

The word "Grove" appears in two distinct contexts throughout the codebase. Getting this right is critical.

### "Grove" as Platform Brand (DO NOT SWAP)

When "Grove" refers to the platform itself, it is a brand name. It does not swap. It does not need wrapping.

```svelte
<!-- These are correct as-is -->
<title>Sign In - Grove</title>
<p>Grove is a return to something simpler.</p>
<p>Sign in to continue to Grove</p>
<footer>Grove &bull; Better Auth</footer>
<span class="logo-text">Grove</span>
```

The manifest entry `your-grove` has `alwaysGrove: true` with no `standardTerm`. Even if wrapped, the text would never change. These do not need wrapping.

### "Your Grove" as Personal Space (SWAP)

When "grove" refers to a user's personal space, it maps to the manifest entry `your-grove` (Grove ↔ "Your Space"). Use `GroveSwap` when referring to the user's personal site.

```svelte
<!-- These should be wrapped -->
<GroveSwap term="your-grove">your grove</GroveSwap>
<GroveSwap term="your-grove">Your Grove</GroveSwap>
```

### How to Tell the Difference

| Context | Example | Swap? |
|---------|---------|-------|
| Platform name in branding | "Sign in to Grove" | No |
| Legal/footer text | "Grove Terms of Service" | No |
| Logo text | `<span>Grove</span>` | No |
| User's personal space | "Set up your grove" | Yes (`your-grove`) |
| Possessive personal | "Autumn's grove" | Yes (`your-grove`) |
| Feature description | "...appear in your grove" | Yes (`your-grove`) |

When in doubt: if you could replace "grove" with "blog" or "site" and the sentence still makes sense, it's the personal-space usage and should be wrapped.

---

## AlwaysGrove Terms

Only two terms remain `alwaysGrove` with no `standardTerm`:

| Term | Why |
|------|-----|
| **Grove** (platform brand, `your-grove`) | "Grove" is the brand name. It never swaps. |
| **Shade** | Scraping protection. The word IS the concept. It stays. |

All other terms now have a `standardTerm` and are fully swappable:

| Term | Standard | Previously |
|------|----------|-----------|
| Lattice | Engine | was alwaysGrove |
| Flow | Editor | was alwaysGrove |
| Gossamer | ASCII Effects | was alwaysGrove |
| Scribe | Transcription | was alwaysGrove |
| Reverie | Customizer | had no standard |
| Aria | Music Discovery | had no standard |
| Shutter | Content Retrieval | had no standard |
| Trace | Feedback | had no standard |

This means every term except Grove and Shade should be wrapped with `GroveSwap` or `resolveTerm()` for swap behavior. `GroveTerm` waystones remain valuable for discovery on first occurrence.

---

## Wrapping Decision Tree

Every bare Grove term in user-facing text follows this decision:

```
Is this "Grove" as the platform brand name, or "Shade"?
    │
    YES → Leave it bare. These are the only two alwaysGrove terms.
    │     (A GroveTerm waystone on first occurrence is still
    │      fine for teaching what Shade means, but GroveSwap
    │      would do nothing since there's no standard to swap to.)
    │
    NO (every other term has a standardTerm and is swappable)
    │
Can a Svelte component render in this context?
    │
    ├── NO (title tag, aria-label, toast, error message, prop string)
    │   └── Use resolveTerm('slug')
    │
    └── YES (template HTML)
        │
        Is this the first/prominent occurrence on this page?
            │
            ├── YES → GroveTerm (interactive waystone, 1-3 per page max)
            │
            └── NO → GroveSwap (silent, clean, unlimited)
```

### Component Selection Guide

| Context | Component | Example |
|---------|-----------|---------|
| First mention in a page heading | `GroveTerm` | `<h1><GroveTerm term="curios">Curios</GroveTerm></h1>` |
| Page subtitle teaching the inverse | `GroveIntro` | `<GroveIntro term="curios" />` |
| All subsequent template mentions | `GroveSwap` | `Back to <GroveSwap term="curios">Curios</GroveSwap>` |
| `<title>` tags | `resolveTerm()` | `<title>{resolveTerm('curios')} - {resolveTerm('arbor')}</title>` |
| `aria-label` attributes | `resolveTerm()` | `aria-label="Browse the {resolveTerm('canopy')} directory"` |
| `title` / `alt` attributes | `resolveTerm()` | `title="{resolveTerm('blazes')}"` |
| `brandTitle` props | `resolveTerm()` | `brandTitle={resolveTerm('meadow')}` |
| Toast messages | `resolveTerm()` | `` toast.success(`${resolveTerm('canopy')} settings saved!`) `` |
| Error messages | `resolveTerm()` | `` `You need to be signed in to use ${resolveTerm('reverie')}.` `` |
| Label maps / data arrays | `resolveTerm()` | `{ label: resolveTerm('seedling') }` |
| Markdown body text | `[[term]]` syntax | `Your [[bloom\|blooms]] are protected.` |

### The Per-Page Pattern

A well-wrapped page looks like this:

```svelte
<script lang="ts">
  import GroveTerm from "$lib/ui/components/ui/groveterm/GroveTerm.svelte";
  import GroveSwap from "$lib/ui/components/ui/groveterm/GroveSwap.svelte";
  import GroveIntro from "$lib/ui/components/ui/groveterm/GroveIntro.svelte";
  import { resolveTerm } from "$lib/ui/utils";
</script>

<svelte:head>
  <title>{resolveTerm('curios')} - {resolveTerm('arbor')}</title>
</svelte:head>

<!-- First occurrence: GroveTerm waystone for discovery -->
<h1><GroveTerm term="curios">Curios</GroveTerm></h1>
<GroveIntro term="curios" />

<!-- Subsequent mentions: GroveSwap for clean swapping -->
<p>Browse your <GroveSwap term="curios">curios</GroveSwap> collection.</p>
<a href="/arbor/curios">Back to <GroveSwap term="curios">Curios</GroveSwap></a>

<!-- Attributes: resolveTerm for string contexts -->
<button aria-label="Open {resolveTerm('curios')}">
```

The goal: 1-3 interactive waystones per page for discovery. Everything else swaps silently.

---

## Pre-Commit Hook

### Design

A new section added to `.git/hooks/pre-commit`, following the existing patterns for `csrf-ok` and `barrel-ok`.

### Two-Tier Term Matching

Not all Grove terms are equally risky as bare text. "Reverie" is almost certainly a feature reference. "bloom" could be a flower.

**Tier 1: Always Flag (unambiguous Grove terms)**

These words are rarely used in everyday English. Flag them regardless of capitalization.

```
Reverie, Arbor, Curios, Meadow, Heartwood, Terrarium, Canopy,
Lantern, Waystone, Gossamer, Vineyard, Centennial, Fireside,
Lumen, Zephyr, Patina, Mycelium, Warden, Loam, Burrow,
Foliage (when not in a file path), Lattice (when not in a package name)
```

**Tier 2: Capital-Only Flag (ambiguous English words)**

These are common English words. Only flag them when capitalized mid-sentence or as standalone words (suggesting a feature name, not prose).

```
Bloom, Blooms, Flow, Shade, Plant, Press, Trace, Notes, Rings,
Trails, Moss, Oak, Amber, Ivy, Hum, Reeds, Porch, Nook, Wisp,
Vines, Garden, Grove, Wanderer, Rooted, Seedling, Sapling,
Evergreen, Wander, Etch, Forage, Clearing, Vista, Forests,
Prism, Grafts, Workshop, Trove, Verge, Shutter, Aria, Outpost,
Passage, Pantry, Petal, Weave, Cairn
```

### What Gets Checked

- Staged `.svelte` files only (template sections)
- Lines containing a bare Grove term that is NOT already wrapped

### What Gets Skipped

- Lines inside `<script>` tags that are imports, type annotations, or variable declarations
- Lines already containing `GroveTerm`, `GroveSwap`, `GroveText`, `GroveSwapText`, `GroveIntro`
- Lines already containing `resolveTerm`, `resolveTermString`
- Lines already containing `[[` (bracket syntax for markdown integration)
- Lines with `grove-term-ok` on the same line or the next line
- HTML comments (`<!-- ... -->`)
- File paths and import strings

### Suppression

```svelte
<!-- Suppress in templates -->
<p>Watch the cherry blossoms bloom.</p> <!-- grove-term-ok -->

<!-- Suppress in script sections -->
const label = "Natural bloom cycle"; // grove-term-ok

<!-- Suppress on next line (Prettier sometimes moves inline comments) -->
<p>The flowers bloom beautifully.</p>
<!-- grove-term-ok -->
```

### Hook Output

```
✗ Bare Grove term detected in staged files
  The following lines contain Grove terms without wrapping:

  apps/ivy/src/routes/+page.svelte:22: <h1>Ivy Mail</h1>
    → Consider: <h1><GroveTerm term="ivy">Ivy</GroveTerm> Mail</h1>

  apps/ivy/src/routes/(app)/sent/+page.svelte:6: <title>Sent - Ivy</title>
    → Consider: <title>Sent - {resolveTerm('ivy')}</title>

  To suppress (intentional prose): add <!-- grove-term-ok --> or // grove-term-ok
```

---

## Tier Label Consolidation

Three components maintain duplicate bare `stageNames` / `tierLabels` maps:

- `libs/engine/src/lib/grafts/upgrades/components/CurrentStageBadge.svelte`
- `libs/engine/src/lib/grafts/upgrades/components/GardenStatus.svelte`
- `libs/vineyard/src/lib/components/vineyard/TierGate.svelte`

These should all call `resolveTerm()`:

```typescript
// Before (bare, duplicated)
const stageNames = {
  wanderer: "Wanderer",
  seedling: "Seedling",
  sapling: "Sapling",
  oak: "Oak",
  evergreen: "Evergreen",
};

// After (resolved, single source of truth)
const stageLabel = (tier: string) => resolveTerm(tier);
// Or for the full map:
const stageNames = $derived({
  wanderer: resolveTerm('wanderer'),
  seedling: resolveTerm('seedling'),
  sapling: resolveTerm('sapling'),
  oak: resolveTerm('oak'),
  evergreen: resolveTerm('evergreen'),
});
```

---

## Reactivity Notes

`resolveTerm()` reads `groveModeStore.current` synchronously. For the value to update when Grove Mode toggles:

- **In template expressions:** Reactive automatically. `title={resolveTerm('curios')}` re-evaluates on each render.
- **In `$derived` blocks:** Reactive. `const title = $derived(resolveTerm('curios'))` updates when the store changes.
- **In plain `let` assignments:** NOT reactive. `let title = resolveTerm('curios')` evaluates once and never updates. Avoid this pattern.

For `<title>` tags, use `$derived`:

```svelte
<script lang="ts">
  import { resolveTerm } from '@autumnsgrove/lattice/ui/utils';
  const pageTitle = $derived(`${resolveTerm('curios')} - ${resolveTerm('arbor')}`);
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>
```

Or inline directly:

```svelte
<svelte:head>
  <title>{resolveTerm('curios')} - {resolveTerm('arbor')}</title>
</svelte:head>
```

---

## Audit Summary

Current state as of March 2026:

| Area | Bare Instances | Files | Wrapped |
|------|---------------|-------|---------|
| apps/ (all 8 apps) | ~180 | ~70 | ~40 |
| libs/engine/src/routes/ | ~150 | ~50 | ~30 |
| libs/engine/src/lib/ | ~50 | ~20 | ~15 |
| libs/ (foliage, vineyard, gossamer) | ~35 | ~10 | 0 |
| **Total** | **~415** | **~150** | **~85** |

### Heaviest Offenders

| Term | Bare Count | Notes |
|------|-----------|-------|
| Meadow | ~30 | Standalone app + engine settings + landing |
| Curios | ~25 | 11 sub-page titles, 11 "Back to" links |
| Ivy | ~15 | Entire app unwrapped |
| Canopy | ~12 | Settings section, admin pages |
| Amber | ~12 | Entire app unwrapped |
| Tier names | ~20 | 3 duplicate label maps + pricing + filters |
| Wisp/Fireside | ~10 | aria-labels, headings, error messages |
| Porch | ~8 | Titles, back links |
| Reverie | ~8 | Headings, error messages, titles |

---

## Implementation Phases

### Phase 0: Foundation

- Write `grove-tier-labels.ts` utility (shared tier label resolution)
- Update Deer Sense skill with `grove-term-audit.md` reference
- Validate that standalone apps can import from `@autumnsgrove/lattice/ui`
  - Confirmed: Amber imports `Logo`, Meadow imports `GroveSwap`, Ivy imports `utils`
  - All apps already have `@autumnsgrove/lattice` as a workspace dependency

### Phase 1: Pre-Commit Hook

- Add `GROVE TERM COMPLIANCE CHECK` section to `.git/hooks/pre-commit`
- Implement two-tier matching (always-flag + capital-only)
- Implement `grove-term-ok` suppression (same-line and next-line)
- Test against staged files to verify false-positive rate
- Update `AgentUsage/pre_commit_hooks/` documentation

### Phase 2: Engine Routes (highest user visibility)

Priority order within this phase:

1. `arbor/curios/` — 11 sub-page titles + 11 "Back to Curios" links (one pattern)
2. `arbor/settings/` — Canopy, Meadow, Blazes, Forests section headings + toast messages
3. `arbor/reverie/` — headings, error strings, title
4. `arbor/garden/` — "Share to Meadow", "Delete Bloom" attributes
5. `+layout.svelte` — RSS title, footer text, Grove Mode toggle labels
6. `vineyard/` — layout heading, page attributes
7. `faq/` — title tag
8. Remaining routes: garden/, verify/, arbor/analytics, arbor/timeline, arbor/reeds, arbor/images, arbor/export, arbor/account, terrarium/, +error.svelte, (apps)/monitor, (apps)/domains

### Phase 3: Engine Components (lib/)

1. Tier label maps — consolidate CurrentStageBadge, GardenStatus, TierGate
2. FaqPage — accordion title strings (bodies are already wrapped)
3. PricingFineprint — section titles
4. LoginGraft — leave "Grove" brand alone, wrap "Wanderer" and any swappable terms
5. Wisp/Fireside components — WispButton, WispPanel, FiresideChat, MarkdownEditor
6. Lantern components — LanternFAB, LanternPanel, LanternAddFriends
7. SafetyMonitoring — Thorn, Petal headings
8. GutterManager — "Vines" heading
9. BetaWelcomeDialog, OnboardingChecklist, DomainChecker, ArborPanel, CurioAutocomplete

### Phase 4: Landing App

1. Hero components — HeroShade, HeroCentennial, HeroCommunity
2. Shade page — body text references
3. Porch pages — titles, "Back to Porch" links
4. Vista admin pages — Warden, Thorn, Petal, Meadow, Lumen headings
5. Pricing page — tier names
6. Vineyard page — layout nav, attributes
7. Knowledge/Museum — heading
8. Vision page — feature references
9. Remaining: contact, manifesto, feedback, compare, arbor pages, beyond

### Phase 5: Standalone Apps

1. **Ivy** — Import GroveSwap + resolveTerm. Wrap all 15 instances.
2. **Amber** — Import GroveSwap + resolveTerm. Wrap all 10 instances.
3. **Meadow** — Already has GroveSwap. Wrap remaining prose text + brandTitle props + feed titles.
4. **Clearing** — titles, nav labels
5. **Terrarium** — layout title, template text
6. **Domains (Forage)** — title, heading, description
7. **Login** — titles, "Welcome back Wanderer" heading. Leave "Grove" brand alone.
8. **Plant** — titles, success messages, account text. "Plant Your Blog" is a verb. use as appropriate.

### Phase 6: Non-Engine Libs

1. **libs/foliage/** — tier badges, CommunityThemeBrowser, CommunityThemeSubmit descriptions
2. **libs/vineyard/** — VineyardLayout philosophy strings, TierGate label map
3. **libs/gossamer/** — preset names (lowest priority, evaluate if user-visible)

---

## Deer Sense Integration

Add a new reference file at `.claude/skills/deer-sense/references/grove-term-audit.md` covering:

1. **What to check:** Every user-facing occurrence of a Grove term should use the appropriate wrapping mechanism
2. **The pattern:** GroveTerm for first occurrence (1-3/page), GroveSwap for subsequent, resolveTerm() for strings
3. **Common violations:** bare terms in `<title>`, `aria-label`, toast messages, tier label maps
4. **How to fix:** Import the component, wrap the text, use resolveTerm() for attributes
5. **Suppression:** `grove-term-ok` for intentional prose usage

Update the Deer Sense SCAN phase to include Grove term compliance as an automated check alongside WCAG, color contrast, and keyboard navigation.

---

## Implementation Checklist

- [ ] Write `grove-tier-labels.ts` shared utility
- [ ] Add pre-commit hook section with two-tier matching
- [ ] Add `grove-term-ok` suppression to pre-commit hook
- [ ] Test hook false-positive rate against current codebase
- [ ] Create Deer Sense `grove-term-audit.md` reference
- [ ] Phase 2: Wrap engine routes (~150 instances across ~50 files)
- [ ] Phase 3: Wrap engine components (~50 instances across ~20 files)
- [ ] Phase 4: Wrap landing app (~60 instances across ~30 files)
- [ ] Phase 5: Wrap standalone apps (~50 instances across ~30 files)
- [ ] Phase 6: Wrap non-engine libs (~35 instances across ~10 files)
- [ ] Final audit: run hook against entire codebase to verify zero violations
- [ ] Update MEMORY.md with compliance patterns

---

*Two languages. One forest. Every wanderer finds their way.*
