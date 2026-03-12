---
title: "Gossamer Visual Quality Overhaul"
status: planned
category: features
lastUpdated: "2026-03-05"
---

# Gossamer Visual Quality Overhaul

> _Spider silk stretched between branches — nearly invisible until the light finds it._

**Status:** Planned
**Priority:** High — Gossamer is integrated and functional but visually underwhelming
**Depends on:** `feat(gossamer): wire up Gossamer ASCII effects` (917a5e3, done)

---

## Problem Statement

Gossamer renders ASCII patterns on canvas behind Glass/GlassCard components. The pipeline works — patterns generate, brightness maps to characters, canvas draws. But the output looks like "mathematically correct noise" rather than "dreamy atmospheric texture." Side-by-side with references like caidan.dev's ASCII clouds, ours lack the organic, airy quality that makes ASCII effects feel magical.

**Specific issues observed:**
- Patterns feel dense and busy rather than sparse and atmospheric
- Characters appear distorted (square cells but monospace fonts are ~0.6:1 width:height)
- Cloud patterns look like hills, not weather
- Time evolution is too fast for ambient backgrounds
- All cells render at uniform opacity — no depth or fade
- Several presets produce barely-visible or broken output

---

## Architecture Overview

```
                    THE RENDERING PIPELINE
                    ═══════════════════════

  ┌─────────────────────────────────────────────────────────┐
  │                   GossamerClouds.svelte                  │
  │  Props → config resolution (preset or manual)           │
  │  onMount → setupRenderer() → animate() loop             │
  └──────────┬──────────────────────────────┬───────────────┘
             │                              │
             ▼                              ▼
  ┌──────────────────────┐      ┌───────────────────────────┐
  │    patterns.ts        │      │      renderer.ts          │
  │                       │      │                           │
  │  generateBrightness   │─────▶│  renderFromBrightness     │
  │  Grid(cols, rows,     │ grid │  Grid(grid)               │
  │    pattern, time,     │      │                           │
  │    config)            │      │  For each cell:           │
  │                       │      │    brightness → charIndex  │
  │  Returns: number[][]  │      │    fillText(char, x, y)   │
  │  Values: 0-255        │      │                           │
  └──────────────────────┘      └───────────────────────────┘
             │                              │
             │                              │
    PHASE 1-3 changes              PHASE 4-5 changes
    happen here                    happen here
```

---

## The Plan: 5 Phases

### Phase 1: Fix Cell Aspect Ratio

**Problem:** `cellWidth` and `cellHeight` are both set to `cellSize` (12), creating square cells. But monospace fonts are ~0.6:1 width:height, so characters render distorted.

**Files:** `GossamerClouds.svelte`, `renderer.ts`

**Changes:**
- In `GossamerClouds.svelte`, compute `cellWidth` from `cellHeight` using font metrics:
  ```typescript
  // In setupRenderer, after creating canvas context:
  ctx.font = `${cellSize}px monospace`;
  const measured = ctx.measureText("M").width;
  const cellWidth = Math.ceil(measured);  // typically ~7 for cellSize 12
  ```
- Pass separate `cellWidth` and `cellHeight` to the renderer instead of using `cellSize` for both
- This changes the grid dimensions — a 400px wide canvas with cellWidth=7 gets ~57 cols instead of ~33

**Impact:** Characters will look proportionally correct. Grid gets more columns (wider canvas coverage).

**Risk:** Low. The renderer already supports separate cellWidth/cellHeight — it's only GossamerClouds that was passing the same value for both.

---

### Phase 2: Domain Warping for Clouds Pattern

**Problem:** `cloudsPattern()` uses layered fBm which produces organic-ish noise, but lacks the self-similar pinching and stretching that real clouds/smoke have. Domain warping — feeding noise into noise — creates dramatically more organic results.

**File:** `patterns.ts`

**Changes:**
- Add a new `domainWarpPattern()` function implementing Inigo Quilez's technique:
  ```
  q = vec2(fbm(p + offset1), fbm(p + offset2))
  r = vec2(fbm(p + 4*q + offset3), fbm(p + 4*q + offset4))
  result = fbm(p + 4*r)
  ```
