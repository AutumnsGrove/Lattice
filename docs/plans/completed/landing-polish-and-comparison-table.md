# Landing Page Polish + Competitor Comparison Table

**Issues:** #957 (comparison table), #958 (visual polish)
**Sequence:** #958 first (polish), then #957 (comparison table)
**Branch:** `feat/landing-polish-and-comparison`

---

## Context

The landing page has accumulated visual drift after recent additions (carousel, showcase grid — commit c10b5b18). Glassmorphism effects use inconsistent opacity values across three different systems (CSS `.glass-grove`, engine `GlassCard`, engine `GlassCarousel`). Spacing rhythm is uneven, and the page imports `GlassCard` without actually using it.

Before adding a new comparison table, we need to tighten the existing foundation so the new component fits cohesively.

## Bloodhound Scout Findings

### Current Page Structure (16 sections, top to bottom)

| # | Section | Container | Glass Pattern |
|---|---------|-----------|---------------|
| 1 | Header (engine) | sticky, `bg-surface/95 backdrop-blur-sm` | Engine chrome |
| 2 | Hero (logo, title, CTAs) | `max-w-4xl`, `mb-12` | None (transparent) |
| 3 | Hero Carousel | `max-w-4xl`, `mb-16` | `GlassCarousel variant="frosted"` |
| 4 | Launch Notice | `max-w-lg`, `mb-12` | `.glass-grove` + left accent border |
| 5 | Feature Grid (2x2) | `max-w-4xl`, `mb-16` | `.glass-grove` per card |
| 6 | Decorative Divider | leaf SVG | -- |
| 7 | Quick Links nav | flex wrap, `mb-12` | None |
| 8 | Roadmap Preview | `max-w-lg`, `mb-16` | `RoadmapPreview` (own glass) |
| 9 | "Who is Grove for?" | `max-w-2xl`, `mb-12` | `.glass-grove` |
| 10 | "Why I built this" | `max-w-2xl`, `mb-12` | `.glass-grove` |
| 11 | "What you get" | `max-w-2xl`, `mb-8` | `.glass-grove` |
| 12 | FAQ | `max-w-2xl`, `mb-12` | `.glass-grove` |
| 13 | Divider | leaf SVG | -- |
| 14 | Email Signup | -- | Own styling |
| 15 | Pricing Teaser | `max-w-md`, `mb-12` | None |
| 16 | Footer (engine) | -- | Engine chrome |

### Key Inconsistencies

1. **Glass opacity drift** -- `.glass-grove` = white/70, `GlassCard default` = white/60, `GlassCarousel frosted` = white/70
2. **Dark mode color families** -- `.glass-grove` uses `rgba(30,34,39)`, GlassCard uses `slate-800`, GlassCarousel uses `emerald-950`
3. **Border radius** -- Carousel uses `rounded-2xl`, everything else uses `rounded-xl`
4. **Spacing rhythm** -- Sections alternate between `mb-12` and `mb-16` without a pattern; "What you get" breaks to `mb-8`
5. **Max-width jumps** -- Four different widths (`max-w-4xl`, `max-w-2xl`, `max-w-lg`, `max-w-md`)
6. **Unused import** -- `GlassCard` is imported but never used; raw `.glass-grove` used instead
7. **Missing class** -- `btn-secondary` used in markup but not defined in `app.css`

### Engine Glass Components Available

- `Glass.svelte` -- Base wrapper (variant: surface/overlay/card/tint/accent/muted)
- `GlassCard.svelte` -- Primary card (variant: default/accent/dark/muted/frosted, hoverable, featured star, Gossamer)
- `GlassButton.svelte` -- Button (variant: default/accent/dark/ghost/outline)
- `GlassCarousel.svelte` -- Stack carousel (variant: default/frosted/minimal)
- `GlassOverlay.svelte` -- Fullscreen overlay
- `GlassNavbar.svelte` -- Sticky navbar
- `GlassConfirmDialog.svelte` -- Confirmation modal
- `GlassLegend.svelte` -- Status/color legend
- `Table` primitives -- TableHeader, TableBody, TableRow, TableCell, TableHead

---

## Phase A: #958 -- Visual Polish Pass

### A1. Normalize Section Spacing

Establish a consistent rhythm:
- **Major sections** (hero, carousel, features, comparison, roadmap): `mb-16`
- **Content sections** (who, why, benefits, FAQ): `mb-12`
- **Minor elements** (notices, dividers, quick links): `mb-12`
- **Section headings**: Consistent `mb-8` gap after all `<h2>` elements

Changes in `+page.svelte`:
- "What you get" section: `mb-8` -> `mb-12`
- All section `<h2>` elements: normalize to `mb-8`

### A2. Replace Raw `.glass-grove` with `GlassCard`

The landing page imports `GlassCard` but never uses it. Replace raw `.glass-grove rounded-xl p-6` divs with `<GlassCard>` for these sections:
- "Who is Grove for?"
- "Why I built this"
- "What you get"
- FAQ section

