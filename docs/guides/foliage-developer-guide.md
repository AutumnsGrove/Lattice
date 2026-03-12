---
title: "Foliage Developer Guide"
description: "How to work with Grove's theme system, from adding themes to validating contrast."
category: guides
guideCategory: design
lastUpdated: "2026-03-12"
aliases: []
tags:
  - foliage
  - themes
  - prism
  - tier-access
  - contrast
  - css-variables
---

# Foliage Developer Guide

Foliage is Grove's theme system. It gives every site a visual identity through curated color palettes, font stacks, layout modes, and glassmorphism variants. Ten built-in themes ship with the platform, gated by subscription tier, and all of them pull their raw color tokens from Prism.

This guide covers how themes are structured, how to add one, how tier gating works, and where things tend to break.

## How Foliage Works

A theme is a plain TypeScript object that satisfies the `Theme` interface. It declares colors, fonts, layout preferences, glass variants, and a seasonal affinity. At runtime, `generateThemeVariables()` converts these values into CSS custom properties on `:root`, and the rest of the UI reads them.

The core type lives in `libs/foliage/src/lib/types.ts`:

```typescript
export interface Theme {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  tier: "seedling" | "sapling";

  colors: ThemeColors;
  fonts: ThemeFonts;
  layout: ThemeLayout;
  customCSS?: string;

  glass?: ThemeGlass;
  seasonalAffinity?: SeasonalAffinity;
}
```

The `ThemeColors`, `ThemeGlass`, `Season`, `SeasonalAffinity`, and `ValidationResult` types are all defined in Prism and re-exported by Foliage for backward compatibility. New code should import from `@autumnsgrove/prism` directly.

### ThemeColors

Six required hex values:

```typescript
export interface ThemeColors {
  background: string;   // Page background
  surface: string;      // Card/panel backgrounds
  foreground: string;   // Primary text
  foregroundMuted: string; // Secondary text
  accent: string;       // Links, buttons, highlights
  border: string;       // Borders and dividers
}
```

### ThemeFonts

Three font stacks (always include system fallbacks):

```typescript
export interface ThemeFonts {
  heading: string;  // e.g. "Bodoni Moda, Impact, serif"
  body: string;     // e.g. "Plus Jakarta Sans, system-ui, sans-serif"
  mono: string;     // e.g. "IBM Plex Mono, ui-monospace, monospace"
}
```

### ThemeLayout

Layout mode, max width, and spacing density:

```typescript
export interface ThemeLayout {
  type: "sidebar" | "no-sidebar" | "centered" | "full-width" | "grid" | "masonry";
  maxWidth: string;  // CSS value: "1200px", "600px", "100%"
  spacing: "compact" | "comfortable" | "spacious";
}
```

The spacing value maps to a scale of CSS custom properties (`--spacing-xs` through `--spacing-2xl`). Compact runs tight, spacious runs loose. The mapping is handled by `getSpacingValues()` in `libs/foliage/src/lib/utils/css-vars.ts`.

## Adding a Theme

### 1. Create the theme file

Make a new file in `libs/foliage/src/lib/themes/`. Here is the Grove theme (the default) as a reference:

```typescript
// src/lib/themes/grove.ts
import type { Theme } from "../types.js";
import { grove as groveColors, bark, cream, semantic } from "../tokens/colors.js";
import { generateGlass } from "../utils/glass.js";

export const grove: Theme = {
  id: "grove",
  name: "Grove",
  description: "Warm, earthy, and cozy — the default Grove experience",
  thumbnail: "/themes/grove-thumb.png",
  tier: "seedling",

  colors: {
    background: semantic.background,
    surface: cream[50],
    foreground: semantic.foreground,
    foregroundMuted: bark[700],
    accent: groveColors[600],
    border: semantic.border,
  },

  fonts: {
    heading: "system-ui, sans-serif",
    body: "system-ui, sans-serif",
    mono: "ui-monospace, monospace",
  },

  layout: {
    type: "sidebar",
    maxWidth: "1200px",
    spacing: "comfortable",
  },

  glass: generateGlass({
    lightSurface: cream[50],
    darkSurface: bark[900],
    accent: groveColors[600],
    lightBorder: cream[200],
    darkBorder: bark[700],
  }),

  seasonalAffinity: "all",
};
```

A few patterns to notice:

