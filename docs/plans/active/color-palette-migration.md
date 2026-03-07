# Color Palette Migration Plan

> **Status:** Active — Ready for phased execution
> **Created:** 2026-03-07
> **Scope:** All `.svelte` files across `apps/` and `libs/engine/src/`

---

## Problem

LLMs (and humans) repeatedly use standard Tailwind color classes (`slate-*`, `gray-*`, `red-*`, `amber-*`, etc.) that aren't defined in the Grove design system. These colors render as transparent/invisible because the Grove Tailwind preset strips default colors. The codebase has **~900+ instances** of invalid color classes across 50+ files.

Root cause: **Grove's palette lacks semantic status colors** (warning, success, info). Developers fall back to standard Tailwind to fill the gap.

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

| Standard Tailwind | Semantic Meaning | Grove Replacement |
|---|---|---|
| `text-slate-600` / `text-slate-700` | Secondary text | `text-foreground-muted` |
| `text-slate-500` / `text-slate-400` | Tertiary/hint text | `text-foreground-subtle` or `text-foreground-faint` |
| `bg-slate-50` / `bg-slate-100` | Subtle background | `bg-surface-subtle` or `bg-muted` |
| `bg-slate-800` / `bg-slate-900` | Dark mode card bg | `bg-card` or `bg-surface` |
| `border-slate-200` / `border-slate-300` | Light border | `border-border` or `border-default` |
| `border-slate-700` | Dark mode border | `border-border` (dark mode auto) |
| `text-gray-600` | Muted text | `text-foreground-muted` |
| `bg-gray-100` | Hover/disabled bg | `bg-surface-hover` or `bg-muted` |
| `bg-gray-300` | Disabled indicator | `bg-muted` |
| `text-red-600` | Error text | `text-error` or `text-destructive` |
| `bg-red-50` / `bg-red-100` | Error background | `bg-error-bg` |
| `bg-red-600` | Danger button | `bg-destructive` |
| `border-red-200` | Error border | `border-error` |
| `text-amber-600` | Warning text | `text-warning` |
| `bg-amber-50` / `bg-amber-100` | Warning background | `bg-warning-bg` |
| `border-amber-200` | Warning border | `border-warning` |
| `text-emerald-600` / `text-green-600` | Success text | `text-success` |
| `bg-emerald-50` / `bg-emerald-100` / `bg-green-100` | Success background | `bg-success-bg` |
| `bg-emerald-500` | Success indicator dot | `bg-success` |
| `text-blue-600` | Info text | `text-info` |
| `bg-blue-50` / `bg-blue-100` | Info background | `bg-info-bg` |

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

Priority order (by usage count):

| # | File | Color Families | Est. Changes |
|---|---|---|---|
| 1 | `libs/engine/src/lib/grafts/greenhouse/GreenhouseEnrollTable.svelte` | slate, emerald, red, amber | ~20 |
| 2 | `libs/engine/src/lib/grafts/greenhouse/CultivateFlagTable.svelte` | slate, emerald, amber | ~15 |
| 3 | `libs/engine/src/lib/grafts/greenhouse/CultivateFlagRow.svelte` | emerald, slate | ~10 |
| 4 | `libs/engine/src/lib/grafts/greenhouse/TenantGreenhouseSection.svelte` | red, amber, emerald | ~12 |
| 5 | `libs/engine/src/lib/grafts/greenhouse/GreenhouseStatusCard.svelte` | emerald, amber | ~8 |
| 6 | `libs/engine/src/lib/grafts/greenhouse/TenantUploadSection.svelte` | amber, red | ~8 |
| 7 | `libs/engine/src/lib/grafts/upgrades/components/GardenStatus.svelte` | green, red, amber | ~10 |
| 8 | `libs/engine/src/lib/grafts/upgrades/components/CurrentStageBadge.svelte` | amber, emerald | ~6 |
| 9 | `libs/engine/src/lib/components/admin/LumenAnalytics.svelte` | slate, amber, emerald, red | ~25 |
| 10 | `libs/engine/src/lib/components/admin/ZephyrAnalytics.svelte` | slate, gray, amber, emerald, purple, blue | ~20 |
| 11 | `libs/engine/src/lib/components/quota/QuotaWidget.svelte` | red, blue | ~8 |
| 12 | `libs/engine/src/lib/components/quota/UpgradePrompt.svelte` | blue | ~6 |
| 13 | `libs/engine/src/lib/ui/components/indicators/CreditBalance.svelte` | red, amber, emerald | ~10 |
| 14 | `libs/engine/src/lib/ui/components/custom/CategoryNav.svelte` | emerald, purple, amber + more | ~8 |

