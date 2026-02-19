/**
 * Activity Status Curio API
 *
 * GET    — Fetch current status (public)
 * POST   — Set status (admin)
 * DELETE — Clear status (admin)
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { API_ERRORS, throwGroveError, logGroveError } from "$lib/errors";
import {
  getPreset,
  sanitizeStatusText,
  sanitizeStatusEmoji,
  calculateExpiration,
  toDisplayStatus,
  isValidStatusType,
  type ActivityStatusRecord,
} from "$lib/curios/activitystatus";

interface StatusRow {
  tenant_id: string;
  status_text: string | null;
  status_emoji: string | null;
  status_type: string;
  preset: string | null;
  auto_source: string | null;
  expires_at: string | null;
  updated_at: string;
}

function rowToRecord(row: StatusRow): ActivityStatusRecord {
  return {
    tenantId: row.tenant_id,
    statusText: row.status_text,
    statusEmoji: row.status_emoji,
    statusType: row.status_type as ActivityStatusRecord["statusType"],
    preset: row.preset,
    autoSource: row.auto_source,
    expiresAt: row.expires_at,
    updatedAt: row.updated_at,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET — Fetch current status (public)
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
    const row = await db
      .prepare(
        `SELECT tenant_id, status_text, status_emoji, status_type, preset, auto_source, expires_at, updated_at
         FROM activity_status
         WHERE tenant_id = ?`,
      )
      .bind(tenantId)
      .first<StatusRow>();

    if (!row) {
      return json(
        { status: null },
        {
          headers: {
            "Cache-Control": "public, max-age=60, stale-while-revalidate=120",
          },
        },
      );
    }

    const record = rowToRecord(row);
    const display = toDisplayStatus(record);

    // If expired, return null status
    if (display.isExpired) {
      return json(
        { status: null },
        {
          headers: {
            "Cache-Control": "public, max-age=60, stale-while-revalidate=120",
          },
        },
      );
    }

    return json(
      { status: display },
      {
        headers: {
          "Cache-Control": "public, max-age=60, stale-while-revalidate=120",
        },
      },
    );
  } catch (err) {
    logGroveError("API", API_ERRORS.OPERATION_FAILED, {
      detail: "Activity status fetch failed",
      cause: err,
    });
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST — Set status (admin)
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

  let statusText: string | null = null;
  let statusEmoji: string | null = null;
  let statusType: string = "manual";
  let presetId: string | null = null;

  // Handle preset vs custom
  if (body.preset && typeof body.preset === "string") {
    const preset = getPreset(body.preset);
    if (preset) {
      statusText = preset.text;
      statusEmoji = preset.emoji;
      statusType = "preset";
      presetId = preset.id;
    } else {
      throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
    }
  } else {
    // Custom status
    statusText = sanitizeStatusText(body.statusText as string | null);
    statusEmoji = sanitizeStatusEmoji(body.statusEmoji as string | null);
    statusType = "manual";

    if (!statusText && !statusEmoji) {
      throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "API");
    }
  }

  if (!isValidStatusType(statusType)) {
    throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
  }

  // Handle expiration
  const expirationHours =
    typeof body.expiresInHours === "number" ? body.expiresInHours : null;
  const expiresAt = calculateExpiration(expirationHours);

  try {
    await db
      .prepare(
        `INSERT INTO activity_status (tenant_id, status_text, status_emoji, status_type, preset, expires_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
         ON CONFLICT(tenant_id) DO UPDATE SET
           status_text = excluded.status_text,
           status_emoji = excluded.status_emoji,
           status_type = excluded.status_type,
           preset = excluded.preset,
           expires_at = excluded.expires_at,
           updated_at = datetime('now')`,
      )
      .bind(tenantId, statusText, statusEmoji, statusType, presetId, expiresAt)
      .run();
  } catch (err) {
    logGroveError("API", API_ERRORS.OPERATION_FAILED, {
      detail: "Activity status set failed",
      cause: err,
    });
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API");
  }

  return json(
    {
      success: true,
      status: { text: statusText, emoji: statusEmoji, type: statusType },
    },
    { status: 200 },
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE — Clear status (admin)
// ─────────────────────────────────────────────────────────────────────────────

export const DELETE: RequestHandler = async ({ platform, locals }) => {
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

  try {
    await db
      .prepare(`DELETE FROM activity_status WHERE tenant_id = ?`)
      .bind(tenantId)
      .run();
  } catch (err) {
    logGroveError("API", API_ERRORS.OPERATION_FAILED, {
      detail: "Activity status clear failed",
      cause: err,
    });
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API");
  }

  return json({ success: true });
};
