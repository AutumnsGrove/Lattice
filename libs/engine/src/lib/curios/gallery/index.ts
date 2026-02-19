/**
 * Gallery Curio
 *
 * R2-backed image gallery with rich metadata, tags, and collections.
 * Hybrid architecture: images in R2, metadata in D1.
 *
 * Features:
 * - Automatic metadata parsing from filenames
 * - Tags and collections for organization
 * - Multi-tenant support
 * - Configurable display (grid styles, sorting, filtering)
 * - Lightbox viewing
 */

// =============================================================================
// Re-export utilities from $lib/utils/gallery
// =============================================================================

export {
  parseImageFilename,
  getImageTitle,
  getImageDate,
  searchImages,
  filterImagesByDateRange,
  filterImagesByTags,
  filterImagesByCategory,
  getAvailableYears,
  getAvailableCategories,
  type ParsedImageMetadata,
  type ImageTag,
  type GalleryImage,
} from "$lib/utils/gallery";

// =============================================================================
// Types
// =============================================================================

/**
 * Gallery curio configuration stored per tenant
 */
export interface GalleryCurioConfig {
  enabled: boolean;

  // R2 Storage
  r2Bucket?: string;
  cdnBaseUrl?: string;

  // Display Settings
  galleryTitle?: string;
  galleryDescription?: string;
  itemsPerPage: number;
  sortOrder: GallerySortOrder;

  // Feature Toggles
  showDescriptions: boolean;
  showDates: boolean;
  showTags: boolean;
  enableLightbox: boolean;
  enableSearch: boolean;
  enableFilters: boolean;

  // Layout
  gridStyle: GalleryGridStyle;
  thumbnailSize: GalleryThumbnailSize;

  // Advanced
  settings?: Record<string, unknown>;
  customCss?: string;
}

/**
 * Sort order options for gallery display
 */
export type GallerySortOrder =
  | "date-desc"
  | "date-asc"
  | "title-asc"
  | "title-desc";

/**
 * Grid layout style options
 */
export type GalleryGridStyle = "masonry" | "uniform" | "mood-board";

/**
 * Thumbnail size options
 */
export type GalleryThumbnailSize = "small" | "medium" | "large";

/**
 * Gallery image stored in database (full schema)
 */
export interface GalleryImageRecord {
  id: string;
  tenantId: string;
  r2Key: string;

  // Parsed metadata
  parsedDate: string | null;
  parsedCategory: string | null;
  parsedSlug: string | null;

  // Custom metadata
  customTitle: string | null;
  customDescription: string | null;
  customDate: string | null;
  altText: string | null;

  // R2 cached data
  fileSize: number | null;
  uploadedAt: string | null;
  cdnUrl: string | null;

  // Dimensions
  width: number | null;
  height: number | null;

  // Display
  sortIndex: number;
  isFeatured: boolean;

  createdAt: number;
  updatedAt: number;

  // Joined data (optional)
  tags?: GalleryTagRecord[];
}

/**
 * Gallery tag stored in database
 */
export interface GalleryTagRecord {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  color: string;
  description: string | null;
  sortOrder: number;
  createdAt: number;
}

/**
 * Gallery collection stored in database
 */
export interface GalleryCollectionRecord {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  description: string | null;
  coverImageId: string | null;
  displayOrder: number;
  isPublic: boolean;
  createdAt: number;
  updatedAt: number;

  // Joined data (optional)
  coverImage?: GalleryImageRecord;
  imageCount?: number;
}

/**
 * Display image (transformed for frontend)
 */
export interface GalleryDisplayImage {
  id: string;
  r2Key: string;
  url: string;

  // Display metadata
  title: string;
  description: string | null;
  date: string | null;
  category: string | null;
  altText: string | null;

  // Image info
  fileSize: number | null;
  width: number | null;
  height: number | null;

  // Tags
  tags: GalleryTagRecord[];

  // Flags
  isFeatured: boolean;
}

/**
 * Gallery filters available for the current dataset
 */
export interface GalleryFilters {
  years: string[];
  categories: string[];
  tags: GalleryTagRecord[];
  collections: GalleryCollectionRecord[];
}

/**
 * Pagination info for gallery API responses
 */
export interface GalleryPagination {
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  hasMore: boolean;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Supported image file extensions
 */
export const SUPPORTED_IMAGE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".avif",
] as const;

