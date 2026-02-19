/**
 * Hit Counter Curio
 *
 * Nostalgic page view counter. Privacy-first — no visitor tracking, just a number.
 * Zero complexity, maximum nostalgia.
 *
 * Features:
 * - 4 display styles: Classic, Odometer, Minimal, LCD
 * - CSS-only animations (respects prefers-reduced-motion)
 * - Atomic increment on page load
 * - Optional "since" date label with footnote or integrated presentation
 * - Per-page counters (Oak+ tier)
 * - Owner-configurable dedup: every visit or unique daily
 * - Vine-native (no dedicated page needed)
 */

// =============================================================================
// Types
// =============================================================================

/** Hit counter display style options */
export type HitCounterStyle = "classic" | "odometer" | "minimal" | "lcd";

/** Count mode — every page load or unique visitors per day */
export type HitCounterCountMode = "every" | "unique";

/** How the "since" date is presented beneath/beside the counter */
export type HitCounterSinceDateStyle = "footnote" | "integrated";

/**
 * Hit counter configuration stored in the database
 */
export interface HitCounterConfig {
  id: string;
  tenantId: string;
  pagePath: string;
  count: number;
  style: HitCounterStyle;
  label: string;
  showSinceDate: boolean;
  startedAt: string;
  countMode: HitCounterCountMode;
  sinceDateStyle: HitCounterSinceDateStyle;
}

/**
 * Hit counter display data for frontend rendering
 */
export interface HitCounterDisplay {
  count: number;
  formattedCount: string;
  digits: string[];
  style: HitCounterStyle;
  label: string;
  showSinceDate: boolean;
  startedAt: string;
  sinceDateStyle: HitCounterSinceDateStyle;
}

// =============================================================================
// Constants
// =============================================================================

/** Display style options with labels and descriptions */
export const HIT_COUNTER_STYLE_OPTIONS: {
  value: HitCounterStyle;
  label: string;
  description: string;
}[] = [
  {
    value: "classic",
    label: "Classic",
    description: "Frosted glass digit cells with grove-green glow",
  },
  {
    value: "odometer",
    label: "Odometer",
    description: "Warm mechanical flip counter with brass bezels",
  },
  {
    value: "minimal",
    label: "Minimal",
    description: "Subtle accent text — clean and quiet",
  },
  {
    value: "lcd",
    label: "LCD",
    description: "Seven-segment display with ghosted segments",
  },
];

/** Label presets — warm, human options plus a custom escape hatch */
export const HIT_COUNTER_LABEL_PRESETS: {
  value: string;
  label: string;
}[] = [
  { value: "You are visitor", label: "You are visitor (default)" },
  { value: "Wanderer #", label: "Wanderer #" },
  { value: "Welcome, traveler #", label: "Welcome, traveler #" },
  { value: "Soul #", label: "Soul #" },
  { value: "", label: "No label (number only)" },
  { value: "__custom__", label: "Custom..." },
];

/** Count mode options — every hit vs unique daily visitors */
export const HIT_COUNTER_COUNT_MODE_OPTIONS: {
  value: HitCounterCountMode;
  label: string;
  description: string;
}[] = [
  {
    value: "every",
    label: "Every visit",
    description: "Count every page load — classic web counter style",
  },
  {
    value: "unique",
    label: "Unique daily",
    description: "Count each visitor once per day (privacy-preserving hash)",
  },
];

/** Since-date display style options */
export const HIT_COUNTER_SINCE_DATE_STYLE_OPTIONS: {
  value: HitCounterSinceDateStyle;
  label: string;
  description: string;
}[] = [
  {
    value: "footnote",
    label: "Footnote",
    description: "Small italic text below the counter",
  },
  {
    value: "integrated",
    label: "Integrated",
    description: "Etched plaque style — uppercase, letter-spaced",
  },
];

/** Allowed count mode values for server-side validation */
export const VALID_COUNT_MODES: HitCounterCountMode[] = ["every", "unique"];

/** Allowed since-date style values for server-side validation */
export const VALID_SINCE_DATE_STYLES: HitCounterSinceDateStyle[] = [
  "footnote",
  "integrated",
];

/**
 * Default configuration for new hit counters
 */
export const DEFAULT_HIT_COUNTER_CONFIG: Omit<
  HitCounterConfig,
  "id" | "tenantId" | "startedAt"
> = {
  pagePath: "/",
  count: 0,
  style: "classic",
  label: "You are visitor",
  showSinceDate: true,
  countMode: "every",
  sinceDateStyle: "footnote",
};

/** Default counter label */
export const DEFAULT_LABEL = "You are visitor";

/** Maximum label length */
export const MAX_LABEL_LENGTH = 100;

/** Minimum digits to display (zero-padded) */
export const MIN_DISPLAY_DIGITS = 6;

// =============================================================================
// Utility Functions
// =============================================================================

import { stripHtml } from "../sanitize";

/** Generate a unique ID for hit counter records */
export function generateHitCounterId(): string {
  return `hc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Format a count with commas (e.g., 1247 -> "1,247") */
export function formatCount(count: number): string {
  return count.toLocaleString("en-US");
}

/**
 * Split a count into individual digit strings for display.
 * Zero-pads to at least MIN_DISPLAY_DIGITS.
 */
export function toDigits(count: number): string[] {
  const str = String(Math.max(0, Math.floor(count)));
  const padded = str.padStart(MIN_DISPLAY_DIGITS, "0");
  return padded.split("");
}

/** Sanitize a label — trim, limit length, default if empty */
export function sanitizeLabel(label: string | null | undefined): string {
  if (!label) return DEFAULT_LABEL;
  const cleaned = stripHtml(label).trim();
  if (cleaned.length === 0) return DEFAULT_LABEL;
  if (cleaned.length > MAX_LABEL_LENGTH)
    return cleaned.slice(0, MAX_LABEL_LENGTH);
  return cleaned;
}

/** Format a "since" date for display (e.g., "since Jan 15, 2026") */
export function formatSinceDate(dateString: string): string {
  const date = new Date(dateString);
  return `since ${date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

/** Transform DB row to display data */
export function toDisplayCounter(config: HitCounterConfig): HitCounterDisplay {
  return {
    count: config.count,
    formattedCount: formatCount(config.count),
    digits: toDigits(config.count),
    style: config.style,
    label: config.label,
    showSinceDate: config.showSinceDate,
    startedAt: config.startedAt,
    sinceDateStyle: config.sinceDateStyle,
  };
}
