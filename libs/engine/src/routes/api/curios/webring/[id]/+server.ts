/**
 * Webring Hub Curio API — Single Membership
 *
 * PATCH  — Update a webring membership (admin)
 * DELETE — Remove a webring membership (admin)
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { API_ERRORS, throwGroveError, logGroveError } from "$lib/errors";
import {
  isValidBadgeStyle,
  isValidPosition,
  isValidUrl,
  sanitizeRingName,
  MAX_URL_LENGTH,
} from "$lib/curios/webring";

// ─────────────────────────────────────────────────────────────────────────────
// PATCH — Update a webring membership (admin)
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
    .prepare(
      `SELECT id FROM webring_memberships WHERE id = ? AND tenant_id = ?`,
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

  // Build dynamic update
  const updates: string[] = [];
  const values: unknown[] = [];

  if (body.ringName !== undefined) {
    const name = sanitizeRingName(body.ringName as string);
    if (!name) {
      throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
    }
    updates.push("ring_name = ?");
    values.push(name);
  }

  if (body.prevUrl !== undefined) {
    const url = (body.prevUrl as string)?.trim();
    if (!url || !isValidUrl(url) || url.length > MAX_URL_LENGTH) {
      throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
    }
    updates.push("prev_url = ?");
    values.push(url);
  }

  if (body.nextUrl !== undefined) {
    const url = (body.nextUrl as string)?.trim();
    if (!url || !isValidUrl(url) || url.length > MAX_URL_LENGTH) {
      throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
    }
    updates.push("next_url = ?");
    values.push(url);
  }

  if (body.ringUrl !== undefined) {
    const url = (body.ringUrl as string)?.trim() || null;
    if (url && (!isValidUrl(url) || url.length > MAX_URL_LENGTH)) {
      throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
    }
    updates.push("ring_url = ?");
    values.push(url);
  }

  if (body.homeUrl !== undefined) {
    const url = (body.homeUrl as string)?.trim() || null;
    if (url && (!isValidUrl(url) || url.length > MAX_URL_LENGTH)) {
      throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
    }
    updates.push("home_url = ?");
    values.push(url);
  }

  if (body.badgeStyle !== undefined) {
    if (!isValidBadgeStyle(body.badgeStyle as string)) {
      throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
    }
    updates.push("badge_style = ?");
    values.push(body.badgeStyle);
  }

  if (body.position !== undefined) {
    if (!isValidPosition(body.position as string)) {
      throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
    }
    updates.push("position = ?");
    values.push(body.position);
  }

  if (updates.length === 0) {
    return json({ success: true, noChanges: true });
  }

  values.push(params.id, tenantId);

  try {
    await db
      .prepare(
        `UPDATE webring_memberships SET ${updates.join(", ")} WHERE id = ? AND tenant_id = ?`,
      )
      .bind(...values)
      .run();

    return json({ success: true });
  } catch (error) {
    logGroveError("API", API_ERRORS.OPERATION_FAILED, {
      detail: "Webring update failed",
      cause: error,
    });
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE — Remove a webring membership (admin)
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
    .prepare(
      `SELECT id FROM webring_memberships WHERE id = ? AND tenant_id = ?`,
    )
    .bind(params.id, tenantId)
    .first<{ id: string }>();

  if (!existing) {
    throwGroveError(404, API_ERRORS.RESOURCE_NOT_FOUND, "API");
  }

  try {
    await db
      .prepare(`DELETE FROM webring_memberships WHERE id = ? AND tenant_id = ?`)
      .bind(params.id, tenantId)
      .run();

    return json({ success: true });
  } catch (error) {
    logGroveError("API", API_ERRORS.OPERATION_FAILED, {
      detail: "Webring delete failed",
      cause: error,
    });
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API");
  }
};
