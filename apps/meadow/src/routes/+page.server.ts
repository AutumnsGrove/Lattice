/**
 * Root Page — Redirect to /feed if posts exist, otherwise show landing
 */

import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ platform }) => {
  const db = platform?.env?.DB;
  if (!db) return {};

  try {
    const result = await db
      .prepare(`SELECT COUNT(*) as count FROM meadow_posts WHERE visible = 1`)
      .first<{ count: number }>();

    if (result && result.count > 0) {
      redirect(302, "/feed");
    }
  } catch {
    // Landing page fallback if DB unavailable
  }

  return {};
};
