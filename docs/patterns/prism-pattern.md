# Prism: Grove Design System

> *Light enters plain and emerges transformed.*

**Public Name:** Prism
**Internal Name:** GrovePrism
**Pattern Type:** UI/UX Design System
**Applies to:** All Grove properties (Landing, Engine, Lattice, future apps)
**Last Updated:** January 2026

Step into a cathedral in the forest. Your eyes adjust to the dim sanctuary, and then you look up—massive stained glass windows transforming ordinary sunlight into something that takes your breath away. Color pools on ancient stone. The world outside becomes the world within, changed by its passage through glass.

A prism doesn't just transmit light. It *transfigures* it. Plain white becomes a spectrum of color. The ordinary becomes extraordinary. That's what Grove's design system does: content floats on translucent surfaces that don't merely display—they transform. Backgrounds hint at depth. Seasons shift the palette. Every visit feels alive.

This is Prism. Glass that tells stories.

---

## Overview

The Prism pattern defines a layered visual system built on glassmorphism, seasonal theming, and organic randomization. Every page is a *place* you visit—warm like a midnight tea shop, clear like good documentation.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         THE PRISM LAYER STACK                           │
└─────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────────────────────────────────────────────────────┐
    │  LAYER 5: CONTENT                                               │
    │  ─────────────────────────────────────────────────────────────  │
    │  Text, buttons, forms, interactive elements                     │
    │  Clean, readable, high contrast                                 │
    └─────────────────────────────────────────────────────────────────┘
                                    ▲
                                    │
    ┌─────────────────────────────────────────────────────────────────┐
    │  LAYER 4: GLASS SURFACES                                        │
    │  ─────────────────────────────────────────────────────────────  │
    │  Translucent containers with backdrop-blur                      │
    │  Cards, modals, navigation bars, callouts                       │
    │  Variants: surface, tint, card, accent, overlay, muted          │
    └─────────────────────────────────────────────────────────────────┘
                                    ▲
                                    │
    ┌─────────────────────────────────────────────────────────────────┐
    │  LAYER 3: DECORATIVE ELEMENTS                                   │
    │  ─────────────────────────────────────────────────────────────  │
    │  Trees (randomized forests), birds, lanterns, vines             │
    │  Partially visible through glass, adds depth                    │
    └─────────────────────────────────────────────────────────────────┘
                                    ▲
                                    │
    ┌─────────────────────────────────────────────────────────────────┐
    │  LAYER 2: WEATHER & PARTICLES                                   │
    │  ─────────────────────────────────────────────────────────────  │
    │  Snowfall (winter), petals (spring), leaves (autumn)            │
    │  Clouds, stars, moon, fireflies                                 │
    └─────────────────────────────────────────────────────────────────┘
                                    ▲
                                    │
    ┌─────────────────────────────────────────────────────────────────┐
    │  LAYER 1: BACKGROUND                                            │
    │  ─────────────────────────────────────────────────────────────  │
    │  Seasonal gradient (sky to ground)                              │
    │  Sets the emotional tone for the entire page                    │
    └─────────────────────────────────────────────────────────────────┘
