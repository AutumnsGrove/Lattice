---
aliases: []
date created: Saturday, January 4th 2026
date modified: Saturday, January 4th 2026
tags: []
type: tech-spec
---

# Terrarium — Creative Canvas

```
                        .  ·  ·  ·  .
                     ·                 ·
                   ·   ╭─────────────╮   ·
                  ·   ╱               ╲   ·
                 ·   │   🌿  🦋  🍄   │   ·
                ·    │  🌲  ·  ·  🌸  │    ·
                 ·   │   🪨  🌱  ✨   │   ·
                  ·   ╲     🐛      ╱   ·
                   ·   ╰─────────────╯   ·
                     ·                 ·
                        ·  ·  ·  ·  ·
                  ──────────────────────────
                 ~~~~~~ world under glass ~~~~~~
                 Design. Arrange. Watch it grow.
```

> *A sealed world under glass—a miniature ecosystem you design, arrange, and watch grow.*

**Public Name:** Terrarium
**Internal Name:** GroveTerrarium
**Route:** `/terrarium`
**Repository:** `AutumnsGrove/GroveEngine` (packages/engine)

A terrarium is a contained miniature ecosystem you design, arrange, and nurture. Moss, stones, tiny plants—all placed with intention.

Terrarium is Grove's creative canvas. Drag nature components onto an open space, compose scenes from trees and creatures and flowers, then bring them home to your blog as decorations. Your terrarium becomes your foliage.

---

## Table of Contents

