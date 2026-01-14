/**
 * Client-side image processing utility
 * Handles JXL/WebP conversion, quality adjustment, EXIF stripping, and hash generation
 *
 * JPEG XL (JXL) is preferred when supported, with WebP as fallback.
 * Drawing to canvas automatically strips EXIF data including GPS for privacy.
 */

// =============================================================================
// JXL ENCODER (LAZY LOADED)
// =============================================================================

/**
 * Lazily loaded JXL encoder module
 * The @jsquash/jxl WASM module is ~800KB, so we only load it when needed
 */
let jxlModule: typeof import('@jsquash/jxl') | null = null;

/**
 * Get the JXL encoder, loading it on first use
 */
async function getJxlEncoder(): Promise<typeof import('@jsquash/jxl')> {
  if (!jxlModule) {
    jxlModule = await import('@jsquash/jxl');
  }
  return jxlModule;
}

/**
 * Check if the browser supports JXL encoding via WASM
 * Caches result after first check
 */
let jxlSupportChecked = false;
let jxlSupported = false;

export async function supportsJxlEncoding(): Promise<boolean> {
  if (jxlSupportChecked) {
    return jxlSupported;
  }

  try {
    // Check for WebAssembly support
    if (typeof WebAssembly !== 'object') {
      jxlSupportChecked = true;
      jxlSupported = false;
      return false;
    }

    // Try to load the JXL encoder
    await getJxlEncoder();
    jxlSupportChecked = true;
    jxlSupported = true;
    return true;
  } catch {
    jxlSupportChecked = true;
    jxlSupported = false;
    return false;
  }
}

// =============================================================================
// CORE UTILITIES
// =============================================================================

/**
 * Calculate SHA-256 hash of file for duplicate detection
 */
export async function calculateFileHash(file: File | Blob): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Load an image from a File object
 */
function loadImage(file: File): Promise<HTMLImageElement> {
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
 */
function calculateDimensions(width: number, height: number, maxDimension: number): { width: number; height: number } {
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
 */
function getMaxDimensionForQuality(quality: number): number {
  if (quality >= 90) return 4096;
  if (quality >= 70) return 2560;
  if (quality >= 50) return 1920;
  if (quality >= 30) return 1280;
  return 960;
}

/**
 * Get adaptive effort level based on device capabilities
 * Higher effort = better compression but slower encoding
 *
 * Mobile devices: effort 5 (faster, preserves battery)
 * Desktop: effort 7 (balanced, stays under 3s target)
 */
function getAdaptiveEffort(): number {
  // Detect mobile via user agent or screen size
  const isMobile = typeof navigator !== 'undefined' &&
    (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (typeof window !== 'undefined' && window.innerWidth < 768));

  // Mobile gets lower effort for battery/performance
  if (isMobile) return 5;

  // Cap at 7 to stay under 3s encoding target
  return 7;
}

/**
 * Get ImageData from an image, resizing as needed
 * Drawing to canvas strips all EXIF metadata (privacy protection)
 */
function getImageData(img: HTMLImageElement, width: number, height: number): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas 2d context');
  }

  // Drawing to canvas strips EXIF/GPS metadata
  ctx.drawImage(img, 0, 0, width, height);
  return ctx.getImageData(0, 0, width, height);
}

/**
 * Convert canvas to WebP blob
 */
function canvasToWebP(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create WebP blob'));
      },
      'image/webp',
      quality / 100
    );
  });
}

// =============================================================================
// TYPES
// =============================================================================

/** Output format for processed images */
export type ImageFormat = 'jxl' | 'webp' | 'gif' | 'original';

export interface ProcessedImageResult {
  blob: Blob;
  width: number;
  height: number;
  originalSize: number;
  processedSize: number;
  /** The format the image was encoded to */
  format: ImageFormat;
  /** True if processing was skipped (e.g., for GIFs) */
  skipped?: boolean;
  /** Reason for skipping or fallback */
  reason?: string;
}

export interface ProcessImageOptions {
  /** Quality 0-100 (default 80) */
  quality?: number;
  /**
   * Output format preference
   * - 'auto': Use JXL if supported, fall back to WebP
   * - 'jxl': Force JXL (falls back to WebP if not supported)
   * - 'webp': Force WebP
   * - 'original': Keep original format (only resizes, strips EXIF)
   */
  format?: 'auto' | 'jxl' | 'webp' | 'original';
  /** Skip resizing (default false) */
  fullResolution?: boolean;
  /**
   * @deprecated Use `format` instead. Kept for backward compatibility.
   * If true and format is not set, uses WebP. If false and format not set, keeps original.
   */
  convertToWebP?: boolean;
}

