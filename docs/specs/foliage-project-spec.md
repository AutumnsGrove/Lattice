---
title: Foliage — Theme System
description: Customizable themes and visual customization options
category: specs
specCategory: platform-services
icon: swatchbook
lastUpdated: "2026-03-11"
aliases: []
tags:
  - themes
  - customization
  - svelte
---

# Foliage — Theme System

```
                    🍂          🍃
              🍃                      🍂
                        🍃
           🍂    ·  ·        ·  ·    🍃
                                          🍂
        🍃          🍂    🍃
                              ·  ·          🍃
              🍂         🍃         🍂
                   🍃          🍂
         ·  ·            🍃            ·  ·

              layers of expression
         rooted in the same trunk
```

> _Every person's theme is different—all belong to one garden._

Grove's theme system enabling visual customization from accent colors to full theme customizers. Extracted from Lattice to be independently testable and reusable, with progressive enhancement unlocking more features at higher tiers.

## Overview

**Internal Name:** GroveThemes
**Public Name:** Foliage
**Location:** `libs/foliage/` (Lattice monorepo)
**Package:** `@autumnsgrove/foliage`
**Dependency:** `@autumnsgrove/prism` (design tokens, glass, contrast)

Foliage is Grove's theme system enabling visual customization from accent colors to full theme customizers. Lives in the Lattice monorepo as a workspace library, independently testable and reusable across Grove properties. Built on top of Prism for design tokens, glassmorphism, seasonal palettes, and WCAG contrast utilities.

## Design Philosophy

- **Personal expression:** Blogs should reflect user personality
- **Guardrails:** Customization maintains readability standards
- **Progressive enhancement:** More features unlock at higher subscription tiers
- **Community:** Users can share and discover themes (Oak+ tier)

## Tier Access Matrix

| Tier          | Themes | Accent Color | Customizer | Community | Custom Fonts |
| ------------- | ------ | ------------ | ---------- | --------- | ------------ |
| **Wanderer**  | —      | —            | —          | —         | —            |
| **Seedling**  | 3      | Custom       | —          | —         | —            |
| **Sapling**   | 10     | Custom       | —          | —         | —            |
| **Oak**       | 10     | Custom       | Full       | Import    | —            |
| **Evergreen** | 10     | Custom       | Full       | Import    | Upload       |

## Core Features

### 1. Accent Color (All Paid Tiers)

Single color tinting interactive elements including links, buttons, hover states, selection highlights, blockquote borders, and code block accents. Collected during signup or changeable in Settings using CSS variables with color-mix for light/dark variants.

### 2. Curated Themes (10 Total)

| #   | Theme        | Vibe                      | Layout     | Tier      |
| --- | ------------ | ------------------------- | ---------- | --------- |
| 1   | Grove        | Warm, earthy, cozy        | Sidebar    | Seedling+ |
| 2   | Minimal      | Clean, typography-focused | No sidebar | Seedling+ |
| 3   | Night Garden | Dark mode, gentle greens  | Sidebar    | Seedling+ |
| 4   | Zine         | Bold, magazine-style      | Grid       | Sapling+  |
| 5   | Moodboard    | Pinterest-style           | Masonry    | Sapling+  |
| 6   | Typewriter   | Retro, monospace, paper   | Centered   | Sapling+  |
| 7   | Solarpunk    | Bright, optimistic        | Full-width | Sapling+  |
| 8   | Cozy Cabin   | Warm browns, intimate     | Sidebar    | Sapling+  |
| 9   | Ocean        | Cool blues, calm          | No sidebar | Sapling+  |
| 10  | Wildflower   | Colorful, playful         | Flexible   | Sapling+  |

Seedlings access three core themes (Grove, Minimal, Night Garden) representing fundamental archetypes.

### 3. Theme Customizer (Oak+)

Full control over appearance with sections for:

- **Colors:** Background, text, accents, borders, surfaces
- **Typography:** Heading font, body font, sizes, line height
- **Layout:** Sidebar toggle, max width, spacing
- **Spacing:** Margins, padding, gap sizes
- **Effects:** Border radius, shadows, transitions
- **Custom CSS:** Raw CSS for advanced users (max 10KB, validated)

### 4. Custom Fonts (Evergreen Only)

