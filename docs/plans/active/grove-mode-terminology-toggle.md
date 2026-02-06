# Grove Mode: Terminology Toggle Plan

**Date:** 2026-02-06
**Status:** Planned
**Related:** #925 (GroveTerm component), grove-lexicon-audit.md

---

## Overview

Grove's nature-themed vocabulary is beautiful but can alienate newcomers. "Porch" gave no hint it was a support system. "Garden" doesn't say "blog" to someone who just arrived.

**The fix:** Default to standard/familiar terms. Offer a "Grove Mode" toggle that transforms the vocabulary for people who want the full experience.

**The philosophy:** Lead with clarity, reward with personality. On feature pages, introduce the Grove term in context — "Support (we call it the Porch)" — so the language becomes a gift, not a barrier.

---

## Design Decisions

| Decision | Answer |
|----------|--------|
| Default state | **OFF** — standard terms shown to new visitors |
| Toggle location | Footer (doesn't compete with theme/season toggles) |
| URL paths | Stay as Grove terms (`/porch`, `/garden`) — URLs are a separate contract from display labels |
| Subscription tiers | Seedling/Sapling/Oak/Evergreen **stay as-is** regardless of toggle |
| Nav label strategy | **Option A** — nav items reference term slugs, labels resolved at render time from manifest |
| "We call it X" pattern | Tasteful, on most Grove-named pages — a quick, pleasant way to learn the term |
| Persistence (anonymous) | localStorage |
| Persistence (authenticated) | D1 column via Heartwood session flow (DOs coordinate, D1 stores truth) |

---

## Term Classification

### Terms That Get Toggled

These show their standard equivalent when Grove Mode is OFF:

| Grove Term | Standard Term | Context |
|-----------|--------------|---------|
| Porch | Support | Help/conversation system |
| Garden | Blog | Content collection |
| Blooms | Posts | Individual pieces of writing |
| Arbor | Dashboard | Admin panel |
| Wanderer | Visitor | Anonymous users |
| Rooted | Subscriber | Paid/registered users |
| Curios | Decorations | Creative customizations |
| Foliage | Themes | Visual customization |
| Rings | Analytics | Visitor tracking & insights |
| Clearing | Status | System health page |
| Reeds | Comments | Reader responses |
| Meadow | Feed | Social layer |
| Forests | Communities | Group groves |
| Trails | Roadmap | Personal timelines |
| Waystone | Help | Contextual help markers |
| Vineyard | Showcase | Component/design demos |
| Terrarium | Component Builder | Drag-and-drop creative canvas |

### Terms That Stay (Always Grove)

These are shown regardless of toggle state:

| Term | Reason |
|------|--------|
| Grove | Platform name — you don't toggle your own brand |
| Flow | "Flow Editor" is self-explanatory |
| Shade | No clean standard equivalent for AI content protection |
| Scribe | Fairly intuitive for voice transcription |
| Seedling / Sapling / Oak / Evergreen | Subscription tiers — brand identity, not jargon |

> **Note:** This list is a living document. Add terms here as they're identified.

### Terms That Are Internal Only

These are operational/infrastructure terms users rarely see directly. No toggle needed:

Heartwood, Lumen, Zephyr, Vista, Patina, Mycelium, Passage, Lattice, Burrow, Petal, Warden, Press, Ivy, Verge, Gossamer, Amber, Loam, Plant, Thorn

---

## URL Routing Audit

### Routes WITH Standard-Term Redirects (Already Done)

| Standard URL | Grove URL | Redirect Type |
|-------------|----------|---------------|
| `/blog/*` | `/garden/*` | 301 in hooks.server.ts |
| `/admin/*` | `/arbor/*` | 301 in hooks.server.ts |
| `/admin/blog/*` | `/arbor/garden/*` | 301 (compound migration) |
| `admin` subdomain | `/arbor` routes | Subdomain routing in hooks.server.ts |

### Routes WITHOUT Standard-Term Redirects (Need Review)

These Grove-named routes have no standard-term equivalent URL:

| Grove URL | Standard Equivalent | Package | Action Needed |
|----------|-------------------|---------|---------------|
| `/porch` | `/support` already exists as separate page | landing | Clarify relationship — `/support` and `/porch` are separate pages. May need redirect or merge |
| `/forest` | `/communities` | landing | Consider adding redirect |
| `/vineyard` | `/showcase` or `/components` | engine, landing | Consider adding redirect |
| `/workshop` | This is arguably standard enough | landing | No action needed |
| `/beyond` | `/integrations` or `/tools` | landing | Consider adding redirect |
| `meadow.grove.place` | Subdomain, not a path | meadow | No action needed (brand subdomain) |
| `clearing.grove.place` | Uses standard `/status` internally | clearing | No action needed |

### Routes That Already Use Standard Terms

| URL | Notes |
|-----|-------|
| `/support` | Standard term already (separate from `/porch`) |
| `/contact` | Standard |
| `/feedback` | Standard |
| `/knowledge` | Standard |
| `/pricing` | Standard |
| `/roadmap` | Standard |

---

## Data Layer Changes

### Manifest Extension

Add two fields to `GroveTermEntry` in `types.ts`:

```typescript
export interface GroveTermEntry {
  slug: string;
  term: string;
  category: GroveTermCategory;
  tagline: string;
  definition: string;
  usageExample?: string;
  seeAlso?: string[];

  /** Standard/familiar equivalent shown when Grove Mode is OFF */
  standardTerm?: string;

  /** If true, always show the Grove term regardless of mode */
  alwaysGrove?: boolean;
}
```

**Rules:**
- `standardTerm` present → term gets toggled
- `alwaysGrove: true` → never toggled
- Neither → internal/operational term, not toggled (users don't see it)

### Manifest Generator Update

Update `scripts/generate/grove-term-manifest.ts` to pull `standardTerm` and `alwaysGrove` from the source markdown. Likely a new convention in `grove-naming.md`:

```markdown
## Porch
**Standard:** Support
**Tagline:** Front Porch Conversations
...
```

Or alternatively, maintain a separate mapping file for standard terms rather than modifying the naming philosophy doc.

---

## Store: `groveModeStore`

### File: `packages/engine/src/lib/ui/stores/grove-mode.svelte.ts`

Follows the exact pattern of `seasonStore` and `themeStore`:

- Svelte 5 reactive store class with `$state` and `$effect` runes
- `$effect.root()` for singleton pattern
- localStorage key: `"grove-mode"`
- Default: `false` (standard terms)
- try/catch for localStorage unavailability

### API

```typescript
class GroveModeStore {
  current: boolean;            // $state — true = Grove terms, false = standard
  toggle(): void;              // Flip the mode
  enable(): void;              // Turn Grove Mode on
  disable(): void;             // Turn Grove Mode off
}

export const groveModeStore: GroveModeStore;
```

### Export

Add to `packages/engine/src/lib/ui/stores/index.ts` barrel export.

---

## Component Changes

### 1. GroveTerm — Mode-Aware Display

**Current behavior:** Always shows Grove term with dotted underline + popup.

**New behavior:**

| Grove Mode | Display | Popup Content |
|-----------|---------|--------------|
| OFF | Standard term as plain text, with subtle indicator it's a Grove term | Shows the Grove term, its definition, and the metaphor — "we call this the Porch" |
| ON | Grove term with category-colored underline (current behavior) | Current popup behavior |

For `alwaysGrove` terms: always show Grove term regardless of mode.

The component reads `groveModeStore` internally — no prop changes needed for consumers.

### 2. Navigation — Slug-Based Label Resolution

**Current:** Hardcoded strings in `defaults.ts` / `tenant-nav.ts`:
```typescript
{ href: "/porch", label: "Porch", icon: Armchair }
```

**New:** Nav items carry a term slug, labels resolved at render time:
```typescript
{ href: "/porch", termSlug: "porch", fallbackLabel: "Porch", icon: Armchair }
```

A helper function resolves the display label:
```typescript
function resolveNavLabel(item: NavItem, groveMode: boolean, manifest: GroveTermManifest): string {
  if (!item.termSlug) return item.fallbackLabel;
  const entry = manifest[item.termSlug];
  if (!entry) return item.fallbackLabel;
  if (entry.alwaysGrove) return entry.term;
  return groveMode ? entry.term : (entry.standardTerm || entry.term);
}
```

This keeps the nav config as a single source of truth — the manifest drives everything.

### 3. Page-Level Introductions — `<GroveIntro>` Component

Rather than implementing introductions ad-hoc per page (which leads to inconsistency and forgotten pages), create a standardized component:

```svelte
<!-- Usage on any Grove-named page -->
<GroveIntro term="porch" />

<!-- Renders (when Grove Mode is OFF):
     Support — we call it the Porch
     with "Porch" as an interactive GroveTerm -->

<!-- Renders nothing when Grove Mode is ON -->
```

**Component behavior:**
- Reads `groveModeStore` — hidden entirely when Grove Mode is ON
- Pulls `standardTerm` and `term` from the manifest via the slug
- Renders: `{standardTerm} — we call it the {GroveTerm}`
- Uses `<GroveTerm>` inline so users can tap to learn more
- Shown below the page title or as a subtitle
- Tasteful, brief — one line, not a paragraph

**Introduction registry in the manifest:**

Add a `hasIntroPage` field to `GroveTermEntry` to track which terms should have page introductions:

```typescript
/** If true, a page exists for this feature and should show a GroveIntro */
hasIntroPage?: boolean;
```

This serves as both a checklist and an audit tool — any term with `hasIntroPage: true` that doesn't have a `<GroveIntro>` on its page is a gap to fill.

**Pages that need `<GroveIntro>`:**

| Route | Term Slug | Introduction |
|-------|----------|-------------|
| `/porch` | porch | "Support — we call it the Porch" |
| `/garden` | your-garden | "Blog — we call it the Garden" |
| `/arbor` | arbor | "Dashboard — we call it the Arbor" |
| `/forest` | forests | "Communities — we call it the Forest" |
| `/vineyard` | vineyard | "Showcase — we call it the Vineyard" |
| Status page | clearing | "Status — we call it the Clearing" |
| `/meadow` | meadow | "Feed — we call it the Meadow" |
| Arbor sub-pages | varies | e.g., "Analytics — we call it Rings" |

**Audit step (Phase 3):** Run a check that every manifest entry with `hasIntroPage: true` and a `standardTerm` has a corresponding `<GroveIntro>` component on its page. This can be a simple grep during review or a lint rule later.

### 4. Help Center Articles — "What is X?" Banners

The "What is Porch?" style articles are markdown files rendered by MarkdownIt at build time. We can't inject Svelte components into the markdown body (the `[[term]]` bracket syntax is already flaky enough). But we don't need to — the page wrapper is still a live Svelte component.

**How it works:**

The article page server loader (`/knowledge/[category]/[slug]/+page.server.ts`) already has the slug. Enhancement:

1. Server loader checks the slug against the grove-term manifest
2. If the article matches a term with a `standardTerm`, pass the term data alongside the doc
3. The `+page.svelte` wrapper renders a banner *above* the `{@html doc.html}` — not inside the markdown
4. Banner reads `groveModeStore` for reactivity

**Banner behavior:**

| Grove Mode | Banner |
|-----------|--------|
| OFF | Shows: "**Porch** is Grove's name for **Support** — the help and conversation system." |
| ON | Hidden — you're in the grove, you know the language |

**Matching logic:**

The loader doesn't need per-article configuration. The pattern is predictable:
- Article slug `what-is-porch` → term slug `porch`
- Article slug `what-is-arbor` → term slug `arbor`
- Strip the `what-is-` prefix, look up in manifest

If the manifest entry has a `standardTerm`, the banner renders. If not (e.g., `what-is-flow` where Flow is always-Grove), no banner. The manifest drives everything — no markdown files need editing.

**Why this works:**
- Zero changes to markdown files
- Zero changes to the MarkdownIt pipeline
- Automatic for all 40+ "What is X?" articles — manifest-driven, not per-file
- Reactive to grove mode at runtime (Svelte component, not prerendered HTML)
- Degrades gracefully: no manifest match = no banner = current behavior

**Articles that would get banners** (any `what-is-*` article whose term has a `standardTerm`):

| Article | Term | Banner Text |
|---------|------|-------------|
| what-is-porch | porch | "Porch is Grove's name for Support" |
| what-is-arbor | arbor | "Arbor is Grove's name for Dashboard" |
| what-is-my-garden | your-garden | "Garden is Grove's name for Blog" |
| what-is-rings | rings | "Rings is Grove's name for Analytics" |
| what-is-foliage | foliage | "Foliage is Grove's name for Themes" |
| what-is-clearing | clearing | "Clearing is Grove's name for Status" |
| what-is-meadow | meadow | "Meadow is Grove's name for Feed" |
| what-is-terrarium | terrarium | "Terrarium is Grove's name for Component Builder" |
| what-is-wisp | wisp | "Wisp is Grove's name for Writing Assistant" |
| ...etc | | |

Articles for always-Grove terms (what-is-flow, what-is-shade, what-is-grove) would have no banner since they have no `standardTerm`.

---

## Toggle UI

### Footer Placement

A small, unobtrusive toggle in the site footer:

- Leaf icon + "Grove Mode" label
- Simple on/off toggle (not a switch component — just a clickable element)
- When toggled ON, a brief toast or subtle animation acknowledges the change
- Matches the footer's existing visual style

### Account Settings (Phase 4)

For logged-in users, also available in account settings:
- Toggle with explanation: "Show Grove's nature-themed vocabulary instead of standard terms"
- Syncs to D1 via Heartwood session flow

---

## Rollout Phases

### Phase 1 — Foundation

**Files touched:**
- `packages/engine/src/lib/ui/components/ui/groveterm/types.ts` — add `standardTerm`, `alwaysGrove`
- `packages/engine/src/lib/data/grove-term-manifest.json` — add standard terms to entries
- `scripts/generate/grove-term-manifest.ts` — update generator
- `packages/engine/src/lib/ui/stores/grove-mode.svelte.ts` — new store
- `packages/engine/src/lib/ui/stores/index.ts` — export new store

**Tasks:**
1. Add `standardTerm` and `alwaysGrove` fields to `GroveTermEntry` type
2. Populate the manifest with standard equivalents for all toggled terms
3. Mark always-Grove terms (`alwaysGrove: true`)
4. Create `groveModeStore` with localStorage persistence
5. Export from stores barrel

### Phase 2 — Component Integration

**Files touched:**
- `packages/engine/src/lib/ui/components/ui/groveterm/GroveTerm.svelte` — mode-aware rendering
- `packages/engine/src/lib/ui/components/ui/groveterm/GroveTermPopup.svelte` — updated popup content
- `packages/engine/src/lib/ui/components/chrome/defaults.ts` — slug-based nav
- `packages/engine/src/lib/ui/components/chrome/tenant-nav.ts` — slug-based nav
- Chrome components that render nav items — consume resolved labels
- Footer component — add Grove Mode toggle

**Tasks:**
1. Update `GroveTerm` to read `groveModeStore` and display accordingly
2. Update `GroveTermPopup` to show "we call it X" when mode is OFF
3. Add `termSlug` to nav item types
4. Update nav configs with term slugs
5. Create `resolveNavLabel` helper
6. Update nav rendering components to use resolved labels
7. Add Grove Mode toggle to footer

### Phase 3 — Page Introductions & Help Center Banners

**Files touched:**
- `packages/engine/src/lib/ui/components/ui/groveterm/GroveIntro.svelte` — new component
- `packages/engine/src/lib/ui/components/ui/groveterm/index.ts` — export GroveIntro
- Individual page components for Grove-named features
- `grove-term-manifest.json` — add `hasIntroPage` flags
- `packages/landing/src/routes/knowledge/[category]/[slug]/+page.server.ts` — manifest lookup for article terms
- `packages/landing/src/routes/knowledge/[category]/[slug]/+page.svelte` — render banner above article HTML

**Tasks:**
1. Create `<GroveIntro>` component (standardized "we call it X" pattern)
2. Add `hasIntroPage` field to manifest entries that have corresponding pages
3. Place `<GroveIntro term="...">` on all pages listed in the introduction registry
4. Audit: verify every `hasIntroPage: true` entry has a `<GroveIntro>` on its page
5. Enhance article page server loader to detect `what-is-*` slugs and pass matched term data
6. Add manifest-driven banner to article page wrapper (Svelte, not markdown — reactive to grove mode)
7. Review and add standard-term redirects for Grove-named URLs that lack them

### Phase 4 — Authenticated Persistence

**Files touched:**
- D1 schema (user preferences table) — add `grove_mode` column
- Heartwood session flow — pass preference through
- `groveModeStore` — hydrate from session data when authenticated

**Tasks:**
1. Add `grove_mode BOOLEAN DEFAULT 0` to user preferences in D1
2. Include `grove_mode` in session data passed through Heartwood
3. Update store to hydrate from session data on authenticated page loads
4. On login: if localStorage has a preference, sync it up to D1 (don't lose anonymous choice)
5. On logout: keep localStorage value (graceful degradation)

---

## Open Questions

- **Porch vs Support pages:** `/porch` and `/support` currently coexist as separate pages. Should `/support` redirect to `/porch`, or should they remain distinct? (Support may be the "standard" landing, Porch the conversational interface.)
- **Workshop:** Is this a Grove term or just a standard word? It doesn't appear in the manifest. Probably fine as-is.
- **Beyond:** Same question — is `/beyond` a Grove term or just a page name?
- **Onboarding (Plant):** Should the toggle be offered during signup? "Want the full Grove experience?" moment.
- **Toast/animation on toggle:** What should happen visually when someone toggles Grove Mode on? A leaf unfurling? A subtle color shift?

---

## Related Files

| File | Purpose |
|------|---------|
| `packages/engine/src/lib/data/grove-term-manifest.json` | Term definitions (80 terms) |
| `packages/engine/src/lib/ui/components/ui/groveterm/` | GroveTerm component family |
| `packages/engine/src/lib/ui/stores/season.svelte.ts` | Pattern reference for store |
| `packages/engine/src/lib/ui/stores/theme.svelte.ts` | Pattern reference for store |
| `packages/engine/src/lib/ui/components/chrome/defaults.ts` | Navigation config |
| `packages/engine/src/lib/ui/components/chrome/tenant-nav.ts` | Tenant navigation config |
| `packages/engine/src/hooks.server.ts` | Existing URL redirects |
| `docs/audits/grove-lexicon-audit.md` | Full term usage audit (400+ locations) |
| `docs/philosophy/grove-naming.md` | Naming philosophy source |
| `scripts/generate/grove-term-manifest.ts` | Manifest generator |
| `packages/engine/src/lib/ui/components/ui/groveterm/GroveIntro.svelte` | Standardized page introduction component (new) |
| `packages/landing/src/routes/knowledge/[category]/[slug]/+page.server.ts` | Article page loader (enhance for term lookup) |
| `packages/landing/src/routes/knowledge/[category]/[slug]/+page.svelte` | Article page wrapper (add banner rendering) |
| `packages/landing/src/lib/utils/docs-loader.ts` | Markdown rendering pipeline (no changes needed) |
| `docs/help-center/articles/what-is-*.md` | 40+ "What is X?" articles (no changes needed — banner is manifest-driven) |
