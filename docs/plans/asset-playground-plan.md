# Asset Playground - Implementation Plan

> **Version**: 1.0 (Planning)
> **Route**: `/playground`
> **Inspiration**: Evolution of `/vineyard` pattern - from viewing components to composing scenes

## Overview

Create an interactive canvas-based playground where users drag and drop Grove's nature components to design custom multi-asset scenes. Think of it as the Vineyard's interactive prop controls, but spatially - users can compose grove scenes with lattices, trees, creatures, and more.

---

## Decisions (User Confirmed)

| Decision | Answer |
|----------|--------|
| **Route** | `/playground` - standalone creative tool |
| **Persistence** | localStorage for v1, database stubs for later |
| **Export** | Required - PNG export (and possibly SVG) |
| **Custom Images** | Not in v1, add stubs for future CDN integration |
| **Animation** | Yes, toggleable - animated assets can animate |
| **Prop Configuration** | Yes, all component props are configurable |

---

## Core Features

### 1. Canvas System
- **Blank canvas** - Full viewport workspace
- **Pan/zoom** - Navigate large scenes (scroll wheel + drag)
- **Background options** - Sky gradients, solid colors, or transparent for export
- **Viewport info** - Show current zoom level, canvas dimensions

### 2. Asset Palette (Sidebar)
Categorized list of all draggable components:

| Category | Components |
|----------|------------|
| **Trees** | TreeAspen, TreeBirch, TreeCherry, TreePine |
| **Creatures** | Bee, Bird, BirdFlying, Bluebird, Butterfly, Cardinal, Chickadee, Deer, Firefly, Owl, Rabbit, Robin, Squirrel |
| **Botanical** | Acorn, Berry, DandelionPuff, Leaf, LeafFalling, PetalFalling, PineCone, Vine, FallingLeavesLayer, FallingPetalsLayer |
| **Ground** | Bush, Crocus, Daffodil, Fern, FlowerWild, GrassTuft, Log, Mushroom, MushroomCluster, Rock, Stump, Tulip |
| **Sky** | Cloud, CloudWispy, Moon, Rainbow, Star, StarCluster, StarShooting, Sun |
| **Structural** | Birdhouse, Bridge, FencePost, GardenGate, Lantern, Lattice, LatticeWithVine, StonePath |
| **Water** | LilyPad, Pond, Reeds, Stream |
| **Weather** | Snowflake, SnowflakeFalling, SnowfallLayer |

- **Search/filter** - Quick search within palette
- **Preview thumbnails** - Visual preview in palette
- **Drag handle** - Clear affordance for dragging

### 3. Asset Manipulation
- **Move** - Drag placed assets to reposition
- **Scale** - Resize with corner handles or numeric input
- **Rotate** - Rotation handle or degree input (optional per asset)
- **Layer order** - Bring forward/send back (z-index control)
- **Delete** - Remove via keyboard (Delete/Backspace) or button
- **Duplicate** - Cmd/Ctrl+D or context action
- **Multi-select** - Shift+click or marquee selection (stretch goal)

### 4. Snap-to-Grid Mode
- **Toggle button** - Grid on/off in toolbar
- **Grid sizes** - 16px, 32px, 64px (configurable)
- **Visual grid** - Subtle dotted lines when enabled
- **Snap behavior** - Assets snap to nearest grid intersection
- **Override** - Hold Alt/Option to temporarily disable snap while dragging

### 5. Props Panel (Vineyard-Style)
When an asset is selected, show its configurable props:

```
┌─────────────────────────────┐
│ TreePine                    │
├─────────────────────────────┤
│ Scale: [====●====] 1.0      │
│ Rotation: [0°___] ↻         │
│ ─────────────────           │
│ Component Props:            │
│ height: [150___] px         │
│ color: [#2d5a27] 🎨         │
│ variant: [○ default ● snow] │
│ animated: [✓]               │
│ ─────────────────           │
│ Layer: [▲] 3 [▼]            │
│ [Duplicate] [Delete]        │
└─────────────────────────────┘
```

- Mirrors Vineyard's interactive prop controls
- Changes apply live to the selected asset
- Show only relevant props for each component type

### 6. Animation Toggle
- **Global toggle** - Master animation on/off in toolbar
- **Per-asset toggle** - In props panel for animated components
- **Animated assets include**: Firefly, FallingLeavesLayer, FallingPetalsLayer, SnowfallLayer, StarShooting, etc.
- **Performance note** - May want to pause animations when many are on canvas

