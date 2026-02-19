/**
 * Custom Cursors Curio API — Config
 *
 * GET  — Get cursor config (public)
 * POST — Save cursor config (admin, upsert)
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { API_ERRORS, throwGroveError, logGroveError } from "$lib/errors";
import {
  isValidPreset,
  isValidTrailEffect,
  isValidTrailLength,
  isValidCursorUrl,
  DEFAULT_TRAIL_LENGTH,
} from "$lib/curios/cursors";

interface CursorRow {
  tenant_id: string;
  cursor_type: string;
  preset: string | null;
  custom_url: string | null;
  trail_enabled: number;
  trail_effect: string;
  trail_length: number;
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

  const row = await db
    .prepare(`SELECT * FROM cursor_config WHERE tenant_id = ?`)
    .bind(tenantId)
    .first<CursorRow>();

  if (!row) {
    return json({ config: null });
  }

  return json(
    {
      config: {
        cursorType: row.cursor_type,
        preset: row.preset,
        customUrl: row.custom_url,
        trailEnabled: row.trail_enabled === 1,
        trailEffect: row.trail_effect,
      },
    },
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

  const cursorType = body.cursorType === "custom" ? "custom" : "preset";

  const preset = body.preset as string | undefined;
  if (cursorType === "preset" && preset && !isValidPreset(preset)) {
    throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
  }

  const customUrl = (body.customUrl as string)?.trim() || null;
  if (cursorType === "custom" && customUrl && !isValidCursorUrl(customUrl)) {
    throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
  }

  const trailEnabled = body.trailEnabled === true ? 1 : 0;
  const trailEffect = isValidTrailEffect(body.trailEffect as string)
    ? (body.trailEffect as string)
    : "sparkle";

  const trailLength =
    typeof body.trailLength === "number" && isValidTrailLength(body.trailLength)
      ? body.trailLength
      : DEFAULT_TRAIL_LENGTH;

  try {
    await db
      .prepare(
        `INSERT INTO cursor_config (tenant_id, cursor_type, preset, custom_url, trail_enabled, trail_effect, trail_length, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
         ON CONFLICT(tenant_id) DO UPDATE SET
           cursor_type = excluded.cursor_type,
           preset = excluded.preset,
           custom_url = excluded.custom_url,
           trail_enabled = excluded.trail_enabled,
           trail_effect = excluded.trail_effect,
           trail_length = excluded.trail_length,
           updated_at = datetime('now')`,
      )
      .bind(
        tenantId,
        cursorType,
        preset || "leaf",
        customUrl,
        trailEnabled,
        trailEffect,
        trailLength,
      )
      .run();

    return json({ success: true });
  } catch (error) {
    logGroveError("API", API_ERRORS.OPERATION_FAILED, {
      detail: "Cursor config save failed",
      cause: error,
    });
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API");
  }
};
