---
name: grove-ui-design
description: Create warm, nature-themed UI for Grove with glassmorphism, seasonal decorations, randomized forests, and accessible design patterns. Use when building pages, enhancing UI, or adding decorative elements.
---

# Grove UI Design Skill

## When to Activate

Activate this skill when:
- Creating or enhancing pages for Grove sites
- Adding decorative nature elements (trees, clouds, weather effects)
- Implementing glassmorphism effects for readability
- Working with the seasonal theme system
- Building navigation patterns (navbar, mobile overflow menus)
- Creating "story" pages that guide users through content
- Ensuring mobile-friendly, accessible UI
- Choosing icons or visual elements

## The Grove Aesthetic

Grove is a **place**. It's nature-themed, warm, and inviting—like a midnight tea shop with good documentation.

### Core Principles

```
Warm, introspective, queer, unapologetically building something meaningful.
Write with the warmth of a midnight tea shop and the clarity of good documentation.
```

**Every design choice should feel:**
- **Welcoming** — like entering a cozy space
- **Organic** — natural, not rigid or corporate
- **Readable** — content-first, decorations enhance, never obstruct
- **Alive** — subtle animations, seasonal changes, randomization

---

## Glassmorphism Pattern

Glass effects create readability while revealing hints of background decoration.

### The Layering Formula

```
Background (gradients, vines, nature)
    ↓
Decorative Elements (trees, clouds, particles)
    ↓
Glass Surface (translucent + blur)
    ↓
Content (text, cards, UI)
```

### Glass Components

```svelte
import { Glass, GlassCard, GlassButton, GlassOverlay } from '@groveengine/ui/ui';

<!-- Container with glass effect -->
<Glass variant="tint" class="p-6 rounded-xl">
  <p>Readable text over busy backgrounds</p>
</Glass>

<!-- Card with glass styling -->
<GlassCard title="Settings" variant="default" hoverable>
  Content here
</GlassCard>

<!-- Glass button -->
<GlassButton variant="accent">Subscribe</GlassButton>
```

### Glass Variants

| Variant | Use Case | Light Mode | Dark Mode |
|---------|----------|------------|-----------|
| `surface` | Headers, navbars | 95% white | 95% slate |
| `tint` | Text over backgrounds | 60% white | 50% slate |
| `card` | Content cards | 80% white | 70% slate |
| `accent` | Callouts, highlights | 30% accent | 20% accent |
| `overlay` | Modal backdrops | 50% black | 60% black |
| `muted` | Subtle backgrounds | 40% white | 30% slate |

### CSS Utility Classes

```html
<!-- Apply directly to any element -->
<div class="glass rounded-xl p-4">Basic glass</div>
<div class="glass-tint p-6">Text container</div>
<div class="glass-accent p-4">Highlighted section</div>
<nav class="glass-surface sticky top-0">Navbar</nav>
```

### Key Pattern: Sticky Navigation

```svelte
<nav class="sticky top-[73px] z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-divider">
  <!-- Navigation content -->
</nav>
```

---

## Seasonal Theme System

Grove uses four seasons, each with distinct colors, weather effects, and moods.

### Season Detection

```svelte
import { season } from '$lib/stores/season';

const isSpring = $derived($season === 'spring');
const isAutumn = $derived($season === 'autumn');
const isWinter = $derived($season === 'winter');
// Summer is the default (no flag needed)
```

### Seasonal Colors

Import from: `$lib/components/nature/palette`

| Season | Primary Colors | Mood |
|--------|---------------|------|
| **Spring** | Fresh greens, cherry pink | Renewal, hope |
| **Summer** | Deep greens, sky blue | Growth, warmth |
| **Autumn** | Rust, amber, gold | Harvest, reflection |
| **Winter** | Slate, frost, evergreen | Rest, stillness |

### Seasonal Weather Effects

```svelte
<!-- Winter: Snowfall -->
{#if isWinter}
  <SnowfallLayer count={40} zIndex={5} opacity={{ min: 0.4, max: 0.8 }} spawnDelay={8} />
{/if}

<!-- Spring: Cherry blossom petals -->
{#if isSpring}
  <FallingPetalsLayer count={80} zIndex={100} opacity={{ min: 0.5, max: 0.9 }} />
{/if}

<!-- Autumn: Falling leaves (tied to trees) -->
{#if isAutumn}
  <FallingLeavesLayer trees={forestTrees} season={$season} minLeavesPerTree={2} maxLeavesPerTree={4} />
{/if}
```

