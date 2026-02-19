/**
 * Link Gardens Curio API — Single Garden
 *
 * PATCH  — Update garden settings (admin)
 * DELETE — Delete garden and all its links (admin)
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { API_ERRORS, throwGroveError, logGroveError } from "$lib/errors";
import {
  isValidGardenStyle,
  sanitizeTitle,
  sanitizeText,
  MAX_DESCRIPTION_LENGTH,
} from "$lib/curios/linkgarden";

// ─────────────────────────────────────────────────────────────────────────────
// PATCH — Update garden
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

  const existing = await db
    .prepare(`SELECT id FROM link_gardens WHERE id = ? AND tenant_id = ?`)
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

  const updates: string[] = [];
  const values: (string | null)[] = [];

  if (body.title !== undefined) {
    updates.push("title = ?");
    values.push(sanitizeTitle(body.title as string | null));
  }

  if (body.description !== undefined) {
    updates.push("description = ?");
    values.push(
      sanitizeText(body.description as string | null, MAX_DESCRIPTION_LENGTH),
    );
  }

  if (body.style !== undefined) {
    const style = String(body.style);
    if (!isValidGardenStyle(style)) {
      throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
    }
    updates.push("style = ?");
    values.push(style);
  }

  if (updates.length === 0) {
    return json({ success: true, message: "No changes" });
  }

  updates.push("updated_at = datetime('now')");

  try {
    await db
      .prepare(
        `UPDATE link_gardens SET ${updates.join(", ")} WHERE id = ? AND tenant_id = ?`,
      )
      .bind(...values, params.id, tenantId)
      .run();
  } catch (err) {
    logGroveError("API", API_ERRORS.OPERATION_FAILED, {
      detail: "Link garden update failed",
      cause: err,
    });
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API");
  }

  return json({ success: true });
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE — Delete garden (cascades to links)
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

  const existing = await db
    .prepare(`SELECT id FROM link_gardens WHERE id = ? AND tenant_id = ?`)
    .bind(params.id, tenantId)
    .first<{ id: string }>();

  if (!existing) {
    throwGroveError(404, API_ERRORS.RESOURCE_NOT_FOUND, "API");
  }

  try {
    // Delete links first (foreign key cascade might not be enforced in D1)
    await db
      .prepare(
        `DELETE FROM link_garden_items WHERE garden_id = ? AND tenant_id = ?`,
      )
      .bind(params.id, tenantId)
      .run();

    await db
      .prepare(`DELETE FROM link_gardens WHERE id = ? AND tenant_id = ?`)
      .bind(params.id, tenantId)
      .run();
  } catch (err) {
    logGroveError("API", API_ERRORS.OPERATION_FAILED, {
      detail: "Link garden delete failed",
      cause: err,
    });
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API");
  }

  return json({ success: true });
};