Verification after each batch: `gw dev ci --affected --fail-fast --diagnose`

### Phase 3: Engine Routes (Arbor Admin)

**Migrate admin page routes in the engine.**

| # | File | Color Families | Est. Changes |
|---|---|---|---|
| 1 | `libs/engine/src/routes/arbor/garden/+page.svelte` | gray, slate | ~20 |
| 2 | `libs/engine/src/routes/arbor/pages/+page.svelte` | gray, slate | ~20 |
| 3 | `libs/engine/src/routes/arbor/pages/new/+page.svelte` | slate | ~8 |
| 4 | `libs/engine/src/routes/arbor/pages/[slug]/+page.svelte` | slate | ~8 |
| 5 | `libs/engine/src/routes/arbor/account/PasskeyCard.svelte` | uses `--color-surface-subtle` (invalid CSS var) | ~2 |
| 6 | `libs/engine/src/routes/vineyard/+page.svelte` | purple, pink (INTENTIONAL — mark with comment) | ~0 |

### Phase 4: Landing App

**Migrate landing-specific pages and components.**

| # | File | Color Families | Est. Changes |
|---|---|---|---|
| 1 | `apps/landing/src/routes/arbor/comped-invites/+page.svelte` | purple, slate, red, blue, indigo | ~30 |
| 2 | `apps/landing/src/routes/arbor/porch/+page.svelte` | amber, emerald | ~10 |
| 3 | `apps/landing/src/routes/arbor/porch/[id]/+page.svelte` | amber, emerald | ~8 |
| 4 | `apps/landing/src/routes/beyond/+page.svelte` | slate, indigo | ~15 |
| 5 | `apps/landing/src/routes/workshop/+page.svelte` | slate | ~10 |
| 6 | `apps/landing/src/routes/roadmap/+page.svelte` | indigo, emerald, amber | ~8 |
| 7 | `apps/landing/src/lib/components/EmailSignup.svelte` | purple, amber, pink, red | ~12 |
| 8 | `apps/landing/src/lib/components/RelatedArticles.svelte` | slate, grove-green (invalid) | ~8 |
| 9 | `apps/landing/src/routes/arbor/vista/+page.svelte` | slate, amber | ~8 |
| 10 | `apps/landing/src/routes/arbor/zephyr/+page.svelte` | gray, amber | ~8 |
| 11 | `apps/landing/src/routes/arbor/cdn/+page.svelte` | gray | ~5 |

### Phase 5: Other Apps + Cleanup

**Migrate remaining apps and mark intentional exceptions.**

| # | App | Est. Changes |
|---|---|---|
| 1 | `apps/plant/` (checkout, account routes) | ~15 |
| 2 | `apps/meadow/` | ~10 |
| 3 | `apps/terrarium/` (asset selection blue borders) | ~5 |
| 4 | Mark all intentional brand colors with `/* brand-color: intentional */` | ~8 |

### Phase 6: Guardrails

**Prevent regression.**

1. Update `AGENT.md` with final token list including `warning`, `success`, `info`
2. Consider adding a CI lint rule that flags non-Grove color classes in `.svelte` files
3. Add comments to intentional brand color exceptions

---

## Estimated Scope

| Phase | Files | Est. Class Changes | Risk |
|---|---|---|---|
| 1: Foundation | 3 | 0 (adding tokens) | Low — additive only |
| 2: Engine Components | 14 | ~166 | Medium — shared components |
| 3: Engine Routes | 6 | ~58 | Low — admin only |
| 4: Landing App | 11 | ~132 | Low — landing only |
| 5: Other Apps | 4 | ~30 | Low — isolated apps |
| 6: Guardrails | 2 | 0 | Low — docs only |
| **Total** | **~40** | **~386** | |

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

---

_From this height, the pattern is clear: fill the semantic gaps, then the migration becomes mechanical._ 🦅
