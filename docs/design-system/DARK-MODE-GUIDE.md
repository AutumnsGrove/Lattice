---
title: Dark Mode Guide
description: Nature at night—dark mode philosophy and implementation
category: design
lastUpdated: "2026-01-18"
---

# Dark Mode Guide

> "Nature at night" - Dark mode that maintains warmth and character.

Grove's dark mode isn't just an inverted color scheme. It's the forest at twilight: warm bark browns instead of harsh blacks, soft cream highlights instead of stark whites, and the gentle glow of fireflies rather than glaring spotlights. When someone switches to dark mode, they should feel like they've stepped into a cozy cabin after sunset, not a sterile server room.

---

## Philosophy

### The Forest at Twilight

Think of Studio Ghibli's night scenes - the warmth of Howl's fireplace, the soft glow of Totoro's forest at dusk. Dark mode in Grove follows this same principle: darkness should feel alive and inviting, not cold and mechanical.

**Core principles:**

1. **Warm, not harsh** - We use warm bark browns (`rgba(20, 30, 25)`) instead of pure black (`#000`). Pure black creates too much contrast and feels clinical.

2. **Soft, not stark** - Text is cream-tinted (`#f5f5f5`) rather than pure white. This reduces eye strain and maintains the organic feel.

3. **Green undertones preserved** - The grove green overlay shifts from `rgba(34, 197, 94)` to a lighter `rgba(74, 222, 128)` to remain visible against dark backgrounds without being garish.

4. **Shadows deepen, don't disappear** - Dark mode shadows use higher opacity (`0.2-0.3` vs `0.08-0.1`) to maintain depth perception on dark surfaces.

### What We Avoid

- Pure black backgrounds (`#000`)
- Stark white text (`#fff`)
- Loss of brand green identity
- "Inverted" feeling - dark mode should feel intentional, not accidental

---

## Implementation

### CSS Variables

Grove uses a two-layer CSS variable system:

1. **HSL tokens** in `app.css` - The shadcn-compatible design system foundation
2. **Bridge tokens** in `tokens.css` - Grove-specific semantic tokens that adapt between modes

The `.dark` class on `<html>` triggers all dark mode overrides.

#### Core HSL Variables (app.css)

```css
/* Light mode */
:root {
  --background: 0 0% 98%; /* Soft off-white */
  --foreground: 0 0% 20%; /* Warm dark gray, not black */
  --primary: 121 37% 27%; /* Forest green */
  --card: 0 0% 100%; /* Pure white cards */
  --border: 0 0% 88%; /* Light gray borders */
}

/* Dark mode */
.dark {
  --background: 0 0% 10%; /* Warm near-black */
  --foreground: 0 0% 94%; /* Cream, not white */
  --primary: 121 37% 45%; /* Brighter green for visibility */
  --card: 0 0% 14%; /* Lifted card surfaces */
  --border: 0 0% 20%; /* Subtle borders */
}
```

#### Grove Overlay Tokens (tokens.css)

The grove overlays shift to a lighter green in dark mode for visibility:

```css
/* Light mode - standard grove green */
:root {
  --grove-overlay-10: rgba(34, 197, 94, 0.1);
  --grove-overlay-20: rgba(34, 197, 94, 0.2);
}

/* Dark mode - lighter green for visibility */
.dark {
  --grove-overlay-10: rgba(74, 222, 128, 0.1);
  --grove-overlay-20: rgba(74, 222, 128, 0.2);
}
```

### Theme Toggle

The theme is managed by `themeStore` from `@autumnsgrove/lattice/ui/stores`.

#### Reading the Current Theme

```svelte
<script>
  import { themeStore } from '@autumnsgrove/lattice/ui/stores';

  const { theme, resolvedTheme } = themeStore;

  // $theme: 'light' | 'dark' | 'system' (user preference)
  // $resolvedTheme: 'light' | 'dark' (actual applied theme)
</script>

<p>Current theme: {$resolvedTheme}</p>
```

#### Setting the Theme

