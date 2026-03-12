# Prism Developer Guide

Prism (`@autumnsgrove/prism`) is the single source of truth for all colors, design tokens, and Tailwind configuration across the Grove ecosystem. Every app, every component library, every worker that needs a color gets it from Prism.

This guide covers how Prism works, how to add tokens, how apps consume it, and what to do when things go wrong.

## How Prism Works

Prism uses a three-layer architecture. Each layer builds on the one before it.

```
Layer 1: Raw hex tokens (TypeScript)
   libs/prism/src/lib/tokens/*.ts
   ↓
Layer 2: CSS custom properties
   libs/prism/src/lib/css/grove-tokens.css
   ↓
Layer 3: Tailwind preset
   libs/prism/src/lib/tailwind/preset.js
```

**Layer 1** defines the actual color values as TypeScript constants. The `grove` scale is forest greens, `cream` is warm off-whites, `bark` is earthy browns. Semantic mappings (`primary`, `accent`, `border`) and status colors (`success`, `warning`, `error`, `info`) build on these primitives.

**Layer 2** translates those hex values into CSS custom properties. The grove, cream, and bark scales use space-separated RGB channels (`--grove-600: 22 163 74`) so Tailwind can apply opacity modifiers. HSL semantic tokens like `--surface`, `--accent`, and `--warning` carry both light and dark values.

**Layer 3** maps CSS variables to Tailwind utility classes. Colors reference the CSS properties (e.g., `"rgb(var(--grove-600) / <alpha-value>)"`) so that `bg-grove-600`, `text-bark-900`, and `bg-surface` all work out of the box. The preset also defines typography scales, animations, spacing, z-index, and component classes like `.grove-prose`.

### Package Exports

Prism exposes three subpaths:

| Import path | What you get |
|---|---|
| `@autumnsgrove/prism` | TypeScript token objects, glass utilities, contrast helpers |
| `@autumnsgrove/prism/css` | CSS custom properties (`grove-tokens.css`) |
| `@autumnsgrove/prism/tailwind` | Tailwind preset object |

Prism is a source-only package with zero build step, similar to `@autumnsgrove/infra`.

## How Apps Consume Prism

Every app needs two things from Prism: the Tailwind preset and the CSS tokens.

### 1. Tailwind Config

In your app's `tailwind.config.js`:

```js
import grovePreset from "@autumnsgrove/prism/tailwind";

/** @type {import('tailwindcss').Config} */
export default {
  presets: [grovePreset],
  content: [
    "./src/**/*.{html,js,svelte,ts}",
    // Include engine components so Tailwind scans their classes too
    "../../libs/engine/src/lib/**/*.{html,js,svelte,ts}",
  ],
  darkMode: "class",
};
```

The preset sets `content: []` intentionally. Each app provides its own content paths. You can extend the preset's theme freely (adding fonts, extra animations) without overriding the base tokens.

### 2. CSS Import

In your app's `app.css` (or equivalent global stylesheet), import the token CSS before the Tailwind directives:

```css
@import '@autumnsgrove/prism/css';

@tailwind base;
@tailwind components;
@tailwind utilities;
```

This loads all CSS custom properties into `:root` (light mode) and `.dark` (dark mode). Without this import, every CSS variable reference in the Tailwind preset resolves to nothing, and your colors disappear.

### 3. Package Dependency

Your app's `package.json` needs:

```json
{
  "dependencies": {
    "@autumnsgrove/prism": "workspace:*"
  }
}
```

All 8 apps and the engine currently depend on Prism this way.

## The Three Color Scales

### Grove (greens)

The primary brand color. `grove-600` (`#16a34a`) is the canonical primary, used for buttons, links, and brand elements. The scale runs from `grove-50` (lightest tint) to `grove-950` (darkest). Grove greens stay consistent across light and dark modes.

### Cream (warm off-whites)

