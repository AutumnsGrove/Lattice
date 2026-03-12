---
title: "Gossamer Developer Guide"
description: "How to add presets, tune performance, and work with the ASCII effects library that powers Grove's glassmorphism overlays."
category: guides
guideCategory: design
lastUpdated: "2026-03-12"
aliases: []
tags:
  - gossamer
  - ascii-art
  - effects
---

# Gossamer Developer Guide

Gossamer renders ASCII characters onto `<canvas>` elements to create ambient textures for Glass UI. Soft fog, twinkling fireflies, falling rain, heat shimmer. The library is framework-agnostic at its core, with Svelte 5 components as the primary integration layer. Everything happens in 2D, with no WebGL dependencies.

The library lives at `libs/gossamer/` and publishes as `@autumnsgrove/gossamer` with two export paths: `"."` for the core engine and `"./svelte"` for Svelte components. Build it with `svelte-package -i src -o dist`.

## How It Works

Gossamer's rendering pipeline has three stages: generate brightness values, map them to characters, draw characters onto canvas.

**Stage 1: Pattern generation.** A pattern function (Perlin noise, domain warp, waves, etc.) produces a value between -1 and 1 for each cell in the grid. The grid dimensions come from dividing the canvas size by the cell dimensions. Sparsity bias can push more cells toward zero, creating a dreamy, atmospheric feel where most of the canvas is empty space.

**Stage 2: Normalization.** Raw pattern values get normalized to 0-255 brightness integers. Without sparsity, the formula is `(value + 1) * 0.5 * amplitude * 255`. With sparsity, values below a threshold get clamped to zero, and everything above the threshold gets rescaled into the remaining range.

**Stage 3: Rendering.** The `GossamerRenderer` class takes the brightness grid and draws one ASCII character per cell. Each brightness value maps to a character in the set (ordered light to dark, always starting with a space). The renderer skips space characters entirely, so empty cells cost nothing. When `alphaByBrightness` is enabled, brighter characters also get higher opacity, creating a sense of depth.

### The Character Atlas

The renderer pre-renders all characters into an offscreen canvas (the "character atlas") at initialization. During animation, it uses `drawImage` to stamp characters from the atlas instead of calling `fillText` per cell. This is 5-10x faster for large canvases. The atlas rebuilds automatically when you change the character set, color, cell size, or font family.

### Font-Metric Cell Width

Monospace fonts have a width-to-height ratio of roughly 0.6:1. If you use the same pixel value for both `cellWidth` and `cellHeight`, characters look horizontally stretched. `GossamerClouds.svelte` solves this by measuring the actual width of an "M" character with `ctx.measureText()` on mount, then using that measured value as `cellWidth`. The `cellHeight` comes from the `cellSize` prop. Other components (GossamerOverlay, GossamerBorder) use square cells by default, so they look slightly different.

## Adding a New Preset

Presets live in `libs/gossamer/src/svelte/presets.ts`, organized into three categories: grove, seasonal, and ambient. All presets get merged into the `PRESETS` record for lookup.

To add a preset:

1. Pick a category (`grovePresets`, `seasonalPresets`, or `ambientPresets`).
2. Add an entry with a kebab-case key.
3. Fill in the `PresetConfig` fields.

```typescript
// In libs/gossamer/src/svelte/presets.ts
"grove-canopy": {
    name: "Grove Canopy",
    description: "Dappled light through leaves",
    characters: " ·.:*",
    pattern: "clouds",
    frequency: 0.04,
    amplitude: 1.0,
    speed: 0.2,
    opacity: 0.18,
    sparsity: 0.5,
    alphaByBrightness: 0.4,
},
```

The key fields to tune:

| Field | What it does | Typical range |
|---|---|---|
| `pattern` | Which noise function generates the grid | `"domain-warp"` for organic, `"static"` for sparkle, `"matrix"` for rain |
| `frequency` | Scale of the pattern. Lower = larger shapes. | 0.01 to 0.1 |
| `speed` | How fast the pattern animates | 0.1 (barely moving) to 0.6 (lively) |
| `sparsity` | How much empty space. 0.0 = full coverage, 1.0 = all empty. | 0.3 to 0.85 |
| `alphaByBrightness` | Whether brighter characters fade in more | 0.3 to 0.7 |
| `opacity` | CSS opacity on the container | 0.12 to 0.3 |