- Replace the current `cloudsPattern()` implementation with domain warping
- Add `PatternType = "domain-warp"` as a new pattern type (keep `"clouds"` as alias)
- The offset vectors (5.2, 1.3, etc.) are arbitrary constants that ensure uncorrelated noise layers
- Displacement strength parameter (the `4.0` multiplier) controls how swirly the result is — lower = subtle, higher = dramatic

**Performance note:** Domain warping is ~3x the cost of simple fBm. On a typical card grid (~45x15 cells = 675 cells), this is ~2000 fBm calls per frame at 30fps. Absolutely negligible — we'd need >100k cells before it becomes a concern.

**Impact:** The "clouds" pattern transforms from "blobby hills" to "actual weather." This is the single biggest visual quality improvement.

---

### Phase 3: Sparsity Bias ("The Dreamy Look")

**Problem:** The normalization `(value + 1) * 0.5 * amplitude` maps noise uniformly across the full brightness range. For atmospheric effects, 80%+ of cells should be empty space — the dreamy look comes from restraint.

**File:** `patterns.ts` (in `generateBrightnessGrid` and `fillBrightnessBuffer`)

**Changes:**
- Add a `sparsity` parameter to `PatternConfig`:
  ```typescript
  interface PatternConfig {
    frequency: number;
    amplitude: number;
    speed: number;
    sparsity?: number;  // 0.0 = no bias, 1.0 = maximum sparsity (default: 0.0)
  }
  ```
- Apply sparsity as a threshold bias in normalization:
  ```typescript
  // Current: linear mapping
  const normalized = (value + 1) * 0.5 * amplitude;

  // New: with sparsity bias — shifts the "space" threshold upward
  // At sparsity=0.5, noise values below ~0 map to space
  // At sparsity=0.8, only the top 20% of noise values produce visible characters
  const threshold = sparsity * 2 - 1;  // maps 0-1 to -1..1
  const biased = Math.max(0, value - threshold) / (1 - threshold);
  const normalized = biased * amplitude;
  ```
- Add `sparsity` to `PresetConfig` interface and each preset definition
- Atmospheric presets get high sparsity (0.5-0.8), pattern presets get low (0.0-0.3)

**Impact:** Characters become sparse and atmospheric. Most of the canvas is empty, with characters appearing only where the noise peaks — exactly like caidan.dev's clouds.

**Backward compat:** `sparsity` defaults to `0.0`, so existing behavior is unchanged unless explicitly set.

---

### Phase 4: Alpha-by-Brightness Rendering

**Problem:** Every non-space character renders at full opacity. Dense characters and sparse characters look equally "solid," creating a flat, uniform appearance. Real atmospheric effects have depth — dense areas are more visible, sparse areas fade.

**File:** `renderer.ts`

**Changes:**
- Add an `alphaByBrightness` option to `RenderConfig`:
  ```typescript
  interface RenderConfig {
    // ...existing fields...
    /** Scale character opacity by brightness value (0.0 = off, 1.0 = full range) */
    alphaByBrightness: number;
  }
  ```
- In `renderFromBrightnessGrid()`, when `alphaByBrightness > 0`, set `ctx.globalAlpha` per-character:
  ```typescript
  // Base alpha + brightness-scaled alpha
  const alpha = 1.0 - alphaByBrightness + (brightness / 255) * alphaByBrightness;
  ctx.globalAlpha = alpha;
  ```
- Reset `ctx.globalAlpha = 1.0` after the render loop
- Also apply to `renderFromBuffer()` and `renderGridFast()` atlas-based paths

**Impact:** Characters naturally fade from ghostly wisps (low brightness) to solid forms (high brightness), creating the depth/volume that atmospheric effects need.

**Performance note:** Setting `globalAlpha` per-cell adds overhead vs. batch rendering. For atlas-based rendering, this means we can't batch by character anymore. However, on a ~45x15 grid this is still negligible. If needed, we could quantize alpha into 4-5 buckets and batch by bucket.

**Expose in component:** Add `alphaByBrightness` prop to `GossamerClouds.svelte`, default `0.0`. Presets can opt in.

---

### Phase 5: Preset Tuning

**Problem:** Presets need to be redesigned around the new capabilities (sparsity, domain warping, alpha-by-brightness, correct aspect ratio).

