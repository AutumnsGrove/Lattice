# Grove Mode Rollout: All Packages

**Date:** 2026-02-06
**Status:** Planned
**Related:** #925 (GroveTerm component), `docs/plans/completed/grove-mode-terminology-toggle.md`
**Depends On:** Grove Mode foundation (store, components, manifest) — already shipped

---

## Overview

Grove Mode is the accessibility toggle that swaps Grove's nature-themed vocabulary for standard web terms. When OFF (the default for newcomers), users see "Blog" instead of "Garden", "Dashboard" instead of "Arbor", "Support" instead of "Porch". When ON, they get the full Grove experience.

**The foundation is shipped:** `groveModeStore`, `GroveTerm`, `GroveSwap`, `GroveText`, `GroveSwapText`, `GroveIntro`, and the manifest with `standardTerm`/`alwaysGrove` fields all exist in the engine.

**Verified component locations:**
- `GroveIntro` → `packages/engine/src/lib/ui/components/ui/groveterm/GroveIntro.svelte` (exported from `groveterm/index.ts`)
- `GroveTerm` / `GroveSwap` / `GroveText` / `GroveSwapText` → same directory
- `groveModeStore` → `packages/engine/src/lib/ui/stores/grove-mode.svelte.ts`
- `grove-term-manifest.json` → `packages/engine/src/lib/data/grove-term-manifest.json`
- Engine Footer (with Grove Mode toggle) → `packages/engine/src/lib/ui/components/chrome/Footer.svelte`

**What this plan covers:** Closing every remaining gap across all monorepo packages so Grove Mode is complete end-to-end — every user-facing Grove term wrapped, every package site using the shared chrome Footer (with the toggle), and every Grove-named page showing a `GroveIntro` banner.

---

## Scope

### In Scope

| Package | Work |
|---------|------|
| **Engine** | Wrap ~39 remaining hardcoded terms in user-facing UI |
| **Landing** | Wrap ~26 remaining hardcoded terms, especially Workshop page |
| **Plant** | Replace custom chrome with engine Footer, wrap ~4 hardcoded terms |
| **Meadow** | Replace custom Footer with engine Footer, wrap ~10 hardcoded terms |
| **Clearing** | Replace custom Footer with engine Footer, minimal term wrapping |
| **All packages** | Add `GroveIntro` banners to every Grove-named page |

### Out of Scope

| Item | Reason |
|------|--------|
| **Domains (Forage)** | Internal tool, not user-facing. Skip entirely. |
| **Terrarium** | Low priority, not widely used. Skip entirely. |
| **Legacy term replacement** (posts→blooms in error messages, blog→garden in UI strings) | Separate effort. A GitHub issue will be created to track this. |
| **Authenticated persistence** (D1 column for grove_mode) | Phase 4 of the original plan. Not part of this rollout. |

---

## Phase 1: Engine Gaps

**Goal:** Make the source-of-truth package 100% Grove Mode complete.

### 1A: Navigation & Sidebar Labels

| File | Line(s) | Current | Fix |
|------|---------|---------|-----|
| `packages/engine/src/routes/arbor/+layout.svelte` | 84 | `Arbor (admin panel)` | Wrap "Arbor" with `GroveSwap` → "Dashboard" when OFF. Swap "(admin panel)" to "(dashboard)" or remove. |
| `packages/engine/src/routes/arbor/+layout.svelte` | 107 | `Dashboard` nav label | Replace with `GroveSwap term="arbor"` → shows "Dashboard" when OFF, "Arbor" when ON |
| `packages/engine/src/routes/arbor/+layout.svelte` | 109-111 | `Garden` nav label | Replace with `GroveSwap term="your-garden"` → shows "Blog" when OFF |

### 1B: Dashboard / Arbor Headings

| File | Line(s) | Current | Fix |
|------|---------|---------|-----|
| `packages/engine/src/routes/arbor/+page.svelte` | 81 | `<h1>Dashboard</h1>` | Wrap with `GroveSwap term="arbor"` |
| `packages/engine/src/routes/arbor/+page.svelte` | 172 | `Manage Garden` | Wrap with `GroveSwap term="your-garden"` → "Manage Blog" when OFF |
| `packages/engine/src/routes/arbor/safety/+page.svelte` | 90 | `Safety Dashboard` | Consider whether "Safety Dashboard" is standard enough to leave as-is |
| `packages/engine/src/routes/(apps)/monitor/+page.svelte` | 45 | `Infrastructure Monitoring Dashboard` | Standard term — likely leave as-is |

