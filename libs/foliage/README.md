# Foliage

[![npm version](https://img.shields.io/npm/v/@groveengine/foliage.svg)](https://www.npmjs.com/package/@groveengine/foliage)
[![npm downloads](https://img.shields.io/npm/dm/@groveengine/foliage.svg)](https://www.npmjs.com/package/@groveengine/foliage)
[![license](https://img.shields.io/npm/l/@groveengine/foliage.svg)](https://github.com/AutumnsGrove/Foliage/blob/main/LICENSE)
[![Svelte 5](https://img.shields.io/badge/Svelte-5-ff3e00.svg)](https://svelte.dev)

Grove's theme system — personal expression with modern guardrails.

**Package:** `@groveengine/foliage`

---

## Overview

Foliage enables visual customization ranging from simple accent colors to full theme customizers. It extracts theme logic from GroveEngine to create independently testable, reusable, and maintainable code.

The system emphasizes personal expression with guardrails — even with full customization options, blogs remain readable. Progressive enhancement unlocks more features at higher subscription tiers.

---

## Features

### Accent Color (All Paid Tiers)

A single color that tints interactive elements: links, buttons, hover states, selection highlights, blockquote borders, and code accents.

### Curated Themes (10 Total)

Pre-designed themes providing variety:

- **Seedling+:** Grove, Minimal, Night Garden
- **Sapling+:** Zine, Moodboard, Typewriter, Solarpunk, Cozy Cabin, Ocean, Wildflower

### Theme Customizer (Oak+)

Full control over colors, typography, layout, spacing, effects, and up to 10KB of custom CSS (validated and sanitized).

### Custom Fonts (Evergreen Only)

Upload up to 10 custom fonts in WOFF2 format (500KB per file), stored in R2.

### Community Themes (Oak+)

Browse, import, rate, and share customized themes with attribution to original creators.

---

## Tier Access Matrix

| Tier      | Themes | Accent Color | Customizer | Community | Custom Fonts |
| --------- | ------ | ------------ | ---------- | --------- | ------------ |
| Free      | —      | —            | —          | —         | —            |
| Seedling  | 3      | Custom       | —          | —         | —            |
| Sapling   | 10     | Custom       | —          | —         | —            |
| Oak       | 10     | Custom       | Full       | Import    | —            |
| Evergreen | 10     | Custom       | Full       | Import    | Upload       |

---

## Quick Start

```bash
pnpm install
pnpm build        # Build library to dist/
pnpm test --run   # Run tests
pnpm lint         # Run ESLint
```

---

## Installation

```bash
pnpm add @groveengine/foliage
```

### Usage

```typescript
// Import components
import {
	ThemeSelector,
	ThemePreview,
	ThemeCustomizer,
	AccentColorPicker,
} from "@groveengine/foliage";

// Import server functions (for SvelteKit)
import { loadThemeSettings, saveThemeSettings } from "@groveengine/foliage/server";

// Import utilities
import { generateThemeVariables, validateThemeContrast } from "@groveengine/foliage/utils";
```

---

## Project Structure

```
foliage/
├── src/lib/
│   ├── components/      # Svelte 5 components (13 total)
│   ├── server/          # D1/R2 database functions
│   ├── themes/          # 10 theme definitions
│   ├── tokens/          # Color tokens (grove, cream, bark)
│   ├── utils/           # Contrast checking, CSS variables
│   └── types.ts         # TypeScript interfaces
├── migrations/          # D1 schema
├── tests/               # Vitest tests (312 passing)
└── examples/            # SvelteKit integration examples
```

---

## Components

| Component               | Description                                   | Tier      |
| ----------------------- | --------------------------------------------- | --------- |
| `AccentColorPicker`     | Color picker with presets and WCAG validation | All paid  |
| `ThemeSelector`         | Grid of theme cards with tier gating          | All paid  |
| `ThemePreview`          | Live preview of theme colors and fonts        | All paid  |
| `ThemeCustomizer`       | Full customization panel with tabs            | Oak+      |
| `ColorPanel`            | Color inputs with contrast checking           | Oak+      |
| `TypographyPanel`       | Font family selectors with preview            | Oak+      |
| `LayoutPanel`           | Layout type, max width, spacing               | Oak+      |
| `CustomCSSEditor`       | CSS editor with validation                    | Oak+      |
| `FontUploader`          | WOFF2 font upload with validation             | Evergreen |
| `CommunityThemeBrowser` | Browse and import shared themes               | Oak+      |
| `CommunityThemeSubmit`  | Submit themes to community                    | Oak+      |
| `ModerationQueue`       | Admin dashboard for theme review              | Admin     |
| `ThemeRating`           | Star rating component                         | Oak+      |

---

## Server Functions

### Theme Management

```typescript
import {
	loadThemeSettings,
	saveThemeSettings,
	updateAccentColor,
	updateThemeId,
} from "@groveengine/foliage/server/theme-loader";
```

### Font Management

```typescript
import { uploadFont, deleteFont, listFonts } from "@groveengine/foliage/server/font-uploader";
```

### Community Themes

```typescript
import {
	createCommunityTheme,
	listCommunityThemes,
	addRating,
} from "@groveengine/foliage/server/community-themes";
```

---

## Database Schema

Uses Cloudflare D1 (SQLite):

- **theme_settings** — Per-tenant theme preferences and customizations
- **custom_fonts** — Uploaded fonts with validation metadata
- **community_themes** — Community submissions with moderation workflow

See `migrations/` for full schema.

---

## Accessibility

All themes must meet WCAG 2.1 AA contrast standards (4.5:1 for body text). The `validateThemeContrast()` utility enforces this at build time and in the customizer.

---

## Security

- Custom CSS is validated and sanitized to prevent injection attacks
- Font uploads verify WOFF2 magic bytes and parse font data
- All user inputs are validated server-side

---

## Tech Stack

- **Language:** TypeScript
- **Framework:** SvelteKit (library mode), Svelte 5
- **Testing:** Vitest
- **Package Manager:** pnpm
- **Database:** D1 (SQLite) via Cloudflare
- **Storage:** R2 for custom fonts

---

## Development

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test --run

# Build library
pnpm build

# Type checking
pnpm check

# Linting
pnpm lint
```

---

## GroveEngine Integration

Foliage integrates through package exports:

```svelte
<!-- +layout.svelte -->
<script>
	import { loadThemeSettings } from "@groveengine/foliage/server";
	import { generateThemeVariables } from "@groveengine/foliage/utils";

	const settings = await loadThemeSettings(db, tenantId);
	const cssVars = generateThemeVariables(theme, settings);
</script>

<div style={cssVars}>
	<slot />
</div>
```

Admin routes at `/settings/theme` and `/settings/fonts` manage customization.

---

## License

AGPL-3.0 — See [LICENSE](./LICENSE) for details.

---

_Maintained by AutumnsGrove_
