# GlassCard Prop Migration Plan

> Consolidate manual icon and waystone boilerplate across the monorepo
> using GlassCard's `icon`, `iconClass`, `waystone`, and `waystoneLabel` props.

## Context

Issue #1363 added `waystone` and `waystoneLabel` props to GlassCard.
The `icon` prop has existed since inception but has **zero consumers** —
every icon is rendered manually. A comprehensive monorepo-wide audit found:

- **30 GlassCard icon instances** across 12+ files that could migrate
- **7 waystone instances** across 3 files (3 in settings are true candidates)
- **1 dead Waystone import** to clean up
- **14+ icon instances** that are intentionally custom (hero layouts, stat cards, decorative rings)
- **Roadmap page** uses custom `<li>` items (not GlassCard) with its own icon registry

### Style Mismatch Note

Some pages (vision, contribute) use custom heading styles on their card titles
(`font-serif text-accent-muted` vs GlassCard's default `text-lg font-semibold text-foreground`).
Migrating these to the `title` prop changes their visual styling. Options:

1. **Accept the default** — let GlassCard unify heading styles (recommended)
2. **Add `titleClass` prop** — like `iconClass`, allows style overrides (future scope)

This plan takes Option 1 unless the visual difference is unacceptable.

---

## Prerequisites

### Step 0: Add `iconClass` prop to GlassCard

The `icon` prop currently hardcodes `text-muted-foreground` (line 317).
Most migration candidates need custom colors (success green, primary,
grove-600, accent-subtle). Add an optional `iconClass` prop:

```svelte
/** Additional CSS classes for the icon (overrides default text-muted-foreground) */
iconClass?: string;
```

Render change:
```svelte
<icon class="w-5 h-5 shrink-0 {iconClass || 'text-muted-foreground'}"></icon>
```

**File:** `libs/engine/src/lib/ui/components/ui/GlassCard.svelte`
**Risk:** None — additive, backwards compatible.

---

## Phase 1: Clean Icon Migrations (no `iconClass` needed)

These match GlassCard's built-in icon styling exactly (w-5 h-5, muted color).

### 1a. Admin Analytics Components

| File | Icon | Title | Line |
|------|------|-------|------|
| `libs/engine/src/lib/components/admin/ZephyrAnalytics.svelte` | `TrendingUp` | Broadcast History | ~135 |
| `libs/engine/src/lib/components/admin/ZephyrAnalytics.svelte` | `Clock` | Recent Broadcasts | ~156 |
| `libs/engine/src/lib/components/admin/LumenAnalytics.svelte` | `Activity` | Today's Usage by Task | ~159 |
| `libs/engine/src/lib/components/admin/LumenAnalytics.svelte` | `Database` | (model usage section) | ~197 |
| `libs/engine/src/lib/components/admin/LumenAnalytics.svelte` | `Clock` | Recent Requests | ~230 |

**Before:**
```svelte
<GlassCard variant="frosted">
  <h3 class="... flex items-center gap-2">
    <TrendingUp class="w-5 h-5 text-foreground-subtle" />
    Broadcast History
  </h3>
```

**After:**
```svelte
<GlassCard variant="frosted" title="Broadcast History" icon={TrendingUp}>
```

### 1b. Minecraft WorldManager

| File | Icon | Title | Line |
|------|------|-------|------|
| `apps/landing/src/routes/arbor/minecraft/WorldManager.svelte` | `Map` | (world info) | ~179 |

**Instances: 6 | Files: 3**

---

## Phase 2: Icon Migrations Needing `iconClass`

These need the `iconClass` prop from Step 0.

### 2a. Export Page

| File | Icon | Title | iconClass | Line |
|------|------|-------|-----------|------|
| `libs/engine/src/routes/arbor/export/+page.svelte` | `Clock` | Past Exports | _(default)_ | ~399 |
| `libs/engine/src/routes/arbor/export/+page.svelte` | `CheckCircle` | Export Ready! | `text-success` | ~366 |

### 2b. Account Pages

| File | Icon | Title | iconClass | Notes | Line |
|------|------|-------|-----------|-------|------|
| `libs/engine/src/routes/arbor/account/PasskeyCard.svelte` | `KeyRound` | Passkeys | _(default)_ | Has dynamic `({count})` badge — title needs interpolation or keep manual | ~52 |
| `libs/engine/src/routes/arbor/account/+page.svelte` | `KeyRound` | Passkeys | `text-primary` | Simpler version, no count badge | ~215 |

### 2c. Vision Page

| File | Icon | Title | iconClass | Line |
|------|------|-------|-----------|------|
| `apps/landing/src/routes/vision/+page.svelte` | `AccessibilityIcon` | Accessibility | `text-accent-subtle` | ~101 |
| `apps/landing/src/routes/vision/+page.svelte` | `OwnershipIcon` | Ownership | `text-accent-subtle` | ~115 |
| `apps/landing/src/routes/vision/+page.svelte` | `SimplicityIcon` | Simplicity | `text-accent-subtle` | ~127 |
| `apps/landing/src/routes/vision/+page.svelte` | `CommunityIcon` | Community | `text-accent-subtle` | ~137 |
| `apps/landing/src/routes/vision/+page.svelte` | `AiSanctuaryIcon` | AI Sanctuary | `text-accent-subtle` | ~148 |

Note: Vision page uses `font-serif text-accent-muted` on titles. Migrating
to the `title` prop changes heading style to `text-lg font-semibold text-foreground`.
Visual review needed.

### 2d. Contributing Page

| File | Icon | Title | iconClass | Line |
|------|------|-------|-----------|------|
| `apps/landing/src/routes/contribute/+page.svelte` | `Bug` | Report Bugs | `text-accent-subtle` | ~81 |
| `apps/landing/src/routes/contribute/+page.svelte` | `Lightbulb` | Suggest Features | `text-accent-subtle` | ~100 |
| `apps/landing/src/routes/contribute/+page.svelte` | `Eye` | Test & Explore | `text-accent-subtle` | ~119 |
| `apps/landing/src/routes/contribute/+page.svelte` | `FileText` | Improve Docs | `text-accent-subtle` | ~130 |
| `apps/landing/src/routes/contribute/+page.svelte` | `Sprout` | Write Code | `text-accent-subtle` | ~141 |

Same style caveat as vision page — uses custom heading classes.

### 2e. Porch & Vista Pages

| File | Icon | Title | iconClass | Line |
|------|------|-------|-----------|------|
| `apps/landing/src/routes/arbor/porch/[id]/+page.svelte` | `User` | (user section) | _(TBD)_ | ~220 |
| `apps/landing/src/routes/arbor/porch/[id]/+page.svelte` | `StickyNote` | (notes section) | _(TBD)_ | ~278 |
| `apps/landing/src/routes/arbor/vista/alerts/+page.svelte` | `Bell` | (alerts) | _(TBD)_ | ~219 |

### 2f. Other Apps

| File | Icon | Title | iconClass | Line |
|------|------|-------|-----------|------|
| `apps/plant/src/routes/success/+page.svelte` | `Lightbulb` | What's next? | `text-primary` | ~146 |
| `apps/landing/src/routes/arbor/comped-invites/+page.svelte` | `Plus` | (create section) | `text-grove-600 dark:text-grove-400` | ~630 |
| `apps/landing/src/routes/arbor/comped-invites/+page.svelte` | `History` | (history section) | `text-grove-600 dark:text-grove-400` | ~868 |

**Instances: 20 | Files: 9**

---

## Phase 3: Waystone Migrations

### 3a. Settings Page (3 instances — primary candidates)

These use `section-header` divs with `<h2>` + `<Waystone>` inside GlassCard children.

| Section | Waystone slug | waystoneLabel | Line |
|---------|--------------|---------------|------|
| Typography | `custom-fonts` | Learn about fonts | ~991 |
| Accent Color | `choosing-a-theme` | Learn about themes | ~1118 |
| Blazes | `what-are-blazes` | What are blazes? | ~1404 |

**Caveat:** These cards use manual `<h2>` children, not the `title` prop.
GlassCard's `title` renders `<h3>`. Switching to `title` prop changes
heading semantics from `<h2>` to `<h3>`.

**Recommendation:** Accept the change. The settings page hierarchy is
`h1 (Settings) → h2 (section)`. These are card-scoped sub-sections
where `<h3>` is semantically appropriate.

**Before:**
```svelte
<GlassCard variant="frosted" class="mb-6">
  <div class="section-header">
    <h2>Typography</h2>
    <Waystone slug="custom-fonts" label="Learn about fonts" />
  </div>
  <p class="section-description">Choose the font family...</p>
```

**After:**
```svelte
<GlassCard variant="frosted" class="mb-6"
  title="Typography"
  waystone="custom-fonts"
  waystoneLabel="Learn about fonts"
>
  <p class="section-description">Choose the font family...</p>
```

### 3b. NOT candidates (keep manual)

| File | Reason |
|------|--------|
| `arbor/account/FeaturesCard.svelte` (3) | Waystones on individual feature items inside a grid, not the card title |
| `arbor/account/DataExportCard.svelte` (1) | Inline Waystone inside `<h2>` body text — different semantic role |
| `libs/engine/src/lib/grafts/greenhouse/GraftControlPanel.svelte` (1) | Complex header with stats row + custom icon wrapper |

**Instances: 3 | Files: 1**

---

## Phase 4: Cleanup

| Task | File |
|------|------|
| Remove dead Waystone import | `libs/engine/src/routes/arbor/curios/pulse/+page.svelte:8` |

---

## Phase 5: Roadmap Icon Consolidation (separate scope)

The roadmap page (`apps/landing/src/routes/roadmap/+page.svelte`, 1137 lines)
does **not** use GlassCard — features are custom `<li>` elements with manual
glassmorphic styling. However, it has significant boilerplate worth addressing:

### Current Pattern

Each of the 4+ phases repeats inline `colorMap` and `borderMap` objects
that map feature icon keys to Tailwind classes:

```svelte
{#each phases['first-buds'].features as feature}
  {@const IconComponent = getFeatureIcon(feature.icon)}
  {@const colorMap = { ivy: 'text-success', amber: 'text-warning', ... }}
  {@const borderMap = { ivy: 'border-l-4 border-success', ... }}
  <li class="... {borderMap[feature.icon] || ''}">
    <IconComponent class="w-5 h-5 {colorMap[feature.icon] || 'text-bark-400'}" />
    ...
  </li>
{/each}
```

### Proposed Consolidation

1. **Move color/border maps to the icon registry** (`apps/landing/src/lib/utils/icons.ts`)
   — the registry already maps icon keys to components, extend it with color metadata
2. **Extract a `RoadmapFeatureItem` component** to eliminate the repeated `<li>` template
3. **Move feature data to a separate file** (or `+page.ts` load function) to separate
   data from template

### Also Noted

- **`RoadmapPreview`** component uses manual glassmorphic styles (`bg-white/80 backdrop-blur-md`)
  rather than GlassCard — could be migrated for consistency, but it's an `<a>` link element
  with hover animations that GlassCard's `hoverable` prop could handle
- **Vineyard `FeatureCard`** (`libs/vineyard/src/lib/components/vineyard/FeatureCard.svelte`)
  uses `import * from 'lucide-svelte'` which defeats tree-shaking (~300KB) — the engine-side
  copy already has a safe explicit `iconMap`; vineyard should adopt the same pattern

---

## NOT Migrating (14+ instances — intentionally custom)

These use decorative icon wrappers, hero layouts, stat cards, or
non-heading placements that are beyond the `icon` prop's scope:

- **Stat card icons** with colored `bg-*` rounded containers
  (LumenAnalytics x4, ZephyrAnalytics x1, analytics page x6)
- **Hero icons** with large circular rings
  (pulse page HeartPulse, plant success/comped Check icons)
- **Feature grid icons** (FeaturesCard, SubscriptionCard plan badge)
- **Error/interactive icons** (export AlertTriangle, comped-invites toggles)
- **FaqPage snippet headers** with 10x10 decorative containers (6 sections)
- **Landing homepage feature loop** with dynamic `<feature.icon>` iteration
- **Dialog/modal icons** (GlassConfirmDialog, BetaWelcomeDialog, WaystonePopup)
  — these use GlassCard internally but render icons in their own layouts
- **Admin panel headers** (SafetyMonitoring, PhotoPicker, Greenhouse grafts)
  — complex multi-element headers beyond simple icon + title
- **Page-level `header-icon` pattern** (26 curio pages, guestbook, export)
  — these are in `<header>` elements above/outside GlassCard, not inside it

These are intentionally custom and should remain manual.

---

## Execution Order

```
Step 0  →  Add iconClass prop to GlassCard        (1 file, ~3 lines)
Phase 1 →  Clean icon migrations                   (3 files, 6 instances)
Phase 2 →  Icon migrations with iconClass          (9 files, 20 instances)
Phase 3 →  Waystone migrations                     (1 file, 3 instances)
Phase 4 →  Dead import cleanup                     (1 file, 1 line)
Phase 5 →  Roadmap icon consolidation              (separate issue, ~3 files)
```

**Total GlassCard boilerplate eliminated:** ~29 manual icon/waystone patterns
across 13 files, replaced by declarative props.

## Verification

After each phase:
```bash
gw ci --affected --fail-fast --diagnose
```

Visual check: Confirm icon positioning, color, and waystone popup
behavior match the original manual implementations. Pay special attention
to the vision and contribute pages where heading styles change.