### 1C: Garden (Blog) Pages

| File | Line(s) | Current | Fix |
|------|---------|---------|-----|
| `packages/engine/src/routes/garden/+page.svelte` | 41 | `<h1>Garden</h1>` | `GroveSwap term="your-garden"` → "Blog" |
| `packages/engine/src/routes/garden/search/+page.svelte` | 95 | `Search Garden` | `GroveSwap` → "Search Blog" |
| `packages/engine/src/routes/garden/[slug]/+page.svelte` | 74 | `Back to Garden` | `GroveSwap` → "Back to Blog" |
| `packages/engine/src/routes/+layout.svelte` | 93 | `Garden Not Found` | `GroveSwap` → "Blog Not Found" |
| `packages/engine/src/routes/arbor/garden/+page.svelte` | 140 | `How the Garden Works` | `GroveSwap` → "How the Blog Works" |
| `packages/engine/src/routes/arbor/garden/edit/[slug]/+page.svelte` | 232 | `Back to Garden` | `GroveSwap` → "Back to Blog" |
| `packages/engine/src/routes/arbor/garden/new/+page.svelte` | 150 | `Back to Garden` | `GroveSwap` → "Back to Blog" |

### 1D: Bloom (Post) References

| File | Line(s) | Current | Fix |
|------|---------|---------|-----|
| `packages/engine/src/routes/arbor/garden/new/+page.svelte` | 151 | `New Bloom` heading | `GroveSwap term="blooms"` → "New Post" |
| `packages/engine/src/routes/arbor/garden/new/+page.svelte` | 158 | `Save Bloom` button | `GroveSwap` → "Save Post" |
| `packages/engine/src/routes/arbor/garden/new/+page.svelte` | 174 | `Bloom Details` | `GroveSwap` → "Post Details" |
| `packages/engine/src/routes/arbor/garden/new/+page.svelte` | 193 | `Your Bloom Title` placeholder | `GroveSwap` → "Your Post Title" |
| `packages/engine/src/routes/arbor/garden/new/+page.svelte` | 131 | `Bloom created!` toast | `GroveSwap` or conditional string |
| `packages/engine/src/routes/arbor/garden/edit/[slug]/+page.svelte` | 234 | `Edit Bloom` heading | `GroveSwap` → "Edit Post" |
| `packages/engine/src/routes/arbor/garden/edit/[slug]/+page.svelte` | 289 | `Bloom Details` | `GroveSwap` → "Post Details" |
| `packages/engine/src/routes/arbor/garden/edit/[slug]/+page.svelte` | 309 | `Your Bloom Title` placeholder | `GroveSwap` → "Your Post Title" |
| `packages/engine/src/routes/arbor/garden/edit/[slug]/+page.svelte` | 515 | `Delete Bloom` dialog | `GroveSwap` → "Delete Post" |
| `packages/engine/src/routes/arbor/garden/edit/[slug]/+page.svelte` | 132, 181, 183, 206 | Toast messages (`Bloom saved`, `Bloom published`, etc.) | Conditional strings using `groveModeStore` |

**Note on toasts:** Toast messages are strings passed to `toast.success()`, not rendered Svelte. These need a helper function:

```typescript
import { groveModeStore } from '@autumnsgrove/groveengine/ui/stores';

function groveLabel(groveTerm: string, standardTerm: string): string {
  return groveModeStore.current ? groveTerm : standardTerm;
}

// Usage:
toast.success(`${groveLabel('Bloom', 'Post')} saved successfully!`);
```

Consider creating this as a shared utility in the engine: `resolveTermString(groveText, standardText)`.

### 1E: Wanderer & Login

| File | Line(s) | Current | Fix |
|------|---------|---------|-----|
| `packages/engine/src/routes/auth/login/+page.svelte` | 43 | `'Admin Panel'` / `'Welcome, Wanderer'` | Swap "Admin Panel" → `GroveSwap term="arbor"` with "Dashboard" text. "Welcome, Wanderer" → `GroveSwap term="wanderer"` with "Welcome" when OFF. |
| `packages/engine/src/routes/auth/login/+page.svelte` | 46 | `Sign in to access the admin panel` | Swap "admin panel" → conditional |
| `packages/engine/src/lib/grafts/login/LoginGraft.svelte` | 180 | `Welcome back, Wanderer` | `GroveSwap` → "Welcome back" when OFF |
| `packages/engine/src/routes/arbor/curios/gallery/+page.svelte` | 230, 251 | `for most Wanderers` / `for all Wanderers` | `GroveSwap` → "for most visitors" |
| `packages/engine/src/routes/+page.svelte` | 24 | `Sign in to the admin panel` | Swap "admin panel" → conditional |

