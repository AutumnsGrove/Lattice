/**
 * Status Badges Curio
 *
 * Site status indicators — "Under Construction," "Just Planted," "Grand Opening."
 * Small, expressive badges that signal the state of your site.
 * Free for all tiers. Tiny effort, huge personality.
 *
 * Features:
 * - 9 badge types (manual + auto-detected)
 * - CSS-only animations (respects prefers-reduced-motion)
 * - Multiple badges can stack
 * - Configurable position (floating, header-vine, right-vine, footer-vine)
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Available badge types
 */
export type StatusBadgeType =
  | "under-construction"
  | "just-planted"
  | "coming-soon"
  | "new-and-shiny"
  | "on-hiatus"
  | "grand-opening"
  | "night-owl"
  | "last-updated"
  | "fresh-post";

/**
 * Badge placement positions
 */
export type BadgePosition =
  | "floating"
  | "header-vine"
  | "right-vine"
  | "footer-vine";

/**
 * Whether a badge is triggered manually or auto-detected
 */
export type BadgeTrigger = "manual" | "auto";

/**
 * Badge definition with metadata
 */
export interface BadgeDefinition {
  type: StatusBadgeType;
  name: string;
  description: string;
  emoji: string;
  trigger: BadgeTrigger;
}

/**
 * Status badge record stored in database
 */
export interface StatusBadgeRecord {
  id: string;
  tenantId: string;
  badgeType: StatusBadgeType;
  position: BadgePosition;
  animated: boolean;
  customText: string | null;
  showDate: boolean;
  createdAt: string;
}

/**
 * Status badge for display (public)
 */
export interface StatusBadgeDisplay {
  id: string;
  badgeType: StatusBadgeType;
  position: BadgePosition;
  animated: boolean;
  label: string;
  emoji: string;
  customText: string | null;
  showDate: boolean;
  dateText: string | null;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * All available badge types with their metadata
 */
export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    type: "under-construction",
    name: "Under Construction",
    description: "This site is a work in progress",
    emoji: "🚧",
    trigger: "manual",
  },
  {
    type: "just-planted",
    name: "Just Planted",
    description: "A brand new seedling (auto: < 7 days old)",
    emoji: "🌱",
    trigger: "auto",
  },
  {
    type: "coming-soon",
    name: "Coming Soon",
    description: "Something new is on the way",
    emoji: "🔮",
    trigger: "manual",
  },
  {
    type: "new-and-shiny",
    name: "New & Shiny",
    description: "Fresh out of the oven (auto: < 30 days old)",
    emoji: "✨",
    trigger: "auto",
  },
  {
    type: "on-hiatus",
    name: "On Hiatus",
    description: "Taking a break — be back soon",
    emoji: "🌙",
    trigger: "manual",
  },
  {
    type: "grand-opening",
    name: "Grand Opening",
    description: "Celebrate your launch!",
    emoji: "🎉",
    trigger: "manual",
  },
  {
    type: "night-owl",
    name: "Night Owl",
    description: "Posting after midnight (auto: > 50% night posts)",
    emoji: "🦉",
    trigger: "auto",
  },
  {
    type: "last-updated",
    name: "Last Updated",
    description: "Shows when you last posted",
    emoji: "📅",
    trigger: "auto",
  },
  {
    type: "fresh-post",
    name: "Fresh Post",
    description: "New content within 48 hours",
    emoji: "✏️",
    trigger: "auto",
  },
];

/**
 * Badge position options
 */
export const BADGE_POSITION_OPTIONS: {
  value: BadgePosition;
  label: string;
}[] = [
  { value: "floating", label: "Floating (corner)" },
  { value: "header-vine", label: "Header" },
  { value: "right-vine", label: "Right sidebar" },
  { value: "footer-vine", label: "Footer" },
];

/**
 * Valid badge types as a set for validation
 */
export const VALID_BADGE_TYPES = new Set<string>(
  BADGE_DEFINITIONS.map((b) => b.type),
);

/**
 * Valid badge positions as a set for validation
 */
export const VALID_BADGE_POSITIONS = new Set<string>(
  BADGE_POSITION_OPTIONS.map((p) => p.value),
);

/**
 * Maximum custom text length
 */
export const MAX_CUSTOM_TEXT_LENGTH = 80;

/**
 * Max status badges per tenant
 */
export const MAX_STATUS_BADGES_PER_TENANT = 50;

// =============================================================================
// Utility Functions
// =============================================================================

import { stripHtml } from "../sanitize";

/**
 * Generate a unique ID for status badge records
 */
export function generateBadgeId(): string {
  return `sb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Get a badge definition by type
 */
export function getBadgeDefinition(
  type: StatusBadgeType,
): BadgeDefinition | undefined {
  return BADGE_DEFINITIONS.find((b) => b.type === type);
}

/**
 * Validate a badge type string
 */
export function isValidBadgeType(type: string): type is StatusBadgeType {
  return VALID_BADGE_TYPES.has(type);
}

/**
 * Validate a badge position string
 */
export function isValidBadgePosition(
  position: string,
): position is BadgePosition {
  return VALID_BADGE_POSITIONS.has(position);
}

/**
 * Sanitize custom text — trim, strip HTML, limit length
 */
export function sanitizeCustomText(
  text: string | null | undefined,
): string | null {
  if (!text) return null;
  const cleaned = stripHtml(text).trim();
  if (cleaned.length === 0) return null;
  if (cleaned.length > MAX_CUSTOM_TEXT_LENGTH)
    return cleaned.slice(0, MAX_CUSTOM_TEXT_LENGTH);
  return cleaned;
}

/**
 * Transform a DB row to display badge
 */
export function toDisplayBadge(record: StatusBadgeRecord): StatusBadgeDisplay {
  const definition = getBadgeDefinition(record.badgeType);
  return {
    id: record.id,
    badgeType: record.badgeType,
    position: record.position,
    animated: record.animated,
    label: definition?.name ?? record.badgeType,
    emoji: definition?.emoji ?? "🏷️",
    customText: record.customText,
    showDate: record.showDate,
    dateText: record.showDate ? formatBadgeDate(record.createdAt) : null,
  };
}

/**
 * Format a badge date for display
 */
export function formatBadgeDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
