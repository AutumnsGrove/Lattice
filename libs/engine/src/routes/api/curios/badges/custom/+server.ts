/**
 * Badges Curio API — Custom Badges
 *
 * POST — Create a custom badge (admin, Oak+)
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { API_ERRORS, throwGroveError, logGroveError } from "$lib/errors";
import {
  generateCustomBadgeId,
  sanitizeBadgeName,
  sanitizeBadgeDescription,
  isValidIconUrl,
  MAX_CUSTOM_BADGES,
} from "$lib/curios/badges";

export const POST: RequestHandler = async ({ request, platform, locals }) => {
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

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    throwGroveError(400, API_ERRORS.INVALID_REQUEST_BODY, "API");
  }

  const name = sanitizeBadgeName(body.name as string);
  if (!name) {
    throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "API");
  }

  const description = sanitizeBadgeDescription(body.description as string);
  if (!description) {
    throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "API");
  }

  const iconUrl = (body.iconUrl as string)?.trim();
  if (!iconUrl || !isValidIconUrl(iconUrl)) {
    throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
  }

  // Check custom badge limit
  const countResult = await db
    .prepare(`SELECT COUNT(*) as count FROM custom_badges WHERE tenant_id = ?`)
    .bind(tenantId)
    .first<{ count: number }>();

  if ((countResult?.count ?? 0) >= MAX_CUSTOM_BADGES) {
    throwGroveError(400, API_ERRORS.POST_LIMIT_REACHED, "API");
  }

  const id = generateCustomBadgeId();

  try {
    await db
      .prepare(
        `INSERT INTO custom_badges (id, tenant_id, name, description, icon_url) VALUES (?, ?, ?, ?, ?)`,
      )
      .bind(id, tenantId, name, description, iconUrl)
      .run();

    return json({ success: true, id }, { status: 201 });
  } catch (error) {
    logGroveError("API", API_ERRORS.OPERATION_FAILED, {
      detail: "Custom badge create failed",
      cause: error,
    });
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API");
  }
};
