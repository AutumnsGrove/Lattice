/**
 * Mood Ring Curio
 *
 * Visual mood indicator — a gem or ring that changes color
 * based on time of day, season, manual setting, or randomness.
 *
 * Features:
 * - Time-based mode (dawn → morning → afternoon → evening → night)
 * - Manual mood with custom color
 * - Seasonal mode (follows Grove seasons)
 * - Random mode (subtle color shifts)
 * - Optional mood log (color timeline)
 * - 3 display styles: ring, gem, orb
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Mood ring mode
 */
export type MoodRingMode = "time" | "manual" | "seasonal" | "random";

/**
 * Display style for the mood indicator
 */
export type MoodDisplayStyle = "ring" | "gem" | "orb";

/**
 * Color scheme
 */
export type ColorScheme = "default" | "warm" | "cool" | "forest" | "sunset";

/**
 * Mood ring config record
 */
export interface MoodRingConfigRecord {
  tenantId: string;
  mode: MoodRingMode;
  manualMood: string | null;
  manualColor: string | null;
  colorScheme: ColorScheme;
  displayStyle: MoodDisplayStyle;
  updatedAt: string;
}

/**
 * Mood ring config for public display
 */
export interface MoodRingConfigDisplay {
  mode: MoodRingMode;
  manualMood: string | null;
  manualColor: string | null;
  colorScheme: ColorScheme;
  displayStyle: MoodDisplayStyle;
  currentColor: string;
  currentMoodName: string;
}

/**
 * Mood log entry
 */
export interface MoodLogEntry {
  id: string;
  tenantId: string;
  mood: string;
  color: string;
  note: string | null;
  loggedAt: string;
}

/**
 * Mood log for public display
 */
