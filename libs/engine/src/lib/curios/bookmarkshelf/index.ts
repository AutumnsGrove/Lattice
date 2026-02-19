/**
 * Bookmark Shelf Curio
 *
 * Curated reading list displayed as a visual bookshelf.
 * Books arranged as spines on shelves, color-coded by category.
 *
 * Features:
 * - Multiple shelves for organization
 * - Currently Reading section
 * - Favorites highlighting
 * - Cover images from Open Graph
 * - Category color-coding
 */

// =============================================================================
// Types
// =============================================================================

export interface ShelfRecord {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface BookmarkRecord {
  id: string;
  tenantId: string;
  shelfId: string;
  url: string;
  title: string;
  author: string | null;
  description: string | null;
  coverUrl: string | null;
  category: string | null;
  isCurrentlyReading: boolean;
  isFavorite: boolean;
  sortOrder: number;
  addedAt: string;
}

export interface ShelfDisplay {
  id: string;
  name: string;
  description: string | null;
  bookmarks: BookmarkDisplay[];
}

export interface BookmarkDisplay {
  id: string;
  url: string;
  title: string;
  author: string | null;
  description: string | null;
  coverUrl: string | null;
  category: string | null;
  isCurrentlyReading: boolean;
  isFavorite: boolean;
}

// =============================================================================
// Constants
// =============================================================================

export const MAX_SHELF_NAME_LENGTH = 100;
export const MAX_BOOKMARK_TITLE_LENGTH = 200;
export const MAX_AUTHOR_LENGTH = 100;
export const MAX_DESCRIPTION_LENGTH = 500;
export const MAX_URL_LENGTH = 2048;
export const MAX_CATEGORY_LENGTH = 50;

/**
 * Max shelves per tenant
 */
export const MAX_SHELVES_PER_TENANT = 50;

export const DEFAULT_CATEGORIES: string[] = [
  "Fiction",
  "Non-Fiction",
  "Technical",
  "Poetry",
  "Zines",
  "Comics",
  "Essays",
  "Tutorials",
];

// =============================================================================
// Utility Functions
// =============================================================================

import { stripHtml } from "../sanitize";

export function generateShelfId(): string {
  return `shelf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function generateBookmarkId(): string {
  return `bm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function isValidUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

export function sanitizeShelfName(
  text: string | null | undefined,
): string | null {
  if (!text) return null;
  const cleaned = stripHtml(text).trim();
  if (cleaned.length === 0) return null;
  if (cleaned.length > MAX_SHELF_NAME_LENGTH)
    return cleaned.slice(0, MAX_SHELF_NAME_LENGTH);
  return cleaned;
}

export function sanitizeTitle(text: string | null | undefined): string | null {
  if (!text) return null;
  const cleaned = stripHtml(text).trim();
  if (cleaned.length === 0) return null;
  if (cleaned.length > MAX_BOOKMARK_TITLE_LENGTH)
    return cleaned.slice(0, MAX_BOOKMARK_TITLE_LENGTH);
  return cleaned;
}

export function sanitizeAuthor(text: string | null | undefined): string | null {
  if (!text) return null;
  const cleaned = stripHtml(text).trim();
  if (cleaned.length === 0) return null;
  if (cleaned.length > MAX_AUTHOR_LENGTH)
    return cleaned.slice(0, MAX_AUTHOR_LENGTH);
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

export function sanitizeCategory(
  text: string | null | undefined,
): string | null {
  if (!text) return null;
  const cleaned = stripHtml(text).trim();
  if (cleaned.length === 0) return null;
  if (cleaned.length > MAX_CATEGORY_LENGTH)
    return cleaned.slice(0, MAX_CATEGORY_LENGTH);
  return cleaned;
}

export function toDisplayBookmark(record: BookmarkRecord): BookmarkDisplay {
  return {
    id: record.id,
    url: record.url,
    title: record.title,
    author: record.author,
    description: record.description,
    coverUrl: record.coverUrl,
    category: record.category,
    isCurrentlyReading: record.isCurrentlyReading,
    isFavorite: record.isFavorite,
  };
}
