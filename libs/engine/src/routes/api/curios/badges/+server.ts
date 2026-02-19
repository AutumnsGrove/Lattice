/**
 * Badges Curio API — Earned Badges
 *
 * GET — Get tenant's earned badges (public)
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { API_ERRORS, throwGroveError } from "$lib/errors";

interface EarnedBadgeRow {
  badge_id: string;
  name: string;
  description: string;
  icon_url: string;
  category: string;
  rarity: string;
  earned_at: string;
  display_order: number;
  is_showcased: number;
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
      `SELECT bd.id as badge_id, bd.name, bd.description, bd.icon_url, bd.category, bd.rarity,
              tb.earned_at, tb.display_order, tb.is_showcased
       FROM tenant_badges tb
       JOIN badge_definitions bd ON tb.badge_id = bd.id
       WHERE tb.tenant_id = ?
       ORDER BY tb.is_showcased DESC, tb.display_order ASC, tb.earned_at ASC LIMIT 500`,
    )
    .bind(tenantId)
    .all<EarnedBadgeRow>();

  const badges = result.results.map((row) => ({
    id: row.badge_id,
    name: row.name,
    description: row.description,
    iconUrl: row.icon_url,
    category: row.category,
    rarity: row.rarity,
    earnedAt: row.earned_at,
    isShowcased: row.is_showcased === 1,
  }));

  return json(
    { badges },
    {
      headers: {
        "Cache-Control": "public, max-age=120, stale-while-revalidate=240",
      },
    },
  );
};
