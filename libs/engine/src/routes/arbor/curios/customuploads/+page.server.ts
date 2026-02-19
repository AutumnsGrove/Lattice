import type { PageServerLoad, Actions } from "./$types";
import { fail } from "@sveltejs/kit";
import { ARBOR_ERRORS, logGroveError } from "$lib/errors";
import {
  MAX_FILE_SIZE,
  MAX_UPLOADS_PER_TENANT,
  formatFileSize,
} from "$lib/curios/customuploads";

interface UploadRow {
  id: string;
  filename: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
  width: number | null;
  height: number | null;
  r2_key: string;
  thumbnail_r2_key: string | null;
  usage_count: number;
  uploaded_at: string;
}

export const load: PageServerLoad = async ({ platform, locals }) => {
  const db = platform?.env?.DB;
  const tenantId = locals.tenantId;

  if (!db || !tenantId) {
    return {
      uploads: [],
      quota: {
        used: 0,
        max: MAX_UPLOADS_PER_TENANT,
        maxFileSize: formatFileSize(MAX_FILE_SIZE),
      },
      error: "Database not available",
    };
  }

  const result = await db
    .prepare(
      `SELECT id, filename, original_filename, mime_type, file_size, width, height, r2_key, thumbnail_r2_key, usage_count, uploaded_at
       FROM custom_uploads WHERE tenant_id = ?
       ORDER BY uploaded_at DESC`,
    )
    .bind(tenantId)
    .all<UploadRow>()
    .catch(() => ({ results: [] as UploadRow[] }));

  const uploads = result.results.map((row) => ({
    id: row.id,
    filename: row.filename,
    originalFilename: row.original_filename,
    mimeType: row.mime_type,
    fileSize: row.file_size,
    fileSizeFormatted: formatFileSize(row.file_size),
    width: row.width,
    height: row.height,
    usageCount: row.usage_count,
    uploadedAt: row.uploaded_at,
  }));

  return {
    uploads,
    quota: {
      used: uploads.length,
      max: MAX_UPLOADS_PER_TENANT,
      maxFileSize: formatFileSize(MAX_FILE_SIZE),
    },
  };
};

export const actions: Actions = {
  remove: async ({ request, platform, locals }) => {
    const db = platform?.env?.DB;
    const tenantId = locals.tenantId;

    if (!db || !tenantId) {
      return fail(500, {
        error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
        error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
      });
    }

    const formData = await request.formData();
    const uploadId = formData.get("uploadId") as string;

    try {
      await db
        .prepare(`DELETE FROM custom_uploads WHERE id = ? AND tenant_id = ?`)
        .bind(uploadId, tenantId)
        .run();

      return { success: true, uploadRemoved: true };
    } catch (error) {
      logGroveError("Arbor", ARBOR_ERRORS.OPERATION_FAILED, { cause: error });
      return fail(500, {
        error: ARBOR_ERRORS.OPERATION_FAILED.userMessage,
        error_code: ARBOR_ERRORS.OPERATION_FAILED.code,
      });
    }
  },
};
