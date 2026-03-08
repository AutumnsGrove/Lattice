---
aliases: []
date created: Sunday, March 8th 2026
date modified: Sunday, March 8th 2026
tags:
  - foliage
  - design-system
  - glassmorphism
  - color-tokens
  - seasonal-theming
type: tech-spec
---

# Prism: Grove Design System

```
                          ☀
                         /|\
                        / | \
                       /  |  \
                      /   |   \
                     ╱  · | ·  ╲
                    ╱  ·  |  ·  ╲
                   ╱ ·    |    · ╲
                  ╱·      |      ·╲
                 ╱────────┼────────╲
                ╱    ╱────┼────╲    ╲
               ╱    ╱  ╱──┼──╲  ╲    ╲
              ▓▓▓  ░░░  ▒▒  │  ▒▒  ░░░  ▓▓▓
             glass seasons  │  tokens forests
                            │
              light enters plain
                and emerges transformed
```

> *Light enters plain and emerges transformed.*

The visual language of the Grove ecosystem. Glassmorphism surfaces, seasonal palettes, nature-named color tokens, randomized forests, and the principle that every page is a place you visit. Prism takes ordinary content and transforms it into something warm.

**Public Name:** Prism
**Internal Name:** GrovePrism
**Pattern Type:** UI/UX Design System
**Applies to:** All Grove properties (Landing, Engine, Lattice, Apps)
**Location:** `libs/foliage/`, `libs/engine/src/lib/styles/`, `docs/patterns/prism-pattern.md`
**Last Updated:** March 2026

Step into a cathedral in the forest. Your eyes adjust to the dim sanctuary, and then you look up. Massive stained glass windows transforming ordinary sunlight into something that takes your breath away. Color pools on ancient stone. The world outside becomes the world within, changed by its passage through glass.

A prism does not just transmit light. It transfigures it. Plain white becomes a spectrum of color. The ordinary becomes extraordinary. That is what this design system does: content floats on translucent surfaces that do not merely display, they transform. Backgrounds hint at depth. Seasons shift the palette. Every visit feels alive.

---

## Overview

### What This Is

Prism defines the visual language for every Grove property. It covers five domains: a color token vocabulary (the Prism scales), a glassmorphism system (seven glass variants), seasonal theming (four seasons plus Midnight Bloom), organic decoration (randomized forests, weather particles, creatures), and component standards (icons, touch targets, motion). Together, these create the feeling that Grove is a place, not a product.

### Goals

- Every page feels like somewhere you visit, not something you use
- Warm, organic aesthetic: "midnight tea shop meets good documentation"
- Consistent across all Grove properties while allowing per-property personality
- Dark mode that feels like nature at night, not a color inversion
- WCAG AA accessible, with reduced-motion support throughout
- Performance-conscious: decorations enhance, never degrade

### Non-Goals (Out of Scope)

- Per-tenant theme composition logic (Foliage handles that)
- Individual component APIs (Lattice/Vineyard handle that)
- Content layout patterns (each property defines its own)
- 3D rendering or Three.js integration (v2 consideration)

---

## Architecture

### The Prism Layer Stack

Every Grove page is built from five layers. Glass sits between content and decoration, letting the forest breathe through without competing with readability.

```
┌─────────────────────────────────────────────────────────────────────┐
│  LAYER 5: CONTENT                                                   │
│  Text, buttons, forms, interactive elements                         │
│  Clean, readable, high contrast                                     │
└─────────────────────────────────────────────────────────────────────┘
                                ▲
┌─────────────────────────────────────────────────────────────────────┐
│  LAYER 4: GLASS SURFACES                                            │
│  Translucent containers with backdrop-blur                          │
│  surface, tint, card, frosted, accent, overlay, muted               │
└─────────────────────────────────────────────────────────────────────┘
                                ▲
┌─────────────────────────────────────────────────────────────────────┐
│  LAYER 3: DECORATIVE ELEMENTS                                       │
│  Trees, birds, lanterns, vines, mushrooms                           │
│  Partially visible through glass, adding depth                      │
└─────────────────────────────────────────────────────────────────────┘
                                ▲
┌─────────────────────────────────────────────────────────────────────┐
│  LAYER 2: WEATHER + PARTICLES                                       │
│  Snowfall (winter), petals (spring), falling leaves (autumn)        │
│  Clouds, stars, moon, fireflies                                     │
└─────────────────────────────────────────────────────────────────────┘
                                ▲
┌─────────────────────────────────────────────────────────────────────┐
│  LAYER 1: BACKGROUND                                                │
│  Seasonal gradient (sky to ground)                                  │
│  Sets the emotional tone for the entire page                        │
└─────────────────────────────────────────────────────────────────────┘
```

