/**
 * Now Playing Config API (Admin)
 *
 * GET  — Fetch config
 * POST — Update config
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { API_ERRORS, throwGroveError, logGroveError } from "$lib/errors";
import {
  isValidDisplayStyle,
  isValidProvider,
  sanitizeFallbackText,
  sanitizeLastFmUsername,
} from "$lib/curios/nowplaying";

interface ConfigRow {
  tenant_id: string;
  provider: string;
  display_style: string;
  show_album_art: number;
  show_progress: number;
  fallback_text: string | null;
  last_fm_username: string | null;
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

  const config = await db
    .prepare(
      `SELECT tenant_id, provider, display_style, show_album_art, show_progress, fallback_text, last_fm_username, updated_at
       FROM nowplaying_config WHERE tenant_id = ?`,
    )
    .bind(tenantId)
    .first<ConfigRow>();

  if (!config) {
    return json({
      config: {
        provider: "manual",
        displayStyle: "compact",
        showAlbumArt: true,
        showProgress: false,
        fallbackText: null,
        lastFmUsername: null,
      },
    });
  }

  return json({
    config: {
      provider: config.provider,
      displayStyle: config.display_style,
      showAlbumArt: Boolean(config.show_album_art),
      showProgress: Boolean(config.show_progress),
      fallbackText: config.fallback_text,
      lastFmUsername: config.last_fm_username,
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

  const provider = isValidProvider(String(body.provider ?? "manual"))
    ? String(body.provider)
    : "manual";
  const displayStyle = isValidDisplayStyle(
    String(body.displayStyle ?? "compact"),
  )
    ? String(body.displayStyle)
    : "compact";
  const showAlbumArt =
    typeof body.showAlbumArt === "boolean" ? body.showAlbumArt : true;
  const showProgress =
    typeof body.showProgress === "boolean" ? body.showProgress : false;
  const fallbackText = sanitizeFallbackText(body.fallbackText as string | null);
  const lastFmUsername = sanitizeLastFmUsername(
    body.lastFmUsername as string | null,
  );

  try {
    await db
      .prepare(
        `INSERT INTO nowplaying_config (tenant_id, provider, display_style, show_album_art, show_progress, fallback_text, last_fm_username, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
         ON CONFLICT(tenant_id) DO UPDATE SET
           provider = excluded.provider,
           display_style = excluded.display_style,
           show_album_art = excluded.show_album_art,
           show_progress = excluded.show_progress,
           fallback_text = excluded.fallback_text,
           last_fm_username = excluded.last_fm_username,
           updated_at = datetime('now')`,
      )
      .bind(
        tenantId,
        provider,
        displayStyle,
        showAlbumArt ? 1 : 0,
        showProgress ? 1 : 0,
        fallbackText,
        lastFmUsername,
      )
      .run();
  } catch (err) {
    logGroveError("API", API_ERRORS.OPERATION_FAILED, {
      detail: "Now playing config save failed",
      cause: err,
    });
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API");
  }

  return json({ success: true });
};
