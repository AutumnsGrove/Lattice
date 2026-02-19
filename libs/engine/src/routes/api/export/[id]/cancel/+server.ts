/**
 * Cancel Export Job
 *
 * POST /api/export/[id]/cancel
 *
 * Marks an in-progress export as cancelled. Only works for exports
 * in active phases (pending, querying, assembling, uploading, notifying).
 * Already-completed or already-failed exports cannot be cancelled.
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getVerifiedTenantId } from "$lib/auth/session.js";
import { API_ERRORS, throwGroveError, buildErrorJson } from "$lib/errors";
import { validateUUID } from "$lib/utils/validation.js";

const ACTIVE_PHASES = [
  "pending",
  "querying",
  "assembling",
  "uploading",
  "notifying",
];

export const POST: RequestHandler = async ({ params, platform, locals }) => {
  if (!locals.user) {
    throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
  }

  if (!platform?.env?.DB) {
    throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
  }

  if (!validateUUID(params.id)) {
    throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API", {
      detail: "Invalid export ID format",
    });
  }

  const tenantId = await getVerifiedTenantId(
    platform.env.DB,
    locals.tenantId,
    locals.user,
  );

  const now = Math.floor(Date.now() / 1000);

  // Only cancel exports that are still in an active phase
  const result = await platform.env.DB.prepare(
    `UPDATE storage_exports
     SET status = 'failed', error_message = 'Cancelled by user', updated_at = ?
     WHERE id = ? AND tenant_id = ? AND status IN (${ACTIVE_PHASES.map(() => "?").join(", ")})`,
  )
    .bind(now, params.id, tenantId, ...ACTIVE_PHASES)
    .run();

  if (!result.meta.changes || result.meta.changes === 0) {
    // Either not found or not in a cancellable state
    const record = await platform.env.DB.prepare(
      "SELECT status FROM storage_exports WHERE id = ? AND tenant_id = ?",
    )
      .bind(params.id, tenantId)
      .first<{ status: string }>();

    if (!record) {
      return json(buildErrorJson(API_ERRORS.EXPORT_NOT_FOUND), { status: 404 });
    }

    return json(
      { success: false, message: `Export is already ${record.status}` },
      { status: 409 },
    );
  }

  return json({ success: true, status: "failed" });
};