### System Map

```
Prism Design System
  │
  ├── Color Token Vocabulary ──── libs/foliage/src/lib/tokens/
  │     ├── grove (greens)
  │     ├── cream (off-whites)
  │     ├── bark (browns)
  │     ├── semantic (purpose mapping)
  │     ├── status (state colors)
  │     └── glass (opacity specs)
  │
  ├── Glass System ──────────── libs/foliage/src/lib/utils/glass.ts
  │     ├── 7 variants (surface → muted)
  │     ├── generateGlass()
  │     ├── generateDarkGlass()
  │     └── MIDNIGHT_BLOOM palette
  │
  ├── Seasonal Theming ──────── libs/engine/src/lib/stores/season.ts
  │     ├── 4 seasons + midnight
  │     ├── background gradients
  │     ├── weather particles
  │     └── seasonal creatures
  │
  ├── Theme Composition ─────── libs/foliage/src/lib/themes/
  │     ├── 10 curated themes
  │     ├── ThemeColors interface
  │     └── Community themes (Oak+)
  │
  └── Delivery Layer ────────── libs/engine/
        ├── tokens.css (CSS custom properties)
        ├── tailwind.preset.js (utility bridge)
        └── Glass/GlassCard components
```

---

## Part 1: Color Token Vocabulary

The Prism's foundational layer. Three primitive scales drawn from the forest itself, plus semantic and status mappings that give those colors purpose.

### The Three Scales

**Grove** (greens). The primary color. The green of the forest.

| Stop | Hex | Usage |
|------|-----|-------|
| 50 | `#f0fdf4` | Lightest background tint |
| 100 | `#dcfce7` | Accent background, success light |
| 200 | `#bbf7d0` | Hover tints |
| 300 | `#86efac` | Decorative, dark-mode accent |
| 400 | `#4ade80` | Dark-mode primary, interactive |
| 500 | `#22c55e` | Focus ring, success default |
| **600** | **`#16a34a`** | **PRIMARY. Buttons, links, brand.** |
| 700 | `#15803d` | Hover state |
| 800 | `#166534` | Active state, accent foreground |
| 900 | `#14532d` | Deep green, dark surfaces |
| 950 | `#052e16` | Darkest green |

**Cream** (warm off-whites). The ground beneath your feet.

| Stop | Hex | Usage |
|------|-----|-------|
| DEFAULT/50 | `#fefdfb` | Page background |
| 100 | `#fdfcf8` | Subtle surface |
| 200 | `#faf8f3` | Borders, inputs |
| 300 | `#f5f2ea` | Muted background |
| 400 | `#ede9de` | Secondary hover |
| 500 | `#e2ddd0` | Secondary default |

**Bark** (earthy browns). Text and structure.

| Stop | Hex | Usage |
|------|-----|-------|
| 50 | `#f9f6f3` | Lightest tint |
| 100–400 | | Decorative, disabled, placeholder |
| 500–600 | | Medium emphasis, secondary text |
| 700 | `#6f4d39` | Muted foreground |
| **900/DEFAULT** | **`#3d2914`** | **PRIMARY. Body text, headings.** |
| 950 | `#2a1b0d` | Darkest bark |

### Semantic Layer

Maps primitives to purposes. The answer to "what color should a primary button be?"

