/**
 * Upload Validation Constants and Utilities
 *
 * Centralized validation for file uploads across Grove.
 * Use these constants at both client and server layers for consistency.
 */

// ============================================================================
// Allowed Types
// ============================================================================

/** Allowed image MIME types for upload */
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/jxl",
] as const;

export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

/** Allowed file extensions (lowercase) */
export const ALLOWED_EXTENSIONS = [
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "jxl",
] as const;

export type AllowedExtension = (typeof ALLOWED_EXTENSIONS)[number];

/** HTML accept attribute value for file inputs */
export const UPLOAD_ACCEPT_ATTR =
  ".jpg,.jpeg,.png,.gif,.webp,.jxl,image/jpeg,image/png,image/gif,image/webp,image/jxl";

/** Human-readable list for error messages */
export const ALLOWED_TYPES_DISPLAY = "JPG, PNG, GIF, WebP, or JPEG XL";

// ============================================================================
// MIME to Extension Mapping
// ============================================================================

/** Maps MIME types to valid file extensions */
export const MIME_TO_EXTENSIONS: Record<AllowedImageType, string[]> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/gif": ["gif"],
  "image/webp": ["webp"],
  "image/jxl": ["jxl"],
};

// ============================================================================
// Magic Byte Signatures
// ============================================================================

/**
 * File signatures (magic bytes) for validating file contents.
 * Prevents MIME type spoofing by checking actual file bytes.
 */
export const FILE_SIGNATURES: Record<AllowedImageType, number[][]> = {
  "image/jpeg": [
    [0xff, 0xd8, 0xff, 0xe0], // JPEG/JFIF
    [0xff, 0xd8, 0xff, 0xe1], // JPEG/Exif
    [0xff, 0xd8, 0xff, 0xe8], // JPEG/SPIFF
    [0xff, 0xd8, 0xff, 0xdb], // JPEG raw
    [0xff, 0xd8, 0xff, 0xee], // JPEG ADOBE
  ],
  "image/png": [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]], // PNG signature
  "image/gif": [
    [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], // GIF87a
    [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], // GIF89a
  ],
  // WebP: RIFF header (4 bytes) + size (4 bytes) + WEBP marker (4 bytes)
  // We check bytes 0-3 for RIFF and bytes 8-11 for WEBP
  "image/webp": [[0x52, 0x49, 0x46, 0x46]], // RIFF (validated with WEBP check below)
  "image/jxl": [
    [0xff, 0x0a], // JPEG XL naked codestream
    [0x00, 0x00, 0x00, 0x0c, 0x4a, 0x58, 0x4c, 0x20], // JPEG XL container (ISOBMFF box)
  ],
};

/** WebP marker bytes at offset 8 */
export const WEBP_MARKER = [0x57, 0x45, 0x42, 0x50]; // "WEBP"

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Check if a MIME type is allowed for image uploads
 */
export function isAllowedImageType(
  mimeType: string,
): mimeType is AllowedImageType {
  return ALLOWED_IMAGE_TYPES.includes(mimeType as AllowedImageType);
}

/**
 * Check if a file extension is allowed
 */
export function isAllowedExtension(ext: string): ext is AllowedExtension {
  return ALLOWED_EXTENSIONS.includes(ext.toLowerCase() as AllowedExtension);
}

/**
 * Validate that extension matches the MIME type
 */
export function extensionMatchesMimeType(
  ext: string,
  mimeType: AllowedImageType,
): boolean {
  const validExtensions = MIME_TO_EXTENSIONS[mimeType];
  return validExtensions?.includes(ext.toLowerCase()) ?? false;
}

/**
 * Validate file signature (magic bytes) matches claimed MIME type.
 * For WebP, also validates the WEBP marker at offset 8.
 */