export interface MoodLogDisplay {
  mood: string;
  color: string;
  note: string | null;
  loggedAt: string;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Mode options
 */
export const MODE_OPTIONS: {
  value: MoodRingMode;
  label: string;
  description: string;
}[] = [
  {
    value: "time",
    label: "Time-Based",
    description: "Changes color with the time of day",
  },
  {
    value: "manual",
    label: "Manual",
    description: "Set your mood with a custom color",
  },
  {
    value: "seasonal",
    label: "Seasonal",
    description: "Follows the Grove seasons",
  },
  {
    value: "random",
    label: "Random",
    description: "Subtle color shifts on each visit",
  },
];

/**
 * Display style options
 */
export const DISPLAY_STYLE_OPTIONS: {
  value: MoodDisplayStyle;
  label: string;
}[] = [
  { value: "ring", label: "Ring" },
  { value: "gem", label: "Gem" },
  { value: "orb", label: "Orb" },
];

/**
 * Color scheme options
 */
export const COLOR_SCHEME_OPTIONS: {
  value: ColorScheme;
  label: string;
}[] = [
  { value: "default", label: "Default" },
  { value: "warm", label: "Warm" },
  { value: "cool", label: "Cool" },
  { value: "forest", label: "Forest" },
  { value: "sunset", label: "Sunset" },
];

/**
 * Time-of-day color mapping
 */
export const TIME_COLORS: {
  name: string;
  color: string;
  startHour: number;
}[] = [
  { name: "Deep Night", color: "#2a2d5e", startHour: 0 },
  { name: "Dawn", color: "#6b7fb5", startHour: 5 },
  { name: "Morning", color: "#d4a843", startHour: 7 },
  { name: "Midday", color: "#5a9e4b", startHour: 11 },
  { name: "Afternoon", color: "#7cb85c", startHour: 14 },
  { name: "Evening", color: "#8b5eb0", startHour: 18 },
  { name: "Night", color: "#3d4a7a", startHour: 21 },
];

/**
 * Seasonal color mapping
 */
export const SEASONAL_COLORS: Record<string, { name: string; color: string }> =
  {
    spring: { name: "Spring Growth", color: "#6abf69" },
    summer: { name: "Summer Warmth", color: "#e8b84b" },
    autumn: { name: "Autumn Harvest", color: "#d4853b" },
    winter: { name: "Winter Rest", color: "#7ba3c9" },
    midnight: { name: "Midnight Dreams", color: "#6b5eb0" },
  };

/**
 * Random palette colors
 */
export const RANDOM_PALETTE: string[] = [
  "#7cb85c",
  "#d4a843",
  "#8b5eb0",
  "#5a9e9e",
  "#c76b6b",
  "#6b7fb5",
  "#b5856b",
  "#6bb58b",
];

/**
 * Valid sets
 */
export const VALID_MODES = new Set<string>(MODE_OPTIONS.map((m) => m.value));
export const VALID_DISPLAY_STYLES = new Set<string>(
  DISPLAY_STYLE_OPTIONS.map((s) => s.value),
);
export const VALID_COLOR_SCHEMES = new Set<string>(
  COLOR_SCHEME_OPTIONS.map((c) => c.value),
);

/**
 * Limits
 */
export const MAX_MOOD_TEXT_LENGTH = 50;
export const MAX_NOTE_LENGTH = 200;
export const MAX_LOG_ENTRIES = 365;

// =============================================================================
// Utility Functions
// =============================================================================

import { stripHtml } from "../sanitize";

/**
 * Generate mood log ID
 */
export function generateMoodLogId(): string {
  return `ml_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Validate mode
 */
export function isValidMode(mode: string): mode is MoodRingMode {
  return VALID_MODES.has(mode);
}

/**
 * Validate display style
 */
export function isValidDisplayStyle(style: string): style is MoodDisplayStyle {
  return VALID_DISPLAY_STYLES.has(style);
}

/**
 * Validate color scheme
 */
export function isValidColorScheme(scheme: string): scheme is ColorScheme {
  return VALID_COLOR_SCHEMES.has(scheme);
}

/**
 * Validate hex color
 */
export function isValidHexColor(color: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(color);
}

/**
 * Sanitize mood text
 */
export function sanitizeMoodText(
  text: string | null | undefined,
): string | null {
  if (!text) return null;
  const cleaned = stripHtml(text).trim();
  if (cleaned.length === 0) return null;
  if (cleaned.length > MAX_MOOD_TEXT_LENGTH)
    return cleaned.slice(0, MAX_MOOD_TEXT_LENGTH);
  return cleaned;
}

/**
 * Sanitize note text
 */
export function sanitizeNote(text: string | null | undefined): string | null {
  if (!text) return null;
  const cleaned = stripHtml(text).trim();
  if (cleaned.length === 0) return null;
  if (cleaned.length > MAX_NOTE_LENGTH)
    return cleaned.slice(0, MAX_NOTE_LENGTH);
  return cleaned;
}

/**
 * Get the current time-based color
 */
export function getTimeColor(hour?: number): { name: string; color: string } {
  const h = hour ?? new Date().getHours();
  // Find the matching time period (reverse search for the latest startHour <= h)
  let matched = TIME_COLORS[TIME_COLORS.length - 1]; // default: Deep Night
  for (const tc of TIME_COLORS) {
    if (h >= tc.startHour) {
      matched = tc;
    }
  }
  return { name: matched.name, color: matched.color };
}

/**
 * Get current season (simple northern hemisphere)
 */
export function getCurrentSeason(): string {
  const month = new Date().getMonth(); // 0-11
  if (month >= 2 && month <= 4) return "spring";
  if (month >= 5 && month <= 7) return "summer";
  if (month >= 8 && month <= 10) return "autumn";
  return "winter";
}

/**
 * Get seasonal color
 */
export function getSeasonalColor(): { name: string; color: string } {
  const season = getCurrentSeason();
  return SEASONAL_COLORS[season] || SEASONAL_COLORS.autumn;
}

/**
 * Get a random palette color (seeded by tenant for consistency within a visit)
 */
export function getRandomColor(tenantId: string): string {
  let hash = 0;
  const seed = `${tenantId}:${Date.now().toString().slice(0, -4)}`; // changes roughly every 10 seconds
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return RANDOM_PALETTE[Math.abs(hash) % RANDOM_PALETTE.length];
}

/**
 * Transform mood log to display
 */
export function toDisplayMoodLog(entry: MoodLogEntry): MoodLogDisplay {
  return {
    mood: entry.mood,
    color: entry.color,
    note: entry.note,
    loggedAt: entry.loggedAt,
  };
}
