# Foliage — Theme System Project Specification

> *Foliage: The leaves, the color, the personality. No two canopies are quite the same.*

**Internal Name:** GroveThemes
**Public Name:** Foliage
**Repository:** `AutumnsGrove/Foliage`
**Package:** `@autumnsgrove/foliage`
**Status:** Package implemented, pending GroveEngine integration

---

## Overview

Foliage is Grove's theme system — providing visual customization from simple accent colors to full theme customizers. It enables MySpace-level personalization with modern design sensibilities: make your blog feel like *yours*.

This project is extracted from GroveEngine to be:
1. **Independently testable** — theme logic separate from engine
2. **Reusable** — can power theming across Grove properties
3. **Maintainable** — focused codebase for theme development

---

## Design Philosophy

- **Personal expression:** Your blog should reflect your personality
- **Guardrails:** Even with customization, blogs should remain readable
- **Progressive enhancement:** More customization unlocks at higher tiers
- **Community:** Users can share and discover themes (Oak+)

---

## Tier Access Matrix

| Tier | Themes | Accent Color | Customizer | Community | Custom Fonts |
|------|:------:|:------------:|:----------:|:---------:|:------------:|
| **Free** | — | — | — | — | — |
| **Seedling** | 3 | Custom | — | — | — |
| **Sapling** | 10 | Custom | — | — | — |
| **Oak** | 10 | Custom | Full | Import | — |
| **Evergreen** | 10 | Custom | Full | Import | Upload |

---

## Core Features

### 1. Accent Color (All Paid Tiers)

A single color tinting interactive elements:
- Links, buttons, hover states
- Selection highlights
- Blockquote borders
- Code block accents

Collected during signup (favorite color) or changed in Settings.

```css
:root {
  --accent-color: #4f46e5;
  --accent-color-light: color-mix(in srgb, var(--accent-color) 20%, white);
  --accent-color-dark: color-mix(in srgb, var(--accent-color) 80%, black);
}
```

---

### 2. Curated Themes (10 Total)

| # | Theme | Vibe | Layout | Tier |
|---|-------|------|--------|------|
| 1 | **Grove** | Warm, earthy, cozy | Sidebar | Seedling+ |
| 2 | **Minimal** | Clean, typography-focused | No sidebar | Seedling+ |
| 3 | **Night Garden** | Dark mode, gentle greens | Sidebar | Seedling+ |
| 4 | **Zine** | Bold, magazine-style | Grid | Sapling+ |
| 5 | **Moodboard** | Pinterest-style | Masonry | Sapling+ |
| 6 | **Typewriter** | Retro, monospace, paper | Centered | Sapling+ |
| 7 | **Solarpunk** | Bright, optimistic | Full-width | Sapling+ |
| 8 | **Cozy Cabin** | Warm browns, intimate | Sidebar | Sapling+ |
| 9 | **Ocean** | Cool blues, calm | No sidebar | Sapling+ |
| 10 | **Wildflower** | Colorful, playful | Flexible | Sapling+ |

Seedlings get 3 themes (Grove, Minimal, Night Garden) — representing core archetypes.

---

### 3. Theme Customizer (Oak+)

Full control over appearance:

| Section | Options |
|---------|---------|
| **Colors** | Background, text, accents, borders, surfaces |
| **Typography** | Heading font, body font, sizes, line height |
| **Layout** | Sidebar yes/no, max width, spacing |
| **Spacing** | Margins, padding, gap sizes |
| **Effects** | Border radius, shadows, transitions |
| **Custom CSS** | Raw CSS for advanced users (max 10KB, validated) |

---

### 4. Custom Fonts (Evergreen Only)

Upload up to 4 custom fonts:
- **Formats:** WOFF2 (required), WOFF (optional fallback)
- **Size limit:** 500KB per file
- **Storage:** R2 under user's allocation
- **Validation:** Magic byte verification, font parsing, sanitized names

---

### 5. Community Themes (Oak+)

