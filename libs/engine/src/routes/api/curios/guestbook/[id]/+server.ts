/**
 * Guestbook Curio API — Entry Management (Admin)
 *
 * PATCH  — Approve or reject an entry
 * DELETE — Delete an entry
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { API_ERRORS, throwGroveError, logGroveError } from "$lib/errors";

// ─────────────────────────────────────────────────────────────────────────────
// PATCH — Approve/reject an entry
// ─────────────────────────────────────────────────────────────────────────────

export const PATCH: RequestHandler = async ({
  params,
  request,
  platform,
  locals,
}) => {
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

  const entryId = params.id;

  // Verify entry belongs to this tenant
  const entry = await db
    .prepare(`SELECT id FROM guestbook_entries WHERE id = ? AND tenant_id = ?`)
    .bind(entryId, tenantId)
    .first<{ id: string }>();

  if (!entry) {
    throwGroveError(404, API_ERRORS.RESOURCE_NOT_FOUND, "API");
  }

  let body: { approved?: boolean };
  try {
    body = await request.json();
  } catch {
    throwGroveError(400, API_ERRORS.INVALID_REQUEST_BODY, "API");
  }

  if (typeof body.approved !== "boolean") {
    throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
  }

  try {
    await db
      .prepare(
        `UPDATE guestbook_entries SET approved = ? WHERE id = ? AND tenant_id = ?`,
      )
      .bind(body.approved ? 1 : 0, entryId, tenantId)
      .run();
  } catch (err) {
    logGroveError("API", API_ERRORS.OPERATION_FAILED, {
      detail: "Guestbook entry update failed",
      cause: err,
    });
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API");
  }

  return json({ success: true, id: entryId, approved: body.approved });
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE — Delete an entry
// ─────────────────────────────────────────────────────────────────────────────

export const DELETE: RequestHandler = async ({ params, platform, locals }) => {
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

  const entryId = params.id;

  // Verify entry belongs to this tenant
  const entry = await db
    .prepare(`SELECT id FROM guestbook_entries WHERE id = ? AND tenant_id = ?`)
    .bind(entryId, tenantId)
    .first<{ id: string }>();

  if (!entry) {
    throwGroveError(404, API_ERRORS.RESOURCE_NOT_FOUND, "API");
  }

  try {
    await db
      .prepare(`DELETE FROM guestbook_entries WHERE id = ? AND tenant_id = ?`)
      .bind(entryId, tenantId)
      .run();
  } catch (err) {
    logGroveError("API", API_ERRORS.OPERATION_FAILED, {
      detail: "Guestbook entry delete failed",
      cause: err,
    });
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API");
  }

  return json({ success: true, id: entryId });
};