### 1F: Trails

| File | Line(s) | Current | Fix |
|------|---------|---------|-----|
| `packages/engine/src/routes/arbor/timeline/+page.svelte` | 163, 165 | `Trails wind through...` / `Trails provides...` | `GroveSwap` in the first mention → "Roadmaps"; leave the prose as descriptive context |
| `packages/engine/src/routes/arbor/account/FeaturesCard.svelte` | 44 | `Trail` label | `GroveSwap term="trails"` → "Roadmap" |

### 1G: "Coming in Full Bloom" Pattern

| File | Line(s) | Current | Fix |
|------|---------|---------|-----|
| `packages/engine/src/routes/arbor/analytics/+page.svelte` | 22 | `Coming in Full Bloom (Early Summer)` | This is marketing/seasonal copy, not a term swap. **Leave as-is.** |
| `packages/engine/src/routes/arbor/curios/journey/+page.svelte` | 41 | Same | **Leave as-is.** |
| `packages/engine/src/routes/(apps)/domains/+page.svelte` | 112 | Same | **Leave as-is.** |

> "Coming in Full Bloom" is a seasonal release metaphor, not a togglable term. It's self-explanatory in context.

### 1H: Admin Panel Mentions

| File | Line(s) | Current | Fix |
|------|---------|---------|-----|
| `packages/engine/src/routes/arbor/garden/+page.svelte` | 57 | `This admin panel is publicly accessible` | Swap "admin panel" → use `GroveSwap` or conditional text |

**Phase 1 estimated scope:** ~39 edits across ~12 files.

---

## Phase 2: Landing Gaps

**Goal:** Ensure the public-facing site — the first thing newcomers see — has complete Grove Mode coverage.

### 2A: Workshop Page (Highest Density)

The Workshop page (`packages/landing/src/routes/workshop/+page.svelte`) is the single densest page needing attention. Tool names already use `termSlug` for resolution, but the **description text** within each tool card contains hardcoded Grove terms.

**Strategy:** Workshop tool definitions are data objects with string `description` fields. These strings are rendered at line ~1133 in the workshop page as:

```svelte
<p class="text-foreground-muted mb-4 leading-relaxed">
    {tool.description}
</p>
```

The fix has two parts:

1. **Data strings:** Add `[[term]]` bracket syntax to the description strings in the tool data objects (e.g., `"for all [[wanderer|Wanderers]]"`)
2. **Rendering:** Replace `{tool.description}` with `<GroveSwapText content={tool.description} manifest={groveTermManifest} />` — this parses `[[term]]` syntax and silently swaps terms

| Location | Term | Count | Fix |
|----------|------|-------|-----|
| Tool descriptions | `Wanderer` / `Wanderers` | 9 instances | Replace with `[[wanderer\|Wanderer]]` in data strings |
| Tool descriptions | `Rooted` | 1 instance | Replace with `[[rooted\|Rooted]]` |
| Tool descriptions | `Wayfinder` | 1 instance | Replace with `[[wayfinder\|Wayfinder]]` |
| Tool descriptions | `Pathfinder` | 1 instance | Replace with `[[pathfinder\|Pathfinder]]` |
| Tool descriptions | `Arbor` (in context) | 5 instances | Replace with `[[arbor\|Arbor]]` |
| Tool descriptions | `Meadow` (in context) | 1 instance | Replace with `[[meadow\|Meadow]]` |
| Tool descriptions | `Reeds` (in context) | 1 instance | Replace with `[[reeds\|Reeds]]` |
| Tool descriptions | `Foliage` (in context) | 2 instances | Replace with `[[foliage\|Foliage]]` |
| Rendering (line ~1133) | — | 1 change | Replace `{tool.description}` with `<GroveSwapText content={tool.description} manifest={groveTermManifest} />` |

