# Chameleon Adapt: Nature Components

> Loaded by chameleon-adapt during Phase 4 (TEXTURE). See SKILL.md for the full workflow.

---

## Component Catalog

| Component                 | Use                                | Key Props                                  |
| ------------------------- | ---------------------------------- | ------------------------------------------ |
| `Logo`                    | Grove tree, seasonal               | `season`, `animate`, `breathing`           |
| `TreePine`                | Evergreen, stays green in autumn   | `season`, `animate`                        |
| `TreeCherry`              | Blossoms in spring, bare in winter | `season`, `animate`                        |
| `TreeAspen`               | Deciduous, seasonal colors         | `season`, `animate`                        |
| `TreeBirch`               | Deciduous, seasonal colors         | `season`, `animate`                        |
| `Cloud`                   | Decorative sky element             | `variant`, `animate`, `speed`, `direction` |
| `SnowfallLayer`           | Winter particles                   | `count`, `opacity`, `spawnDelay`           |
| `FallingPetalsLayer`      | Spring cherry blossoms             | `count`, `opacity`, `fallDuration`         |
| `FallingLeavesLayer`      | Autumn leaves (tied to trees)      | `trees`, `season`, `minLeavesPerTree`, `maxLeavesPerTree` |
| `Cardinal`                | Winter bird                        | `facing`                                   |
| `Chickadee`               | Winter bird                        | `facing`                                   |
| `Robin`                   | Spring bird                        | `facing`                                   |
| `Bluebird`                | Spring bird                        | `facing`                                   |
| `Vine`                    | Decorative ivy/vines               | varies                                     |
| `Lantern`                 | Warm glow points                   | varies                                     |

---

## Randomized Forests

Forest generation creates natural, non-repeating layouts. Trees generate once on mount and stay stable during scrolling.

### Tree Data Structure

```typescript
interface GeneratedTree {
  id: number;
  x: number;        // percentage from left (5-93% to avoid edges)
  size: number;     // base width in pixels
  aspectRatio: number; // height = size * aspectRatio (1.0-1.5 range)
  treeType: TreeType; // 'logo' | 'pine' | 'cherry' | 'aspen' | 'birch'
  opacity: number;  // 0.5-0.9 for depth
  zIndex: number;   // larger trees = higher z-index
}
```

### Generation Algorithm

```typescript
function generateSectionTrees(count: number): GeneratedTree[] {
  const trees: GeneratedTree[] = [];
  const usedPositions: number[] = [];

  for (let i = 0; i < count; i++) {
    // Find non-overlapping position (8% minimum gap)
    let x: number;
    let attempts = 0;
    do {
      x = 5 + Math.random() * 88;
      attempts++;
    } while (
      usedPositions.some((pos) => Math.abs(pos - x) < 8) &&
      attempts < 20
    );
    usedPositions.push(x);

    const size = 80 + Math.random() * 80;
    const aspectRatio = 1.0 + Math.random() * 0.5;
    const opacity = 0.5 + Math.random() * 0.4;
    const zIndex = size > 130 ? 3 : size > 100 ? 2 : 1;

    trees.push({
      id: i,
      x,
      size,
      aspectRatio,
      treeType: pickRandom(treeTypes),
      opacity,
      zIndex,
    });
  }

  return trees.sort((a, b) => a.x - b.x);
}
```

### Rendering Trees