Keep `.glass-grove` for the Launch Notice (it's a lightweight callout with a left accent border -- GlassCard would be overkill).

### A3. Normalize Feature Grid Cards

The feature showcase grid currently uses raw `.glass-grove` with inline hover styles:
```
hover:bg-white/60 dark:hover:bg-emerald-950/40
```

Replace with `<GlassCard hoverable>` to get consistent hover behavior from the engine's design system.

### A4. Fix btn-secondary

The "Learn More" CTA uses `btn-secondary` which isn't defined in `app.css`. Two options:
- **Option A:** Define `.btn-secondary` in `app.css` as transparent bg with accent border
- **Option B (preferred):** Replace with `GlassButton variant="outline"`

Going with Option A (simpler, less refactoring of the CTA structure).

### A5. Test Mobile Responsiveness

Verify no overflow, proper stacking, touch targets >= 44x44px.

### Files Changed (Phase A)

| File | Change |
|------|--------|
| `packages/landing/src/routes/+page.svelte` | Spacing, GlassCard migration, btn fix |
| `packages/landing/src/app.css` | Add `.btn-secondary` definition |

---

## Phase B: #957 -- Competitor Comparison Table

### B1. Create `GlassComparisonTable` Engine Component

**Location:** `packages/engine/src/lib/ui/components/ui/GlassComparisonTable.svelte`

**Props:**
```typescript
interface ComparisonColumn {
  name: string;
  logo?: string;          // URL to logo image
  highlighted?: boolean;  // true for Grove (featured column)
  href?: string;          // link to platform
}

interface ComparisonRow {
  feature: string;
  description?: string;   // tooltip/detail text
  values: Record<string, string | boolean>;
  // boolean = checkmark/x, string = custom text like "$8/mo"
}

interface Props {
  columns: ComparisonColumn[];
  rows: ComparisonRow[];
  title?: string;
  description?: string;
  variant?: 'default' | 'frosted';
  class?: string;
}
```

**Desktop Layout:** Semantic HTML `<table>` with proper `<th scope>` attributes
- Grove column: subtle `bg-accent/10` highlight + top header accent
- Checkmarks: Green check icon with `aria-label="Yes"`
- X marks: Muted X icon with `aria-label="No"`
- Custom text: Rendered inline (e.g., "$8/mo", "Plugin")

**Mobile Layout (< md breakpoint):** Card-based comparison
- Each competitor becomes a card: "Grove vs. [Competitor]"
- Each card shows features side-by-side (Grove value | Competitor value)
- Keeps Grove visible in every comparison (no hidden columns)

**Accessibility:**
- `<table>` with `aria-label`
- `<th scope="col">` for column headers, `<th scope="row">` for feature names
- Icon-only cells get `aria-label` text
- Feature descriptions available via `title` attribute
- Keyboard navigable

### B2. Export from Engine

Add to `packages/engine/src/lib/ui/components/ui/index.ts`:
```typescript
export { default as GlassComparisonTable } from './GlassComparisonTable.svelte';
```

Verify export works via `@autumnsgrove/groveengine/ui`.

### B3. Add Comparison Data to Landing Page

Data lives as a `const` in `+page.svelte` (not fetched -- competitor details change rarely and should be hand-curated for honesty).

**Competitors (6):** Bear Blog, Substack, WordPress, Ghost, Tumblr

**Features to compare:**

| Feature | Grove | Bear Blog | Substack | WordPress | Ghost | Tumblr |
|---------|-------|-----------|----------|-----------|-------|--------|
| Custom subdomain included | Yes | Yes | No | No | No | Yes |
| 100-year domain guarantee | Yes | No | No | No | No | No |
| AI crawler protection (Shade) | Yes | No | No | Plugin | No | No |
| No algorithms / no engagement metrics | Yes | Yes | No | N/A | Partial | No |
| Full data export | Yes | Yes | Partial | Yes | Yes | Partial |
| Community features | Meadow | No | Notes | Plugin | Members | Dashboard |
| Open source / indie web aligned | Yes | Partial | No | Yes | Yes | No |
| Pricing starts at | $8/mo | Free/$5 | Free/$10 | Free/$4 | Free/$9 | Free |

Note: Must be honest and fair. Where competitors do something well, acknowledge it.

### B4. Integrate into Landing Page

**Placement:** After the Feature Showcase Grid, before the decorative divider.

Updated section order:
1. Hero (logo, title, CTAs)
2. Hero Carousel
3. Launch Notice
4. Feature Showcase Grid -- "What Grove Offers"
5. **NEW: Comparison Table** -- "How Grove Compares"
6. Decorative divider
7. Quick Links
8. Roadmap Preview
9. Who / Why / Benefits / FAQ
10. Email signup / Pricing / Footer

### B5. Test

- Desktop: Table layout with highlighted Grove column
- Mobile: Card-based "Grove vs X" layout
- Screen reader: Announce table structure and cell values
- Keyboard: Navigate cells with Tab
- Dark mode: Consistent with page glassmorphism

### Files Changed (Phase B)

| File | Change |
|------|--------|
| `packages/engine/src/lib/ui/components/ui/GlassComparisonTable.svelte` | NEW -- engine component |
| `packages/engine/src/lib/ui/components/ui/index.ts` | Export new component |
| `packages/landing/src/routes/+page.svelte` | Add comparison data + section |

---

## Design Decisions

### Why engine-first for the comparison table?

The engine-first pattern (AGENT.md) requires all reusable components live in the engine. A comparison table is generic enough to reuse across Grove properties (pricing page, vineyard pages). Building it in the engine prevents duplication.

### Why card-based mobile instead of horizontal scroll?

Horizontal-scrolling tables hide most columns behind a swipe gesture. Users can't see Grove's column while reading competitor data. Card-based layout keeps the comparison visible at all times -- each card shows "Grove vs. [Competitor]" with both values side by side.

### Why polish before building?

Adding a new glass component to an inconsistent foundation bakes in more drift. Normalizing spacing and glass usage first means the comparison table slots in cleanly with zero special cases.

### Why keep `.glass-grove` CSS class?

It's useful for lightweight callouts (Launch Notice) where the full `GlassCard` component would be overkill. The CSS class and the engine component can coexist -- they just serve different complexity levels.