Similarly, the `integration` field strings (e.g., `"for all Wanderers"`) are rendered elsewhere in the card — apply the same `[[term]]` + `<GroveSwapText>` pattern there.

**Decision:** Use `<GroveSwapText>` for tool card descriptions — popups in a dense grid would be noisy. Reserve `<GroveTerm>` for dedicated feature pages where users are focused.

### 2B: Other Landing Pages

| File | Term | Line(s) | Fix |
|------|------|---------|-----|
| `packages/landing/src/routes/arbor/+page.svelte` | "Wanderer Feedback" | 42 | `GroveSwap` → "Visitor Feedback" |
| `packages/landing/src/routes/arbor/+page.svelte` | "conversations from Wanderers" | 96 | `GroveSwap` → "conversations from visitors" |
| `packages/landing/src/routes/arbor/+page.svelte` | "The Porch" heading | 94 | `GroveSwap` → "Support" |
| `packages/landing/src/routes/arbor/comped-invites/+page.svelte` | "Comped Wanderers" | 401 | `GroveSwap` → "Comped visitors" |
| `packages/landing/src/routes/arbor/feedback/+page.svelte` | "Wanderer feedback" aria-label | 151 | `GroveSwap` or conditional |
| `packages/landing/src/routes/arbor/porch/[id]/+page.svelte` | "Wanderer" fallback name | 85 | Conditional string |
| `packages/landing/src/routes/vision/+page.svelte` | "Every Wanderer is a tree" | 85 | `GroveSwap` → "Every visitor is a tree" |
| `packages/landing/src/routes/porch/visits/+page.svelte` | "conversations with the Wayfinder" | 49 | `GroveSwap` → "conversations with support" |

**Phase 2 estimated scope:** ~26 edits across ~8 files.

---

## Phase 3: Plant (Onboarding & Payments)

**Goal:** Bring Plant in line with the shared chrome pattern and wrap its few hardcoded terms.

### 3A: Chrome Unification

Plant currently has a **custom inline header and footer** in `packages/plant/src/routes/+layout.svelte`. It does NOT use the engine's shared `Header` or `Footer` components.

**Action:** Replace Plant's custom footer with the engine's shared `Footer` component. This gives Plant the Grove Mode toggle automatically.

**Files to modify:**
- `packages/plant/src/routes/+layout.svelte` — Remove inline footer (lines ~179-196), import and render `Footer` from `@autumnsgrove/groveengine/ui/chrome`

**Note on header:** Plant's header has onboarding-specific step indicators integrated. Replacing the header may not be straightforward — evaluate whether the engine's `Header` can accommodate the step indicator via slots or props. If not, keep Plant's custom header but ensure the footer is unified.

### 3B: Term Wrapping

| File | Term | Line(s) | Fix |
|------|------|---------|-----|
| `packages/plant/src/lib/components/OnboardingChecklist.svelte` | "Wanderer" | 172 | `GroveSwap` → "Let's get started" (drop the term when OFF) |
| `packages/plant/src/routes/comped/+page.svelte` | "Wanderers" | 80 | `GroveSwap` → "visitors" or "early supporters" |

**Phase 3 estimated scope:** Footer swap (1 file), ~2 term edits.

---

## Phase 4: Meadow (Community Feed)

**Goal:** Unify Meadow's chrome and wrap its Grove terminology.

### 4A: Chrome Unification

Meadow **uses the engine's Header** but has a **custom Footer** at `packages/meadow/src/lib/components/Footer.svelte`.

**Action:** Replace Meadow's custom `Footer` with the engine's shared `Footer` component. This gives Meadow the Grove Mode toggle.

**Files to modify:**
- `packages/meadow/src/routes/+page.svelte` — Replace local Footer import with engine Footer
- `packages/meadow/src/lib/components/Footer.svelte` — Can be deleted after migration (or kept as reference temporarily)

**Note:** The custom footer has a tagline "Where the forest opens up." — this drops in favor of the standard Grove tagline ("A place to Be"). See Cross-Cutting Concerns > Chrome Footer Unification for rationale.

### 4B: Term Wrapping

