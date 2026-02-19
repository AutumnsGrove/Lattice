/**
 * Grove — A place to Be
 * Copyright (c) 2025 Autumn Brown
 * Licensed under AGPL-3.0
 */

/**
 * Terrarium State Management
 *
 * Centralized state management for the Terrarium creative canvas using Svelte 5 runes.
 * Manages scene, assets, selection, and canvas interaction state.
 *
 * Note on mutation strategy: Svelte 5 runes track mutations deeply, so we use direct
 * mutations (push, splice, property assignment) for performance. The setScene function
 * uses immutable patterns to ensure a clean state when loading external data.
 */

import type {
  TerrariumScene,
  PlacedAsset,
  Point,
  AssetCategory,
  ToolMode,
} from "./types";
import { DEFAULT_SCENE } from "./types";
import { TERRARIUM_CONFIG } from "$lib/config/terrarium";

/**
 * Calculate complexity cost of a placed asset
 */
function calculateAssetComplexity(asset: PlacedAsset): number {
  let cost: number = TERRARIUM_CONFIG.complexity.weights.normal;

  if (asset.animationEnabled) {
    cost = TERRARIUM_CONFIG.complexity.weights.animated;
  } else if (asset.scale > 1.5 || asset.scale < 0.5) {
    cost = TERRARIUM_CONFIG.complexity.weights.scaled;
  }

  return cost;
}

/**
 * Calculate total scene complexity
 */
function calculateSceneComplexity(assets: PlacedAsset[]): number {
  return assets.reduce(
    (total, asset) => total + calculateAssetComplexity(asset),
    0,
  );
}

/**
 * Create a new empty scene
 */
