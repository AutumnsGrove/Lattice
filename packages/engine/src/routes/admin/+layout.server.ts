import { redirect } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";
import { verifyTenantOwnership } from "$lib/auth/session.js";

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
}

export const load: LayoutServerLoad = async ({ locals, url, platform }) => {
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
  let tenant: TenantInfo | null = null;
  if (locals.tenantId && platform?.env?.DB) {
    try {
      // Skip ownership verification for example tenant (public demo)
      if (!isExampleTenant) {
        // Verify tenant ownership before loading tenant data
        const isOwner = await verifyTenantOwnership(
          platform.env.DB,
          locals.tenantId,
          locals.user!.email,
        );

        if (!isOwner) {
          throw redirect(302, `/?error=access_denied`);
        }
      }

      const result = await platform.env.DB.prepare(
        `SELECT id, subdomain, display_name FROM tenants WHERE id = ?`,
      )
        .bind(locals.tenantId)
        .first<TenantRow>();

      if (result) {
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

  return {
    user: locals.user,
    tenant,
  };
};