/**
 * Grid style options with labels
 */
export const GRID_STYLE_OPTIONS: { value: GalleryGridStyle; label: string }[] =
  [
    { value: "masonry", label: "Masonry" },
    { value: "uniform", label: "Uniform Grid" },
    { value: "mood-board", label: "Mood Board" },
  ];

/**
 * Sort order options with labels
 */
export const SORT_ORDER_OPTIONS: { value: GallerySortOrder; label: string }[] =
  [
    { value: "date-desc", label: "Newest First" },
    { value: "date-asc", label: "Oldest First" },
    { value: "title-asc", label: "Title A-Z" },
    { value: "title-desc", label: "Title Z-A" },
  ];

/**
 * Thumbnail size options with labels
 */
export const THUMBNAIL_SIZE_OPTIONS: {
  value: GalleryThumbnailSize;
  label: string;
}[] = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
];

/**
 * Default tag color (Grove green)
 */
export const DEFAULT_TAG_COLOR = "#5cb85f";

/**
 * Maximum items per batch for lazy loading
 */
export const MAX_ITEMS_PER_PAGE = 100;

/**
 * Max gallery tags per tenant
 */
export const MAX_GALLERY_TAGS_PER_TENANT = 200;

/**
 * Default configuration for new Gallery Curio setups
 */
export const DEFAULT_GALLERY_CONFIG: Omit<
  GalleryCurioConfig,
  "r2Bucket" | "cdnBaseUrl"
> = {
  enabled: false,
  itemsPerPage: 30,
  sortOrder: "date-desc",
  showDescriptions: true,
  showDates: true,
  showTags: true,
  enableLightbox: true,
  enableSearch: true,
  enableFilters: true,
  gridStyle: "masonry",
  thumbnailSize: "medium",
};

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Check if a filename is a supported image type
 */
export function isSupportedImage(filename: string): boolean {
  const lower = filename.toLowerCase();
  return SUPPORTED_IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/**
 * Transform database record to display image
 */
export function toDisplayImage(
  record: GalleryImageRecord,
  cdnBaseUrl: string,
): GalleryDisplayImage {
  return {
    id: record.id,
    r2Key: record.r2Key,
    url: record.cdnUrl || `${cdnBaseUrl}/${record.r2Key}`,
    title:
      record.customTitle ||
      (record.parsedSlug
        ? record.parsedSlug
            .split("-")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ")
        : "Untitled"),
    description: record.customDescription,
    date: record.customDate || record.parsedDate,
    category: record.parsedCategory,
    altText: record.altText,
    fileSize: record.fileSize,
    width: record.width,
    height: record.height,
    tags: record.tags || [],
    isFeatured: record.isFeatured,
  };
}

/**
 * Generate a unique ID for gallery records
 */
export function generateGalleryId(): string {
  return `gal_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Maximum length for custom CSS (prevents excessive storage/processing)
 */
export const MAX_CUSTOM_CSS_LENGTH = 10_000;

/**
 * Dangerous CSS patterns that could enable data exfiltration or injection.
 * Strips url(), @import, expression(), -moz-binding, and behavior().
 */
const DANGEROUS_CSS_PATTERNS = [
  /url\s*\(/gi,
  /@import\b/gi,
  /expression\s*\(/gi,
  /-moz-binding\s*:/gi,
  /behavior\s*:/gi,
  /javascript\s*:/gi,
  /<\/?script/gi,
  /<\/?style/gi,
];

/**
 * Sanitize custom CSS to prevent data exfiltration and injection.
 * Removes url(), @import, expression(), and other dangerous patterns.
 * Returns null if input is empty after sanitization.
 */
export function sanitizeCustomCss(
  css: string | null | undefined,
): string | null {
  if (!css) return null;

  let sanitized = css.trim();
  if (!sanitized) return null;

  // Strip dangerous patterns
  for (const pattern of DANGEROUS_CSS_PATTERNS) {
    sanitized = sanitized.replace(pattern, "/* removed */");
  }

  // Enforce length limit
  if (sanitized.length > MAX_CUSTOM_CSS_LENGTH) {
    sanitized = sanitized.slice(0, MAX_CUSTOM_CSS_LENGTH);
  }

  return sanitized || null;
}

/**
 * Generate a slug from a name
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
