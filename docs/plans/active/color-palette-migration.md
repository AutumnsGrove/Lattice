# Color Palette Migration Plan

> **Status:** Active — Ready for phased execution
> **Created:** 2026-03-07
> **Scope:** All `.svelte` files across `apps/` and `libs/engine/src/`

---

## Problem

LLMs (and humans) repeatedly use standard Tailwind color classes (`slate-*`, `gray-*`, `red-*`, `amber-*`, etc.) that aren't defined in the Grove design system. These colors render as transparent/invisible because the Grove Tailwind preset strips default colors.

**Full inventory: 1,500+ violations across 155 files in 9 packages.**

| Package | Files | Violations |
|---------|-------|-----------|
| apps/landing | 58 | 744 |
| libs/engine | 66 | 413 |
| apps/clearing | 8 | 95 |
| apps/plant | 8 | 84 |
| apps/meadow | 4 | 28 |
| apps/login | 2 | 14 |
| apps/terrarium | 1 | 2 |
| apps/amber | 1 | 1 |

**Top offending color families:**

| Color Family | Count | Primary Use |
|---|---|---|
| amber-* | 291 | Status indicators, warnings |
| red-* | 211 | Error/critical states |
| green-* | 147 | Success/operational status |
| emerald-* | 144 | Accents, data visualization |
| purple-* | 128 | Branding, dark theme |
| blue-* | 99 | Info states, primary actions |
| neutral-* | 94 | Backgrounds, borders |
| slate-* | 87 | Borders, forms, neutral tones |

Root cause: **Grove's palette lacks semantic status colors** (warning, success, info). Developers fall back to standard Tailwind to fill the gap.

---

## Already Fixed (This Session)

Added to `tailwind.preset.js` as part of this session's work:

- `card` / `card.foreground` — shadcn-compatible
- `popover` / `popover.foreground` — shadcn-compatible
- `divider` — alias for border (cream-200)
- `error` / `error.foreground` / `error.bg` — alias for destructive

These resolve **29 previously-invalid instances** across the codebase.

**Still invalid (2 instances):**
- `text-grove-green` → should be `text-grove-500` (in RelatedArticles.svelte)
- `ring-grove-green` → should be `ring-grove-500` (in RelatedArticles.svelte)

---

## Architecture: Two-Part Fix

### Part 1: Expand the Grove Palette (Prerequisite)

Add semantic status color tokens to the design system so there's always a Grove-native option.

### Part 2: Migrate Existing Files (Phased)

Replace all non-Grove color classes with their Grove equivalents, file by file.

---

## Part 1: New Semantic Tokens

### Tokens to Add

Add to `libs/engine/src/lib/ui/tailwind.preset.js`:

```javascript
// Status colors: semantic tokens for state communication
warning: {
  DEFAULT: "hsl(var(--warning, 38 92% 50%))",
  foreground: "hsl(var(--warning-foreground, 38 92% 20%))",
  bg: "hsl(var(--warning-bg, 48 96% 95%))",
  muted: "hsl(var(--warning-muted, 45 93% 47%))",
},
success: {
  DEFAULT: "hsl(var(--success, 160 84% 39%))",
  foreground: "hsl(var(--success-foreground, 160 84% 15%))",
  bg: "hsl(var(--success-bg, 152 76% 95%))",
  muted: "hsl(var(--success-muted, 160 60% 45%))",
},
info: {
  DEFAULT: "hsl(var(--info, 217 91% 60%))",
  foreground: "hsl(var(--info-foreground, 217 91% 20%))",
  bg: "hsl(var(--info-bg, 214 95% 96%))",
  muted: "hsl(var(--info-muted, 217 70% 55%))",
},
```

Add CSS variables to `libs/engine/src/app.css`:

```css
:root {
  /* Status: Warning (amber-adjacent) */
  --warning: 38 92% 50%;
  --warning-foreground: 38 92% 20%;
  --warning-bg: 48 96% 95%;
  --warning-muted: 45 93% 47%;

  /* Status: Success (emerald-adjacent) */
  --success: 160 84% 39%;
  --success-foreground: 160 84% 15%;
  --success-bg: 152 76% 95%;
  --success-muted: 160 60% 45%;

  /* Status: Info (blue-adjacent) */
  --info: 217 91% 60%;
  --info-foreground: 217 91% 20%;
  --info-bg: 214 95% 96%;
  --info-muted: 217 70% 55%;
}

.dark {
  --warning: 45 93% 47%;
  --warning-foreground: 48 96% 89%;
  --warning-bg: 38 75% 15%;
  --warning-muted: 45 80% 55%;

  --success: 160 70% 45%;
  --success-foreground: 152 76% 90%;
  --success-bg: 160 50% 12%;
  --success-muted: 160 55% 50%;

  --info: 217 80% 60%;
  --info-foreground: 214 95% 90%;
  --info-bg: 217 60% 15%;
  --info-muted: 217 65% 55%;
}
```