Backgrounds and neutral surfaces. `cream-50` / `cream.DEFAULT` (`#fefdfb`) is the page background. No pure white anywhere. Every "white" surface carries a whisper of amber warmth.

### Bark (earthy browns)

Text and structural elements. `bark-900` / `bark.DEFAULT` (`#3d2914`) is body text. No cold grays. Text in Grove feels written, not printed.

## Dark Mode

Dark mode is driven by the `.dark` CSS class on a parent element. The CSS file (`grove-tokens.css`) overrides custom properties under `.dark {}`, so the same Tailwind classes produce different colors automatically.

### How the Scales Invert

The design philosophy: the grove at night is firelight and shadow, not a cold inversion.

- **Cream inverts to warm dark browns.** `--cream` goes from `254 253 251` (nearly white) to `26 22 18` (deep warm brown). These are the `darkCream` tokens.
- **Bark inverts to light cream tones.** `--bark` goes from `61 41 20` (dark brown text) to `245 242 234` (light cream text). These are the `darkBark` tokens.
- **Grove greens stay the same.** The forest is always green. Grove scale values do not change between modes.

### Dark Token Objects

In TypeScript, the dark mode equivalents are:

| Light | Dark | Purpose |
|---|---|---|
| `cream` | `darkCream` | Background surfaces |
| `bark` | `darkBark` | Text and foreground |
| `semantic` | `darkSemantic` | Role-based mappings |
| `status` | `darkStatus` | Status indicators |

Dark status colors use brighter defaults (e.g., `grove-400` instead of `grove-500` for success) and deep-tinted backgrounds to avoid blinding pops of color on dark surfaces.

### HSL Semantic Tokens

The `semantic-hsl.ts` file defines tokens as `HSLTokenSet` pairs with light and dark values:

```ts
export interface HSLTokenSet {
  light: string;
  dark: string;
}

// Example: surface token
const surface = {
  DEFAULT: { light: "0 0% 100%", dark: "25 18% 10%" },
  hover:   { light: "30 10% 96%", dark: "25 15% 13%" },
};
```

These values are written manually into `grove-tokens.css` under `:root` and `.dark`. The Tailwind preset references them with the `hsl(var(--token))` pattern. If you need to change what "surface" means in dark mode, change it in `semantic-hsl.ts` and then update the corresponding CSS property in `grove-tokens.css`.

## How to Add a New Color Token

Adding a token touches up to three files, depending on the kind of token.

### Adding a new shade to an existing scale

If you need, say, a `grove-575` between `grove-500` and `grove-600`:

1. Add the hex value in `libs/prism/src/lib/tokens/colors.ts`
2. Add the RGB channels in `libs/prism/src/lib/css/grove-tokens.css` under `:root`
3. Add the Tailwind mapping in `libs/prism/src/lib/tailwind/preset.js`

If the token has a dark mode variant, also update the dark token file and the `.dark {}` block in the CSS.

### Adding a new semantic HSL token

For example, adding a `danger` semantic group:

1. Define the `HSLTokenSet` pairs in `libs/prism/src/lib/tokens/semantic-hsl.ts`
2. Add the token to the `HSL_SEMANTIC_TOKENS` object in the same file
3. Add the CSS custom properties in `grove-tokens.css` under both `:root` and `.dark`
4. Add the Tailwind color mapping in `preset.js` using the `hsl(var(--token))` pattern

### Adding a new status color

1. Add hex values to the `status` object in `libs/prism/src/lib/tokens/colors.ts`
2. Add the dark variant to `darkStatus` in `libs/prism/src/lib/tokens/dark.ts`
3. Update CSS and Tailwind as above

### Export checklist

If you add a new named export (a new scale or type), make sure it appears in:

- `libs/prism/src/lib/tokens/index.ts` (token barrel)
- `libs/prism/src/index.ts` (package barrel)

## The `groveColors` Rename

