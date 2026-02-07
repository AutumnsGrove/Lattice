import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const prerender = false;

interface SettingRow {
  setting_key: string;
  setting_value: string;
}

interface SiteSettings {
  font_family: string;
  [key: string]: string;
}

/**
 * Public endpoint to retrieve site settings
 */
export const GET: RequestHandler = async ({ platform, locals }) => {
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
      .all<SettingRow>();

    const settings: SiteSettings = {
      // Default values in case settings don't exist for this tenant
      font_family: "lexend",
    };
    for (const row of result.results || []) {
      settings[row.setting_key] = row.setting_value;
    }

    return json(settings, {
      headers: {
        // Settings can be modified by user - don't let browser cache stale values
        // This prevents the "color doesn't save" bug where browser serves cached
        // response after user updates settings (#color-save-bug)
        "Cache-Control": "private, no-cache",
      },
    });
  } catch (err) {
    console.error("Failed to fetch settings:", err);
    return json({ font_family: "lexend", _loadError: true });
  }
};