Upload up to 10 custom fonts with specifications:

- **Formats:** WOFF2 (required), WOFF (optional fallback)
- **Size limit:** 500KB per file
- **Storage:** R2 under user's allocation
- **Validation:** Magic byte verification, font parsing, sanitized names

### 5. Community Themes (Oak+)

Users share customizations with the community supporting:

- Browse and import themes
- Rating and download tracking
- Moderation queue for quality
- Fork and modify support
- Attribution to original creator

## Project Structure

```
libs/foliage/
├── src/
│ ├── lib/
│ │ ├── themes/
│ │ │ ├── index.ts          # Theme exports
│ │ │ ├── registry.ts       # Theme registry + tier filtering
│ │ │ ├── grove.ts           # Default theme (seedling)
│ │ │ ├── minimal.ts         # (seedling)
│ │ │ ├── night-garden.ts    # (seedling)
│ │ │ ├── zine.ts            # (sapling)
│ │ │ ├── moodboard.ts       # (sapling)
│ │ │ ├── typewriter.ts      # (sapling)
│ │ │ ├── solarpunk.ts       # (sapling)
│ │ │ ├── cozy-cabin.ts      # (sapling)
│ │ │ ├── ocean.ts           # (sapling)
│ │ │ └── wildflower.ts      # (sapling)
│ │ ├── components/
│ │ │ ├── index.ts           # Component exports
│ │ │ ├── ThemeSelector.svelte
│ │ │ ├── ThemePreview.svelte
│ │ │ ├── AccentColorPicker.svelte
│ │ │ ├── ThemeCustomizer.svelte    # 4-tab panel (Colors/Typography/Layout/CSS)
│ │ │ ├── ColorPanel.svelte
│ │ │ ├── TypographyPanel.svelte
│ │ │ ├── LayoutPanel.svelte
│ │ │ ├── CustomCSSEditor.svelte
│ │ │ ├── FontUploader.svelte       # Drag-drop WOFF2 upload (Evergreen)
│ │ │ ├── ThemeRating.svelte        # 5-star rating (Oak+)
│ │ │ ├── CommunityThemeBrowser.svelte  # Browse/search/filter (Oak+)
│ │ │ ├── CommunityThemeSubmit.svelte   # Submit to community (Oak+)
│ │ │ └── ModerationQueue.svelte    # Admin review queue
│ │ ├── server/
│ │ │ ├── index.ts           # Server exports
│ │ │ ├── theme-loader.ts    # Load theme from D1
│ │ │ ├── theme-saver.ts     # Save/delete theme settings
│ │ │ ├── font-validator.ts  # WOFF2 magic byte validation
│ │ │ ├── css-validator.ts   # Custom CSS sanitization
│ │ │ ├── font-uploader.ts   # R2 font storage
│ │ │ └── community-themes.ts # Community CRUD, ratings, moderation
│ │ ├── stores/
│ │ │ ├── index.ts           # Store exports
│ │ │ └── theme.ts           # Light/dark/system preference store
│ │ ├── tokens/
│ │ │ ├── index.ts           # Prism color token re-exports
│ │ │ ├── colors.ts          # grove, bark, cream, semantic palettes
│ │ │ └── seasons.ts         # Seasonal palette mappings
│ │ ├── utils/
│ │ │ ├── index.ts           # Utils exports
│ │ │ ├── contrast.ts        # WCAG contrast (re-exports from Prism)
│ │ │ ├── css-vars.ts        # CSS variable generation
│ │ │ ├── glass.ts           # Glassmorphism (re-exports from Prism)
│ │ │ └── tier-access.ts     # Feature gating by tier
│ │ └── types.ts             # Theme + community type definitions
│ └── index.ts               # Package entry point
├── tests/
│ ├── themes.test.ts
│ ├── contrast.test.ts
│ ├── css-validator.test.ts
│ ├── css-vars.test.ts
│ ├── font-validator.test.ts
│ ├── font-uploader.test.ts
│ ├── tier-access.test.ts
│ ├── community-themes.test.ts
│ ├── theme-switching.test.ts
│ ├── customizer.test.ts
│ ├── seasonal-palettes.test.ts
│ └── prism-contrast.test.ts
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## TypeScript Interfaces

```typescript
// src/lib/types.ts
// Types marked with (Prism) are re-exported from @autumnsgrove/prism

