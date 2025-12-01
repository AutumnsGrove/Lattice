/**
 * Client-side image processing utility
 * Handles WebP conversion, quality adjustment, EXIF stripping, and hash generation
 */

/**
 * Calculate SHA-256 hash of file for duplicate detection
 * @param {File|Blob} file - The file to hash
 * @returns {Promise<string>} Hex string of the hash
 */
export async function calculateFileHash(file) {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Load an image from a File object
 * @param {File} file - Image file
 * @returns {Promise<HTMLImageElement>}
 */
function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image'));
    };
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Calculate dimensions maintaining aspect ratio
 * @param {number} width - Original width
 * @param {number} height - Original height
 * @param {number} maxDimension - Maximum dimension (width or height)
 * @returns {{ width: number, height: number }}
 */
function calculateDimensions(width, height, maxDimension) {
  if (width <= maxDimension && height <= maxDimension) {
    return { width, height };
  }

  const ratio = Math.min(maxDimension / width, maxDimension / height);
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio)
  };
}

/**
 * Get max dimension based on quality setting
 * Higher quality = larger max dimension
 * @param {number} quality - Quality 0-100
 * @returns {number} Max dimension in pixels
 */
function getMaxDimensionForQuality(quality) {
  if (quality >= 90) return 4096;
  if (quality >= 70) return 2560;
  if (quality >= 50) return 1920;
  if (quality >= 30) return 1280;
  return 960;
}

/**
 * Process an image: convert to WebP, adjust quality, strip EXIF
 * Drawing to canvas automatically strips EXIF data including GPS
 *
 * @param {File} file - Original image file
 * @param {Object} options - Processing options
 * @param {number} options.quality - Quality 0-100 (default 80)
 * @param {boolean} options.convertToWebP - Convert to WebP format (default true)
 * @param {boolean} options.fullResolution - Skip resizing (default false)
 * @returns {Promise<{ blob: Blob, width: number, height: number, originalSize: number, processedSize: number }>}
 */
export async function processImage(file, options = {}) {
  const {
    quality = 80,
    convertToWebP = true,
    fullResolution = false
  } = options;

  // For GIFs, return original to preserve animation
  if (file.type === 'image/gif') {
    return {
      blob: file,
      width: 0,
      height: 0,
      originalSize: file.size,
      processedSize: file.size,
      skipped: true,
      reason: 'GIF preserved for animation'
    };
  }

  const img = await loadImage(file);
  const originalSize = file.size;

  // Calculate target dimensions
  let targetWidth = img.naturalWidth;
  let targetHeight = img.naturalHeight;

  if (!fullResolution) {
    const maxDim = getMaxDimensionForQuality(quality);
    const dims = calculateDimensions(img.naturalWidth, img.naturalHeight, maxDim);
    targetWidth = dims.width;
    targetHeight = dims.height;
  }

  // Create canvas and draw image (this strips EXIF data)
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  // Convert to blob
  const mimeType = convertToWebP ? 'image/webp' : file.type;
  const qualityDecimal = quality / 100;

  const blob = await new Promise((resolve) => {
    canvas.toBlob(resolve, mimeType, qualityDecimal);
  });

  return {
    blob,
    width: targetWidth,
    height: targetHeight,
    originalSize,
    processedSize: blob.size,
    skipped: false
  };
}

/**
 * Generate a date-based path for organizing uploads
 * Format: photos/YYYY/MM/DD/
 * @returns {string} Date-based folder path
 */
export function generateDatePath() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `photos/${year}/${month}/${day}`;
}

/**
 * Generate a clean filename from original name
 * @param {string} originalName - Original filename
 * @param {boolean} useWebP - Whether to use .webp extension
 * @returns {string} Sanitized filename
 */
export function sanitizeFilename(originalName, useWebP = true) {
  // Get base name without extension
  const lastDot = originalName.lastIndexOf('.');
  const baseName = lastDot > 0 ? originalName.substring(0, lastDot) : originalName;
  const originalExt = lastDot > 0 ? originalName.substring(lastDot + 1).toLowerCase() : '';

  // Sanitize the base name
  const sanitized = baseName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100); // Limit length

  // Add timestamp for uniqueness
  const timestamp = Date.now().toString(36);

  // Determine extension
  const ext = useWebP && originalExt !== 'gif' ? 'webp' : originalExt;

  return `${sanitized}-${timestamp}.${ext}`;
}

/**
 * Format bytes to human-readable string
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size
 */
export function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * Calculate compression ratio
 * @param {number} original - Original size in bytes
 * @param {number} processed - Processed size in bytes
 * @returns {string} Percentage saved
 */
export function compressionRatio(original, processed) {
  if (original <= 0) return '0%';
  const saved = ((original - processed) / original) * 100;
  return saved > 0 ? `-${saved.toFixed(0)}%` : `+${Math.abs(saved).toFixed(0)}%`;
}