### Seasonal Background Gradients

```svelte
<main class="min-h-screen transition-colors duration-1000
  {isWinter ? 'bg-gradient-to-b from-slate-200 via-slate-100 to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-700' : ''}
  {isAutumn ? 'bg-gradient-to-b from-orange-100 via-amber-50 to-yellow-50 dark:from-slate-900 dark:via-amber-950 dark:to-orange-950' : ''}
  {isSpring ? 'bg-gradient-to-b from-pink-50 via-sky-50 to-lime-50 dark:from-slate-900 dark:via-pink-950 dark:to-lime-950' : ''}
  {/* Summer default */} 'bg-gradient-to-b from-sky-100 via-sky-50 to-emerald-50 dark:from-slate-900 dark:via-slate-800 dark:to-emerald-950'
">
```

### When to Use Seasons

- **Roadmap pages** — Show progress through seasonal metaphor
- **Story/about pages** — Create atmosphere and emotional connection
- **Interactive demos** — Let users toggle seasons (like /forest)
- **Help articles** — Consider seasonal decor to break up long content
- **Anywhere you want magic** — Use judgment based on page purpose

---

## Randomized Forests

The forest should feel alive and different every visit.

### Tree Generation Pattern

```typescript
interface GeneratedTree {
  id: number;
  x: number;           // percentage from left (5-93% to avoid edges)
  size: number;        // base width in pixels
  aspectRatio: number; // height = size * aspectRatio (1.0-1.5 range)
  treeType: TreeType;  // 'logo' | 'pine' | 'cherry' | 'aspen' | 'birch'
  opacity: number;     // 0.5-0.9 for depth
  zIndex: number;      // larger trees = higher z-index
}

// Aspect ratio creates natural height variation
const TREE_ASPECT_RATIO_RANGE = { min: 1.0, max: 1.5 };

function generateSectionTrees(count: number): GeneratedTree[] {
  const trees: GeneratedTree[] = [];
  const usedPositions: number[] = [];

  for (let i = 0; i < count; i++) {
    // Find non-overlapping position
    let x: number;
    let attempts = 0;
    do {
      x = 5 + Math.random() * 88;
      attempts++;
    } while (usedPositions.some(pos => Math.abs(pos - x) < 8) && attempts < 20);
    usedPositions.push(x);

    const size = 80 + Math.random() * 80;
    const aspectRatio = 1.0 + Math.random() * 0.5;
    const opacity = 0.5 + Math.random() * 0.4;
    const zIndex = size > 130 ? 3 : size > 100 ? 2 : 1;

    trees.push({ id: i, x, size, aspectRatio, treeType: pickRandom(treeTypes), opacity, zIndex });
  }

  return trees.sort((a, b) => a.x - b.x);
}
```

### Regeneration Timing

- **On mount** — Trees generate once when page loads
- **On resize (significant)** — Only if viewport bracket changes dramatically
- **Never on scroll** — Keep forest stable during reading

### Rendering Trees

```svelte
{#each forestTrees as tree (tree.id)}
  <div
    class="absolute"
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
```

### Responsive Density

```typescript
function calculateDensity(): number {
  const width = window.innerWidth;
  if (width < 768) return 1;        // Mobile: base count
  if (width < 1024) return 1.3;     // Tablet
  if (width < 1440) return 1.8;     // Desktop
  if (width < 2560) return 2.5;     // Large desktop
  return 3.5;                        // Ultrawide
}
```

---

## Nature Components

Grove has an extensive library of decorative components. Explore with:

```bash
# Trees
ls landing/src/lib/components/trees/
ls landing/src/lib/components/nature/trees/

# Weather (seasonal particles)
ls landing/src/lib/components/nature/weather/

# Sky (clouds, stars, moon)
ls landing/src/lib/components/nature/sky/

# Botanical (leaves, petals, vines)
ls landing/src/lib/components/nature/botanical/

# Ground (flowers, grass, mushrooms)
ls landing/src/lib/components/nature/ground/

# Structural (lattice, lanterns, paths)
ls landing/src/lib/components/nature/structural/

# Birds (cardinals, robins, bluebirds)
ls landing/src/lib/components/nature/creatures/
```