### 7. Scene Management

#### Save (localStorage v1)
- **Auto-save** - Periodically save to localStorage
- **Named scenes** - User can name their scene
- **Scene list** - Dropdown of saved scenes

#### Export (Required for v1)
- **PNG export** - Download canvas as PNG image
- **SVG export** - Vector format (if feasible with components)
- **Transparent background** - Option for export
- **Export dimensions** - Match canvas or custom

#### Future Stubs
- **Database save** - For authenticated users (placeholder)
- **Gallery images** - Drag from user's CDN (placeholder)
- **Share scene** - Public URL (placeholder)

---

## Technical Architecture

### Data Structures

```typescript
// Scene saved to localStorage
interface PlaygroundScene {
  id: string;
  name: string;
  version: 1; // For future migrations
  canvas: CanvasSettings;
  assets: PlacedAsset[];
  createdAt: string; // ISO date
  updatedAt: string;
}

interface CanvasSettings {
  width: number;
  height: number;
  background: string; // CSS value (color, gradient, 'transparent')
  gridEnabled: boolean;
  gridSize: 16 | 32 | 64;
  zoom: number;
  panX: number;
  panY: number;
}

interface PlacedAsset {
  id: string;
  componentName: string; // e.g., "TreePine", "Lattice"
  category: AssetCategory;
  position: { x: number; y: number };
  scale: number;
  rotation: number; // degrees
  zIndex: number;
  props: Record<string, unknown>; // Component-specific props
  animationEnabled: boolean;
}

type AssetCategory =
  | 'trees' | 'creatures' | 'botanical'
  | 'ground' | 'sky' | 'structural'
  | 'water' | 'weather';
```

### Component Structure

```
packages/engine/src/lib/ui/components/playground/
├── Playground.svelte           # Main wrapper - orchestrates everything
├── Canvas.svelte               # The workspace area with pan/zoom
├── AssetPalette.svelte         # Sidebar with draggable asset list
├── PaletteCategory.svelte      # Collapsible category in palette
├── PaletteItem.svelte          # Individual draggable asset
├── PlacedAsset.svelte          # Wrapper for assets on canvas
├── SelectionBox.svelte         # Selection handles (resize, rotate)
├── GridOverlay.svelte          # Visual grid when enabled
├── Toolbar.svelte              # Top bar (grid, zoom, export, etc.)
├── PropsPanel.svelte           # Right sidebar - Vineyard-style controls
├── PropControl.svelte          # Individual prop input (reusable)
├── ExportDialog.svelte         # Export options modal
├── SceneManager.svelte         # Save/load UI
├── assetRegistry.ts            # Maps component names to components + metadata
├── playgroundState.svelte.ts   # Shared state using Svelte 5 runes
├── types.ts                    # TypeScript interfaces
├── utils.ts                    # Helper functions (snap, export, etc.)
└── index.ts                    # Exports
```

### Route Structure

```
packages/engine/src/routes/playground/
├── +page.svelte                # Main playground page
├── +page.ts                    # Client-side only (no SSR needed)
└── +layout.svelte              # Minimal layout (full-screen canvas)
```

### State Management

Using Svelte 5 runes for reactive state:

```typescript
// playgroundState.svelte.ts
export function createPlaygroundState() {
  // Scene state
  let scene = $state<PlaygroundScene>({
    id: crypto.randomUUID(),
    name: 'Untitled Scene',
    version: 1,
    canvas: {
      width: 1920,
      height: 1080,
      background: 'linear-gradient(to bottom, #87CEEB, #E0F6FF)',
      gridEnabled: true,
      gridSize: 32,
      zoom: 1,
      panX: 0,
      panY: 0,
    },
    assets: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // UI state
  let selectedAssetId = $state<string | null>(null);
  let isDragging = $state(false);
  let draggedPaletteItem = $state<string | null>(null);
  let animationsEnabled = $state(true);

  // Derived
  let selectedAsset = $derived(
    scene.assets.find(a => a.id === selectedAssetId) ?? null
  );

  // Actions
  function addAsset(componentName: string, position: { x: number; y: number }) { ... }
  function updateAsset(id: string, updates: Partial<PlacedAsset>) { ... }
  function deleteAsset(id: string) { ... }
  function duplicateAsset(id: string) { ... }
  function moveLayer(id: string, direction: 'up' | 'down' | 'top' | 'bottom') { ... }
  function saveToLocalStorage() { ... }
  function loadFromLocalStorage(sceneId: string) { ... }

  return {
    get scene() { return scene; },
    get selectedAsset() { return selectedAsset; },
    // ... expose state and actions
  };
}
```

