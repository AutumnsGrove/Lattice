---
aliases: []
date created: Saturday, January 4th 2026
date modified: Saturday, January 4th 2026
tags: []
type: tech-spec
---

# Terrarium — Creative Canvas

> *A sealed world under glass—a miniature ecosystem you design, arrange, and watch grow.*

**Public Name:** Terrarium
**Internal Name:** GroveTerrar
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

---

## Overview

### The Vision

**MySpace-level customization with Grove's curated aesthetic.**

Users create scenes in Terrarium → Export as decorations → Apply via Foliage → Blogs become uniquely personal.

The component library IS the guardrail. Every tree, firefly, and lattice is curated. Users get creative freedom within Grove's nature palette.

### The Flow

```
Terrarium → Create scene (lattice + vines + fireflies)
     ↓
Export as Decoration → Choose zone (header/sidebar/footer/background)
     ↓
Foliage → "Decorations" tab in ThemeCustomizer
     ↓
Blog → DecorationRenderer displays scene in designated zone
     ↓
Community → Share decorations (Oak+) → Others import
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

Categorized sidebar with 60+ nature components:

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
    maxAssets: 100,
    maxSizeBytes: 1_000_000, // 1MB JSON
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

---

## Asset Registry

### Build-Time Generation

Instead of manually maintaining a 60+ entry registry, use a build script:

```bash
pnpm run generate:asset-registry
```

**Script: `scripts/generate-asset-registry.ts`**

```typescript
import { glob } from 'glob';
import * as fs from 'fs';
import * as path from 'path';
import ts from 'typescript';

const NATURE_PATH = 'src/lib/ui/components/nature';
const OUTPUT_PATH = 'src/lib/ui/components/terrarium/assetRegistry.generated.ts';

interface AssetMeta {
  name: string;
  displayName: string;
  category: string;
  isAnimated: boolean;
  defaultSize: { width: number; height: number };
  propSchema: PropSchema[];
}

async function generateRegistry() {
  const categories = await glob(`${NATURE_PATH}/*/`);
  const registry: Record<string, AssetMeta> = {};

  for (const categoryPath of categories) {
    const category = path.basename(categoryPath);
    const components = await glob(`${categoryPath}/*.svelte`);

    for (const componentPath of components) {
      const name = path.basename(componentPath, '.svelte');

      // Parse component to extract props
      const source = fs.readFileSync(componentPath, 'utf-8');
      const propSchema = extractPropsFromSvelte(source);
      const isAnimated = detectAnimation(source);
      const defaultSize = inferDefaultSize(name, category);

      registry[name] = {
        name,
        displayName: formatDisplayName(name),
        category,
        isAnimated,
        defaultSize,
        propSchema,
      };
    }
  }

  // Generate output file
  const output = generateOutputFile(registry);
  fs.writeFileSync(OUTPUT_PATH, output);

  console.log(`Generated registry with ${Object.keys(registry).length} assets`);
}

function extractPropsFromSvelte(source: string): PropSchema[] {
  // Parse Svelte 5 $props() declarations
  // Extract types and defaults
  // Return schema array
}

function detectAnimation(source: string): boolean {
  // Check for animation-related code
  return source.includes('animate:') ||
         source.includes('@keyframes') ||
         source.includes('transition:');
}

function formatDisplayName(name: string): string {
  // TreePine -> Pine Tree
  // LatticeWithVine -> Lattice with Vine
  return name
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .replace(/^Tree /, '')
    .concat(name.startsWith('Tree') ? ' Tree' : '');
}

generateRegistry();
```

**Generated output: `assetRegistry.generated.ts`**

```typescript
// AUTO-GENERATED - DO NOT EDIT
// Run `pnpm run generate:asset-registry` to regenerate

import type { AssetDefinition } from './types';

// Dynamic imports for code splitting
const assetImports = {
  TreePine: () => import('../nature/trees/TreePine.svelte'),
  TreeBirch: () => import('../nature/trees/TreeBirch.svelte'),
  Firefly: () => import('../nature/creatures/Firefly.svelte'),
  // ... all 60+ assets
};

