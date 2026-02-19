/**
 * Custom Uploads Curio
 *
 * User image management system used by cursors, shrines,
 * clip art, badges, and other curios.
 *
 * Features:
 * - Drag-and-drop upload
 * - Auto-resize to 512x512 max
 * - Auto-convert to WebP
 * - Auto-generate 128x128 thumbnails
 * - Quota enforcement before upload
 * - Usage tracking
 */

// =============================================================================
// Types
// =============================================================================

export type AllowedMimeType = "image/png" | "image/gif" | "image/webp";

export interface UploadRecord {
  id: string;
  tenantId: string;
  filename: string;
  originalFilename: string;
  mimeType: AllowedMimeType;
  fileSize: number;
  width: number | null;
  height: number | null;
  r2Key: string;
  thumbnailR2Key: string | null;
  usageCount: number;
  uploadedAt: string;
}

export interface UploadDisplay {
  id: string;
  filename: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  width: number | null;
  height: number | null;
  usageCount: number;
  uploadedAt: string;
}

// =============================================================================
// Constants
// =============================================================================

export const ALLOWED_MIME_TYPES = new Set<string>([
  "image/png",
  "image/gif",
  "image/webp",
]);

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const MAX_DIMENSION = 512;
export const THUMBNAIL_SIZE = 128;
export const MAX_FILENAME_LENGTH = 200;
export const MAX_UPLOADS_PER_TENANT = 100;

// =============================================================================
// Utility Functions
// =============================================================================

export function generateUploadId(): string {
  return `upl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function isAllowedMimeType(
  mimeType: string,
): mimeType is AllowedMimeType {
  return ALLOWED_MIME_TYPES.has(mimeType);
}

export function isValidFileSize(size: number): boolean {
  return size > 0 && size <= MAX_FILE_SIZE;
}

export function sanitizeFilename(filename: string | null | undefined): string {
  if (!filename) return "upload";
  const cleaned = filename
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_{2,}/g, "_")
    .slice(0, MAX_FILENAME_LENGTH);
  return cleaned || "upload";
}

export function buildR2Key(
  tenantId: string,
  uploadId: string,
  ext: string,
): string {
  return `curios/${tenantId}/uploads/${uploadId}.${ext}`;
}

export function buildThumbnailR2Key(
  tenantId: string,
  uploadId: string,
): string {
  return `curios/${tenantId}/uploads/${uploadId}_thumb.webp`;
}

export function getExtensionFromMime(mimeType: string): string {
  switch (mimeType) {
    case "image/png":
      return "png";
    case "image/gif":
      return "gif";
    case "image/webp":
      return "webp";
    default:
      return "bin";
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function toDisplayUpload(record: UploadRecord): UploadDisplay {
  return {
    id: record.id,
    filename: record.filename,
    originalFilename: record.originalFilename,
    mimeType: record.mimeType,
    fileSize: record.fileSize,
    width: record.width,
    height: record.height,
    usageCount: record.usageCount,
    uploadedAt: record.uploadedAt,
  };
}