### Asset Registry

```typescript
// assetRegistry.ts
import * as Trees from '$lib/ui/components/nature/trees';
import * as Creatures from '$lib/ui/components/nature/creatures';
// ... all categories

interface AssetDefinition {
  component: Component;
  name: string;                    // Display name
  category: AssetCategory;
  defaultProps: Record<string, unknown>;
  propSchema: PropSchema[];        // For PropsPanel
  isAnimated: boolean;
  defaultSize: { width: number; height: number };
}

interface PropSchema {
  key: string;
  label: string;
  type: 'number' | 'string' | 'boolean' | 'color' | 'select';
  options?: { value: string; label: string }[];  // For select
  min?: number;  // For number
  max?: number;
  step?: number;
}

export const assetRegistry: Record<string, AssetDefinition> = {
  TreePine: {
    component: Trees.TreePine,
    name: 'Pine Tree',
    category: 'trees',
    defaultProps: { height: 150 },
    propSchema: [
      { key: 'height', label: 'Height', type: 'number', min: 50, max: 300 },
    ],
    isAnimated: false,
    defaultSize: { width: 100, height: 150 },
  },
  Firefly: {
    component: Creatures.Firefly,
    name: 'Firefly',
    category: 'creatures',
    defaultProps: { glowColor: '#FFE87C' },
    propSchema: [
      { key: 'glowColor', label: 'Glow Color', type: 'color' },
    ],
    isAnimated: true,
    defaultSize: { width: 20, height: 20 },
  },
  Lattice: {
    component: Structural.Lattice,
    name: 'Lattice',
    category: 'structural',
    defaultProps: { width: 100, height: 200 },
    propSchema: [
      { key: 'width', label: 'Width', type: 'number', min: 50, max: 300 },
      { key: 'height', label: 'Height', type: 'number', min: 100, max: 400 },
    ],
    isAnimated: false,
    defaultSize: { width: 100, height: 200 },
  },
  // ... all 60+ assets
};
```

---

