import { json } from "@sveltejs/kit";

export const prerender = false;

/**
 * Public endpoint to retrieve site settings
 * @type {import('./$types').RequestHandler}
 */
export async function GET({ platform }) {
  const db = /** @type {any} */ (platform?.env)?.GIT_STATS_DB;

  if (!db) {
    // Return defaults if database not available
    return json({ font_family: "lexend" });
  }

  try {
    const result = await db
      .prepare("SELECT setting_key, setting_value FROM site_settings")
      .all();

    /** @type {Record<string, any>} */
    const settings = {};
    for (const row of /** @type {any[]} */ (result.results)) {
      settings[row.setting_key] = row.setting_value;
    }

    return json(settings, {
      headers: {
        "Cache-Control": "public, max-age=300", // 5 minute cache
      },
    });
  } catch (error) {
    console.error("Failed to fetch settings:", error);
    return json({ font_family: "lexend" });
  }
}
