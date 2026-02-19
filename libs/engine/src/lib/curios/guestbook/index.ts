/**
 * Guestbook Curio
 *
 * Visitor signatures with moderation, display styles, and rate limiting.
 * The classic personal web element — someone visited and wanted to say hi.
 *
 * Features:
 * - Public signing (no login required)
 * - Configurable approval workflow
 * - 4 display styles: Classic, Modern, Pixel, Cozy
 * - Rate limiting via IP hash
 * - Emoji support from curated set
 * - Vine-compatible mini view
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Guestbook display style options
 */
export type GuestbookStyle = "classic" | "modern" | "pixel" | "cozy";

/**
 * Guestbook configuration stored per tenant
 */
export interface GuestbookConfig {
  enabled: boolean;
  style: GuestbookStyle;
  entriesPerPage: number;
  requireApproval: boolean;
  allowEmoji: boolean;
  maxMessageLength: number;
  customPrompt: string | null;
}

/**
 * Guestbook entry stored in database
 */
export interface GuestbookEntry {
  id: string;
  tenantId: string;
  name: string;
  message: string;
  emoji: string | null;
  approved: boolean;
  ipHash: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Guestbook entry for public display (no sensitive fields)
 */
export interface GuestbookDisplayEntry {
  id: string;
  name: string;
  message: string;
  emoji: string | null;
  createdAt: string;
}

/**
 * Pagination info for guestbook API responses
 */
export interface GuestbookPagination {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Curated emoji set for guestbook entries.
 * Limited to friendly, non-offensive options.
 */
export const GUESTBOOK_EMOJI = [
  "🌿",
  "🌱",
  "🍃",
  "🌸",
  "🌻",
  "🌺",
  "🍂",
  "🍁",
  "❄️",
  "🌙",
  "⭐",
  "✨",
  "🦋",
  "🐝",
  "🐞",
  "🌈",
  "☀️",
  "🌊",
  "🔥",
  "💜",
  "💚",
  "💛",
  "🤍",
  "🖤",
  "🫶",
  "👋",
  "🎵",
  "📖",
  "🫧",
  "🕯️",
] as const;

/**
 * Display style options with labels and descriptions
 */
export const GUESTBOOK_STYLE_OPTIONS: {
  value: GuestbookStyle;
  label: string;
  description: string;
}[] = [
  {
    value: "cozy",
    label: "Cozy",
    description: "Warm, rounded, handwriting-feel (default)",
  },
  {
    value: "classic",
    label: "Classic",
    description: "Bordered entries, old-web feel",
  },
  {
    value: "modern",
    label: "Modern",
    description: "Clean cards with subtle shadows",
  },
  {
    value: "pixel",
    label: "Pixel",
    description: "Retro pixelated borders, monospace",
  },
];

/**
 * Default configuration for new guestbook setups
 */
export const DEFAULT_GUESTBOOK_CONFIG: GuestbookConfig = {
  enabled: false,
  style: "cozy",
  entriesPerPage: 20,
  requireApproval: true,
  allowEmoji: true,
  maxMessageLength: 500,
  customPrompt: null,
};

/**
 * Rate limit: minimum minutes between entries from same IP
 */
export const RATE_LIMIT_MINUTES = 10;

/**
 * Maximum name length
 */
export const MAX_NAME_LENGTH = 50;

/**
 * Default name for anonymous visitors
 */
export const DEFAULT_NAME = "Anonymous Wanderer";

/**
 * Mini view: number of recent entries to show in vine placement
 */
export const MINI_VIEW_COUNT = 3;

// =============================================================================
// Utility Functions
// =============================================================================

import { stripHtml } from "../sanitize";

/**
 * Generate a unique ID for guestbook entries
 */
export function generateGuestbookId(): string {
  return `gb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Transform a database entry row to a safe display entry (strips ip_hash)
 */
export function toDisplayEntry(entry: GuestbookEntry): GuestbookDisplayEntry {
  return {
    id: entry.id,
    name: entry.name,
    message: entry.message,
    emoji: entry.emoji,
    createdAt: entry.createdAt,
  };
}

const GUESTBOOK_EMOJI_SET = new Set<string>(GUESTBOOK_EMOJI);

/**
 * Validate an emoji is from the curated set (O(1) lookup)
 */
export function isValidEmoji(emoji: string): boolean {
  return GUESTBOOK_EMOJI_SET.has(emoji);
}

/**
 * Sanitize a display name — trim, strip HTML, limit length, default if empty
 */
export function sanitizeName(name: string | null | undefined): string {
  if (!name) return DEFAULT_NAME;
  const cleaned = stripHtml(name).trim();
  if (cleaned.length === 0) return DEFAULT_NAME;
  if (cleaned.length > MAX_NAME_LENGTH)
    return cleaned.slice(0, MAX_NAME_LENGTH);
  return cleaned;
}

/**
 * Sanitize a message — trim and enforce length limit
 */
export function sanitizeMessage(
  message: string,
  maxLength: number,
): string | null {
  const cleaned = stripHtml(message).trim();
  if (cleaned.length === 0) return null;
  if (cleaned.length > maxLength) return cleaned.slice(0, maxLength);
  return cleaned;
}

/**
 * Basic spam detection — catches obvious link spam and repeated chars.
 * Returns true if the message looks like spam.
 */
export function isSpam(message: string): boolean {
  const lower = message.toLowerCase();

  // Link spam: too many URLs
  const urlCount = (lower.match(/https?:\/\//g) || []).length;
  if (urlCount > 2) return true;

  // Repeated characters (e.g., "aaaaaaaa")
  if (/(.)\1{9,}/.test(lower)) return true;

  // Common spam phrases
  const spamPhrases = [
    "buy now",
    "click here",
    "free money",
    "earn money",
    "casino",
    "crypto airdrop",
    "whatsapp me",
    "telegram me",
    "follow me on",
    "check my profile",
  ];
  if (spamPhrases.some((phrase) => lower.includes(phrase))) return true;

  return false;
}

/**
 * Format a relative time string from an ISO date
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}
