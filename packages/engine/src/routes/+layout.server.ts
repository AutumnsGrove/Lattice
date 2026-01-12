import type { LayoutServerLoad } from "./$types";
import type { AppContext } from "../app.d.ts";
import { building } from "$app/environment";

interface SiteSettings {
  font_family: string;
  accent_color?: string;
  [key: string]: string | undefined;
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
  // Must check `building` BEFORE accessing platform.env to avoid the getter throwing
  if (!building) {
    try {
      // Check if platform and env exist (won't exist if bindings aren't configured)
      const db = platform?.env?.DB;
      if (db) {
        // If we have a tenant context, load tenant-specific settings
        if (tenantId) {
          // Site settings query - wrapped separately so it doesn't block nav
          // IMPORTANT: Each query should be in its own try/catch to prevent cascading failures
          try {
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
          } catch (settingsError) {
            // site_settings table might not exist yet - that's OK, use defaults
            console.warn("[Layout] site_settings query failed:", settingsError);
          }

          // Load pages that should appear in navigation
          try {
            const navResult = await db
              .prepare(
                `SELECT slug, title, show_in_nav FROM pages WHERE tenant_id = ?`,
              )
              .bind(tenantId)
              .all<NavPage & { show_in_nav: number }>();

            // Filter: only pages with show_in_nav enabled, excluding hardcoded nav items
            if (navResult?.results) {
              navPages = navResult.results
                .filter(
                  (p) =>
                    p.show_in_nav && p.slug !== "home" && p.slug !== "about",
                )
                .map((p) => ({ slug: p.slug, title: p.title }));
            }
          } catch (navError) {
            // Pages query failed - log but continue with empty nav
            console.warn("[Layout] navPages query failed:", navError);
          }
        } else {
          // Fallback to global settings (for landing page or legacy)
          try {
            const result = await db
              .prepare("SELECT setting_key, setting_value FROM site_settings")
              .all<{ setting_key: string; setting_value: string }>();

            if (result?.results) {
              for (const row of result.results) {
                siteSettings[row.setting_key] = row.setting_value;
              }
            }
          } catch (globalSettingsError) {
            console.warn(
              "[Layout] global site_settings query failed:",
              globalSettingsError,
            );
          }
        }
      }
    } catch (error) {
      // If DB bindings aren't configured, gracefully fall back to defaults
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("Failed to access database (using defaults):", message);
    }
  }

  return {
    user: locals.user || null,
    context: locals.context as AppContext,
    siteSettings,
    navPages,
  };
};
