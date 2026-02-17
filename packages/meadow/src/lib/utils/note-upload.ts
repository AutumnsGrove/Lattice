/**
 * Note Image Upload — Upload images for rich Notes.
 *
 * Reuses the engine's upload pipeline: normalize → convert HEIC → POST FormData.
 * Passed as the `uploadImage` prop to NoteEditor.
 */

import { apiRequest } from "@autumnsgrove/lattice/utils/api";
import {
  normalizeFileForUpload,
  isConvertibleFormat,
  getActionableUploadError,
} from "@autumnsgrove/lattice/utils/upload-validation";
import { convertHeicToJpeg } from "@autumnsgrove/lattice/utils/imageProcessor";

/**
 * Upload an image file for use in a Note.
 * Returns the public URL on success, throws on failure.
 */
export async function uploadNoteImage(file: File): Promise<string> {
  // Normalize: detect actual format, fix MIME/extension mismatches
  const normalized = await normalizeFileForUpload(file);
  let processedFile = normalized.file;

  // Convert HEIC/HEIF to JPEG if needed
  if (normalized.needsHeicConversion || isConvertibleFormat(processedFile)) {
    processedFile = await convertHeicToJpeg(processedFile);
  }

  const formData = new FormData();
  formData.append("file", processedFile);
  formData.append("folder", "notes");

  try {
    const result = await apiRequest<{ url: string }>("/api/images/upload", {
      method: "POST",
      body: formData,
    });

    if (!result?.url) {
      throw new Error("Upload succeeded but no URL returned.");
    }

    return result.url;
  } catch (err) {
    const rawMessage = err instanceof Error ? err.message : String(err);
    throw new Error(getActionableUploadError(rawMessage));
  }
}
