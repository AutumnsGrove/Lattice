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
  "image/avif",
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
  "avif",
] as const;

export type AllowedExtension = (typeof ALLOWED_EXTENSIONS)[number];

/** HTML accept attribute value for file inputs */
export const UPLOAD_ACCEPT_ATTR =
  ".jpg,.jpeg,.png,.gif,.webp,.jxl,.avif,.heic,.heif,image/jpeg,image/png,image/gif,image/webp,image/jxl,image/avif,image/heic,image/heif";

/** Human-readable list for error messages */
export const ALLOWED_TYPES_DISPLAY =
  "JPG, PNG, GIF, WebP, JPEG XL, AVIF, or HEIC";

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
  "image/avif": ["avif"],
};

// ============================================================================
// Magic Byte Signatures
// ============================================================================

/**
 * File signatures (magic bytes) for validating file contents.
 * Prevents MIME type spoofing by checking actual file bytes.
 *
 * JPEG note: All valid JPEGs start with SOI marker (0xFF 0xD8) followed by
 * a marker segment (0xFF + marker byte). We check the 2-byte SOI prefix here,
 * and validateFileSignature() verifies byte 2 is 0xFF for the full 3-byte check.
 * This catches ALL valid JPEG variants (JFIF, Exif, ICC, SOF0, progressive, etc.)
 * rather than enumerating specific APP markers which misses uncommon but valid ones
 * like APP2/ICC Profile (0xE2) common on phone cameras.
 */
