/**
 * Custom Cursors Curio
 *
 * Custom cursor themes with optional trail effects.
 * Replace the default pointer with something that matches your vibe.
 *
 * Features:
 * - Preset cursor themes (nature, whimsical, classic, seasonal)
 * - Trail effects (sparkle, fairy dust, etc.)
 * - Custom upload support (Oak+)
 * - Disabled when prefers-reduced-motion: reduce
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Cursor type — preset or custom upload
 */
export type CursorType = "preset" | "custom";

/**
 * Available preset cursors
 */
export type CursorPreset =
  | "leaf"
  | "flower"
  | "butterfly"
  | "ladybug"
  | "raindrop"
  | "sparkle"
  | "wand"
  | "mushroom"
  | "hourglass"
  | "snowflake"
  | "pumpkin"
  | "blossom"
  | "falling-leaf";

/**
 * Trail effect types
 */
export type TrailEffect =
  | "sparkle"
  | "fairy-dust"
  | "leaves"
  | "stars"
  | "none";

/**
 * Cursor config record
 */
export interface CursorConfigRecord {
  tenantId: string;
  cursorType: CursorType;
  preset: CursorPreset | null;
  customUrl: string | null;
  trailEnabled: boolean;
  trailEffect: TrailEffect;
  trailLength: number;
  updatedAt: string;
}

/**
 * Cursor config for public display
 */
export interface CursorConfigDisplay {
  cursorType: CursorType;
  preset: CursorPreset | null;
  customUrl: string | null;
  trailEnabled: boolean;
  trailEffect: TrailEffect;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Cursor preset options with categories
 */
export const CURSOR_PRESETS: {
  value: CursorPreset;
  label: string;
  category: "nature" | "whimsical" | "classic" | "seasonal";
}[] = [
  { value: "leaf", label: "Leaf", category: "nature" },
  { value: "flower", label: "Flower", category: "nature" },
  { value: "butterfly", label: "Butterfly", category: "nature" },
  { value: "ladybug", label: "Ladybug", category: "nature" },
  { value: "raindrop", label: "Raindrop", category: "nature" },
  { value: "sparkle", label: "Sparkle", category: "whimsical" },
  { value: "wand", label: "Wand", category: "whimsical" },
  { value: "mushroom", label: "Mushroom", category: "whimsical" },
  { value: "hourglass", label: "Hourglass", category: "classic" },
  { value: "snowflake", label: "Snowflake", category: "seasonal" },
  { value: "pumpkin", label: "Pumpkin", category: "seasonal" },
  { value: "blossom", label: "Blossom", category: "seasonal" },
  { value: "falling-leaf", label: "Falling Leaf", category: "seasonal" },
];

/**
 * Trail effect options
 */
export const TRAIL_EFFECT_OPTIONS: {
  value: TrailEffect;
  label: string;
  description: string;
}[] = [
  {
    value: "sparkle",
    label: "Sparkle",
    description: "Glittering sparkles follow the cursor",
  },
  {
    value: "fairy-dust",
    label: "Fairy Dust",
    description: "Soft glowing particles",
  },
  {
    value: "leaves",
    label: "Leaves",
    description: "Falling leaves trail behind",
  },
  { value: "stars", label: "Stars", description: "Tiny stars in your wake" },
  { value: "none", label: "None", description: "No trail effect" },
];

/**
 * Valid cursor presets
 */
export const VALID_PRESETS = new Set<string>(
  CURSOR_PRESETS.map((p) => p.value),
);

/**
 * Valid trail effects
 */
export const VALID_TRAIL_EFFECTS = new Set<string>(
  TRAIL_EFFECT_OPTIONS.map((e) => e.value),
);

/**
 * Trail length limits
 */
export const MIN_TRAIL_LENGTH = 3;
export const MAX_TRAIL_LENGTH = 20;
export const DEFAULT_TRAIL_LENGTH = 8;

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Validate cursor preset
 */
export function isValidPreset(preset: string): preset is CursorPreset {
  return VALID_PRESETS.has(preset);
}

/**
 * Validate trail effect
 */
export function isValidTrailEffect(effect: string): effect is TrailEffect {
  return VALID_TRAIL_EFFECTS.has(effect);
}

/**
 * Validate trail length
 */
export function isValidTrailLength(length: number): boolean {
  return (
    Number.isInteger(length) &&
    length >= MIN_TRAIL_LENGTH &&
    length <= MAX_TRAIL_LENGTH
  );
}

/**
 * Validate URL for custom cursor
 */
export function isValidCursorUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * Transform record to public display
 */
export function toDisplayCursorConfig(
  record: CursorConfigRecord,
): CursorConfigDisplay {
  return {
    cursorType: record.cursorType,
    preset: record.preset,
    customUrl: record.customUrl,
    trailEnabled: record.trailEnabled,
    trailEffect: record.trailEffect,
  };
}
