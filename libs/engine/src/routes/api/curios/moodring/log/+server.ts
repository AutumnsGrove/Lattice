/**
 * Mood Ring Log API
 *
 * GET  — Get mood log entries (public)
 * POST — Add a mood log entry (admin)
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { API_ERRORS, throwGroveError, logGroveError } from "$lib/errors";
import {
  generateMoodLogId,
  isValidHexColor,
  sanitizeMoodText,
  sanitizeNote,
  MAX_LOG_ENTRIES,
} from "$lib/curios/moodring";

interface MoodLogRow {
  id: string;
  tenant_id: string;
  mood: string;
  color: string;
  note: string | null;
  logged_at: string;
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
      `SELECT mood, color, note, logged_at FROM mood_ring_log
       WHERE tenant_id = ? ORDER BY logged_at DESC LIMIT 90`,
    )
    .bind(tenantId)
    .all<MoodLogRow>();

  return json(
    { entries: result.results },
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

  const mood = sanitizeMoodText(body.mood as string);
  if (!mood) {
    throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "API");
  }

  const color =
    typeof body.color === "string" && isValidHexColor(body.color)
      ? body.color
      : "#7cb85c";

  const note = sanitizeNote(body.note as string);
  const id = generateMoodLogId();

  try {
    await db
      .prepare(
        `INSERT INTO mood_ring_log (id, tenant_id, mood, color, note) VALUES (?, ?, ?, ?, ?)`,
      )
      .bind(id, tenantId, mood, color, note)
      .run();

    // Prune old entries
    await db
      .prepare(
        `DELETE FROM mood_ring_log WHERE tenant_id = ? AND id NOT IN (
           SELECT id FROM mood_ring_log WHERE tenant_id = ? ORDER BY logged_at DESC LIMIT ?
         )`,
      )
      .bind(tenantId, tenantId, MAX_LOG_ENTRIES)
      .run();

    return json({ success: true, id }, { status: 201 });
  } catch (error) {
    logGroveError("API", API_ERRORS.OPERATION_FAILED, {
      detail: "Mood log entry failed",
      cause: error,
    });
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API");
  }
};