export const assetRegistry: Record<string, AssetDefinition> = {
  TreePine: {
    name: 'TreePine',
    displayName: 'Pine Tree',
    category: 'trees',
    isAnimated: false,
    defaultSize: { width: 100, height: 150 },
    propSchema: [
      { key: 'height', label: 'Height', type: 'number', min: 50, max: 300, default: 150 },
      { key: 'snowCovered', label: 'Snow Covered', type: 'boolean', default: false },
    ],
    load: assetImports.TreePine,
  },
  // ... all assets
};

export const assetsByCategory = {
  trees: ['TreePine', 'TreeBirch', 'TreeCherry', 'TreeAspen'],
  creatures: ['Bee', 'Bird', 'Butterfly', 'Deer', 'Firefly', /* ... */],
  // ... all categories
};
```

### Adding New Assets

1. Create component in `src/lib/ui/components/nature/{category}/`
2. Run `pnpm run generate:asset-registry`
3. New asset automatically appears in Terrarium palette

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

```svelte
<!-- DecorationRenderer.svelte -->
<script lang="ts">
  import type { Decoration, DecorationZone } from '$lib/types';
  import { assetRegistry } from './assetRegistry.generated';

  interface Props {
    decoration: Decoration;
    zone: DecorationZone;
    class?: string;
  }

  let { decoration, zone, class: className }: Props = $props();
</script>

<div
  class="decoration decoration--{zone} {className}"
  style:--opacity={decoration.options.opacity}
>
  {#each decoration.scene.assets as asset (asset.id)}
    {@const Component = assetRegistry[asset.componentName].component}
    <div
      class="placed-asset"
      style:left="{asset.position.x}px"
      style:top="{asset.position.y}px"
      style:transform="scale({asset.scale}) rotate({asset.rotation}deg)"
      style:z-index={asset.zIndex}
    >
      <Component {...asset.props} />
    </div>
  {/each}
</div>
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
- Grid overlay + snap-to-grid toggle
- Props panel (Vineyard-style)
- Scale/rotation handles
- Layer ordering
- Animation toggle (global + per-asset)
- Multiple scenes (save/load/list)
- Scene naming + management

**Additional Files:**
```
├── GridOverlay.svelte
├── PropsPanel.svelte
├── PropControl.svelte
├── SelectionBox.svelte
├── SceneManager.svelte
├── assetRegistry.generated.ts
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
| Export time | <3s | For 100 assets |

### Strategy

- **DOM-based rendering** for MVP (simpler, good for ~50 assets)
- **requestAnimationFrame batching** for animations
- **Throttle position updates** during drag (16ms)
- **Warn user** when animated assets > 20

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

### localStorage → PlaygroundDO

When PlaygroundDO ships (Golden Hour):

```typescript
async function migrateToPlaygroundDO(userId: string): Promise<void> {
  const LOCAL_KEY = 'terrarium-scenes';
  const localData = localStorage.getItem(LOCAL_KEY);

  if (!localData) return;

  const scenes: TerrariumScene[] = JSON.parse(localData);

  for (const scene of scenes) {
    await fetch('/api/terrarium/scenes', {
      method: 'POST',
      body: JSON.stringify(scene),
    });
  }

  // Mark as migrated, keep local as backup
  localStorage.setItem(`${LOCAL_KEY}-migrated`, 'true');

  toast.success(`Migrated ${scenes.length} scenes to your account!`);
}
```

### Fallback Behavior

- If DO unavailable, fall back to localStorage
- Sync when connection restored
- localStorage remains offline backup

---

## Future Considerations (Post-MVP)

- **Undo/redo** - Command pattern architecture
- **Multi-select** - Marquee selection, group operations
- **Real-time collaboration** - WebSocket via PlaygroundDO
- **SVG export** - Vector format for scalability
- **Custom images** - Drag from user's CDN/gallery
- **Templates** - Pre-made scenes to start from
- **Community decorations** - Browse/share (Oak+)

---

*Spec created: January 2026*
*Target: MVP by Full Bloom, Full version by Golden Hour*