**File:** `presets.ts`

**Approach:** Reduce from 11 to 8 presets — cut the ones that don't serve a clear aesthetic purpose. Each remaining preset should be visually distinct and tuned for the typical Glass card size (~400x200px).

**Proposed preset roster:**

| Preset | Pattern | Sparsity | Alpha | Character Set | Feel |
|--------|---------|----------|-------|--------------|------|
| `grove-mist` | domain-warp | 0.6 | 0.5 | `" ·∙•◦"` | Signature — soft fog drifting through glass |
| `grove-fireflies` | static | 0.85 | 0.7 | `" ·*"` | Sparse twinkling points, mostly dark |
| `grove-rain` | matrix | 0.4 | 0.6 | `" .\|:"` | Falling columns with fade trails |
| `grove-dew` | fbm | 0.5 | 0.4 | `" ·.:*"` | Still morning texture, barely moving |
| `winter-snow` | perlin | 0.7 | 0.5 | `" .*+"` | Slow drift, sparse snowflake points |
| `summer-heat` | waves | 0.3 | 0.3 | `" ~-="` | Horizontal shimmer, low sparsity for visible waves |
| `ambient-clouds` | domain-warp | 0.5 | 0.4 | `" .:=+"` | Soft billowing, mid-density |
| `ambient-static` | static | 0.7 | 0.5 | `" .:+"` | Gentle texture, sparse |

**Cut:** `autumn-leaves`, `spring-petals`, `ambient-waves` — these didn't produce distinct-enough output from the other presets. Better to have 8 excellent presets than 11 mediocre ones.

**Speed guidance from research:**
- Atmospheric/cloud: time increment 0.002-0.005/frame → `speed: 0.1-0.2`
- Gentle motion (rain, snow): `speed: 0.3-0.5`
- Active (fireflies, shimmer): `speed: 0.5-0.8`

---

## Implementation Order

```
Phase 1 (Cell Aspect Ratio)     ← Do first, changes grid dimensions
    │                              that affect all subsequent tuning
    ▼
Phase 2 (Domain Warping)        ← Core visual improvement
    │
    ▼
Phase 3 (Sparsity Bias)         ← Works with Phase 2 patterns
    │
    ▼
Phase 4 (Alpha-by-Brightness)   ← Rendering enhancement, pairs with Phase 3
    │
    ▼
Phase 5 (Preset Tuning)         ← Final: tune all presets with new capabilities
```

**Each phase can be tested independently.** After each phase:
1. `cd libs/gossamer && pnpm run build`
2. `cd libs/engine && pnpm run package`
3. Refresh `/vineyard` in the landing dev server

---

## Files Modified Per Phase

| Phase | File | Type of Change |
|-------|------|----------------|
| 1 | `src/svelte/GossamerClouds.svelte` | Compute cellWidth from font metrics |
| 2 | `src/patterns.ts` | Add `domainWarpPattern()`, update `cloudsPattern()` |
| 2 | `src/index.ts` | Export new function |
| 3 | `src/patterns.ts` | Add `sparsity` to config, update normalization |
| 3 | `src/index.ts` | Update `PatternConfig` type |
| 4 | `src/renderer.ts` | Add `alphaByBrightness` to render methods |
| 4 | `src/svelte/GossamerClouds.svelte` | Add prop, pass to renderer |
| 5 | `src/svelte/presets.ts` | Redesign all presets |

---

## Testing Strategy

- **Unit tests (existing):** 85 tests in patterns, characters, animation, index — should still pass after Phases 1-4
- **New unit tests:** Add tests for `domainWarpPattern()` output range, sparsity normalization math
- **Visual testing:** Vineyard page at `/vineyard` with preset dropdown — cycle through all presets
- **Performance:** Monitor frame times via dev tools Performance tab — target <2ms per frame on the card-sized canvas

---

## What Success Looks Like

A `<Glass gossamer="grove-mist">` card should feel like looking through frosted glass at a misty forest morning — barely-there ASCII characters that drift and fade, creating warmth and whimsy without competing with the content above. The effect should make someone pause and think "that's beautiful" rather than "I see some characters."

---

_Created: March 2026_
_Architect: Eagle_