```

---

## Core Principles

### The Grove Aesthetic

Grove is a **place**, not a product. Every design decision should answer: *"Does this make someone feel welcome?"*

| Principle | Meaning | Implementation |
|-----------|---------|----------------|
| **Welcoming** | Like entering a cozy space | Warm colors, soft edges, inviting copy |
| **Organic** | Natural, not rigid or corporate | Randomization, curves, nature elements |
| **Readable** | Content-first, decorations enhance | Glass surfaces isolate text from busy backgrounds |
| **Alive** | Subtle movement, seasonal change | Particles, breathing animations, theme shifts |

### The Guiding Voice

```
Warm, introspective, queer, unapologetically building something meaningful.
Write with the warmth of a midnight tea shop and the clarity of good documentation.
```

This isn't a style guide for code—it's how Grove *speaks*. UI copy, error messages, empty states, everything should feel like a friend explaining something clearly.

---

## Part 1: Glassmorphism

Glass effects create readability while revealing hints of the world behind.

### Why Glass?

Traditional approaches have tradeoffs:

| Approach | Pros | Cons |
|----------|------|------|
| **Solid backgrounds** | High contrast | Feels heavy, hides decoration |
| **Transparent overlays** | Shows depth | Text becomes unreadable |
| **Glass (blur + tint)** | Readable + depth | Requires layering discipline |

Glass lets Grove show its decorative soul while keeping content clear.

### Glass Variants

```typescript
type GlassVariant = 'surface' | 'tint' | 'card' | 'accent' | 'overlay' | 'muted';
```

| Variant | Purpose | Light Mode | Dark Mode |
|---------|---------|------------|-----------|
| `surface` | Headers, navbars, sticky elements | 95% white | 95% slate-900 |
| `tint` | Text containers over busy backgrounds | 60% white | 50% slate-800 |
| `card` | Content cards, feature boxes | 80% white | 70% slate-800 |
| `accent` | Callouts, highlights, CTAs | 30% brand color | 20% brand color |
| `overlay` | Modal backdrops, drawers | 50% black | 60% black |
| `muted` | Subtle backgrounds, secondary content | 40% white | 30% slate-800 |

### Implementation

**Svelte Components:**

```svelte
<script>
  import { Glass, GlassCard, GlassButton, GlassOverlay } from '@groveengine/ui/ui';
</script>

<!-- Basic glass container -->
<Glass variant="tint" class="p-6 rounded-xl">
  <p>This text stays readable over forest backgrounds</p>
</Glass>

<!-- Card with built-in glass styling -->
<GlassCard title="Your Blog" variant="default" hoverable>
  <p>Card content here</p>
</GlassCard>

<!-- Glass button (accent by default) -->
<GlassButton variant="accent" onclick={handleClick}>
  Get Started
</GlassButton>

<!-- Modal backdrop -->
<GlassOverlay visible={modalOpen} onclick={closeModal}>
  <div class="glass-card p-8 rounded-2xl">
    Modal content
  </div>
</GlassOverlay>
```

**CSS Utility Classes:**

```html
<!-- Apply directly to any element -->
<div class="glass rounded-xl p-4">Basic glass (surface)</div>
<div class="glass-tint p-6">Text container</div>
<div class="glass-card p-4 rounded-lg">Content card</div>
<div class="glass-accent p-4">Highlighted section</div>
<nav class="glass-surface sticky top-0 z-50">Navigation</nav>
```

**Raw Tailwind (when you need fine control):**

```html
<!-- Light: white tint, Dark: slate tint, always blur -->
<div class="bg-white/60 dark:bg-slate-800/50 backdrop-blur-md rounded-xl p-6 border border-white/20 dark:border-slate-700/30">
  Content
</div>
```

### The Sticky Navigation Pattern

Navigation bars should remain readable while hinting at scrolled content:

```svelte
<nav class="
  sticky top-0 z-50
  bg-white/80 dark:bg-slate-900/80
  backdrop-blur-sm
  border-b border-slate-200/50 dark:border-slate-700/50
  transition-colors duration-200
">
  <div class="max-w-7xl mx-auto px-4 py-3">
    <!-- Nav content -->
  </div>
</nav>
```

### Glass Anti-Patterns

**Don't stack multiple glass layers:**
```html
<!-- Bad: blur compounds, performance suffers -->
<div class="glass">
  <div class="glass">  <!-- Don't do this -->
    <div class="glass">  <!-- Definitely don't do this -->
```

**Don't use glass without background interest:**
```html
<!-- Bad: glass over solid white is just... solid white with blur overhead -->
<body class="bg-white">
  <div class="glass">Why bother?</div>
</body>

<!-- Good: glass over gradient/decoration -->
<body class="bg-gradient-to-b from-sky-100 to-emerald-50">
  <ForestBackground />
  <div class="glass">Now the glass has purpose</div>
