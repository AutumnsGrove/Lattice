/**
 * Status Badges Curio API — Single Badge Management
 *
 * PATCH  — Update a badge (admin)
 * DELETE — Remove a badge (admin)
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { API_ERRORS, throwGroveError, logGroveError } from "$lib/errors";
import {
  isValidBadgePosition,
  sanitizeCustomText,
} from "$lib/curios/statusbadge";

// ─────────────────────────────────────────────────────────────────────────────
// PATCH — Update a badge
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

  // Verify badge belongs to tenant
  const existing = await db
    .prepare(`SELECT id FROM status_badges WHERE id = ? AND tenant_id = ?`)
    .bind(params.id, tenantId)
    .first<{ id: string }>();

  if (!existing) {
    throwGroveError(404, API_ERRORS.RESOURCE_NOT_FOUND, "API");
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    throwGroveError(400, API_ERRORS.INVALID_REQUEST_BODY, "API");
  }

  // Build update fields dynamically
  const updates: string[] = [];
  const values: (string | number | null)[] = [];

  if (body.position !== undefined) {
    const position = String(body.position);
    if (!isValidBadgePosition(position)) {
      throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
    }
    updates.push("position = ?");
    values.push(position);
  }

  if (body.animated !== undefined) {
    updates.push("animated = ?");
    values.push(body.animated ? 1 : 0);
  }

  if (body.customText !== undefined) {
    updates.push("custom_text = ?");
    values.push(sanitizeCustomText(body.customText as string | null));
  }

  if (body.showDate !== undefined) {
    updates.push("show_date = ?");
    values.push(body.showDate ? 1 : 0);
  }

  if (updates.length === 0) {
    return json({ success: true, message: "No changes" });
  }

  try {
    await db
      .prepare(
        `UPDATE status_badges SET ${updates.join(", ")} WHERE id = ? AND tenant_id = ?`,
      )
      .bind(...values, params.id, tenantId)
      .run();
  } catch (err) {
    logGroveError("API", API_ERRORS.OPERATION_FAILED, {
      detail: "Status badge update failed",
      cause: err,
    });
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API");
  }

  return json({ success: true });
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE — Remove a badge
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

  // Verify badge belongs to tenant before deleting
  const existing = await db
    .prepare(`SELECT id FROM status_badges WHERE id = ? AND tenant_id = ?`)
    .bind(params.id, tenantId)
    .first<{ id: string }>();

  if (!existing) {
    throwGroveError(404, API_ERRORS.RESOURCE_NOT_FOUND, "API");
  }

  try {
    await db
      .prepare(`DELETE FROM status_badges WHERE id = ? AND tenant_id = ?`)
      .bind(params.id, tenantId)
      .run();
  } catch (err) {
    logGroveError("API", API_ERRORS.OPERATION_FAILED, {
      detail: "Status badge delete failed",
      cause: err,
    });
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API");
  }

  return json({ success: true });
};