export interface Theme {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  tier: "seedling" | "sapling";

  colors: ThemeColors;          // (Prism)
  fonts: ThemeFonts;
  layout: ThemeLayout;
  customCSS?: string;
  glass?: ThemeGlass;           // (Prism) Glassmorphism variants
  seasonalAffinity?: SeasonalAffinity; // (Prism) Which season(s) this theme pairs with
}

// ThemeColors — imported from @autumnsgrove/prism
export interface ThemeColors {
  background: string;
  surface: string;
  foreground: string;
  foregroundMuted: string;
  accent: string;
  border: string;
}

export interface ThemeFonts {
  heading: string;
  body: string;
  mono: string;
}

export interface ThemeLayout {
  type:
    | "sidebar"
    | "no-sidebar"
    | "centered"
    | "full-width"
    | "grid"
    | "masonry";
  maxWidth: string;
  spacing: "compact" | "comfortable" | "spacious";
}

export interface ThemeSettings {
  tenantId: string;
  themeId: string;
  accentColor: string;
  customizerEnabled: boolean;
  customColors?: Partial<ThemeColors>;
  customTypography?: Partial<ThemeFonts>;
  customLayout?: Partial<ThemeLayout>;
  customGlass?: Partial<ThemeGlass>;
  customCSS?: string;
  communityThemeId?: string;
}

export interface CustomFont {
  id: string;
  tenantId: string;
  name: string;
  family: string;
  category: "sans-serif" | "serif" | "mono" | "display";
  woff2Path: string;
  woffPath?: string;
  fileSize: number;
}

export interface CommunityTheme {
  id: string;
  creatorTenantId: string;
  name: string;
  description?: string;
  tags?: string[];
  baseTheme: string;
  customColors?: Partial<ThemeColors>;
  customTypography?: Partial<ThemeFonts>;
  customLayout?: Partial<ThemeLayout>;
  customCSS?: string;
  thumbnailPath?: string;
  downloads: number;
  ratingSum: number;
  ratingCount: number;
  status: CommunityThemeStatus;
  reviewedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export type CommunityThemeStatus =
  | "draft"
  | "pending"
  | "in_review"
  | "approved"
  | "featured"
  | "changes_requested"
  | "rejected"
  | "removed";

export type UserTier = "wanderer" | "seedling" | "sapling" | "oak" | "evergreen";
```

## Database Schema

### theme_settings

```sql
CREATE TABLE theme_settings (
  tenant_id TEXT PRIMARY KEY,
  theme_id TEXT NOT NULL DEFAULT 'grove',
  accent_color TEXT DEFAULT '#4f46e5',
  customizer_enabled INTEGER DEFAULT 0,
  custom_colors TEXT, -- JSON
  custom_typography TEXT, -- JSON
  custom_layout TEXT, -- JSON
  custom_css TEXT,
  community_theme_id TEXT,
  updated_at INTEGER DEFAULT (unixepoch()),

  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);
```

### custom_fonts

```sql
CREATE TABLE custom_fonts (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  family TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('sans-serif', 'serif', 'mono', 'display')),
  woff2_path TEXT NOT NULL,
  woff_path TEXT,
  file_size INTEGER NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),

  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_custom_fonts_tenant ON custom_fonts(tenant_id);
```

### community_themes

```sql
CREATE TABLE community_themes (
  id TEXT PRIMARY KEY,
  creator_tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  tags TEXT, -- JSON array
  base_theme TEXT NOT NULL,
  custom_colors TEXT,
  custom_typography TEXT,
  custom_layout TEXT,
  custom_css TEXT,
  thumbnail_path TEXT,
  downloads INTEGER DEFAULT 0,
  rating_sum INTEGER DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('draft', 'pending', 'in_review', 'approved', 'featured', 'changes_requested', 'rejected', 'removed')),
  reviewed_at INTEGER,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),

  FOREIGN KEY (creator_tenant_id) REFERENCES tenants(id)
);

