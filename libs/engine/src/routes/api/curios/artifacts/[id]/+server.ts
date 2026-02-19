/**
 * Weird Artifacts Curio API — Single Artifact
 *
 * PATCH  — Update artifact config/placement (admin)
 * DELETE — Remove an artifact (admin)
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { API_ERRORS, throwGroveError, logGroveError } from "$lib/errors";
import { isValidPlacement, MAX_CONFIG_SIZE } from "$lib/curios/artifacts";

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
    .prepare(`SELECT id FROM artifacts WHERE id = ? AND tenant_id = ?`)
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

  if (body.placement !== undefined) {
    if (!isValidPlacement(body.placement as string)) {
      throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
    }
    updates.push("placement = ?");
    values.push(body.placement);
  }

  if (body.config !== undefined) {
    const configStr = JSON.stringify(body.config);
    if (configStr.length > MAX_CONFIG_SIZE) {
      throwGroveError(400, API_ERRORS.CONTENT_TOO_LARGE, "API");
    }
    updates.push("config = ?");
    values.push(configStr);
  }

  if (updates.length === 0) {
    return json({ success: true, noChanges: true });
  }

  values.push(params.id, tenantId);

  try {
    await db
      .prepare(
        `UPDATE artifacts SET ${updates.join(", ")} WHERE id = ? AND tenant_id = ?`,
      )
      .bind(...values)
      .run();

    return json({ success: true });
  } catch (error) {
    logGroveError("API", API_ERRORS.OPERATION_FAILED, {
      detail: "Artifact update failed",
      cause: error,
    });
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API");
  }
};

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
    .prepare(`SELECT id FROM artifacts WHERE id = ? AND tenant_id = ?`)
    .bind(params.id, tenantId)
    .first<{ id: string }>();

  if (!existing) {
    throwGroveError(404, API_ERRORS.RESOURCE_NOT_FOUND, "API");
  }

  try {
    await db
      .prepare(`DELETE FROM artifacts WHERE id = ? AND tenant_id = ?`)
      .bind(params.id, tenantId)
      .run();

    return json({ success: true });
  } catch (error) {
    logGroveError("API", API_ERRORS.OPERATION_FAILED, {
      detail: "Artifact delete failed",
      cause: error,
    });
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API");
  }
};