```typescript
semantic = {
  primary:    { DEFAULT: grove[600], foreground: "#fff", hover: grove[700], active: grove[800] },
  secondary:  { DEFAULT: cream[500], foreground: bark.DEFAULT, hover: cream[400], active: cream[300] },
  background: cream.DEFAULT,
  foreground: bark.DEFAULT,
  muted:      { DEFAULT: cream[300], foreground: bark[700] },
  accent:     { DEFAULT: grove[100], foreground: grove[800] },
  border:     cream[200],
  input:      cream[200],
  ring:       grove[500],
}
```

### Status Colors

```typescript
status = {
  success: { DEFAULT: grove[500],  light: grove[100],  foreground: grove[800] },
  warning: { DEFAULT: "#f59e0b",   light: "#fef3c7",   foreground: "#92400e" },
  error:   { DEFAULT: "#dc2626",   light: "#fee2e2",   foreground: "#991b1b" },
  info:    { DEFAULT: "#0ea5e9",   light: "#e0f2fe",   foreground: "#075985" },
}
```

All foreground/light combinations meet WCAG AA (4.5:1). Success reuses `grove` green. The rest use conventional colors because status communication is universal.

### Design Decisions

**No pure black or white.** `bark[900]` is `#3d2914`, not `#000000`. `cream[50]` is `#fefdfb`, not `#ffffff`. The forest has no true black or white, only deep shadow and filtered light.

**Cream, not gray.** Standard design systems use gray scales. Grove is warm. Cream carries warmth in its undertone. Every "gray" surface has a whisper of amber.

**Bark, not gray for text.** `bark[900]` has a brown-amber warmth that `gray-900` lacks. Text in Grove feels written, not printed.

### Token Flow

```
TypeScript hex values (libs/foliage/src/lib/tokens/colors.ts)
    │
    ├──→ Theme objects (compose ThemeColors)
    │
    ├──→ CSS custom properties (libs/engine/src/lib/styles/tokens.css)
    │         │
    │         └──→ Tailwind preset (rgb(var(--grove-50) / <alpha>))
    │                   │
    │                   └──→ Utility classes (bg-grove-600, text-bark-900)
    │
    └──→ Glass utilities (generateGlass() opacity specs)
```

CSS variables use space-separated HSL channels (`--grove-600: 142 72% 29%`), enabling Tailwind's `/opacity` modifier without recomputing colors. Dark mode inverts the scales through `.dark` class overrides.

### Export Note

The tokens barrel renames `grove` to `groveColors` to avoid collision with the `grove` theme object. Both are exported from `@autumnsgrove/foliage`.

---

## Part 2: Glass System

Glass creates readability while revealing hints of the world behind. Content floats on translucent surfaces, the forest breathes through, and text stays sharp.

### Why Glass

| Approach | Pros | Cons |
|----------|------|------|
| Solid backgrounds | High contrast | Feels heavy, hides decoration |
| Transparent overlays | Shows depth | Text becomes unreadable |
| Glass (blur + tint) | Readable + depth | Requires layering discipline |

### Seven Variants

```
┌──────────────────────────────────────────────────────────────┐
│                     Glass Variant Map                         │
│                                                              │
│  surface ████████████████████████████████████████  95%  md   │
│  card    ████████████████████████████████          80%  md   │
│  frosted █████████████████████████████             70%  lg   │
│  tint    ████████████████████████                  60%  md   │
│  overlay ██████████████████████                    50%  lg   │
│  muted   ████████████████                         40%  sm   │
│  accent  ████████████                             30%  sm   │
│                                                              │
│          opacity ──────────────────────────→      blur       │
└──────────────────────────────────────────────────────────────┘
```

| Variant | Light | Dark | Blur | Purpose |
|---------|:---:|:---:|:---:|---------|
| `surface` | 95% | 95% | md | Headers, navbars, sticky elements |
| `card` | 80% | 70% | md | Content cards, feature boxes |
| `frosted` | 70% | 35% | lg | Prominent panels, hero glass |
| `tint` | 60% | 50% | md | Text containers over busy backgrounds |
| `overlay` | 50% | 60% | lg | Modal backdrops, drawers |
| `muted` | 40% | 30% | sm | Subtle backgrounds, secondary content |
| `accent` | 30% | 20% | sm | Callouts, highlights, CTAs |

### Glass Generation

