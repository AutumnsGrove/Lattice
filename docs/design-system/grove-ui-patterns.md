# Grove UI Patterns

> *Every design choice should feel welcoming, organic, readable, and alive.*

Grove is a place. Nature-themed, warm, inviting. Like a midnight tea shop with good documentation. This guide covers the visual patterns that make Grove feel like home.

---

## Core Principles

From the project's guiding philosophy:

> Write with the warmth of a midnight tea shop and the clarity of good documentation.

**Every design choice should feel:**
- **Welcoming** — like entering a cozy space
- **Organic** — natural, not rigid or corporate
- **Readable** — content-first, decorations enhance, never obstruct
- **Alive** — subtle animations, seasonal changes, randomization

---

## Glassmorphism

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

### Glass Variants

| Variant | Use Case | Light Mode | Dark Mode |
|---------|----------|------------|-----------|
| `surface` | Headers, navbars | 95% white | 95% slate |
| `tint` | Text over backgrounds | 60% white | 50% slate |
| `card` | Content cards | 80% white | 70% slate |
| `accent` | Callouts, highlights | 30% accent | 20% accent |
| `overlay` | Modal backdrops | 50% black | 60% black |
| `muted` | Subtle backgrounds | 40% white | 30% slate |

### Usage

```svelte
import { Glass, GlassCard, GlassButton } from '@groveengine/ui/ui';

<Glass variant="tint" class="p-6 rounded-xl">
  <p>Readable text over busy backgrounds</p>
</Glass>

<GlassCard title="Settings" variant="default" hoverable>
  Content here
</GlassCard>

<GlassButton variant="accent">Subscribe</GlassButton>
```

---

## Seasonal Theme System

Grove uses four seasons, each with distinct colors, weather effects, and moods.

| Season | Primary Colors | Mood |
|--------|---------------|------|
| **Spring** | Yellow-green new growth, cherry blossoms, wildflowers | Renewal, hope |
| **Summer** | Deep greens, pink blossoms | Growth, warmth |
| **Autumn** | Amber, rust, gold, maple reds | Harvest, reflection |
| **Winter** | Frost, snow, frosted evergreens | Rest, stillness |

### Color Palette Organization

Colors are organized **dark-to-light** for atmospheric depth. Darker colors go in the background, lighter in the foreground.

```typescript
import { greens, autumn, winter, springFoliage } from '@autumnsgrove/groveengine/ui/nature';

// Dark to light
greens.darkForest  // Background trees
greens.deepGreen   // Mid-distance
greens.grove       // Grove brand primary
greens.meadow      // Standard foliage
greens.mint        // Light accent
```

### Seasonal Weather Effects

```svelte
<!-- Winter -->
<SnowfallLayer count={40} zIndex={5} opacity={{ min: 0.4, max: 0.8 }} />

<!-- Spring -->
<FallingPetalsLayer count={80} zIndex={100} />

<!-- Autumn -->
<FallingLeavesLayer trees={forestTrees} season={$season} />
```

---

## Randomized Forests

The forest should feel alive and different every visit.

### Key Principles

1. **Generate on mount** — Trees generate once when page loads
2. **Stable during reading** — Never regenerate on scroll
3. **Respect spacing** — 8% minimum gap between trees
4. **Create depth** — Larger trees = higher z-index, higher opacity

### Aspect Ratio for Natural Variation

```typescript
const TREE_ASPECT_RATIO_RANGE = { min: 1.0, max: 1.5 };
// height = size * aspectRatio
```

### Responsive Density

```typescript
if (width < 768) return 1;        // Mobile: base count
if (width < 1024) return 1.3;     // Tablet
if (width < 1440) return 1.8;     // Desktop
if (width < 2560) return 2.5;     // Large desktop
return 3.5;                        // Ultrawide
```

---

## Icons: Lucide Only

**NEVER use emojis. ALWAYS use Lucide icons.**

