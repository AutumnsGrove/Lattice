import { json } from "@sveltejs/kit";

export const prerender = false;

/**
 * Public endpoint to retrieve site settings
 * @type {import('./$types').RequestHandler}
 */
export async function GET({ platform, locals }) {
  const db = platform?.env?.DB;

  if (!db) {
    // Return defaults if database not available
    return json({ font_family: "lexend" });
  }

  // For multi-tenant, we need the tenant ID to scope settings
  if (!locals.tenantId) {
    // Return defaults if no tenant context (e.g., public visitor)
    return json({ font_family: "lexend" });
  }

  try {
    // Query settings scoped to this tenant (multi-tenant architecture)
    const result = await db
      .prepare(
        "SELECT setting_key, setting_value FROM site_settings WHERE tenant_id = ?",
      )
      .bind(locals.tenantId)
      .all();

    /** @type {Record<string, any>} */
    const settings = {
      // Default values in case settings don't exist for this tenant
      font_family: "lexend",
    };
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