After adding the preset, you must also update the `GossamerPreset` type in three files (see "The GossamerPreset Duplication Problem" below).

## Using Gossamer in Svelte

The most common component is `GossamerClouds`. Drop it inside any positioned container:

```svelte
<script>
    import { GossamerClouds } from "@autumnsgrove/gossamer/svelte";
</script>

<div class="relative overflow-hidden">
    <GossamerClouds preset="grove-mist" />
    <div class="relative z-10">Your content here</div>
</div>
```

All five Svelte components share the same lifecycle pattern: they observe visibility with `IntersectionObserver`, watch for resizes with `ResizeObserver` (debounced at 100ms), and listen for `prefers-reduced-motion` changes. When the element scrolls out of view, animation stops. When it returns, animation resumes.

### Component Reference

| Component | Purpose | Key props |
|---|---|---|
| `GossamerClouds` | Ambient background patterns | `preset`, `pattern`, `sparsity`, `alphaByBrightness` |
| `GossamerOverlay` | Composite effect over content | `blendMode` (CSS mix-blend-mode), `pattern` |
| `GossamerImage` | Convert images to ASCII art | `src`, `alt`, `color` ("preserve" keeps original colors), `showOriginalOnHover` |
| `GossamerText` | Noise-animated text rendering | `text`, `fontSize`, `intensity` |
| `GossamerBorder` | ASCII-character borders | `style` ("simple", "double", "dots", "dashes", "stars", "corners") |

### Preset Overrides

Props on the component override preset values. The `color` prop is special: it always comes from the component prop, never from the preset. So you can use a preset for its pattern settings while controlling color separately:

```svelte
<GossamerClouds preset="grove-mist" color="var(--bark-500)" />
```

## The Dual Render Paths

Gossamer has two parallel APIs for generating brightness data. Both must stay in sync when you change pattern generation logic.

**Legacy path: `generateBrightnessGrid`** returns a `number[][]` (2D array). Each inner array is a row of brightness values. The renderer consumes this via `renderFromBrightnessGrid()` or the faster atlas-based `renderGridFast()`.

**Performance path: `fillBrightnessBuffer`** writes into a pre-allocated `Uint8Array` (flat, row-major). You create the buffer once with `createBrightnessBuffer(cols, rows)`, then call `fillBrightnessBuffer()` on every frame. The renderer consumes this via `renderFromBuffer()`, which uses the character atlas. This path avoids all GC pressure from array allocation and is roughly 30% faster than the grid path.

Both functions contain the same switch statement over all 13 pattern types. If you add a new pattern, you need to add a case in both `generateBrightnessGrid` (around line 547 in `patterns.ts`) and `fillBrightnessBuffer` (around line 744). The sparsity normalization logic is also duplicated between the two paths. There is a test (`"should match behavior between grid and buffer APIs"`) that verifies they produce the same output, allowing for a +/-1 difference from rounding (Math.floor vs bitwise OR).

The Svelte components currently use the grid path (`generateBrightnessGrid` with `renderFromBrightnessGrid`). Switching a component to the buffer path for better animation performance is straightforward:

```typescript
// In your component's script
import { createBrightnessBuffer, fillBrightnessBuffer } from "../index";

let buffer: BrightnessBuffer | null = null;

function animate(currentTime: number): void {
    if (!renderer) return;
    const { cols, rows } = renderer.getCellCount();

    // Create or resize buffer
    if (!buffer || buffer.cols !== cols || buffer.rows !== rows) {
        buffer = createBrightnessBuffer(cols, rows);
    }

    fillBrightnessBuffer(buffer, config.pattern, elapsed, patternConfig);
    renderer.renderFromBuffer(buffer);
    animationId = requestAnimationFrame(animate);
}
```

## Pattern Types