export function validateFileSignature(
  buffer: Uint8Array,
  mimeType: AllowedImageType,
): boolean {
  const signatures = FILE_SIGNATURES[mimeType];
  if (!signatures) return false;

  // Calculate minimum buffer length needed for this MIME type's signatures
  const minLength = Math.max(...signatures.map((sig) => sig.length));
  if (buffer.length < minLength) return false;

  const matchesSignature = signatures.some((sig) =>
    sig.every((byte, i) => buffer[i] === byte),
  );

  if (!matchesSignature) return false;

  // Additional WebP validation: check for WEBP marker at offset 8
  if (mimeType === "image/webp") {
    if (buffer.length < 12) return false;
    const hasWebpMarker = WEBP_MARKER.every(
      (byte, i) => buffer[8 + i] === byte,
    );
    if (!hasWebpMarker) return false;
  }

  return true;
}

/**
 * Extract file extension from filename
 */
export function getFileExtension(filename: string): string | null {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1 || lastDot === filename.length - 1) return null;
  return filename.slice(lastDot + 1).toLowerCase();
}

/**
 * Comprehensive file validation for client-side use.
 * Returns null if valid, or an error message if invalid.
 */
export function validateImageFile(file: File): string | null {
  // Check MIME type
  if (!isAllowedImageType(file.type)) {
    return `Invalid file type "${file.type}". Allowed: ${ALLOWED_TYPES_DISPLAY}`;
  }

  // Check extension
  const ext = getFileExtension(file.name);
  if (!ext) {
    return "File must have an extension";
  }

  if (!isAllowedExtension(ext)) {
    return `Invalid extension ".${ext}". Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`;
  }

  // Check extension matches MIME type
  if (!extensionMatchesMimeType(ext, file.type)) {
    return `Extension ".${ext}" does not match file type "${file.type}"`;
  }

  return null;
}

/**
 * Calculate the minimum header size needed for all signature validations.
 * This accounts for:
 * - PNG: 8 bytes
 * - JPEG XL container: 8 bytes
 * - GIF: 6 bytes
 * - WebP: 4 bytes header + 8 bytes to reach WEBP marker = 12 bytes total
 */
function getRequiredHeaderSize(): number {
  // WebP needs 12 bytes (RIFF header + offset to WEBP marker)
  const webpSize = 12;

  // Get max signature length across all types
  const maxSignatureLength = Math.max(
    ...Object.values(FILE_SIGNATURES).flatMap((sigs) =>
      sigs.map((sig) => sig.length),
    ),
  );

  return Math.max(maxSignatureLength, webpSize);
}

/** Cached header size for performance */
const REQUIRED_HEADER_SIZE = getRequiredHeaderSize();

/**
 * Validate file with magic byte checking (async, reads file buffer).
 * Returns null if valid, or an error message if invalid.
 */
export async function validateImageFileDeep(
  file: File,
): Promise<string | null> {
  // Basic validation first
  const basicError = validateImageFile(file);
  if (basicError) return basicError;

  // Read file header for magic byte validation
  const slice = file.slice(0, REQUIRED_HEADER_SIZE);
  const buffer = new Uint8Array(await slice.arrayBuffer());

  if (!validateFileSignature(buffer, file.type as AllowedImageType)) {
    return "File contents do not match declared type (possible file corruption or spoofing)";
  }

  return null;
}

// ============================================================================
// Browser Renderability Detection
// ============================================================================

/**
 * MIME types that browsers can render via HTMLImageElement.
 * These can be processed client-side (resized, converted to WebP/JXL).
 */
export const BROWSER_RENDERABLE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/bmp", // BMP is renderable but not processable well
  "image/svg+xml", // SVG is renderable but handled differently
] as const;

/** File extensions that browsers can render */
export const BROWSER_RENDERABLE_EXTENSIONS = [
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "bmp",
  "svg",
] as const;

/**
 * Problematic formats that often cause "Failed to load image" errors.
 * These should skip client-side processing and upload as-is.
 */
