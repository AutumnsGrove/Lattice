---
title: Foliage — Theme System
description: Customizable themes and visual customization options
category: specs
specCategory: platform-services
icon: swatchbook
lastUpdated: "2025-12-01"
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

## Overview Section

**Internal Name:** GroveThemes
**Public Name:** Foliage
**Repository:** `AutumnsGrove/Foliage`
**Package:** `@autumnsgrove/foliage`

Foliage is Grove's theme system enabling visual customization from accent colors to full theme customizers. The project is extracted from Lattice to be independently testable, reusable across Grove properties, and maintainable as a focused codebase.

## Design Philosophy

- **Personal expression:** Blogs should reflect user personality
- **Guardrails:** Customization maintains readability standards
- **Progressive enhancement:** More features unlock at higher subscription tiers
- **Community:** Users can share and discover themes (Oak+ tier)

## Tier Access Matrix

| Tier          | Themes | Accent Color | Customizer | Community | Custom Fonts |
| ------------- | ------ | ------------ | ---------- | --------- | ------------ |
| **Free**      | —      | —            | —          | —         | —            |
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
foliage/
├── src/
│ ├── lib/
│ │ ├── themes/
│ │ │ ├── index.ts # Theme exports
│ │ │ ├── grove.ts # Grove theme definition
│ │ │ ├── minimal.ts
│ │ │ ├── night-garden.ts
│ │ │ ├── zine.ts
│ │ │ ├── moodboard.ts
│ │ │ ├── typewriter.ts
│ │ │ ├── solarpunk.ts
│ │ │ ├── cozy-cabin.ts
│ │ │ ├── ocean.ts
│ │ │ └── wildflower.ts
│ │ ├── components/
│ │ │ ├── ThemeSelector.svelte
│ │ │ ├── ThemePreview.svelte
│ │ │ ├── AccentColorPicker.svelte
│ │ │ ├── ThemeCustomizer.svelte
│ │ │ ├── ColorPanel.svelte
│ │ │ ├── TypographyPanel.svelte
│ │ │ ├── LayoutPanel.svelte
│ │ │ ├── CustomCSSEditor.svelte
│ │ │ └── FontUploader.svelte
│ │ ├── server/
│ │ │ ├── theme-loader.ts # Load theme from D1
│ │ │ ├── theme-saver.ts # Save theme settings
│ │ │ ├── font-validator.ts # WOFF2 validation
│ │ │ └── css-validator.ts # Custom CSS sanitization
│ │ ├── utils/
│ │ │ ├── contrast.ts # WCAG contrast checking
│ │ │ ├── css-vars.ts # CSS variable generation
│ │ │ └── tier-access.ts # Feature gating by tier
│ │ └── types.ts # Theme interfaces
│ └── index.ts # Package entry point
├── migrations/
│ ├── 001_theme_settings.sql
│ ├── 002_custom_fonts.sql
│ └── 003_community_themes.sql
├── tests/
│ ├── themes.test.ts
│ ├── customizer.test.ts
│ ├── contrast.test.ts
│ └── css-validator.test.ts
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## TypeScript Interfaces

```typescript
// src/lib/types.ts

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
}

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

export type UserTier = "free" | "seedling" | "sapling" | "oak" | "evergreen";
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

## Integration with Lattice

### 1. Package Export

```typescript
// In Lattice's package.json exports
"./foliage": "./src/lib/foliage/index.js"

// Usage in tenant sites
import { loadTheme, ThemeSelector } from '@autumnsgrove/lattice/foliage';
```

### 2. Layout Integration

```svelte
<!-- +layout.svelte -->
<script>
  import { loadTheme, applyThemeVariables } from '@autumnsgrove/lattice/foliage';

  const { data } = $props();

  $effect(() => {
    applyThemeVariables(data.themeSettings);
  });
</script>
```

### 3. Server-Side Loading

```typescript
// +layout.server.ts
import { loadThemeSettings } from "@autumnsgrove/lattice/foliage";
import { db } from "@autumnsgrove/lattice/services";