Also update `AGENT.md` color table to include `warning`, `success`, and `info`.

### Files to Modify (Part 1)

1. `libs/engine/src/lib/ui/tailwind.preset.js` — Add token definitions
2. `libs/engine/src/app.css` — Add CSS custom properties (light + dark)
3. `AGENT.md` — Update color reference table

---

## Part 2: Migration Map

### Color Translation Reference

**Neutral / Layout Colors:**

| Standard Tailwind | Semantic Meaning | Grove Replacement |
|---|---|---|
| `text-slate-600` / `text-slate-700` | Secondary text | `text-foreground-muted` |
| `text-slate-500` / `text-slate-400` | Tertiary/hint text | `text-foreground-subtle` or `text-foreground-faint` |
| `text-gray-600` / `text-gray-500` | Muted text | `text-foreground-muted` |
| `text-neutral-600` | Muted text | `text-foreground-muted` |
| `bg-slate-50` / `bg-slate-100` | Subtle background | `bg-surface-subtle` or `bg-muted` |
| `bg-slate-800` / `bg-slate-900` | Dark mode card bg | `bg-card` or `bg-surface` |
| `bg-gray-100` / `bg-neutral-100` | Hover/disabled bg | `bg-surface-hover` or `bg-muted` |
| `bg-gray-300` | Disabled indicator | `bg-muted` |
| `bg-stone-50` / `bg-stone-100` | Warm neutral bg | `bg-surface-subtle` |
| `border-slate-200` / `border-slate-300` | Light border | `border-border` or `border-default` |
| `border-gray-200` / `border-neutral-200` | Light border | `border-border` |
| `border-slate-700` | Dark mode border | `border-border` (dark mode auto) |
| `divide-slate-200` | Table dividers | `divide-border` |

**Status Colors:**

| Standard Tailwind | Semantic Meaning | Grove Replacement |
|---|---|---|
| `text-red-600` / `text-red-500` | Error text | `text-error` or `text-destructive` |
| `bg-red-50` / `bg-red-100` | Error background | `bg-error-bg` |
| `bg-red-600` / `bg-red-700` | Danger button | `bg-destructive` |
| `border-red-200` / `border-red-300` | Error border | `border-error` |
| `text-amber-600` / `text-amber-500` | Warning text | `text-warning` |
| `text-yellow-600` / `text-orange-600` | Warning text | `text-warning` |
| `bg-amber-50` / `bg-amber-100` | Warning background | `bg-warning-bg` |
| `bg-yellow-50` / `bg-orange-100` | Warning background | `bg-warning-bg` |
| `border-amber-200` | Warning border | `border-warning` |
| `text-emerald-600` / `text-green-600` | Success text | `text-success` |
| `bg-emerald-50` / `bg-emerald-100` / `bg-green-100` | Success background | `bg-success-bg` |
| `bg-emerald-500` / `bg-green-500` | Success indicator dot | `bg-success` |
| `text-blue-600` / `text-blue-500` | Info text | `text-info` |
| `bg-blue-50` / `bg-blue-100` | Info background | `bg-info-bg` |
| `border-blue-200` | Info border | `border-info` |

**Interactive / Accent Colors:**

| Standard Tailwind | Semantic Meaning | Grove Replacement |
|---|---|---|
| `bg-purple-600` / `bg-indigo-600` | Primary action button | `bg-primary` |
| `text-purple-600` | Accent text | `text-accent` |
| `bg-purple-50` / `bg-purple-100` | Accent background | `bg-accent-subtle` |

### Dark Mode Pattern Translation

The existing codebase consistently uses `dark:bg-{color}-900/30` for dark mode status backgrounds. The new tokens handle this automatically via CSS variables, so dark: variants can be removed.

**Before:**
```html
<div class="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
```

**After:**
```html
<div class="bg-warning-bg text-warning-foreground">
```

### Intentional Exceptions (DO NOT MIGRATE)

Some standard Tailwind colors are used intentionally for external brand alignment:

| Color | Usage | Why Keep |
|---|---|---|
| `text-purple-500` | Mastodon social icon | Official Mastodon brand color |
| `text-blue-500` | Bluesky social icon | Official Bluesky brand color |
| `bg-gray-100 dark:bg-gray-800` | dev.to social icon | dev.to brand is neutral |
| Purple gradients in Vineyard | Showcase page | Intentional visual distinctiveness |
| CategoryNav multi-color palette | Category color coding | Intentional — needs dedicated data-viz palette later |

These should be marked with a `/* brand-color: intentional */` comment to prevent future migration attempts.

---

## Execution Phases

### Phase 1: Foundation (1 task)

**Add semantic tokens to the design system.**

Files:
- `libs/engine/src/lib/ui/tailwind.preset.js`
- `libs/engine/src/app.css`
- `AGENT.md`

Verification: `gw dev ci --affected --fail-fast --diagnose`

### Phase 2: Engine Core Components (highest impact)

**Migrate libs/engine component files.** These are shared across all apps, so fixing them fixes everywhere.

Priority order (by violation density):

| # | File | Color Families | Est. Changes |
|---|---|---|---|
| 1 | `libs/engine/src/lib/components/admin/LumenAnalytics.svelte` | slate, amber, emerald, violet, blue, red | ~22 |
| 2 | `libs/engine/src/lib/components/admin/ZephyrAnalytics.svelte` | gray, blue, emerald, amber, red, purple | ~20 |
| 3 | `libs/engine/src/lib/grafts/greenhouse/GreenhouseEnrollTable.svelte` | slate, emerald, red, amber | ~20 |
| 4 | `libs/engine/src/lib/grafts/greenhouse/CultivateFlagTable.svelte` | slate, emerald, amber | ~15 |
| 5 | `libs/engine/src/lib/grafts/greenhouse/TenantGreenhouseSection.svelte` | red, amber, emerald | ~12 |
| 6 | `libs/engine/src/lib/grafts/greenhouse/CultivateFlagRow.svelte` | emerald, slate | ~10 |
| 7 | `libs/engine/src/lib/grafts/upgrades/components/GardenStatus.svelte` | green, red, amber | ~10 |
| 8 | `libs/engine/src/lib/ui/components/indicators/CreditBalance.svelte` | red, amber, emerald | ~10 |
| 9 | `libs/engine/src/lib/grafts/greenhouse/GreenhouseStatusCard.svelte` | emerald, amber | ~8 |
| 10 | `libs/engine/src/lib/grafts/greenhouse/TenantUploadSection.svelte` | amber, red | ~8 |
| 11 | `libs/engine/src/lib/components/quota/QuotaWidget.svelte` | red, blue | ~8 |
| 12 | `libs/engine/src/lib/ui/components/custom/CategoryNav.svelte` | emerald, purple, amber (INTENTIONAL — data viz) | ~0 |
| 13 | `libs/engine/src/lib/components/quota/UpgradePrompt.svelte` | blue | ~6 |
| 14 | `libs/engine/src/lib/grafts/upgrades/components/CurrentStageBadge.svelte` | amber, emerald | ~6 |
| 15 | `libs/engine/src/lib/ui/components/custom/GlassLegend.svelte` | purple | ~2 |

Verification after each batch: `gw dev ci --affected --fail-fast --diagnose`

### Phase 3: Engine Routes (Arbor Admin + Vineyard)

**Migrate admin page routes in the engine.**

| # | File | Color Families | Est. Changes |
|---|---|---|---|
| 1 | `libs/engine/src/routes/arbor/garden/+page.svelte` | gray, slate | ~20 |
| 2 | `libs/engine/src/routes/arbor/pages/+page.svelte` | gray, slate | ~20 |
| 3 | `libs/engine/src/routes/arbor/pages/new/+page.svelte` | slate | ~8 |
| 4 | `libs/engine/src/routes/arbor/pages/[slug]/+page.svelte` | slate | ~8 |
| 5 | `libs/engine/src/routes/arbor/account/PasskeyCard.svelte` | `--color-surface-subtle` (invalid CSS var) | ~2 |
| 6 | `libs/engine/src/routes/vineyard/+page.svelte` | purple, pink (INTENTIONAL — mark with comment) | ~0 |

### Phase 4: Landing App

**Migrate landing-specific pages and components.** The three biggest files account for ~244 violations.

