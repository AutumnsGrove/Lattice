---
title: "Gossamer — ASCII Visual Effects"
description: "A system of 2D ASCII visual effects for Grove's Glass UI, providing warmth and whimsy through character-based ambient backgrounds and image transformations."
category: specs
specCategory: "reference"
icon: filecode
lastUpdated: "2026-01-22"
aliases: []
date created: Tuesday, January 14th 2026
date modified: Tuesday, January 14th 2026
tags:
  - visual-effects
  - ui-components
  - canvas
  - decorative
type: tech-spec
---

# Gossamer — ASCII Visual Effects

```
                 ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
              ·                                   ·
           ·    · - - - · - - - · - - - · - - ·     ·
        ·      /                               \      ·
           ·  ·    delicate      threads        ·  ·
        ·    /        catching                    \    ·
           ·          the dawn                      ·
        ·    \                                    /    ·
           ·  · - - - · - - - · - - - · - - - ·  ·
              ·                                   ·
                 ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·

                      ╭─────────────╮
                      │  threads of │
                      │    light    │
                      ╰─────────────╯
```

> *Threads of light.*

A system of 2D ASCII visual effects for Grove's Glass UI. Gossamer brings warmth and whimsy through character-based visuals: floating clouds, gentle patterns, ambient backgrounds, and image transformations. Simple, charming, performant.

**Public Name:** Gossamer
**Internal Name:** GroveGossamer
**NPM Package:** `gossamer` (core) + `@gossamer/svelte`, `@gossamer/react`, etc.
**Repository:** `github.com/AutumnsGrove/Gossamer`
**Icon:** `SprayCan` (Lucide)
**Version:** 1.0 Draft
**Last Updated:** January 2026

Walk through the grove at dawn. Spider silk stretches between branches, nearly invisible until the light finds it. Delicate threads catching dew, glittering for a moment, then vanishing into the green. That's what Gossamer brings to interfaces: barely-there textures, character-based patterns that feel handmade, ASCII threads that weave atmosphere into your space.

Gossamer is an **open source project** published to NPM. While born in the Grove ecosystem, it's framework-agnostic at its core, with adapters for Svelte, React, and Vue. The core is intentionally 2D and Canvas-based—no 3D libraries, no heavy dependencies. Just `<canvas>`, characters, and a little math. V2 might venture into Three.js/Threlte territory, but v1 is about nailing the fundamentals.

---

## Table of Contents