```svelte
{#each forestTrees as tree (tree.id)}
  <div
    class="absolute"
    style="left: {tree.x}%; bottom: 0; width: {tree.size}px;
           height: {tree.size * tree.aspectRatio}px;
           opacity: {tree.opacity}; z-index: {tree.zIndex};
           transform: translateX(-50%);"
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

### Regeneration Timing

- **On mount** — Trees generate once when page loads
- **On resize (significant)** — Only if viewport bracket changes dramatically
- **Never on scroll** — Keep forest stable during reading

### Responsive Density

```typescript
function calculateDensity(): number {
  const width = window.innerWidth;
  if (width < 768) return 1;    // Mobile: base count
  if (width < 1024) return 1.3; // Tablet
  if (width < 1440) return 1.8; // Desktop
  if (width < 2560) return 2.5; // Large desktop
  return 3.5;                    // Ultrawide
}
```

---

## Weather Effects

### Winter — Snowfall

```svelte
{#if isWinter}
  <SnowfallLayer count={40} zIndex={5} opacity={{ min: 0.4, max: 0.8 }} spawnDelay={8} />
{/if}
```

### Spring — Cherry Blossom Petals

```svelte
{#if isSpring}
  <FallingPetalsLayer count={80} zIndex={100} opacity={{ min: 0.5, max: 0.9 }} />
{/if}
```

### Autumn — Falling Leaves

Leaves are tied to tree positions for natural feel:

```svelte
{#if isAutumn}
  <FallingLeavesLayer
    trees={forestTrees}
    season={$season}
    minLeavesPerTree={2}
    maxLeavesPerTree={4}
  />
{/if}
```

### Mobile Particle Counts

Reduce particle effects on small screens:

```svelte
<SnowfallLayer count={isLargeScreen ? 100 : 40} ... />
```

---

## Seasonal Birds

Birds add life to forest scenes and subtly indicate the current season.

### Winter Birds

```svelte
{#if isWinter}
  <Cardinal facing="right" class="absolute top-20 left-[15%]" />
  <Chickadee facing="left" class="absolute top-32 right-[20%]" />
{/if}
```

### Spring Birds

```svelte
{#if isSpring}
  <Robin facing="right" class="absolute top-24 left-[10%]" />
  <Bluebird facing="left" class="absolute top-28 right-[15%]" />
{/if}
```

---

## Season Detection

```svelte
import { season } from '$lib/stores/season';

const isSpring = $derived($season === 'spring');
const isAutumn = $derived($season === 'autumn');
const isWinter = $derived($season === 'winter');
// Summer is the default (no flag needed)
```

---

## Icons: Lucide Only

**NEVER** use emojis. **ALWAYS** use Lucide icons.

```svelte
import { MapPin, Check, Leaf, Trees, Mail } from 'lucide-svelte';

<!-- Good -->
<MapPin class="w-4 h-4" />
<Check class="w-5 h-5 text-green-500" />

<!-- NEVER do this -->
<!-- ❌ 🌱 📧 ✅ -->
```

### Centralized Icon Registry

```typescript
// landing/src/lib/utils/icons.ts
import {
  Mail,
  HardDrive,
  Palette,
  ShieldCheck,
  Cloud,
  SearchCode,
  Archive,
  Upload,
  MessagesSquare,
  Github,
  Check,
  X,
  Loader2,
  FileText,
  Tag,
  Sprout,
  Heart,
  ExternalLink,
  MapPin,
} from "lucide-svelte";

export const featureIcons = {
  mail: Mail,
  harddrive: HardDrive,
  palette: Palette,
  shieldcheck: ShieldCheck,
  cloud: Cloud,
  searchcode: SearchCode,
} as const;
```

### Icon Guidelines

1. **Always use icon maps** — Never hardcode icon imports in every component
2. **Avoid overusing Sparkles** — Reserve for truly mystical/magical contexts
3. **Be consistent** — Use the same icon for the same concept everywhere
4. **Semantic meaning** — Choose icons that convey meaning, not just decoration
5. **Export from central utility** — Use `landing/src/lib/utils/icons.ts`

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

## Accessibility

All motion must respect `prefers-reduced-motion`. Never render particle layers for reduced-motion users.

```svelte
<!-- Respect reduced motion -->
{#if !prefersReducedMotion}
  <FallingLeavesLayer ... />
{/if}

{#if !prefersReducedMotion}
  <FallingPetalsLayer ... />
{/if}
```

---

## Mobile Treatment for Decorative Elements

| Element            | Mobile Treatment                                |
| ------------------ | ----------------------------------------------- |
| Trees              | Reduce count, simplify (density multiplier = 1) |
| Particles          | Reduce count (40→20 snowflakes)                 |
| Clouds             | Hide some, keep 2-3                             |
| Complex animations | Reduce or disable                               |
| Touch targets      | Minimum 44x44px                                 |
