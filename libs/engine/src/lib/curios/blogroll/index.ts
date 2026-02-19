/**
 * Blogroll Curio
 *
 * Blog recommendations with optional RSS/Atom feed tracking.
 * The classic content discovery mechanism, revived.
 *
 * Features:
 * - Curated blog list with descriptions
 * - Auto-favicon fetching
 * - RSS feed URL storage (feed parsing via Worker cron, future)
 * - Latest post title/URL/date display
 * - OPML import/export (Oak+, future)
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Blogroll item record
 */
export interface BlogrollItemRecord {
  id: string;
  tenantId: string;
  url: string;
  title: string;
  description: string | null;
  feedUrl: string | null;
  faviconUrl: string | null;
  lastPostTitle: string | null;
  lastPostUrl: string | null;
  lastPostDate: string | null;
  lastFeedCheck: string | null;
  sortOrder: number;
  addedAt: string;
  updatedAt: string;
}

/**
 * Blogroll item for public display
 */
export interface BlogrollItemDisplay {
  id: string;
  url: string;
  title: string;
  description: string | null;
  faviconUrl: string | null;
  lastPostTitle: string | null;
  lastPostUrl: string | null;
  lastPostDate: string | null;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Max title length
 */
export const MAX_TITLE_LENGTH = 100;

/**
 * Max description length
 */
export const MAX_DESCRIPTION_LENGTH = 300;

/**
 * Max URL length
 */
export const MAX_URL_LENGTH = 2048;

/**
 * Max feed URL length
 */
export const MAX_FEED_URL_LENGTH = 2048;

/**
 * Max blogroll entries per tenant
 */
export const MAX_BLOGROLL_ENTRIES_PER_TENANT = 500;

// =============================================================================
// Utility Functions
// =============================================================================

import { stripHtml } from "../sanitize";

/**
 * Generate a blogroll item ID
 */
export function generateBlogrollId(): string {
  return `br_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Validate URL (http or https)
 */
export function isValidUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * Sanitize title
 */
export function sanitizeTitle(text: string | null | undefined): string | null {
  if (!text) return null;
  const cleaned = stripHtml(text).trim();
  if (cleaned.length === 0) return null;
  if (cleaned.length > MAX_TITLE_LENGTH)
    return cleaned.slice(0, MAX_TITLE_LENGTH);
  return cleaned;
}

/**
 * Sanitize description
 */
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

/**
 * Build favicon URL from site URL using Google S2
 */
export function buildFaviconUrl(siteUrl: string): string {
  try {
    const u = new URL(siteUrl);
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(u.hostname)}&sz=32`;
  } catch {
    return "";
  }
}

/**
 * Format a date string for display
 */
export function formatPostDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "today";
    if (diffDays === 1) return "yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  } catch {
    return null;
  }
}

/**
 * Transform record to public display
 */
export function toDisplayBlogrollItem(
  record: BlogrollItemRecord,
): BlogrollItemDisplay {
  return {
    id: record.id,
    url: record.url,
    title: record.title,
    description: record.description,
    faviconUrl: record.faviconUrl,
    lastPostTitle: record.lastPostTitle,
    lastPostUrl: record.lastPostUrl,
    lastPostDate: record.lastPostDate,
  };
}
