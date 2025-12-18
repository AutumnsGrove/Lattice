/**
 * Gallery utilities for filename parsing and filtering
 * Extracts metadata from smart filenames like:
 * - 2025-01-15_forest-walk.jpg → date: 2025-01-15, slug: forest-walk
 * - minecraft/build_2024-12-01.png → category: minecraft, date: 2024-12-01
 * - selfies/2024-summer.jpg → category: selfies, slug: 2024-summer
 */

/** Parsed metadata from an image filename */
export interface ParsedImageMetadata {
  category: string | null;
  date: string | null;
  slug: string;
  filename: string;
  extension: string | null;
  r2Key: string;
}

/** Tag object associated with an image */
export interface ImageTag {
  slug: string;
  name?: string;
}

/** Gallery image object */
export interface GalleryImage {
  r2_key?: string;
  key?: string;
  custom_title?: string;
  custom_date?: string;
  custom_description?: string;
  parsed_slug?: string;
  parsed_date?: string;
  parsed_category?: string;
  tags?: ImageTag[];
}

/**
 * Parse a filename to extract metadata
 * @param r2Key - R2 object key (e.g., 'minecraft/build.png' or '2025-01-15_photo.jpg')
 * @returns Parsed metadata: { category, date, slug, filename, extension }
 */
export function parseImageFilename(r2Key: string): ParsedImageMetadata {
  const parts = r2Key.split("/");
  const filename = parts[parts.length - 1];
  const category = parts.length > 1 ? parts[0] : null;

  // Extract extension
  const extMatch = filename.match(/\.([^.]+)$/);
  const extension = extMatch ? extMatch[1] : null;
  const nameWithoutExt = filename.replace(/\.[^.]+$/, "");

  // Try to extract date (YYYY-MM-DD or YYYY_MM_DD)
  const dateMatch = nameWithoutExt.match(/(\d{4}[-_]\d{2}[-_]\d{2})/);
  const date = dateMatch ? dateMatch[1].replace(/_/g, "-") : null;

  // Extract slug (remove date prefix if present)
  let slug = nameWithoutExt;
  if (date) {
    slug = slug.replace(date, "").replace(/^[-_]+/, "").replace(/[-_]+$/, "");
  }

  // Clean up slug (convert underscores to hyphens)
  slug = slug.replace(/_/g, "-").toLowerCase();

  return {
    category,
    date,
    slug: slug || "untitled",
    filename,
    extension,
    r2Key,
  };
}

/**
 * Get display title for an image (uses custom title or parsed slug)
 * @param image - Gallery image object
 * @returns Human-readable title
 */
export function getImageTitle(image: GalleryImage): string {
  if (image.custom_title) return image.custom_title;
  if (image.parsed_slug) {
    // Convert slug to Title Case
    return image.parsed_slug
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }
  return image.r2_key?.split("/").pop() || image.key?.split("/").pop() || "Untitled";
}

/**
 * Get display date for an image (uses custom date or parsed date)
 * @param image - Gallery image object
 * @returns YYYY-MM-DD date string or null
 */
export function getImageDate(image: GalleryImage): string | null {
  return image.custom_date || image.parsed_date || null;
}

/**
 * Filter images by search query (searches title, slug, filename)
 * @param images - Array of gallery images
 * @param query - Search query
 * @returns Filtered images
 */
export function searchImages(images: GalleryImage[], query: string): GalleryImage[] {
  if (!query) return images;

  const lowerQuery = query.toLowerCase();

  return images.filter((img) => {
    const title = getImageTitle(img).toLowerCase();
    const slug = (img.parsed_slug || "").toLowerCase();
    const filename = (img.r2_key || img.key || "").toLowerCase();
    const description = (img.custom_description || "").toLowerCase();

    return (
      title.includes(lowerQuery) ||
      slug.includes(lowerQuery) ||
      filename.includes(lowerQuery) ||
      description.includes(lowerQuery)
    );
  });
}

/**
 * Filter images by date range
 * @param images - Array of gallery images
 * @param startDate - YYYY-MM-DD start date (inclusive)
 * @param endDate - YYYY-MM-DD end date (inclusive)
 * @returns Filtered images
 */
export function filterImagesByDateRange(
  images: GalleryImage[],
  startDate: string | null,
  endDate: string | null
): GalleryImage[] {
  if (!startDate && !endDate) return images;

  return images.filter((img) => {
    const imgDate = getImageDate(img);
    if (!imgDate) return false;

    if (startDate && imgDate < startDate) return false;
    if (endDate && imgDate > endDate) return false;

    return true;
  });
}

/**
 * Filter images by tags
 * @param images - Array of gallery images (must include 'tags' array)
 * @param tagSlugs - Array of tag slugs to filter by
 * @returns Filtered images
 */
export function filterImagesByTags(images: GalleryImage[], tagSlugs: string[]): GalleryImage[] {
  if (!tagSlugs || tagSlugs.length === 0) return images;

  return images.filter((img) => {
    if (!img.tags || img.tags.length === 0) return false;
    const imgTagSlugs = img.tags.map((t) => t.slug);
    return tagSlugs.every((slug) => imgTagSlugs.includes(slug));
  });
}

/**
 * Filter images by category (parsed from path)
 * @param images - Array of gallery images
 * @param category - Category to filter by
 * @returns Filtered images
 */
export function filterImagesByCategory(
  images: GalleryImage[],
  category: string | null
): GalleryImage[] {
  if (!category) return images;
  return images.filter((img) => img.parsed_category === category);
}

/**
 * Extract unique years from image dates
 * @param images - Array of gallery images
 * @returns Sorted array of years (descending)
 */
export function getAvailableYears(images: GalleryImage[]): string[] {
  const years = new Set<string>();

  images.forEach((img) => {
    const date = getImageDate(img);
    if (date) {
      const year = date.substring(0, 4);
      years.add(year);
    }
  });

  return Array.from(years).sort((a, b) => b.localeCompare(a));
}

/**
 * Extract unique categories from images
 * @param images - Array of gallery images
 * @returns Sorted array of categories
 */
export function getAvailableCategories(images: GalleryImage[]): string[] {
  const categories = new Set<string>();

  images.forEach((img) => {
    if (img.parsed_category) {
      categories.add(img.parsed_category);
    }
  });

  return Array.from(categories).sort();
}