Users share customizations with the community:
- Browse and import themes
- Rating and download tracking
- Moderation queue for quality
- Fork and modify support
- Attribution to original creator

---

## Project Structure

```
foliage/
├── src/
│   ├── lib/
│   │   ├── themes/
│   │   │   ├── index.ts           # Theme exports
│   │   │   ├── grove.ts           # Grove theme definition
│   │   │   ├── minimal.ts
│   │   │   ├── night-garden.ts
│   │   │   ├── zine.ts
│   │   │   ├── moodboard.ts
│   │   │   ├── typewriter.ts
│   │   │   ├── solarpunk.ts
│   │   │   ├── cozy-cabin.ts
│   │   │   ├── ocean.ts
│   │   │   └── wildflower.ts
│   │   ├── components/
│   │   │   ├── ThemeSelector.svelte
│   │   │   ├── ThemePreview.svelte
│   │   │   ├── AccentColorPicker.svelte
│   │   │   ├── ThemeCustomizer.svelte
│   │   │   ├── ColorPanel.svelte
│   │   │   ├── TypographyPanel.svelte
│   │   │   ├── LayoutPanel.svelte
│   │   │   ├── CustomCSSEditor.svelte
│   │   │   └── FontUploader.svelte
│   │   ├── server/
│   │   │   ├── theme-loader.ts    # Load theme from D1
│   │   │   ├── theme-saver.ts     # Save theme settings
│   │   │   ├── font-validator.ts  # WOFF2 validation
│   │   │   └── css-validator.ts   # Custom CSS sanitization
│   │   ├── utils/
│   │   │   ├── contrast.ts        # WCAG contrast checking
│   │   │   ├── css-vars.ts        # CSS variable generation
│   │   │   └── tier-access.ts     # Feature gating by tier
│   │   └── types.ts               # Theme interfaces
│   └── index.ts                   # Package entry point
├── migrations/
│   ├── 001_theme_settings.sql
│   ├── 002_custom_fonts.sql
│   └── 003_community_themes.sql
├── tests/
│   ├── themes.test.ts
│   ├── customizer.test.ts
│   ├── contrast.test.ts
│   └── css-validator.test.ts
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## TypeScript Interfaces

```typescript
// src/lib/types.ts

export interface Theme {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  tier: 'seedling' | 'sapling';

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
  type: 'sidebar' | 'no-sidebar' | 'centered' | 'full-width' | 'grid' | 'masonry';
  maxWidth: string;
  spacing: 'compact' | 'comfortable' | 'spacious';
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
  category: 'sans-serif' | 'serif' | 'mono' | 'display';
  woff2Path: string;
  woffPath?: string;
  fileSize: number;
}

