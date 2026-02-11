import type { LayoutServerLoad } from "./$types";
import type { AppContext } from "../app.d.ts";
import { building } from "$app/environment";
import { getNavPageLimit } from "$lib/server/tier-features.js";
import { canUploadImages } from "$lib/server/upload-gate.js";
import { emailsMatch } from "$lib/utils/user.js";

interface SiteSettings {
  font_family: string;
  accent_color?: string;
  grove_title?: string;
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
  // Count of enabled curios (for pages admin UI - curios share the nav page limit)
  let enabledCuriosCount = 0;
  // Curio enable flags (for mobile nav - need to be accessible outside the query block)
  // These are hoisted here so they're accessible in the return statement after Promise.all
  let timelineEnabled = false;
  let galleryEnabled = false;

  // Get tenant ID from context if available
  const tenantId = locals.tenantId;

  // Track database access failures for admin-only error banners
  let dbAccessError = false;

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
          // PERFORMANCE: Run independent queries in parallel to reduce latency
          // Settings, nav pages, curio configs, and greenhouse check run concurrently
          // Each query has its own error handling to prevent cascading failures
          const kv = platform?.env?.CACHE_KV;
          const flagsEnv = kv ? { DB: db, FLAGS_KV: kv } : null;

          const [
            settingsResult,
            navResult,
            timelineResult,
            uploadGateResult,
            journeyResult,
          ] = await Promise.all([
            // Site settings query
            db
              .prepare(
                "SELECT setting_key, setting_value FROM site_settings WHERE tenant_id = ?",
              )
              .bind(tenantId)
              .all<{ setting_key: string; setting_value: string }>()
              .catch((err) => {
                console.warn("[Layout] site_settings query failed:", err);
                return null;
              }),

            // Navigation pages query
            db
              .prepare(
                `SELECT slug, title, show_in_nav, nav_order FROM pages WHERE tenant_id = ?`,
              )
              .bind(tenantId)
              .all<NavPage & { show_in_nav: number; nav_order: number }>()
              .catch((err) => {
                console.warn("[Layout] navPages query failed:", err);
                return null;
              }),

            // Timeline curio config query
            db
              .prepare(
                `SELECT enabled FROM timeline_curio_config WHERE tenant_id = ? AND enabled = 1`,
              )
              .bind(tenantId)
              .first<{ enabled: number }>()
              .catch(() => null), // Timeline table might not exist - that's OK

            // Gallery: check upload gate (image_uploads + uploads_suspended)
            flagsEnv
              ? canUploadImages(tenantId, undefined, flagsEnv)
                  .then((gate) => gate.allowed)
                  .catch(() => false)
              : Promise.resolve(false),

            // Journey curio config query
            db
              .prepare(
                `SELECT enabled FROM journey_curio_config WHERE tenant_id = ? AND enabled = 1`,
              )
              .bind(tenantId)
              .first<{ enabled: number }>()
              .catch(() => null), // Journey table might not exist - that's OK
          ]);

          // Gallery is enabled if the upload gate allows it
          galleryEnabled = uploadGateResult;

          // Process settings results
          if (settingsResult?.results) {
            for (const row of settingsResult.results) {
              siteSettings[row.setting_key] = row.setting_value;
            }
          }

          // Process navigation results
          if (navResult?.results) {
            // Get tier-based nav page limit
            const context = locals.context;
            const plan =
              context.type === "tenant" ? context.tenant.plan : "seedling";
            const navLimit = getNavPageLimit(plan);

            navPages = navResult.results
              .filter(
                (p) => p.show_in_nav && p.slug !== "home" && p.slug !== "about",
              )
              .sort((a, b) => (a.nav_order || 0) - (b.nav_order || 0))
              .slice(0, navLimit) // Apply tier limit
              .map((p) => ({ slug: p.slug, title: p.title }));
          }

          // Add curio pages to nav if enabled (and track state for return)
          if (timelineResult?.enabled) {
            navPages.push({ slug: "timeline", title: "Timeline" });
            timelineEnabled = true;
          }
          if (galleryEnabled) {
            navPages.push({ slug: "gallery", title: "Gallery" });
          }

          // Calculate enabled curios count for the pages admin UI
          // This count is used to show accurate "slots used" (nav pages + curios share the same limit)
          enabledCuriosCount =
            (timelineResult?.enabled ? 1 : 0) +
            (galleryEnabled ? 1 : 0) +
            (journeyResult?.enabled ? 1 : 0);
        }
        // No tenant context = use hardcoded defaults only (line 19)
        // Don't query DB without tenant filter — would leak other tenants' settings
      }
    } catch (error) {
      // If DB bindings aren't configured, gracefully fall back to defaults
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("Failed to access database (using defaults):", message);
      dbAccessError = true;
    }
  }

  // Get nav page limit for the current tier (for UI display)
  const context = locals.context;
  const plan = context.type === "tenant" ? context.tenant.plan : "seedling";
  const navPageLimit = getNavPageLimit(plan);

  // SECURITY: Determine if the logged-in user owns this tenant.
  // The admin gear icon in the footer must ONLY show for the tenant owner,
  // not for any logged-in user. This prevents leaking the /arbor link
  // to visitors who happen to be signed in on another Grove site.
  const isOwner =
    !!locals.user &&
    context.type === "tenant" &&
    emailsMatch(context.tenant.ownerId, locals.user.email);

  return {
    user: locals.user || null,
    context: locals.context as AppContext,
    isOwner,
    siteSettings,
    navPages,
    navPageLimit,
    enabledCuriosCount,
    csrfToken: locals.csrfToken,
    // Explicit curio enable flags for mobile nav (fixes #848 regression)
    // Uses hoisted booleans since Promise.all results are block-scoped
    showTimeline: timelineEnabled,
    showGallery: galleryEnabled,
    dbAccessError,
  };
};