CREATE INDEX idx_community_themes_status ON community_themes(status);
CREATE INDEX idx_community_themes_creator ON community_themes(creator_tenant_id);
```

## Prism Integration

Foliage is built on top of `@autumnsgrove/prism`, Grove's design token library. Prism provides:

- **Color tokens:** `groveColors`, `cream`, `bark`, `semantic`, `status` palettes
- **Glass utilities:** `generateGlass()`, `generateDarkGlass()`, `generateMidnightBloomGlass()`
- **Contrast validation:** `getContrastRatio()`, `meetsWCAGAA()`, `meetsWCAGAAA()`
- **Seasonal palettes:** `SEASONAL_PALETTES` for seasonal color variation
- **Types:** `ThemeColors`, `ThemeGlass`, `GlassVariant`, `Season`, `SeasonalAffinity`, `ValidationResult`

Foliage re-exports these through `@autumnsgrove/foliage/prism` for convenience, but new code should import from Prism directly.

## Theme Store

Client-side light/dark/system preference management:

```typescript
import { themeStore } from '@autumnsgrove/foliage';

themeStore.setTheme('dark');     // Set explicitly
themeStore.toggle();              // Toggle light/dark
// themeStore.resolvedTheme      // Derived: resolves 'system' to actual light/dark
```

- Persists to `localStorage`
- Listens for `prefers-color-scheme` system changes
- Applies `.dark` class to `document.documentElement`

## Integration with Lattice

### 1. Package Exports

```typescript
// @autumnsgrove/foliage exports map
".":            // Types, themes, CSS vars, contrast, tier-access
"./themes":     // Theme registry only
"./components": // All 13 Svelte components
"./server":     // Server functions (D1, R2, validation)
"./prism":      // Prism re-exports (tokens, glass, contrast)
```

### 2. Layout Integration

```svelte
<!-- +layout.svelte -->
<script>
  import { applyThemeVariables } from '@autumnsgrove/foliage';

  const { data } = $props();

  $effect(() => {
    applyThemeVariables(data.themeSettings);
  });
</script>
```

### 3. Server-Side Loading

```typescript
// +layout.server.ts
import { loadThemeSettingsWithDefaults } from "@autumnsgrove/foliage/server";

export const load = async ({ locals }) => {
  const themeSettings = await loadThemeSettingsWithDefaults(locals.db, locals.tenant.id);
  return { themeSettings };
};
```

## Server Functions

### Theme Management

- `loadThemeSettings(db, tenantId)` — Load from D1 (returns null if not found)
- `loadThemeSettingsWithDefaults(db, tenantId)` — Falls back to Grove theme + `#16a34a` accent
- `hasThemeSettings(db, tenantId)` — Boolean check
- `saveThemeSettings(db, settings)` — Upsert to D1 with ON CONFLICT handling
- `deleteThemeSettings(db, tenantId)` — Remove settings

### CSS Validation

- `validateCustomCSS(css)` — Checks 10KB limit, blocks `@import`, `javascript:`, `expression()`, `binding()`, script tags, external URLs
- `sanitizeCSS(css)` — Strips dangerous patterns
- `ALLOWED_URL_PATTERNS` — Only Google Fonts domains permitted in `url()`

### Font Validation & Upload

- `validateWoff2(arrayBuffer)` — Magic byte check (`0x774F4632`) + 500KB max
- `validateWoff(arrayBuffer)` — Fallback WOFF validation
- `sanitizeFontName(name)` — Remove special characters for CSS safety
- `uploadFontToR2(file, bucket, key)` — Upload to Cloudflare R2
- `deleteFontFromR2(bucket, key)` — Cleanup
- Constants: `MAX_FONT_SIZE = 512000`, `MAX_FONTS_PER_TENANT = 10`

### Community Themes

- `createCommunityTheme(db, theme)` — Insert with status `draft`
- `getCommunityTheme(db, id)` — By ID
- `getCommunityThemesForCreator(db, tenantId)` — User's themes
- `listCommunityThemes(db, filter?)` — All approved/featured
- `updateCommunityThemeStatus(db, id, status)` — Moderation action
- `updateCommunityThemeRating(db, id, newRating)` — Atomic increment
- `incrementDownloadCount(db, id)` — Download tracking

## Theme Registry

Themes are registered in `registry.ts` with lookup and filtering:

```typescript
import { getTheme, getThemesForTier, themes, themeList } from '@autumnsgrove/foliage';

getTheme('grove');              // Single theme lookup
getThemesForTier('seedling');   // Returns: grove, minimal, night-garden
getThemesForTier('sapling');    // Returns: all 10 themes
getThemesForTier('wanderer');   // Returns: [] (no themes)
```

Each theme definition includes Prism glass variants and optional seasonal affinity:

```typescript
export const grove: Theme = {
  id: "grove",
  name: "Grove",
  description: "Warm, earthy, and cozy — the default Grove experience",
  tier: "seedling",
  colors: { /* semantic + grove palette tokens */ },
  fonts: { heading: "system-ui", body: "system-ui", mono: "ui-monospace" },
  layout: { type: "sidebar", maxWidth: "1200px", spacing: "comfortable" },
  glass: generateGlass({ /* Prism glass config */ }),
  seasonalAffinity: "all",
};
```

## UI Mockups

### Theme Selector Grid

Users browse all available themes with instant visual preview on hover.

```
┌─────────────────────────────────────────────────────────────┐
│  ✧ Choose Your Theme                                    [×] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  You have access to 10 themes. Pick one, or customize.      │
│                                                             │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐               │
│  │   Grove    │ │  Minimal   │ │ Night      │               │
│  │ (current)  │ │            │ │ Garden     │               │
│  │            │ │            │ │            │               │
│  │ [Preview]  │ │ [Preview]  │ │ [Preview]  │               │
│  │ [Select]   │ │ [Select]   │ │ [Select]   │               │
│  └────────────┘ └────────────┘ └────────────┘               │
│                                                             │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐               │
│  │    Zine    │ │ Moodboard  │ │ Typewriter │               │
│  │            │ │            │ │            │               │
│  │            │ │            │ │            │               │
│  │ [Preview]  │ │ [Preview]  │ │ [Preview]  │               │
│  │ [Select]   │ │ [Select]   │ │ [Select]   │               │
│  └────────────┘ └────────────┘ └────────────┘               │
│                                                             │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐               │
│  │ Solarpunk  │ │ Cozy Cabin │ │   Ocean    │               │
│  │            │ │            │ │            │               │
│  │            │ │            │ │            │               │
│  │ [Preview]  │ │ [Preview]  │ │ [Preview]  │               │
│  │ [Select]   │ │ [Select]   │ │ [Select]   │               │
│  └────────────┘ └────────────┘ └────────────┘               │
│                                                             │
│  ┌────────────────────────────┐                             │
│  │   Wildflower               │                             │
│  │                            │                             │
│  │ [Preview]                  │                             │
│  │ [Select]                   │                             │
│  └────────────────────────────┘                             │
│                                                             │
│  ────────────────────────────────────────────────────────   │
│  [← Back]                           [Customize instead →]   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Theme Preview Window

When user hovers over or clicks "Preview", a full-page mockup appears.

```
┌─────────────────────────────────────────────────────────────┐
│  ✧ Preview: Grove Theme                                 [×] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  🌿 Autumn's Blog                    [home] [posts] │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │                                                     │    │
│  │  The forest where I write.                          │    │
│  │                                                     │    │
│  │  ┌──────────────┐                                   │    │
│  │  │ Latest       │  ┌─ Vines ──────────────────┐     │    │
│  │  │ Post Title   │  │ Related Posts            │     │    │
│  │  │              │  │ • Autumn Reading List    │     │    │
│  │  │ January 13   │  │ • Thoughts on Growth     │     │    │
│  │  │              │  │ • Forest Walks           │     │    │
│  │  │ [Read more]  │  └──────────────────────────┘     │    │
│  │  └──────────────┘                                   │    │
│  │                                                     │    │
│  │  Warm, readable, with sidebar and vines.            │    │
│  │                                                     │    │
│  │  🌿 Accent: Custom purple tint                      │    │
│  │                                                     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ────────────────────────────────────────────────────────   │
│  [← Back]                            [Apply this theme →]   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Accent Color Picker

Simple color selection that tints all interactive elements.

