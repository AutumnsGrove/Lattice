/**
 * Webring Hub Curio
 *
 * Classic indie web webrings — join rings, display navigation.
 * Phase 1: External webrings with manual prev/next URLs.
 *
 * Features:
 * - Multiple ring memberships
 * - 4 display styles (Classic bar, Badge, Compact, Floating)
 * - Configurable position
 * - Simple CRUD for ring management
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Badge display style
 */
export type WebringBadgeStyle = "classic" | "badge" | "compact" | "floating";

/**
 * Webring position
 */
export type WebringPosition = "footer" | "header" | "right-vine" | "floating";

/**
 * Webring membership record
 */
export interface WebringRecord {
  id: string;
  tenantId: string;
  ringName: string;
  ringUrl: string | null;
  prevUrl: string;
  nextUrl: string;
  homeUrl: string | null;
  badgeStyle: WebringBadgeStyle;
  position: WebringPosition;
  sortOrder: number;
  joinedAt: string;
}

/**
 * Webring for display
 */
export interface WebringDisplay {
  id: string;
  ringName: string;
  ringUrl: string | null;
  prevUrl: string;
  nextUrl: string;
  homeUrl: string | null;
  badgeStyle: WebringBadgeStyle;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Badge style options
 */
export const BADGE_STYLE_OPTIONS: {
  value: WebringBadgeStyle;
  label: string;
  description: string;
}[] = [
  {
    value: "classic",
    label: "Classic Bar",
    description: "[← Prev | Ring Name | Next →]",
  },
  {
    value: "badge",
    label: "88x31 Badge",
    description: "Tiny button badge — the web classic",
  },
  {
    value: "compact",
    label: "Compact",
    description: "Text-only, minimal space",
  },
  {
    value: "floating",
    label: "Floating",
    description: "Fixed-position corner widget",
  },
];

/**
 * Position options
 */
export const POSITION_OPTIONS: {
  value: WebringPosition;
  label: string;
}[] = [
  { value: "footer", label: "Footer" },
  { value: "header", label: "Header" },
  { value: "right-vine", label: "Right Sidebar" },
  { value: "floating", label: "Floating" },
];

/**
 * Valid badge styles
 */
export const VALID_BADGE_STYLES = new Set<string>(
  BADGE_STYLE_OPTIONS.map((s) => s.value),
);

/**
 * Valid positions
 */
export const VALID_POSITIONS = new Set<string>(
  POSITION_OPTIONS.map((p) => p.value),
);

/**
 * Maximum ring name length
 */
export const MAX_RING_NAME_LENGTH = 100;

/**
 * Maximum URL length
 */
export const MAX_URL_LENGTH = 2048;

/**
 * Max webring entries per tenant
 */
export const MAX_WEBRING_ENTRIES_PER_TENANT = 100;

// =============================================================================
// Utility Functions
// =============================================================================

import { stripHtml } from "../sanitize";

/**
 * Generate a unique webring ID
 */
export function generateWebringId(): string {
  return `wr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Validate badge style
 */
export function isValidBadgeStyle(style: string): style is WebringBadgeStyle {
  return VALID_BADGE_STYLES.has(style);
}

/**
 * Validate position
 */
export function isValidPosition(position: string): position is WebringPosition {
  return VALID_POSITIONS.has(position);
}

/**
 * Validate a URL
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Sanitize ring name
 */
export function sanitizeRingName(
  name: string | null | undefined,
): string | null {
  if (!name) return null;
  const cleaned = stripHtml(name).trim();
  if (cleaned.length === 0) return null;
  if (cleaned.length > MAX_RING_NAME_LENGTH)
    return cleaned.slice(0, MAX_RING_NAME_LENGTH);
  return cleaned;
}

/**
 * Transform record to display format
 */
export function toDisplayWebring(record: WebringRecord): WebringDisplay {
  return {
    id: record.id,
    ringName: record.ringName,
    ringUrl: record.ringUrl,
    prevUrl: record.prevUrl,
    nextUrl: record.nextUrl,
    homeUrl: record.homeUrl,
    badgeStyle: record.badgeStyle,
  };
}
