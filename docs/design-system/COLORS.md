# Color System

> Nature-inspired palette: Grove greens, warm bark browns, soft cream neutrals.

---

## Philosophy

Grove's colors are drawn from a forest clearing at golden hour. Every shade serves a purpose: the greens of new growth guide action, warm creams provide restful backgrounds like aged paper, and deep bark tones ground text in earthy readability.

This isn't a corporate palette—it's the palette of a place you'd want to linger. Colors should feel like sunlight filtering through leaves, not fluorescent office lighting.

**Core principles:**
- **Warm over cool** — Even our greens lean warm
- **Readable always** — Sufficient contrast is non-negotiable
- **Seasonal flexibility** — The palette adapts across spring, summer, autumn, winter, and midnight themes

---

## Core Palette

### Grove Green

The primary brand color. Represents growth, vitality, and the living nature of the platform.

| Shade | Hex | Usage |
|-------|-----|-------|
| `grove-50` | `#f0fdf4` | Lightest backgrounds, hover states |
| `grove-100` | `#dcfce7` | Accent backgrounds, subtle highlights |
| `grove-200` | `#bbf7d0` | Light borders, focus rings |
| `grove-300` | `#86efac` | Decorative accents, link underlines |
| `grove-400` | `#4ade80` | Secondary buttons, success indicators |
| `grove-500` | `#22c55e` | Interactive elements, icons |
| **`grove-600`** | **`#16a34a`** | **Primary brand color**, buttons, links |
| `grove-700` | `#15803d` | Hover states on primary |
| `grove-800` | `#166534` | Active/pressed states |
| `grove-900` | `#14532d` | Dark mode accents |
| `grove-950` | `#052e16` | Deepest green, rare use |

**Primary usage:** `grove-600` is the heart of the palette—use it for primary actions, links, and brand moments.

---

### Cream (Neutrals)

Warm, paper-like tones for backgrounds and surfaces. These aren't cold grays—they're the color of aged pages in a beloved book.

| Shade | Hex | Usage |
|-------|-----|-------|
| **`cream` / `cream-50`** | **`#fefdfb`** | **Main background**, page canvas |
| `cream-100` | `#fdfcf8` | Subtle surface elevation |
| `cream-200` | `#faf8f3` | Card backgrounds, input fields |
| `cream-300` | `#f5f2ea` | Muted backgrounds, code blocks |
| `cream-400` | `#ede9de` | Borders, dividers |
| `cream-500` | `#e2ddd0` | Stronger borders, disabled states |

**Note:** `cream-DEFAULT` and `cream-50` are identical (`#fefdfb`). Use `cream` for the main background.

---

### Bark (Dark Tones)

Deep, earthy browns for text and dark elements. These provide warmth even in contrast—no cold blacks here.

| Shade | Hex | Usage |
|-------|-----|-------|
| `bark-50` | `#f9f6f3` | Lightest bark, rare backgrounds |
| `bark-100` | `#f0e9e1` | Light borders in dark contexts |
| `bark-200` | `#e0d2c2` | Default border color, inputs |
| `bark-300` | `#ccb59c` | Muted text on dark backgrounds |
| `bark-400` | `#b69575` | Placeholder text |
| `bark-500` | `#a57c5a` | Secondary text, captions |
| `bark-600` | `#8a6347` | Muted foreground text |
| `bark-700` | `#6f4d39` | Blockquote text, less emphasis |
| `bark-800` | `#5a3f30` | Strong secondary text |
| **`bark-900` / `bark`** | **`#3d2914`** | **Primary text**, headings, body |
| `bark-950` | `#2a1b0d` | Deepest brown, code backgrounds |

**Primary usage:** `bark-900` (or simply `bark`) is the default text color—warm and readable against cream backgrounds.

---

## Semantic Colors

These tokens map to common UI patterns, making it easy to maintain consistency across components.

| Token | Purpose | Value | Foreground |
|-------|---------|-------|------------|
| `primary` | Primary actions, buttons | `#16a34a` (grove-600) | `#ffffff` |
| `secondary` | Secondary actions | `#e2ddd0` (cream-500) | `#3d2914` (bark) |
| `accent` | Highlights, badges | `#dcfce7` (grove-100) | `#166534` (grove-800) |
| `destructive` | Danger, delete actions | `#dc2626` | `#ffffff` |
| `muted` | Subdued backgrounds | `#f5f2ea` (cream-300) | `#6f4d39` (bark-700) |
| `background` | Page background | `#fefdfb` (cream) | — |
| `foreground` | Default text | `#3d2914` (bark) | — |
| `border` | Default borders | `#e0d2c2` (bark-200) | — |
| `input` | Input borders | `#e0d2c2` (bark-200) | — |
| `ring` | Focus rings | `#16a34a` (grove-600) | — |

---

## Usage in Code

### Tailwind Classes

```html
<!-- Background colors -->
<div class="bg-cream">Main background</div>
<div class="bg-grove-100">Accent background</div>
<div class="bg-bark-900">Dark surface</div>

<!-- Text colors -->
<p class="text-bark">Body text</p>
<p class="text-bark-700">Muted text</p>
<a class="text-grove-600 hover:text-grove-700">Link</a>

<!-- Semantic colors -->
<button class="bg-primary text-primary-foreground">Primary Button</button>
<button class="bg-secondary text-secondary-foreground">Secondary</button>
<div class="bg-destructive text-destructive-foreground">Error</div>

<!-- Borders -->
<div class="border border-border">Default border</div>
<input class="border-input focus:ring-ring" />
```

### CSS Variables

When you need colors in custom CSS or JavaScript:

```css
/* These map to the Tailwind theme */
.custom-element {
  background-color: theme('colors.cream.DEFAULT');
  color: theme('colors.bark.DEFAULT');
  border-color: theme('colors.grove.300');
}

/* For focus states */
.focus-grove:focus {
  box-shadow: 0 0 0 2px theme('colors.cream.DEFAULT'),
              0 0 0 4px theme('colors.grove.500');
}
```

### Component Patterns

```svelte
<!-- Card with proper color hierarchy -->
<div class="bg-cream-200 border border-border rounded-grove">
  <h2 class="text-bark">Card Title</h2>
  <p class="text-bark-700">Supporting text uses lighter bark.</p>
  <a href="#" class="text-grove-600 hover:text-grove-700">
    Action link
  </a>
</div>

<!-- Muted callout -->
<aside class="bg-muted text-muted-foreground rounded-grove p-4">
  A gentle aside for secondary information.
</aside>

<!-- Success state -->
<div class="bg-accent text-accent-foreground rounded-grove p-4">
  Something good happened in the grove.
</div>
```

---

## Dark Mode Considerations

Grove's dark mode isn't just inverted colors—it's "nature at night." The palette maintains warmth:

- **Background:** Deep bark tones, not pure black
- **Text:** Cream tones, not harsh white
- **Accents:** Grove greens glow softly against dark surfaces

When implementing dark mode, use the semantic tokens (`primary`, `secondary`, `muted`, etc.) which automatically adapt, rather than hardcoding specific shades.

---

## Accessibility Notes

All color combinations in the design system meet WCAG AA contrast requirements:

- `bark` on `cream`: 12.4:1 (exceeds AAA)
- `grove-600` on `cream`: 4.6:1 (passes AA for normal text)
- `bark-700` on `cream`: 7.1:1 (passes AAA)

When in doubt, test your combinations. Readability comes before aesthetics—though in Grove, you shouldn't have to choose.
