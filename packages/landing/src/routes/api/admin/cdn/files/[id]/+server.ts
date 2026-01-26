// CDN File Delete/Update Endpoint
// DELETE /api/admin/cdn/files/[id]
// PATCH /api/admin/cdn/files/[id] (update alt_text)

import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { storage, StorageError } from "@autumnsgrove/groveengine/services";

export const DELETE: RequestHandler = async ({ params, locals, platform }) => {
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }
  if (!locals.user.is_admin) {
    throw error(403, "Admin access required");
  }
  if (!platform) {
    throw error(500, "Platform not available");
  }

  const { DB, CDN_BUCKET } = platform.env;

  try {
    await storage.deleteFile(CDN_BUCKET, DB, params.id);
    return json({ success: true, message: "File deleted successfully" });
  } catch (err) {
    if (err instanceof StorageError && err.code === "FILE_NOT_FOUND") {
      throw error(404, "File not found");
    }
    console.error("[CDN Delete Error]", err);
    throw error(500, "Failed to delete file");
  }
};

export const PATCH: RequestHandler = async ({
  params,
  request,
  locals,
  platform,
}) => {
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }
  if (!locals.user.is_admin) {
    throw error(403, "Admin access required");
  }
  if (!platform) {
    throw error(500, "Platform not available");
  }

  const { DB, CDN_URL } = platform.env;
  const body = (await request.json()) as { alt_text?: unknown };
  const { alt_text } = body;

  if (typeof alt_text !== "string") {
    throw error(400, "alt_text must be a string");
  }

  const file = await storage.getFileRecord(DB, params.id);
  if (!file) {
    throw error(404, "File not found");
  }

  try {
    await storage.updateAltText(DB, params.id, alt_text);
  } catch (err) {
    if (err instanceof StorageError && err.code === "FILE_NOT_FOUND") {
      throw error(404, "File not found");
    }
    throw error(500, "Failed to update file");
  }

  return json({
    success: true,
    file: {
      id: file.id,
      filename: file.filename,
      original_filename: file.originalFilename,
      key: file.key,
      content_type: file.contentType,
      size_bytes: file.sizeBytes,
      folder: file.folder,
      alt_text,
      uploaded_by: file.uploadedBy,
      created_at: file.createdAt,
      url: `${CDN_URL}/${file.key}`,
    },
  });
};
