/**
 * Badges Curio API — Manage earned badge
 *
 * PATCH — Toggle showcase/reorder (admin)
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { API_ERRORS, throwGroveError, logGroveError } from "$lib/errors";

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
    .prepare(
      `SELECT id FROM tenant_badges WHERE badge_id = ? AND tenant_id = ?`,
    )
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
  const values: unknown[] = [];

  if (body.isShowcased !== undefined) {
    updates.push("is_showcased = ?");
    values.push(body.isShowcased ? 1 : 0);
  }

  if (typeof body.displayOrder === "number") {
    updates.push("display_order = ?");
    values.push(Math.max(0, Math.floor(body.displayOrder)));
  }

  if (updates.length === 0) {
    return json({ success: true, noChanges: true });
  }

  values.push(params.id, tenantId);

  try {
    await db
      .prepare(
        `UPDATE tenant_badges SET ${updates.join(", ")} WHERE badge_id = ? AND tenant_id = ?`,
      )
      .bind(...values)
      .run();

    return json({ success: true });
  } catch (error) {
    logGroveError("API", API_ERRORS.OPERATION_FAILED, {
      detail: "Badge update failed",
      cause: error,
    });
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API");
  }
};
