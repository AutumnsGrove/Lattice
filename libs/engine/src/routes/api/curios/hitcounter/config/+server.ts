/**
 * Hit Counter Curio API — Config (Admin)
 *
 * GET  — Fetch hit counter config
 * POST — Update hit counter config
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { API_ERRORS, throwGroveError, logGroveError } from "$lib/errors";
import {
  generateHitCounterId,
  sanitizeLabel,
  DEFAULT_HIT_COUNTER_CONFIG,
} from "$lib/curios/hitcounter";

interface CounterRow {
  id: string;
  page_path: string;
  count: number;
  style: string;
  label: string;
  show_since_date: number;
  started_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET — Fetch config
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

  if (!locals.user) {
    throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
  }

  const counter = await db
    .prepare(
      `SELECT id, page_path, count, style, label, show_since_date, started_at, updated_at
       FROM hit_counters
       WHERE tenant_id = ? AND page_path = '/'`,
    )
    .bind(tenantId)
    .first<CounterRow>();

  if (!counter) {
    return json({
      config: {
        ...DEFAULT_HIT_COUNTER_CONFIG,
        startedAt: new Date().toISOString(),
      },
    });
  }

  return json({
    config: {
      pagePath: counter.page_path,
      count: counter.count,
      style: counter.style,
      label: counter.label,
      showSinceDate: Boolean(counter.show_since_date),
      startedAt: counter.started_at,
      updatedAt: counter.updated_at,
    },
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// POST — Update config
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

  // Validate style
  const validStyles = ["classic", "odometer", "minimal", "lcd"];
  const style = validStyles.includes(body.style as string)
    ? (body.style as string)
    : DEFAULT_HIT_COUNTER_CONFIG.style;

  const label = sanitizeLabel(body.label as string);
  const showSinceDate =
    typeof body.showSinceDate === "boolean" ? body.showSinceDate : true;

  try {
    await db
      .prepare(
        `INSERT INTO hit_counters (id, tenant_id, page_path, count, style, label, show_since_date, updated_at)
         VALUES (?, ?, '/', 0, ?, ?, ?, datetime('now'))
         ON CONFLICT(tenant_id, page_path) DO UPDATE SET
           style = excluded.style,
           label = excluded.label,
           show_since_date = excluded.show_since_date,
           updated_at = datetime('now')`,
      )
      .bind(
        generateHitCounterId(),
        tenantId,
        style,
        label,
        showSinceDate ? 1 : 0,
      )
      .run();
  } catch (err) {
    logGroveError("API", API_ERRORS.OPERATION_FAILED, {
      detail: "Hit counter config save failed",
      cause: err,
    });
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API");
  }

  return json({ success: true });
};