Themes provide base colors. `generateGlass()` produces all seven variants:

```typescript
glass: generateGlass({
  lightSurface: cream[50],
  darkSurface:  bark[900],
  accent:       groveColors[600],
  lightBorder:  cream[200],
  darkBorder:   bark[700],
})
```

Dark-first themes use `generateDarkGlass()` with inverted opacity logic. The `MIDNIGHT_BLOOM` palette provides a canonical deep-purple dark theme.

### Usage

```svelte
<!-- Component-level -->
<Glass variant="tint" class="p-6 rounded-xl">
  <p>Readable over forest backgrounds</p>
</Glass>

<GlassCard title="Your Blog" variant="default" hoverable>
  <p>Card content</p>
</GlassCard>

<!-- CSS utility classes -->
<div class="glass-tint p-6">Text container</div>
<nav class="glass-surface sticky top-0 z-50">Navigation</nav>
<div class="glass-accent p-4">Highlighted callout</div>
```

### Glass Anti-Patterns

**Never stack glass layers.** Blur compounds and performance suffers. One glass layer between content and background. That is the rule.

**Never use glass without background interest.** Glass over solid white is solid white with blur overhead. Glass needs a gradient, forest, or decoration behind it to justify its existence.

### Overlay Scale

For fine-grained glassmorphism, a graduated overlay scale of 13 stops (5% to 100%):

```css
--grove-overlay-05: rgba(34, 197, 94, 0.05);
--grove-overlay-10: rgba(34, 197, 94, 0.10);
/* ... through ... */
--grove-overlay-100: rgba(34, 197, 94, 1.0);
```

Dark mode shifts the base from `grove-500` to `grove-400` for visibility.

---

## Part 3: Seasonal Theming

Grove experiences four seasons. Each shifts colors, weather, and emotional tone. The page you visit in January feels different from the page you visit in July. Same content. Different atmosphere.

### The Four Seasons

```
    SPRING                SUMMER                AUTUMN
 ┌────────────┐       ┌────────────┐       ┌────────────┐
 │  Renewal   │       │   Growth   │       │  Harvest   │
 │────────────│       │────────────│       │────────────│
 │ Cherry     │──────►│ Deep       │──────►│ Amber      │
 │ blossoms   │       │ greens     │       │ and rust   │
 │ Fresh lime │       │ Sky blue   │       │ Golden     │
 │────────────│       │────────────│       │────────────│
 │ Petals     │       │ Full       │       │ Falling    │
 │ fall       │       │ canopy     │       │ leaves     │
 └────────────┘       └────────────┘       └────────────┘
       ▲                                         │
       │              ┌────────────┐              │
       │              │   WINTER   │              │
       └──────────────│────────────│◄─────────────┘
                      │ Rest       │
                      │────────────│
                      │ Slate      │
                      │ Frost      │
                      │ Evergreen  │
                      └────────────┘
```

### Season Palettes

**Spring:** Fresh greens (`#84cc16`, `#65a30d`), cherry pink (`#f472b6`, `#ec4899`), sky blue (`#38bdf8`)

**Summer:** Deep forest green (`#166534`, `#15803d`), rich sky blue (`#0284c7`), warm sunshine (`#facc15`)

**Autumn:** Rust (`#b45309`, `#92400e`), amber (`#f59e0b`, `#d97706`), gold (`#eab308`), warm brown (`#78350f`)

**Winter:** Slate (`#475569`, `#64748b`), frost (`#e2e8f0`, `#cbd5e1`), evergreen (`#166534`), ice blue (`#bae6fd`)

### Weather Effects

| Effect | Season | Component | Key Props |
|--------|--------|-----------|-----------|
| Snowfall | Winter | `SnowfallLayer` | `count`, `opacity`, `spawnDelay` |
| Cherry blossoms | Spring | `FallingPetalsLayer` | `count`, `opacity`, `fallDuration` |
| Falling leaves | Autumn | `FallingLeavesLayer` | `trees`, `season`, `minLeavesPerTree` |
| Clear skies | Summer | (none) | Full canopy, no particles |

### Seasonal Creatures