The tokens barrel (`libs/prism/src/lib/tokens/index.ts`) renames the `grove` color scale to `groveColors` on export:

```ts
export { grove as groveColors } from "./colors.js";
```

This exists because Foliage's theme system also exports a `grove` object (the default Grove theme). Without the rename, any file importing from both Prism and Foliage would hit a name collision. When you import from `@autumnsgrove/prism`, you get `groveColors`. The raw `grove` name is only available inside `tokens/colors.ts` itself.

## Why Things Break

### Missing colors / invisible elements

If Tailwind classes like `bg-grove-600` produce no visible color, the CSS custom properties are probably not loaded. Check that your app's CSS imports `@autumnsgrove/prism/css` before the `@tailwind` directives.

### Tailwind purging your classes

Tailwind tree-shakes classes it does not find in your `content` paths. If you use Prism tokens in engine components, your app's `tailwind.config.js` must include the engine source in its content array:

```js
content: [
  "./src/**/*.{html,js,svelte,ts}",
  "../../libs/engine/src/lib/**/*.{html,js,svelte,ts}",
],
```

Classes constructed dynamically (e.g., `` `bg-grove-${level}` ``) will always be purged. Use the full class name or add it to a safelist.

### Dark mode not working

Dark mode requires the `.dark` class on an ancestor element (typically `<html>` or `<body>`). The Tailwind config must include `darkMode: "class"`. If dark mode tokens are missing or wrong, check the `.dark {}` block in `grove-tokens.css`.

### Stale builds

Prism is source-only (no build step), so changes to token files take effect immediately for any consumer that re-runs its own build. If you see stale colors after editing Prism, restart your dev server. The SvelteKit dev server sometimes caches resolved modules.

### HSL / RGB mismatch

The CSS file uses two different formats for different purposes. Scale colors (grove, cream, bark) use space-separated RGB channels for Tailwind's `<alpha-value>` opacity syntax. Semantic tokens (surface, accent, warning) use HSL values for the `hsl(var())` pattern. Mixing the two formats in a single `var()` reference will produce broken colors.

## Key Files

| File | Purpose |
|---|---|
| `libs/prism/package.json` | Package definition, three export paths |
| `libs/prism/src/index.ts` | Main barrel export |
| `libs/prism/src/lib/tokens/colors.ts` | Grove, cream, bark, semantic, status hex values |
| `libs/prism/src/lib/tokens/dark.ts` | Dark mode equivalents (darkCream, darkBark, darkSemantic, darkStatus) |
| `libs/prism/src/lib/tokens/semantic-hsl.ts` | HSL token pairs for CSS properties (light + dark) |
| `libs/prism/src/lib/tokens/seasons.ts` | Four seasonal palettes (spring, summer, autumn, winter) |
| `libs/prism/src/lib/tokens/index.ts` | Token barrel (grove renamed to groveColors here) |
| `libs/prism/src/lib/css/grove-tokens.css` | All CSS custom properties, `:root` and `.dark` blocks |
| `libs/prism/src/lib/tailwind/preset.js` | Tailwind preset with colors, typography, animations, utilities |
| `libs/engine/src/lib/ui/tailwind.preset.js` | Deprecated re-export stub (backward compat only) |

## Quick Checklist: Adding a New Token

1. Define the hex value in `tokens/colors.ts` (and `tokens/dark.ts` if it has a dark variant)
2. If it is an HSL semantic token, add the `HSLTokenSet` in `tokens/semantic-hsl.ts`
3. Add CSS custom properties in `css/grove-tokens.css` under `:root` (and `.dark` if applicable)
4. Add the Tailwind color mapping in `tailwind/preset.js`
5. Export any new named constants from `tokens/index.ts` and `src/index.ts`
6. Run `pnpm run check` in `libs/prism/` to verify TypeScript types
7. Run `pnpm run test:run` in `libs/prism/` to verify tests pass
8. Restart dev servers in any apps you want to test against
