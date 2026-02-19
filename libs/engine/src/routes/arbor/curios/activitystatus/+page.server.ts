import type { PageServerLoad, Actions } from "./$types";
import { fail } from "@sveltejs/kit";
import { ARBOR_ERRORS, logGroveError } from "$lib/errors";
import {
  sanitizeStatusText,
  sanitizeStatusEmoji,
  calculateExpiration,
  getPreset,
  STATUS_PRESETS,
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

export const load: PageServerLoad = async ({ platform, locals }) => {
  const db = platform?.env?.DB;
  const tenantId = locals.tenantId;

  if (!db || !tenantId) {
    return {
      currentStatus: null,
      presets: STATUS_PRESETS,
      error: "Database not available",
    };
  }

  const row = await db
    .prepare(
      `SELECT tenant_id, status_text, status_emoji, status_type, preset, auto_source, expires_at, updated_at
       FROM activity_status
       WHERE tenant_id = ?`,
    )
    .bind(tenantId)
    .first<StatusRow>()
    .catch(() => null);

  return {
    currentStatus: row ? rowToRecord(row) : null,
    presets: STATUS_PRESETS,
  };
};

export const actions: Actions = {
  set: async ({ request, platform, locals }) => {
    const db = platform?.env?.DB;
    const tenantId = locals.tenantId;

    if (!db || !tenantId) {
      return fail(500, {
        error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
        error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
      });
    }

    const formData = await request.formData();
    const presetId = formData.get("preset") as string | null;
    const customText = formData.get("statusText") as string | null;
    const customEmoji = formData.get("statusEmoji") as string | null;
    const expiresInHours = formData.get("expiresInHours") as string | null;

    let statusText: string | null = null;
    let statusEmoji: string | null = null;
    let statusType = "manual";
    let preset: string | null = null;

    if (presetId) {
      const presetDef = getPreset(presetId);
      if (presetDef) {
        statusText = presetDef.text;
        statusEmoji = presetDef.emoji;
        statusType = "preset";
        preset = presetDef.id;
      } else {
        return fail(400, {
          error: "Invalid preset",
          error_code: "INVALID_PRESET",
        });
      }
    } else {
      statusText = sanitizeStatusText(customText);
      statusEmoji = sanitizeStatusEmoji(customEmoji);

      if (!statusText && !statusEmoji) {
        return fail(400, {
          error: "Status text or emoji required",
          error_code: "MISSING_STATUS",
        });
      }
    }

    const hours = expiresInHours ? parseFloat(expiresInHours) : null;
    const expiresAt = calculateExpiration(
      hours && !isNaN(hours) ? hours : null,
    );

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
        .bind(tenantId, statusText, statusEmoji, statusType, preset, expiresAt)
        .run();

      return { success: true };
    } catch (error) {
      logGroveError("Arbor", ARBOR_ERRORS.SAVE_FAILED, { cause: error });
      return fail(500, {
        error: ARBOR_ERRORS.SAVE_FAILED.userMessage,
        error_code: ARBOR_ERRORS.SAVE_FAILED.code,
      });
    }
  },

  clear: async ({ platform, locals }) => {
    const db = platform?.env?.DB;
    const tenantId = locals.tenantId;

    if (!db || !tenantId) {
      return fail(500, {
        error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
        error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
      });
    }

    try {
      await db
        .prepare(`DELETE FROM activity_status WHERE tenant_id = ?`)
        .bind(tenantId)
        .run();

      return { success: true, cleared: true };
    } catch (error) {
      logGroveError("Arbor", ARBOR_ERRORS.OPERATION_FAILED, { cause: error });
      return fail(500, {
        error: ARBOR_ERRORS.OPERATION_FAILED.userMessage,
        error_code: ARBOR_ERRORS.OPERATION_FAILED.code,
      });
    }
  },
};