```typescript
import { themeStore } from "@autumnsgrove/lattice/ui/stores";

// Set to specific theme
themeStore.setTheme("dark");
themeStore.setTheme("light");
themeStore.setTheme("system"); // Follow OS preference

// Toggle between light and dark
themeStore.toggle();
```

#### How It Works

The store automatically:

- Persists preference to `localStorage` under the key `'theme'`
- Applies the `.dark` class to `document.documentElement`
- Listens for system preference changes when set to `'system'`
- Initializes to `'system'` for first-time visitors

### Glass Components

Grove's glassmorphism components automatically adapt to dark mode through CSS variables. You don't need to add conditional logic.

#### Auto-Adapting Variables

| Variable            | Light Mode                  | Dark Mode                 | Purpose               |
| ------------------- | --------------------------- | ------------------------- | --------------------- |
| `--glass-bg`        | `rgba(255, 255, 255, 0.85)` | `rgba(20, 30, 25, 0.92)`  | Primary glass surface |
| `--glass-bg-medium` | `rgba(255, 255, 255, 0.6)`  | `rgba(30, 45, 35, 0.6)`   | Secondary glass       |
| `--glass-bg-subtle` | `rgba(255, 255, 255, 0.5)`  | `rgba(30, 41, 59, 0.4)`   | Tertiary glass        |
| `--glass-border`    | `rgba(255, 255, 255, 0.3)`  | `rgba(74, 124, 89, 0.25)` | Glass edge highlight  |

#### Example: Glass Card

```svelte
<div class="rounded-lg backdrop-blur-sm"
     style="background: var(--glass-bg); border: 1px solid var(--glass-border);">
  <p class="text-foreground">This card adapts automatically.</p>
</div>
```

The dark mode glass uses green-tinted bark colors (`rgba(20, 30, 25)`) rather than neutral grays, maintaining the forest atmosphere.

---

## Color Palette (Dark Mode)

### Semantic Tokens

| Token                | Light Value        | Dark Value         | Usage              |
| -------------------- | ------------------ | ------------------ | ------------------ |
| `--background`       | `hsl(0 0% 98%)`    | `hsl(0 0% 10%)`    | Page background    |
| `--foreground`       | `hsl(0 0% 20%)`    | `hsl(0 0% 94%)`    | Primary text       |
| `--primary`          | `hsl(121 37% 27%)` | `hsl(121 37% 45%)` | Brand green, CTAs  |
| `--secondary`        | `hsl(0 0% 96%)`    | `hsl(0 0% 10%)`    | Secondary surfaces |
| `--muted`            | `hsl(0 0% 96%)`    | `hsl(0 0% 15%)`    | Muted backgrounds  |
| `--muted-foreground` | `hsl(0 0% 40%)`    | `hsl(0 0% 65%)`    | Secondary text     |
| `--card`             | `hsl(0 0% 100%)`   | `hsl(0 0% 14%)`    | Card surfaces      |
| `--border`           | `hsl(0 0% 88%)`    | `hsl(0 0% 20%)`    | Borders            |
| `--accent`           | `hsl(270 38% 49%)` | `hsl(270 38% 60%)` | Tags, highlights   |

### Grove-Specific Tokens

| Token                | Light Value               | Dark Value                 | Usage                   |
| -------------------- | ------------------------- | -------------------------- | ----------------------- |
| `--grove-overlay-20` | `rgba(34, 197, 94, 0.2)`  | `rgba(74, 222, 128, 0.2)`  | Green tinted overlays   |
| `--grove-border`     | `rgba(34, 197, 94, 0.2)`  | `rgba(74, 222, 128, 0.2)`  | Green accent borders    |
| `--shadow-grove`     | `rgba(34, 197, 94, 0.15)` | `rgba(74, 222, 128, 0.15)` | Green glow shadows      |
| `--accent-success`   | `#28a745`                 | `#5cb85f`                  | Success states          |
| `--accent-danger`    | `#dc3545`                 | `#ff8080`                  | Error states (softened) |

### Text Hierarchy (Dark Mode)