Gossamer ships 13 pattern generators. Each returns a value between -1 and 1.

| Pattern | Function | Character |
|---|---|---|
| `perlin` | Classic 2D Perlin noise | Organic, flowing |
| `fbm` | Fractal Brownian Motion (layered Perlin) | More detailed organic noise |
| `clouds` | Soft fBm with 5 octaves and secondary drift | Billowy, puffy |
| `domain-warp` | Noise fed into noise (Inigo Quilez technique) | Dramatically organic, atmospheric |
| `waves` | Three layered sine/cosine functions | Rhythmic, predictable |
| `ripple` | Concentric rings from center point | Radial, pond-like |
| `plasma` | Classic demoscene sine combination with swirl | Psychedelic, retro |
| `vortex` | Spiral with Perlin turbulence | Swirling, dynamic |
| `matrix` | Falling columns with trail fade | Digital rain |
| `gradient` | Rotating linear gradient with wave distortion | Smooth, minimal |
| `diamond` | Manhattan-distance interference | Geometric, crystalline |
| `fractal` | Animated Julia set | Mathematical, complex |
| `static` | Seeded pseudorandom noise | Grainy, TV static |

The `domain-warp` pattern is the most computationally expensive (it calls `fbmNoise` five times per cell). The `grove-mist` preset uses it because the organic shapes are worth the cost at low frequency and slow speed. If performance is a concern, `clouds` or `fbm` produce similar results with fewer calculations.

## Character Sets

The `characters.ts` file defines 19 named character sets in the `CHARACTER_SETS` record. Seven of them are glass-optimized (prefixed with `glass-`), designed for subtle overlays.

Key rules for character sets:
- Must start with a space (the space represents empty/zero brightness).
- Must have at least 2 characters.
- Characters are ordered from lightest to darkest.
- More characters = more visible gradations in the output.

You can use named sets, custom strings, or the helper functions:

```typescript
import { getCharacters, invertCharacters } from "@autumnsgrove/gossamer";

const groveChars = getCharacters("grove");     // " ·∙•◦○◉●"
const inverted = invertCharacters(groveChars); // "●◉○◦•∙· "
```

## Performance Tuning

Target performance is 17-28ms per frame for a typical 400x200px card at 30fps with a domain-warp preset.

**Cell size** is the primary performance lever. Larger cells mean fewer characters to render per frame. For backgrounds, 12-16px is fine. For image conversion where detail matters, use 4-8px.

**FPS cap.** All Svelte components default to 30fps. The `createAnimationLoop` utility enforces frame intervals by skipping `requestAnimationFrame` callbacks that arrive too early, with drift correction to prevent timing accumulation.

**Visibility pause.** Every Svelte component automatically pauses animation when scrolled offscreen (via `IntersectionObserver` at 0.1 threshold) and stops when `prefers-reduced-motion` is active. For reduced motion, the component renders a single static frame instead of animating.

**Buffer vs grid.** For hot animation loops, use the buffer path. The flat `Uint8Array` avoids GC pressure from allocating nested arrays every frame.

**Atlas rendering.** The character atlas (`renderFromBuffer`, `renderGridFast`) uses `drawImage` calls instead of `fillText`. This matters because `fillText` is surprisingly expensive, it involves font shaping on every call. The atlas pre-renders each character once.

**Resize debounce.** The `createResizeObserver` utility debounces resize callbacks at 100ms by default. During a resize, the renderer gets destroyed and recreated, which includes rebuilding the character atlas. Debouncing prevents this from happening on every intermediate resize frame.

### What to Watch

- `domain-warp` at high frequency (>0.08) gets expensive because of nested fBm calls.
- Very small cell sizes (<6px) on large canvases create thousands of fillText/drawImage calls per frame.
- The `fractal` pattern runs a Julia set iteration loop (up to 20 iterations per cell), so large grids are costly.

## The GossamerPreset Duplication Problem

The `GossamerPreset` type is a string union listing all valid preset names. It is duplicated in three files:

1. `libs/engine/src/lib/ui/components/ui/Glass.svelte` (line 55)
2. `libs/engine/src/lib/ui/components/ui/GlassCard.svelte` (line 91)
3. `apps/landing/src/routes/vineyard/+page.svelte` (line 119)

When you add a preset to `presets.ts`, these three files must also be updated or the new preset won't be selectable through Glass components. This is a known maintenance burden. The canonical source is the `PRESETS` record in `libs/gossamer/src/svelte/presets.ts`.

## Color System

Gossamer ships its own color palettes in `colors.ts`, designed to complement Glass UI. Three palette families: Grove Green (10 shades), Cream (10 shades), Bark (10 shades), plus status colors.

The `GLASS_SCHEMES` record provides pre-tuned color+opacity combinations for glass overlays. Light mode schemes (`grove-mist`, `cream-haze`, `bark-shadow`) use transparent backgrounds. Dark mode schemes (`grove-glow`, `cream-dust`, `moonlight`) use the dark background color `#1a1915`.

```typescript
import { getGlassScheme } from "@autumnsgrove/gossamer";

const scheme = getGlassScheme("grove-mist");
// { color: "#22c55e", background: "transparent", opacity: 0.12 }
```

## Accessibility

All Gossamer effects are purely decorative. Every canvas element has `aria-hidden="true"`. The `GossamerText` component includes a screen-reader-only `<span>` with the actual text content, so the visual canvas rendering never hides meaning.

All components respect `prefers-reduced-motion: reduce`. When active, animation stops and a single static frame renders instead. The `onReducedMotionChange` utility fires immediately with the current preference value and then watches for changes.

CSS `pointer-events: none` on all overlay/cloud canvases ensures the effects never block interaction with content beneath them.

## Key Files

| File | Purpose |
|---|---|
| `libs/gossamer/src/index.ts` | Core barrel, types, constants, `calculateBrightness`, `brightnessToChar` |
| `libs/gossamer/src/renderer.ts` | `GossamerRenderer` class, atlas rendering, animation loop |
| `libs/gossamer/src/patterns.ts` | All 13 pattern generators, `generateBrightnessGrid`, `fillBrightnessBuffer` |
| `libs/gossamer/src/characters.ts` | 19 named character sets, validation, helpers |
| `libs/gossamer/src/colors.ts` | Grove palettes, glass schemes |
| `libs/gossamer/src/animation.ts` | `createAnimationLoop`, throttle, debounce, easings |
| `libs/gossamer/src/utils/canvas.ts` | Canvas creation, DPI scaling, text measurement, blend modes |
| `libs/gossamer/src/utils/image.ts` | Image loading, pixel sampling, brightness extraction |
| `libs/gossamer/src/utils/performance.ts` | Visibility observer, resize observer, reduced motion, FPS counter |
| `libs/gossamer/src/svelte/presets.ts` | 8 presets in 3 categories (grove, seasonal, ambient) |
| `libs/gossamer/src/svelte/GossamerClouds.svelte` | Primary ambient background component |

## Quick Checklist

When adding a new preset:
- [ ] Add the entry to the correct category in `presets.ts`
- [ ] Update the `GossamerPreset` type in `Glass.svelte`, `GlassCard.svelte`, and the vineyard page
- [ ] Test with both light and dark backgrounds
- [ ] Check that `sparsity=1.0` and `sparsity=0.0` both render without errors

When adding a new pattern:
- [ ] Add the pattern function to `patterns.ts`
- [ ] Add its name to the `PatternType` union
- [ ] Add a case in `generateBrightnessGrid` (grid path)
- [ ] Add a matching case in `fillBrightnessBuffer` (buffer path)
- [ ] Verify the test `"should match behavior between grid and buffer APIs"` passes
- [ ] Add the pattern to `PresetConfig.pattern` union in `index.ts`

When tuning performance:
- [ ] Measure frame times with `createFPSCounter` from `utils/performance.ts`
- [ ] Try increasing `cellSize` before reducing pattern complexity
- [ ] Consider switching from grid path to buffer path for animation
- [ ] Verify visibility-based pause is working (check `IntersectionObserver` threshold)

*Threads of light, woven quietly through glass.*
