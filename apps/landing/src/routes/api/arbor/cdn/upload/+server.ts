// CDN File Upload Endpoint
// POST /api/admin/cdn/upload

import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { storage, StorageError } from "@autumnsgrove/lattice/services";
import { parseFormData } from "@autumnsgrove/lattice/server";
import { getUserByEmail } from "$lib/server/db";
import { z } from "zod";

const UploadMetadataSchema = z.object({
  folder: z.string().optional().default("/"),
  alt_text: z.string().optional().default(""),
});

export const POST: RequestHandler = async ({ request, locals, platform }) => {
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }
  if (!locals.user.is_admin) {
    throw error(403, "Admin access required");
  }
  if (!platform) {
    throw error(500, "Platform not available");
  }

  const { DB, CDN_BUCKET, CDN_URL } = platform.env;

  // Get the user from database to get their ID
  const user = await getUserByEmail(DB, locals.user.email);
  if (!user) {
    throw error(401, "User not found");
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const metaResult = parseFormData(formData, UploadMetadataSchema);
    const folder = metaResult.success ? metaResult.data.folder : "/";
    const altText = metaResult.success ? metaResult.data.alt_text : "";

    if (!file) {
      throw error(400, "No file provided");
    }

    const arrayBuffer = await file.arrayBuffer();

    const storageFile = await storage.uploadFile(CDN_BUCKET, DB, {
      data: arrayBuffer,
      filename: file.name,
      contentType: file.type,
      folder,
      altText: altText || undefined,
      uploadedBy: user.id,
    });

    return json({
      success: true,
      file: {
        id: storageFile.id,
        filename: storageFile.filename,
        original_filename: storageFile.originalFilename,
        key: storageFile.key,
        content_type: storageFile.contentType,
        size_bytes: storageFile.sizeBytes,
        folder: storageFile.folder,
        alt_text: storageFile.altText,
        uploaded_by: storageFile.uploadedBy,
        created_at: storageFile.createdAt,
        url: `${CDN_URL}/${storageFile.key}`,
      },
    });
  } catch (err) {
    console.error("[CDN Upload Error]", err);

    if (err instanceof StorageError) {
      switch (err.code) {
        case "FILE_TOO_LARGE":
          throw error(400, err.message);
        case "INVALID_TYPE":
          throw error(400, err.message);
        case "UPLOAD_FAILED":
          throw error(500, "Failed to upload file to storage");
        case "METADATA_FAILED":
          throw error(500, "Failed to store file metadata");
        default:
          throw error(500, "Storage operation failed");
      }
    }

    if (err instanceof Error && "status" in err) {
      throw err;
    }

    throw error(500, "Failed to upload file");
  }
};