### Key Components

| Component | Use | Example Props |
|-----------|-----|---------------|
| `Logo` | Grove tree, seasonal | `season`, `animate`, `breathing` |
| `TreePine` | Evergreen, stays green in autumn | `season`, `animate` |
| `TreeCherry` | Blossoms in spring, bare in winter | `season`, `animate` |
| `TreeAspen` / `TreeBirch` | Deciduous, seasonal colors | `season`, `animate` |
| `Cloud` | Decorative sky element | `variant`, `animate`, `speed`, `direction` |
| `SnowfallLayer` | Winter particles | `count`, `opacity`, `spawnDelay` |
| `FallingPetalsLayer` | Spring cherry blossoms | `count`, `opacity`, `fallDuration` |
| `FallingLeavesLayer` | Autumn leaves (tied to trees) | `trees`, `season` |
| `Cardinal` / `Chickadee` | Winter birds | `facing` |
| `Robin` / `Bluebird` | Spring birds | `facing` |
| `Vine` | Decorative ivy/vines | varies |
| `Lantern` | Warm glow points | varies |

### Birds by Season

```svelte
<!-- Winter birds -->
{#if isWinter}
  <Cardinal facing="right" style="..." />
  <Chickadee facing="left" style="..." />
{/if}

<!-- Spring birds -->
{#if isSpring}
  <Robin facing="right" style="..." />
  <Bluebird facing="left" style="..." />
{/if}
```

---

## Midnight Bloom Palette

For **dreamy**, **far-future**, **mystical** content. The tea shop that exists at the edge of tomorrow.

```typescript
import { midnightBloom } from '$lib/components/nature/palette';

// Available colors:
midnightBloom.deepPlum   // #581c87 - Night sky depth
midnightBloom.purple     // #7c3aed - Soft purple glow
midnightBloom.violet     // #8b5cf6 - Lighter accent
midnightBloom.amber      // #f59e0b - Lantern warmth
midnightBloom.warmCream  // #fef3c7 - Tea steam, page glow
midnightBloom.softGold   // #fcd34d - Fairy lights
```

### Midnight Bloom Styling

```svelte
<section class="bg-gradient-to-b from-orange-950/50 via-purple-950 to-slate-950">
  <!-- Stars -->
  <StarCluster count={12} class="absolute top-12 left-[10%]" />

  <!-- Moon -->
  <Moon phase="waning-crescent" class="absolute top-20 right-[15%] w-16 h-16 opacity-60" />

  <!-- Fireflies -->
  <Firefly count={8} class="absolute inset-0" />

  <!-- Content with purple glass -->
  <blockquote class="bg-purple-900/30 backdrop-blur-sm border border-purple-700/30 rounded-lg p-6">
    <p class="text-purple-200 italic">Dreamy quote here...</p>
  </blockquote>
</section>
```

---

## Icons: Lucide Only

**NEVER** use emojis. **ALWAYS** use Lucide icons.

```svelte
import { MapPin, Check, Leaf, Trees, Mail } from 'lucide-svelte';

<!-- Good -->
<MapPin class="w-4 h-4" />
<Check class="w-5 h-5 text-green-500" />

<!-- Bad - NEVER do this -->
<!-- ❌ 🌱 📧 ✅ -->
```

### Standardized Icon Mapping

Use these icons consistently across the project:

| Concept | Icon | Notes |
|---------|------|-------|
| **Navigation** | | |
| Home | `Home` | |
| About | `Info` | |
| Vision | `Telescope` | Looking forward |
| Roadmap | `Map` | Journey/direction |
| Pricing | `CircleDollarSign` | Money/currency |
| Knowledge | `BookOpen` | Learning/docs |
| Forest | `Trees` | Community blogs |
| Blog | `PenLine` | Writing |
| **Features** | | |
| Email | `Mail` | |
| Storage | `HardDrive` | |
| Theming | `Palette` | Customization |
| Authentication | `ShieldCheck` | Security |
| Cloud | `Cloud` | Remote/serverless |
| Search | `Search` | |
| Archives | `Archive` | Backups |
| Upload | `Upload` | |
| Video | `Video` | |
| GitHub | `Github` | External links to GitHub |
| **States** | | |
| Success | `Check` | Completed/valid |
| Error | `X` | Failed/close |
| Loading | `Loader2` | With animate-spin |
| **Content** | | |
| Posts | `FileText` | Blog posts |
| Tags | `Tag` | Categorization |
| Growth | `Sprout` | Grove brand, new beginnings |
| Heart | `Heart` | Love, care |
| External | `ExternalLink` | Opens new tab |
| Location | `MapPin` | Current position |
| **Phases** | | |
| Coming Soon | `Seedling` | Something growing |
| Refinement | `Gem` | Polish, quality |
| The Dream | `Sparkles` | Mystical (use sparingly!) |
| Night | `Star` | Midnight themes |
| **Actions** | | |
| Getting Started | `Compass` | Guidance |
| What's New | `Megaphone` | Announcements |
| Next Steps | `Lightbulb` | Ideas |