| Bird | Season | Notes |
|------|--------|-------|
| Cardinal | Winter | Red, `facing` prop |
| Chickadee | Winter | Small, perches on branches |
| Robin | Spring | Red breast |
| Bluebird | Spring | Blue, bright |

### Midnight Bloom

The fifth "season." For content about the future, dreams, or mystical features.

```typescript
const MIDNIGHT_BLOOM = {
  background:     "#0c0a14",   // Deep purple-black
  surface:        "#1a1625",   // Dark purple
  foreground:     "#f8fafc",   // slate-50
  foregroundMuted: "#a78bfa",  // violet-400
  accent:         "#c4b5fd",   // violet-300
  border:         "#2e2640",   // Dark purple border
}
```

Use Midnight Bloom for: far-future roadmap items, "coming soon" sections, vision statements, quiet reflective moments. The tea shop at the edge of tomorrow.

---

## Part 4: Organic Decoration

### Randomized Forests

Trees are generated procedurally. No two page loads look exactly the same. This creates life.

**Generation rules:**
- Position range: 5%–93% from left edge
- Minimum gap: 8% between trees
- Size range: 80–160px base width
- Aspect ratio: 1.0–1.5x (natural variation)
- Opacity: 0.5–0.9 (depth illusion: larger = closer = more opaque)
- Five tree types: Logo, Pine, Cherry, Aspen, Birch

**Responsive density:**

| Viewport | Multiplier | Example (base 6) |
|----------|:---:|:---:|
| Mobile (< 768px) | 1.0x | 6 trees |
| Tablet (< 1024px) | 1.3x | ~8 trees |
| Desktop (< 1440px) | 1.8x | ~11 trees |
| Large (< 2560px) | 2.5x | ~15 trees |
| Ultrawide | 3.5x | ~21 trees |

**Regeneration rules:**

| Event | Action |
|-------|--------|
| Page mount | Generate once |
| Window resize (small) | Keep existing trees |
| Window resize (bracket change) | Regenerate with new density |
| Scroll | Never regenerate |
| Season change | Keep positions, trees adapt colors |

### Component Library

| Category | Location | Components |
|----------|----------|------------|
| Trees | `components/trees/` | Logo, TreePine, TreeCherry, TreeAspen, TreeBirch |
| Weather | `components/nature/weather/` | SnowfallLayer, FallingPetalsLayer, FallingLeavesLayer |
| Sky | `components/nature/sky/` | Cloud, Moon, StarCluster, Firefly |
| Creatures | `components/nature/creatures/` | Cardinal, Chickadee, Robin, Bluebird |
| Botanical | `components/nature/botanical/` | Vine, Leaf, Petal |
| Ground | `components/nature/ground/` | Grass, Flower, Mushroom |

---

## Part 5: Theme Composition

Foliage themes consume the Prism to produce complete visual configurations. Each theme picks six color slots, three font families, a layout type, and an optional glass configuration.

### ThemeColors Interface

```typescript
interface ThemeColors {
  background:     string;   // Page background
  surface:        string;   // Card/section backgrounds
  foreground:     string;   // Body text
  foregroundMuted: string;  // Secondary text
  accent:         string;   // Interactive elements, brand color
  border:         string;   // Borders, dividers
}
```

### Example: Grove Theme (Default)

```typescript
colors: {
  background:     semantic.background,    // cream.DEFAULT
  surface:        cream[50],
  foreground:     semantic.foreground,    // bark.DEFAULT
  foregroundMuted: bark[700],
  accent:         groveColors[600],       // THE green
  border:         semantic.border,        // cream[200]
}
```

### Example: Night Garden Theme

```typescript
colors: {
  background:     "#0c0a14",             // MIDNIGHT_BLOOM
  surface:        "#1a1625",
  foreground:     "#f8fafc",
  foregroundMuted: "#a78bfa",
  accent:         "#c4b5fd",
  border:         "#2e2640",
}
```

Custom themes can use the Prism scales directly, define their own palettes entirely, or mix both. The `ThemeColors` interface is the contract.

### Curated Themes (10 Total)