export type UserTier = 'free' | 'seedling' | 'sapling' | 'oak' | 'evergreen';
```

---

## Database Schema

### theme_settings

```sql
CREATE TABLE theme_settings (
  tenant_id TEXT PRIMARY KEY,
  theme_id TEXT NOT NULL DEFAULT 'grove',
  accent_color TEXT DEFAULT '#4f46e5',
  customizer_enabled INTEGER DEFAULT 0,
  custom_colors TEXT,      -- JSON
  custom_typography TEXT,  -- JSON
  custom_layout TEXT,      -- JSON
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
  tags TEXT,  -- JSON array
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

---

## Integration with GroveEngine

Foliage integrates with GroveEngine via:

### 1. Package Export

```typescript
// In GroveEngine's package.json exports
"./foliage": "./src/lib/foliage/index.js"

// Usage in tenant sites
import { loadTheme, ThemeSelector } from '@autumnsgrove/groveengine/foliage';
```

### 2. Layout Integration

```svelte
<!-- +layout.svelte -->
<script>
  import { loadTheme, applyThemeVariables } from '@autumnsgrove/groveengine/foliage';

  const { data } = $props();

  $effect(() => {
    applyThemeVariables(data.themeSettings);
  });
</script>
```

### 3. Server-Side Loading

```typescript
// +layout.server.ts
import { loadThemeSettings } from '@autumnsgrove/groveengine/foliage';
import { db } from '@autumnsgrove/groveengine/services';

export const load = async ({ locals }) => {
  const themeSettings = await loadThemeSettings(locals.db, locals.tenant.id);
  return { themeSettings };
};
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Initialize repository with SvelteKit library mode
- [ ] Set up TypeScript, Vitest, ESLint
- [ ] Implement CSS variable system
- [ ] Create `applyThemeVariables()` utility
- [ ] Build `AccentColorPicker` component
- [ ] Write theme_settings migration

### Phase 2: Curated Themes (Week 3-4)
- [ ] Design and implement Grove theme (default)
- [ ] Design and implement Minimal theme
- [ ] Design and implement Night Garden theme
- [ ] Build `ThemeSelector` component
- [ ] Build `ThemePreview` component
- [ ] Add tier gating logic

### Phase 3: Remaining Themes (Week 5-6)
- [ ] Implement Zine, Moodboard, Typewriter
- [ ] Implement Solarpunk, Cozy Cabin, Ocean, Wildflower
- [ ] Add theme thumbnails
- [ ] Complete theme preview functionality

### Phase 4: Customizer (Week 7-9)
- [ ] Build customizer sidebar UI
- [ ] Implement live preview
- [ ] Build ColorPanel component
- [ ] Build TypographyPanel component
- [ ] Build LayoutPanel component
- [ ] Implement CustomCSSEditor with validation
- [ ] Add reset to default

### Phase 5: Custom Fonts (Week 10)
- [ ] Build FontUploader component
- [ ] Implement WOFF2 validation (magic bytes, parsing)
- [ ] Add R2 storage integration
- [ ] Add font limit enforcement (4 per tenant)

### Phase 6: Community Themes (Week 11-13)
- [ ] Build theme sharing flow
- [ ] Create community theme browser
- [ ] Implement theme import
- [ ] Build moderation queue
- [ ] Add rating and download tracking

---

## GroveEngine Integration Implementation

> **Status:** Ready to implement
> **Prerequisite:** Foliage package published to npm

This section covers integrating `@autumnsgrove/foliage` into GroveEngine for per-tenant theming.

### Infrastructure Requirements

**Database Migrations:**
Copy Foliage migrations to GroveEngine (renumber as needed):
- `migrations/014_theme_settings.sql`
- `migrations/015_custom_fonts.sql`
- `migrations/016_community_themes.sql`

**R2 Bucket for Custom Fonts:**
```toml
# In wrangler.toml (or sst.config.ts when migrated)
[[r2_buckets]]
binding = "FONTS_BUCKET"
bucket_name = "foliage-fonts"
```

### Layout Integration

**Server-side theme loading:**
```typescript
// packages/engine/src/routes/+layout.server.ts
import { loadThemeSettings } from '@autumnsgrove/foliage/server';

export const load = async ({ platform, locals }) => {
  const themeSettings = locals.tenantId
    ? await loadThemeSettings(platform.env.DB, locals.tenantId)
    : null;

  return {
    tenant: locals.tenant,
    themeSettings,
  };
};
```

**Client-side theme application:**
```svelte
<!-- packages/engine/src/routes/+layout.svelte -->
<script lang="ts">
  import { generateThemeVariables, getTheme } from '@autumnsgrove/foliage';

  let { data, children } = $props();

  const themeCSS = $derived(() => {
    if (!data.themeSettings) return '';
    const baseTheme = getTheme(data.themeSettings.themeId);
    return generateThemeVariables({
      ...baseTheme,
      colors: {
        ...baseTheme.colors,
        ...data.themeSettings.customColors,
        accent: data.themeSettings.accentColor,
      },
    });
  });
</script>

<svelte:head>
  {#if themeCSS}
    {@html `<style>:root { ${themeCSS} }</style>`}
  {/if}
</svelte:head>

{@render children()}
```

### Admin Routes

Create theme management pages in engine admin:

| Route | Component | Tier |
|-------|-----------|------|
| `/admin/themes` | `ThemeSelector` | All paid |
| `/admin/themes/customize` | `ThemeCustomizer` | Oak+ |
| `/admin/themes/community` | `CommunityThemeBrowser` | Oak+ |
| `/admin/themes/fonts` | `FontUploader` | Evergreen |

### API Routes

```typescript
// packages/engine/src/routes/api/themes/+server.ts
import { loadThemeSettings, saveThemeSettings } from '@autumnsgrove/foliage/server';
import { canUseCustomizer } from '@autumnsgrove/foliage';
import { json } from '@sveltejs/kit';

export const GET = async ({ platform, locals }) => {
  const settings = await loadThemeSettings(platform.env.DB, locals.tenantId);
  return json(settings);
};

export const PATCH = async ({ platform, locals, request }) => {
  const body = await request.json();

  // Tier-gate customizer features
  if (body.customColors && !canUseCustomizer(locals.tenant.tier)) {
    return json({ error: 'Oak+ required' }, { status: 403 });
  }

  await saveThemeSettings(platform.env.DB, {
    tenantId: locals.tenantId,
    ...body,
  });

  return json({ success: true });
};
```

### Integration Checklist

- [ ] Install: `pnpm add @autumnsgrove/foliage --filter @autumnsgrove/groveengine`
- [ ] Copy migrations (014, 015, 016) to engine
- [ ] Run migrations against D1
- [ ] Create R2 bucket for fonts
- [ ] Update `+layout.server.ts` to load theme settings
- [ ] Update `+layout.svelte` to apply theme CSS vars
- [ ] Create `/admin/themes/` routes with Foliage components
- [ ] Create `/api/themes/` CRUD endpoints
- [ ] Wire up tier checks (`canAccessTheme`, `canUseCustomizer`, etc.)
- [ ] Test light/dark mode toggle with themes
- [ ] Test Midnight Bloom theme (purple accent for example tenant)

---

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

---

## Custom CSS Security

Restrictions:
- No `@import` (prevents external resource loading)
- No `url()` except safe font sources
- Max 10KB
- Validated before save

```typescript
// src/lib/server/css-validator.ts
export function validateCustomCSS(css: string): ValidationResult {
  // Check size
  if (css.length > 10240) return { valid: false, error: 'Max 10KB' };

  // Block @import
  if (/@import/i.test(css)) return { valid: false, error: 'No @import allowed' };

  // Block external URLs (except fonts)
  const urlPattern = /url\s*\([^)]+\)/gi;
  // ... validation logic

  return { valid: true };
}
```

---

## Package.json Template

```json
{
  "name": "@autumnsgrove/foliage",
  "version": "0.1.0",
  "description": "Theming system for Grove — make your blog feel like yours",
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

---

## Repository Initialization Checklist

When creating the Foliage repository:

- [ ] Create `AutumnsGrove/Foliage` on GitHub
- [ ] Initialize with `pnpm create svelte@latest` (library mode)
- [ ] Copy this spec to `docs/PROJECT-SPEC.md`
- [ ] Create `AGENT.md` with project-specific instructions
- [ ] Set up GitHub Actions for CI
- [ ] Add AGPL-3.0 license
- [ ] Create migrations directory
- [ ] Set up Vitest for testing
- [ ] Add Svelte 5 type definitions
- [ ] Configure package exports

---

## Success Metrics

- [ ] All 10 themes meet WCAG AA contrast
- [ ] Theme load time < 50ms
- [ ] Customizer live preview < 100ms latency
- [ ] Custom CSS validation < 10ms
- [ ] Font upload validation < 500ms
- [ ] Zero XSS vulnerabilities in custom CSS

---

*Foliage enables personal expression while maintaining the quality and accessibility that Grove promises. From simple accent colors to full custom themes, every user can make their space feel like home.*
