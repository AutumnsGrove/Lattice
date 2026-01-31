import { redirect } from "@sveltejs/kit";
import {
  getEnabledGrafts,
  isInGreenhouse,
  type GraftsRecord,
} from "$lib/feature-flags";
import { emailsMatch } from "$lib/utils/user.js";
import type { LayoutServerLoad } from "./$types";

// Disable prerendering for all admin routes
// Admin pages require authentication and should be server-rendered at request time
export const prerender = false;

interface TenantInfo {
  id: string;
  subdomain: string;
  displayName: string;
}

interface TenantRow {
  id: string;
  subdomain: string;
  display_name: string;
  email: string;
}

export const load: LayoutServerLoad = async ({
  locals,
  url,
  platform,
  parent,
}) => {
  // Get parent layout data (includes navPages, siteSettings, context)
  const parentData = await parent();
  // Special case: Example tenant admin is publicly accessible for demos
  // This allows visitors to explore the admin panel without signing in
  const isExampleTenant = locals.tenantId === "example-tenant-001";

  if (!locals.user && !isExampleTenant) {
    throw redirect(
      302,
      `/auth/login?redirect=${encodeURIComponent(url.pathname)}`,
    );
  }

  // Load tenant data for the admin panel
  // PERFORMANCE: Combined ownership verification and tenant data into single query
  // Previously: two separate queries to `tenants` table (one for email, one for data)
  // Now: single query fetches all fields, ownership verified in-memory
  let tenant: TenantInfo | null = null;
  if (locals.tenantId && platform?.env?.DB) {
    try {
      const result = await platform.env.DB.prepare(
        `SELECT id, subdomain, display_name, email FROM tenants WHERE id = ?`,
      )
        .bind(locals.tenantId)
        .first<TenantRow>();

      if (result) {
        // Skip ownership verification for example tenant (public demo)
        if (!isExampleTenant) {
          // Verify ownership in-memory instead of separate query
          if (!emailsMatch(result.email, locals.user!.email)) {
            throw redirect(302, `/?error=access_denied`);
          }
        }

        tenant = {
          id: result.id,
          subdomain: result.subdomain,
          displayName: result.display_name,
        };
      }
    } catch (error) {
      if (error instanceof Response) {
        throw error;
      }
      console.error("[Admin Layout] Failed to load tenant:", error);
    }
  }

  // Load ALL grafts for this tenant (engine-first approach)
  // Grafts cascade to all child pages — no per-page flag checking needed
  let grafts: GraftsRecord = {};
  if (platform?.env?.DB && platform?.env?.CACHE_KV && locals.tenantId) {
    try {
      // Check if tenant is in greenhouse (for greenhouse-only flags)
      const inGreenhouse = await isInGreenhouse(locals.tenantId, {
        DB: platform.env.DB,
        FLAGS_KV: platform.env.CACHE_KV,
      });

      grafts = await getEnabledGrafts(
        { tenantId: locals.tenantId, inGreenhouse },
        { DB: platform.env.DB, FLAGS_KV: platform.env.CACHE_KV },
      );
    } catch (error) {
      console.error("[Admin Layout] Failed to load grafts:", error);
      // Continue with empty grafts - features will be disabled
    }
  }

  return {
    ...parentData,
    user: locals.user,
    tenant,
    grafts,
    csrfToken: locals.csrfToken,
  };
};