| # | Theme | Vibe | Layout | Tier |
|---|-------|------|--------|------|
| 1 | Grove | Warm, earthy, cozy | Sidebar | Seedling+ |
| 2 | Minimal | Clean, typography-focused | No sidebar | Seedling+ |
| 3 | Night Garden | Dark mode, gentle purples | Sidebar | Seedling+ |
| 4 | Zine | Bold, magazine-style | Grid | Sapling+ |
| 5 | Moodboard | Artistic, visual | Masonry | Sapling+ |
| 6 | Typewriter | Vintage retro | Centered | Sapling+ |
| 7 | Solarpunk | Bright, optimistic | Full-width | Sapling+ |
| 8 | Cozy Cabin | Rustic warmth | Sidebar | Sapling+ |
| 9 | Ocean | Cool blues, serene | Sidebar | Sapling+ |
| 10 | Wildflower | Vibrant botanical | Sidebar | Sapling+ |

---

## Part 6: Standards

### Icons

Lucide only. Never emojis in UI.

| Concept | Icon | Concept | Icon |
|---------|------|---------|------|
| Home | `Home` | Posts | `FileText` |
| About | `Info` | Tags | `Tag` |
| Vision | `Telescope` | Growth | `Sprout` |
| Pricing | `HandCoins` | Loading | `Loader2` (+ `animate-spin`) |
| Docs | `BookOpen` | Success | `Check` |
| Community | `Trees` | Error | `X` |
| Email | `Mail` | Warning | `AlertTriangle` |
| Themes | `Palette` | Coming Soon | `Seedling` |

### Touch Targets

Minimum 44x44px for all interactive elements. This is non-negotiable.

### Reduced Motion

All particle effects, weather animations, and decorative movement respect `prefers-reduced-motion`. Skip particles entirely when reduced motion is requested.

### Performance Budget

| Element | Target |
|---------|--------|
| Total trees per viewport | < 15 |
| Total active particles | < 100 |
| Max blur radius | 12px |
| Animation frame rate | 60fps |
| First Contentful Paint | < 1.5s |

---

## Part 7: CSS Variable Strategy

### HSL Channel Pattern

```css
:root {
  --grove-600: 142 72% 29%;     /* HSL channels, no wrapper */
  --cream-50:  40 60% 99%;
  --bark-900:  27 49% 16%;
}

.dark {
  --grove-600: 142 69% 58%;     /* Lighter for dark backgrounds */
  --bark-900:  30 23% 93%;      /* Light text */
}
```

### Tailwind Bridge

```javascript
colors: {
  grove: {
    600: "rgb(var(--grove-600) / <alpha-value>)",
  },
  primary: {
    DEFAULT: "rgb(var(--grove-600) / <alpha-value>)",
    foreground: "#ffffff",
  },
}
```

This produces three levels of utility classes:

```html
<!-- Primitive -->
<div class="bg-grove-600 text-cream-50 border-bark-200">

<!-- Semantic -->
<button class="bg-primary text-primary-foreground">

<!-- Glass overlay -->
<div class="bg-grove-overlay-10 backdrop-blur-md">
```

### File Locations

| File | Role |
|------|------|
| `libs/foliage/src/lib/tokens/colors.ts` | Canonical color values |
| `libs/foliage/src/lib/tokens/index.ts` | Barrel export (grove → groveColors) |
| `libs/foliage/src/lib/utils/glass.ts` | Glass generation utilities |
| `libs/foliage/src/lib/types.ts` | ThemeColors, GlassVariant, ThemeGlass |
| `libs/engine/src/lib/ui/tokens/colors.ts` | Engine-side token copy |
| `libs/engine/src/lib/styles/tokens.css` | CSS custom properties |
| `libs/engine/src/lib/ui/tailwind.preset.js` | Tailwind bridge |

---

## When to Use Prism

| Pattern | Best For |
|---------|----------|
| Full glassmorphism + forests | Story pages, about, vision, roadmap |
| Glass only (no nature) | Admin panels, settings, forms |
| Seasonal theming | Public pages with emotional storytelling |
| Midnight Bloom | Future features, dreams, vision statements |
| Weather particles | Hero sections, transitions, seasonal showcases |
| Randomized forests | Landing pages, community pages, blog indexes |

