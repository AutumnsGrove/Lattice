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
  // DEBUG: capture raw query results
  let _rawPages: unknown[] = [];
  let _queryRan = false;
  let _error: string | null = null;

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
            // site_settings table might not exist yet - that's OK
            console.warn("[Layout] site_settings query failed:", settingsError);
          }

          // Load pages that should appear in navigation
          // Simplified query for debugging - just get all pages first
          const navResult = await db
            .prepare(
              `SELECT slug, title, show_in_nav FROM pages WHERE tenant_id = ?`,
            )
            .bind(tenantId)
            .all<NavPage & { show_in_nav: number }>();

          // DEBUG: Capture raw results
          _queryRan = true;
          _rawPages = navResult?.results ?? [];

          console.log("[Layout] ALL pages for tenant:", {
            tenantId,
            count: navResult?.results?.length ?? 0,
            pages: navResult?.results,
          });

          // Filter in JS instead of SQL for now
          // Use truthy check instead of strict === 1 (D1 may return different types)
          if (navResult?.results) {
            navPages = navResult.results
              .filter(
                (p) => p.show_in_nav && p.slug !== "home" && p.slug !== "about",
              )
              .map((p) => ({ slug: p.slug, title: p.title }));
          }

          // DEBUG: Log what we filtered
          console.log("[Layout] Filtered navPages:", {
            count: navPages.length,
            pages: navPages,
          });
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
      // If DB bindings aren't configured, gracefully fall back to defaults
      // This prevents 500 errors when D1 bindings aren't set up in Cloudflare Pages dashboard
      const message = error instanceof Error ? error.message : "Unknown error";
      _error = message;
      console.error("Failed to load site settings (using defaults):", message);
    }
  }

  console.log("[Layout] FINAL navPages:", navPages);

  // DEBUG: Include debug info in response (avoid platform.env access during build)
  const _debug: Record<string, unknown> = {
    tenantId: tenantId ?? "NO_TENANT_ID",
    hasDb: building ? "BUILDING" : !!platform?.env?.DB,
    queryRan: _queryRan,
    error: _error,
    rawPagesCount: _rawPages.length,
    rawPages: _rawPages,
    navPagesCount: navPages.length,
  };

  return {
    user: locals.user || null,
    context: locals.context as AppContext,
    siteSettings,
    navPages,
    _debug,
  };
};
