/**
 * Ambient Sounds Curio API — Config
 *
 * GET  — Get ambient config (public)
 * POST — Save ambient config (admin, upsert)
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { API_ERRORS, throwGroveError, logGroveError } from "$lib/errors";
import {
  isValidSoundSet,
  isValidVolume,
  isValidUrl,
  DEFAULT_VOLUME,
} from "$lib/curios/ambient";

interface AmbientRow {
  tenant_id: string;
  sound_set: string;
  volume: number;
  enabled: number;
  custom_url: string | null;
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
    .prepare(`SELECT * FROM ambient_config WHERE tenant_id = ?`)
    .bind(tenantId)
    .first<AmbientRow>();

  if (!row) {
    return json({ config: null });
  }

  return json(
    {
      config: {
        soundSet: row.sound_set,
        volume: row.volume,
        enabled: row.enabled === 1,
        customUrl: row.custom_url,
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

  const soundSet = isValidSoundSet(body.soundSet as string)
    ? (body.soundSet as string)
    : "forest-rain";

  const volume =
    typeof body.volume === "number" && isValidVolume(body.volume)
      ? body.volume
      : DEFAULT_VOLUME;

  const enabled = body.enabled === true ? 1 : 0;

  const customUrl = (body.customUrl as string)?.trim() || null;
  if (customUrl && !isValidUrl(customUrl)) {
    throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
  }

  try {
    await db
      .prepare(
        `INSERT INTO ambient_config (tenant_id, sound_set, volume, enabled, custom_url, updated_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'))
         ON CONFLICT(tenant_id) DO UPDATE SET
           sound_set = excluded.sound_set,
           volume = excluded.volume,
           enabled = excluded.enabled,
           custom_url = excluded.custom_url,
           updated_at = datetime('now')`,
      )
      .bind(tenantId, soundSet, volume, enabled, customUrl)
      .run();

    return json({ success: true });
  } catch (error) {
    logGroveError("API", API_ERRORS.OPERATION_FAILED, {
      detail: "Ambient config save failed",
      cause: error,
    });
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API");
  }
};