| File | Term | Line(s) | Fix |
|------|------|---------|-----|
| `packages/meadow/src/routes/+page.svelte` | "Meadow" in headings | 43, 59, 79, 149, 156, 182 | `GroveSwap term="meadow"` → "Community Feed" in key headings. The product name in narrative prose can stay as-is where it reads naturally. |
| `packages/meadow/src/routes/+page.svelte` | "clearing in the forest" | 83 | `GroveSwap term="clearing"` for "clearing" → "status page" |
| `packages/meadow/src/routes/+page.svelte` | "Grove" (brand) | throughout | **Leave as-is** — brand name, always shown |
| `packages/meadow/src/lib/components/EmailSignup.svelte` | "when Grove blooms" | 62 | Poetic/marketing copy — **leave as-is** |

**Phase 4 estimated scope:** Footer swap (2 files), ~8 term edits.

---

## Phase 5: Clearing (Status Page)

**Goal:** Unify Clearing's chrome. Minimal term wrapping needed.

### 5A: Chrome Unification

Clearing **uses the engine's Header** but has a **custom Footer** at `packages/clearing/src/lib/components/Footer.svelte`.

**Action:** Replace Clearing's custom `Footer` with the engine's shared `Footer` component.

**Files to modify:**
- `packages/clearing/src/routes/+page.svelte` — Replace local Footer import with engine Footer
- `packages/clearing/src/routes/incidents/[slug]/+page.svelte` — Same
- `packages/clearing/src/lib/components/Footer.svelte` — Can be deleted after migration

**Note:** Clearing's custom footer has a description "A clearing in the forest where you can see what's happening." — this drops in favor of the standard Grove tagline. See Cross-Cutting Concerns > Chrome Footer Unification for rationale.

### 5B: Term Wrapping

Clearing has **no hardcoded identity terms** (Wanderer, Rooted, etc.). The only Grove vocabulary is the brand name "Grove" and structural references to "clearing."

| File | Term | Fix |
|------|------|-----|
| `packages/clearing/src/routes/+page.svelte` | `brandTitle="Status"` on Header | Already using the standard term. No change needed. |

**Phase 5 estimated scope:** Footer swap (3 files), ~0 term edits.

---

## Phase 6: GroveIntro Rollout (Cross-Package)

**Goal:** Add the standardized `<GroveIntro>` banner ("Support — we call it the Porch") to every Grove-named page across all packages.

### Pages Needing `<GroveIntro>`

| Route | Package | Term Slug | Banner |
|-------|---------|-----------|--------|
| `/garden` | Engine | your-garden | "Blog — we call it the Garden" |
| `/garden/search` | Engine | your-garden | "Blog Search — we call it the Garden" |
| `/arbor` | Engine | arbor | "Dashboard — we call it the Arbor" |
| `/arbor/garden` | Engine | your-garden | "Blog Manager — we call it the Garden" |
| `/arbor/garden/new` | Engine | blooms | "New Post — we call it a Bloom" |
| `/arbor/timeline` | Engine | trails | "Roadmap — we call it Trails" |
| `/arbor/curios` | Engine | curios | "Decorations — we call it Curios" |
| `/arbor/analytics` | Engine | rings | "Analytics — we call it Rings" |
| `/porch` | Landing | porch | "Support — we call it the Porch" |
| `/forest` | Landing | forests | "Communities — we call it the Forest" |
| `/vineyard` | Landing/Engine | vineyard | "Showcase — we call it the Vineyard" |
| Meadow homepage | Meadow | meadow | "Community Feed — we call it Meadow" |
| Clearing homepage | Clearing | clearing | "Status — we call it the Clearing" |

### Implementation

Each page adds a single line below the page title:

```svelte
<GroveIntro term="arbor" manifest={groveTermManifest} />
```

The component handles all logic internally:
- Hidden when Grove Mode is ON (you know the language already)
- Shows "Dashboard — we call it the Arbor" when Grove Mode is OFF
- "Arbor" rendered as an interactive `GroveTerm` for discoverability

**Phase 6 estimated scope:** ~13 pages, 1 line each.

---

## Phase 7: Shared Utility for Dynamic Strings

**Goal:** Create a utility for non-Svelte contexts (toasts, aria-labels, data attributes) where components can't be used.

### The Problem

`GroveTerm` and `GroveSwap` are Svelte components. They can't be used inside:
- `toast.success("Bloom saved!")` — string argument
- `aria-label="Wanderer feedback"` — string attribute
- Data object descriptions — JavaScript strings

### The Solution

Add a reactive helper function to the engine:

```typescript
// packages/engine/src/lib/ui/utils/grove-term-resolve.ts

import { groveModeStore } from '../stores/grove-mode.svelte';
import manifest from '../../data/grove-term-manifest.json';

/**
 * Resolve a term slug to its display string based on current Grove Mode.
 * For use in non-component contexts (toasts, aria-labels, data strings).
 */
export function resolveTerm(slug: string): string {
  const entry = manifest[slug];
  if (!entry) return slug;
  if (entry.alwaysGrove) return entry.term;
  return groveModeStore.current ? entry.term : (entry.standardTerm || entry.term);
}

/**
 * Resolve a string with inline Grove/standard pairs.
 * Usage: resolveTermString("Bloom", "Post") → "Post" when OFF, "Bloom" when ON
 */
export function resolveTermString(groveTerm: string, standardTerm: string): string {
  return groveModeStore.current ? groveTerm : standardTerm;
}
```

This utility should be created in Phase 1 since the engine needs it immediately for toast messages.

**Export path:** `@autumnsgrove/groveengine/ui/utils`

---

## Execution Order

```
Phase 7 (Utility)      ← Create resolveTermString() first — needed by Phases 1-5
    ↓
Phase 1 (Engine)       ← Fix the core: 39 edits, 12 files
    ↓
Phase 2 (Landing)      ← Fix the public face: 26 edits, 8 files
    ↓
Phase 3 (Plant)        ← Unify chrome, wrap terms: 3 files
    ↓
Phase 4 (Meadow)       ← Unify chrome, wrap terms: 4 files
    ↓
Phase 5 (Clearing)     ← Unify chrome only: 3 files
    ↓
Phase 6 (GroveIntro)   ← Polish pass: 13 pages, 1 line each
```

**Total estimated scope:** ~30 files, ~100 individual edits.

---

## Deferred: Legacy Term Replacement

> **This is NOT part of this rollout.** A GitHub issue will be created to track it separately.

The grove-lexicon-audit identified 100+ locations where legacy terms ("posts", "blog", "user", "subscriber") appear in user-facing text and should be replaced with Grove terminology. Examples:

- `"Failed to create post"` → `"Failed to create bloom"` (or `resolveTermString('bloom', 'post')`)
- `"Blog Posts"` heading → `"Blooms"` / `"Posts"`
- `"50 posts"` in tier descriptions → `"50 blooms"` / `"50 posts"`
- `"Search posts..."` placeholder → `"Search blooms..."` / `"Search posts..."`

These are a separate concern from the Grove Mode toggle work because they're about replacing **old terminology that was never updated**, not about making existing Grove terms toggleable. The legacy term pass should happen after this rollout is complete so we can use the same `GroveSwap`/`resolveTermString` infrastructure.

**Action:** Create a GitHub issue titled `chore: Legacy term replacement pass (posts→blooms, blog→garden, user→wanderer)` with the lexicon audit as reference, and tag it for the next sprint.

**Issue body should include:**
- Reference to `docs/audits/grove-lexicon-audit.md` for the full hit list
- Key files: `packages/engine/src/routes/arbor/garden/new/+page.svelte`, `packages/engine/src/routes/arbor/garden/edit/[slug]/+page.svelte`, `packages/durable-objects/src/tiers.ts`, `packages/engine/src/lib/components/admin/MarkdownEditor.svelte`
- Dependency: Requires this Grove Mode rollout to be complete first (shared `resolveTermString` utility needs to exist)
- Label: `chore`

> **TODO:** This issue could not be auto-created (`gh` CLI was unavailable). Create it manually before starting Phase 1.

---

## Cross-Cutting Concerns

### Chrome Footer Unification

Three packages need their custom footers replaced with the engine's shared `Footer`:

| Package | Current Footer | Engine Header? | Action |
|---------|---------------|----------------|--------|
| **Plant** | Custom inline in +layout.svelte | Custom (onboarding steps) | Replace footer only |
| **Meadow** | Custom component `$lib/components/Footer.svelte` | Engine Header | Replace footer |
| **Clearing** | Custom component `$lib/components/Footer.svelte` | Engine Header | Replace footer in 2 page files |

**Important:** The engine Footer has the Grove Mode toggle built in. Once these packages use the shared Footer, users can toggle Grove Mode on every site.

**Engine Footer props (verified):**

