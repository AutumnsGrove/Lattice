import type { PageServerLoad, Actions } from "./$types";
import { fail } from "@sveltejs/kit";
import { ARBOR_ERRORS, logGroveError } from "$lib/errors";
import {
  generateBadgeId,
  isValidBadgeType,
  isValidBadgePosition,
  sanitizeCustomText,
  BADGE_DEFINITIONS,
  BADGE_POSITION_OPTIONS,
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

function rowToRecord(row: BadgeRow): StatusBadgeRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    badgeType: row.badge_type as StatusBadgeRecord["badgeType"],
    position: row.position as StatusBadgeRecord["position"],
    animated: Boolean(row.animated),
    customText: row.custom_text,
    showDate: Boolean(row.show_date),
    createdAt: row.created_at,
  };
}

export const load: PageServerLoad = async ({ platform, locals }) => {
  const db = platform?.env?.DB;
  const tenantId = locals.tenantId;

  if (!db || !tenantId) {
    return {
      badges: [],
      badgeDefinitions: BADGE_DEFINITIONS,
      positionOptions: BADGE_POSITION_OPTIONS,
      error: "Database not available",
    };
  }

  const result = await db
    .prepare(
      `SELECT id, tenant_id, badge_type, position, animated, custom_text, show_date, created_at
       FROM status_badges
       WHERE tenant_id = ?
       ORDER BY created_at DESC`,
    )
    .bind(tenantId)
    .all<BadgeRow>()
    .catch(() => ({ results: [] as BadgeRow[] }));

  const badges = result.results.map(rowToRecord);

  return {
    badges,
    badgeDefinitions: BADGE_DEFINITIONS,
    positionOptions: BADGE_POSITION_OPTIONS,
  };
};

export const actions: Actions = {
  add: async ({ request, platform, locals }) => {
    const db = platform?.env?.DB;
    const tenantId = locals.tenantId;

    if (!db || !tenantId) {
      return fail(500, {
        error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
        error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
      });
    }

    const formData = await request.formData();
    const badgeType = formData.get("badgeType") as string;
    const position = (formData.get("position") as string) || "floating";
    const animated = formData.get("animated") !== "false";
    const customText = sanitizeCustomText(
      formData.get("customText") as string | null,
    );
    const showDate = formData.get("showDate") === "true";

    if (!isValidBadgeType(badgeType)) {
      return fail(400, {
        error: "Invalid badge type",
        error_code: "INVALID_BADGE_TYPE",
      });
    }

    if (!isValidBadgePosition(position)) {
      return fail(400, {
        error: "Invalid badge position",
        error_code: "INVALID_BADGE_POSITION",
      });
    }

    const id = generateBadgeId();

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

      return { success: true };
    } catch (error) {
      logGroveError("Arbor", ARBOR_ERRORS.SAVE_FAILED, { cause: error });
      return fail(500, {
        error: ARBOR_ERRORS.SAVE_FAILED.userMessage,
        error_code: ARBOR_ERRORS.SAVE_FAILED.code,
      });
    }
  },

  update: async ({ request, platform, locals }) => {
    const db = platform?.env?.DB;
    const tenantId = locals.tenantId;

    if (!db || !tenantId) {
      return fail(500, {
        error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
        error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
      });
    }

    const formData = await request.formData();
    const id = formData.get("id") as string;
    const position = (formData.get("position") as string) || "floating";
    const animated = formData.get("animated") !== "false";
    const customText = sanitizeCustomText(
      formData.get("customText") as string | null,
    );
    const showDate = formData.get("showDate") === "true";

    if (!id) {
      return fail(400, {
        error: "Badge ID required",
        error_code: "MISSING_ID",
      });
    }

    if (!isValidBadgePosition(position)) {
      return fail(400, {
        error: "Invalid badge position",
        error_code: "INVALID_BADGE_POSITION",
      });
    }

    try {
      await db
        .prepare(
          `UPDATE status_badges
           SET position = ?, animated = ?, custom_text = ?, show_date = ?
           WHERE id = ? AND tenant_id = ?`,
        )
        .bind(
          position,
          animated ? 1 : 0,
          customText,
          showDate ? 1 : 0,
          id,
          tenantId,
        )
        .run();

      return { success: true, updated: true };
    } catch (error) {
      logGroveError("Arbor", ARBOR_ERRORS.SAVE_FAILED, { cause: error });
      return fail(500, {
        error: ARBOR_ERRORS.SAVE_FAILED.userMessage,
        error_code: ARBOR_ERRORS.SAVE_FAILED.code,
      });
    }
  },

  remove: async ({ request, platform, locals }) => {
    const db = platform?.env?.DB;
    const tenantId = locals.tenantId;

    if (!db || !tenantId) {
      return fail(500, {
        error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
        error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
      });
    }

    const formData = await request.formData();
    const id = formData.get("id") as string;

    if (!id) {
      return fail(400, {
        error: "Badge ID required",
        error_code: "MISSING_ID",
      });
    }

    try {
      await db
        .prepare(`DELETE FROM status_badges WHERE id = ? AND tenant_id = ?`)
        .bind(id, tenantId)
        .run();

      return { success: true, removed: true };
    } catch (error) {
      logGroveError("Arbor", ARBOR_ERRORS.OPERATION_FAILED, { cause: error });
      return fail(500, {
        error: ARBOR_ERRORS.OPERATION_FAILED.userMessage,
        error_code: ARBOR_ERRORS.OPERATION_FAILED.code,
      });
    }
  },
};