</body>
```

---

## Part 2: Seasonal Theming

Grove experiences four seasons, each with distinct colors, weather, and emotional tone.

### The Four Seasons

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           GROVE SEASONAL CYCLE                           │
└──────────────────────────────────────────────────────────────────────────┘

        SPRING                    SUMMER                    AUTUMN
    ┌────────────┐            ┌────────────┐            ┌────────────┐
    │  Renewal   │            │   Growth   │            │  Harvest   │
    │────────────│            │────────────│            │────────────│
    │ Cherry     │ ────────►  │ Deep       │ ────────►  │ Amber      │
    │ blossoms   │            │ greens     │            │ and rust   │
    │ Fresh lime │            │ Sky blue   │            │ Golden     │
    │────────────│            │────────────│            │────────────│
    │ Petals     │            │ Full       │            │ Falling    │
    │ fall       │            │ canopy     │            │ leaves     │
    └────────────┘            └────────────┘            └────────────┘
          ▲                                                   │
          │                                                   ▼
          │                   ┌────────────┐                  │
          │                   │   WINTER   │                  │
          │                   │────────────│                  │
          └───────────────────│ Rest       │◄─────────────────┘
                              │────────────│
                              │ Slate      │
                              │ Frost      │
                              │ Evergreen  │
                              │────────────│
                              │ Snowfall   │
                              │ Bare       │
                              │ branches   │
                              └────────────┘
```

### Season Detection

```svelte
<script>
  import { season } from '$lib/stores/season';

  const isSpring = $derived($season === 'spring');
  const isSummer = $derived($season === 'summer');
  const isAutumn = $derived($season === 'autumn');
  const isWinter = $derived($season === 'winter');
</script>
```

### Seasonal Background Gradients

```svelte
<main class="
  min-h-screen transition-colors duration-1000
  {isWinter
    ? 'bg-gradient-to-b from-slate-200 via-slate-100 to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-700'
    : isAutumn
      ? 'bg-gradient-to-b from-orange-100 via-amber-50 to-yellow-50 dark:from-slate-900 dark:via-amber-950 dark:to-orange-950'
      : isSpring
        ? 'bg-gradient-to-b from-pink-50 via-sky-50 to-lime-50 dark:from-slate-900 dark:via-pink-950 dark:to-lime-950'
        : 'bg-gradient-to-b from-sky-100 via-sky-50 to-emerald-50 dark:from-slate-900 dark:via-slate-800 dark:to-emerald-950'
  }
">
```

### Seasonal Weather Effects

```svelte
<!-- Winter: Gentle snowfall -->
{#if isWinter}
  <SnowfallLayer
    count={40}
    zIndex={5}
    opacity={{ min: 0.4, max: 0.8 }}
    spawnDelay={8}
  />
{/if}

<!-- Spring: Cherry blossom petals -->
{#if isSpring}
  <FallingPetalsLayer
    count={80}
    zIndex={100}
    opacity={{ min: 0.5, max: 0.9 }}
  />
{/if}

<!-- Autumn: Leaves fall from trees -->
{#if isAutumn}
  <FallingLeavesLayer
    trees={forestTrees}
    season={$season}
    minLeavesPerTree={2}
    maxLeavesPerTree={4}
  />
{/if}

<!-- Summer: Clear skies, full canopy (no particles, trees at full green) -->
```

### Seasonal Birds

Different birds appear in different seasons:

```svelte
<!-- Winter visitors -->
{#if isWinter}
  <Cardinal facing="right" class="absolute bottom-20 left-[15%]" />
  <Chickadee facing="left" class="absolute bottom-32 right-[20%]" />
{/if}

<!-- Spring arrivals -->
{#if isSpring}
  <Robin facing="right" class="absolute bottom-24 left-[25%]" />
  <Bluebird facing="left" class="absolute bottom-28 right-[30%]" />
{/if}
```

