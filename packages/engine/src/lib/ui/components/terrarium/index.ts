/**
 * Terrarium — Creative Canvas for Grove
 *
 * A drag-and-drop canvas where users compose nature scenes
 * that become decorations for their blogs.
 *
 * @example
 * ```svelte
 * <script>
 *   import { Terrarium } from '@autumnsgrove/lattice/ui/terrarium';
 * </script>
 *
 * <Terrarium />
 * ```
 *
 * Grove — A place to Be
 * Copyright (c) 2025 Autumn Brown
 * Licensed under AGPL-3.0
 */

// Main component
export { default as Terrarium } from "./Terrarium.svelte";

// Sub-components (for advanced usage)
export { default as Canvas } from "./Canvas.svelte";
export { default as AssetPalette } from "./AssetPalette.svelte";
export { default as PaletteItem } from "./PaletteItem.svelte";
export { default as PlacedAssetComponent } from "./PlacedAsset.svelte";
export { default as Toolbar } from "./Toolbar.svelte";
export { default as ExportDialog } from "./ExportDialog.svelte";

// State management
export { createTerrariumState } from "./terrariumState.svelte";
export type { TerrariumState } from "./terrariumState.svelte";

// Types
export type {
  AssetCategory,
  AssetDefinition,
  AssetMeta,
  CanvasSettings,
  Decoration,
  DecorationOptions,
  DecorationZone,
  DragState,
  ExportOptions,
  PanState,
  PlacedAsset,
  Point,
  PropDefinition,
  SelectionState,
  Size,
  TerrariumScene,
  ToolbarAction,
  ToolMode,
} from "./types";

export { CANVAS_BACKGROUNDS, DEFAULT_SCENE } from "./types";

// Utilities
export {
  exportSceneAsPNG,
  generateDataUrl,
  sanitizeFilename,
} from "./utils/export";
