import type { PageServerLoad, Actions } from "./$types";
import { fail } from "@sveltejs/kit";
import { ARBOR_ERRORS, logGroveError } from "$lib/errors";
import {
  generateCustomBadgeId,
  sanitizeBadgeName,
  sanitizeBadgeDescription,
  isValidIconUrl,
  SYSTEM_BADGES,
  COMMUNITY_BADGES,
  BADGE_RARITY_OPTIONS,
  MAX_CUSTOM_BADGES,
} from "$lib/curios/badges";

interface EarnedBadgeRow {
  badge_id: string;
  name: string;
  description: string;
  icon_url: string;
  category: string;
  rarity: string;
  earned_at: string;
  is_showcased: number;
  display_order: number;
}

interface CustomBadgeRow {
  id: string;
  name: string;
  description: string;
  icon_url: string;
  created_at: string;
}

export const load: PageServerLoad = async ({ platform, locals }) => {
  const db = platform?.env?.DB;
  const tenantId = locals.tenantId;

  if (!db || !tenantId) {
    return {
      earnedBadges: [],
      customBadges: [],
      systemBadges: SYSTEM_BADGES,
      communityBadges: COMMUNITY_BADGES,
      rarityOptions: BADGE_RARITY_OPTIONS,
      error: "Database not available",
    };
  }

  const [earnedResult, customResult] = await Promise.all([
    db
      .prepare(
        `SELECT bd.id as badge_id, bd.name, bd.description, bd.icon_url, bd.category, bd.rarity,
                tb.earned_at, tb.is_showcased, tb.display_order
         FROM tenant_badges tb
         JOIN badge_definitions bd ON tb.badge_id = bd.id
         WHERE tb.tenant_id = ?
         ORDER BY tb.is_showcased DESC, tb.display_order ASC`,
      )
      .bind(tenantId)
      .all<EarnedBadgeRow>()
      .catch(() => ({ results: [] as EarnedBadgeRow[] })),
    db
      .prepare(
        `SELECT id, name, description, icon_url, created_at
         FROM custom_badges WHERE tenant_id = ?
         ORDER BY created_at DESC`,
      )
      .bind(tenantId)
      .all<CustomBadgeRow>()
      .catch(() => ({ results: [] as CustomBadgeRow[] })),
  ]);

  const earnedBadges = earnedResult.results.map((row) => ({
    id: row.badge_id,
    name: row.name,
    description: row.description,
    iconUrl: row.icon_url,
    category: row.category,
    rarity: row.rarity,
    earnedAt: row.earned_at,
    isShowcased: row.is_showcased === 1,
  }));

  const customBadges = customResult.results.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    iconUrl: row.icon_url,
    createdAt: row.created_at,
  }));

  return {
    earnedBadges,
    customBadges,
    systemBadges: SYSTEM_BADGES,
    communityBadges: COMMUNITY_BADGES,
    rarityOptions: BADGE_RARITY_OPTIONS,
  };
};

export const actions: Actions = {
  toggleShowcase: async ({ request, platform, locals }) => {
    const db = platform?.env?.DB;
    const tenantId = locals.tenantId;

    if (!db || !tenantId) {
      return fail(500, {
        error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
        error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
      });
    }

    const formData = await request.formData();
    const badgeId = formData.get("badgeId") as string;
    const showcase = formData.get("showcase") === "true" ? 1 : 0;

    try {
      await db
        .prepare(
          `UPDATE tenant_badges SET is_showcased = ? WHERE badge_id = ? AND tenant_id = ?`,
        )
        .bind(showcase, badgeId, tenantId)
        .run();

      return { success: true, showcaseToggled: true };
    } catch (error) {
      logGroveError("Arbor", ARBOR_ERRORS.SAVE_FAILED, { cause: error });
      return fail(500, {
        error: ARBOR_ERRORS.SAVE_FAILED.userMessage,
        error_code: ARBOR_ERRORS.SAVE_FAILED.code,
      });
    }
  },

  createCustom: async ({ request, platform, locals }) => {
    const db = platform?.env?.DB;
    const tenantId = locals.tenantId;

    if (!db || !tenantId) {
      return fail(500, {
        error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
        error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
      });
    }

    const formData = await request.formData();
    const name = sanitizeBadgeName(formData.get("name") as string);
    if (!name) {
      return fail(400, {
        error: "Badge name is required",
        error_code: "MISSING_NAME",
      });
    }

    const description = sanitizeBadgeDescription(
      formData.get("description") as string,
    );
    if (!description) {
      return fail(400, {
        error: "Badge description is required",
        error_code: "MISSING_DESCRIPTION",
      });
    }

    const iconUrl = (formData.get("iconUrl") as string)?.trim();
    if (!iconUrl || !isValidIconUrl(iconUrl)) {
      return fail(400, {
        error: "A valid icon URL is required",
        error_code: "INVALID_ICON_URL",
      });
    }

    // Check limit
    const countResult = await db
      .prepare(
        `SELECT COUNT(*) as count FROM custom_badges WHERE tenant_id = ?`,
      )
      .bind(tenantId)
      .first<{ count: number }>();

    if ((countResult?.count ?? 0) >= MAX_CUSTOM_BADGES) {
      return fail(400, {
        error: `Maximum of ${MAX_CUSTOM_BADGES} custom badges reached`,
        error_code: "LIMIT_REACHED",
      });
    }

    const id = generateCustomBadgeId();

    try {
      await db
        .prepare(
          `INSERT INTO custom_badges (id, tenant_id, name, description, icon_url) VALUES (?, ?, ?, ?, ?)`,
        )
        .bind(id, tenantId, name, description, iconUrl)
        .run();

      return { success: true, customCreated: true };
    } catch (error) {
      logGroveError("Arbor", ARBOR_ERRORS.SAVE_FAILED, { cause: error });
      return fail(500, {
        error: ARBOR_ERRORS.SAVE_FAILED.userMessage,
        error_code: ARBOR_ERRORS.SAVE_FAILED.code,
      });
    }
  },

  removeCustom: async ({ request, platform, locals }) => {
    const db = platform?.env?.DB;
    const tenantId = locals.tenantId;

    if (!db || !tenantId) {
      return fail(500, {
        error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
        error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
      });
    }

    const formData = await request.formData();
    const badgeId = formData.get("badgeId") as string;

    try {
      await db
        .prepare(`DELETE FROM custom_badges WHERE id = ? AND tenant_id = ?`)
        .bind(badgeId, tenantId)
        .run();

      return { success: true, customRemoved: true };
    } catch (error) {
      logGroveError("Arbor", ARBOR_ERRORS.OPERATION_FAILED, { cause: error });
      return fail(500, {
        error: ARBOR_ERRORS.OPERATION_FAILED.userMessage,
        error_code: ARBOR_ERRORS.OPERATION_FAILED.code,
      });
    }
  },
};