| Role      | Variable                 | Value     | Notes             |
| --------- | ------------------------ | --------- | ----------------- |
| Primary   | `--light-text-primary`   | `#f5f5f5` | Main content      |
| Secondary | `--light-text-secondary` | `#d4d4d4` | Supporting text   |
| Tertiary  | `--light-text-tertiary`  | `#c0c0c0` | Labels, captions  |
| Muted     | `--light-text-muted`     | `#a8a8a8` | Timestamps, hints |

---

## Testing Dark Mode

### Methods

1. **UI Toggle** - Use the `ThemeToggle` component in the navigation

   ```svelte
   import { ThemeToggle } from '@autumnsgrove/lattice/ui/chrome';
   ```

2. **DevTools** - In Chrome/Firefox DevTools:
   - Open Command Palette (Cmd/Ctrl + Shift + P)
   - Type "Emulate CSS prefers-color-scheme: dark"
   - Select to force dark mode

3. **System Preference** - Change your OS dark mode setting (respects `system` theme)

4. **Direct Store Manipulation** - In browser console:
   ```javascript
   // Force dark mode
   document.documentElement.classList.add("dark");
   localStorage.setItem("theme", "dark");
   ```

### What to Check

- [ ] Text remains readable (sufficient contrast)
- [ ] Green accents are visible but not garish
- [ ] Glass components maintain depth and blur
- [ ] Focus indicators are visible
- [ ] Images don't "glow" (avoid pure white backgrounds in images)
- [ ] Status colors (success/error/warning) remain distinguishable

---

## Best Practices

### Do

- **Use semantic tokens** - Always use `text-foreground`, `bg-background`, etc. rather than hardcoded colors

  ```svelte
  <!-- Good -->
  <p class="text-foreground">Hello</p>

  <!-- Avoid -->
  <p class="text-gray-900 dark:text-gray-100">Hello</p>
  ```

- **Use grove overlay variables** for green tints - They auto-adapt

  ```css
  background: var(--grove-overlay-10); /* Adapts automatically */
  ```

- **Test both modes** during development - Switch frequently to catch issues early

- **Use the glass variables** for glassmorphism - They handle the warmth preservation

  ```css
  background: var(--glass-bg); /* Warm bark brown in dark mode */
  ```

- **Soften harsh colors** in dark mode - Red errors become `#ff8080` (salmon) instead of `#dc3545`

### Don't

- **Don't use pure black** (`#000` or `bg-black`) - Use `bg-background` instead

- **Don't use pure white** (`#fff` or `text-white`) - Use `text-foreground` or cream tones

- **Don't forget hover states** - Ensure hover effects are visible in both modes

- **Don't hardcode opacity** - Use the semantic overlay tokens that adjust per mode

- **Don't assume light mode** - Never write CSS that only works in light mode

### Component Patterns

```svelte
<!-- Example: A card that works in both modes -->
<div class="bg-card text-card-foreground rounded-lg border border-border p-4 shadow-sm">
  <h3 class="text-foreground font-semibold">Title</h3>
  <p class="text-muted-foreground">Supporting text that adapts.</p>
  <span class="text-primary">Highlighted link</span>
</div>
```

```svelte
<!-- Example: Glass panel with grove overlay -->
<div
  class="rounded-lg backdrop-blur-sm"
  style="
    background: var(--glass-bg);
    border: 1px solid var(--grove-border);
    box-shadow: var(--shadow-grove);
  "
>
  <!-- Content automatically adapts -->
</div>
```

---

## Related Resources

- **Tokens Reference**: `/libs/engine/src/lib/styles/tokens.css`
- **App CSS Variables**: `/libs/engine/src/app.css`
- **Theme Store**: `/libs/engine/src/lib/ui/stores/theme.ts`
- **ThemeToggle Component**: `/libs/engine/src/lib/ui/components/chrome/ThemeToggle.svelte`

---

_Dark mode should feel like coming home after dark - warm lights glowing through windows, not a fluorescent office at midnight._
