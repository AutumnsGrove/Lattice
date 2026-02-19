/**
 * Status Badges Curio API — Public + Admin Endpoints
 *
 * GET  — Fetch active badges (public, cached)
 * POST — Add a new badge (admin)
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { API_ERRORS, throwGroveError, logGroveError } from "$lib/errors";
import {
  generateBadgeId,
  isValidBadgeType,
  isValidBadgePosition,
  sanitizeCustomText,
  toDisplayBadge,
  MAX_STATUS_BADGES_PER_TENANT,
  type StatusBadgeRecord,
} from "$lib/curios/statusbadge";

interface BadgeRow {
  id: string;
  tenant_id: string;
  badge_type: string;
  position: string;
  animated: number;
  custom_text: string | null;
  show_date: number;
  created_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET — Fetch active badges (public)
// ─────────────────────────────────────────────────────────────────────────────

export const GET: RequestHandler = async ({ platform, locals }) => {
  const db = platform?.env?.DB;
  const tenantId = locals.tenantId;

  if (!db) {
    throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
  }

  if (!tenantId) {
    throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
  }

  try {
    const result = await db
      .prepare(
        `SELECT id, tenant_id, badge_type, position, animated, custom_text, show_date, created_at
         FROM status_badges
         WHERE tenant_id = ?
         ORDER BY created_at DESC LIMIT 500`,
      )
      .bind(tenantId)
      .all<BadgeRow>();

    const badges = result.results.map((row) => {
      const record: StatusBadgeRecord = {
        id: row.id,
        tenantId: row.tenant_id,
        badgeType: row.badge_type as StatusBadgeRecord["badgeType"],
        position: row.position as StatusBadgeRecord["position"],
        animated: Boolean(row.animated),
        customText: row.custom_text,
        showDate: Boolean(row.show_date),
        createdAt: row.created_at,
      };
      return toDisplayBadge(record);
    });

    return json(
      { badges },
      {
        headers: {
          "Cache-Control": "public, max-age=60, stale-while-revalidate=120",
        },
      },
    );
  } catch (err) {
    logGroveError("API", API_ERRORS.OPERATION_FAILED, {
      detail: "Status badges fetch failed",
      cause: err,
    });
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST — Add a new badge (admin)
// ─────────────────────────────────────────────────────────────────────────────

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

  // Validate badge type
  const badgeType = String(body.badgeType ?? "");
  if (!isValidBadgeType(badgeType)) {
    throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
  }

  // Validate position
  const position = String(body.position ?? "floating");
  if (!isValidBadgePosition(position)) {
    throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
  }

  const animated = typeof body.animated === "boolean" ? body.animated : true;
  const customText = sanitizeCustomText(body.customText as string | null);
  const showDate = typeof body.showDate === "boolean" ? body.showDate : false;

  const id = generateBadgeId();

  // Enforce per-tenant badge limit
  const countResult = await db
    .prepare(`SELECT COUNT(*) as count FROM status_badges WHERE tenant_id = ?`)
    .bind(tenantId)
    .first<{ count: number }>();
  if ((countResult?.count ?? 0) >= MAX_STATUS_BADGES_PER_TENANT) {
    throwGroveError(400, API_ERRORS.RATE_LIMITED, "API");
  }

  try {
    await db
      .prepare(
        `INSERT INTO status_badges (id, tenant_id, badge_type, position, animated, custom_text, show_date)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        tenantId,
        badgeType,
        position,
        animated ? 1 : 0,
        customText,
        showDate ? 1 : 0,
      )
      .run();
  } catch (err) {
    logGroveError("API", API_ERRORS.OPERATION_FAILED, {
      detail: "Status badge insert failed",
      cause: err,
    });
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API");
  }

  return json(
    {
      success: true,
      badge: { id, badgeType, position, animated, customText, showDate },
    },
    { status: 201 },
  );
};
