# Developer Documentation Plan

**Created**: January 18, 2026
**Priority**: P2 (Medium - Developer experience)
**Status**: Ready for Implementation
**Estimated Effort**: 12-16 hours total

---

## Overview

Five developer-facing documentation gaps identified. The engine has excellent code-level documentation (478-line Tailwind preset, comprehensive CSS variables) but lacks narrative guides connecting the pieces.

### Component Landscape

- **185 Svelte components** across 13 categories
- **478-line Tailwind preset** defining design system
- **266-line CSS variables** file with dark mode support
- **No central documentation** tying it together

---

## 1. Component Reference (High Priority)

### Current State

Components exist across multiple directories with `index.ts` exports but no catalog for developers.

**Component Categories**:

| Category   | Count | Location                    |
| ---------- | ----- | --------------------------- |
| Primitives | 45    | `ui/components/primitives/` |
| Nature     | 64    | `ui/components/nature/`     |
| UI         | 28    | `ui/components/ui/`         |
| Typography | 11    | `ui/components/typography/` |
| Chrome     | 6     | `ui/components/chrome/`     |
| Terrarium  | 7     | `ui/components/terrarium/`  |
| Gallery    | 4     | `ui/components/gallery/`    |
| Charts     | 4     | `ui/components/charts/`     |
| Content    | 4     | `ui/components/content/`    |
| States     | 4     | `ui/components/states/`     |
| Forms      | 3     | `ui/components/forms/`      |
| Indicators | 3     | `ui/components/indicators/` |
| Icons      | 2     | `ui/components/icons/`      |

### Implementation

**File**: `docs/design-system/COMPONENT-REFERENCE.md`

````markdown
# Component Reference

> 185 components organized by category. Import from `@autumnsgrove/lattice/ui`.

## Quick Links