- Color tokens come from `../tokens/colors.js`, which re-exports Prism's palette. The `grove` export there is `groveColors` renamed back to `grove` for internal use (avoids the naming collision described in the memory notes).
- `generateGlass()` accepts `GlassGeneratorOptions` and produces a `ThemeGlass` object with four variants: `surface`, `tint`, `card`, and `frosted`.
- `seasonalAffinity` can be a single `Season` (`"spring"`, `"summer"`, `"autumn"`, `"winter"`), an array of seasons, or `"all"`.
- Themes that use custom palette colors (like Solarpunk's bright greens) can define a local `palette` object, then spread it into `colors`. See `libs/foliage/src/lib/themes/solarpunk.ts` for this pattern.

### 2. Set the tier

The `tier` field controls which users can select the theme:

- `"seedling"` makes it available to Seedling subscribers and above (3 seedling-tier themes exist: Grove, Minimal, Night Garden)
- `"sapling"` makes it available to Sapling subscribers and above (the remaining 7 themes)

### 3. Register it

Export the theme from `libs/foliage/src/lib/themes/index.ts`:

```typescript
export { yourTheme } from "./your-theme.js";
```

Then add it to the registry in `libs/foliage/src/lib/themes/registry.ts`:

```typescript
import { yourTheme } from "./your-theme.js";

export const themes: Record<string, Theme> = {
  // ...existing themes...
  "your-theme": yourTheme,
};
```

The registry key must match the theme's `id` field. Hyphenated IDs are fine (see `"night-garden"` and `"cozy-cabin"`).

### 4. Validate contrast

Run `validateThemeContrast()` against your theme's colors. The function checks five pairs:

1. `foreground` on `background` (must pass 4.5:1 for WCAG AA)
2. `foregroundMuted` on `background` (must pass 4.5:1)
3. `foreground` on `surface` (must pass 4.5:1)
4. `accent` on `background` (warns below 3:1)
5. `border` on `background` (warns below 3:1)

Failing checks 1-3 returns `{ valid: false, error: "..." }`. Failing checks 4-5 returns `{ valid: true, warnings: [...] }`. Warnings are acceptable for accent and border colors because they often appear at larger sizes or as decorative elements.

```typescript
import { validateThemeContrast } from "@autumnsgrove/prism";

const result = validateThemeContrast({ colors: yourTheme.colors });
if (!result.valid) {
  console.error(result.error);
}
if (result.warnings) {
  result.warnings.forEach(w => console.warn(w));
}
```

Note that `validateThemeContrast` accepts `{ colors: ThemeColors }`, not a full `Theme`. This keeps Prism dependency-free from Foliage's broader types.

## Tier System

Tier gating lives in `libs/foliage/src/lib/utils/tier-access.ts`. Five user tiers exist, ordered by access level:

| Tier | Level | Themes | Customizer | Community | Custom Fonts |
|------|-------|--------|------------|-----------|--------------|
| wanderer | 0 | 0 | no | no | no |
| seedling | 1 | 3 | no | no | no |
| sapling | 2 | 10 | no | no | no |
| oak | 3 | 10 | yes | yes | no |
| evergreen | 4 | 10 | yes | yes | yes |

The `UserTier` type is `"wanderer" | "seedling" | "sapling" | "oak" | "evergreen"`. The spec's old "free" tier has been renamed to "wanderer" in the actual code.

Five gating functions handle all access checks:

```typescript
hasTierAccess(userTier, requiredTier)  // Generic tier comparison
canAccessTheme(userTier, theme)        // Can user select this theme?
canUseCustomizer(userTier)             // Oak+ only
canAccessCommunityThemes(userTier)     // Oak+ only
canUploadFonts(userTier)              // Evergreen only
```

The `getThemesForTier()` function in the registry returns the filtered theme list:

```typescript
import { getThemesForTier } from "@autumnsgrove/foliage";

const available = getThemesForTier("seedling");
// Returns: [grove, minimal, nightGarden]

const all = getThemesForTier("sapling");
// Returns: all 10 themes
```

Wanderers get an empty array. The filtering logic in `registry.ts` checks the `tier` field on each theme object.

## CSS Variable Generation

The `css-vars.ts` module handles converting theme data into CSS. Two functions cover the two main paths.

`generateThemeVariables(theme)` takes a `Theme` and returns a full `:root { ... }` CSS block. It sets color, font, layout, and spacing variables.

`generateSettingsVariables(settings, baseTheme)` takes a `ThemeSettings` object (which includes per-tenant overrides) and merges it with the base theme. The accent color from settings always wins over the base theme's accent.

For client-side application, `applyThemeVariables(settings)` sets properties directly on `document.documentElement`. It guards against SSR with a `typeof window` check.

Accent color variations are generated using `color-mix()`:

```typescript
{
  "--accent-color": accentColor,
  "--accent-color-light": `color-mix(in srgb, ${accentColor} 80%, white 20%)`,
  "--accent-color-dark": `color-mix(in srgb, ${accentColor} 80%, black 20%)`,
  "--accent-color-hover": `color-mix(in srgb, ${accentColor} 90%, black 10%)`,
  "--accent-color-muted": `color-mix(in srgb, ${accentColor} 60%, ${accentColor} 40%)`,
}
```

## Prism Integration

Foliage depends on `@autumnsgrove/prism` (workspace:*). The relationship is one-directional: Prism owns the design tokens, Foliage consumes them.

What Prism provides to Foliage:

- **Color tokens**: `groveColors`, `cream`, `bark`, `semantic`, `status` (palettes with numeric shade keys)
- **Types**: `ThemeColors`, `ThemeGlass`, `GlassVariant`, `Season`, `SeasonalAffinity`, `ValidationResult`
- **Glass utilities**: `generateGlass()`, `generateDarkGlass()`, `generateMidnightBloomGlass()`, `hexToRgba()`
- **Contrast utilities**: `getContrastRatio()`, `meetsWCAGAA()`, `meetsWCAGAAA()`, `validateThemeContrast()`, `suggestReadableColor()`
- **Seasonal palettes**: `SEASONAL_PALETTES`

Foliage's `tokens/` and `utils/` directories are thin re-export layers over Prism. The `tokens/colors.ts` file renames `groveColors` back to `grove` for internal use (so theme files can write `grove[600]` instead of `groveColors[600]`).

If you are writing new code that needs color tokens or contrast checking, import from `@autumnsgrove/prism` directly. The Foliage re-exports exist for backward compatibility.

### The `./prism` subpath

Foliage's `package.json` exports a `./prism` subpath that bridges to Prism. This exists for consumers that historically imported Prism types through Foliage. Prefer the direct import.

## Why Things Break

**"Theme not showing up"**: The theme was added to `index.ts` but not to the `themes` Record in `registry.ts`. Both registrations are required. The registry is what `getTheme()` and `getThemesForTier()` read from.

**Contrast validation fails**: Your `foreground` or `foregroundMuted` color does not have 4.5:1 contrast against your `background` or `surface`. Use `getContrastRatio()` to test individual pairs. The Solarpunk theme had this issue early on with its muted green and fixed it by using `grove[700]` instead of `grove[600]`.

**`groveColors` vs `grove` confusion**: Prism exports `grove` (the raw palette), then its barrel renames it to `groveColors` to avoid collision with Foliage's `grove` theme export. Inside Foliage theme files, `tokens/colors.ts` renames it back to `grove`. Outside Foliage, use `groveColors` from Prism.

**`validateThemeContrast` type error**: The function accepts `{ colors: ThemeColors }`, not a full `Theme`. You can pass a Theme object (it has a `colors` field), but if you are passing a plain colors object, wrap it: `validateThemeContrast({ colors: myColors })`.

**Glass variants missing**: If you omit the `glass` property, your theme will work but glassmorphism components will fall back to defaults. Call `generateGlass()` with colors that match your theme.

**Spacing not updating**: The spacing scale is generated from the `layout.spacing` value, not from individual CSS overrides. Changing `--spacing-md` directly in custom CSS works but will be overwritten if the theme re-applies.

**Build output stale**: Foliage builds with `svelte-kit sync && svelte-package`. If you change types or exports and consumers do not pick up the changes, rebuild. The `.prettierignore` must exclude `dist`, `.svelte-kit`, and `node_modules` to prevent generated files from breaking `prettier --check`.

## Key Files

| File | Purpose |
|------|---------|
| `libs/foliage/src/lib/types.ts` | All type definitions (Theme, ThemeSettings, UserTier, etc.) |
| `libs/foliage/src/lib/themes/registry.ts` | Theme lookup map and tier-filtered queries |
| `libs/foliage/src/lib/themes/grove.ts` | Default theme, good reference for new themes |
| `libs/foliage/src/lib/utils/tier-access.ts` | Tier hierarchy and access-check functions |
| `libs/foliage/src/lib/utils/css-vars.ts` | CSS variable generation and DOM application |
| `libs/foliage/src/lib/utils/contrast.ts` | Re-export of Prism contrast utilities |
| `libs/foliage/src/lib/utils/glass.ts` | Re-export of Prism glass generators |
| `libs/foliage/src/lib/tokens/colors.ts` | Re-export of Prism colors (with `grove` rename) |
| `libs/foliage/src/index.ts` | Package entry point, re-exports everything |
| `libs/prism/src/lib/utils/contrast.ts` | Actual contrast/WCAG implementation |
| `libs/prism/src/lib/types.ts` | Source of ThemeColors, ThemeGlass, Season types |

## Quick Checklist

When adding a new theme:

- [ ] Create theme file in `libs/foliage/src/lib/themes/`
- [ ] Set `tier` to `"seedling"` or `"sapling"`
- [ ] Import color tokens from `../tokens/colors.js`
- [ ] Include system-ui fallbacks in all font stacks
- [ ] Call `generateGlass()` for glassmorphism support
- [ ] Set `seasonalAffinity` (or omit to leave it undefined)
- [ ] Export from `libs/foliage/src/lib/themes/index.ts`
- [ ] Add to the `themes` Record in `registry.ts` (key matches `id`)
- [ ] Run `validateThemeContrast()` and confirm `valid: true`
- [ ] Check that `foregroundMuted` passes 4.5:1 against both `background` and `surface`
- [ ] Rebuild: `svelte-kit sync && svelte-package`