| # | File | Color Families | Est. Changes |
|---|---|---|---|
| 1 | `apps/landing/src/routes/roadmap/+page.svelte` | amber, purple, green, emerald, teal, indigo | ~100 |
| 2 | `apps/landing/src/routes/manifesto/+page.svelte` | purple, amber, slate | ~87 |
| 3 | `apps/landing/src/routes/arbor/comped-invites/+page.svelte` | slate, blue, green, amber, red, indigo | ~57 |
| 4 | `apps/landing/src/routes/arbor/vista/+page.svelte` | amber, red, blue, green | ~20 |
| 5 | `apps/landing/src/routes/beyond/+page.svelte` | slate, indigo | ~15 |
| 6 | `apps/landing/src/lib/components/EmailSignup.svelte` | purple, amber, pink, red | ~12 |
| 7 | `apps/landing/src/routes/workshop/+page.svelte` | slate | ~10 |
| 8 | `apps/landing/src/routes/arbor/porch/+page.svelte` | amber, emerald | ~10 |
| 9 | `apps/landing/src/routes/arbor/porch/[id]/+page.svelte` | amber, emerald | ~8 |
| 10 | `apps/landing/src/lib/components/RelatedArticles.svelte` | slate, grove-green (invalid) | ~8 |
| 11 | `apps/landing/src/routes/arbor/zephyr/+page.svelte` | gray, amber | ~8 |
| 12 | `apps/landing/src/routes/arbor/cdn/+page.svelte` | gray | ~5 |
| — | Remaining ~45 files in apps/landing | Various | ~404 |

### Phase 5: Clearing, Plant, and Other Apps

**Migrate status page, billing, and remaining apps.**

| # | Package | Key Files | Est. Changes |
|---|---|---|---|
| 1 | `apps/clearing/` | GlassStatusBanner (30), GlassStatusCard (15), 6 others | ~95 |
| 2 | `apps/plant/` | checkout, account, plans pages | ~84 |
| 3 | `apps/meadow/` | EmailSignup (shared), ReportModal | ~28 |
| 4 | `apps/login/` | passkey, login page | ~14 |
| 5 | `apps/terrarium/` | Minecraft version indicators | ~2 |
| 6 | `apps/amber/` | Single gray text instance | ~1 |

### Phase 6: Guardrails

**Prevent regression.**

1. Update `AGENT.md` with final token list including `warning`, `success`, `info`
2. Consider adding a CI lint rule that flags non-Grove color classes in `.svelte` files
3. Add `/* brand-color: intentional */` comments to all intentional exceptions
4. Update engine tailwind.config.js to match preset (remove duplicate color defs)

---

## Estimated Scope

| Phase | Files | Est. Class Changes | Risk |
|---|---|---|---|
| 1: Foundation | 3 | 0 (adding tokens) | Low — additive only |
| 2: Engine Components | 15 | ~157 | Medium — shared components |
| 3: Engine Routes | 6 | ~58 | Low — admin only |
| 4: Landing App | ~58 | ~744 | Medium — high volume, visual review needed |
| 5: Other Apps | ~24 | ~224 | Low — isolated apps |
| 6: Guardrails | 3 | 0 | Low — docs only |
| **Total** | **~109** | **~1,183** | |

Note: ~300+ violations are intentional brand/data-viz colors that should be marked with comments rather than migrated.

---

## Agent Handoff Instructions

Each phase can be executed as an independent task. For each phase:

1. Read this plan and the color translation reference above
2. Open each file listed in the phase
3. Replace standard Tailwind color classes with their Grove equivalents per the translation table
4. For dark mode patterns like `bg-amber-100 dark:bg-amber-900/30`, collapse to single semantic class (e.g., `bg-warning-bg`)
5. **DO NOT** touch colors marked as intentional brand exceptions
6. Run `gw dev ci --affected --fail-fast --diagnose` after each file batch
7. Use Glimpse to verify UI appearance on any user-facing pages
8. Commit with message format: `fix(<scope>): migrate <color> classes to Grove palette`

### Key Decision Points for Agents

- **CategoryNav.svelte**: Uses a rainbow of colors for category coding — mark as intentional, don't migrate. This needs a dedicated data-viz palette later.
- **Vineyard showcase**: Purple/pink gradients are intentional design choices — mark with comment.
- **Mastodon/Bluesky/dev.to icons**: Brand colors, never migrate.
- **Status banners in clearing**: Clear semantic pattern (green=operational, yellow=degraded, orange=partial, red=critical, blue=maintenance) — perfect candidates for `success`/`warning`/`error`/`info` tokens.
- **manifesto + roadmap pages**: Heavy color usage for visual storytelling — requires careful visual review with Glimpse after migration.

---

_From this height, the pattern is clear: fill the semantic gaps, then the migration becomes mechanical._ 🦅
