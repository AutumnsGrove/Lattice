/**
 * Personal Shrines Curio API — Single Shrine
 *
 * PATCH  — Update a shrine (admin)
 * DELETE — Remove a shrine (admin)
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { API_ERRORS, throwGroveError, logGroveError } from "$lib/errors";
import {
  isValidShrineType,
  isValidSize,
  isValidFrameStyle,
  sanitizeTitle,
  sanitizeDescription,
  MAX_CONTENTS_SIZE,
} from "$lib/curios/shrines";

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
    .prepare(`SELECT id FROM shrines WHERE id = ? AND tenant_id = ?`)
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

  if (body.title !== undefined) {
    const title = sanitizeTitle(body.title as string);
    if (!title) {
      throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
    }
    updates.push("title = ?");
    values.push(title);
  }

  if (body.description !== undefined) {
    updates.push("description = ?");
    values.push(sanitizeDescription(body.description as string));
  }

  if (body.shrineType !== undefined) {
    if (!isValidShrineType(body.shrineType as string)) {
      throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
    }
    updates.push("shrine_type = ?");
    values.push(body.shrineType);
  }

  if (body.size !== undefined) {
    if (!isValidSize(body.size as string)) {
      throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
    }
    updates.push("size = ?");
    values.push(body.size);
  }

  if (body.frameStyle !== undefined) {
    if (!isValidFrameStyle(body.frameStyle as string)) {
      throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
    }
    updates.push("frame_style = ?");
    values.push(body.frameStyle);
  }

  if (body.contents !== undefined) {
    const contentsJson = JSON.stringify(body.contents);
    if (contentsJson.length > MAX_CONTENTS_SIZE) {
      throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
    }
    updates.push("contents = ?");
    values.push(contentsJson);
  }

  if (body.isPublished !== undefined) {
    updates.push("is_published = ?");
    values.push(body.isPublished ? 1 : 0);
  }

  if (updates.length === 0) {
    return json({ success: true, noChanges: true });
  }

  updates.push("updated_at = datetime('now')");
  values.push(params.id, tenantId);

  try {
    await db
      .prepare(
        `UPDATE shrines SET ${updates.join(", ")} WHERE id = ? AND tenant_id = ?`,
      )
      .bind(...values)
      .run();

    return json({ success: true });
  } catch (error) {
    logGroveError("API", API_ERRORS.OPERATION_FAILED, {
      detail: "Shrine update failed",
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
    .prepare(`SELECT id FROM shrines WHERE id = ? AND tenant_id = ?`)
    .bind(params.id, tenantId)
    .first<{ id: string }>();

  if (!existing) {
    throwGroveError(404, API_ERRORS.RESOURCE_NOT_FOUND, "API");
  }

  try {
    await db
      .prepare(`DELETE FROM shrines WHERE id = ? AND tenant_id = ?`)
      .bind(params.id, tenantId)
      .run();

    return json({ success: true });
  } catch (error) {
    logGroveError("API", API_ERRORS.OPERATION_FAILED, {
      detail: "Shrine delete failed",
      cause: error,
    });
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API");
  }
};
