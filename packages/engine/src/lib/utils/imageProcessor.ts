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
let jxlModule: typeof import("@jsquash/jxl") | null = null;

/**
 * Get the JXL encoder, loading it on first use
 */
async function getJxlEncoder(): Promise<typeof import("@jsquash/jxl")> {
  if (!jxlModule) {
    jxlModule = await import("@jsquash/jxl");
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
    if (typeof WebAssembly !== "object") {
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
// HEIC DECODER (LAZY LOADED)
// =============================================================================

/**
 * Lazily loaded HEIC decoder module (heic2any)
 * Uses libheif WASM (~1.3MB), only loaded when someone uploads a HEIC file
 */
let heicModule: typeof import("heic2any") | null = null;

/**
 * Get the HEIC decoder, loading it on first use
 */
async function getHeicDecoder(): Promise<typeof import("heic2any")> {
  if (!heicModule) {
    heicModule = await import("heic2any");
  }
  return heicModule;
}

/**
 * Check if a file is a HEIC/HEIF image by extension or MIME type.
 * Browsers often don't set the MIME type correctly for HEIC files,
 * so we check the extension as a fallback.
 */
export function isHeicFile(file: File): boolean {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  return (
    ["heic", "heif"].includes(ext) ||
    file.type === "image/heic" ||
    file.type === "image/heif"
  );
}

/**
 * Convert a HEIC/HEIF file to JPEG using the heic2any WASM decoder.
 * Quality is intentionally high (0.92) since this is an intermediate step —
 * the result will be re-encoded to JXL/WebP by the normal processing pipeline.
 */
export async function convertHeicToJpeg(file: File): Promise<File> {
  const heic2any = await getHeicDecoder();
  const result = await heic2any.default({
    blob: file,
    toType: "image/jpeg",
    quality: 0.92,
  });

  // heic2any may return a single Blob or an array (for multi-image HEIC)
  const jpegBlob = Array.isArray(result) ? result[0] : result;

  // Create a new File with .jpg extension
  const baseName = file.name.replace(/\.(heic|heif)$/i, "");
  return new File([jpegBlob], `${baseName}.jpg`, { type: "image/jpeg" });
}

// =============================================================================
// CORE UTILITIES
// =============================================================================

/**
 * Calculate SHA-256 hash of file for duplicate detection
 */
export async function calculateFileHash(file: File | Blob): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Sanitize filename by replacing problematic Unicode characters
 * macOS screenshots use narrow no-break space (U+202F) before AM/PM
 */
function sanitizeFilename(filename: string): string {
  // Replace narrow no-break space (U+202F) and other problematic chars with regular space
  return filename
    .replace(/\u202F/g, " ") // Narrow no-break space (macOS time format)
    .replace(/\u00A0/g, " ") // Non-breaking space
    .replace(/[\u2000-\u200F]/g, " "); // Various Unicode spaces
}

/**
 * Load an image from a File object
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    // Sanitize filename to prevent issues with special Unicode characters
    // (like macOS narrow no-break space in screenshot timestamps)
    const sanitizedName = sanitizeFilename(file.name);
    const fileToLoad =
      sanitizedName !== file.name
        ? new File([file], sanitizedName, { type: file.type })
        : file;

    const objectUrl = URL.createObjectURL(fileToLoad);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);

      // Provide specific error messages based on file type
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      const fileType = file.type || "unknown";

      // Known problematic formats
      if (["tiff", "tif"].includes(ext)) {
        reject(
          new Error(
            `TIFF files cannot be processed in-browser. Please upload as original format or convert to JPG/PNG first.`,
          ),
        );
        return;
      }
      if (["heic", "heif"].includes(ext)) {
        reject(
          new Error(
            `HEIC/HEIF conversion may have failed. Please try uploading again.`,
          ),
        );
        return;
      }
      if (["raw", "cr2", "nef", "arw", "dng"].includes(ext)) {
        reject(
          new Error(
            `RAW camera files cannot be processed in-browser. Please upload as original format or convert to JPG first.`,
          ),
        );
        return;
      }
      if (["psd", "ai", "eps"].includes(ext)) {
        reject(
          new Error(
            `${ext.toUpperCase()} files cannot be processed in-browser. Please convert to JPG/PNG/WebP first.`,
          ),
        );
        return;
      }

      // BMP is renderable but often problematic
      if (ext === "bmp" || fileType === "image/bmp") {
        reject(
          new Error(
            `BMP files may fail to load in browsers. Try converting to PNG or JPG first.`,
          ),
        );
        return;
      }

      // Very large files
      if (file.size > 50 * 1024 * 1024) {
        reject(
          new Error(
            `File is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum for processing is 50MB. Try uploading as original format or resize first.`,
          ),
        );
        return;
      }

      // Generic error with helpful context
      // Avoid the word "unsupported" here — getActionableUploadError() maps
      // it to "Unsupported file type" which is misleading when the type IS
      // valid but the browser can't decode the image data
      reject(
        new Error(
          `Failed to load image "${file.name}" (${fileType}). The file may be corrupted or in a format your browser can't decode.`,
        ),
      );
    };

    img.src = objectUrl;
  });
}

/**
 * Calculate dimensions maintaining aspect ratio
 */
function calculateDimensions(
  width: number,
  height: number,
  maxDimension: number,
): { width: number; height: number } {
  if (width <= maxDimension && height <= maxDimension) {
    return { width, height };
  }

  const ratio = Math.min(maxDimension / width, maxDimension / height);
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
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
  const isMobile =
    typeof navigator !== "undefined" &&
    (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      (typeof window !== "undefined" && window.innerWidth < 768));

  // Mobile gets lower effort for battery/performance
  if (isMobile) return 5;

  // Cap at 7 to stay under 3s encoding target
  return 7;
}

/**
 * Convert canvas to WebP blob
 */
function canvasToWebP(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to create WebP blob"));
      },
      "image/webp",
      quality / 100,
    );
  });
}

