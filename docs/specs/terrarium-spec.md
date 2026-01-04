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
11. [Keyboard Shortcuts](#keyboard-shortcuts)
12. [Accessibility](#accessibility)
13. [Auto-Save Behavior](#auto-save-behavior)
14. [Touch Interactions](#touch-interactions)

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
  import { onMount } from 'svelte';
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

  onMount(async () => {
    try {
      // Get unique component names from scene
      const componentNames = [...new Set(
        decoration.scene.assets.map(a => a.componentName)
      )];

      // Load all components in parallel
      const loadPromises = componentNames.map(async (name) => {
        const definition = assetRegistry[name];
        if (!definition) {
          throw new Error(`Unknown component: ${name}`);
        }
        const module = await definition.load();
        return [name, module.default] as const;
      });

      const loaded = await Promise.all(loadPromises);

      // Store in Map
      loadedComponents = new Map(loaded);
      isLoading = false;
    } catch (err) {
      loadError = err instanceof Error ? err.message : 'Failed to load components';
      isLoading = false;
    }
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
  </div>
{/if}
```

### Security: Zod Validation for Decorations

Community decorations (shared by other users) must be validated before rendering to prevent injection attacks.

**Schema: `packages/engine/src/lib/schemas/decoration.ts`**

```typescript
import { z } from 'zod';
import { assetsByCategory } from '../ui/components/terrarium/assetRegistry.generated';

// Get all valid component names at runtime
const validComponentNames = Object.values(assetsByCategory).flat();

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
  props: z.record(z.unknown()),
  animationEnabled: z.boolean(),
});

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

Show progress indicator with "Exporting..." message. Consider Web Worker for non-blocking export in future version.

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
const DB_VERSION = 1;
const SCENES_STORE = 'scenes';

let db: IDBPDatabase | null = null;

async function getDB(): Promise<IDBPDatabase> {
  if (db) return db;

  db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(database) {
      if (!database.objectStoreNames.contains(SCENES_STORE)) {
        const store = database.createObjectStore(SCENES_STORE, {
          keyPath: 'id',
        });
        store.createIndex('updatedAt', 'updatedAt');
        store.createIndex('name', 'name');
      }
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

  function hashScene(scene: TerrariumScene): string {
    return JSON.stringify({
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

  function handleTouchStart(e: TouchEvent) {
    if (e.touches.length === 1) {
      // Single touch - potential tap or drag
      const touch = e.touches[0];
      longPressTimer = setTimeout(() => {
        dispatchContextMenu(touch.clientX, touch.clientY);
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

*Spec created: January 2026*
*Updated: January 2026 (PR feedback integration)*
*Target: MVP by Full Bloom, Full version by Golden Hour*