1. [Overview](#overview)
2. [Core Concepts](#core-concepts)
3. [Effect Types](#effect-types)
4. [Component Architecture](#component-architecture)
5. [API Design](#api-design)
6. [Implementation Details](#implementation-details)
7. [Integration Points](#integration-points)
8. [Performance](#performance)
9. [Accessibility](#accessibility)
10. [Implementation Checklist](#implementation-checklist)

---

## Overview

### The Vision

ASCII art effects that feel like they belong in Grove:
- **Warm, not cold** — soft characters, gentle animations
- **Whimsical, not sterile** — organic patterns, not grids
- **Performant, not heavy** — 2D Canvas, not WebGL (for now)
- **Extensible, not locked** — build once, use everywhere

### Why ASCII?

| Benefit | Explanation |
|---------|-------------|
| **Renders fast** | No images to load, just characters on canvas |
| **Scales perfectly** | Characters are resolution-independent |
| **Feels handmade** | ASCII has an inherent warmth, a lo-fi charm |
| **No design work** | Character sets already exist—just choose wisely |
| **Unique aesthetic** | Stands out from the React gradient blur blob crowd |

### Inspiration Sources

- [caidan.dev ASCII Clouds](https://caidan.dev/portfolio/ascii_clouds/) — 2D canvas patterns
- [emilwidlund/ASCII](https://github.com/emilwidlund/ASCII) — GPU-based Three.js effect
- [isladjan/ascii](https://github.com/isladjan/ascii) — Performance-optimized implementation
- [louisescher/at-scii](https://github.com/louisescher/at-scii) — Colored ASCII with gradients
- [TresJS ASCII Post-Processing](https://post-processing.tresjs.org/guide/pmndrs/ascii) — Vue/Three.js integration

---

## Core Concepts

### Brightness-to-Character Mapping

The fundamental algorithm: convert visual data to ASCII by mapping brightness values to character density.

```
Brightness:  ████████░░░░░░░░   →   Character:  @
Brightness:  ████████████░░░░   →   Character:  #
Brightness:  ████████████████   →   Character:  .
Brightness:  ░░░░░░░░░░░░░░░░   →   Character:   (space)
```

**Standard character sets (light → dark):**

| Name | Characters | Best For |
|------|------------|----------|
| **Standard** | ` .:-+*=%@#` | General purpose |
| **Dense** | ` .',:;clodxkO0KXNWM` | High detail |
| **Minimal** | ` .:*#` | Clean, simple |
| **Grove** | ` ·∙•◦○◉●` | Organic, soft |
| **Nature** | ` .~≈∿⌇☘🌿` | Decorative, themed |

### Brightness Calculation

Human eyes perceive green more than red, and red more than blue. The weighted formula:

```typescript
const brightness = 0.21 * r + 0.72 * g + 0.07 * b;
```

### Cell-Based Rendering

Instead of per-pixel, we sample in cells for performance:

```
┌───┬───┬───┬───┬───┐
│ @ │ # │ 8 │ % │ & │  ← Each cell = average brightness
├───┼───┼───┼───┼───┤     of its pixel region
│ W │ M │ # │ * │ o │
├───┼───┼───┼───┼───┤
│ a │ h │ k │ b │ d │
└───┴───┴───┴───┴───┘
    Cell size: 8px
```

---

## Effect Types

### 1. Ambient Backgrounds (`<GossamerClouds>`)

Floating, organic patterns for backgrounds. Think: clouds drifting, fog rolling, static that breathes.

```
     .  ·  .    ·    .  ·  .    ·    .  ·  .
  ·    .  : +    *    . : -  ·    .  : +    ·
     ·  .    ·  .  ·  .    ·  .  ·  .    ·
  .    ·    .  : +    *    . : -  ·    .    .
     ·  .    ·    .  ·  .    ·    .  ·  .
```

**Use cases:**
- Glass UI card backgrounds
- Hero section ambiance
- Loading state texture
- Empty state backgrounds

**Props:**
```typescript
interface GossamerCloudProps {
  // Pattern generation
  pattern?: 'perlin' | 'simplex' | 'waves' | 'static';
  frequency?: number;          // Pattern scale (default: 0.05)
  amplitude?: number;          // Pattern intensity (default: 1.0)

  // Appearance
  characters?: string;         // Character set (default: ' .:-+*')
  color?: string;              // Character color (default: 'currentColor')
  opacity?: number;            // Overall opacity (default: 0.3)

  // Animation
  animated?: boolean;          // Enable animation (default: true)
  speed?: number;              // Animation speed (default: 0.5)

  // Performance
  cellSize?: number;           // Grid cell size (default: 12)
  fps?: number;                // Frame rate cap (default: 30)
}
```

### 2. Image Transformation (`<GossamerImage>`)

Convert images to ASCII art representations.

```
Original:                    ASCII:
┌──────────────┐            ┌──────────────┐
│   [photo]    │     →      │ @@@###%%%... │
│              │            │ ###***+++::: │
│              │            │ ***+++:::... │
└──────────────┘            └──────────────┘
```

**Use cases:**
- Avatar hover effects
- Image galleries with ASCII previews
- Print-friendly image representations
- Artistic transformations

**Props:**
```typescript
interface GossamerImageProps {
  src: string;                 // Image source
  alt: string;                 // Alt text (required for a11y)

  // Rendering
  characters?: string;         // Character set
  cellSize?: number;           // Detail level (smaller = more detail)
  color?: string | boolean;    // Mono color or preserve image colors
  invert?: boolean;            // Flip brightness mapping

  // Display
  width?: number;              // Output width
  height?: number;             // Output height
  preserveAspectRatio?: boolean;

  // Interaction
  showOriginalOnHover?: boolean;  // Reveal image on hover
  transitionDuration?: number;    // Fade duration (ms)
}
```

### 3. Text Effects (`<GossamerText>`)

Apply ASCII-style rendering to text elements.

```
Normal:     GROVE

Gossamer:      ▓▓▓▓  ▓▓▓▓  ▓▓▓▓  ▓   ▓  ▓▓▓▓
            ▓     ▓   ▓ ▓  ▓  ▓   ▓  ▓
            ▓ ▓▓  ▓▓▓▓  ▓  ▓  ▓   ▓  ▓▓▓
            ▓   ▓ ▓  ▓  ▓  ▓  ▓   ▓  ▓
            ▓▓▓▓  ▓   ▓ ▓▓▓▓   ▓▓▓   ▓▓▓▓
```

**Use cases:**
- Hero titles
- Section headers
- Decorative typography
- ASCII art generation

### 4. Overlay Effects (`<GossamerOverlay>`)

Composite ASCII effects over existing content.

```
┌─────────────────────────────────────┐
│                                     │
│    Your existing content here       │
│                                     │
│    ·  .  ·    ·  .  ·    ·  .  ·    │  ← Gossamer overlay
│    ·  .  ·    ·  .  ·    ·  .  ·    │     (semi-transparent)
│    ·  .  ·    ·  .  ·    ·  .  ·    │
│                                     │
└─────────────────────────────────────┘
```

**Props:**
```typescript
interface GossamerOverlayProps {
  // Blend mode
  blendMode?: 'overlay' | 'multiply' | 'screen' | 'soft-light';

  // Masking
  maskSource?: 'content' | 'custom';
  maskElement?: HTMLElement;

  // Appearance
  characters?: string;
  color?: string;
  opacity?: number;

  // Animation
  animated?: boolean;
  pattern?: string;
}
```

### 5. Border & Frame Effects (`<GossamerBorder>`)

ASCII-styled borders and frames for containers.

```
╭·············································╮
·                                             ·
·     Content inside an ASCII border          ·
·                                             ·
╰·············································╯
```

**Border styles:**
```
Simple:     ·····        Dots:      . . . .
            ·   ·                   .     .
            ·····                   . . . .

Dashed:     - - - -      Stars:     * * * *
            |     |                 *     *
            - - - -                 * * * *
```

---

## Component Architecture

### External Monorepo Structure

Gossamer is an **open source monorepo** with framework-agnostic core and framework adapters:

```
github.com/AutumnsGrove/Gossamer/
├── packages/
│   ├── core/                      # gossamer (vanilla JS)
│   │   ├── src/
│   │   │   ├── renderer.ts        # Core canvas rendering
│   │   │   ├── brightness.ts      # Brightness calculations
│   │   │   ├── patterns.ts        # Pattern generators (perlin, waves, etc.)
│   │   │   ├── characters.ts      # Character set definitions
│   │   │   ├── animation.ts       # Animation loop management
│   │   │   ├── utils/
│   │   │   │   ├── canvas.ts      # Canvas utilities
│   │   │   │   ├── image.ts       # Image loading/processing
│   │   │   │   └── performance.ts # FPS limiting, throttling
│   │   │   └── presets/
│   │   │       ├── default.ts     # Standard presets
│   │   │       └── seasonal.ts    # Seasonal variations
│   │   └── package.json           # "gossamer"
│   │
│   ├── svelte/                    # @gossamer/svelte
│   │   ├── src/
│   │   │   ├── Gossamer.svelte
│   │   │   ├── GossamerClouds.svelte
│   │   │   ├── GossamerImage.svelte
│   │   │   ├── GossamerText.svelte
│   │   │   ├── GossamerOverlay.svelte
│   │   │   └── GossamerBorder.svelte
│   │   └── package.json           # "@gossamer/svelte"
│   │
│   ├── react/                     # @gossamer/react (future)
│   │   └── ...
│   │
│   └── vue/                       # @gossamer/vue (future)
│       └── ...
│
├── examples/
│   ├── vanilla/                   # Plain HTML/JS examples
│   ├── svelte-kit/                # SvelteKit integration
│   └── next-js/                   # Next.js integration (future)
│
├── docs/                          # Documentation site
│   └── ...
│
├── README.md
├── LICENSE                        # MIT
└── pnpm-workspace.yaml
```

### NPM Packages

| Package | Description | Status |
|---------|-------------|--------|
| `gossamer` | Core vanilla JS library | v1.0 |
| `@gossamer/svelte` | Svelte component wrappers | v1.0 |
| `@gossamer/react` | React component wrappers | Planned |
| `@gossamer/vue` | Vue component wrappers | Planned |

### Grove Integration

Grove uses `@gossamer/svelte` as a dependency in `packages/engine`:

```json
// packages/engine/package.json
{
  "dependencies": {
    "@gossamer/svelte": "^1.0.0"
  }
}
```

Re-exported from the engine for convenience:

```typescript
// packages/engine/src/lib/ui/components/gossamer/index.ts
export * from '@gossamer/svelte';
export { grovePresets } from './grove-presets';  // Grove-specific presets
```

### Component Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│                        <Gossamer>                               │
│  Base container with shared context (character sets, config)    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ GossamerClouds │  │ GossamerImage  │  │ GossamerText   │  ...         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
│         │                │                │                     │
│         └────────────────┼────────────────┘                     │
│                          ▼                                      │
│              ┌───────────────────────┐                          │
│              │    core/renderer.ts   │                          │
│              │   (shared rendering)  │                          │
│              └───────────────────────┘                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## API Design

### Basic Usage

```svelte
<script>
  import { GossamerClouds, GossamerImage } from '$lib/ui/components/gossamer';
</script>

<!-- Ambient background -->
<GossamerClouds
  pattern="perlin"
  characters=" ·∙•"
  color="var(--grove-green)"
  opacity={0.15}
/>

<!-- Image transformation -->
<GossamerImage
  src="/avatar.jpg"
  alt="User avatar"
  cellSize={4}
  showOriginalOnHover
/>
```

### With Glass UI

```svelte
<script>
  import { GlassCard } from '$lib/ui/components/ui';
  import { GossamerClouds } from '$lib/ui/components/gossamer';
</script>

<GlassCard variant="frosted">
  <GossamerClouds
    slot="background"
    pattern="waves"
    opacity={0.1}
    animated
  />

  <h2>Card Title</h2>
  <p>Card content with subtle ASCII background</p>
</GlassCard>
```

### Preset System

```svelte
<script>
  import { GossamerClouds, presets } from '$lib/ui/components/gossamer';
</script>

<!-- Using a preset -->
<GossamerClouds preset="grove-mist" />
<GossamerClouds preset="winter-snow" />
<GossamerClouds preset="autumn-leaves" />

<!-- Presets with overrides -->
<GossamerClouds
  preset="grove-mist"
  speed={0.3}
  opacity={0.2}
/>
```

### Available Presets

| Preset | Description | Characters | Animation |
|--------|-------------|------------|-----------|
| `grove-mist` | Soft fog effect | `·∙•◦` | Slow drift |
| `grove-fireflies` | Twinkling points | `·*✦✧` | Random flicker |
| `grove-rain` | Gentle rain lines | `│\|/` | Downward flow |
| `winter-snow` | Falling snow | `·∙*❄` | Drift + fall |
| `autumn-leaves` | Scattered leaves | `🍂·∙` | Tumble |
| `spring-petals` | Floating petals | `·✿❀` | Float + spin |
| `summer-heat` | Heat shimmer | `~≈∿` | Wave distortion |

---

## Implementation Details

### Core Renderer

```typescript
// core/renderer.ts

export interface RenderConfig {
  canvas: HTMLCanvasElement;
  characters: string;
  cellSize: number;
  color: string;
  brightness: (r: number, g: number, b: number) => number;
}

export class GossamerRenderer {
  private ctx: CanvasRenderingContext2D;
  private config: RenderConfig;
  private animationId: number | null = null;

  constructor(canvas: HTMLCanvasElement, config: Partial<RenderConfig>) {
    this.ctx = canvas.getContext('2d')!;
    this.config = {
      canvas,
      characters: ' .:-+*=%@#',
      cellSize: 8,
      color: '#22c55e',
      brightness: (r, g, b) => 0.21 * r + 0.72 * g + 0.07 * b,
      ...config
    };
  }

  // Render a single frame from image data
  renderFrame(imageData: ImageData): void {
    const { canvas, characters, cellSize, color } = this.config;
    const { width, height, data } = imageData;

    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.ctx.fillStyle = color;
    this.ctx.font = `${cellSize}px monospace`;
    this.ctx.textBaseline = 'top';

    for (let y = 0; y < height; y += cellSize) {
      for (let x = 0; x < width; x += cellSize) {
        const brightness = this.getCellBrightness(data, x, y, width, cellSize);
        const charIndex = Math.floor(brightness * characters.length / 255);
        const char = characters[Math.min(charIndex, characters.length - 1)];

        this.ctx.fillText(char, x, y);
      }
    }
  }

  private getCellBrightness(
    data: Uint8ClampedArray,
    x: number, y: number,
    width: number, cellSize: number
  ): number {
    let total = 0;
    let count = 0;

    for (let cy = 0; cy < cellSize; cy++) {
      for (let cx = 0; cx < cellSize; cx++) {
        const px = ((y + cy) * width + (x + cx)) * 4;
        if (px < data.length) {
          total += this.config.brightness(data[px], data[px + 1], data[px + 2]);
          count++;
        }
      }
    }

    return count > 0 ? total / count : 0;
  }

  // Animation loop
  startAnimation(updateFn: (time: number) => ImageData, fps: number = 30): void {
    const interval = 1000 / fps;
    let lastTime = 0;

    const animate = (time: number) => {
      if (time - lastTime >= interval) {
        const imageData = updateFn(time);
        this.renderFrame(imageData);
        lastTime = time;
      }
      this.animationId = requestAnimationFrame(animate);
    };

    this.animationId = requestAnimationFrame(animate);
  }

  stopAnimation(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  destroy(): void {
    this.stopAnimation();
  }
}
```

### Pattern Generation

```typescript
// core/patterns.ts

// Simple Perlin-like noise for organic patterns
export function perlinNoise2D(x: number, y: number, frequency: number): number {
  const xi = Math.floor(x * frequency);
  const yi = Math.floor(y * frequency);
  const xf = (x * frequency) - xi;
  const yf = (y * frequency) - yi;

  // Gradient vectors at corners
  const n00 = dotGridGradient(xi, yi, x * frequency, y * frequency);
  const n10 = dotGridGradient(xi + 1, yi, x * frequency, y * frequency);
  const n01 = dotGridGradient(xi, yi + 1, x * frequency, y * frequency);
  const n11 = dotGridGradient(xi + 1, yi + 1, x * frequency, y * frequency);

  // Interpolate
  const fadeX = fade(xf);
  const fadeY = fade(yf);

  const nx0 = lerp(n00, n10, fadeX);
  const nx1 = lerp(n01, n11, fadeX);

  return lerp(nx0, nx1, fadeY);
}

// Wave pattern
export function wavePattern(
  x: number, y: number,
  time: number,
  config: { frequency: number; amplitude: number; speed: number }
): number {
  const { frequency, amplitude, speed } = config;
  return Math.sin(x * frequency + time * speed) *
         Math.cos(y * frequency + time * speed * 0.7) *
         amplitude;
}

// Generate pattern image data
export function generatePatternData(
  width: number, height: number,
  pattern: 'perlin' | 'waves' | 'static',
  time: number = 0,
  config: PatternConfig
): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let value: number;

      switch (pattern) {
        case 'perlin':
          value = perlinNoise2D(x + time * config.speed, y, config.frequency);
          break;
        case 'waves':
          value = wavePattern(x, y, time, config);
          break;
        case 'static':
        default:
          value = Math.random();
      }

      // Normalize to 0-255
      const brightness = Math.floor((value + 1) * 0.5 * 255 * config.amplitude);
      const clamped = Math.max(0, Math.min(255, brightness));

      const i = (y * width + x) * 4;
      data[i] = clamped;     // R
      data[i + 1] = clamped; // G
      data[i + 2] = clamped; // B
      data[i + 3] = 255;     // A
    }
  }

  return new ImageData(data, width, height);
}
```

### Svelte Component Example

```svelte
<!-- GossamerClouds.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { GossamerRenderer } from './core/renderer';
  import { generatePatternData } from './core/patterns';
  import type { PatternConfig } from './core/patterns';

  // Props
  export let pattern: 'perlin' | 'waves' | 'static' = 'perlin';
  export let characters: string = ' ·∙•◦';
  export let color: string = 'currentColor';
  export let opacity: number = 0.3;
  export let animated: boolean = true;
  export let speed: number = 0.5;
  export let frequency: number = 0.05;
  export let amplitude: number = 1.0;
  export let cellSize: number = 12;
  export let fps: number = 30;

  let canvas: HTMLCanvasElement;
  let renderer: GossamerRenderer;
  let width = 0;
  let height = 0;

  onMount(() => {
    const resizeObserver = new ResizeObserver(entries => {
      const entry = entries[0];
      width = entry.contentRect.width;
      height = entry.contentRect.height;
      canvas.width = width;
      canvas.height = height;

      if (renderer) {
        renderer.destroy();
      }

      renderer = new GossamerRenderer(canvas, { characters, cellSize, color });

      if (animated) {
        const config: PatternConfig = { frequency, amplitude, speed };
        renderer.startAnimation(
          (time) => generatePatternData(width, height, pattern, time * 0.001, config),
          fps
        );
      } else {
        const config: PatternConfig = { frequency, amplitude, speed: 0 };
        const imageData = generatePatternData(width, height, pattern, 0, config);
        renderer.renderFrame(imageData);
      }
    });

    resizeObserver.observe(canvas.parentElement!);

    return () => {
      resizeObserver.disconnect();
      renderer?.destroy();
    };
  });

  onDestroy(() => {
    renderer?.destroy();
  });
</script>

<canvas
  bind:this={canvas}
  class="gossamer-clouds"
  style:opacity
  aria-hidden="true"
/>

<style>
  .gossamer-clouds {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 0;
  }
</style>
```

---

## Integration Points

### Where Gossamer Can Be Used

```
┌─────────────────────────────────────────────────────────────────┐
│                     Grove Ecosystem                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐        │
│  │  TERRARIUM  │     │    WEAVE    │     │   ENGINE    │        │
│  │             │     │             │     │             │        │
│  │ Scene tool  │     │ Composition │     │ Core blog   │        │
│  │ backgrounds │     │ node editor │     │ components  │        │
│  │ Asset viz   │     │ Preview bg  │     │ Glass cards │        │
│  └─────────────┘     └─────────────┘     └─────────────┘        │
│         │                   │                   │               │
│         └───────────────────┼───────────────────┘               │
│                             ▼                                   │
│                   ┌───────────────────┐                         │
│                   │     GOSSAMER      │                         │
│                   │  ASCII Effects    │                         │
│                   └───────────────────┘                         │
│                             │                                   │
│         ┌───────────────────┼───────────────────┐               │
│         ▼                   ▼                   ▼               │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐        │
│  │    REEDS    │     │    ARBOR    │     │   LANDING   │        │
│  │             │     │             │     │             │        │
│  │ Comment     │     │ Admin       │     │ Hero        │        │
│  │ backgrounds │     │ dashboards  │     │ backgrounds │        │
│  └─────────────┘     └─────────────┘     └─────────────┘        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Glass UI Integration

Gossamer components have first-class Glass UI support:

```svelte
<!-- Glass card with Gossamer background -->
<GlassCard variant="frosted" class="relative overflow-hidden">
  <GossamerClouds
    slot="background"
    preset="grove-mist"
    class="absolute inset-0"
  />
  <div class="relative z-10">
    Content here
  </div>
</GlassCard>
```

### Terrarium Integration

For the scene builder, Gossamer provides:

```svelte
<!-- Terrarium scene with ASCII atmosphere -->
<Terrarium>
  <GossamerOverlay
    slot="atmosphere"
    pattern="perlin"
    opacity={0.05}
    blendMode="soft-light"
  />

  <!-- Scene elements go here -->
</Terrarium>
```

---

## Performance

### Guidelines

| Factor | Recommendation |
|--------|----------------|
| **Cell size** | 8-16px for backgrounds, 4-8px for images |
| **FPS** | 30fps max for ambient, 60fps for interactive |
| **Canvas size** | Match container, avoid upscaling |
| **Animation** | Pause when not visible (Intersection Observer) |

### Visibility-Based Animation

```typescript
// utils/performance.ts

export function createVisibilityObserver(
  element: HTMLElement,
  onVisible: () => void,
  onHidden: () => void
): IntersectionObserver {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          onVisible();
        } else {
          onHidden();
        }
      });
    },
    { threshold: 0.1 }
  );

  observer.observe(element);
  return observer;
}
```

### Memory Management

- Destroy renderers when components unmount
- Reuse ImageData buffers when possible
- Throttle resize handlers
- Use `will-change: transform` for composited layers

---

## Accessibility

### Requirements

| Requirement | Implementation |
|-------------|----------------|
| **Decorative only** | `aria-hidden="true"` on all canvas elements |
| **Reduced motion** | Respect `prefers-reduced-motion` |
| **No information** | Never convey meaning through Gossamer alone |
| **Focus visible** | Gossamer never obscures focus indicators |

### Reduced Motion Support

```svelte
<script>
  import { browser } from '$app/environment';

  let prefersReducedMotion = false;

  if (browser) {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    prefersReducedMotion = mediaQuery.matches;
    mediaQuery.addEventListener('change', (e) => {
      prefersReducedMotion = e.matches;
    });
  }
</script>

<GossamerClouds
  animated={!prefersReducedMotion}
  {...$$props}
/>
```

---

## Implementation Checklist

### Phase M1: Core Foundation
- [ ] Create component directory structure
- [ ] Implement `GossamerRenderer` class
- [ ] Implement brightness calculation utilities
- [ ] Implement basic pattern generators (perlin, waves, static)
- [ ] Create character set definitions
- [ ] Add FPS limiting and animation loop

### Phase M2: Primary Components
- [ ] Build `GossamerClouds.svelte` with all props
- [ ] Build `GossamerImage.svelte` with image loading
- [ ] Implement resize handling with ResizeObserver
- [ ] Add visibility-based animation pause
- [ ] Create preset system and initial presets

### Phase M3: Extended Components
- [ ] Build `GossamerText.svelte` for text effects
- [ ] Build `GossamerOverlay.svelte` for compositing
- [ ] Build `GossamerBorder.svelte` for ASCII borders
- [ ] Add blend mode support

### Phase M4: Integration
- [ ] Create Glass UI integration helpers
- [ ] Add slot support for GlassCard backgrounds
- [ ] Build Terrarium integration example
- [ ] Create seasonal preset variants
- [ ] Add to engine component exports

### Phase M5: Polish & Documentation
- [ ] Accessibility audit (aria-hidden, reduced motion)
- [ ] Performance profiling and optimization
- [ ] Create usage documentation
- [ ] Build interactive demo/playground
- [ ] Add TypeScript types to exports

### Phase M6: Future (v2)
- [ ] Research Threlte/Three.js integration
- [ ] Explore WebGL shader-based rendering
- [ ] Add 3D ASCII post-processing effects
- [ ] Investigate video source support

---

## Proof of Concept Ideas

### POC 1: Static Cloud Background
Simplest implementation to validate the approach:
- Single canvas with perlin noise
- No animation
- Hardcoded character set
- Drop into Glass card as background

### POC 2: Animated Mist
Add animation loop:
- Time-based pattern offset
- FPS limiting
- Reduced motion support

### POC 3: Image to ASCII
Prove the image transformation:
- Load image to hidden canvas
- Extract pixel data
- Render as ASCII
- Hover to reveal original

---

## References

- [ASCII Art with Canvas and JavaScript](https://thecodeplayer.com/walkthrough/cool-ascii-animation-using-an-image-sprite-canvas-and-javascript)
- [Convert Image to ASCII Art](https://marmelab.com/blog/2018/02/20/convert-image-to-ascii-art-masterpiece.html)
- [MDN Canvas Pixel Manipulation](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Pixel_manipulation_with_canvas)
- [Threlte ASCII Renderer](https://threlte.xyz/docs/reference/extras/ascii-renderer)
- [Declarative Canvas with Svelte](https://www.thisdot.co/blog/declarative-canvas-with-svelte)

---

*Created: January 2026*
*Status: Specification Draft*
*Next: POC implementation*
