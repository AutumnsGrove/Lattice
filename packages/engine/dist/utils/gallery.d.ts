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
export declare function parseImageFilename(r2Key: string): ParsedImageMetadata;
/**
 * Get display title for an image (uses custom title or parsed slug)
 * @param image - Gallery image object
 * @returns Human-readable title
 */
export declare function getImageTitle(image: GalleryImage): string;
/**
 * Get display date for an image (uses custom date or parsed date)
 * @param image - Gallery image object
 * @returns YYYY-MM-DD date string or null
 */
export declare function getImageDate(image: GalleryImage): string | null;
/**
 * Filter images by search query (searches title, slug, filename)
 * @param images - Array of gallery images
 * @param query - Search query
 * @returns Filtered images
 */
export declare function searchImages(images: GalleryImage[], query: string): GalleryImage[];
/**
 * Filter images by date range
 * @param images - Array of gallery images
 * @param startDate - YYYY-MM-DD start date (inclusive)
 * @param endDate - YYYY-MM-DD end date (inclusive)
 * @returns Filtered images
 */
export declare function filterImagesByDateRange(images: GalleryImage[], startDate: string | null, endDate: string | null): GalleryImage[];
/**
 * Filter images by tags
 * @param images - Array of gallery images (must include 'tags' array)
 * @param tagSlugs - Array of tag slugs to filter by
 * @returns Filtered images
 */
export declare function filterImagesByTags(images: GalleryImage[], tagSlugs: string[]): GalleryImage[];
/**
 * Filter images by category (parsed from path)
 * @param images - Array of gallery images
 * @param category - Category to filter by
 * @returns Filtered images
 */
export declare function filterImagesByCategory(images: GalleryImage[], category: string | null): GalleryImage[];
/**
 * Extract unique years from image dates
 * @param images - Array of gallery images
 * @returns Sorted array of years (descending)
 */
export declare function getAvailableYears(images: GalleryImage[]): string[];
/**
 * Extract unique categories from images
 * @param images - Array of gallery images
 * @returns Sorted array of categories
 */
export declare function getAvailableCategories(images: GalleryImage[]): string[];