export const NON_RENDERABLE_FORMATS = [
  {
    ext: "tiff",
    mime: "image/tiff",
    reason: "TIFF files cannot be processed in-browser. Uploading original.",
  },
  {
    ext: "tif",
    mime: "image/tiff",
    reason: "TIFF files cannot be processed in-browser. Uploading original.",
  },
  {
    ext: "heic",
    mime: "image/heic",
    reason:
      "HEIC (iPhone) files have limited browser support. Uploading original.",
  },
  {
    ext: "heif",
    mime: "image/heif",
    reason: "HEIF files have limited browser support. Uploading original.",
  },
  {
    ext: "raw",
    mime: "image/x-raw",
    reason: "RAW files cannot be processed in-browser. Uploading original.",
  },
  {
    ext: "cr2",
    mime: "image/x-canon-cr2",
    reason: "Canon RAW cannot be processed in-browser. Uploading original.",
  },
  {
    ext: "nef",
    mime: "image/x-nikon-nef",
    reason: "Nikon RAW cannot be processed in-browser. Uploading original.",
  },
  {
    ext: "arw",
    mime: "image/x-sony-arw",
    reason: "Sony RAW cannot be processed in-browser. Uploading original.",
  },
  {
    ext: "dng",
    mime: "image/x-adobe-dng",
    reason: "DNG RAW cannot be processed in-browser. Uploading original.",
  },
  {
    ext: "psd",
    mime: "image/vnd.adobe.photoshop",
    reason: "PSD files cannot be processed in-browser. Uploading original.",
  },
  {
    ext: "ai",
    mime: "application/postscript",
    reason: "AI files cannot be processed in-browser. Uploading original.",
  },
  {
    ext: "eps",
    mime: "application/postscript",
    reason: "EPS files cannot be processed in-browser. Uploading original.",
  },
] as const;

/**
 * Check if a file type is renderable by the browser's Image API.
 * Non-renderable files (TIFF, HEIC, RAW, etc.) should skip client-side processing.
 */
export function isBrowserRenderable(file: File): boolean {
  // Check MIME type first
  if (
    BROWSER_RENDERABLE_TYPES.includes(
      file.type as (typeof BROWSER_RENDERABLE_TYPES)[number],
    )
  ) {
    return true;
  }

  // Check extension as fallback
  const ext = getFileExtension(file.name);
  if (
    ext &&
    BROWSER_RENDERABLE_EXTENSIONS.includes(
      ext as (typeof BROWSER_RENDERABLE_EXTENSIONS)[number],
    )
  ) {
    return true;
  }

  return false;
}

/**
 * Check if a file is a known non-renderable format.
 * Returns the format info if non-renderable, null if renderable or unknown.
 */
export function getNonRenderableInfo(
  file: File,
): (typeof NON_RENDERABLE_FORMATS)[number] | null {
  const ext = getFileExtension(file.name);
  if (!ext) return null;

  return (
    NON_RENDERABLE_FORMATS.find(
      (format) => format.ext === ext || format.mime === file.type,
    ) ?? null
  );
}

/**
 * Comprehensive upload check that returns processing strategy.
 * Use this to decide whether to process client-side or upload raw.
 */
export function getUploadStrategy(file: File): {
  canProcess: boolean;
  skipProcessing: boolean;
  reason?: string;
  warning?: string;
} {
  // Check for known non-renderable formats
  const nonRenderable = getNonRenderableInfo(file);
  if (nonRenderable) {
    return {
      canProcess: false,
      skipProcessing: true,
      reason: nonRenderable.reason,
      warning: nonRenderable.reason,
    };
  }

  // Check if browser can render it
  if (!isBrowserRenderable(file)) {
    return {
      canProcess: false,
      skipProcessing: true,
      reason: `File type "${file.type || getFileExtension(file.name)}" may not be processable in-browser. Uploading original.`,
      warning:
        "This file type may have limited browser support. Uploading original format.",
    };
  }

  // GIFs are renderable but we skip processing to preserve animation
  if (file.type === "image/gif") {
    return {
      canProcess: true,
      skipProcessing: true,
      reason: "GIF files skip processing to preserve animation",
    };
  }

  // Standard image - process normally
  return {
    canProcess: true,
    skipProcessing: false,
  };
}
