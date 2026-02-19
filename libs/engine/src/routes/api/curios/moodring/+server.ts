/**
 * Mood Ring Curio API — Config
 *
 * GET  — Get mood ring config + current color (public)
 * POST — Save mood ring config (admin, upsert)
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { API_ERRORS, throwGroveError, logGroveError } from "$lib/errors";
import {
  isValidMode,
  isValidDisplayStyle,
  isValidColorScheme,
  isValidHexColor,
  sanitizeMoodText,
  getTimeColor,
  getSeasonalColor,
  getRandomColor,
} from "$lib/curios/moodring";

interface MoodRingRow {
  tenant_id: string;
  mode: string;
  manual_mood: string | null;
  manual_color: string | null;
  color_scheme: string;
  display_style: string;
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
    .prepare(`SELECT * FROM mood_ring_config WHERE tenant_id = ?`)
    .bind(tenantId)
    .first<MoodRingRow>();

  if (!row) {
    const timeColor = getTimeColor();
    return json({
      config: {
        mode: "time",
        manualMood: null,
        manualColor: null,
        colorScheme: "default",
        displayStyle: "ring",
        currentColor: timeColor.color,
        currentMoodName: timeColor.name,
      },
    });
  }

  let currentColor: string;
  let currentMoodName: string;

  switch (row.mode) {
    case "manual":
      currentColor = row.manual_color || "#7cb85c";
      currentMoodName = row.manual_mood || "Custom";
      break;
    case "seasonal": {
      const s = getSeasonalColor();
      currentColor = s.color;
      currentMoodName = s.name;
      break;
    }
    case "random":
      currentColor = getRandomColor(tenantId);
      currentMoodName = "Shifting";
      break;
    default: {
      const t = getTimeColor();
      currentColor = t.color;
      currentMoodName = t.name;
    }
  }

  return json(
    {
      config: {
        mode: row.mode,
        manualMood: row.manual_mood,
        manualColor: row.manual_color,
        colorScheme: row.color_scheme,
        displayStyle: row.display_style,
        currentColor,
        currentMoodName,
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

  const mode = isValidMode(body.mode as string)
    ? (body.mode as string)
    : "time";

  const displayStyle = isValidDisplayStyle(body.displayStyle as string)
    ? (body.displayStyle as string)
    : "ring";

  const colorScheme = isValidColorScheme(body.colorScheme as string)
    ? (body.colorScheme as string)
    : "default";

  const manualMood = sanitizeMoodText(body.manualMood as string);
  const manualColor =
    typeof body.manualColor === "string" && isValidHexColor(body.manualColor)
      ? body.manualColor
      : null;

  try {
    await db
      .prepare(
        `INSERT INTO mood_ring_config (tenant_id, mode, manual_mood, manual_color, color_scheme, display_style, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
         ON CONFLICT(tenant_id) DO UPDATE SET
           mode = excluded.mode,
           manual_mood = excluded.manual_mood,
           manual_color = excluded.manual_color,
           color_scheme = excluded.color_scheme,
           display_style = excluded.display_style,
           updated_at = datetime('now')`,
      )
      .bind(tenantId, mode, manualMood, manualColor, colorScheme, displayStyle)
      .run();

    return json({ success: true });
  } catch (error) {
    logGroveError("API", API_ERRORS.OPERATION_FAILED, {
      detail: "Mood ring config save failed",
      cause: error,
    });
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API");
  }
};