- [Primitives](#primitives) - Base UI building blocks
- [Glass](#glass) - Glassmorphism components
- [Nature](#nature) - Forest, creatures, weather
- [Typography](#typography) - Font components
- [Chrome](#chrome) - Layout shell

## Import Patterns

```typescript
// Category import
import { GlassCard, GlassButton } from "@autumnsgrove/lattice/ui";

// Specific import
import { TreePine } from "@autumnsgrove/lattice/ui/nature";
```
````

## Primitives (45)

### Accordion

Collapsible content panels.

```svelte
<Accordion.Root>
  <Accordion.Item value="item-1">
    <Accordion.Trigger>Section 1</Accordion.Trigger>
    <Accordion.Content>Content here</Accordion.Content>
  </Accordion.Item>
</Accordion.Root>
```

[Continue for each component category...]

````

### Effort: 4-6 hours

---

## 2. Dark Mode Guide (High Priority)

### Current State

Dark mode is fully implemented via CSS variables but not documented:

**File**: `libs/engine/src/lib/styles/tokens.css`

```css
:root {
  --background: 60 9% 98%;
  --foreground: 24 10% 10%;
  /* ... */
}

.dark {
  --background: 24 10% 10%;
  --foreground: 60 9% 98%;
  /* ... */
}
````

### Implementation

**File**: `docs/design-system/DARK-MODE-GUIDE.md`

````markdown
# Dark Mode Guide

> "Nature at night" - Dark mode that maintains warmth and character.

## Philosophy

Dark mode in Grove isn't just inverted colors. It evokes a forest at twilight:

- Warm bark browns instead of pure black
- Cream highlights instead of stark white
- Maintained contrast for accessibility
- Preserved glassmorphism effects

## Implementation

### CSS Variables

Grove uses HSL color variables that change between modes:

```css
/* Light mode */
:root {
  --background: 60 9% 98%; /* Warm cream */
  --foreground: 24 10% 10%; /* Dark bark */
}

/* Dark mode */
.dark {
  --background: 24 10% 10%; /* Dark bark */
  --foreground: 60 9% 98%; /* Light cream */
}
```
````

### Theme Toggle

Use the engine's theme store:

```typescript
import { themeStore } from "@autumnsgrove/lattice/ui/stores";

// Toggle
themeStore.toggle();

// Set explicitly
themeStore.set("dark");

// Read current
const isDark = $themeStore === "dark";
```

### Component Considerations

- Glass components auto-adapt via `--grove-glass-bg`
- Nature components have night variants
- Use `text-foreground` not hardcoded colors

### Testing Dark Mode

1. Toggle via UI: Settings > Theme
2. Force via DevTools: Add `class="dark"` to `<html>`
3. System preference: Set OS to dark mode

## Color Palette (Dark Mode)

| Token          | Light         | Dark          | Usage              |
| -------------- | ------------- | ------------- | ------------------ |
| `--background` | Cream #FAF9F6 | Bark #1A1410  | Page background    |
| `--foreground` | Bark #1A1410  | Cream #FAF9F6 | Text               |
| `--primary`    | Grove #16a34a | Grove #22c55e | Accent             |
| `--muted`      | #F5F3EF       | #2A241E       | Subtle backgrounds |

````

### Effort: 2-3 hours

---

## 3. Spacing Guide (Medium Priority)

### Current State

Tailwind preset includes spacing but no documentation on Grove's spacing philosophy.

### Implementation

**File**: `docs/design-system/SPACING-SYSTEM.md`

```markdown
# Spacing System

> Consistent spacing creates visual rhythm and hierarchy.

## Base Unit

Grove uses a 4px base unit. All spacing is a multiple of 4.

## Tailwind Classes

| Class | Size | Usage |
|-------|------|-------|
| `p-1` | 4px | Tight internal padding |
| `p-2` | 8px | Default component padding |
| `p-4` | 16px | Card padding |
| `p-6` | 24px | Section padding |
| `p-8` | 32px | Large section gaps |

## Component Spacing

### Cards
- Internal padding: `p-4` (16px)
- Card gap in grids: `gap-4` (16px)

### Sections
- Section padding: `py-12` (48px vertical)
- Max width: `max-w-4xl` (896px)

### Forms
- Field gap: `space-y-4`
- Label to input: `space-y-1.5`
- Form sections: `space-y-6`

## Nature Element Spacing

Nature components (trees, creatures) use organic spacing:
- Random offset: `±20%` from base position
- Cluster grouping: Fibonacci-based gaps
````

### Effort: 1-2 hours

---

## 4. Colors Documentation (Medium Priority)

### Current State

Colors defined in `tailwind.preset.js` but not documented narratively.

**Existing palette (from preset)**:

- Grove Green (50-950)
- Cream neutrals
- Bark dark tones
- Semantic tokens

### Implementation

**File**: `docs/design-system/COLORS.md`

````markdown
# Color System

> Nature-inspired palette: Grove greens, warm bark browns, soft cream neutrals.

## Philosophy

Colors in Grove evoke a forest clearing:

- **Grove Green** - Primary brand color, growth and vitality
- **Cream** - Warm paper-like backgrounds
- **Bark** - Deep browns for text and dark elements
- **Semantic** - Functional colors for states

## Core Palette

### Grove Green

The primary brand color representing growth.

| Shade     | Hex     | Usage                             |
| --------- | ------- | --------------------------------- |
| grove-50  | #f0fdf4 | Lightest tint, subtle backgrounds |
| grove-100 | #dcfce7 | Light backgrounds                 |
| grove-200 | #bbf7d0 | Hover states                      |
| grove-300 | #86efac | Borders                           |
| grove-400 | #4ade80 | Icons                             |
| grove-500 | #22c55e | Dark mode primary                 |
| grove-600 | #16a34a | **Primary** - buttons, links      |
| grove-700 | #15803d | Hover state                       |
| grove-800 | #166534 | Active state                      |
| grove-900 | #14532d | Darkest                           |
| grove-950 | #052e16 | Near-black green                  |

### Cream (Neutrals)

Warm backgrounds that feel like natural paper.

| Shade         | Usage              |
| ------------- | ------------------ |
| cream-DEFAULT | Primary background |
| cream-50      | Brightest          |
| cream-100     | Card backgrounds   |
| cream-200     | Borders            |

### Bark (Dark Tones)

Warm dark colors that avoid harsh blacks.

| Shade        | Usage              |
| ------------ | ------------------ |
| bark-DEFAULT | Primary text       |
| bark-dark    | Darkest background |
| bark-light   | Muted text         |

## Semantic Colors

| Token         | Purpose         | Light     | Dark      |
| ------------- | --------------- | --------- | --------- |
| `primary`     | Main actions    | grove-600 | grove-500 |
| `secondary`   | Secondary UI    | muted     | muted     |
| `accent`      | Highlights      | grove-400 | grove-300 |
| `destructive` | Errors, danger  | red-600   | red-500   |
| `muted`       | Subtle elements | cream-200 | bark-800  |

## Usage in Code

```typescript
// Tailwind classes
<button class="bg-primary text-primary-foreground">

// CSS variables
color: hsl(var(--primary));
```
````

````

### Effort: 2-3 hours

---

## 5. Animation Guide (Medium Priority)

### Current State

16+ animations defined in Tailwind preset but no documentation on usage patterns.

**Existing animations**:
- Fade (in, out, in-up, in-down)
- Growth (grow, grow-slow, shrink, bloom, pulse-soft)
- Leaf (leaf-fall, leaf-sway)
- Spin (spin-slow, spin-organic)
- Slide (in-right, in-left, in-up, in-down)

### Implementation

**File**: `docs/design-system/ANIMATION-GUIDE.md`

```markdown
# Animation Guide

> Alive but not distracting - subtle animations that create a living world.

## Principles

1. **Respect user preferences** - All animations check `prefers-reduced-motion`
2. **Subtle over flashy** - Animations enhance, never distract
3. **Organic feel** - Easing and timing inspired by nature
4. **Performance** - Use CSS transforms, avoid layout triggers

## Available Animations

### Fade Animations

For appearing/disappearing elements.

```svelte
<div class="animate-fade-in">Appears smoothly</div>
<div class="animate-fade-in-up">Appears and rises</div>
````

| Class                  | Duration | Use Case         |
| ---------------------- | -------- | ---------------- |
| `animate-fade-in`      | 200ms    | Modals, toasts   |
| `animate-fade-out`     | 150ms    | Dismissals       |
| `animate-fade-in-up`   | 300ms    | Cards loading in |
| `animate-fade-in-down` | 300ms    | Dropdowns        |

### Growth Animations

For scaling elements.

```svelte
<button class="hover:animate-grow">Grows on hover</button>
```

| Class            | Effect       | Use Case             |
| ---------------- | ------------ | -------------------- |
| `animate-grow`   | Scale 1→1.05 | Interactive elements |
| `animate-shrink` | Scale 1→0.95 | Click feedback       |
| `animate-bloom`  | Scale 0.9→1  | Appearance           |

### Nature Animations

For decorative elements.

```svelte
<TreePine class="animate-leaf-sway" />
```

| Class                  | Effect         | Use Case             |
| ---------------------- | -------------- | -------------------- |
| `animate-leaf-fall`    | Falling motion | Seasonal decorations |
| `animate-leaf-sway`    | Gentle sway    | Trees, plants        |
| `animate-spin-organic` | Irregular spin | Loading states       |

## Reduced Motion

Always provide fallbacks:

```css
@media (prefers-reduced-motion: reduce) {
  .animate-leaf-fall {
    animation: none;
  }
}
```

Or use Tailwind:

```svelte
<div class="motion-reduce:animate-none animate-fade-in">
```

## Custom Animations

Extend in `tailwind.config.js`:

```javascript
animation: {
  'my-custom': 'my-keyframes 500ms ease-out',
},
keyframes: {
  'my-keyframes': {
    '0%': { opacity: 0 },
    '100%': { opacity: 1 },
  }
}
```

```

### Effort: 2-3 hours

---

## Summary

| Document | Priority | Effort | Dependencies |
|----------|----------|--------|--------------|
| Component Reference | High | 4-6h | Component inventory |
| Dark Mode Guide | High | 2-3h | None |
| Spacing System | Medium | 1-2h | None |
| Colors | Medium | 2-3h | Extract from preset |
| Animation Guide | Medium | 2-3h | None |

---

## Files to Create

| File | Purpose |
|------|---------|
| `docs/design-system/COMPONENT-REFERENCE.md` | Component catalog |
| `docs/design-system/DARK-MODE-GUIDE.md` | Dark mode philosophy and usage |
| `docs/design-system/SPACING-SYSTEM.md` | Spacing philosophy and tokens |
| `docs/design-system/COLORS.md` | Color palette documentation |
| `docs/design-system/ANIMATION-GUIDE.md` | Animation usage patterns |

---

## Related Files

- Tailwind preset: `libs/engine/src/lib/ui/tailwind.preset.js`
- CSS tokens: `libs/engine/src/lib/styles/tokens.css`
- Typography README: `libs/engine/src/lib/ui/components/typography/README.md`
- Grove CSS: `libs/engine/src/lib/ui/styles/grove.css`
```