function createEmptyScene(): TerrariumScene {
  const now = new Date().toISOString();
  return {
    ...DEFAULT_SCENE,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Get the highest z-index in the scene
 */
function getMaxZIndex(assets: PlacedAsset[]): number {
  if (assets.length === 0) return 0;
  return Math.max(...assets.map((a) => a.zIndex));
}

/**
 * Create the Terrarium state manager
 */
export function createTerrariumState() {
  let scene = $state<TerrariumScene>(createEmptyScene());
  let selectedAssetId = $state<string | null>(null);
  let isDragging = $state<boolean>(false);
  let animationsEnabled = $state<boolean>(true);
  let panOffset = $state<Point>({ x: 0, y: 0 });
  let toolMode = $state<ToolMode>("select");
  let zoom = $state<number>(1); // 1 = 100%

  const selectedAsset = $derived<PlacedAsset | null>(
    scene.assets.find((a) => a.id === selectedAssetId) ?? null,
  );

  const assetCount = $derived<number>(scene.assets.length);

  const complexityUsage = $derived<number>(
    Math.min(
      calculateSceneComplexity(scene.assets) /
        TERRARIUM_CONFIG.complexity.maxComplexity,
      1,
    ),
  );

  const canAddAsset = $derived<boolean>(
    calculateSceneComplexity(scene.assets) <
      TERRARIUM_CONFIG.complexity.maxComplexity,
  );

  function addAsset(
    componentName: string,
    category: AssetCategory,
    position: Point,
  ): string {
    // Guard: enforce complexity budget
    if (!canAddAsset) {
      return "";
    }

    // Validate position is within canvas bounds
    const clampedPosition: Point = {
      x: Math.max(0, Math.min(position.x, scene.canvas.width)),
      y: Math.max(0, Math.min(position.y, scene.canvas.height)),
    };

    const id = crypto.randomUUID();
    const maxZ = getMaxZIndex(scene.assets);

    const newAsset: PlacedAsset = {
      id,
      componentName,
      category,
      position: clampedPosition,
      scale: TERRARIUM_CONFIG.asset.defaultScale,
      rotation: 0,
      zIndex: maxZ + 1,
      props: {},
      animationEnabled: animationsEnabled,
      flipX: false,
      flipY: false,
    };

    scene.assets.push(newAsset);
    scene.updatedAt = new Date().toISOString();
    selectedAssetId = id;

    return id;
  }

  function updateAsset(id: string, updates: Partial<PlacedAsset>): void {
    const index = scene.assets.findIndex((a) => a.id === id);
    if (index === -1) return;

    scene.assets[index] = {
      ...scene.assets[index],
      ...updates,
      id,
      position: updates.position
        ? { ...updates.position }
        : scene.assets[index].position,
      props: updates.props ? { ...updates.props } : scene.assets[index].props,
    };

    scene.updatedAt = new Date().toISOString();
  }

  function deleteAsset(id: string): void {
    const index = scene.assets.findIndex((a) => a.id === id);
    if (index === -1) return;

    scene.assets.splice(index, 1);
    scene.updatedAt = new Date().toISOString();

    if (selectedAssetId === id) {
      selectedAssetId = null;
    }
  }

  function duplicateAsset(id: string): string {
    const asset = scene.assets.find((a) => a.id === id);
    if (!asset) return "";

    const newId = crypto.randomUUID();
    const maxZ = getMaxZIndex(scene.assets);
    const offset = TERRARIUM_CONFIG.ui.duplicateOffset;

    const duplicatedAsset: PlacedAsset = {
      ...asset,
      id: newId,
      position: {
        x: asset.position.x + offset,
        y: asset.position.y + offset,
      },
      zIndex: maxZ + 1,
      props: { ...asset.props },
    };

    scene.assets.push(duplicatedAsset);
    scene.updatedAt = new Date().toISOString();
    selectedAssetId = newId;

    return newId;
  }

  function selectAsset(id: string | null): void {
    selectedAssetId = id;
  }

  function moveLayer(
    id: string,
    direction: "up" | "down" | "top" | "bottom",
  ): void {
    const index = scene.assets.findIndex((a) => a.id === id);
    if (index === -1) return;

    const asset = scene.assets[index];
    const currentZ = asset.zIndex;

    if (direction === "top") {
      const maxZ = getMaxZIndex(scene.assets);
      if (currentZ === maxZ) return;
      asset.zIndex = maxZ + 1;
    } else if (direction === "bottom") {
      const minZ = Math.min(...scene.assets.map((a) => a.zIndex));
      if (currentZ === minZ) return;
      asset.zIndex = minZ - 1;
    } else if (direction === "up") {
      const higherAssets = scene.assets.filter((a) => a.zIndex > currentZ);
      if (higherAssets.length === 0) return;

      const nextZ = Math.min(...higherAssets.map((a) => a.zIndex));
      const swapAsset = scene.assets.find((a) => a.zIndex === nextZ);

      if (swapAsset) {
        swapAsset.zIndex = currentZ;
        asset.zIndex = nextZ;
      }
    } else if (direction === "down") {
      const lowerAssets = scene.assets.filter((a) => a.zIndex < currentZ);
      if (lowerAssets.length === 0) return;

      const prevZ = Math.max(...lowerAssets.map((a) => a.zIndex));
      const swapAsset = scene.assets.find((a) => a.zIndex === prevZ);

      if (swapAsset) {
        swapAsset.zIndex = currentZ;
        asset.zIndex = prevZ;
      }
    }

    scene.updatedAt = new Date().toISOString();

    // Normalize z-indices periodically to prevent drift
    normalizeZIndices();
  }

  /**
   * Normalizes z-indices to sequential values (0, 1, 2, ...) to prevent
   * accumulation of very large or negative values over time.
   */
  function normalizeZIndices(): void {
    if (scene.assets.length === 0) return;

    // Sort by current z-index, then reassign sequential values
    const sorted = [...scene.assets].sort((a, b) => a.zIndex - b.zIndex);
    sorted.forEach((asset, index) => {
      const original = scene.assets.find((a) => a.id === asset.id);
      if (original) {
        original.zIndex = index;
      }
    });
  }

  function setScene(newScene: TerrariumScene): void {
    scene = {
      ...newScene,
      canvas: { ...newScene.canvas },
      assets: newScene.assets.map((asset) => ({
        ...asset,
        position: { ...asset.position },
        props: { ...asset.props },
        // Migrate old scenes without flip properties
        flipX: asset.flipX ?? false,
        flipY: asset.flipY ?? false,
      })),
    };
    selectedAssetId = null;
    panOffset = { x: 0, y: 0 };
    zoom = 1; // Reset zoom when loading a new scene

    // Normalize z-indices when loading external data
    normalizeZIndices();
  }

  function resetScene(): void {
    scene = createEmptyScene();
    selectedAssetId = null;
    panOffset = { x: 0, y: 0 };
  }

  function toggleAnimations(): void {
    animationsEnabled = !animationsEnabled;

    for (const asset of scene.assets) {
      asset.animationEnabled = animationsEnabled;
    }

    scene.updatedAt = new Date().toISOString();
  }

  function toggleGrid(): void {
    scene.canvas.gridEnabled = !scene.canvas.gridEnabled;
    scene.updatedAt = new Date().toISOString();
  }

  function setGridSize(size: 16 | 32 | 64): void {
    scene.canvas.gridSize = size;
    scene.updatedAt = new Date().toISOString();
  }

  function setPanOffset(offset: Point): void {
    panOffset = { ...offset };
  }

  function setToolMode(mode: ToolMode): void {
    toolMode = mode;
    if (mode === "pan") {
      selectedAssetId = null;
    }
  }

  function setZoom(level: number): void {
    zoom = Math.max(0.25, Math.min(4, level)); // Clamp 25%-400%
  }

  function zoomIn(): void {
    setZoom(zoom * 1.25);
  }

  function zoomOut(): void {
    setZoom(zoom / 1.25);
  }

  function resetZoom(): void {
    zoom = 1;
  }

  function setBackground(background: string): void {
    scene.canvas.background = background;
    scene.updatedAt = new Date().toISOString();
  }

  function flipAssetX(id: string): void {
    const asset = scene.assets.find((a) => a.id === id);
    if (asset) {
      asset.flipX = !asset.flipX;
      scene.updatedAt = new Date().toISOString();
    }
  }

  function flipAssetY(id: string): void {
    const asset = scene.assets.find((a) => a.id === id);
    if (asset) {
      asset.flipY = !asset.flipY;
      scene.updatedAt = new Date().toISOString();
    }
  }

  return {
    get scene() {
      return scene;
    },
    get selectedAssetId() {
      return selectedAssetId;
    },
    get isDragging() {
      return isDragging;
    },
    set isDragging(value: boolean) {
      isDragging = value;
    },
    get animationsEnabled() {
      return animationsEnabled;
    },
    get panOffset() {
      return panOffset;
    },
    get toolMode() {
      return toolMode;
    },
    get zoom() {
      return zoom;
    },
    get selectedAsset() {
      return selectedAsset;
    },
    get assetCount() {
      return assetCount;
    },
    get canAddAsset() {
      return canAddAsset;
    },
    get complexityUsage() {
      return complexityUsage;
    },
    addAsset,
    updateAsset,
    deleteAsset,
    duplicateAsset,
    selectAsset,
    moveLayer,
    setScene,
    resetScene,
    toggleAnimations,
    toggleGrid,
    setGridSize,
    setPanOffset,
    setToolMode,
    setZoom,
    zoomIn,
    zoomOut,
    resetZoom,
    setBackground,
    flipAssetX,
    flipAssetY,
  };
}

export type TerrariumState = ReturnType<typeof createTerrariumState>;
