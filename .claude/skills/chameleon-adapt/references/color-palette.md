# Chameleon Adapt: Color Palette

> Loaded by chameleon-adapt during Phase 3 (COLOR). See SKILL.md for the full workflow.

All colors import from `@autumnsgrove/lattice/ui/nature` unless noted.

---

## Core Palettes (Year-Round)

```typescript
import { greens, bark, earth, natural } from "@autumnsgrove/lattice/ui/nature";
```

### Greens — organized dark-to-light for depth

| Token              | Value     | Use                    |
| ------------------ | --------- | ---------------------- |
| `greens.darkForest` | `#0d4a1c` | Background trees       |
| `greens.deepGreen`  | `#166534` | Mid-distance           |
| `greens.grove`      | `#16a34a` | Grove brand primary    |
| `greens.meadow`     | `#22c55e` | Standard foliage       |
| `greens.spring`     | `#4ade80` | Bright accent          |
| `greens.mint`       | `#86efac` | Light accent           |
| `greens.pale`       | `#bbf7d0` | Foreground highlights  |

### Bark — warm wood tones

| Token              | Value     | Use              |
| ------------------ | --------- | ---------------- |
| `bark.darkBark`    | `#3d2817` | Oak, older trees |
| `bark.bark`        | `#5d4037` | Standard trunk   |
| `bark.warmBark`    | `#6B4423` | Pine, cedar      |
| `bark.lightBark`   | `#8b6914` | Young trees      |

### Earth — ground elements

```typescript
earth.soil
earth.mud
earth.clay
earth.sand
earth.stone
earth.pebble
earth.slate
```

### Natural — cream and off-whites

```typescript
natural.cream
natural.aspenBark
natural.bone
natural.mushroom
natural.birchWhite
```

---

## Spring Palette

```typescript
import {
  springFoliage,
  springSky,
  wildflowers,
  cherryBlossoms,
  cherryBlossomsPeak,
} from "@autumnsgrove/lattice/ui/nature";
```

### Spring Foliage — yellow-green new growth

| Token                      | Value     | Use                    |
| -------------------------- | --------- | ---------------------- |
| `springFoliage.sprout`     | `#65a30d` | Distant new growth     |
| `springFoliage.newLeaf`    | `#84cc16` | Classic spring lime    |
| `springFoliage.freshGreen` | `#a3e635` | Bright foreground      |
| `springFoliage.budding`    | `#bef264` | Pale new leaf          |
| `springFoliage.tender`     | `#d9f99d` | Very pale              |

### Spring Sky

| Token            | Value     | Use             |
| ---------------- | --------- | --------------- |
| `springSky.clear` | `#7dd3fc` | Clear morning  |
| `springSky.soft`  | `#bae6fd` | Pale sky       |

### Wildflowers — unified meadow flower colors

| Token                      | Value     | Use                     |
| -------------------------- | --------- | ----------------------- |
| `wildflowers.buttercup`    | `#facc15` | Yellow                  |
| `wildflowers.daffodil`     | `#fde047` | Pale yellow             |
| `wildflowers.crocus`       | `#a78bfa` | Purple crocus           |
| `wildflowers.violet`       | `#8b5cf6` | Wild violets            |
| `wildflowers.purple`       | `#a855f7` | Lupine, thistle         |
| `wildflowers.lavender`     | `#c4b5fd` | Distant masses          |
| `wildflowers.tulipPink`    | `#f9a8d4` | Pink tulips             |
| `wildflowers.tulipRed`     | `#fb7185` | Red tulips              |
| `wildflowers.white`        | `#fefefe` | Daisies, trillium       |

### Cherry Blossoms — summer standard

| Token                       | Value     | Use              |
| --------------------------- | --------- | ---------------- |
| `cherryBlossoms.deep`       | `#db2777` | Dense centers    |
| `cherryBlossoms.standard`   | `#ec4899` | Standard blossom |
| `cherryBlossoms.light`      | `#f472b6` | Light petals     |
| `cherryBlossoms.pale`       | `#f9a8d4` | Pale blossoms    |
| `cherryBlossoms.falling`    | `#fbcfe8` | Falling petals   |

### Cherry Blossoms Peak — vibrant spring (one shade brighter)

| Token                          | Value     |
| ------------------------------ | --------- |
| `cherryBlossomsPeak.deep`      | `#ec4899` |
| `cherryBlossomsPeak.standard`  | `#f472b6` |
| `cherryBlossomsPeak.light`     | `#f9a8d4` |
| `cherryBlossomsPeak.pale`      | `#fbcfe8` |
| `cherryBlossomsPeak.falling`   | `#fce7f3` |

---

## Unified Flowers Palette

```typescript
import { flowers } from "@autumnsgrove/lattice/ui/nature";

// Use flowers.wildflower instead of accents.flower (deprecated)
flowers.wildflower.buttercup;  // #facc15 - Yellow
flowers.wildflower.crocus;     // #a78bfa - Purple crocus
flowers.wildflower.tulipPink;  // #f9a8d4 - Pink tulips

// Cherry blossoms
flowers.cherry.deep;           // #db2777
flowers.cherry.standard;      // #ec4899
flowers.cherry.light;         // #f472b6

// Cherry blossoms at peak bloom
flowers.cherryPeak.deep;      // #ec4899
flowers.cherryPeak.standard;  // #f472b6
```

---

## Autumn Palette

```typescript
import { autumn, autumnReds } from "@autumnsgrove/lattice/ui/nature";
```