### Icon Usage Guidelines

1. **Avoid overusing Sparkles** - Reserve for truly mystical/magical contexts
2. **Be consistent** - Use the same icon for the same concept everywhere
3. **Semantic meaning** - Choose icons that convey meaning, not just decoration

### Icon Sizing

```svelte
<!-- Inline with text -->
<span class="inline-flex items-center gap-1.5">
  <Leaf class="w-4 h-4" /> Feature name
</span>

<!-- Button icon -->
<button class="p-2">
  <Menu class="w-5 h-5" />
</button>

<!-- Large decorative -->
<Gem class="w-8 h-8 text-amber-400" />
```

---

## Mobile Considerations

### Overflow Menu Pattern

Desktop navigation items that don't fit should go to a mobile sheet menu:

```svelte
<!-- Mobile menu button (visible md:hidden) -->
<button onclick={() => mobileMenuOpen = true} class="md:hidden p-2">
  <Menu class="w-5 h-5" />
</button>

<!-- Sheet menu -->
<MobileMenu bind:open={mobileMenuOpen} onClose={() => mobileMenuOpen = false} />
```

### Decorative Elements on Mobile

| Element | Mobile Treatment |
|---------|-----------------|
| Trees | Reduce count, simplify (density multiplier = 1) |
| Particles | Reduce count (40→20 snowflakes) |
| Clouds | Hide some, keep 2-3 |
| Complex animations | Reduce or disable |
| Touch targets | Minimum 44x44px |

### Performance Guidelines

```svelte
<!-- Reduce particle counts on mobile -->
<SnowfallLayer count={isLargeScreen ? 100 : 40} ... />

<!-- Skip complex effects for reduced-motion -->
{#if !prefersReducedMotion}
  <FallingLeavesLayer ... />
{/if}
```

---

## When to Use

| Pattern | Good For |
|---------|----------|
| **Glassmorphism** | Text over backgrounds, navbars, cards, modals |
| **Randomized forests** | Story pages, about pages, visual sections |
| **Seasonal themes** | Roadmaps, timelines, emotional storytelling |
| **Midnight Bloom** | Future features, dreams, mystical content |
| **Weather particles** | Hero sections, transitions between seasons |
| **Birds** | Adding life to forest scenes, seasonal indicators |

## When NOT to Use

| Pattern | Avoid When |
|---------|------------|
| **Heavy decoration** | Data-dense pages, admin interfaces, forms |
| **Particle effects** | Performance-critical pages, accessibility concerns |
| **Seasonal colors** | Brand-critical contexts needing consistent colors |
| **Multiple glass layers** | Can cause blur performance issues |
| **Randomization** | Content that needs to match between sessions |
| **Complex forests** | Mobile-first pages, simple informational content |

---

## Reference Pages

Study these for implementation patterns:

- **`/forest`** — Full randomized forest with all seasons
- **`/roadmap`** — Seasonal sections, progressive decoration, midnight bloom
- **`/vision`** — Narrative page with glass callouts

---

## Quick Checklist

Before shipping a Grove page:

- [ ] Glass effects used for text readability over busy backgrounds?
- [ ] Lucide icons, no emojis?
- [ ] Mobile overflow menu for navigation items?
- [ ] Decorative elements respect `prefers-reduced-motion`?
- [ ] Touch targets at least 44x44px?
- [ ] Seasonal colors match the page's emotional tone?
- [ ] Trees randomized with proper spacing (8% minimum gap)?
- [ ] Dark mode supported with appropriate glass variants?