## When NOT to Use

| Pattern | Avoid For |
|---------|-----------|
| Heavy decoration | Data-dense tables, complex forms |
| Particles | Performance-critical pages, a11y contexts |
| Multiple glass layers | Anywhere. Never stack glass. |
| Randomization | Content that must match between sessions |
| Seasonal colors | Brand-critical contexts needing consistency |

---

## Security Considerations

- Color tokens contain no sensitive data. CSS variables are visible in DevTools by design
- Custom CSS injection (Oak+ tier) is validated by `css-validator.ts` to prevent XSS through `url()`, `expression()`, or injection vectors
- Community theme submissions go through moderation review before approval
- Gossamer effects render on `<canvas>`, never injecting HTML

---

## Requirements

| ID | Pattern | Requirement | Priority |
|----|---------|-------------|----------|
| PRZ-001 | Ubiquitous | All primitive scales shall use hex notation | Must Have |
| PRZ-002 | Ubiquitous | No scale shall contain `#000000` or `#ffffff` | Must Have |
| PRZ-003 | Ubiquitous | Status foreground/light combos shall meet WCAG AA (4.5:1) | Must Have |
| PRZ-004 | Event-Driven | When primitives change, engine copy + CSS vars shall update | Must Have |
| PRZ-005 | Ubiquitous | Glass shall not be stacked (max one layer) | Must Have |
| PRZ-006 | State-Driven | While dark mode is active, inverted scales shall maintain contrast | Must Have |
| PRZ-007 | Ubiquitous | All interactive elements shall be minimum 44x44px | Must Have |
| PRZ-008 | State-Driven | While reduced motion is preferred, particles shall not render | Must Have |
| PRZ-009 | Ubiquitous | Trees per viewport shall not exceed 15 | Should Have |
| PRZ-010 | Ubiquitous | Active particles shall not exceed 100 | Should Have |
| PRZ-011 | Event-Driven | When season changes, tree positions shall persist (colors adapt) | Should Have |

---

## Implementation Checklist

### Already Complete

- [x] Three primitive color scales (grove, cream, bark)
- [x] Semantic layer mapping primitives to purposes
- [x] Status colors with WCAG-compliant triplets
- [x] Seven glass variants with opacity and blur specs
- [x] `generateGlass()` and `generateDarkGlass()` utilities
- [x] MIDNIGHT_BLOOM dark theme palette
- [x] CSS custom properties with HSL channels
- [x] Dark mode variable overrides
- [x] Tailwind preset bridging CSS variables
- [x] Overlay scale (13 opacity stops)
- [x] 10 curated themes consuming the Prism
- [x] Seasonal detection and background gradients
- [x] Weather particle effects (snow, petals, leaves)
- [x] Randomized forest generation
- [x] Tree type variety (5 types with seasonal adaptation)
- [x] Responsive tree density
- [x] Reduced motion support
- [x] GroveTerm manifest entry
- [x] Naming doc entry in `docs/philosophy/grove-naming.md`
- [x] Help center article (`what-is-prism.md`)
- [x] Pattern reference (`docs/patterns/prism-pattern.md`)

### Future Work

- [ ] Consolidate engine token copy into Foliage re-export
- [ ] Automated WCAG contrast validation in CI
- [ ] Seasonal Prism variants (spring warmth, winter cool tint shifts)
- [ ] Prism visualization page in Vineyard
- [ ] Community theme guidelines for Prism extension
- [ ] P3 wide-gamut color fallbacks for supported browsers
- [ ] Seasonal creature expansion (summer, autumn birds)
- [ ] Gossamer integration with seasonal presets

---

## Related Specs

- **[Foliage Project Spec](foliage-project-spec.md)** — Theme composition, tier access, customizer
- **[Gossamer Spec](gossamer-spec.md)** — ASCII visual effects library
- **[Terrarium Spec](terrarium-spec.md)** — Creative canvas for decoration composition
- **[Seasons Spec](seasons-spec.md)** — Seasonal detection and transitions

---

*Sunlight enters the grove. What comes out is everything it always was.*