### Autumn — warm fall foliage (dark-to-light for depth)

| Token            | Value     | Use                    |
| ---------------- | --------- | ---------------------- |
| `autumn.rust`    | `#9a3412` | Deep background        |
| `autumn.ember`   | `#c2410c` | Oak-like               |
| `autumn.pumpkin` | `#ea580c` | Maple mid-tones        |
| `autumn.amber`   | `#d97706` | Classic fall           |
| `autumn.gold`    | `#eab308` | Aspen/birch            |
| `autumn.honey`   | `#facc15` | Bright foreground      |
| `autumn.straw`   | `#fde047` | Pale dying leaves      |

### Autumn Reds — cherry/maple fall foliage

| Token               | Value     | Use           |
| ------------------- | --------- | ------------- |
| `autumnReds.crimson` | `#be123c` | Deep maple    |
| `autumnReds.scarlet` | `#e11d48` | Bright cherry |
| `autumnReds.rose`    | `#f43f5e` | Light autumn  |
| `autumnReds.coral`   | `#fb7185` | Pale accent   |

---

## Winter Palette

```typescript
import { winter } from "@autumnsgrove/lattice/ui/nature";

// Frost & snow
winter.snow
winter.frost
winter.ice
winter.glacier

// Frosted evergreens
winter.frostedPine
winter.winterGreen
winter.coldSpruce

// Sky
winter.winterSky
winter.twilight
winter.overcast

// Bare wood
winter.bareBranch
winter.frostedBark
winter.coldWood

// Layered hills (for depth in landscapes)
winter.hillDeep
winter.hillMid
winter.hillNear
winter.hillFront
```

---

## Midnight Bloom Palette

For **dreamy**, **far-future**, **mystical** content.

```typescript
import { midnightBloom } from "$lib/components/nature/palette";
```

| Token                    | Value     | Use               |
| ------------------------ | --------- | ----------------- |
| `midnightBloom.deepPlum`  | `#581c87` | Night sky depth   |
| `midnightBloom.purple`    | `#7c3aed` | Soft purple glow  |
| `midnightBloom.violet`    | `#8b5cf6` | Lighter accent    |
| `midnightBloom.amber`     | `#f59e0b` | Lantern warmth    |
| `midnightBloom.warmCream` | `#fef3c7` | Tea steam, page glow |
| `midnightBloom.softGold`  | `#fcd34d` | Fairy lights      |

---

## Accent Palettes

```typescript
import { accents } from "@autumnsgrove/lattice/ui/nature";
```

### Mushrooms — fairy tale pops of color

```typescript
accents.mushroom.redCap
accents.mushroom.orangeCap
accents.mushroom.brownCap
accents.mushroom.spots
accents.mushroom.gill
```

### Firefly — bioluminescence

```typescript
accents.firefly.glow
accents.firefly.warmGlow
accents.firefly.body
```

### Berry — rich saturated

```typescript
accents.berry.ripe
accents.berry.elderberry
accents.berry.red
```

### Water — cool blue spectrum

```typescript
accents.water.surface
accents.water.deep
accents.water.shallow
accents.water.lily
```

### Sky — time of day

```typescript
accents.sky.dayLight
accents.sky.dayMid
accents.sky.sunset
accents.sky.night
accents.sky.star
```

### Birds — species-specific colors

```typescript
accents.bird.cardinalRed
accents.bird.cardinalMask
accents.bird.cardinalBeak

accents.bird.chickadeeCap
accents.bird.chickadeeBody
accents.bird.chickadeeBelly

accents.bird.robinBody
accents.bird.robinBreast
accents.bird.robinBeak

accents.bird.bluebirdBody
accents.bird.bluebirdWing
accents.bird.bluebirdBreast
```

---

## Seasonal Helper Functions

```typescript
import {
  getSeasonalGreens,
  getCherryColors,
  isTreeBare,
  pickRandom,
  pickFrom,
} from "@autumnsgrove/lattice/ui/nature";

// Get foliage colors mapped to season
const foliage = getSeasonalGreens(season);
// spring → springFoliage colors
// summer → greens
// autumn → autumn palette
// winter → frosted evergreen colors

// Get cherry tree colors by season
const cherryColors = getCherryColors(season);
// spring → cherryBlossomsPeak (vibrant!)
// summer → cherryBlossoms (standard)
// autumn → autumnReds
// winter → null (bare tree)

// Check if deciduous tree is bare
if (isTreeBare("cherry", "winter")) {
  /* no foliage */
}

// Random color selection for natural variation
const randomGreen = pickRandom(greens);
const specificGreen = pickFrom(greens, ["grove", "meadow"]);
```

---

## Seasonal Background Gradients

```svelte
<main class="min-h-screen transition-colors duration-1000
  {isWinter ? 'bg-gradient-to-b from-slate-200 via-slate-100 to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-700' : ''}
  {isAutumn ? 'bg-gradient-to-b from-orange-100 via-amber-50 to-yellow-50 dark:from-slate-900 dark:via-amber-950 dark:to-orange-950' : ''}
  {isSpring ? 'bg-gradient-to-b from-pink-50 via-sky-50 to-lime-50 dark:from-slate-900 dark:via-pink-950 dark:to-lime-950' : ''}
  {/* Summer default */} 'bg-gradient-to-b from-sky-100 via-sky-50 to-emerald-50 dark:from-slate-900 dark:via-slate-800 dark:to-emerald-950'
">
```