1. [Overview](#overview)
2. [Timeline](#timeline)
3. [Core Features](#core-features)
4. [Technical Architecture](#technical-architecture)
5. [Configuration & Limits](#configuration--limits)
6. [Asset Registry](#asset-registry)
7. [Export System](#export-system)
8. [Foliage Integration](#foliage-integration)
9. [Implementation Phases](#implementation-phases)
10. [File Structure](#file-structure)
11. [Keyboard Shortcuts](#keyboard-shortcuts)
12. [Accessibility](#accessibility)
13. [Auto-Save Behavior](#auto-save-behavior)
14. [Touch Interactions](#touch-interactions)
15. [Testing Strategy](#testing-strategy)
16. [Community Decorations Security](#community-decorations-security)
17. [API Endpoints](#api-endpoints)

---

## Overview

### The Vision

**MySpace-level customization with Grove's curated aesthetic.**

Users create scenes in Terrarium → Export as decorations → Apply via Foliage → Blogs become uniquely personal.

The component library IS the guardrail. Every tree, firefly, and lattice is curated. Users get creative freedom within Grove's nature palette.

### The Flow

```
    The Terrarium Pipeline:

    ┌───────────────────────────────────────────────────────────────────┐
    │                                                                   │
    │   🎨 CREATE          📦 EXPORT          🌿 APPLY          🌍 SHARE   │
    │     │                  │                  │                  │   │
    │     ▼                  ▼                  ▼                  ▼   │
    │  ╭────────╮        ╭────────╮        ╭────────╮        ╭────────╮│
    │  │Terrar- │   →    │ Choose │   →    │Foliage │   →    │Commu-  ││
    │  │  ium   │        │  Zone  │        │  Tab   │        │  nity  ││
    │  │        │        │        │        │        │        │        ││
    │  │🌲 🦋 🍄│        │ header │        │ apply  │        │ browse ││
    │  │ canvas │        │sidebar │        │preview │        │ share  ││
    │  ╰────────╯        ╰────────╯        ╰────────╯        ╰────────╯│
    │                                                                   │
    └───────────────────────────────────────────────────────────────────┘

    Terrarium Canvas UI:

    ┌─────────────────────────────────────────────────────────────────────┐
    │  ◎ Terrarium                              [Grid ▢] [Save] [Export]  │
    ├────────────────┬────────────────────────────────────────────────────┤
    │  Asset Palette │                                                    │
    │  ─────────────── │                     Canvas                        │
    │  [🔍 Search... ]│                                                    │
    │                │           🌲                                        │
    │  🌲 Trees      │              🦋                                     │
    │   TreePine    │    🍄     ╭─────╮                                   │
    │   TreeBirch   │          │     │   🌿                               │
    │   TreeCherry  │          ╰─────╯        🪨                          │
    │                │                                                    │
    │  🦋 Creatures  │      🌸                                  🌱         │
    │   Butterfly   │                                                    │
    │   Firefly     │   ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·     │
    │   Bee         │                                                    │
    │                │                                                    │
    │  🍄 Ground     │                                                    │
    │   Mushroom    │                                                    │
    │   Rock        │                                                    │
    ├────────────────┴────────────────────────────────────────────────────┤
    │  Complexity: ████████░░░░░░░░░░░░ 85/200 pts   42% budget used     │
    └─────────────────────────────────────────────────────────────────────┘
```

### Tier Access

| Tier | Terrarium Access | Saved Scenes | Decorations |
|------|------------------|--------------|-------------|
| **Free** | View-only demo | 0 | None |
| **Seedling** | Full access | 5 | 1 per zone |
| **Sapling** | Full access | 20 | 3 per zone |
| **Oak** | Full access | 100 | Unlimited + browse community |
| **Evergreen** | Full access | Unlimited | Unlimited + share to community |

---

## Timeline

| Milestone | Target Phase | Contents |
|-----------|--------------|----------|
| **MVP (Phases 1-3)** | Full Bloom | Core canvas, assets, export, Foliage integration |
| **Full Version** | Golden Hour | PlaygroundDO backend, community features, polish |

---

## Core Features

### 1. Canvas System

- **Blank canvas** - Full viewport workspace
- **Pan** - Middle mouse drag or Space+drag
- **Background options** - Sky gradients, solid colors, transparent
- **Grid overlay** - Toggleable snap-to-grid (16/32/64px)

### 2. Asset Palette

Categorized sidebar with 60+ nature components.

**Search & Filter:**
- Search box at top filters assets by name
- Category tabs filter by category
- Search + category filters stack (AND logic)
- Debounced search (150ms) for performance

| Category | Components |
|----------|------------|
| **Trees** | TreeAspen, TreeBirch, TreeCherry, TreePine |
| **Creatures** | Bee, Bird, Butterfly, Deer, Firefly, Owl, Rabbit, Squirrel, etc. |
| **Botanical** | Acorn, Berry, Leaf, Vine, Fern, FallingLeavesLayer, etc. |
| **Ground** | Bush, Mushroom, Rock, Stump, GrassTuft, Flowers, etc. |
| **Sky** | Cloud, Moon, Star, Sun, Rainbow, etc. |
| **Structural** | Lattice, LatticeWithVine, Birdhouse, Bridge, Lantern, etc. |
| **Water** | Pond, Stream, LilyPad, Reeds |
| **Weather** | Snowflake, SnowfallLayer, etc. |

**Phase 1 Starter Assets (10):**
- Trees: TreePine, TreeBirch
- Structural: Lattice, LatticeWithVine, Lantern
- Creatures: Butterfly, Firefly
- Ground: Mushroom, Rock
- Botanical: Vine

### 3. Asset Manipulation

- **Move** - Drag to reposition
- **Scale** - Corner handles or props panel
- **Rotate** - Rotation handle or props panel
- **Layer order** - Bring forward/send back
- **Delete** - Delete key or button
- **Duplicate** - Cmd/Ctrl+D

### 4. Props Panel (Vineyard-Style)

When asset selected, show configurable props:

```
┌─────────────────────────────┐
│ TreePine                    │
├─────────────────────────────┤
│ Scale: [====●====] 1.0      │
│ Rotation: [0°___] ↻         │
│ ─────────────────           │
│ Component Props:            │
│ height: [150___] px         │
│ snowCovered: [✓]            │
│ ─────────────────           │
│ Layer: [▲] 3 [▼]            │
│ [Duplicate] [Delete]        │
└─────────────────────────────┘
```

### 5. Animation Toggle

- **Global toggle** - Master animation on/off in toolbar
- **Per-asset toggle** - In props panel for animated components
- **Animated assets**: Firefly, FallingLeavesLayer, FallingPetalsLayer, SnowfallLayer, StarShooting

### 6. Scene Management

- **Save** - localStorage (v1), PlaygroundDO (v2)
- **Load** - Scene picker
- **Export** - PNG (required), SVG (stretch)
- **Export as Decoration** - For Foliage integration

---

## Technical Architecture

### Data Structures

```typescript
// Core scene structure
interface TerrariumScene {
  id: string;
  name: string;
  version: 1;
  canvas: CanvasSettings;
  assets: PlacedAsset[];
  createdAt: string;
  updatedAt: string;
}

interface CanvasSettings {
  width: number;
  height: number;
  background: string;
  gridEnabled: boolean;
  gridSize: 16 | 32 | 64;
}

interface PlacedAsset {
  id: string;
  componentName: string;
  category: AssetCategory;
  position: { x: number; y: number };
  scale: number;
  rotation: number;
  zIndex: number;
  props: Record<string, unknown>;
  animationEnabled: boolean;
}

type AssetCategory =
  | 'trees' | 'creatures' | 'botanical'
  | 'ground' | 'sky' | 'structural'
  | 'water' | 'weather';
```

### State Management

Using Svelte 5 runes:

```typescript
// terrariumState.svelte.ts
export function createTerrariumState() {
  let scene = $state<TerrariumScene>(defaultScene);
  let selectedAssetId = $state<string | null>(null);
  let isDragging = $state(false);
  let animationsEnabled = $state(true);

  let selectedAsset = $derived(
    scene.assets.find(a => a.id === selectedAssetId) ?? null
  );

  // Actions
  function addAsset(componentName: string, position: Point) { /* ... */ }
  function updateAsset(id: string, updates: Partial<PlacedAsset>) { /* ... */ }
  function deleteAsset(id: string) { /* ... */ }
  function duplicateAsset(id: string) { /* ... */ }
  function moveLayer(id: string, direction: 'up' | 'down' | 'top' | 'bottom') { /* ... */ }

  return { /* expose state and actions */ };
}
```

---

## Configuration & Limits

All limits in a single, easily configurable file:

```typescript
// packages/engine/src/lib/config/terrarium.ts

export const TERRARIUM_CONFIG = {
  // Scene constraints
  scene: {
    maxNameLength: 100,
    maxSizeBytes: 1_000_000, // 1MB JSON
  },

  // Complexity budget system (replaces hard asset limit)
  // Total complexity cannot exceed maxComplexity
  complexity: {
    maxComplexity: 200,
    weights: {
      animated: 5,    // Animated assets cost 5 points
      scaled: 2,      // Scale > 1.5 or < 0.5 costs 2 points
      normal: 1,      // Standard assets cost 1 point
    },
    warningThreshold: 0.8, // Warn at 80% budget
  },

  // Canvas constraints
  canvas: {
    maxWidth: 4000,
    maxHeight: 4000,
    minWidth: 200,
    minHeight: 200,
    defaultWidth: 1200,
    defaultHeight: 800,
    gridSizes: [16, 32, 64] as const,
    defaultGridSize: 32,
  },

  // Asset constraints
  asset: {
    maxScale: 5,
    minScale: 0.1,
    defaultScale: 1,
  },

  // Storage limits (per tier)
  storage: {
    // Use IndexedDB for larger storage (25MB+) vs localStorage (5-10MB)
    backend: 'indexeddb' as const,
    dbName: 'terrarium',
    dbVersion: 1,
    maxSavedScenes: {
      free: 0,
      seedling: 5,
      sapling: 20,
      oak: 100,
      evergreen: Infinity,
    },
    maxDecorationsPerZone: {
      free: 0,
      seedling: 1,
      sapling: 3,
      oak: Infinity,
      evergreen: Infinity,
    },
  },

  // Export settings
  export: {
    maxWidth: 4096,
    maxHeight: 4096,
    defaultScale: 2, // 2x for retina
    format: 'png' as const,
    // Realistic: 5-10s for complex scenes, not 3s
    expectedTimeMs: { min: 1000, typical: 5000, max: 10000 },
  },

  // Auto-save settings
  autoSave: {
    enabled: true,
    debounceMs: 2000,        // Wait 2s after last change
    maxIntervalMs: 30000,    // Force save every 30s during activity
    showIndicator: true,     // Show "Saving..." indicator
  },

  // Zone constraints for Foliage integration
  zones: {
    header: {
      recommendedAspectRatio: [16, 3] as [number, number],
      maxHeight: 200,
      fitBehavior: 'scale' as const,
    },
    sidebar: {
      recommendedAspectRatio: [1, 2] as [number, number],
      maxHeight: 400,
      fitBehavior: 'scale' as const,
    },
    footer: {
      recommendedAspectRatio: [16, 2] as [number, number],
      maxHeight: 150,
      fitBehavior: 'scale' as const,
    },
    background: {
      recommendedAspectRatio: null, // Free
      maxHeight: null,
      fitBehavior: 'cover' as const,
    },
  },

  // Performance
  performance: {
    targetFPS: 60,
    maxAnimatedAssets: 20, // Warning threshold
    dragThrottleMs: 16, // One frame
  },
} as const;

export type TerrariumConfig = typeof TERRARIUM_CONFIG;
```

### Complexity Budget Utilities

```typescript
// packages/engine/src/lib/utils/complexity.ts

import { TERRARIUM_CONFIG } from '$lib/config/terrarium';
import { assetRegistry } from '$lib/ui/components/terrarium/assetRegistry.generated';
import type { PlacedAsset } from '$lib/types';

const { maxComplexity, weights, warningThreshold } = TERRARIUM_CONFIG.complexity;

/**
 * Calculate complexity cost for a single asset
 * Uses hysteresis to prevent cost flickering near thresholds
 */
export function getAssetComplexity(
  asset: PlacedAsset,
  previousCost?: number
): number {
  const meta = assetRegistry[asset.componentName];

  // Define thresholds with hysteresis buffer (±0.1)
  const SCALE_HIGH_ENTER = 1.5;
  const SCALE_HIGH_EXIT = 1.4;  // Must drop below 1.4 to return to normal
  const SCALE_LOW_ENTER = 0.5;
  const SCALE_LOW_EXIT = 0.6;   // Must rise above 0.6 to return to normal

  // Determine if currently in "scaled" state (with hysteresis)
  const wasScaled = previousCost === weights.scaled;
  const isExtremeScale = wasScaled
    ? (asset.scale > SCALE_HIGH_EXIT || asset.scale < SCALE_LOW_EXIT)  // Stay scaled until clearly normal
    : (asset.scale > SCALE_HIGH_ENTER || asset.scale < SCALE_LOW_ENTER); // Become scaled at threshold

  // Priority: animated > scaled > normal
  if (meta?.isAnimated && asset.animationEnabled) {
    return weights.animated;
  }
  if (isExtremeScale) {
    return weights.scaled;
  }
  return weights.normal;
}

/**
 * Get human-readable cost breakdown for UI display
 */
export function getAssetCostLabel(asset: PlacedAsset): string {
  const cost = getAssetComplexity(asset);
  const meta = assetRegistry[asset.componentName];

  if (meta?.isAnimated && asset.animationEnabled) {
    return `${cost} pts (animated)`;
  }
  if (asset.scale > 1.5 || asset.scale < 0.5) {
    return `${cost} pts (scaled)`;
  }
  return `${cost} pt`;
}

/**
 * Calculate total complexity of all assets in a scene
 */
export function calculateSceneComplexity(assets: PlacedAsset[]): number {
  return assets.reduce((total, asset) => total + getAssetComplexity(asset), 0);
}

/**
 * Get complexity as percentage of budget (0-1)
 */
export function getComplexityPercentage(assets: PlacedAsset[]): number {
  return calculateSceneComplexity(assets) / maxComplexity;
}

/**
 * Check if adding an asset would exceed complexity budget
 */
export function canAddAsset(
  currentAssets: PlacedAsset[],
  newAsset: Partial<PlacedAsset>
): { allowed: boolean; wouldExceed: boolean; currentUsage: number } {
  const currentComplexity = calculateSceneComplexity(currentAssets);
  const assetCost = getAssetComplexity(newAsset as PlacedAsset);
  const newTotal = currentComplexity + assetCost;

  return {
    allowed: newTotal <= maxComplexity,
    wouldExceed: newTotal > maxComplexity,
    currentUsage: currentComplexity / maxComplexity,
  };
}

/**
 * Check if scene is at warning threshold
 */
export function isAtWarningThreshold(assets: PlacedAsset[]): boolean {
  return getComplexityPercentage(assets) >= warningThreshold;
}

/**
 * Get remaining budget
 */
export function getRemainingBudget(assets: PlacedAsset[]): {
  remaining: number;
  canAddNormal: number;
  canAddAnimated: number;
} {
  const used = calculateSceneComplexity(assets);
  const remaining = maxComplexity - used;

  return {
    remaining,
    canAddNormal: Math.floor(remaining / weights.normal),
    canAddAnimated: Math.floor(remaining / weights.animated),
  };
}
```

---

## Asset Registry

### Explicit Metadata Exports

Instead of fragile Svelte parsing, each nature component exports its metadata explicitly.

**Component Pattern:**

```svelte
<!-- src/lib/ui/components/nature/trees/TreePine.svelte -->
<script lang="ts" context="module">
  import type { AssetMeta } from '../../terrarium/types';

  // Explicit metadata export - no parsing needed
  export const meta: AssetMeta = {
    displayName: 'Pine Tree',
    category: 'trees',
    isAnimated: false,
    defaultSize: { width: 100, height: 150 },
    props: [
      { key: 'height', label: 'Height', type: 'number', min: 50, max: 300, default: 150 },
      { key: 'snowCovered', label: 'Snow Covered', type: 'boolean', default: false },
    ],
  };
</script>

<script lang="ts">
  interface Props {
    height?: number;
    snowCovered?: boolean;
  }

  let { height = 150, snowCovered = false }: Props = $props();
</script>

<!-- component template -->
```

### Build-Time Generation

The build script collects metadata from explicit exports (not parsing):

```bash
pnpm run generate:asset-registry
```

**Script: `scripts/generate-asset-registry.ts`**

```typescript
import { glob } from 'glob';
import * as fs from 'fs';
import * as path from 'path';

const NATURE_PATH = 'src/lib/ui/components/nature';
const OUTPUT_PATH = 'src/lib/ui/components/terrarium/assetRegistry.generated.ts';

async function generateRegistry() {
  const categories = await glob(`${NATURE_PATH}/*/`);
  const imports: string[] = [];
  const registryEntries: string[] = [];
  const categoryMap: Record<string, string[]> = {};

  for (const categoryPath of categories) {
    const category = path.basename(categoryPath);
    const components = await glob(`${categoryPath}/*.svelte`);
    categoryMap[category] = [];

    for (const componentPath of components) {
      const name = path.basename(componentPath, '.svelte');
      const relativePath = path.relative(
        'src/lib/ui/components/terrarium',
        componentPath.replace('.svelte', '')
      );

      // Import meta from component module
      imports.push(
        `import { meta as ${name}Meta } from '${relativePath}.svelte';`
      );

      registryEntries.push(`
  ${name}: {
    name: '${name}',
    ...${name}Meta,
    load: () => import('${relativePath}.svelte'),
  },`);

      categoryMap[category].push(name);
    }
  }

  const output = `// AUTO-GENERATED - DO NOT EDIT
// Run \`pnpm run generate:asset-registry\` to regenerate

import type { AssetDefinition } from './types';

${imports.join('\n')}

export const assetRegistry: Record<string, AssetDefinition> = {${registryEntries.join('')}
};

export const assetsByCategory = ${JSON.stringify(categoryMap, null, 2)};
`;

  fs.writeFileSync(OUTPUT_PATH, output);
  console.log(\`Generated registry with \${registryEntries.length} assets\`);
}

generateRegistry();
```

**Generated output: `assetRegistry.generated.ts`**

```typescript
// AUTO-GENERATED - DO NOT EDIT
// Run `pnpm run generate:asset-registry` to regenerate

import type { AssetDefinition } from './types';

import { meta as TreePineMeta } from '../nature/trees/TreePine.svelte';
import { meta as TreeBirchMeta } from '../nature/trees/TreeBirch.svelte';
import { meta as FireflyMeta } from '../nature/creatures/Firefly.svelte';
// ... all 60+ assets

export const assetRegistry: Record<string, AssetDefinition> = {
  TreePine: {
    name: 'TreePine',
    ...TreePineMeta,
    load: () => import('../nature/trees/TreePine.svelte'),
  },
  TreeBirch: {
    name: 'TreeBirch',
    ...TreeBirchMeta,
    load: () => import('../nature/trees/TreeBirch.svelte'),
  },
  // ... all assets
};

export const assetsByCategory = {
  trees: ['TreePine', 'TreeBirch', 'TreeCherry', 'TreeAspen'],
  creatures: ['Bee', 'Bird', 'Butterfly', 'Deer', 'Firefly'],
  // ... all categories
};
```

### Adding New Assets

1. Create component in `src/lib/ui/components/nature/{category}/`
2. Add `export const meta: AssetMeta = { ... }` in `context="module"` script
3. Run `pnpm run generate:asset-registry`
4. New asset automatically appears in Terrarium palette

---

## Export System

### Library Choice

**`dom-to-image-more`** (maintained fork of dom-to-image)
- Good SVG support (nature components are SVGs)
- Lighter than html2canvas
- Active maintenance

### Implementation

```typescript
// packages/engine/src/lib/ui/components/terrarium/utils/export.ts

import domtoimage from 'dom-to-image-more';
import { TERRARIUM_CONFIG } from '$lib/config/terrarium';

export async function exportSceneAsPNG(
  canvasElement: HTMLElement,
  sceneName: string,
  options: ExportOptions = {}
): Promise<void> {
  const {
    scale = TERRARIUM_CONFIG.export.defaultScale,
    backgroundColor,
    pauseAnimations = true,
  } = options;

  // 1. Pause animations if requested
  let wasAnimating = false;
  if (pauseAnimations) {
    wasAnimating = getAnimationsEnabled();
    setAnimationsEnabled(false);
  }

  try {
    // 2. Wait for CSS transitions to settle
    await new Promise(r => setTimeout(r, 100));

    // 3. Capture
    const dataUrl = await domtoimage.toPng(canvasElement, {
      bgcolor: backgroundColor ?? getCanvasBackground(),
      width: canvasElement.offsetWidth * scale,
      height: canvasElement.offsetHeight * scale,
      style: {
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
      },
    });

    // 4. Trigger download
    downloadDataUrl(dataUrl, `${sanitizeFilename(sceneName)}.png`);
  } finally {
    // 5. Restore animations
    if (pauseAnimations && wasAnimating) {
      setAnimationsEnabled(true);
    }
  }
}

function downloadDataUrl(dataUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-z0-9-_]/gi, '-').toLowerCase();
}
```

---

## Foliage Integration

### Decoration Zones

| Zone | Aspect Ratio | Max Height | Fit Behavior |
|------|--------------|------------|--------------|
| **Header** | 16:3 | 200px | Scale to fit width |
| **Sidebar** | 1:2 | 400px | Scale to fit width |
| **Footer** | 16:2 | 150px | Scale to fit width |
| **Background** | Free | Viewport | Cover with opacity |

### Export as Decoration Flow

```typescript
// When user clicks "Export as Decoration"
async function exportAsDecoration(
  scene: TerrariumScene,
  zone: DecorationZone,
  name: string
): Promise<{ decorationId: string }> {
  // 1. Validate scene fits zone
  const constraints = TERRARIUM_CONFIG.zones[zone];
  const warnings = validateSceneForZone(scene, constraints);

  if (warnings.length > 0) {
    const proceed = await showWarningDialog(warnings);
    if (!proceed) return;
  }

  // 2. Generate thumbnail
  const thumbnail = await generateThumbnail(scene);

  // 3. Save decoration
  const response = await fetch('/api/terrarium/decorations', {
    method: 'POST',
    body: JSON.stringify({
      name,
      zone,
      sceneData: scene,
      thumbnail,
    }),
  });

  return response.json();
}
```

### DecorationRenderer Component

The renderer must pre-load all components asynchronously before rendering. Components from dynamic imports are Promises, not components, so they must be awaited in `onMount` and stored in a Map.

```svelte
<!-- DecorationRenderer.svelte -->
<script lang="ts">
  import { untrack } from 'svelte';
  import type { Decoration, DecorationZone } from '$lib/types';
  import type { Component as SvelteComponent } from 'svelte';
  import { assetRegistry } from './assetRegistry.generated';

  interface Props {
    decoration: Decoration;
    zone: DecorationZone;
    class?: string;
  }

  let { decoration, zone, class: className }: Props = $props();

  // Pre-loaded components map
  let loadedComponents = $state<Map<string, SvelteComponent>>(new Map());
  let isLoading = $state(true);
  let loadError = $state<string | null>(null);

  // Track partial load state for UI feedback
  let loadStats = $state<{
    total: number;
    loaded: number;
    failed: string[];
  }>({ total: 0, loaded: 0, failed: [] });

  // Derived state for partial load messaging
  let hasPartialFailure = $derived(
    loadStats.failed.length > 0 && loadStats.loaded > 0
  );

  // Track which decoration we've loaded to detect changes
  let loadedDecorationId = $state<string | null>(null);

  // Reload components when decoration changes
  $effect(() => {
    const decorationId = decoration.id;
    const componentNames = [...new Set(
      decoration.scene.assets.map(a => a.componentName)
    )];

    // Run the async load in untrack to avoid re-triggering
    untrack(async () => {
      // Skip if already loaded for this decoration
      if (loadedDecorationId === decorationId) return;

      isLoading = true;
      loadError = null;

      // Load all components in parallel with graceful failure handling
      const loadPromises = componentNames.map(async (name) => {
        const definition = assetRegistry[name];
        if (!definition) {
          return { name, error: `Unknown component: ${name}` };
        }
        try {
          const module = await definition.load();
          return { name, component: module.default };
        } catch (err) {
          return { name, error: `Failed to load: ${name}` };
        }
      });

      // Use allSettled for partial failure handling
      const results = await Promise.allSettled(loadPromises);

      const componentMap = new Map<string, SvelteComponent>();
      const failedComponents: string[] = [];

      for (const result of results) {
        if (result.status === 'fulfilled') {
          const { name, component, error } = result.value;
          if (component) {
            componentMap.set(name, component);
          } else if (error) {
            failedComponents.push(name);
          }
        } else {
          // Promise rejected - unknown component
          failedComponents.push('unknown');
        }
      }

      loadedComponents = componentMap;
      loadedDecorationId = decorationId;

      // Update load stats for UI feedback
      loadStats = {
        total: componentNames.length,
        loaded: componentMap.size,
        failed: failedComponents,
      };

      // Only show hard error if ALL components failed
      if (componentMap.size === 0 && failedComponents.length > 0) {
        loadError = `Failed to load: ${failedComponents.join(', ')}`;
      } else {
        loadError = null;  // Clear any previous error
      }

      isLoading = false;
    });
  });

  function getComponent(name: string): SvelteComponent | null {
    return loadedComponents.get(name) ?? null;
  }
</script>

{#if isLoading}
  <div class="decoration-loading" aria-busy="true">
    <span class="sr-only">Loading decoration...</span>
  </div>
{:else if loadError}
  <div class="decoration-error" role="alert">
    Failed to load decoration
  </div>
{:else}
  <div
    class="decoration decoration--{zone} {className}"
    style:--opacity={decoration.options.opacity}
  >
    {#each decoration.scene.assets as asset (asset.id)}
      {@const Component = getComponent(asset.componentName)}
      {#if Component}
        <div
          class="placed-asset"
          style:left="{asset.position.x}px"
          style:top="{asset.position.y}px"
          style:transform="scale({asset.scale}) rotate({asset.rotation}deg)"
          style:z-index={asset.zIndex}
        >
          <Component {...asset.props} />
        </div>
      {/if}
    {/each}

    <!-- Partial load notification - shows when some but not all components loaded -->
    {#if hasPartialFailure}
      <div
        class="decoration-partial-warning"
        role="status"
        aria-live="polite"
      >
        <span class="sr-only">
          {loadStats.loaded} of {loadStats.total} decorations loaded.
          Missing: {loadStats.failed.join(', ')}
        </span>
        <span class="decoration-partial-badge" title="Some elements couldn't load">
          {loadStats.loaded}/{loadStats.total}
        </span>
      </div>
    {/if}
  </div>
{/if}

<style>
  .decoration-partial-warning {
    position: absolute;
    bottom: 4px;
    right: 4px;
    pointer-events: none;
  }

  .decoration-partial-badge {
    display: inline-block;
    padding: 2px 6px;
    font-size: 10px;
    background: rgba(255, 193, 7, 0.9);
    color: #333;
    border-radius: 4px;
    font-weight: 500;
  }
</style>
```

### Security: Zod Validation for Decorations

Community decorations (shared by other users) must be validated before rendering to prevent injection attacks.

**Schema: `packages/engine/src/lib/schemas/decoration.ts`**

```typescript
import { z } from 'zod';
import {
  assetsByCategory,
  assetRegistry,
} from '../ui/components/terrarium/assetRegistry.generated';

// Get all valid component names at runtime
const validComponentNames = Object.values(assetsByCategory).flat();

/**
 * Component-specific prop schemas
 * Each component defines expected prop types in the registry
 */
const PropSchemas: Record<string, z.ZodSchema> = {
  // Trees
  OakTree: z.object({
    season: z.enum(['spring', 'summer', 'autumn', 'winter']).optional(),
    size: z.enum(['small', 'medium', 'large']).optional(),
  }),
  PineTree: z.object({
    snowCapped: z.boolean().optional(),
    size: z.enum(['small', 'medium', 'large']).optional(),
  }),
  WillowTree: z.object({
    windSpeed: z.number().min(0).max(1).optional(),
  }),

  // Creatures
  Firefly: z.object({
    glowColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    flickerSpeed: z.number().min(0.1).max(2).optional(),
  }),
  Butterfly: z.object({
    wingPattern: z.enum(['monarch', 'blue', 'swallowtail']).optional(),
    flutterSpeed: z.number().min(0.5).max(2).optional(),
  }),
  Bird: z.object({
    species: z.enum(['robin', 'bluebird', 'cardinal', 'sparrow']).optional(),
  }),

  // Botanical
  Flower: z.object({
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    bloomStage: z.enum(['bud', 'partial', 'full']).optional(),
  }),
  Mushroom: z.object({
    variant: z.enum(['red', 'brown', 'white', 'glowing']).optional(),
  }),
  Fern: z.object({
    unfurled: z.boolean().optional(),
  }),

  // Ground
  Rock: z.object({
    mossy: z.boolean().optional(),
    variant: z.number().int().min(1).max(5).optional(),
  }),
  Grass: z.object({
    density: z.enum(['sparse', 'medium', 'dense']).optional(),
  }),

  // Weather
  Cloud: z.object({
    opacity: z.number().min(0.1).max(1).optional(),
    variant: z.number().int().min(1).max(3).optional(),
  }),
  Raindrop: z.object({
    intensity: z.enum(['light', 'medium', 'heavy']).optional(),
  }),

  // Structural
  Lattice: z.object({
    style: z.enum(['wooden', 'metal', 'vine-covered']).optional(),
    width: z.number().min(50).max(400).optional(),
  }),
  Fence: z.object({
    style: z.enum(['picket', 'rustic', 'stone']).optional(),
    segments: z.number().int().min(1).max(10).optional(),
  }),
};

// Fallback for components without specific schemas
const DefaultPropSchema = z.record(
  z.union([z.string(), z.number(), z.boolean()])
).refine(
  (obj) => Object.keys(obj).length <= 10,
  { message: 'Too many props (max 10)' }
);

/**
 * Get prop schema for a component, with fallback
 */
function getPropSchema(componentName: string): z.ZodSchema {
  return PropSchemas[componentName] ?? DefaultPropSchema;
}

/**
 * Validate props against component schema
 */
export function validateAssetProps(
  componentName: string,
  props: Record<string, unknown>
): { valid: boolean; errors?: string[] } {
  const schema = getPropSchema(componentName);
  const result = schema.safeParse(props);

  if (result.success) {
    return { valid: true };
  }

  return {
    valid: false,
    errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
  };
}

const PlacedAssetSchema = z.object({
  id: z.string().uuid(),
  componentName: z.enum(validComponentNames as [string, ...string[]]),
  category: z.enum([
    'trees', 'creatures', 'botanical', 'ground',
    'sky', 'structural', 'water', 'weather'
  ]),
  position: z.object({
    x: z.number().min(-1000).max(5000),
    y: z.number().min(-1000).max(5000),
  }),
  scale: z.number().min(0.1).max(5),
  rotation: z.number().min(-360).max(360),
  zIndex: z.number().int().min(0).max(1000),
  props: z.record(z.union([z.string(), z.number(), z.boolean()])),
  animationEnabled: z.boolean(),
}).refine(
  (asset) => validateAssetProps(asset.componentName, asset.props).valid,
  (asset) => ({
    message: `Invalid props for ${asset.componentName}: ${
      validateAssetProps(asset.componentName, asset.props).errors?.join(', ')
    }`,
    path: ['props'],
  })
);

const CanvasSettingsSchema = z.object({
  width: z.number().min(200).max(4000),
  height: z.number().min(200).max(4000),
  background: z.string().max(100),
  gridEnabled: z.boolean(),
  gridSize: z.union([z.literal(16), z.literal(32), z.literal(64)]),
});

export const TerrariumSceneSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  version: z.literal(1),
  canvas: CanvasSettingsSchema,
  assets: z.array(PlacedAssetSchema).max(200), // Max complexity budget
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const DecorationSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  zone: z.enum(['header', 'sidebar', 'footer', 'background']),
  scene: TerrariumSceneSchema,
  options: z.object({
    opacity: z.number().min(0).max(1).default(1),
  }),
  authorId: z.string().uuid(),
  isPublic: z.boolean(),
  createdAt: z.string().datetime(),
});

export type ValidatedDecoration = z.infer<typeof DecorationSchema>;
```

**Usage in API:**

```typescript
// packages/engine/src/routes/api/terrarium/decorations/+server.ts
import { DecorationSchema } from '$lib/schemas/decoration';
import { json, error } from '@sveltejs/kit';

export async function POST({ request, locals }) {
  const body = await request.json();

  // Validate with Zod
  const result = DecorationSchema.safeParse(body);
  if (!result.success) {
    throw error(400, {
      message: 'Invalid decoration data',
      errors: result.error.flatten().fieldErrors,
    });
  }

  const decoration = result.data;
  // ... save to database
}
```

**Usage in DecorationRenderer (community decorations):**

```typescript
// Before rendering community decorations, validate
import { TerrariumSceneSchema } from '$lib/schemas/decoration';

function validateScene(scene: unknown): scene is TerrariumScene {
  const result = TerrariumSceneSchema.safeParse(scene);
  if (!result.success) {
    console.error('Invalid scene data:', result.error);
    return false;
  }
  return true;
}
```

---

## Implementation Phases

### Phase 1: Playable Demo
**Goal:** Something you can use and show people

**Deliverables:**
- `/terrarium` route with full-screen layout
- Canvas with pan (no zoom)
- Asset palette with 10 starter assets
- Drag-from-palette to canvas
- Click-to-select + drag-to-move
- Delete selected (keyboard + button)
- **PNG export** (essential)
- localStorage save (single scene)

**Files:**
```
packages/engine/src/lib/ui/components/terrarium/
├── Terrarium.svelte
├── Canvas.svelte
├── AssetPalette.svelte
├── PlacedAsset.svelte
├── Toolbar.svelte
├── ExportDialog.svelte
├── terrariumState.svelte.ts
├── types.ts
└── utils/
    └── export.ts

packages/engine/src/routes/terrarium/
├── +page.svelte
└── +layout.svelte
```

### Phase 2: Full Creative Tool
**Goal:** Production-ready terrarium

**Deliverables:**
- Full asset registry (60+ via build script)
- **Search & filter** in asset palette
- Grid overlay + snap-to-grid toggle
- Props panel (Vineyard-style)
- Scale/rotation handles
- Layer ordering
- Animation toggle (global + per-asset)
- Multiple scenes (save/load/list)
- Scene naming + management
- **Complexity budget** display and warnings
- **Templates** - Pre-made starter scenes:
  - "Empty Canvas" - Blank slate
  - "Forest Clearing" - Trees, bushes, ambient creatures
  - "Night Garden" - Moon, fireflies, flowers
  - "Stream Scene" - Water, reeds, lily pads
  - "Winter Grove" - Snow-covered trees, snowfall layer

**Additional Files:**
```
├── GridOverlay.svelte
├── PropsPanel.svelte
├── PropControl.svelte
├── SelectionBox.svelte
├── SceneManager.svelte
├── SearchFilter.svelte
├── ComplexityBudget.svelte
├── TemplatesPicker.svelte
├── assetRegistry.generated.ts
├── templates/
│   ├── index.ts
│   ├── forest-clearing.json
│   ├── night-garden.json
│   ├── stream-scene.json
│   └── winter-grove.json
scripts/
└── generate-asset-registry.ts
```

### Phase 3: Foliage Integration
**Goal:** Scenes become blog decorations

**Deliverables:**
- "Export as Decoration" flow
- Zone selector + preview
- Zone constraint validation
- Foliage Decorations tab
- DecorationRenderer component
- DecorationPicker component
- API endpoints for decorations
- localStorage → PlaygroundDO migration stubs

**Additional Files:**
```
packages/engine/src/lib/ui/components/terrarium/
├── ExportAsDecoration.svelte
├── ZonePreview.svelte
└── DecorationRenderer.svelte

packages/engine/src/lib/ui/components/foliage/
└── DecorationPanel.svelte

packages/engine/src/routes/api/terrarium/
├── scenes/+server.ts
└── decorations/+server.ts
```

---

## File Structure

### Complete Structure (All Phases)

```
packages/engine/
├── src/
│   ├── lib/
│   │   ├── config/
│   │   │   └── terrarium.ts              # All limits/config
│   │   └── ui/
│   │       └── components/
│   │           ├── terrarium/
│   │           │   ├── Terrarium.svelte
│   │           │   ├── Canvas.svelte
│   │           │   ├── AssetPalette.svelte
│   │           │   ├── PaletteCategory.svelte
│   │           │   ├── PaletteItem.svelte
│   │           │   ├── PlacedAsset.svelte
│   │           │   ├── SelectionBox.svelte
│   │           │   ├── GridOverlay.svelte
│   │           │   ├── Toolbar.svelte
│   │           │   ├── PropsPanel.svelte
│   │           │   ├── PropControl.svelte
│   │           │   ├── ExportDialog.svelte
│   │           │   ├── ExportAsDecoration.svelte
│   │           │   ├── ZonePreview.svelte
│   │           │   ├── SceneManager.svelte
│   │           │   ├── DecorationRenderer.svelte
│   │           │   ├── assetRegistry.generated.ts
│   │           │   ├── terrariumState.svelte.ts
│   │           │   ├── types.ts
│   │           │   ├── utils/
│   │           │   │   ├── export.ts
│   │           │   │   ├── snap.ts
│   │           │   │   └── validation.ts
│   │           │   └── index.ts
│   │           └── foliage/
│   │               └── DecorationPanel.svelte
│   └── routes/
│       ├── terrarium/
│       │   ├── +page.svelte
│       │   ├── +page.ts
│       │   └── +layout.svelte
│       └── api/
│           └── terrarium/
│               ├── scenes/+server.ts
│               └── decorations/+server.ts
├── scripts/
│   └── generate-asset-registry.ts
└── package.json                          # Add generate script
```

---

## Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Frame rate | 60fps | With ≤20 animated assets |
| First paint | <500ms | Lighthouse |
| Asset render | <50ms | Per asset |
| Drag latency | <16ms | One frame |
| Export time | 5-10s | Complex scenes (realistic target) |

### Strategy

- **DOM-based rendering** for MVP (simpler, good for ~50 assets)
- **requestAnimationFrame batching** for animations
- **Throttle position updates** during drag (16ms)
- **Warn user** when complexity budget exceeds 80%
- **Progress indicator** during export (can take 5-10s for complex scenes)

### Export Performance Notes

PNG export via `dom-to-image-more` is CPU-intensive:
- Simple scenes (10-20 assets): 1-3 seconds
- Medium scenes (30-50 assets): 3-5 seconds
- Complex scenes (50+ assets, animations): 5-10 seconds

Show progress indicator with "Exporting..." message.

### Web Worker Export (Recommended)

For non-blocking exports, offload `dom-to-image-more` processing to a Web Worker. This prevents UI freezes during complex scene exports.

**Worker Implementation: `packages/engine/src/lib/workers/export.worker.ts`**

```typescript
import domtoimage from 'dom-to-image-more';

interface ExportMessage {
  type: 'export';
  nodeHtml: string;
  options: {
    width: number;
    height: number;
    scale: number;
    backgroundColor?: string;
  };
}

interface ExportResult {
  type: 'success' | 'error';
  dataUrl?: string;
  error?: string;
}

self.onmessage = async (event: MessageEvent<ExportMessage>) => {
  const { nodeHtml, options } = event.data;

  try {
    // Create an offscreen document fragment
    const template = document.createElement('template');
    template.innerHTML = nodeHtml;
    const node = template.content.firstElementChild as HTMLElement;

    // Generate PNG
    const dataUrl = await domtoimage.toPng(node, {
      width: options.width * options.scale,
      height: options.height * options.scale,
      style: {
        transform: `scale(${options.scale})`,
        transformOrigin: 'top left',
        backgroundColor: options.backgroundColor ?? 'transparent',
      },
    });

    self.postMessage({ type: 'success', dataUrl } satisfies ExportResult);
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : 'Export failed',
    } satisfies ExportResult);
  }
};
```

**Usage in Terrarium:**

```typescript
// packages/engine/src/lib/utils/export-scene.ts

let exportWorker: Worker | null = null;

function getExportWorker(): Worker {
  if (!exportWorker) {
    exportWorker = new Worker(
      new URL('../workers/export.worker.ts', import.meta.url),
      { type: 'module' }
    );
  }
  return exportWorker;
}

export async function exportSceneWithWorker(
  canvasNode: HTMLElement,
  options: ExportOptions
): Promise<string> {
  return new Promise((resolve, reject) => {
    const worker = getExportWorker();

    // Clone node HTML for worker
    const nodeHtml = canvasNode.outerHTML;

    worker.onmessage = (event: MessageEvent<ExportResult>) => {
      if (event.data.type === 'success' && event.data.dataUrl) {
        resolve(event.data.dataUrl);
      } else {
        reject(new Error(event.data.error ?? 'Export failed'));
      }
    };

    worker.onerror = (error) => {
      reject(new Error(`Worker error: ${error.message}`));
    };

    worker.postMessage({
      type: 'export',
      nodeHtml,
      options: {
        width: options.width,
        height: options.height,
        scale: options.scale ?? 2,
        backgroundColor: options.backgroundColor,
      },
    } satisfies ExportMessage);
  });
}

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('unload', () => {
    exportWorker?.terminate();
    exportWorker = null;
  });
}
```

**Benefits:**
- Main thread stays responsive during export
- User can continue interacting with UI
- Cancel support via `worker.terminate()`
- Progress reporting possible via additional messages

**Hybrid Export Selection:**

Worker-based export requires serializing the DOM, which adds overhead. Use adaptive selection based on scene complexity:

```typescript
// packages/engine/src/lib/utils/export-scene.ts

import { calculateSceneComplexity } from './complexity-budget';

// Empirically determined crossover points (adjust based on profiling)
const WORKER_THRESHOLD = {
  assetCount: 20,        // More than 20 assets
  complexity: 40,        // Complexity budget > 40 points
  animatedAssets: 5,     // More than 5 animated assets
};

/**
 * Determine whether to use worker or direct export
 * Worker adds ~200ms overhead but prevents UI freeze for complex scenes
 */
export function shouldUseWorker(scene: TerrariumScene): boolean {
  const assetCount = scene.assets.length;
  const complexity = calculateSceneComplexity(scene.assets);
  const animatedCount = scene.assets.filter(a => a.animationEnabled).length;

  // Use worker if ANY threshold exceeded
  return (
    assetCount > WORKER_THRESHOLD.assetCount ||
    complexity > WORKER_THRESHOLD.complexity ||
    animatedCount > WORKER_THRESHOLD.animatedAssets
  );
}

/**
 * Smart export - auto-selects direct vs worker based on scene
 */
export async function exportScene(
  canvasNode: HTMLElement,
  scene: TerrariumScene,
  options: ExportOptions
): Promise<string> {
  if (shouldUseWorker(scene)) {
    // Complex scene: use worker to keep UI responsive
    return exportSceneWithWorker(canvasNode, options);
  } else {
    // Simple scene: direct export is faster
    return exportSceneDirect(canvasNode, options);
  }
}
```

**When worker becomes beneficial:**
| Scene Type | Asset Count | Complexity | Direct Export | Worker Export |
|------------|-------------|------------|---------------|---------------|
| Simple | <20 | <40 | 0.5-1s | 0.7-1.2s (overhead) |
| Medium | 20-40 | 40-100 | 2-4s (UI freezes) | 2.2-4.2s (smooth) |
| Complex | 40+ | 100+ | 5-10s (UI frozen) | 5.2-10.2s (smooth) |

**Crossover point:** ~20 assets or 40 complexity points. Below this, direct is faster. Above, worker prevents bad UX even though total time is slightly longer.

---

## Platform Support

| Platform | Support Level | Notes |
|----------|---------------|-------|
| Desktop (mouse) | Full | Primary target |
| Tablet (touch/pencil) | Basic | Drag, tap, tested on iPad |
| Phone | Unsupported | Too small, show warning |

### Responsive Behavior

```svelte
{#if isMobileViewport}
  <div class="terrarium-mobile-warning">
    <p>Terrarium works best on larger screens.</p>
    <a href="/terrarium?demo=true">View demo anyway</a>
  </div>
{:else}
  <Terrarium />
{/if}
```

---

## Migration Strategy

### IndexedDB Storage (MVP)

Use IndexedDB for client-side storage instead of localStorage:
- IndexedDB supports 25MB+ (browser-dependent)
- localStorage limited to 5-10MB
- IndexedDB handles complex data structures better

**Storage Implementation: `packages/engine/src/lib/storage/terrarium-db.ts`**

```typescript
import { openDB, type IDBPDatabase } from 'idb';
import type { TerrariumScene } from '../types';

const DB_NAME = 'terrarium';
const DB_VERSION = 2; // Bump when schema changes
const SCENES_STORE = 'scenes';
const DECORATIONS_STORE = 'decorations';
const METADATA_STORE = 'metadata';

let db: IDBPDatabase | null = null;

async function getDB(): Promise<IDBPDatabase> {
  if (db) return db;

  db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(database, oldVersion, newVersion, transaction) {
      // Version-aware migrations
      if (oldVersion < 1) {
        // Initial schema
        const scenesStore = database.createObjectStore(SCENES_STORE, {
          keyPath: 'id',
        });
        scenesStore.createIndex('updatedAt', 'updatedAt');
        scenesStore.createIndex('name', 'name');
      }

      if (oldVersion < 2) {
        // Add decorations store and metadata
        if (!database.objectStoreNames.contains(DECORATIONS_STORE)) {
          const decorationsStore = database.createObjectStore(DECORATIONS_STORE, {
            keyPath: 'id',
          });
          decorationsStore.createIndex('zone', 'zone');
          decorationsStore.createIndex('createdAt', 'createdAt');
        }

        if (!database.objectStoreNames.contains(METADATA_STORE)) {
          database.createObjectStore(METADATA_STORE, { keyPath: 'key' });
        }

        // Migrate existing scenes to add version field
        const scenesStore = transaction.objectStore(SCENES_STORE);
        scenesStore.openCursor().then(function migrateScene(cursor) {
          if (!cursor) return;
          const scene = cursor.value;
          if (!scene.version) {
            scene.version = 1;
            cursor.update(scene);
          }
          cursor.continue().then(migrateScene);
        });
      }

      // Future migrations go here:
      // if (oldVersion < 3) { ... }
    },
    blocked() {
      // Another tab has an older version open and won't close
      console.warn('Database upgrade blocked by another tab');

      // Show persistent toast with action
      toast.warning(
        'Please close other Grove tabs to complete the upgrade',
        {
          duration: Infinity,  // Don't auto-dismiss
          action: {
            label: 'Retry',
            onClick: () => window.location.reload(),
          },
        }
      );

      // If user refuses: Scene editing works but saves fail silently
      // User can continue browsing but changes won't persist
      // On next page load with single tab, upgrade completes normally
    },
    blocking() {
      // This tab is blocking an upgrade in another tab
      // Close DB gracefully so the other tab can upgrade
      db?.close();
      db = null;

      // Notify user their tab will refresh
      toast.info('Updating Terrarium... refreshing in 3 seconds');
      setTimeout(() => window.location.reload(), 3000);
    },
  });

  return db;
}

export async function saveScene(scene: TerrariumScene): Promise<void> {
  const database = await getDB();
  await database.put(SCENES_STORE, scene);
}

export async function getScene(id: string): Promise<TerrariumScene | undefined> {
  const database = await getDB();
  return database.get(SCENES_STORE, id);
}

export async function getAllScenes(): Promise<TerrariumScene[]> {
  const database = await getDB();
  return database.getAllFromIndex(SCENES_STORE, 'updatedAt');
}

export async function deleteScene(id: string): Promise<void> {
  const database = await getDB();
  await database.delete(SCENES_STORE, id);
}
```

### IndexedDB → PlaygroundDO Migration

When PlaygroundDO ships (Golden Hour):

```typescript
import { getAllScenes } from '$lib/storage/terrarium-db';

async function migrateToPlaygroundDO(userId: string): Promise<void> {
  const scenes = await getAllScenes();
  if (scenes.length === 0) return;

  let migrated = 0;
  for (const scene of scenes) {
    try {
      await fetch('/api/terrarium/scenes', {
        method: 'POST',
        body: JSON.stringify(scene),
      });
      migrated++;
    } catch (err) {
      console.error(`Failed to migrate scene ${scene.id}:`, err);
    }
  }

  // Mark as migrated in IndexedDB metadata
  const database = await getDB();
  await database.put('metadata', { key: 'migrated', value: true, migratedAt: new Date().toISOString() });

  toast.success(`Migrated ${migrated}/${scenes.length} scenes to your account!`);
}
```

### Fallback Behavior

- If DO unavailable, fall back to IndexedDB
- Sync when connection restored
- IndexedDB remains offline backup
- Check for pending local changes on app load

---

## Future Considerations (Post-MVP)

- **Undo/redo** - Command pattern architecture
- **Multi-select** - Marquee selection, group operations
- **Real-time collaboration** - WebSocket via PlaygroundDO
- **SVG export** - Vector format for scalability
- **Custom images** - Drag from user's CDN/gallery
- **Community decorations** - Browse/share (Oak+)

---

## Keyboard Shortcuts

| Action | Shortcut | Notes |
|--------|----------|-------|
| **Selection** | | |
| Select all | `Cmd/Ctrl + A` | Selects all assets |
| Deselect | `Escape` | Clears selection |
| Delete selected | `Delete` or `Backspace` | Removes selected asset |
| **Clipboard** | | |
| Duplicate | `Cmd/Ctrl + D` | Duplicate selected asset |
| Copy | `Cmd/Ctrl + C` | Copy to clipboard (future) |
| Paste | `Cmd/Ctrl + V` | Paste from clipboard (future) |
| **Navigation** | | |
| Pan canvas | `Space + Drag` | Hold space, then drag |
| Pan canvas | `Middle mouse drag` | Middle button pan |
| **Layers** | | |
| Bring forward | `]` | Move layer up one |
| Send backward | `[` | Move layer down one |
| Bring to front | `Shift + ]` | Move to top layer |
| Send to back | `Shift + [` | Move to bottom layer |
| **View** | | |
| Toggle grid | `G` | Show/hide snap grid |
| Toggle animations | `A` | Enable/disable animations |
| **Saving** | | |
| Save scene | `Cmd/Ctrl + S` | Manual save (also auto-saves) |

### Focus Management

- `Tab` cycles through palette categories
- `Arrow keys` navigate within palette
- `Enter` places selected palette asset at canvas center
- `Escape` returns focus to canvas from panels

---

## Accessibility

### WCAG 2.1 AA Compliance Targets

**Perceivable:**
- All interactive elements have visible focus indicators
- Color contrast ≥4.5:1 for text, ≥3:1 for graphics
- Animation respects `prefers-reduced-motion`
- Non-text content has text alternatives

**Operable:**
- All functionality available via keyboard
- No time limits on interactions
- Users can pause/stop animations
- Focus order follows logical reading order

**Understandable:**
- Consistent navigation patterns
- Error messages identify and explain issues
- Labels and instructions provided

**Robust:**
- Valid HTML semantics
- ARIA attributes where needed
- Works with screen readers

### Screen Reader Support

```svelte
<!-- Asset palette item -->
<button
  class="palette-item"
  role="option"
  aria-selected={isSelected}
  aria-label="{asset.displayName}, {asset.category}"
  onclick={() => selectAsset(asset)}
>
  <AssetPreview {asset} aria-hidden="true" />
  <span class="sr-only">
    {asset.isAnimated ? 'Animated' : 'Static'} {asset.displayName}
  </span>
</button>

<!-- Placed asset on canvas -->
<div
  class="placed-asset"
  role="img"
  aria-label="{asset.displayName} at position {asset.position.x}, {asset.position.y}"
  tabindex="0"
  on:focus={() => selectAsset(asset.id)}
>
```

### Reduced Motion Support

```svelte
<script>
  import { browser } from '$app/environment';

  let prefersReducedMotion = $state(false);

  if (browser) {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    prefersReducedMotion = mediaQuery.matches;
    mediaQuery.addEventListener('change', (e) => {
      prefersReducedMotion = e.matches;
    });
  }
</script>

{#if !prefersReducedMotion && animationsEnabled}
  <AnimatedFirefly {props} />
{:else}
  <StaticFirefly {props} />
{/if}
```

### Live Regions

```svelte
<!-- Announce actions to screen readers -->
<div aria-live="polite" class="sr-only" bind:this={announcer}>
  {announcement}
</div>

<script>
  let announcement = $state('');

  function announce(message: string) {
    announcement = '';
    // Force DOM update
    requestAnimationFrame(() => {
      announcement = message;
    });
  }

  // Usage
  function deleteAsset(id: string) {
    const asset = getAsset(id);
    removeAsset(id);
    announce(`${asset.displayName} deleted`);
  }
</script>
```

---

## Auto-Save Behavior

### Save Triggers

1. **Debounced auto-save** - 2 seconds after last change
2. **Interval save** - Every 30 seconds during activity
3. **Before unload** - When user navigates away
4. **Manual save** - `Cmd/Ctrl + S`

### Implementation

```typescript
// packages/engine/src/lib/ui/components/terrarium/autoSave.svelte.ts

import { TERRARIUM_CONFIG } from '$lib/config/terrarium';
import { saveScene } from '$lib/storage/terrarium-db';

export function createAutoSave(getScene: () => TerrariumScene) {
  let saveTimeout: ReturnType<typeof setTimeout> | null = null;
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let lastSavedHash = '';
  let isSaving = $state(false);
  let lastSaved = $state<Date | null>(null);

  const { debounceMs, maxIntervalMs } = TERRARIUM_CONFIG.autoSave;

  // Stable hash using object-hash library for production reliability
  // Handles circular references, special types (Date, Map, Set), and property ordering
  import objectHash from 'object-hash';

  function hashScene(scene: TerrariumScene): string {
    return objectHash({
      assets: scene.assets,
      canvas: scene.canvas,
      name: scene.name,
    }, {
      algorithm: 'md5',
      encoding: 'hex',
      respectType: false,  // Treat {a:1} same as class instance with a=1
      unorderedArrays: false,  // Asset order matters
      unorderedObjects: true,  // Property order doesn't matter
      unorderedSets: true,
    });
  }

  // Alternative: Simple implementation for environments without object-hash
  // Note: Does not handle circular refs, Date objects, or Map/Set
  function hashSceneFallback(scene: TerrariumScene): string {
    const stableStringify = (obj: unknown): string => {
      if (obj === null || typeof obj !== 'object') {
        return JSON.stringify(obj);
      }
      if (Array.isArray(obj)) {
        return '[' + obj.map(stableStringify).join(',') + ']';
      }
      const sortedKeys = Object.keys(obj).sort();
      const pairs = sortedKeys.map(
        key => `${JSON.stringify(key)}:${stableStringify((obj as Record<string, unknown>)[key])}`
      );
      return '{' + pairs.join(',') + '}';
    };

    return stableStringify({
      assets: scene.assets,
      canvas: scene.canvas,
      name: scene.name,
    });
  }

  async function save(): Promise<void> {
    const scene = getScene();
    const hash = hashScene(scene);

    // Skip if no changes
    if (hash === lastSavedHash) return;

    isSaving = true;
    try {
      await saveScene({
        ...scene,
        updatedAt: new Date().toISOString(),
      });
      lastSavedHash = hash;
      lastSaved = new Date();
    } finally {
      isSaving = false;
    }
  }

  function scheduleSave(): void {
    // Debounce
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(save, debounceMs);
  }

  function startInterval(): void {
    intervalId = setInterval(save, maxIntervalMs);
  }

  function stopInterval(): void {
    if (intervalId) clearInterval(intervalId);
  }

  // Save before unload
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      save();
    });
  }

  return {
    get isSaving() { return isSaving; },
    get lastSaved() { return lastSaved; },
    scheduleSave,
    save,
    startInterval,
    stopInterval,
  };
}
```

### UI Indicator

```svelte
<!-- SaveIndicator.svelte -->
<script lang="ts">
  interface Props {
    isSaving: boolean;
    lastSaved: Date | null;
  }

  let { isSaving, lastSaved }: Props = $props();

  let timeAgo = $derived(
    lastSaved
      ? formatTimeAgo(lastSaved)
      : 'Not saved'
  );
</script>

<div class="save-indicator" aria-live="polite">
  {#if isSaving}
    <span class="saving">Saving...</span>
  {:else}
    <span class="saved">Saved {timeAgo}</span>
  {/if}
</div>
```

---

## Touch Interactions

### Supported Gestures

| Gesture | Action | Notes |
|---------|--------|-------|
| **Single tap** | Select asset | Or deselect if tapping canvas |
| **Tap + drag** | Move asset | Drag selected asset |
| **Long press** | Context menu | Shows duplicate/delete options |
| **Two-finger pan** | Pan canvas | Move viewport |
| **Pinch** | Zoom canvas | Future: Canvas zoom |
| **Two-finger rotate** | Rotate asset | Future enhancement |

### Touch Event Handling

```typescript
// packages/engine/src/lib/ui/components/terrarium/touchHandlers.ts

interface TouchState {
  isMultiTouch: boolean;
  startDistance: number;
  startCenter: { x: number; y: number };
}

export function setupTouchHandlers(canvas: HTMLElement) {
  let touchState: TouchState | null = null;
  let longPressTimer: ReturnType<typeof setTimeout> | null = null;

  // Track touch start position to detect scroll intent
  let touchStartPos: { x: number; y: number } | null = null;
  const SCROLL_INTENT_THRESHOLD = 10; // pixels of movement before canceling long press

  function handleTouchStart(e: TouchEvent) {
    if (e.touches.length === 1) {
      // Single touch - potential tap, drag, or scroll
      const touch = e.touches[0];

      // Record start position for scroll intent detection
      touchStartPos = { x: touch.clientX, y: touch.clientY };

      // Delay long press timer slightly to allow scroll detection
      longPressTimer = setTimeout(() => {
        // Only show context menu if user hasn't started scrolling
        if (touchStartPos) {
          dispatchContextMenu(touch.clientX, touch.clientY);
        }
      }, 500);
    } else if (e.touches.length === 2) {
      // Multi-touch - pan/zoom
      e.preventDefault();
      cancelLongPress();
      touchState = {
        isMultiTouch: true,
        startDistance: getTouchDistance(e.touches),
        startCenter: getTouchCenter(e.touches),
      };
    }
  }

  function handleTouchMove(e: TouchEvent) {
    // Detect scroll intent - if finger moves more than threshold, cancel long press
    if (touchStartPos && e.touches.length === 1) {
      const touch = e.touches[0];
      const deltaX = Math.abs(touch.clientX - touchStartPos.x);
      const deltaY = Math.abs(touch.clientY - touchStartPos.y);

      if (deltaX > SCROLL_INTENT_THRESHOLD || deltaY > SCROLL_INTENT_THRESHOLD) {
        // User is scrolling, not trying to long press
        cancelLongPress();
        touchStartPos = null;
      }
    }

    // Original touchmove handling
    cancelLongPress();

    if (e.touches.length === 2 && touchState?.isMultiTouch) {
      e.preventDefault();
      const newCenter = getTouchCenter(e.touches);
      const deltaX = newCenter.x - touchState.startCenter.x;
      const deltaY = newCenter.y - touchState.startCenter.y;
      panCanvas(deltaX, deltaY);
      touchState.startCenter = newCenter;
    }
  }

  function handleTouchEnd(e: TouchEvent) {
    cancelLongPress();
    touchState = null;
    touchStartPos = null;  // Reset scroll detection
  }

  function cancelLongPress() {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  }

  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
  canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
  canvas.addEventListener('touchend', handleTouchEnd);

  return () => {
    canvas.removeEventListener('touchstart', handleTouchStart);
    canvas.removeEventListener('touchmove', handleTouchMove);
    canvas.removeEventListener('touchend', handleTouchEnd);
  };
}

function getTouchDistance(touches: TouchList): number {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function getTouchCenter(touches: TouchList): { x: number; y: number } {
  return {
    x: (touches[0].clientX + touches[1].clientX) / 2,
    y: (touches[0].clientY + touches[1].clientY) / 2,
  };
}
```

### iPad-Specific Considerations

- Support Apple Pencil for precise asset placement
- Pencil hover (M2+ iPads) shows asset preview
- Palm rejection during pencil use
- Side panel adapts to landscape/portrait

---

## Testing Strategy

### Unit Tests

```typescript
// packages/engine/src/lib/utils/__tests__/complexity.test.ts

import { describe, it, expect } from 'vitest';
import {
  getAssetComplexity,
  calculateSceneComplexity,
  canAddAsset,
  isAtWarningThreshold,
  getRemainingBudget,
} from '../complexity';

describe('Complexity Budget', () => {
  const normalAsset = { componentName: 'Rock', scale: 1, animationEnabled: false };
  const animatedAsset = { componentName: 'Firefly', scale: 1, animationEnabled: true };
  const scaledAsset = { componentName: 'TreePine', scale: 2.0, animationEnabled: false };

  it('calculates normal asset cost', () => {
    expect(getAssetComplexity(normalAsset)).toBe(1);
  });

  it('calculates animated asset cost', () => {
    expect(getAssetComplexity(animatedAsset)).toBe(5);
  });

  it('calculates scaled asset cost', () => {
    expect(getAssetComplexity(scaledAsset)).toBe(2);
  });

  it('calculates scene complexity', () => {
    const assets = [normalAsset, animatedAsset, scaledAsset];
    expect(calculateSceneComplexity(assets)).toBe(8);
  });

  it('prevents exceeding budget', () => {
    const nearMaxAssets = Array(195).fill(normalAsset);
    const result = canAddAsset(nearMaxAssets, animatedAsset);
    expect(result.allowed).toBe(false);
    expect(result.wouldExceed).toBe(true);
  });

  it('detects warning threshold', () => {
    const assets = Array(160).fill(normalAsset); // 80% of 200
    expect(isAtWarningThreshold(assets)).toBe(true);
  });
});
```

### Integration Tests

```typescript
// packages/engine/src/lib/storage/__tests__/terrarium-db.test.ts

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { saveScene, getScene, getAllScenes, deleteScene } from '../terrarium-db';
import 'fake-indexeddb/auto';

describe('Terrarium IndexedDB Storage', () => {
  const mockScene = {
    id: 'test-123',
    name: 'Test Scene',
    version: 1,
    canvas: { width: 800, height: 600, background: '#fff', gridEnabled: false, gridSize: 32 },
    assets: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  afterEach(async () => {
    await deleteScene(mockScene.id);
  });

  it('saves and retrieves a scene', async () => {
    await saveScene(mockScene);
    const retrieved = await getScene(mockScene.id);
    expect(retrieved).toEqual(mockScene);
  });

  it('lists all scenes', async () => {
    await saveScene(mockScene);
    const all = await getAllScenes();
    expect(all.length).toBeGreaterThan(0);
  });

  it('deletes a scene', async () => {
    await saveScene(mockScene);
    await deleteScene(mockScene.id);
    const retrieved = await getScene(mockScene.id);
    expect(retrieved).toBeUndefined();
  });
});
```

### E2E Tests

```typescript
// packages/engine/e2e/terrarium.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Terrarium Canvas', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/terrarium');
  });

  test('loads the terrarium page', async ({ page }) => {
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByTestId('asset-palette')).toBeVisible();
    await expect(page.getByTestId('canvas')).toBeVisible();
  });

  test('drags asset from palette to canvas', async ({ page }) => {
    const paletteItem = page.getByTestId('palette-item-TreePine');
    const canvas = page.getByTestId('canvas');

    await paletteItem.dragTo(canvas);

    await expect(page.getByTestId('placed-asset')).toBeVisible();
  });

  test('exports scene as PNG', async ({ page }) => {
    // Add an asset first
    await page.getByTestId('palette-item-Rock').click();
    await page.getByTestId('canvas').click();

    // Export
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export PNG' }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/\.png$/);
  });

  test('keyboard shortcuts work', async ({ page }) => {
    // Add and select an asset
    await page.getByTestId('palette-item-Rock').click();
    await page.getByTestId('canvas').click();
    await page.getByTestId('placed-asset').click();

    // Duplicate with Cmd+D
    await page.keyboard.press('Meta+d');
    const assets = page.getByTestId('placed-asset');
    await expect(assets).toHaveCount(2);

    // Delete with Backspace
    await page.keyboard.press('Backspace');
    await expect(assets).toHaveCount(1);
  });
});
```

### Accessibility Tests

```typescript
// packages/engine/e2e/terrarium-a11y.spec.ts

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Terrarium Accessibility', () => {
  test('has no WCAG violations', async ({ page }) => {
    await page.goto('/terrarium');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('supports keyboard navigation', async ({ page }) => {
    await page.goto('/terrarium');

    // Tab to palette
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('asset-palette')).toBeFocused();

    // Arrow to navigate within palette
    await page.keyboard.press('ArrowDown');
    const firstItem = page.getByTestId('palette-item').first();
    await expect(firstItem).toBeFocused();
  });

  test('screen reader announcements work', async ({ page }) => {
    await page.goto('/terrarium');

    // Add an asset
    await page.getByTestId('palette-item-Rock').click();
    await page.getByTestId('canvas').click();

    // Check live region
    const liveRegion = page.locator('[aria-live="polite"]');
    await expect(liveRegion).toContainText('Rock added');
  });
});
```

---

## Community Decorations Security

### Rate Limiting

```typescript
// packages/engine/src/routes/api/terrarium/decorations/+server.ts

import { rateLimit } from '$lib/middleware/rate-limit';

const decorationRateLimit = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: {
    GET: 100,           // 100 reads/min
    POST: 10,           // 10 creates/min
    PUT: 20,            // 20 updates/min
    DELETE: 5,          // 5 deletes/min
  },
  keyGenerator: (event) => event.locals.user?.id ?? event.getClientAddress(),
});

export async function POST(event) {
  await decorationRateLimit(event, 'POST');
  // ... rest of handler
}
```

### Content Moderation

```typescript
// packages/engine/src/lib/moderation/decoration-scanner.ts

interface ModerationResult {
  approved: boolean;
  flags: string[];
  reason?: string;
}

export async function scanDecoration(decoration: Decoration): Promise<ModerationResult> {
  const flags: string[] = [];

  // 1. Check name for profanity
  if (await containsProfanity(decoration.name)) {
    flags.push('profanity_in_name');
  }

  // 2. Validate asset counts (prevent resource abuse)
  const animatedCount = decoration.scene.assets.filter(a => a.animationEnabled).length;
  if (animatedCount > 30) {
    flags.push('excessive_animations');
  }

  // 3. Check for suspicious patterns (e.g., all assets stacked in corner)
  if (detectSuspiciousLayout(decoration.scene.assets)) {
    flags.push('suspicious_layout');
  }

  return {
    approved: flags.length === 0,
    flags,
    reason: flags.length > 0 ? `Flagged: ${flags.join(', ')}` : undefined,
  };
}
```

### Storage Quotas

```typescript
// packages/engine/src/lib/utils/quota.ts

import { TERRARIUM_CONFIG } from '$lib/config/terrarium';
import type { UserTier } from '$lib/types';

export async function checkStorageQuota(
  userId: string,
  tier: UserTier
): Promise<{ withinQuota: boolean; used: number; max: number }> {
  const currentCount = await db.decorations.count({ authorId: userId });
  const maxAllowed = TERRARIUM_CONFIG.storage.maxSavedScenes[tier];

  return {
    withinQuota: currentCount < maxAllowed,
    used: currentCount,
    max: maxAllowed,
  };
}

export async function enforceQuota(userId: string, tier: UserTier): Promise<void> {
  const { withinQuota, used, max } = await checkStorageQuota(userId, tier);

  if (!withinQuota) {
    throw new QuotaExceededError(
      `Storage quota exceeded: ${used}/${max} scenes. Upgrade your plan for more.`
    );
  }
}
```

### XSS Sanitization

```typescript
// packages/engine/src/lib/utils/sanitize.ts

import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitize decoration name to prevent XSS
 */
export function sanitizeDecorationName(name: string): string {
  return DOMPurify.sanitize(name, {
    ALLOWED_TAGS: [],  // No HTML allowed
    ALLOWED_ATTR: [],
  }).trim();
}

/**
 * Sanitize props to prevent script injection
 */
export function sanitizeAssetProps(props: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(props)) {
    if (typeof value === 'string') {
      sanitized[key] = DOMPurify.sanitize(value, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      sanitized[key] = value;
    }
    // Ignore other types (functions, objects with methods, etc.)
  }

  return sanitized;
}
```

### Content Security Policy

The `/terrarium` route requires specific CSP headers to enable canvas export while blocking injection attacks.

**SvelteKit Hook: `packages/engine/src/hooks.server.ts`**

```typescript
import type { Handle } from '@sveltejs/kit';

const TERRARIUM_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",  // Required for Svelte
  "style-src 'self' 'unsafe-inline'",   // Required for dynamic styles
  "img-src 'self' data: blob:",          // Allow data URLs for export
  "font-src 'self'",
  "connect-src 'self'",
  "frame-ancestors 'none'",              // Prevent embedding
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join('; ');

const DEFAULT_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

export const handle: Handle = async ({ event, resolve }) => {
  const response = await resolve(event);

  // Apply stricter CSP for Terrarium route
  const csp = event.url.pathname.startsWith('/terrarium')
    ? TERRARIUM_CSP
    : DEFAULT_CSP;

  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
};
```

**Key CSP Decisions:**
- `img-src blob:` - Required for `dom-to-image-more` canvas export
- `script-src 'unsafe-inline'` - Required for Svelte's hydration (consider nonces for production)
- `frame-ancestors 'none'` - Prevent clickjacking attacks on the editor

### Thumbnail Validation

Decoration thumbnails must be validated before storage to prevent malicious uploads.

**Validation: `packages/engine/src/lib/utils/thumbnail-validator.ts`**

```typescript
import { error } from '@sveltejs/kit';

interface ThumbnailValidation {
  valid: boolean;
  error?: string;
}

// Allowed formats (magic bytes)
const ALLOWED_SIGNATURES = {
  png: [0x89, 0x50, 0x4e, 0x47],  // PNG signature
  jpeg: [0xff, 0xd8, 0xff],       // JPEG signature
  webp: [0x52, 0x49, 0x46, 0x46], // RIFF (WebP container)
};

const MAX_THUMBNAIL_SIZE = 512 * 1024; // 512KB
const MAX_DIMENSIONS = { width: 800, height: 600 };
const MIN_DIMENSIONS = { width: 100, height: 75 };

/**
 * Validate thumbnail data URL before storage
 */
export async function validateThumbnail(
  dataUrl: string
): Promise<ThumbnailValidation> {
  // 1. Check data URL format
  if (!dataUrl.startsWith('data:image/')) {
    return { valid: false, error: 'Invalid data URL format' };
  }

  // 2. Extract MIME type and base64 data
  const matches = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!matches) {
    return { valid: false, error: 'Malformed data URL' };
  }

  const [, mimeType, base64Data] = matches;

  // 3. Check allowed MIME types
  if (!['png', 'jpeg', 'webp'].includes(mimeType)) {
    return { valid: false, error: `Unsupported format: ${mimeType}` };
  }

  // 4. Decode and check size
  const binaryData = atob(base64Data);
  if (binaryData.length > MAX_THUMBNAIL_SIZE) {
    return {
      valid: false,
      error: `Thumbnail too large: ${binaryData.length} bytes (max ${MAX_THUMBNAIL_SIZE})`,
    };
  }

  // 5. Verify magic bytes match claimed MIME type
  const bytes = new Uint8Array(binaryData.length);
  for (let i = 0; i < binaryData.length; i++) {
    bytes[i] = binaryData.charCodeAt(i);
  }

  const signature = ALLOWED_SIGNATURES[mimeType as keyof typeof ALLOWED_SIGNATURES];
  const headerBytes = Array.from(bytes.slice(0, signature.length));

  if (!signature.every((byte, i) => headerBytes[i] === byte)) {
    return {
      valid: false,
      error: 'File signature does not match claimed type',
    };
  }

  // 6. Validate dimensions using ImageBitmap (browser) or sharp (server)
  try {
    const dimensions = await getImageDimensions(dataUrl);

    if (dimensions.width > MAX_DIMENSIONS.width ||
        dimensions.height > MAX_DIMENSIONS.height) {
      return {
        valid: false,
        error: `Dimensions too large: ${dimensions.width}x${dimensions.height} (max ${MAX_DIMENSIONS.width}x${MAX_DIMENSIONS.height})`,
      };
    }

    if (dimensions.width < MIN_DIMENSIONS.width ||
        dimensions.height < MIN_DIMENSIONS.height) {
      return {
        valid: false,
        error: `Dimensions too small: ${dimensions.width}x${dimensions.height} (min ${MIN_DIMENSIONS.width}x${MIN_DIMENSIONS.height})`,
      };
    }
  } catch (err) {
    return { valid: false, error: 'Failed to read image dimensions' };
  }

  // 7. Strip EXIF data (privacy concern)
  // Note: PNG doesn't have EXIF, but JPEG/WebP might
  // Use a library like 'piexifjs' for production

  return { valid: true };
}

/**
 * Get image dimensions from data URL
 */
async function getImageDimensions(
  dataUrl: string
): Promise<{ width: number; height: number }> {
  // Browser context
  if (typeof window !== 'undefined' && 'createImageBitmap' in window) {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);
    const { width, height } = bitmap;
    bitmap.close();
    return { width, height };
  }

  // Server context - use probe-image-size or similar
  throw new Error('Server-side dimension checking requires additional setup');
}
```

**Usage in API:**

```typescript
// packages/engine/src/routes/api/terrarium/decorations/+server.ts
import { validateThumbnail } from '$lib/utils/thumbnail-validator';

export async function POST({ request, locals }) {
  const { thumbnail, ...decorationData } = await request.json();

  // Validate thumbnail before processing
  const thumbnailResult = await validateThumbnail(thumbnail);
  if (!thumbnailResult.valid) {
    throw error(400, {
      message: 'Invalid thumbnail',
      reason: thumbnailResult.error,
    });
  }

  // Continue with decoration creation...
}
```

---

## API Endpoints

### Scene Management

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/terrarium/scenes` | List user's scenes | Required |
| `GET` | `/api/terrarium/scenes/:id` | Get single scene | Required |
| `POST` | `/api/terrarium/scenes` | Create new scene | Required |
| `PUT` | `/api/terrarium/scenes/:id` | Update scene | Required |
| `DELETE` | `/api/terrarium/scenes/:id` | Delete scene | Required |

### Decoration Management

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/terrarium/decorations` | List user's decorations | Required |
| `GET` | `/api/terrarium/decorations/community` | Browse public decorations | Oak+ |
| `POST` | `/api/terrarium/decorations` | Create decoration from scene | Required |
| `POST` | `/api/terrarium/decorations/:id/publish` | Make decoration public | Evergreen |
| `DELETE` | `/api/terrarium/decorations/:id` | Delete decoration | Required |

### Request/Response Examples

**Create Scene:**
```typescript
// POST /api/terrarium/scenes
// Request
{
  "name": "My Forest",
  "canvas": {
    "width": 1200,
    "height": 800,
    "background": "linear-gradient(to bottom, #87CEEB, #228B22)",
    "gridEnabled": true,
    "gridSize": 32
  },
  "assets": [
    {
      "componentName": "TreePine",
      "position": { "x": 100, "y": 200 },
      "scale": 1.5,
      "rotation": 0,
      "zIndex": 1,
      "props": { "height": 200, "snowCovered": false },
      "animationEnabled": false
    }
  ]
}

// Response (201 Created)
{
  "id": "scene_abc123",
  "name": "My Forest",
  "version": 1,
  "canvas": { ... },
  "assets": [ ... ],
  "createdAt": "2026-01-04T12:00:00Z",
  "updatedAt": "2026-01-04T12:00:00Z"
}
```

**Export as Decoration:**
```typescript
// POST /api/terrarium/decorations
// Request
{
  "name": "Forest Header",
  "zone": "header",
  "sceneId": "scene_abc123",
  "options": {
    "opacity": 0.9
  }
}

// Response (201 Created)
{
  "id": "deco_xyz789",
  "name": "Forest Header",
  "zone": "header",
  "scene": { ... },
  "options": { "opacity": 0.9 },
  "thumbnail": "https://cdn.grove.example/thumbs/deco_xyz789.png",
  "authorId": "user_123",
  "isPublic": false,
  "createdAt": "2026-01-04T12:00:00Z"
}
```

---

*Spec created: January 2026*
*Updated: January 2026 (PR feedback integration)*
*Target: MVP by Full Bloom, Full version by Golden Hour*