export const FILE_SIGNATURES: Record<AllowedImageType, number[][]> = {
  "image/jpeg": [
    [0xff, 0xd8], // JPEG SOI (Start of Image) — universal across all JPEG variants
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
  // AVIF: ISOBMFF container — validated via ftyp box check in validateFileSignature()
  // Placeholder entry required by Record<AllowedImageType, ...> type constraint
  "image/avif": [],
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
 * For AVIF, validates the ISOBMFF ftyp box and avif/avis brand.
 */
export function validateFileSignature(
  buffer: Uint8Array,
  mimeType: AllowedImageType,
): boolean {
  // AVIF uses ISOBMFF container — magic bytes at offset 4 (ftyp) and 8 (brand),
  // not offset 0, so it needs its own validation path
  if (mimeType === "image/avif") {
    if (buffer.length < 12) return false;
    // Bytes 4-7 must be "ftyp" (0x66 0x74 0x79 0x70)
    const hasFtyp =
      buffer[4] === 0x66 &&
      buffer[5] === 0x74 &&
      buffer[6] === 0x79 &&
      buffer[7] === 0x70;
    if (!hasFtyp) return false;
    // Bytes 8-11 must be "avif" or "avis" (sequence) brand
    const brand = String.fromCharCode(
      buffer[8],
      buffer[9],
      buffer[10],
      buffer[11],
    );
    return brand === "avif" || brand === "avis";
  }

  const signatures = FILE_SIGNATURES[mimeType];
  if (!signatures) return false;

  // Calculate minimum buffer length needed for this MIME type's signatures
  const minLength = Math.max(...signatures.map((sig) => sig.length));
  if (buffer.length < minLength) return false;

  const matchesSignature = signatures.some((sig) =>
    sig.every((byte, i) => buffer[i] === byte),
  );

  if (!matchesSignature) return false;

  // Additional JPEG validation: byte 2 must be 0xFF (marker segment prefix).
  // All JPEG marker segments start with 0xFF followed by a non-zero marker byte.
  // This ensures we have a valid SOI (0xFF, 0xD8) + marker (0xFF, XX) sequence.
  if (mimeType === "image/jpeg") {
    if (buffer.length < 3) return false;
    if (buffer[2] !== 0xff) return false;
  }

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
  "image/avif",
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
  "avif",
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

// ============================================================================
// Convertible Formats (HEIC/HEIF → JPEG via WASM)
// ============================================================================

/**
 * Formats that can be converted client-side via WASM before processing.
 * These are NOT natively renderable by browsers, but we can decode them
 * to JPEG using heic2any, then feed them through the normal pipeline.
 */
export const CONVERTIBLE_FORMATS = [
  { ext: "heic", mime: "image/heic" },
  { ext: "heif", mime: "image/heif" },
] as const;

/**
 * Check if a file is a convertible format (HEIC/HEIF).
 * These files need WASM decoding before the normal processing pipeline.
 */
export function isConvertibleFormat(file: File): boolean {
  const ext = getFileExtension(file.name);
  return CONVERTIBLE_FORMATS.some(
    (format) => format.ext === ext || format.mime === file.type,
  );
}

/**
 * Check if a file type is renderable by the browser's Image API.
 * Non-renderable files (TIFF, RAW, etc.) should skip client-side processing.
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

// ============================================================================
// Actionable Error Messages
// ============================================================================

/**
 * Map server error messages to actionable, human-friendly messages.
 * Both the MarkdownEditor and gallery page import this for consistent UX.
 *
 * @param serverMessage - Raw error message from the server or fetch failure
 * @returns A clear, actionable message the user can understand
 */
export function getActionableUploadError(serverMessage: string): string {
  const msg = serverMessage.toLowerCase();

  // Feature flag disabled
  if (
    msg.includes("feature_disabled") ||
    msg.includes("limited beta") ||
    msg.includes("not enabled")
  ) {
    return "Image uploads aren't available yet. This feature is being rolled out gradually.";
  }

  // Rate limiting
  if (
    msg.includes("rate_limited") ||
    msg.includes("rate limit") ||
    msg.includes("too many")
  ) {
    return "You're uploading too quickly. Wait a moment and try again.";
  }

  // Content moderation (Petal)
  if (
    msg.includes("content_rejected") ||
    msg.includes("moderation") ||
    msg.includes("inappropriate")
  ) {
    return "This image was flagged by our content safety system. Please try a different image.";
  }

  // File too large
  if (
    msg.includes("too large") ||
    msg.includes("exceeds maximum") ||
    msg.includes("file size") ||
    msg.includes("payload too large") ||
    msg.includes("413")
  ) {
    return "This image is too large. Please use an image under 10 MB.";
  }

  // Invalid file type
  if (
    msg.includes("file type") ||
    msg.includes("unsupported") ||
    msg.includes("invalid type")
  ) {
    return `Unsupported file type. Allowed: ${ALLOWED_TYPES_DISPLAY}.`;
  }

  // Auth errors
  if (
    msg.includes("unauthorized") ||
    msg.includes("401") ||
    msg.includes("not authenticated")
  ) {
    return "You need to sign in to upload images. Please refresh and try again.";
  }

  // Forbidden (CSRF, permissions)
  if (
    msg.includes("forbidden") ||
    msg.includes("403") ||
    msg.includes("csrf")
  ) {
    return "Upload blocked — your session may have expired. Please refresh the page.";
  }

  // Service unavailable
  if (
    msg.includes("503") ||
    msg.includes("service unavailable") ||
    msg.includes("temporarily")
  ) {
    return "The upload service is temporarily unavailable. Please try again in a few minutes.";
  }

  // Network errors
  if (
    msg.includes("network") ||
    msg.includes("failed to fetch") ||
    msg.includes("connection")
  ) {
    return "Network error — check your connection and try again.";
  }

  // Fall back to the original message
  return serverMessage;
}

// ============================================================================
// File Normalization (Universal Converter)
// ============================================================================

/**
 * MIME type inferred from file magic bytes.
 * Returns null if unrecognized.
 */
function detectMimeFromBytes(buffer: Uint8Array): AllowedImageType | null {
  if (buffer.length < 3) return null;

  // JPEG: SOI marker (0xFF 0xD8) + marker prefix (0xFF)
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  // PNG: 8-byte signature
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }

  // GIF: GIF87a or GIF89a
  if (
    buffer.length >= 6 &&
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38 &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) &&
    buffer[5] === 0x61
  ) {
    return "image/gif";
  }

  // WebP: RIFF + WEBP marker at offset 8
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return "image/webp";
  }

  // JXL: naked codestream or ISOBMFF container
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0x0a) {
    return "image/jxl";
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x00 &&
    buffer[1] === 0x00 &&
    buffer[2] === 0x00 &&
    buffer[3] === 0x0c &&
    buffer[4] === 0x4a &&
    buffer[5] === 0x58 &&
    buffer[6] === 0x4c &&
    buffer[7] === 0x20
  ) {
    return "image/jxl";
  }

  // AVIF: ISOBMFF ftyp box with avif/avis brand
  if (buffer.length >= 12) {
    const hasFtyp =
      buffer[4] === 0x66 &&
      buffer[5] === 0x74 &&
      buffer[6] === 0x79 &&
      buffer[7] === 0x70;
    if (hasFtyp) {
      const brand = String.fromCharCode(
        buffer[8],
        buffer[9],
        buffer[10],
        buffer[11],
      );
      if (brand === "avif" || brand === "avis") {
        return "image/avif";
      }
    }
  }

  return null;
}

