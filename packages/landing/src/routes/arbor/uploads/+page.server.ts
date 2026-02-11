import { redirect, fail } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";
import {
  getUploadSuspensionStatus,
  setUploadSuspension,
} from "@autumnsgrove/groveengine/feature-flags";
import { isWayfinder } from "@autumnsgrove/groveengine/config";

interface Tenant {
  id: string;
  username: string;
  display_name: string | null;
}

export const load: PageServerLoad = async ({ parent, platform }) => {
  // Auth is handled by parent layout - just check Wayfinder access
  const parentData = await parent();
  if (!parentData.isWayfinder) {
    throw redirect(302, "/arbor");
  }

  const env = platform?.env;
  if (!env?.DB || !env?.CACHE_KV) {
    return {
      tenants: [],
      tenantNames: {} as Record<string, string>,
    };
  }

  const flagsEnv = { DB: env.DB, FLAGS_KV: env.CACHE_KV };

  // Load suspension status and tenant names in parallel
  const [suspensionStatus, allTenantsResult] = await Promise.all([
    getUploadSuspensionStatus(flagsEnv),
    env.DB.prepare(
      "SELECT id, username, display_name FROM tenants ORDER BY username",
    )
      .all<Tenant>()
      .catch((err: unknown) => {
        console.error("[Uploads] Failed to load tenants:", err);
        return { results: [] as Tenant[] };
      }),
  ]);

  // Build tenant names map
  const allTenants = allTenantsResult.results ?? [];
  const tenantNames: Record<string, string> = {};
  for (const tenant of allTenants) {
    tenantNames[tenant.id] =
      tenant.display_name || tenant.username || tenant.id;
  }

  // Map suspension status to the component format
  const tenants = suspensionStatus.map((s) => ({
    tenantId: s.tenantId,
    suspended: s.suspended,
  }));

  return { tenants, tenantNames };
};

export const actions: Actions = {
  unsuspend: async ({ request, locals, platform }) => {
    if (!locals.user || !isWayfinder(locals.user.email)) {
      return fail(403, { error: "Unauthorized" });
    }

    const env = platform?.env;
    if (!env?.DB || !env?.CACHE_KV) {
      return fail(500, { error: "Database not available" });
    }

    const formData = await request.formData();
    const tenantId = formData.get("tenantId")?.toString();

    if (!tenantId) {
      return fail(400, { error: "Tenant ID is required" });
    }

    const success = await setUploadSuspension(tenantId, false, {
      DB: env.DB,
      FLAGS_KV: env.CACHE_KV,
    });

    if (!success) {
      return fail(500, { error: "Failed to enable uploads for tenant" });
    }

    return { success: true, message: "Uploads enabled for tenant" };
  },

  suspend: async ({ request, locals, platform }) => {
    if (!locals.user || !isWayfinder(locals.user.email)) {
      return fail(403, { error: "Unauthorized" });
    }

    const env = platform?.env;
    if (!env?.DB || !env?.CACHE_KV) {
      return fail(500, { error: "Database not available" });
    }

    const formData = await request.formData();
    const tenantId = formData.get("tenantId")?.toString();

    if (!tenantId) {
      return fail(400, { error: "Tenant ID is required" });
    }

    const success = await setUploadSuspension(tenantId, true, {
      DB: env.DB,
      FLAGS_KV: env.CACHE_KV,
    });

    if (!success) {
      return fail(500, { error: "Failed to suspend uploads for tenant" });
    }

    return { success: true, message: "Uploads suspended for tenant" };
  },
};
