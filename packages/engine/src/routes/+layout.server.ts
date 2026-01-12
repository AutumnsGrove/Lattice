import type { LayoutServerLoad } from "./$types";
import type { AppContext } from "../app.d.ts";

interface SiteSettings {
  font_family: string;
  [key: string]: string;
}

interface NavPage {
  slug: string;
  title: string;
}

export const load: LayoutServerLoad = async ({ locals, platform }) => {
  // Default site settings
  let siteSettings: SiteSettings = { font_family: "lexend" };
  // Navigation pages (pages with show_in_nav enabled)
  let navPages: NavPage[] = [];

  // Get tenant ID from context if available
  const tenantId = locals.tenantId;

  // Only fetch from database at runtime (not during prerendering)
  // The Cloudflare adapter throws when accessing platform.env during prerendering
  try {
    // Check if platform and env exist (they won't during prerendering or if bindings aren't configured)
    const db = platform?.env?.DB;
    if (db) {
      // If we have a tenant context, load tenant-specific settings
      if (tenantId) {
        const result = await db
          .prepare(
            "SELECT setting_key, setting_value FROM site_settings WHERE tenant_id = ?",
          )
          .bind(tenantId)
          .all<{ setting_key: string; setting_value: string }>();

        if (result?.results) {
          for (const row of result.results) {
            siteSettings[row.setting_key] = row.setting_value;
          }
        }

        // Load pages that should appear in navigation
        // COALESCE handles case where column doesn't exist yet (before migration)
        // Exclude 'home' and 'about' since they're hardcoded in the nav
        const navResult = await db
          .prepare(
            `SELECT slug, title FROM pages
             WHERE tenant_id = ? AND COALESCE(show_in_nav, 0) = 1
               AND slug NOT IN ('home', 'about')
             ORDER BY COALESCE(nav_order, 0) ASC, title ASC`,
          )
          .bind(tenantId)
          .all<NavPage>();

        if (navResult?.results) {
          navPages = navResult.results;
        }
      } else {
        // Fallback to global settings (for landing page or legacy)
        const result = await db
          .prepare("SELECT setting_key, setting_value FROM site_settings")
          .all<{ setting_key: string; setting_value: string }>();

        if (result?.results) {
          for (const row of result.results) {
            siteSettings[row.setting_key] = row.setting_value;
          }
        }
      }
    }
  } catch (error) {
    // During prerendering or if DB bindings aren't configured, gracefully fall back to defaults
    // This prevents 500 errors when D1 bindings aren't set up in Cloudflare Pages dashboard
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to load site settings (using defaults):", message);
  }

  return {
    user: locals.user || null,
    context: locals.context as AppContext,
    siteSettings,
    navPages,
  };
};
