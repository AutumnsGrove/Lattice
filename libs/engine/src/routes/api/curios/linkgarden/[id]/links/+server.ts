/**
 * Link Gardens Curio API — Link Items
 *
 * POST   — Add a link to a garden (admin)
 * DELETE — Remove a link from a garden (admin)
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { API_ERRORS, throwGroveError, logGroveError } from "$lib/errors";
import {
  generateLinkId,
  isValidUrl,
  sanitizeLinkTitle,
  sanitizeText,
  buildFaviconUrl,
  MAX_LINK_DESCRIPTION_LENGTH,
  MAX_CATEGORY_LENGTH,
  MAX_URL_LENGTH,
  MAX_LINKS_PER_GARDEN,
} from "$lib/curios/linkgarden";

// ─────────────────────────────────────────────────────────────────────────────
// POST — Add a link
// ─────────────────────────────────────────────────────────────────────────────

export const POST: RequestHandler = async ({
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

  // Verify garden belongs to tenant
  const garden = await db
    .prepare(`SELECT id FROM link_gardens WHERE id = ? AND tenant_id = ?`)
    .bind(params.id, tenantId)
    .first<{ id: string }>();

  if (!garden) {
    throwGroveError(404, API_ERRORS.RESOURCE_NOT_FOUND, "API");
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    throwGroveError(400, API_ERRORS.INVALID_REQUEST_BODY, "API");
  }

  // Validate URL (required)
  const url = String(body.url ?? "").trim();
  if (!url || url.length > MAX_URL_LENGTH || !isValidUrl(url)) {
    throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
  }

  const title = sanitizeLinkTitle(body.title as string | null);
  const description = sanitizeText(
    body.description as string | null,
    MAX_LINK_DESCRIPTION_LENGTH,
  );
  const category = sanitizeText(
    body.category as string | null,
    MAX_CATEGORY_LENGTH,
  );
  const faviconUrl = buildFaviconUrl(url);

  // Enforce per-garden link limit
  const countResult = await db
    .prepare(
      `SELECT COUNT(*) as count FROM link_garden_items WHERE garden_id = ?`,
    )
    .bind(params.id)
    .first<{ count: number }>();
  if ((countResult?.count ?? 0) >= MAX_LINKS_PER_GARDEN) {
    throwGroveError(400, API_ERRORS.RATE_LIMITED, "API");
  }

  // Get next sort order
  const maxOrder = await db
    .prepare(
      `SELECT MAX(sort_order) as max_order FROM link_garden_items WHERE garden_id = ?`,
    )
    .bind(params.id)
    .first<{ max_order: number | null }>();
  const sortOrder = (maxOrder?.max_order ?? -1) + 1;

  const id = generateLinkId();

  try {
    await db
      .prepare(
        `INSERT INTO link_garden_items (id, garden_id, tenant_id, url, title, description, favicon_url, category, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        params.id,
        tenantId,
        url,
        title,
        description,
        faviconUrl,
        category,
        sortOrder,
      )
      .run();
  } catch (err) {
    logGroveError("API", API_ERRORS.OPERATION_FAILED, {
      detail: "Link item create failed",
      cause: err,
    });
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API");
  }

  return json(
    { success: true, link: { id, url, title, description, category } },
    { status: 201 },
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE — Remove a link (by link ID in request body)
// ─────────────────────────────────────────────────────────────────────────────

export const DELETE: RequestHandler = async ({
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

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    throwGroveError(400, API_ERRORS.INVALID_REQUEST_BODY, "API");
  }

  const linkId = String(body.linkId ?? "");
  if (!linkId) {
    throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "API");
  }

  // Verify link belongs to garden + tenant
  const existing = await db
    .prepare(
      `SELECT id FROM link_garden_items WHERE id = ? AND garden_id = ? AND tenant_id = ?`,
    )
    .bind(linkId, params.id, tenantId)
    .first<{ id: string }>();

  if (!existing) {
    throwGroveError(404, API_ERRORS.RESOURCE_NOT_FOUND, "API");
  }

  try {
    await db
      .prepare(
        `DELETE FROM link_garden_items WHERE id = ? AND garden_id = ? AND tenant_id = ?`,
      )
      .bind(linkId, params.id, tenantId)
      .run();
  } catch (err) {
    logGroveError("API", API_ERRORS.OPERATION_FAILED, {
      detail: "Link item delete failed",
      cause: err,
    });
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API");
  }

  return json({ success: true });
};
