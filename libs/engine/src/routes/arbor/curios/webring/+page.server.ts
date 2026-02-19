import type { PageServerLoad, Actions } from "./$types";
import { fail } from "@sveltejs/kit";
import { ARBOR_ERRORS, logGroveError } from "$lib/errors";
import {
  generateWebringId,
  isValidBadgeStyle,
  isValidPosition,
  isValidUrl,
  sanitizeRingName,
  BADGE_STYLE_OPTIONS,
  POSITION_OPTIONS,
  MAX_URL_LENGTH,
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

export const load: PageServerLoad = async ({ platform, locals }) => {
  const db = platform?.env?.DB;
  const tenantId = locals.tenantId;

  if (!db || !tenantId) {
    return {
      webrings: [],
      badgeStyleOptions: BADGE_STYLE_OPTIONS,
      positionOptions: POSITION_OPTIONS,
      error: "Database not available",
    };
  }

  const result = await db
    .prepare(
      `SELECT id, tenant_id, ring_name, ring_url, prev_url, next_url, home_url, badge_style, position, sort_order, joined_at
       FROM webring_memberships WHERE tenant_id = ?
       ORDER BY sort_order ASC, joined_at ASC`,
    )
    .bind(tenantId)
    .all<WebringRow>()
    .catch(() => ({ results: [] as WebringRow[] }));

  const webrings: WebringRecord[] = result.results.map((row) => ({
    id: row.id,
    tenantId: row.tenant_id,
    ringName: row.ring_name,
    ringUrl: row.ring_url,
    prevUrl: row.prev_url,
    nextUrl: row.next_url,
    homeUrl: row.home_url,
    badgeStyle: row.badge_style as WebringRecord["badgeStyle"],
    position: row.position as WebringRecord["position"],
    sortOrder: row.sort_order,
    joinedAt: row.joined_at,
  }));

  return {
    webrings,
    badgeStyleOptions: BADGE_STYLE_OPTIONS,
    positionOptions: POSITION_OPTIONS,
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
    const ringName = sanitizeRingName(
      formData.get("ringName") as string | null,
    );

    if (!ringName) {
      return fail(400, {
        error: "Ring name is required",
        error_code: "MISSING_RING_NAME",
      });
    }

    const prevUrl = (formData.get("prevUrl") as string)?.trim();
    const nextUrl = (formData.get("nextUrl") as string)?.trim();

    if (!prevUrl || !nextUrl) {
      return fail(400, {
        error: "Previous and next URLs are required",
        error_code: "MISSING_URLS",
      });
    }

    if (!isValidUrl(prevUrl) || !isValidUrl(nextUrl)) {
      return fail(400, {
        error: "URLs must be valid http or https addresses",
        error_code: "INVALID_URLS",
      });
    }

    if (prevUrl.length > MAX_URL_LENGTH || nextUrl.length > MAX_URL_LENGTH) {
      return fail(400, {
        error: "URLs are too long",
        error_code: "URL_TOO_LONG",
      });
    }

    const ringUrl = (formData.get("ringUrl") as string)?.trim() || null;
    if (ringUrl && (!isValidUrl(ringUrl) || ringUrl.length > MAX_URL_LENGTH)) {
      return fail(400, {
        error: "Ring URL must be a valid http or https address",
        error_code: "INVALID_RING_URL",
      });
    }

    const homeUrl = (formData.get("homeUrl") as string)?.trim() || null;
    if (homeUrl && (!isValidUrl(homeUrl) || homeUrl.length > MAX_URL_LENGTH)) {
      return fail(400, {
        error: "Home URL must be a valid http or https address",
        error_code: "INVALID_HOME_URL",
      });
    }

    const badgeStyleRaw = formData.get("badgeStyle") as string;
    const badgeStyle = isValidBadgeStyle(badgeStyleRaw)
      ? badgeStyleRaw
      : "classic";

    const positionRaw = formData.get("position") as string;
    const position = isValidPosition(positionRaw) ? positionRaw : "footer";

    const id = generateWebringId();

    try {
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

      return { success: true, ringAdded: true };
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
    const ringId = formData.get("ringId") as string;

    if (!ringId) {
      return fail(400, {
        error: "Ring ID is required",
        error_code: "MISSING_ID",
      });
    }

    const badgeStyleRaw = formData.get("badgeStyle") as string;
    const positionRaw = formData.get("position") as string;

    const updates: string[] = [];
    const values: unknown[] = [];

    if (badgeStyleRaw && isValidBadgeStyle(badgeStyleRaw)) {
      updates.push("badge_style = ?");
      values.push(badgeStyleRaw);
    }

    if (positionRaw && isValidPosition(positionRaw)) {
      updates.push("position = ?");
      values.push(positionRaw);
    }

    if (updates.length === 0) {
      return { success: true };
    }

    values.push(ringId, tenantId);

    try {
      await db
        .prepare(
          `UPDATE webring_memberships SET ${updates.join(", ")} WHERE id = ? AND tenant_id = ?`,
        )
        .bind(...values)
        .run();

      return { success: true, ringUpdated: true };
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
    const ringId = formData.get("ringId") as string;

    try {
      await db
        .prepare(
          `DELETE FROM webring_memberships WHERE id = ? AND tenant_id = ?`,
        )
        .bind(ringId, tenantId)
        .run();

      return { success: true, ringRemoved: true };
    } catch (error) {
      logGroveError("Arbor", ARBOR_ERRORS.OPERATION_FAILED, { cause: error });
      return fail(500, {
        error: ARBOR_ERRORS.OPERATION_FAILED.userMessage,
        error_code: ARBOR_ERRORS.OPERATION_FAILED.code,
      });
    }
  },
};
