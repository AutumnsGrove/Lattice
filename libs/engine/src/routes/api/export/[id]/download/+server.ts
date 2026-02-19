/**
 * Download Zip Export
 *
 * GET /api/export/[id]/download
 *
 * Streams the completed zip export file from R2 storage.
 * Only works for completed exports that haven't expired.
 *
 * Returns:
 * - 200: The zip file as binary stream
 * - 404: Export not found
 * - 410: Export expired
 * - 400: Export not yet complete
 */

import type { RequestHandler } from "./$types";
import { getVerifiedTenantId } from "$lib/auth/session.js";
import { API_ERRORS, throwGroveError, buildErrorJson } from "$lib/errors";
import { validateUUID, sanitizeFilename } from "$lib/utils/validation.js";

interface StorageExport {
  id: string;
  status: string;
  r2_key: string | null;
  file_size_bytes: number | null;
  created_at: number;
  expires_at: number | null;
  tenant_id: string;
}

export const GET: RequestHandler = async ({ params, platform, locals }) => {
  if (!locals.user) {
    throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
  }

  if (!platform?.env?.DB) {
    throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
  }

  try {
    // Validate export ID format (UUID) to prevent injection
    if (!validateUUID(params.id)) {
      throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API", {
        detail: "Invalid export ID format",
      });
    }

    // Get verified tenant
    const tenantId = await getVerifiedTenantId(
      platform.env.DB,
      locals.tenantId,
      locals.user,
    );

    // Query export record with tenant_id for additional validation
    const record = await platform.env.DB.prepare(
      `SELECT id, status, r2_key, file_size_bytes, created_at, expires_at, tenant_id
       FROM storage_exports
       WHERE id = ? AND tenant_id = ?`,
    )
      .bind(params.id, tenantId)
      .first<StorageExport>();

    if (!record) {
      return new Response(
        JSON.stringify(buildErrorJson(API_ERRORS.EXPORT_NOT_FOUND)),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Check expiry
    const now = Math.floor(Date.now() / 1000);
    if (record.expires_at && record.expires_at < now) {
      return new Response(
        JSON.stringify(buildErrorJson(API_ERRORS.EXPORT_EXPIRED)),
        {
          status: 410,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Check status
    if (record.status !== "complete") {
      throwGroveError(400, API_ERRORS.OPERATION_FAILED, "API", {
        detail: `Export status is '${record.status}', not 'complete'`,
      });
    }

    // Check R2 key exists
    if (!record.r2_key) {
      throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API", {
        detail: "Export marked complete but no R2 key found",
      });
    }

    // Validate R2 key format to prevent path traversal
    // R2 keys should be in format: exports/{tenantId}/{exportId}/grove-export-{username}-{date}.zip
    if (
      !record.r2_key.startsWith(`exports/${record.tenant_id}/${record.id}/`) ||
      record.r2_key.includes("..") ||
      record.r2_key.includes("//")
    ) {
      throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API", {
        detail: "Invalid R2 key format",
      });
    }

    // Get file from R2
    const object = await platform.env.EXPORTS_BUCKET?.get(record.r2_key);
    if (!object) {
      throwGroveError(404, API_ERRORS.EXPORT_NOT_FOUND, "API", {
        detail: "Export file not found in storage",
      });
    }

    // Format the filename with export date
    const exportDate = new Date(record.created_at * 1000)
      .toISOString()
      .split("T")[0];
    // Sanitize filename to prevent header injection
    const filename = sanitizeFilename(`grove-export-${exportDate}.zip`);

    // Stream back to client
    return new Response(object.body, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        // Use RFC 5987 encoding for filename to prevent injection
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(record.file_size_bytes || object.size),
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    if ((err as { status?: number }).status) throw err;
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API", { cause: err });
  }
};