/** Canonical extension for each MIME type (used when correcting mismatches) */
const CANONICAL_EXTENSION: Record<AllowedImageType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/jxl": "jxl",
  "image/avif": "avif",
};

/**
 * HEIF brand identifiers — if we detect these in the ftyp box, the file is
 * actually HEIF/HEIC regardless of its extension or claimed MIME type.
 */
const HEIF_BRANDS = ["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1"];

/**
 * Detect if a file is actually HEIF/HEIC by reading magic bytes.
 * Catches iPad photos saved with wrong .jpeg extension.
 */
function isHeifByBytes(buffer: Uint8Array): boolean {
  if (buffer.length < 12) return false;
  const hasFtyp =
    buffer[4] === 0x66 &&
    buffer[5] === 0x74 &&
    buffer[6] === 0x79 &&
    buffer[7] === 0x70;
  if (!hasFtyp) return false;
  const brand = String.fromCharCode(
    buffer[8],
    buffer[9],
    buffer[10],
    buffer[11],
  );
  return HEIF_BRANDS.includes(brand);
}

/**
 * Normalize a file for upload by detecting actual format from magic bytes
 * and correcting MIME type / extension mismatches.
 *
 * This is the "universal converter" — it ensures any valid image file
 * will have matching MIME type, extension, and magic bytes so the server
 * won't reject it for validation mismatches.
 *
 * Returns { file, needsHeicConversion } where:
 * - file: the normalized File (may be the original if no changes needed)
 * - needsHeicConversion: true if the file is actually HEIF and needs
 *   client-side WASM conversion before upload
 */
export async function normalizeFileForUpload(file: File): Promise<{
  file: File;
  needsHeicConversion: boolean;
}> {
  // Read enough bytes for magic byte detection
  const headerSize = 12; // Enough for all format checks
  const slice = file.slice(0, headerSize);
  const buffer = new Uint8Array(await slice.arrayBuffer());

  // Check if the file is actually HEIF disguised as something else
  // (common on iPad — camera apps save HEIF data with .jpeg extension)
  if (isHeifByBytes(buffer)) {
    return { file, needsHeicConversion: true };
  }

  // Detect actual format from magic bytes
  const detectedMime = detectMimeFromBytes(buffer);

  // If we can't detect the format, pass through as-is
  // (server will do its own validation)
  if (!detectedMime) {
    return { file, needsHeicConversion: false };
  }

  // Check if MIME type and extension already match
  const ext = getFileExtension(file.name);
  const mimeMatches = file.type === detectedMime;
  const extMatches =
    ext !== null && extensionMatchesMimeType(ext, detectedMime);

  if (mimeMatches && extMatches) {
    // Everything already consistent — no normalization needed
    return { file, needsHeicConversion: false };
  }

  // Normalize: create a new File with corrected MIME type and extension
  let correctedName = file.name;
  if (!extMatches && ext !== null) {
    const correctExt = CANONICAL_EXTENSION[detectedMime];
    const lastDot = correctedName.lastIndexOf(".");
    if (lastDot > 0) {
      correctedName = correctedName.substring(0, lastDot) + "." + correctExt;
    } else {
      correctedName = correctedName + "." + correctExt;
    }
  }

  const normalizedFile = new File([file], correctedName, {
    type: detectedMime,
  });

  return { file: normalizedFile, needsHeicConversion: false };
}

// ============================================================================
// Upload Strategy
// ============================================================================

/**
 * Comprehensive upload check that returns processing strategy.
 * Use this to decide whether to process client-side or upload raw.
 */
export function getUploadStrategy(file: File): {
  canProcess: boolean;
  skipProcessing: boolean;
  needsConversion?: boolean;
  reason?: string;
  warning?: string;
} {
  // Check for convertible formats (HEIC/HEIF → JPEG via WASM)
  if (isConvertibleFormat(file)) {
    return {
      canProcess: true,
      skipProcessing: false,
      needsConversion: true,
    };
  }

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
