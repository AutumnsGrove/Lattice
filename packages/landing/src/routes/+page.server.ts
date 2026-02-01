import type { ServerLoad } from "@sveltejs/kit";
import { buildGroveAdminUrl } from "@autumnsgrove/groveengine/utils";

export const load: ServerLoad = async ({ locals, platform }) => {
  let groveUrl: string | null = null;

  // If logged in, find their grove
  if (locals.user?.email && platform?.env?.DB) {
    try {
      // Use LOWER() for case-insensitive email matching
      // Session might return "Autumn@Grove.Place" but DB stores "autumn@grove.place"
      const tenant = await platform.env.DB.prepare(
        "SELECT subdomain FROM tenants WHERE LOWER(email) = LOWER(?) LIMIT 1",
      )
        .bind(locals.user.email)
        .first<{ subdomain: string }>();

      if (tenant?.subdomain) {
        groveUrl = buildGroveAdminUrl(tenant.subdomain);
      }
    } catch {
      // No grove yet - that's fine
    }
  }

  // Fallback for logged-in users without a grove: link to Plant for signup
  // This prevents Header from falling back to relative "/admin" (which becomes grove.place/admin)
  if (locals.user && !groveUrl) {
    groveUrl = "https://plant.grove.place";
  }

  return {
    user: locals.user,
    groveUrl,
  };
};
