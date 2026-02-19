/**
 * Personal Shrines Curio
 *
 * Emotionally resonant dedication boards for things you love.
 * Shrines are sacred spaces — never performative, always sincere.
 *
 * Features:
 * - 6 shrine types (memory, fandom, achievement, gratitude, inspiration, blank)
 * - 3 sizes (small, medium, large)
 * - 6 frame styles (wood, stone, crystal, floral, cosmic, minimal)
 * - Positioned content items stored as JSON
 * - Published/draft state
 */

// =============================================================================
// Types
// =============================================================================

export type ShrineType =
  | "memory"
  | "fandom"
  | "achievement"
  | "gratitude"
  | "inspiration"
  | "blank";

export type ShrineSize = "small" | "medium" | "large";

export type FrameStyle =
  | "wood"
  | "stone"
  | "crystal"
  | "floral"
  | "cosmic"
  | "minimal";

export interface ShrineContentItem {
  type: "image" | "text" | "date" | "icon" | "decoration";
  x: number;
  y: number;
  data: Record<string, unknown>;
}

export interface ShrineRecord {
  id: string;
  tenantId: string;
  title: string;
  shrineType: ShrineType;
  description: string | null;
  size: ShrineSize;
  frameStyle: FrameStyle;
  contents: ShrineContentItem[];
  isPublished: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ShrineDisplay {
  id: string;
  title: string;
  shrineType: ShrineType;
  description: string | null;
  size: ShrineSize;
  frameStyle: FrameStyle;
  contents: ShrineContentItem[];
}

// =============================================================================
// Constants
// =============================================================================

export const SHRINE_TYPE_OPTIONS: {
  value: ShrineType;
  label: string;
  description: string;
}[] = [
  {
    value: "memory",
    label: "Memory",
    description: "Dedicate to someone or something you remember",
  },
  {
    value: "fandom",
    label: "Fandom",
    description: "Celebrate a show, artist, or creator you love",
  },
  {
    value: "achievement",
    label: "Achievement",
    description: "Honor a milestone or accomplishment",
  },
  {
    value: "gratitude",
    label: "Gratitude",
    description: "Give thanks to people, places, moments",
  },
  {
    value: "inspiration",
    label: "Inspiration",
    description: "Quotes, mood boards, and sparks",
  },
  {
    value: "blank",
    label: "Blank",
    description: "Build from scratch — your sacred space",
  },
];

export const SIZE_OPTIONS: {
  value: ShrineSize;
  label: string;
  dimensions: string;
}[] = [
  { value: "small", label: "Small", dimensions: "150x150" },
  { value: "medium", label: "Medium", dimensions: "250x250" },
  { value: "large", label: "Large", dimensions: "400x400" },
];

export const FRAME_STYLE_OPTIONS: {
  value: FrameStyle;
  label: string;
}[] = [
  { value: "wood", label: "Wood" },
  { value: "stone", label: "Stone" },
  { value: "crystal", label: "Crystal" },
  { value: "floral", label: "Floral" },
  { value: "cosmic", label: "Cosmic" },
  { value: "minimal", label: "Minimal" },
];

export const VALID_SHRINE_TYPES = new Set<string>(
  SHRINE_TYPE_OPTIONS.map((t) => t.value),
);
export const VALID_SIZES = new Set<string>(SIZE_OPTIONS.map((s) => s.value));
export const VALID_FRAME_STYLES = new Set<string>(
  FRAME_STYLE_OPTIONS.map((f) => f.value),
);

export const MAX_TITLE_LENGTH = 100;
export const MAX_DESCRIPTION_LENGTH = 500;
export const MAX_CONTENTS_SIZE = 16384;

/**
 * Max shrines per tenant
 */
export const MAX_SHRINES_PER_TENANT = 50;

// =============================================================================
// Utility Functions
// =============================================================================

import { stripHtml } from "../sanitize";

export function generateShrineId(): string {
  return `shrine_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function isValidShrineType(type: string): type is ShrineType {
  return VALID_SHRINE_TYPES.has(type);
}

export function isValidSize(size: string): size is ShrineSize {
  return VALID_SIZES.has(size);
}

export function isValidFrameStyle(style: string): style is FrameStyle {
  return VALID_FRAME_STYLES.has(style);
}

export function sanitizeTitle(text: string | null | undefined): string | null {
  if (!text) return null;
  const cleaned = stripHtml(text).trim();
  if (cleaned.length === 0) return null;
  if (cleaned.length > MAX_TITLE_LENGTH)
    return cleaned.slice(0, MAX_TITLE_LENGTH);
  return cleaned;
}

export function sanitizeDescription(
  text: string | null | undefined,
): string | null {
  if (!text) return null;
  const cleaned = stripHtml(text).trim();
  if (cleaned.length === 0) return null;
  if (cleaned.length > MAX_DESCRIPTION_LENGTH)
    return cleaned.slice(0, MAX_DESCRIPTION_LENGTH);
  return cleaned;
}

export function parseContents(json: string): ShrineContentItem[] {
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item: unknown) =>
        item &&
        typeof item === "object" &&
        "type" in item &&
        "x" in item &&
        "y" in item,
    ) as ShrineContentItem[];
  } catch {
    return [];
  }
}

export function toDisplayShrine(record: ShrineRecord): ShrineDisplay {
  return {
    id: record.id,
    title: record.title,
    shrineType: record.shrineType,
    description: record.description,
    size: record.size,
    frameStyle: record.frameStyle,
    contents: record.contents,
  };
}
