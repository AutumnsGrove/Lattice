/**
 * Clip Art Library Curio API — Placements
 *
 * GET  — Get clip art placements for a page (public)
 * POST — Add a placement (admin)
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { API_ERRORS, throwGroveError, logGroveError } from "$lib/errors";
import {
  generatePlacementId,
  isValidScale,
  isValidRotation,
  isValidPosition,
  isValidZIndex,
  MAX_CLIPART_PLACEMENTS_PER_TENANT,
} from "$lib/curios/clipart";

interface PlacementRow {
  id: string;
  tenant_id: string;
  asset_id: string;
  page_path: string;
  x_position: number;
  y_position: number;
  scale: number;
  rotation: number;
  z_index: number;
  created_at: string;
}

export const GET: RequestHandler = async ({ platform, locals, url }) => {
  const db = platform?.env?.DB;
  const tenantId = locals.tenantId;

  if (!db) {
    throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
  }

  if (!tenantId) {
    throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
  }

  const pagePath = url.searchParams.get("page") || "/";

  const result = await db
    .prepare(
      `SELECT id, asset_id, page_path, x_position, y_position, scale, rotation, z_index
       FROM clipart_placements WHERE tenant_id = ? AND page_path = ?
       ORDER BY z_index ASC, created_at ASC LIMIT 500`,
    )
    .bind(tenantId, pagePath)
    .all<PlacementRow>();

  const placements = result.results.map((row) => ({
    id: row.id,
    assetId: row.asset_id,
    pagePath: row.page_path,
    xPosition: row.x_position,
    yPosition: row.y_position,
    scale: row.scale,
    rotation: row.rotation,
    zIndex: row.z_index,
  }));

  return json(
    { placements },
    {
      headers: {
        "Cache-Control": "public, max-age=60, stale-while-revalidate=120",
      },
    },
  );
};

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

  const assetId = (body.assetId as string)?.trim();
  if (!assetId) {
    throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "API");
  }

  const pagePath = (body.pagePath as string)?.trim() || "/";

  const xPosition = typeof body.xPosition === "number" ? body.xPosition : 50;
  const yPosition = typeof body.yPosition === "number" ? body.yPosition : 50;
  if (!isValidPosition(xPosition) || !isValidPosition(yPosition)) {
    throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
  }

  const scale = typeof body.scale === "number" ? body.scale : 1.0;
  if (!isValidScale(scale)) {
    throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
  }

  const rotation = typeof body.rotation === "number" ? body.rotation : 0;
  if (!isValidRotation(rotation)) {
    throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
  }

  const zIndex = typeof body.zIndex === "number" ? body.zIndex : 10;
  if (!isValidZIndex(zIndex)) {
    throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
  }

  const id = generatePlacementId();

  // Enforce per-tenant placement limit
  const countResult = await db
    .prepare(
      `SELECT COUNT(*) as count FROM clipart_placements WHERE tenant_id = ?`,
    )
    .bind(tenantId)
    .first<{ count: number }>();
  if ((countResult?.count ?? 0) >= MAX_CLIPART_PLACEMENTS_PER_TENANT) {
    throwGroveError(400, API_ERRORS.RATE_LIMITED, "API");
  }

  try {
    await db
      .prepare(
        `INSERT INTO clipart_placements (id, tenant_id, asset_id, page_path, x_position, y_position, scale, rotation, z_index)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        tenantId,
        assetId,
        pagePath,
        xPosition,
        yPosition,
        scale,
        rotation,
        zIndex,
      )
      .run();

    return json({ success: true, id }, { status: 201 });
  } catch (error) {
    logGroveError("API", API_ERRORS.OPERATION_FAILED, {
      detail: "Clip art placement failed",
      cause: error,
    });
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API");
  }
};
