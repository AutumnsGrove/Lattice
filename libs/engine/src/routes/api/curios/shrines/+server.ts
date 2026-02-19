/**
 * Personal Shrines Curio API — List & Create
 *
 * GET  — Get published shrines (public)
 * POST — Create a shrine (admin)
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { API_ERRORS, throwGroveError, logGroveError } from "$lib/errors";
import {
  generateShrineId,
  isValidShrineType,
  isValidSize,
  isValidFrameStyle,
  sanitizeTitle,
  sanitizeDescription,
  parseContents,
  MAX_CONTENTS_SIZE,
  MAX_SHRINES_PER_TENANT,
} from "$lib/curios/shrines";

interface ShrineRow {
  id: string;
  tenant_id: string;
  title: string;
  shrine_type: string;
  description: string | null;
  size: string;
  frame_style: string;
  contents: string;
  is_published: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export const GET: RequestHandler = async ({ platform, locals }) => {
  const db = platform?.env?.DB;
  const tenantId = locals.tenantId;

  if (!db) {
    throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
  }

  if (!tenantId) {
    throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
  }

  const result = await db
    .prepare(
      `SELECT id, title, shrine_type, description, size, frame_style, contents
       FROM shrines WHERE tenant_id = ? AND is_published = 1
       ORDER BY sort_order ASC, created_at ASC LIMIT 500`,
    )
    .bind(tenantId)
    .all<ShrineRow>();

  const shrines = result.results.map((row) => ({
    id: row.id,
    title: row.title,
    shrineType: row.shrine_type,
    description: row.description,
    size: row.size,
    frameStyle: row.frame_style,
    contents: parseContents(row.contents),
  }));

  return json(
    { shrines },
    {
      headers: {
        "Cache-Control": "public, max-age=120, stale-while-revalidate=240",
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

  const title = sanitizeTitle(body.title as string);
  if (!title) {
    throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "API");
  }

  const shrineType = body.shrineType as string;
  if (!isValidShrineType(shrineType)) {
    throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
  }

  const size = body.size as string;
  if (!isValidSize(size)) {
    throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
  }

  const frameStyle = body.frameStyle as string;
  if (!isValidFrameStyle(frameStyle)) {
    throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
  }

  const description = sanitizeDescription(body.description as string);
  const contentsJson = JSON.stringify(body.contents || []);

  if (contentsJson.length > MAX_CONTENTS_SIZE) {
    throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
  }

  const id = generateShrineId();

  // Enforce per-tenant shrine limit
  const countResult = await db
    .prepare(`SELECT COUNT(*) as count FROM shrines WHERE tenant_id = ?`)
    .bind(tenantId)
    .first<{ count: number }>();
  if ((countResult?.count ?? 0) >= MAX_SHRINES_PER_TENANT) {
    throwGroveError(400, API_ERRORS.RATE_LIMITED, "API");
  }

  try {
    const maxSort = await db
      .prepare(
        `SELECT COALESCE(MAX(sort_order), -1) as max_sort FROM shrines WHERE tenant_id = ?`,
      )
      .bind(tenantId)
      .first<{ max_sort: number }>();

    const sortOrder = (maxSort?.max_sort ?? -1) + 1;

    await db
      .prepare(
        `INSERT INTO shrines (id, tenant_id, title, shrine_type, description, size, frame_style, contents, is_published, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
      )
      .bind(
        id,
        tenantId,
        title,
        shrineType,
        description,
        size,
        frameStyle,
        contentsJson,
        sortOrder,
      )
      .run();

    return json({ success: true, id }, { status: 201 });
  } catch (error) {
    logGroveError("API", API_ERRORS.OPERATION_FAILED, {
      detail: "Shrine create failed",
      cause: error,
    });
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API");
  }
};