```typescript
interface Props {
    resourceLinks?: FooterLink[];  // Override default resource links
    connectLinks?: FooterLink[];   // Override default connect links
    legalLinks?: FooterLink[];     // Override default legal links
    season?: Season;               // Override season (defaults to seasonStore)
    maxWidth?: MaxWidth;           // 'narrow' | 'default' | 'wide'
}
```

The engine Footer has a **hardcoded brand section**: Grove logo, "A place to Be" tagline, and "A quiet corner of the internet..." description. There are **no slots or props** for per-site taglines.

**Impact on custom footer taglines:**
- Meadow's "Where the forest opens up." → **Drops.** The unified footer uses the standard Grove tagline. This is acceptable — the Grove brand identity should be consistent across properties.
- Clearing's "A clearing in the forest..." → **Drops.** Same rationale.
- If per-site taglines are needed later, the engine Footer can be extended with a `tagline` prop — but that's out of scope for this rollout.

### Cross-Site localStorage

Each package deploys to a different origin (e.g., `plant.grove.place`, `meadow.grove.place`). localStorage is per-origin, so toggling Grove Mode on one site won't affect another.

**This is acceptable for now.** The default is OFF everywhere, so newcomers always see standard terms. When authenticated persistence ships (Phase 4 of the original plan), the preference will sync via D1/Heartwood session data.

### Testing Strategy

After each phase, manually verify:

1. **Toggle ON/OFF** on each affected site
2. **Check every modified page** — terms swap correctly
3. **No layout shifts** from different-length text (e.g., "Blog" vs "Garden")
4. **GroveIntro banners** show when OFF, hide when ON
5. **Toasts and dynamic strings** resolve correctly
6. **Mobile responsiveness** preserved (text wrapping, touch targets)
7. **Footer toggle** appears and works on Plant, Meadow, Clearing

---

## Files Reference (Quick Lookup)

### Engine Files to Modify (~12 files)
- `src/routes/arbor/+layout.svelte` — Sidebar nav labels
- `src/routes/arbor/+page.svelte` — Dashboard heading, quick actions
- `src/routes/arbor/safety/+page.svelte` — Safety heading (evaluate)
- `src/routes/garden/+page.svelte` — Garden heading
- `src/routes/garden/search/+page.svelte` — Search heading
- `src/routes/garden/[slug]/+page.svelte` — Back link
- `src/routes/+layout.svelte` — "Garden Not Found" error
- `src/routes/+page.svelte` — Onboarding text
- `src/routes/arbor/garden/+page.svelte` — Section headings, notice text
- `src/routes/arbor/garden/new/+page.svelte` — All Bloom references
- `src/routes/arbor/garden/edit/[slug]/+page.svelte` — All Bloom references
- `src/routes/auth/login/+page.svelte` — Login heading/subheading
- `src/lib/grafts/login/LoginGraft.svelte` — Welcome heading
- `src/routes/arbor/curios/gallery/+page.svelte` — Wanderer references
- `src/routes/arbor/timeline/+page.svelte` — Trails references
- `src/routes/arbor/account/FeaturesCard.svelte` — Trail label

### Landing Files to Modify (~8 files)
- `src/routes/workshop/+page.svelte` — 20+ terms in tool descriptions
- `src/routes/arbor/+page.svelte` — Wanderer, Porch references
- `src/routes/arbor/comped-invites/+page.svelte` — Wanderer reference
- `src/routes/arbor/feedback/+page.svelte` — Wanderer aria-label
- `src/routes/arbor/porch/[id]/+page.svelte` — Wanderer fallback
- `src/routes/vision/+page.svelte` — Wanderer in prose
- `src/routes/porch/visits/+page.svelte` — Wayfinder reference

### Plant Files to Modify (~3 files)
- `src/routes/+layout.svelte` — Footer replacement
- `src/lib/components/OnboardingChecklist.svelte` — Wanderer
- `src/routes/comped/+page.svelte` — Wanderers

### Meadow Files to Modify (~3 files)
- `src/routes/+page.svelte` — Footer swap + Meadow/Clearing terms
- `src/lib/components/Footer.svelte` — Delete after migration (or keep for reference)
- `src/lib/components/EmailSignup.svelte` — Evaluate "when Grove blooms" (likely leave)

### Clearing Files to Modify (~3 files)
- `src/routes/+page.svelte` — Footer swap
- `src/routes/incidents/[slug]/+page.svelte` — Footer swap
- `src/lib/components/Footer.svelte` — Delete after migration

---

*Last updated: 2026-02-06*
