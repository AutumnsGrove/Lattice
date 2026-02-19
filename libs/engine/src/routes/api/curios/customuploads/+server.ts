/**
 * Custom Uploads Curio API — List & Upload
 *
 * GET  — Get all uploads for tenant (admin)
 * POST — Register a new upload (admin)
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { API_ERRORS, throwGroveError, logGroveError } from "$lib/errors";
import {
  generateUploadId,
  isAllowedMimeType,
  isValidFileSize,
  sanitizeFilename,
  buildR2Key,
  buildThumbnailR2Key,
  getExtensionFromMime,
  MAX_UPLOADS_PER_TENANT,
} from "$lib/curios/customuploads";

interface UploadRow {
  id: string;
  tenant_id: string;
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

export const GET: RequestHandler = async ({ platform, locals }) => {
  const db = platform?.env?.DB;
  const tenantId = locals.tenantId;

  if (!db) {
    throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
  }

  if (!tenantId) {
    throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
  }

  if (!locals.user) {
    throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
  }

  const result = await db
    .prepare(
      `SELECT id, filename, original_filename, mime_type, file_size, width, height, usage_count, uploaded_at
       FROM custom_uploads WHERE tenant_id = ?
       ORDER BY uploaded_at DESC LIMIT 500`,
    )
    .bind(tenantId)
    .all<UploadRow>();

  const uploads = result.results.map((row) => ({
    id: row.id,
    filename: row.filename,
    originalFilename: row.original_filename,
    mimeType: row.mime_type,
    fileSize: row.file_size,
    width: row.width,
    height: row.height,
    usageCount: row.usage_count,
    uploadedAt: row.uploaded_at,
  }));

  return json(
    { uploads },
    {
      headers: {
        "Cache-Control": "private, max-age=30",
      },
    },
  );
};

export const POST: RequestHandler = async ({ request, platform, locals }) => {
  const db = platform?.env?.DB;
  const tenantId = locals.tenantId;

  if (!db) {
    throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
  }

  if (!tenantId) {
    throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
  }

  if (!locals.user) {
    throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    throwGroveError(400, API_ERRORS.INVALID_REQUEST_BODY, "API");
  }

  // Check quota before accepting
  const countResult = await db
    .prepare(`SELECT COUNT(*) as count FROM custom_uploads WHERE tenant_id = ?`)
    .bind(tenantId)
    .first<{ count: number }>();

  if ((countResult?.count ?? 0) >= MAX_UPLOADS_PER_TENANT) {
    throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
  }

  const mimeType = body.mimeType as string;
  if (!isAllowedMimeType(mimeType)) {
    throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
  }

  const fileSize = body.fileSize as number;
  if (!isValidFileSize(fileSize)) {
    throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
  }

  const originalFilename = (body.originalFilename as string) || "upload";
  const filename = sanitizeFilename(originalFilename);
  const id = generateUploadId();
  const ext = getExtensionFromMime(mimeType);
  const r2Key = buildR2Key(tenantId, id, ext);
  const thumbnailR2Key =
    (mimeType as string) !== "image/svg+xml"
      ? buildThumbnailR2Key(tenantId, id)
      : null;

  const width = typeof body.width === "number" ? body.width : null;
  const height = typeof body.height === "number" ? body.height : null;

  try {
    await db
      .prepare(
        `INSERT INTO custom_uploads (id, tenant_id, filename, original_filename, mime_type, file_size, width, height, r2_key, thumbnail_r2_key)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        tenantId,
        filename,
        originalFilename,
        mimeType,
        fileSize,
        width,
        height,
        r2Key,
        thumbnailR2Key,
      )
      .run();

    return json({ success: true, id, r2Key, thumbnailR2Key }, { status: 201 });
  } catch (error) {
    logGroveError("API", API_ERRORS.OPERATION_FAILED, {
      detail: "Upload registration failed",
      cause: error,
    });
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API");
  }
};