```
┌─────────────────────────────────────────────────────────────┐
│  ✧ Customize Accent Color                          [×]      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Choose a color to tint links, buttons, and highlights.     │
│                                                             │
│  ┌──────────┐                                               │
│  │          │  Current: Deep Purple (#4f46e5)               │
│  │  🟣      │                                               │
│  │          │  [← Lighter]  [Darker →]                      │
│  └──────────┘                                               │
│                                                             │
│  Presets:                                                   │
│  [🔴 Red] [🟠 Orange] [🟡 Yellow] [🟢 Green] [🔵 Blue]        │
│  [🟣 Purple] [🔷 Indigo] [🩵 Cyan] [🟤 Brown] [⚫ Black]      │
│                                                             │
│  Or enter hex:                                              │
│  [#4f46e5________________________]                          │
│                                                             │
│  Preview (hover states):                                    │
│  [Link text]  [Button]  [Highlighted text]  [Border]        │
│                                                             │
│  ────────────────────────────────────────────────────────   │
│  [← Back]                                  [Save color →]   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Full Customizer Interface (Oak+ only)

Multi-panel customizer with live preview.

```
┌──────────────────────────────────────────────────────────────┐
│  ✧ Customize Your Theme                            [×]       │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐  ┌─────────────────────────────────┐   │
│  │ Panels:          │  │ Colors                          │   │
│  │ [Colors] ✓       │  │                                 │   │
│  │ [ ] Typography   │  │ Background: [  #ffffff  ]     │   │
│  │ [ ] Layout       │  │ Surface:    [  #f5f5f5  ]     │   │
│  │ [ ] Effects      │  │ Foreground: [  #1a1a1a  ]     │   │
│  │ [ ] Advanced CSS │  │ Accent:     [  #4f46e5  ]     │   │
│  │                  │  │ Border:     [  #e5e5e5  ]     │   │
│  │                  │  │ Muted Text: [  #808080  ]     │   │
│  │                  │  │                                 │   │
│  │                  │  │ [Reset colors to default]       │   │
│  └──────────────────┘  └─────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ Live Preview                                         │    │
│  │                                                      │    │
│  │ 🌿 Autumn's Blog                      [home] [posts] │    │
│  │ ──────────────────────────────────────────────────── │    │
│  │ The forest where I write.                            │    │
│  │ [This is how links look]                             │    │
│  │ [Button] styles [are shown] here in preview          │    │
│  │                                                      │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  ────────────────────────────────────────────────────────    │
│  [← Back]                          [Save customization →]    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Typing Panel View (expand when clicked):**

```
┌──────────────────────────────────────────────────────────────┐
│  Fonts                                                       │
│                                                              │
│  Heading Font:                                               │
│  [Select font ▼] Currently: Georgia                          │
│                                                              │
│  Body Font:                                                  │
│  [Select font ▼] Currently: -apple-system                    │
│                                                              │
│  Sizes:                                                      │
│  Base Size:     [16 px]  [← →]                               │
│  Heading Scale: [1.5]    [← →]                               │
│  Line Height:   [1.6]    [← →]                               │
│                                                              │
│  [Reset typography to default]                               │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Layout Panel View:**

```
┌──────────────────────────────────────────────────────────────┐
│  Layout                                                      │
│                                                              │
│  Type:                                                       │
│  [ ] Sidebar  [✓] No Sidebar  [ ] Centered                   │
│  [ ] Full-width  [ ] Grid  [ ] Masonry                       │
│                                                              │
│  Content Width:                                              │
│  [     65 ch     ]  (characters per line)                    │
│                                                              │
│  Spacing Level:                                              │
│  [ ] Compact  [✓] Comfortable  [ ] Spacious                  │
│                                                              │
│  [Reset layout to default]                                   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Advanced CSS Panel (Evergreen only):**

```
┌──────────────────────────────────────────────────────────────┐
│  Custom CSS                                                  │
│                                                              │
│  Advanced users: Add up to 10KB of custom CSS.               │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ /* Custom styles */                                  │    │
│  │ .post-title {                                        │    │
│  │   font-weight: 700;                                  │    │
│  │   letter-spacing: 0.05em;                            │    │
│  │ }                                                    │    │
│  │                                                      │    │
│  │ a:hover {                                            │    │
│  │   text-decoration: underline;                        │    │
│  │ }                                                    │    │
│  │                                                      │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  Size: 234 / 10240 bytes                                     │
│                                                              │
│  [Reset CSS to default]                                      │
│  [Validate CSS]  ✓ Valid                                     │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Before & After Comparison

After applying theme changes, user sees side-by-side comparison.

```
┌──────────────────────────────────────────────────────────┐
│  ✧ Review Your Changes                               [×] │
├──────────────────────────────────────────────────────────┤
│                                                          │
│   BEFORE (Grove)          │         AFTER (Your edits)   │
│   ─────────────────────────────────────────────────      │
│                           │                              │
│   🌿 Your Blog            │   🌿 Your Blog                │
│   ───────────────────     │   ───────────────────        │
│   [Warm greens]           │   [Custom purple]            │
│   [Georgia serif]         │   [Playfair serif]           │
│   [Sidebar layout]        │   [No sidebar layout]        │
│   [Comfortable spacing]   │   [Spacious spacing]         │
│                           │                              │
│   Links: #2d5a2d        │   Links: #8b5cf6           │
│   Buttons: subtle         │   Buttons: bold, rounded     │
│                           │                              │
│   ─────────────────────────────────────────────────      │
│                           │                              │
│   [ Accept changes]   [← Edit more]     [Discard →]      │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Custom Fonts Uploader (Evergreen only)

```
┌─────────────────────────────────────────────────────────┐
│  ✧ Upload Custom Fonts                              [×] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  You have 10 slots. Currently using 0.                  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │ 📤 Drop fonts here or click to browse           │    │
│  │                                                 │    │
│  │ Accepted: .woff2, .woff                         │    │
│  │ Max: 500KB per file                             │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  Uploaded Fonts:                                        │
│  (none yet)                                             │
│                                                         │
│  Font Guidelines:                                       │
│  • Name it clearly (e.g., "Playfair Display")           │
│  • Choose the category (serif, sans, mono, display)     │
│  • Web-optimized WOFF2 format recommended               │
│  • Will be available in the customizer                  │
│                                                         │
│  ────────────────────────────────────────────────       │
│  [← Back]                          [Upload font →]      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Accessibility Requirements

All themes must:

- Meet WCAG 2.1 AA contrast (4.5:1 for body text)
- Have visible focus states
- Not rely on color alone for information
- Respect `prefers-reduced-motion`
- Work on mobile, tablet, desktop

### Contrast Validation

```typescript
// src/lib/utils/contrast.ts (re-exports from Prism)
export function getRelativeLuminance(hex: string): number;
export function getContrastRatio(hex1: string, hex2: string): number;
export function meetsWCAGAA(hex1: string, hex2: string): boolean;
export function meetsWCAGAAA(hex1: string, hex2: string): boolean;
export function validateThemeContrast(theme: Theme): ValidationResult;
export function suggestReadableColor(hex: string): "white" | "black";
```

## Custom CSS Security

**Restrictions:**

- No `@import` (prevents external resource loading)
- No `url()` except safe font sources
- Max 10KB
- Validated before save

```typescript
// src/lib/server/css-validator.ts
export function validateCustomCSS(css: string): ValidationResult {
  // Check size
  if (css.length > 10240) return { valid: false, error: "Max 10KB" };

  // Block @import
  if (/@import/i.test(css))
    return { valid: false, error: "No @import allowed" };

  // Block external URLs (except fonts)
  const urlPattern = /url\s*\([^)]+\)/gi;
  // ... validation logic

  return { valid: true };
}
```

## Package Configuration

```
Package:      @autumnsgrove/foliage
Location:     libs/foliage/ (workspace library)
Dependencies: @autumnsgrove/prism (workspace:*)
Peer deps:    svelte ^5.0.0
License:      AGPL-3.0

Exports:
  .             → Types, themes, CSS vars, contrast, tier-access
  ./themes      → Theme registry only
  ./components  → All Svelte components
  ./server      → Server functions (D1, R2, validation)
  ./prism       → Prism re-exports (tokens, glass, contrast)
```

## Success Metrics

- All 10 themes meet WCAG AA contrast
- Theme load time < 50ms
- Customizer live preview < 100ms latency
- Custom CSS validation < 10ms
- Font upload validation < 500ms
- Zero XSS vulnerabilities in custom CSS

---

**Summary:** Foliage enables personal expression while maintaining quality and accessibility that Grove promises. From simple accent colors to full custom themes, every user can make their space feel like home.
