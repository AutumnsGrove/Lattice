import { redirect } from "@sveltejs/kit";

// Disable prerendering for all admin routes
// Admin pages require authentication and should be server-rendered at request time
export const prerender = false;

export async function load({ locals, url, platform }) {
  if (!locals.user) {
    throw redirect(
      302,
      `/auth/login?redirect=${encodeURIComponent(url.pathname)}`,
    );
  }

  // Load tenant data for the admin panel
  let tenant = null;
  if (locals.tenantId && platform?.env?.DB) {
    try {
      const result = await platform.env.DB.prepare(
        `SELECT id, subdomain, display_name FROM tenants WHERE id = ?`,
      )
        .bind(locals.tenantId)
        .first();

      if (result) {
        tenant = {
          id: result.id,
          subdomain: result.subdomain,
          displayName: result.display_name,
        };
      }
    } catch (error) {
      console.error("[Admin Layout] Failed to load tenant:", error);
    }
  }

  return {
    user: locals.user,
    tenant,
  };
}