### Season Color Palettes

Import from: `$lib/components/nature/palette`

**Spring:**
- Fresh greens (#84cc16, #65a30d)
- Cherry pink (#f472b6, #ec4899)
- Sky blue (#38bdf8)

**Summer:**
- Deep forest green (#166534, #15803d)
- Rich sky blue (#0284c7)
- Warm sunshine (#facc15)

**Autumn:**
- Rust (#b45309, #92400e)
- Amber (#f59e0b, #d97706)
- Gold (#eab308)
- Warm brown (#78350f)

**Winter:**
- Slate (#475569, #64748b)
- Frost (#e2e8f0, #cbd5e1)
- Evergreen (#166534)
- Ice blue (#bae6fd)

---

## Part 3: Randomized Forests

Forests should feel alive—different each visit, yet always harmonious.

### Tree Generation Algorithm

```typescript
interface GeneratedTree {
  id: number;
  x: number;           // percentage from left (5-93%)
  size: number;        // base width in pixels (80-160)
  aspectRatio: number; // height multiplier (1.0-1.5)
  treeType: TreeType;  // 'logo' | 'pine' | 'cherry' | 'aspen' | 'birch'
  opacity: number;     // depth illusion (0.5-0.9)
  zIndex: number;      // layer ordering
}

type TreeType = 'logo' | 'pine' | 'cherry' | 'aspen' | 'birch';

function generateForest(count: number): GeneratedTree[] {
  const trees: GeneratedTree[] = [];
  const usedPositions: number[] = [];

  for (let i = 0; i < count; i++) {
    // Find non-overlapping position (8% minimum gap)
    let x: number;
    let attempts = 0;
    do {
      x = 5 + Math.random() * 88; // Stay within 5-93% range
      attempts++;
    } while (
      usedPositions.some(pos => Math.abs(pos - x) < 8) &&
      attempts < 20
    );
    usedPositions.push(x);

    // Randomize size with natural variation
    const size = 80 + Math.random() * 80;
    const aspectRatio = 1.0 + Math.random() * 0.5;

    // Larger trees appear closer (higher opacity, higher z-index)
    const opacity = 0.5 + Math.random() * 0.4;
    const zIndex = size > 130 ? 3 : size > 100 ? 2 : 1;

    trees.push({
      id: i,
      x,
      size,
      aspectRatio,
      treeType: pickRandomTreeType(),
      opacity,
      zIndex,
    });
  }

  // Sort by x position for natural left-to-right rendering
  return trees.sort((a, b) => a.x - b.x);
}

function pickRandomTreeType(): TreeType {
  const types: TreeType[] = ['logo', 'pine', 'cherry', 'aspen', 'birch'];
  return types[Math.floor(Math.random() * types.length)];
}
```

### Responsive Density

```typescript
function calculateTreeCount(baseCount: number): number {
  const width = typeof window !== 'undefined' ? window.innerWidth : 1024;

  let multiplier: number;
  if (width < 768) multiplier = 1.0;        // Mobile: base count
  else if (width < 1024) multiplier = 1.3;  // Tablet
  else if (width < 1440) multiplier = 1.8;  // Desktop
  else if (width < 2560) multiplier = 2.5;  // Large desktop
  else multiplier = 3.5;                     // Ultrawide

  return Math.floor(baseCount * multiplier);
}
```

### Rendering the Forest

```svelte
<script>
  import { season } from '$lib/stores/season';
  import { Logo, TreePine, TreeCherry, TreeAspen, TreeBirch } from '$lib/components/trees';

  let forestTrees = $state(generateForest(calculateTreeCount(6)));
</script>

<div class="absolute inset-x-0 bottom-0 h-48 overflow-hidden pointer-events-none">
  {#each forestTrees as tree (tree.id)}
    <div
      class="absolute transition-transform duration-1000"
      style="
        left: {tree.x}%;
        bottom: 0;
        width: {tree.size}px;
        height: {tree.size * tree.aspectRatio}px;
        opacity: {tree.opacity};
        z-index: {tree.zIndex};
        transform: translateX(-50%);
      "
    >
      {#if tree.treeType === 'logo'}
        <Logo class="w-full h-full" season={$season} animate />
      {:else if tree.treeType === 'pine'}
        <TreePine class="w-full h-full" season={$season} animate />
      {:else if tree.treeType === 'cherry'}
        <TreeCherry class="w-full h-full" season={$season} animate />
      {:else if tree.treeType === 'aspen'}
        <TreeAspen class="w-full h-full" season={$season} animate />
      {:else if tree.treeType === 'birch'}
        <TreeBirch class="w-full h-full" season={$season} animate />
      {/if}
    </div>
  {/each}
</div>
```

### Regeneration Rules

| Event | Action |
|-------|--------|
| **Page mount** | Generate once |
| **Window resize (small)** | Keep existing trees |
| **Window resize (bracket change)** | Regenerate with new density |
| **Scroll** | Never regenerate (stability during reading) |
| **Season change** | Keep positions, trees adapt colors |

---

## Part 4: Midnight Bloom

For content about the future, dreams, or mystical features—the tea shop at the edge of tomorrow.

### The Palette

```typescript
const midnightBloom = {
  deepPlum: '#581c87',   // Night sky depth
  purple: '#7c3aed',     // Soft purple glow
  violet: '#8b5cf6',     // Lighter accent
  amber: '#f59e0b',      // Lantern warmth
  warmCream: '#fef3c7',  // Tea steam, page glow
  softGold: '#fcd34d',   // Fairy lights
};
```

### When to Use Midnight Bloom

- Far-future roadmap items
- "Coming soon" sections
- Mystical or dreamy content
- Vision statements
- Quiet, reflective moments

### Midnight Bloom Implementation

```svelte
<section class="relative bg-gradient-to-b from-orange-950/50 via-purple-950 to-slate-950 py-24">
  <!-- Celestial elements -->
  <StarCluster count={12} class="absolute top-12 left-[10%]" />
  <Moon phase="waning-crescent" class="absolute top-20 right-[15%] w-16 h-16 opacity-60" />
  <Firefly count={8} class="absolute inset-0 pointer-events-none" />

  <!-- Content with purple glass -->
  <div class="relative z-10 max-w-3xl mx-auto px-6">
    <blockquote class="
      bg-purple-900/30
      backdrop-blur-sm
      border border-purple-700/30
      rounded-xl
      p-8
    ">
      <p class="text-purple-200 text-lg italic leading-relaxed">
        Imagine a place where your words live forever, owned by you,
        readable by anyone, controlled by no one...
      </p>
    </blockquote>
  </div>
</section>
```

---

## Part 5: Icon Standards

**Rule: Lucide only. Never emojis.**

### Why Lucide?

- Consistent stroke weight and sizing
- SVG-based (crisp at any size)
- Tree-shakeable (only import what you use)
- Extensive library (1000+ icons)
- Accessible (proper ARIA by default)

### Standard Icon Mapping

Maintain consistency by using the same icon for the same concept:

| Concept | Icon | Notes |
|---------|------|-------|
| **Navigation** | | |
| Home | `Home` | |
| About | `Info` | |
| Vision | `Telescope` | Looking forward |
| Roadmap | `Map` | Journey/direction |
| Pricing | `HandCoins` | |
| Knowledge/Docs | `BookOpen` | |
| Forest (community) | `Trees` | |
| Blog/Writing | `PenLine` | |
| **Features** | | |
| Email | `Mail` | |
| Storage | `HardDrive` | |
| Theming | `Palette` | |
| Security/Auth | `ShieldCheck` | |
| Cloud | `Cloud` | |
| Search | `Search` | |
| Archives | `Archive` | |
| **States** | | |
| Success | `Check` | |
| Error | `X` | |
| Loading | `Loader2` | With `animate-spin` |
| Warning | `AlertTriangle` | |
| **Content** | | |
| Posts | `FileText` | |
| Tags | `Tag` | |
| Growth | `Sprout` | Grove brand icon |
| Heart/Love | `Heart` | |
| External link | `ExternalLink` | |
| Location | `MapPin` | |
| **Grove-Specific** | | |
| Coming Soon | `Seedling` | Something growing |
| Refinement | `Gem` | Polish, quality |
| The Dream | `Sparkles` | Use sparingly! |
| Night/Mystical | `Star` | Midnight themes |

### Icon Usage

```svelte
<script>
  import { Sprout, Check, Trees, Loader2 } from 'lucide-svelte';
</script>

<!-- Inline with text -->
<span class="inline-flex items-center gap-1.5">
  <Sprout class="w-4 h-4" />
  <span>New feature</span>
</span>

<!-- Button icon -->
<button class="p-2 rounded-lg hover:bg-slate-100">
  <Menu class="w-5 h-5" />
</button>

<!-- Large decorative -->
<Gem class="w-8 h-8 text-amber-400" />

<!-- Loading state -->
<Loader2 class="w-5 h-5 animate-spin" />
```

---

## Part 6: Mobile Considerations

### Responsive Decorations

| Element | Desktop | Mobile |
|---------|---------|--------|
| Trees | 6-10 per section | 3-4 per section |
| Particles | 40-100 | 20-40 |
| Clouds | 4-6 | 2-3 |
| Complex animations | Full | Reduced or disabled |

### Touch Targets

**Minimum 44x44px for all interactive elements:**

```svelte
<!-- Bad: too small -->
<button class="p-1">
  <X class="w-4 h-4" />
</button>

<!-- Good: proper touch target -->
<button class="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center">
  <X class="w-5 h-5" />
</button>
```

### Reduced Motion

Respect user preferences:

```svelte
<script>
  const prefersReducedMotion = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
</script>

{#if !prefersReducedMotion}
  <SnowfallLayer count={40} />
  <FallingPetalsLayer count={80} />
{/if}

<!-- Or use CSS -->
<div class="animate-bounce motion-reduce:animate-none">
  Bouncing element
</div>
```

### Mobile Navigation Pattern

Desktop nav items that overflow should collapse to a sheet menu:

```svelte
<script>
  let mobileMenuOpen = $state(false);
</script>

<!-- Desktop nav (hidden on mobile) -->
<nav class="hidden md:flex items-center gap-6">
  <a href="/forest">Forest</a>
  <a href="/roadmap">Roadmap</a>
  <a href="/pricing">Pricing</a>
</nav>

<!-- Mobile menu button (visible on mobile) -->
<button
  class="md:hidden p-2.5"
  onclick={() => mobileMenuOpen = true}
  aria-label="Open menu"
>
  <Menu class="w-5 h-5" />
</button>

<!-- Mobile sheet menu -->
<MobileMenu
  bind:open={mobileMenuOpen}
  onclose={() => mobileMenuOpen = false}
>
  <a href="/forest">Forest</a>
  <a href="/roadmap">Roadmap</a>
  <a href="/pricing">Pricing</a>
</MobileMenu>
```

---

## Component Library Reference

### Trees

Location: `landing/src/lib/components/trees/`

| Component | Description | Seasonal Behavior |
|-----------|-------------|-------------------|
| `Logo` | Grove tree (brand mark) | Full seasonal color changes |
| `TreePine` | Evergreen conifer | Stays green, snow in winter |
| `TreeCherry` | Cherry blossom tree | Blossoms spring, bare winter |
| `TreeAspen` | Quaking aspen | Yellow autumn, bare winter |
| `TreeBirch` | White birch | Golden autumn, bare winter |

### Weather

Location: `landing/src/lib/components/nature/weather/`

| Component | Season | Props |
|-----------|--------|-------|
| `SnowfallLayer` | Winter | `count`, `opacity`, `spawnDelay` |
| `FallingPetalsLayer` | Spring | `count`, `opacity`, `fallDuration` |
| `FallingLeavesLayer` | Autumn | `trees`, `season`, `minLeavesPerTree` |

### Sky

Location: `landing/src/lib/components/nature/sky/`

| Component | Purpose |
|-----------|---------|
| `Cloud` | Decorative floating clouds |
| `Moon` | Lunar phases |
| `StarCluster` | Groups of stars |
| `Firefly` | Glowing particles (night scenes) |

### Creatures

Location: `landing/src/lib/components/nature/creatures/`

| Component | Season | Notes |
|-----------|--------|-------|
| `Cardinal` | Winter | Red bird, `facing` prop |
| `Chickadee` | Winter | Small bird |
| `Robin` | Spring | Red breast |
| `Bluebird` | Spring | Blue bird |

### Botanical

Location: `landing/src/lib/components/nature/botanical/`

- `Vine` — Decorative ivy/climbing plants
- `Leaf` — Individual leaf element
- `Petal` — Cherry blossom petal

### Ground

Location: `landing/src/lib/components/nature/ground/`

- `Grass` — Ground cover
- `Flower` — Small decorative flowers
- `Mushroom` — Forest floor elements

---

## When to Use Prism

| Pattern | Best For |
|---------|----------|
| **Full glassmorphism + forests** | Story pages, about, vision, roadmap |
| **Glass only (no nature)** | Admin panels, settings, forms |
| **Seasonal theming** | Public-facing pages with emotional storytelling |
| **Midnight Bloom** | Future features, dreams, vision statements |
| **Weather particles** | Hero sections, transitions, seasonal showcases |
| **Randomized forests** | Landing pages, community pages, blog indexes |

## When NOT to Use

| Pattern | Avoid For |
|---------|-----------|
| **Heavy decoration** | Data-dense tables, complex forms, dashboards |
| **Particles** | Performance-critical pages, accessibility-focused contexts |
| **Multiple glass layers** | Anywhere (never stack glass) |
| **Randomization** | Content that must match between sessions/screenshots |
| **Seasonal colors** | Brand-critical contexts requiring consistent colors |

---

## Performance Budget

| Element | Target | Measurement |
|---------|--------|-------------|
| Total trees | < 15 per viewport | Count |
| Total particles | < 100 active | Count |
| Blur radius | 8-12px max | CSS value |
| Animation frame rate | 60fps | DevTools |
| First Contentful Paint | < 1.5s | Lighthouse |

### Optimization Techniques

1. **Use CSS transforms** — Not top/left for animations
2. **will-change sparingly** — Only on animated elements
3. **Reduce particle counts on mobile** — Detect viewport width
4. **Lazy load forests** — Below-fold sections generate on scroll
5. **Respect reduced motion** — Skip particles entirely

---

## Implementation Checklist

Before shipping a Grove page:

- [ ] Glass effects used for text over busy backgrounds
- [ ] No stacked/nested glass layers
- [ ] Lucide icons only (no emojis anywhere)
- [ ] Mobile overflow menu for nav items
- [ ] Touch targets minimum 44x44px
- [ ] Decorative elements respect `prefers-reduced-motion`
- [ ] Seasonal colors match page's emotional tone
- [ ] Trees randomized with 8% minimum gap
- [ ] Dark mode tested with appropriate glass variants
- [ ] Performance budget respected (< 15 trees, < 100 particles)

---

## Reference Implementations

Study these pages for patterns:

| Page | Demonstrates |
|------|--------------|
| `/forest` | Full randomized forest, season toggle, interactive demo |
| `/roadmap` | Seasonal sections, progressive decoration, midnight bloom |
| `/vision` | Narrative flow, glass callouts, emotional storytelling |
| `/about` | Glass cards, team sections, warm voice |

---

*Pattern created: January 2026*
*For use by: All Grove properties*