export const load = async ({ locals }) => {
  const themeSettings = await loadThemeSettings(locals.db, locals.tenant.id);
  return { themeSettings };
};
```

## Implementation Phases

### Phase 1: Foundation (Week 1-2)

- Initialize repository with SvelteKit library mode
- Set up TypeScript, Vitest, ESLint
- Implement CSS variable system
- Create `applyThemeVariables()` utility
- Build `AccentColorPicker` component
- Write theme_settings migration

### Phase 2: Curated Themes (Week 3-4)

- Design and implement Grove theme (default)
- Design and implement Minimal theme
- Design and implement Night Garden theme
- Build `ThemeSelector` component
- Build `ThemePreview` component
- Add tier gating logic

### Phase 3: Remaining Themes (Week 5-6)

- Implement Zine, Moodboard, Typewriter
- Implement Solarpunk, Cozy Cabin, Ocean, Wildflower
- Add theme thumbnails
- Complete theme preview functionality

### Phase 4: Customizer (Week 7-9)

- Build customizer sidebar UI
- Implement live preview
- Build ColorPanel component
- Build TypographyPanel component
- Build LayoutPanel component
- Implement CustomCSSEditor with validation
- Add reset to default

### Phase 5: Custom Fonts (Week 10)

- Build FontUploader component
- Implement WOFF2 validation (magic bytes, parsing)
- Add R2 storage integration
- Add font limit enforcement (10 per tenant)

### Phase 6: Community Themes (Week 11-13)

- Build theme sharing flow
- Create community theme browser
- Implement theme import
- Build moderation queue
- Add rating and download tracking

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
// src/lib/utils/contrast.ts
export function getContrastRatio(fg: string, bg: string): number;
export function meetsWCAGAA(fg: string, bg: string): boolean;
export function validateThemeContrast(theme: Theme): ValidationResult;
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

## Package.json Template

```json
{
  "name": "@autumnsgrove/foliage",
  "version": "0.1.0",
  "description": "Theme system for Grove — personal expression with modern guardrails",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "svelte": "./dist/index.js",
      "default": "./dist/index.js"
    },
    "./themes": {
      "types": "./dist/themes/index.d.ts",
      "default": "./dist/themes/index.js"
    },
    "./components": {
      "types": "./dist/components/index.d.ts",
      "svelte": "./dist/components/index.js",
      "default": "./dist/components/index.js"
    },
    "./server": {
      "types": "./dist/server/index.d.ts",
      "default": "./dist/server/index.js"
    }
  },
  "svelte": "./dist/index.js",
  "files": ["dist"],
  "scripts": {
    "dev": "vite dev",
    "build": "svelte-kit sync && svelte-package",
    "test": "vitest",
    "check": "svelte-check --tsconfig ./tsconfig.json",
    "lint": "eslint ."
  },
  "peerDependencies": {
    "svelte": "^5.0.0"
  },
  "devDependencies": {
    "@sveltejs/kit": "^2.0.0",
    "@sveltejs/package": "^2.0.0",
    "@sveltejs/vite-plugin-svelte": "^4.0.0",
    "svelte": "^5.0.0",
    "svelte-check": "^4.0.0",
    "typescript": "^5.0.0",
    "vite": "^6.0.0",
    "vitest": "^4.0.0"
  },
  "keywords": ["grove", "themes", "svelte", "css", "customization"],
  "license": "AGPL-3.0",
  "repository": {
    "type": "git",
    "url": "https://github.com/AutumnsGrove/Foliage.git"
  }
}
```

## Repository Initialization Checklist

- Create `AutumnsGrove/Foliage` on GitHub
- Initialize with `pnpm create svelte@latest` (library mode)
- Copy this spec to `docs/PROJECT-SPEC.md`
- Create `AGENT.md` with project-specific instructions
- Set up GitHub Actions for CI
- Add AGPL-3.0 license
- Create migrations directory
- Set up Vitest for testing
- Add Svelte 5 type definitions
- Configure package exports

## Success Metrics

- All 10 themes meet WCAG AA contrast
- Theme load time < 50ms
- Customizer live preview < 100ms latency
- Custom CSS validation < 10ms
- Font upload validation < 500ms
- Zero XSS vulnerabilities in custom CSS

---

**Summary:** Foliage enables personal expression while maintaining quality and accessibility that Grove promises. From simple accent colors to full custom themes, every user can make their space feel like home.
