/**
 * Client-side image processing utility
 * Handles WebP conversion, quality adjustment, EXIF stripping, and hash generation
 */
/**
 * Calculate SHA-256 hash of file for duplicate detection
 * @param {File|Blob} file - The file to hash
 * @returns {Promise<string>} Hex string of the hash
 */
export function calculateFileHash(file: File | Blob): Promise<string>;
/**
 * @typedef {Object} ProcessedImageResult
 * @property {Blob} blob - Processed image blob
 * @property {number} width - Image width
 * @property {number} height - Image height
 * @property {number} originalSize - Original file size
 * @property {number} processedSize - Processed file size
 * @property {boolean} [skipped] - Whether processing was skipped
 * @property {string} [reason] - Reason for skipping
 */
/**
 * @typedef {Object} ProcessImageOptions
 * @property {number} [quality] - Quality 0-100 (default 80)
 * @property {boolean} [convertToWebP] - Convert to WebP format (default true)
 * @property {boolean} [fullResolution] - Skip resizing (default false)
 */
/**
 * Process an image: convert to WebP, adjust quality, strip EXIF
 * Drawing to canvas automatically strips EXIF data including GPS
 *
 * @param {File} file - Original image file
 * @param {ProcessImageOptions} options - Processing options
 * @returns {Promise<ProcessedImageResult>}
 */
export function processImage(file: File, options?: ProcessImageOptions): Promise<ProcessedImageResult>;
/**
 * Generate a date-based path for organizing uploads
 * Format: photos/YYYY/MM/DD/
 * @returns {string} Date-based folder path
 */
export function generateDatePath(): string;
/**
 * Generate a clean filename from original name for image files
 * @param {string} originalName - Original filename
 * @param {boolean} useWebP - Whether to use .webp extension
 * @returns {string} Sanitized filename
 */
export function sanitizeImageFilename(originalName: string, useWebP?: boolean): string;
/**
 * Format bytes to human-readable string
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size
 */
export function formatBytes(bytes: number): string;
/**
 * Calculate compression ratio
 * @param {number} original - Original size in bytes
 * @param {number} processed - Processed size in bytes
 * @returns {string} Percentage saved
 */
export function compressionRatio(original: number, processed: number): string;
export type ProcessedImageResult = {
    /**
     * - Processed image blob
     */
    blob: Blob;
    /**
     * - Image width
     */
    width: number;
    /**
     * - Image height
     */
    height: number;
    /**
     * - Original file size
     */
    originalSize: number;
    /**
     * - Processed file size
     */
    processedSize: number;
    /**
     * - Whether processing was skipped
     */
    skipped?: boolean | undefined;
    /**
     * - Reason for skipping
     */
    reason?: string | undefined;
};
export type ProcessImageOptions = {
    /**
     * - Quality 0-100 (default 80)
     */
    quality?: number | undefined;
    /**
     * - Convert to WebP format (default true)
     */
    convertToWebP?: boolean | undefined;
    /**
     * - Skip resizing (default false)
     */
    fullResolution?: boolean | undefined;
};