// =============================================================================
// TYPES
// =============================================================================

/** Output format for processed images */
export type ImageFormat = "jxl" | "webp" | "gif" | "original";

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
  format?: "auto" | "jxl" | "webp" | "original";
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
export async function processImage(
  file: File,
  options: ProcessImageOptions = {},
): Promise<ProcessedImageResult> {
  const {
    quality = 80,
    fullResolution = false,
    convertToWebP = true, // Backward compat
  } = options;

  // Handle format option with backward compatibility
  let formatPreference = options.format;
  if (!formatPreference) {
    // Backward compatibility: if convertToWebP is explicitly false, keep original
    formatPreference = convertToWebP ? "auto" : "original";
  }

  // Convert HEIC/HEIF to JPEG before processing
  if (isHeicFile(file)) {
    file = await convertHeicToJpeg(file);
  }

  // For GIFs, return original to preserve animation
  if (file.type === "image/gif") {
    return {
      blob: file,
      width: 0,
      height: 0,
      originalSize: file.size,
      processedSize: file.size,
      format: "gif",
      skipped: true,
      reason: "GIF preserved for animation",
    };
  }

  // Try loading the image. If it fails and the file claims to be JPEG,
  // it might be HEIF data with a .jpeg extension (some iOS apps like Dazz Cam
  // do this). Fall back to HEIC conversion as a rescue attempt.
  let img: HTMLImageElement;
  try {
    img = await loadImage(file);
  } catch (loadError) {
    if (
      !isHeicFile(file) &&
      (file.type === "image/jpeg" ||
        file.type === "image/heic" ||
        file.type === "image/heif")
    ) {
      try {
        file = await convertHeicToJpeg(file);
        img = await loadImage(file);
      } catch {
        // HEIC conversion also failed — throw the original error
        throw loadError;
      }
    } else {
      throw loadError;
    }
  }
  const originalSize = file.size;

  // Calculate target dimensions
  let targetWidth = img.naturalWidth;
  let targetHeight = img.naturalHeight;

  if (!fullResolution) {
    const maxDim = getMaxDimensionForQuality(quality);
    const dims = calculateDimensions(
      img.naturalWidth,
      img.naturalHeight,
      maxDim,
    );
    targetWidth = dims.width;
    targetHeight = dims.height;
  }

  // Create canvas and draw image (this strips EXIF data)
  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get canvas 2d context");
  }
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  // Handle original format (just resize/strip EXIF)
  if (formatPreference === "original") {
    const mimeType = file.type || "image/png";
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (b) resolve(b);
          else reject(new Error("Failed to create blob"));
        },
        mimeType,
        quality / 100,
      );
    });

    return {
      blob,
      width: targetWidth,
      height: targetHeight,
      originalSize,
      processedSize: blob.size,
      format: "original",
    };
  }

  // Determine target format
  let targetFormat: "jxl" | "webp" = "webp";

  if (formatPreference === "jxl" || formatPreference === "auto") {
    const canUseJxl = await supportsJxlEncoding();
    if (canUseJxl) {
      targetFormat = "jxl";
    }
  }

  // Encode to target format
  let blob: Blob;
  let actualFormat: ImageFormat = targetFormat;

  if (targetFormat === "jxl") {
    try {
      const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
      const effort = getAdaptiveEffort();

      const { encode } = await getJxlEncoder();
      const encoded = await encode(imageData, {
        quality,
        effort,
        lossless: false,
        progressive: true, // Better loading UX
      });

      blob = new Blob([encoded], { type: "image/jxl" });
      actualFormat = "jxl";
    } catch (error) {
      // Fall back to WebP on JXL encoding failure
      console.warn("JXL encoding failed, falling back to WebP:", error);
      blob = await canvasToWebP(canvas, quality);
      actualFormat = "webp";
    }
  } else {
    // WebP via Canvas API
    blob = await canvasToWebP(canvas, quality);
    actualFormat = "webp";
  }

  return {
    blob,
    width: targetWidth,
    height: targetHeight,
    originalSize,
    processedSize: blob.size,
    format: actualFormat,
    reason:
      actualFormat !== targetFormat
        ? `Fallback from ${targetFormat} to ${actualFormat}`
        : undefined,
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
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `photos/${year}/${month}/${day}`;
}