// =============================================================================
// MAIN PROCESSING FUNCTION
// =============================================================================

/**
 * Process an image: convert to JXL/WebP, adjust quality, strip EXIF
 *
 * Privacy: Drawing to canvas automatically strips all EXIF data including GPS.
 * The @jsquash/jxl encode() receives ImageData (pixel array), NOT the original
 * file buffer, so EXIF metadata is NOT passed to the encoder.
 */
export async function processImage(file: File, options: ProcessImageOptions = {}): Promise<ProcessedImageResult> {
  const {
    quality = 80,
    fullResolution = false,
    convertToWebP = true, // Backward compat
  } = options;

  // Handle format option with backward compatibility
  let formatPreference = options.format;
  if (!formatPreference) {
    // Backward compatibility: if convertToWebP is explicitly false, keep original
    formatPreference = convertToWebP ? 'auto' : 'original';
  }

  // For GIFs, return original to preserve animation
  if (file.type === 'image/gif') {
    return {
      blob: file,
      width: 0,
      height: 0,
      originalSize: file.size,
      processedSize: file.size,
      format: 'gif',
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
  if (!ctx) {
    throw new Error('Failed to get canvas 2d context');
  }
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  // Handle original format (just resize/strip EXIF)
  if (formatPreference === 'original') {
    const mimeType = file.type || 'image/png';
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (b) resolve(b);
          else reject(new Error('Failed to create blob'));
        },
        mimeType,
        quality / 100
      );
    });

    return {
      blob,
      width: targetWidth,
      height: targetHeight,
      originalSize,
      processedSize: blob.size,
      format: 'original'
    };
  }

  // Determine target format
  let targetFormat: 'jxl' | 'webp' = 'webp';

  if (formatPreference === 'jxl' || formatPreference === 'auto') {
    const canUseJxl = await supportsJxlEncoding();
    if (canUseJxl) {
      targetFormat = 'jxl';
    }
  }

  // Encode to target format
  let blob: Blob;
  let actualFormat: ImageFormat = targetFormat;

  if (targetFormat === 'jxl') {
    try {
      const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
      const effort = getAdaptiveEffort();

      const { encode } = await getJxlEncoder();
      const encoded = await encode(imageData, {
        quality,
        effort,
        lossless: false,
        progressive: true // Better loading UX
      });

      blob = new Blob([encoded], { type: 'image/jxl' });
      actualFormat = 'jxl';
    } catch (error) {
      // Fall back to WebP on JXL encoding failure
      console.warn('JXL encoding failed, falling back to WebP:', error);
      blob = await canvasToWebP(canvas, quality);
      actualFormat = 'webp';
    }
  } else {
    // WebP via Canvas API
    blob = await canvasToWebP(canvas, quality);
    actualFormat = 'webp';
  }

  return {
    blob,
    width: targetWidth,
    height: targetHeight,
    originalSize,
    processedSize: blob.size,
    format: actualFormat,
    reason: actualFormat !== targetFormat ? `Fallback from ${targetFormat} to ${actualFormat}` : undefined
  };
}

// =============================================================================
// FILENAME UTILITIES
// =============================================================================

/**
 * Generate a date-based path for organizing uploads
 * Format: photos/YYYY/MM/DD/
 */
export function generateDatePath(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `photos/${year}/${month}/${day}`;
}

/**
 * Generate a clean filename from original name for image files
 *
 * @param originalName - Original filename
 * @param format - Target format ('jxl', 'webp', or undefined to keep original extension)
 */
export function sanitizeImageFilename(originalName: string, format?: 'jxl' | 'webp'): string {
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
  let ext: string;
  if (format) {
    ext = format;
  } else if (originalExt === 'gif') {
    ext = 'gif'; // Preserve GIF extension
  } else {
    ext = 'webp'; // Default fallback for legacy calls
  }

  return `${sanitized}-${timestamp}.${ext}`;
}

// =============================================================================
// DISPLAY UTILITIES
// =============================================================================

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * Calculate compression ratio
 */
export function compressionRatio(original: number, processed: number): string {
  if (original <= 0) return '0%';
  const saved = ((original - processed) / original) * 100;
  return saved > 0 ? `-${saved.toFixed(0)}%` : `+${Math.abs(saved).toFixed(0)}%`;
}

/**
 * Get human-readable format name
 */
export function formatName(format: ImageFormat): string {
  switch (format) {
    case 'jxl': return 'JPEG XL';
    case 'webp': return 'WebP';
    case 'gif': return 'GIF';
    case 'original': return 'Original';
    default: return format;
  }
}
