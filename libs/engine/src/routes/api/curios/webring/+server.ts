/**
 * Webring Hub Curio API — List & Create
 *
 * GET  — Get all webring memberships (public)
 * POST — Add a webring membership (admin)
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { API_ERRORS, throwGroveError, logGroveError } from "$lib/errors";
import {
  generateWebringId,
  isValidBadgeStyle,
  isValidPosition,
  isValidUrl,
  sanitizeRingName,
  MAX_URL_LENGTH,
  MAX_WEBRING_ENTRIES_PER_TENANT,
  type WebringRecord,
} from "$lib/curios/webring";

interface WebringRow {
  id: string;
  tenant_id: string;
  ring_name: string;
  ring_url: string | null;
  prev_url: string;
  next_url: string;
  home_url: string | null;
  badge_style: string;
  position: string;
  sort_order: number;
  joined_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET — Get all webring memberships (public)
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

  const result = await db
    .prepare(
      `SELECT id, tenant_id, ring_name, ring_url, prev_url, next_url, home_url, badge_style, position, sort_order, joined_at
       FROM webring_memberships WHERE tenant_id = ?
       ORDER BY sort_order ASC, joined_at ASC LIMIT 500`,
    )
    .bind(tenantId)
    .all<WebringRow>();

  const webrings = result.results.map((row) => ({
    id: row.id,
    ringName: row.ring_name,
    ringUrl: row.ring_url,
    prevUrl: row.prev_url,
    nextUrl: row.next_url,
    homeUrl: row.home_url,
    badgeStyle: row.badge_style,
    position: row.position,
  }));

  return json(
    { webrings },
    {
      headers: {
        "Cache-Control": "public, max-age=60, stale-while-revalidate=120",
      },
    },
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// POST — Add a webring membership (admin)
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

  const ringName = sanitizeRingName(body.ringName as string);
  if (!ringName) {
    throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "API");
  }

  const prevUrl = (body.prevUrl as string)?.trim();
  const nextUrl = (body.nextUrl as string)?.trim();

  if (!prevUrl || !nextUrl) {
    throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "API");
  }

  if (!isValidUrl(prevUrl) || !isValidUrl(nextUrl)) {
    throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
  }

  if (prevUrl.length > MAX_URL_LENGTH || nextUrl.length > MAX_URL_LENGTH) {
    throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
  }

  const ringUrl = (body.ringUrl as string)?.trim() || null;
  if (ringUrl && (!isValidUrl(ringUrl) || ringUrl.length > MAX_URL_LENGTH)) {
    throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
  }

  const homeUrl = (body.homeUrl as string)?.trim() || null;
  if (homeUrl && (!isValidUrl(homeUrl) || homeUrl.length > MAX_URL_LENGTH)) {
    throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
  }

  const badgeStyle = isValidBadgeStyle(body.badgeStyle as string)
    ? (body.badgeStyle as string)
    : "classic";

  const position = isValidPosition(body.position as string)
    ? (body.position as string)
    : "footer";

  const id = generateWebringId();

  // Enforce per-tenant webring limit
  const countResult = await db
    .prepare(
      `SELECT COUNT(*) as count FROM webring_memberships WHERE tenant_id = ?`,
    )
    .bind(tenantId)
    .first<{ count: number }>();
  if ((countResult?.count ?? 0) >= MAX_WEBRING_ENTRIES_PER_TENANT) {
    throwGroveError(400, API_ERRORS.RATE_LIMITED, "API");
  }

  try {
    // Get next sort order
    const maxSort = await db
      .prepare(
        `SELECT COALESCE(MAX(sort_order), -1) as max_sort FROM webring_memberships WHERE tenant_id = ?`,
      )
      .bind(tenantId)
      .first<{ max_sort: number }>();

    const sortOrder = (maxSort?.max_sort ?? -1) + 1;

    await db
      .prepare(
        `INSERT INTO webring_memberships (id, tenant_id, ring_name, ring_url, prev_url, next_url, home_url, badge_style, position, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        tenantId,
        ringName,
        ringUrl,
        prevUrl,
        nextUrl,
        homeUrl,
        badgeStyle,
        position,
        sortOrder,
      )
      .run();

    return json({ success: true, id }, { status: 201 });
  } catch (error) {
    logGroveError("API", API_ERRORS.OPERATION_FAILED, {
      detail: "Webring create failed",
      cause: error,
    });
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API");
  }
};
