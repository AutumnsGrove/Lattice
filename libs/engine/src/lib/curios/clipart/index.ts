/**
 * Clip Art Library Curio
 *
 * Decorative assets that can be positioned anywhere as overlays.
 * The craft drawer of your digital scrapbook.
 *
 * Features:
 * - SVG assets (scalable, theme-colorable)
 * - Per-page placement storage
 * - Transform: scale, rotation
 * - Overlay layer (pointer-events: none)
 * - Animated assets respect reduced-motion
 */

// =============================================================================
// Types
// =============================================================================

export type AssetCategory =
  | "foliage"
  | "critters"
  | "effects"
  | "labels"
  | "decorative";

export interface ClipArtPlacementRecord {
  id: string;
  tenantId: string;
  assetId: string;
  pagePath: string;
  xPosition: number;
  yPosition: number;
  scale: number;
  rotation: number;
  zIndex: number;
  createdAt: string;
}

export interface ClipArtPlacementDisplay {
  id: string;
  assetId: string;
  pagePath: string;
  xPosition: number;
  yPosition: number;
  scale: number;
  rotation: number;
  zIndex: number;
}

export interface AssetDefinition {
  id: string;
  name: string;
  category: AssetCategory;
  svgPath: string;
  isAnimated: boolean;
}

// =============================================================================
// Constants
// =============================================================================

export const ASSET_CATEGORY_OPTIONS: {
  value: AssetCategory;
  label: string;
  description: string;
}[] = [
  {
    value: "foliage",
    label: "Foliage",
    description: "Borders, corners, dividers, vines, mushrooms",
  },
  {
    value: "critters",
    label: "Critters",
    description: "Butterflies, bees, ladybugs, birds",
  },
  {
    value: "effects",
    label: "Effects",
    description: "Sparkles, fairy dust, light rays",
  },
  {
    value: "labels",
    label: "Labels",
    description: "Signposts, banners, speech bubbles",
  },
  {
    value: "decorative",
    label: "Decorative",
    description: "Ribbons, lanterns, fairy lights",
  },
];

export const VALID_CATEGORIES = new Set<string>(
  ASSET_CATEGORY_OPTIONS.map((c) => c.value),
);

export const MIN_SCALE = 0.25;
export const MAX_SCALE = 3.0;
export const MIN_ROTATION = 0;
export const MAX_ROTATION = 360;
export const MIN_Z_INDEX = 1;
export const MAX_Z_INDEX = 100;

/**
 * Max clip art placements per tenant
 */
export const MAX_CLIPART_PLACEMENTS_PER_TENANT = 500;

// =============================================================================
// Utility Functions
// =============================================================================

export function generatePlacementId(): string {
  return `clip_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function isValidCategory(category: string): category is AssetCategory {
  return VALID_CATEGORIES.has(category);
}

export function isValidScale(scale: number): boolean {
  return scale >= MIN_SCALE && scale <= MAX_SCALE;
}

export function isValidRotation(rotation: number): boolean {
  return rotation >= MIN_ROTATION && rotation <= MAX_ROTATION;
}

export function isValidPosition(value: number): boolean {
  return value >= 0 && value <= 100;
}

export function isValidZIndex(zIndex: number): boolean {
  return (
    Number.isInteger(zIndex) && zIndex >= MIN_Z_INDEX && zIndex <= MAX_Z_INDEX
  );
}

export function toDisplayPlacement(
  record: ClipArtPlacementRecord,
): ClipArtPlacementDisplay {
  return {
    id: record.id,
    assetId: record.assetId,
    pagePath: record.pagePath,
    xPosition: record.xPosition,
    yPosition: record.yPosition,
    scale: record.scale,
    rotation: record.rotation,
    zIndex: record.zIndex,
  };
}