```svelte
import { MapPin, Check, Leaf, Trees, Mail } from 'lucide-svelte';

<!-- Good -->
<MapPin class="w-4 h-4" />

<!-- Bad - NEVER do this -->
<!-- ❌ 🌱 📧 ✅ -->
```

### Standard Icon Mapping

| Concept | Icon |
|---------|------|
| Home | `Home` |
| Vision | `Telescope` |
| Pricing | `HandCoins` |
| Knowledge | `BookOpen` |
| Forest | `Trees` |
| Email | `Mail` |
| Storage | `HardDrive` |
| Success | `Check` |
| Error | `X` |
| Loading | `Loader2` (with animate-spin) |
| Growth | `Sprout` |

### Icon Sizing

```svelte
<!-- Inline with text -->
<span class="inline-flex items-center gap-1.5">
  <Leaf class="w-4 h-4" /> Feature name
</span>

<!-- Button icon -->
<button class="p-2"><Menu class="w-5 h-5" /></button>

<!-- Large decorative -->
<Gem class="w-8 h-8 text-amber-400" />
```

---

## Icon Composition

> *"The grove doesn't need to be drawn. It just needs to be arranged."*

For custom logos and illustrations, compose existing Lucide icons rather than drawing custom SVG.

### Why This Works

- **Consistency** — Icons match Lucide aesthetic (24x24 grid, 2px strokes)
- **Maintainable** — Updating Lucide updates your compositions
- **MIT licensed** — All paths come from open-source icons

### Transform Cheatsheet

| Transform | Effect |
|-----------|--------|
| `translate(x, y)` | Move origin |
| `scale(s)` | Uniform size |
| `rotate(deg, cx, cy)` | Rotation around point |

### Create Depth

- Larger = foreground (opacity 0.9)
- Smaller = background (opacity 0.5-0.7)

---

## Midnight Bloom Palette

For dreamy, far-future, mystical content. The tea shop at the edge of tomorrow.

```typescript
midnightBloom.deepPlum   // #581c87 - Night sky depth
midnightBloom.purple     // #7c3aed - Soft purple glow
midnightBloom.violet     // #8b5cf6 - Lighter accent
midnightBloom.amber      // #f59e0b - Lantern warmth
midnightBloom.warmCream  // #fef3c7 - Tea steam, page glow
midnightBloom.softGold   // #fcd34d - Fairy lights
```

Use with stars, moon, fireflies, and purple glass effects for nighttime sections.

---

## Mobile Considerations

### Decorative Elements

| Element | Mobile Treatment |
|---------|-----------------|
| Trees | Reduce count (density = 1) |
| Particles | Reduce count (40→20) |
| Clouds | Keep 2-3 |
| Touch targets | Minimum 44x44px |

### Respect Reduced Motion

```svelte
{#if !prefersReducedMotion}
  <FallingLeavesLayer ... />
{/if}
```

---

## When to Use / When Not to Use

| Pattern | Good For | Avoid When |
|---------|----------|------------|
| **Glassmorphism** | Text over backgrounds, navbars, cards | Data-dense pages, forms |
| **Randomized forests** | Story pages, about pages | Simple informational content |
| **Seasonal themes** | Roadmaps, emotional storytelling | Brand-critical contexts |
| **Midnight Bloom** | Future features, dreams | Practical documentation |
| **Weather particles** | Hero sections, transitions | Performance-critical pages |

---

## Quick Checklist

Before shipping a Grove page:

- [ ] Glass effects used for text readability?
- [ ] Lucide icons, no emojis?
- [ ] Mobile overflow menu for navigation?
- [ ] Decorative elements respect `prefers-reduced-motion`?
- [ ] Touch targets at least 44x44px?
- [ ] Seasonal colors match emotional tone?
- [ ] Trees have proper spacing (8% minimum gap)?
- [ ] Dark mode supported?

---

*Every pixel is an invitation. Make it feel like home.*