/**
 * Generate a clean filename from original name for image files
 *
 * @param originalName - Original filename
 * @param format - Target format ('jxl', 'webp', or undefined to keep original extension)
 */
export function sanitizeImageFilename(
  originalName: string,
  format?: "jxl" | "webp",
): string {
  // Get base name without extension
  const lastDot = originalName.lastIndexOf(".");
  const baseName =
    lastDot > 0 ? originalName.substring(0, lastDot) : originalName;
  const originalExt =
    lastDot > 0 ? originalName.substring(lastDot + 1).toLowerCase() : "";

  // Sanitize the base name
  const sanitized = baseName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 100); // Limit length

  // Add timestamp for uniqueness
  const timestamp = Date.now().toString(36);

  // Determine extension
  let ext: string;
  if (format) {
    ext = format;
  } else if (originalExt === "gif") {
    ext = "gif"; // Preserve GIF extension
  } else {
    ext = "webp"; // Default fallback for legacy calls
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
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

/**
 * Calculate compression ratio
 */
export function compressionRatio(original: number, processed: number): string {
  if (original <= 0) return "0%";
  const saved = ((original - processed) / original) * 100;
  return saved > 0
    ? `-${saved.toFixed(0)}%`
    : `+${Math.abs(saved).toFixed(0)}%`;
}

/**
 * Get human-readable format name
 */
export function formatName(format: ImageFormat): string {
  switch (format) {
    case "jxl":
      return "JPEG XL";
    case "webp":
      return "WebP";
    case "gif":
      return "GIF";
    case "original":
      return "Original";
    default:
      return format;
  }
}
