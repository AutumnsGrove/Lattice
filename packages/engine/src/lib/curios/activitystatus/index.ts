/**
 * Activity Status Curio
 *
 * A customizable status indicator — like Discord's custom status, but for
 * your site. "Currently: coding at 2am" or "Away: touching grass."
 * Humanizes your site with a real-time signal.
 *
 * Features:
 * - Manual custom text + emoji
 * - Quick presets (Writing, Coding, Away, etc.)
 * - Optional expiration (auto-clear after X hours)
 * - Tiny display — emoji + text, never more than one line
 * - Empty state: component doesn't render when no status set
 */

// =============================================================================
// Types
// =============================================================================

/**
 * How the status was set
 */
export type StatusType = "manual" | "preset" | "auto";

/**
 * Activity status record stored in database
 */
export interface ActivityStatusRecord {
  tenantId: string;
  statusText: string | null;
  statusEmoji: string | null;
  statusType: StatusType;
  preset: string | null;
  autoSource: string | null;
  expiresAt: string | null;
  updatedAt: string;
}

/**
 * Activity status for display (public)
 */
export interface ActivityStatusDisplay {
  text: string | null;
  emoji: string | null;
  type: StatusType;
  isExpired: boolean;
  updatedAt: string;
}

/**
 * Preset status definition
 */
export interface StatusPreset {
  id: string;
  emoji: string;
  text: string;
  category: "activity" | "away" | "mood";
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Quick-set preset statuses
 */
export const STATUS_PRESETS: StatusPreset[] = [
  // Activity
  { id: "writing", emoji: "✎", text: "Writing", category: "activity" },
  { id: "coding", emoji: "⌨", text: "Coding", category: "activity" },
  { id: "reading", emoji: "☰", text: "Reading", category: "activity" },
  { id: "gaming", emoji: "▣", text: "Gaming", category: "activity" },
  { id: "cooking", emoji: "♨", text: "Cooking", category: "activity" },
  { id: "creating", emoji: "✦", text: "Creating", category: "activity" },
  // Away
  { id: "away", emoji: "→", text: "Away", category: "away" },
  { id: "sleeping", emoji: "ᓚᘏᗢ", text: "Sleeping", category: "away" },
  { id: "vacation", emoji: "☀", text: "On Vacation", category: "away" },
  { id: "grass", emoji: "⌇", text: "Touching grass", category: "away" },
  { id: "walk", emoji: "⇝", text: "Out for a walk", category: "away" },
  // Mood
  { id: "music", emoji: "♪", text: "Listening to music", category: "mood" },
  { id: "watching", emoji: "◉", text: "Watching something", category: "mood" },
  { id: "tea", emoji: "⌇", text: "Having tea", category: "mood" },
  { id: "nightowl", emoji: "☽", text: "Night owl mode", category: "mood" },
];

/**
 * Maximum status text length
 */
export const MAX_STATUS_TEXT_LENGTH = 100;

/**
 * Maximum expiration hours
 */
export const MAX_EXPIRATION_HOURS = 168; // 1 week

/**
 * Valid status types
 */
export const VALID_STATUS_TYPES = new Set<string>(["manual", "preset", "auto"]);

/**
 * Valid preset IDs
 */
export const VALID_PRESET_IDS = new Set<string>(
  STATUS_PRESETS.map((p) => p.id),
);

// =============================================================================
// Utility Functions
// =============================================================================

import { stripHtml } from "../sanitize";

/**
 * Check if a status has expired
 */
export function isStatusExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() < Date.now();
}

/**
 * Get a preset by ID
 */
export function getPreset(id: string): StatusPreset | undefined {
  return STATUS_PRESETS.find((p) => p.id === id);
}

/**
 * Validate a status type string
 */
export function isValidStatusType(type: string): type is StatusType {
  return VALID_STATUS_TYPES.has(type);
}

/**
 * Sanitize status text — trim, strip HTML, limit length
 */
export function sanitizeStatusText(
  text: string | null | undefined,
): string | null {
  if (!text) return null;
  const cleaned = stripHtml(text).trim();
  if (cleaned.length === 0) return null;
  if (cleaned.length > MAX_STATUS_TEXT_LENGTH)
    return cleaned.slice(0, MAX_STATUS_TEXT_LENGTH);
  return cleaned;
}

/**
 * Sanitize a status emoji — single emoji only
 */
export function sanitizeStatusEmoji(
  emoji: string | null | undefined,
): string | null {
  if (!emoji) return null;
  const trimmed = emoji.trim();
  // Allow emoji sequences up to 10 chars (some emoji are multi-codepoint)
  if (trimmed.length === 0 || trimmed.length > 10) return null;
  return trimmed;
}

/**
 * Calculate expiration timestamp from hours
 */
export function calculateExpiration(hours: number | null): string | null {
  if (!hours || hours <= 0) return null;
  const clamped = Math.min(hours, MAX_EXPIRATION_HOURS);
  return new Date(Date.now() + clamped * 60 * 60 * 1000).toISOString();
}

/**
 * Transform DB row to display data
 */
export function toDisplayStatus(
  record: ActivityStatusRecord,
): ActivityStatusDisplay {
  const expired = isStatusExpired(record.expiresAt);
  return {
    text: expired ? null : record.statusText,
    emoji: expired ? null : record.statusEmoji,
    type: record.statusType,
    isExpired: expired,
    updatedAt: record.updatedAt,
  };
}

/**
 * Format "last updated" text
 */
export function formatStatusTime(dateString: string): string {
  const date = new Date(dateString);
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