## UI Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [🏠] Asset Playground    [Grid: ▣ 32px ▼] [Zoom: 100%] [▶ Animations]     │
│                           [💾 Save] [📂 Load] [📤 Export]                   │
├───────────────┬───────────────────────────────────────────┬─────────────────┤
│               │                                           │                 │
│  Asset        │                                           │  Props Panel    │
│  Palette      │              Canvas Area                  │  (when asset    │
│               │                                           │   selected)     │
│  🔍 Search    │         ┌──────┐                         │                 │
│               │         │ 🌲   │    🦋                   │  TreePine       │
│  ▼ Trees      │         └──────┘         ╔════╗          │  ─────────────  │
│    🌳 Aspen   │                          ║    ║ Lattice  │  Scale: 1.0     │
│    🌳 Birch   │     🍄      🪨           ╚════╝          │  Rotation: 0°   │
│    🌸 Cherry  │                                           │  height: 150px  │
│    🌲 Pine    │                                           │                 │
│               │         · · · · · · · · ·                │  [Duplicate]    │
│  ▼ Creatures  │         · · · · · · · · · (grid)         │  [Delete]       │
│    🐝 Bee     │         · · · · · · · · ·                │                 │
│    🦋 Butterfly│                                          │                 │
│    🦌 Deer    │                                           │                 │
│    ...        │                                           │                 │
│               │                                           │                 │
│  ▼ Structural │                                           │                 │
│    🏗️ Lattice │                                           │                 │
│    ...        │                                           │                 │
│               │                                           │                 │
└───────────────┴───────────────────────────────────────────┴─────────────────┘
```

### Interactions

| Action | Trigger |
|--------|---------|
| Add asset | Drag from palette to canvas, or double-click in palette |
| Select asset | Click on asset |
| Deselect | Click empty canvas or press Escape |
| Move asset | Drag selected asset |
| Scale asset | Drag corner handles |
| Rotate asset | Drag rotation handle (or use props panel) |
| Delete asset | Delete/Backspace key, or button in props panel |
| Duplicate | Cmd/Ctrl+D |
| Toggle grid | Click grid button, or press G |
| Pan canvas | Middle mouse drag, or Space+drag |
| Zoom | Scroll wheel, or +/- keys |

### Visual Feedback

- **Grid**: Subtle dotted lines, fade with zoom
- **Selection**: Dashed border + corner handles + rotation handle
- **Drag preview**: Semi-transparent ghost follows cursor
- **Snap indicator**: Grid lines highlight when snapping
- **Drop zone**: Canvas highlights when dragging from palette

---

## Implementation Phases

### Phase 1: Core Canvas & Palette
**Goal**: Basic drag-and-drop working

1. Create route `/playground` with full-screen layout
2. Build `Playground.svelte` wrapper with basic state
3. Build `Canvas.svelte` with asset rendering
4. Build `AssetPalette.svelte` with categorized list
5. Implement drag-from-palette to canvas
6. Add `PlacedAsset.svelte` with position binding
7. Enable moving placed assets by dragging
8. Basic click-to-select

### Phase 2: Grid & Snapping
**Goal**: Precise positioning

1. Create `GridOverlay.svelte`
2. Add grid toggle to toolbar
3. Implement snap-to-grid in drag logic
4. Add grid size selector (16/32/64px)
5. Alt key to override snap

### Phase 3: Props Panel & Asset Controls
**Goal**: Vineyard-style customization

1. Build `PropsPanel.svelte`
2. Build `PropControl.svelte` for each prop type
3. Create `assetRegistry.ts` with prop schemas
4. Connect props to live component updates
5. Add scale/rotation handles to selection
6. Implement z-index layer controls
7. Add duplicate/delete actions

### Phase 4: Animation Support
**Goal**: Animated assets work properly

1. Add global animation toggle
2. Add per-asset animation toggle in props
3. Identify animated components in registry
4. Handle animation state correctly

### Phase 5: Export & Save
**Goal**: Users can keep their work

1. Implement localStorage save/load
2. Build `SceneManager.svelte` for scene list
3. Build `ExportDialog.svelte`
4. Implement PNG export (html2canvas or dom-to-image)
5. Add background options for export
6. Auto-save on changes

### Phase 6: Polish & Stubs
**Goal**: Production ready + future hooks

1. Add keyboard shortcuts (G, Delete, Cmd+D, etc.)
2. Improve drag UX with smooth animations
3. Add zoom/pan controls
4. Add stubs for database persistence
5. Add stubs for gallery image integration
6. Performance optimization for many assets
7. Responsive considerations (tablet support?)

---

## Files to Create

### New Files
```
packages/engine/src/lib/ui/components/playground/
├── Playground.svelte
├── Canvas.svelte
├── AssetPalette.svelte
├── PaletteCategory.svelte
├── PaletteItem.svelte
├── PlacedAsset.svelte
├── SelectionBox.svelte
├── GridOverlay.svelte
├── Toolbar.svelte
├── PropsPanel.svelte
├── PropControl.svelte
├── ExportDialog.svelte
├── SceneManager.svelte
├── assetRegistry.ts
├── playgroundState.svelte.ts
├── types.ts
├── utils.ts
└── index.ts

packages/engine/src/routes/playground/
├── +page.svelte
├── +page.ts
└── +layout.svelte
```

### Files to Modify
```
packages/engine/package.json          # Add playground export
packages/engine/src/lib/ui/index.ts   # Export playground components
```

---

## Open Questions / Future Considerations

1. **Undo/redo** - Not in v1, but worth architecting for (command pattern?)
2. **Templates** - Pre-made scenes users can start from?
3. **Component search** - Fuzzy search in palette?
4. **Touch support** - Mobile/tablet drag-and-drop?
5. **Performance** - How many assets before we need virtualization?
6. **Collaboration** - Real-time editing with Durable Objects? (far future)

---

## Summary

The Asset Playground is an evolution of the Vineyard pattern - from viewing components with interactive props to spatially composing them into scenes. Users get:

- **60+ nature components** to drag onto a canvas
- **Vineyard-style prop controls** for full customization
- **Snap-to-grid** for precise layouts
- **Animation toggle** for dynamic scenes
- **PNG export** to use their creations elsewhere
- **localStorage persistence** to save and load scenes

This creates a powerful creative tool for designing grove scenes, testing component combinations, and eventually (with stubs in place) integrating with user galleries and persistent storage.

---

*Plan created: 2026-01-04*
*Ready for implementation in separate agent session*
