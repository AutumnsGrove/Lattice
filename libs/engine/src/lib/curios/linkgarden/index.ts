/**
 * Link Gardens Curio
 *
 * Curated link collections — blogroll, friends list, cool sites.
 * Multiple display styles from clean lists to the classic 88x31 button wall.
 * The indie web's answer to algorithmic discovery.
 *
 * Features:
 * - 4 display styles (List, Grid, Buttons/88x31, Marquee)
 * - Favicon auto-fetch
 * - Category grouping
 * - Drag-and-drop reordering
 * - Public page at /links/
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Garden display style
 */
export type LinkGardenStyle = "list" | "grid" | "buttons" | "marquee";

/**
 * Link garden record stored in database
 */
export interface LinkGardenRecord {
  id: string;
  tenantId: string;
  title: string;
  description: string | null;
  style: LinkGardenStyle;
  createdAt: string;
  updatedAt: string;
}

/**
 * Individual link item record
 */
export interface LinkItemRecord {
  id: string;
  gardenId: string;
  tenantId: string;
  url: string;
  title: string;
  description: string | null;
  faviconUrl: string | null;
  buttonImageUrl: string | null;
  category: string | null;
  sortOrder: number;
  addedAt: string;
}

/**
 * Garden with its links for display
 */
export interface LinkGardenDisplay {
  id: string;
  title: string;
  description: string | null;
  style: LinkGardenStyle;
  links: LinkItemDisplay[];
}

/**
 * Link item for display
 */
export interface LinkItemDisplay {
  id: string;
  url: string;
  title: string;
  description: string | null;
  faviconUrl: string | null;
  buttonImageUrl: string | null;
  category: string | null;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Garden style options
 */
export const GARDEN_STYLE_OPTIONS: {
  value: LinkGardenStyle;
  label: string;
  description: string;
}[] = [
  {
    value: "list",
    label: "List",
    description: "Vertical list with descriptions and favicons",
  },
  {
    value: "grid",
    label: "Grid",
    description: "Icon grid with tooltips on hover",
  },
  {
    value: "buttons",
    label: "88x31 Buttons",
    description: "Classic web button wall — the indie web staple",
  },
  {
    value: "marquee",
    label: "Marquee",
    description: "Scrolling links — pure nostalgia",
  },
];

/**
 * Valid garden styles
 */
export const VALID_GARDEN_STYLES = new Set<string>(
  GARDEN_STYLE_OPTIONS.map((s) => s.value),
);

/**
 * Maximum title length
 */
export const MAX_TITLE_LENGTH = 100;

/**
 * Maximum description length
 */
export const MAX_DESCRIPTION_LENGTH = 300;

/**
 * Maximum URL length
 */
export const MAX_URL_LENGTH = 2048;

/**
 * Maximum link title length
 */
export const MAX_LINK_TITLE_LENGTH = 150;

/**
 * Maximum link description length
 */
export const MAX_LINK_DESCRIPTION_LENGTH = 300;

/**
 * Maximum category name length
 */
export const MAX_CATEGORY_LENGTH = 50;

/**
 * Max link gardens per tenant
 */
export const MAX_LINK_GARDENS_PER_TENANT = 50;

/**
 * Max links per garden
 */
export const MAX_LINKS_PER_GARDEN = 200;

// =============================================================================
// Utility Functions
// =============================================================================

import { stripHtml } from "../sanitize";

/**
 * Generate a unique ID for garden records
 */
export function generateGardenId(): string {
  return `lg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Generate a unique ID for link item records
 */
export function generateLinkId(): string {
  return `li_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Validate a garden style
 */
export function isValidGardenStyle(style: string): style is LinkGardenStyle {
  return VALID_GARDEN_STYLES.has(style);
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
 * Sanitize text — trim, strip HTML, limit length
 */
export function sanitizeText(
  text: string | null | undefined,
  maxLength: number,
): string | null {
  if (!text) return null;
  const cleaned = stripHtml(text).trim();
  if (cleaned.length === 0) return null;
  if (cleaned.length > maxLength) return cleaned.slice(0, maxLength);
  return cleaned;
}

/**
 * Sanitize a garden title (required, non-null)
 */
export function sanitizeTitle(title: string | null | undefined): string {
  if (!title) return "Links";
  const cleaned = stripHtml(title).trim();
  if (cleaned.length === 0) return "Links";
  if (cleaned.length > MAX_TITLE_LENGTH)
    return cleaned.slice(0, MAX_TITLE_LENGTH);
  return cleaned;
}

/**
 * Sanitize a link title (required, non-null)
 */
export function sanitizeLinkTitle(title: string | null | undefined): string {
  if (!title) return "Untitled Link";
  const cleaned = stripHtml(title).trim();
  if (cleaned.length === 0) return "Untitled Link";
  if (cleaned.length > MAX_LINK_TITLE_LENGTH)
    return cleaned.slice(0, MAX_LINK_TITLE_LENGTH);
  return cleaned;
}

/**
 * Build a favicon URL from a site URL using Google's service
 */
export function buildFaviconUrl(siteUrl: string): string | null {
  try {
    const parsed = new URL(siteUrl);
    return `https://www.google.com/s2/favicons?domain=${parsed.hostname}&sz=32`;
  } catch {
    return null;
  }
}

/**
 * Transform DB garden row + link rows to display format
 */
export function toDisplayGarden(
  garden: LinkGardenRecord,
  links: LinkItemRecord[],
): LinkGardenDisplay {
  return {
    id: garden.id,
    title: garden.title,
    description: garden.description,
    style: garden.style,
    links: links
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((link) => ({
        id: link.id,
        url: link.url,
        title: link.title,
        description: link.description,
        faviconUrl: link.faviconUrl,
        buttonImageUrl: link.buttonImageUrl,
        category: link.category,
      })),
  };
}
