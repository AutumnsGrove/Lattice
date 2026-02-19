/**
 * Blogroll Curio API — Single Item
 *
 * PATCH  — Update a blogroll item (admin)
 * DELETE — Remove a blogroll item (admin)
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { API_ERRORS, throwGroveError, logGroveError } from "$lib/errors";
import {
  isValidUrl,
  sanitizeTitle,
  sanitizeDescription,
  MAX_URL_LENGTH,
  MAX_FEED_URL_LENGTH,
} from "$lib/curios/blogroll";

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
    .prepare(`SELECT id FROM blogroll_items WHERE id = ? AND tenant_id = ?`)
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

  if (body.url !== undefined) {
    const url = (body.url as string)?.trim();
    if (!url || !isValidUrl(url) || url.length > MAX_URL_LENGTH) {
      throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
    }
    updates.push("url = ?");
    values.push(url);
  }

  if (body.feedUrl !== undefined) {
    const feedUrl = (body.feedUrl as string)?.trim() || null;
    if (
      feedUrl &&
      (!isValidUrl(feedUrl) || feedUrl.length > MAX_FEED_URL_LENGTH)
    ) {
      throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
    }
    updates.push("feed_url = ?");
    values.push(feedUrl);
  }

  if (updates.length === 0) {
    return json({ success: true, noChanges: true });
  }

  updates.push("updated_at = datetime('now')");
  values.push(params.id, tenantId);

  try {
    await db
      .prepare(
        `UPDATE blogroll_items SET ${updates.join(", ")} WHERE id = ? AND tenant_id = ?`,
      )
      .bind(...values)
      .run();

    return json({ success: true });
  } catch (error) {
    logGroveError("API", API_ERRORS.OPERATION_FAILED, {
      detail: "Blogroll update failed",
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
    .prepare(`SELECT id FROM blogroll_items WHERE id = ? AND tenant_id = ?`)
    .bind(params.id, tenantId)
    .first<{ id: string }>();

  if (!existing) {
    throwGroveError(404, API_ERRORS.RESOURCE_NOT_FOUND, "API");
  }

  try {
    await db
      .prepare(`DELETE FROM blogroll_items WHERE id = ? AND tenant_id = ?`)
      .bind(params.id, tenantId)
      .run();

    return json({ success: true });
  } catch (error) {
    logGroveError("API", API_ERRORS.OPERATION_FAILED, {
      detail: "Blogroll delete failed",
      cause: error,
    });
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API");
  }
};
