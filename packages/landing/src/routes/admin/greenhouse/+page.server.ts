import { redirect, fail } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";
import {
  getGreenhouseTenants,
  enrollInGreenhouse,
  removeFromGreenhouse,
  toggleGreenhouseStatus,
  getFeatureFlags,
  setFlagEnabled,
} from "@autumnsgrove/groveengine/feature-flags";
import type {
  GreenhouseTenant,
  FeatureFlagSummary,
} from "@autumnsgrove/groveengine/feature-flags";

interface Tenant {
  id: string;
  username: string;
  display_name: string | null;
}

export const load: PageServerLoad = async ({ locals, platform }) => {
  // Only Autumn (Wayfinder) can access greenhouse admin
  if (!locals.user || locals.user.email !== "autumn@grove.place") {
    throw redirect(302, "/admin/login");
  }

  const env = platform?.env;
  if (!env?.DB || !env?.CACHE_KV) {
    return {
      tenants: [] as GreenhouseTenant[],
      tenantNames: {} as Record<string, string>,
      availableTenants: {} as Record<string, string>,
      featureFlags: [] as FeatureFlagSummary[],
    };
  }

  // Load greenhouse tenants and feature flags in parallel
  const flagsEnv = { DB: env.DB, FLAGS_KV: env.CACHE_KV };
  const [greenhouseTenants, featureFlags] = await Promise.all([
    getGreenhouseTenants(flagsEnv),
    getFeatureFlags(flagsEnv),
  ]);

  // Create a set of enrolled tenant IDs for quick lookup
  const enrolledIds = new Set(greenhouseTenants.map((t) => t.tenantId));

  // Load all tenants from DB for name lookup
  // NOTE: This intentionally loads ALL tenants across the Grove instance without
  // tenant_id scoping. The Wayfinder (platform admin) has global visibility to
  // enroll any tenant in the greenhouse program.
  let allTenants: Tenant[] = [];
  try {
    const result = await env.DB.prepare(
      "SELECT id, username, display_name FROM tenants ORDER BY username",
    ).all<Tenant>();
    allTenants = result.results ?? [];
  } catch (error) {
    console.error("Failed to load tenants:", error);
  }

  // Build tenant names map
  const tenantNames: Record<string, string> = {};
  const availableTenants: Record<string, string> = {};

  for (const tenant of allTenants) {
    const displayName = tenant.display_name || tenant.username || tenant.id;
    tenantNames[tenant.id] = displayName;

    // If not enrolled, add to available list
    if (!enrolledIds.has(tenant.id)) {
      availableTenants[tenant.id] = displayName;
    }
  }

  return {
    tenants: greenhouseTenants,
    tenantNames,
    availableTenants,
    featureFlags,
  };
};

export const actions: Actions = {
  enroll: async ({ request, locals, platform }) => {
    // Only Autumn can enroll tenants
    if (!locals.user || locals.user.email !== "autumn@grove.place") {
      return fail(403, { error: "Unauthorized" });
    }

    const env = platform?.env;
    if (!env?.DB || !env?.CACHE_KV) {
      return fail(500, { error: "Database not available" });
    }

    const formData = await request.formData();
    const tenantId = formData.get("tenantId")?.toString();
    const notes = formData.get("notes")?.toString() || undefined;

    if (!tenantId) {
      return fail(400, { error: "Tenant ID is required" });
    }

    const success = await enrollInGreenhouse(
      tenantId,
      locals.user.email,
      notes,
      { DB: env.DB, FLAGS_KV: env.CACHE_KV },
    );

    if (!success) {
      return fail(500, { error: "Failed to enroll tenant" });
    }

    return { success: true, message: "Tenant enrolled in greenhouse" };
  },

  remove: async ({ request, locals, platform }) => {
    // Only Autumn can remove tenants
    if (!locals.user || locals.user.email !== "autumn@grove.place") {
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

    const success = await removeFromGreenhouse(tenantId, {
      DB: env.DB,
      FLAGS_KV: env.CACHE_KV,
    });

    if (!success) {
      return fail(500, { error: "Failed to remove tenant" });
    }

    return { success: true, message: "Tenant removed from greenhouse" };
  },

  toggle: async ({ request, locals, platform }) => {
    // Only Autumn can toggle tenants
    if (!locals.user || locals.user.email !== "autumn@grove.place") {
      return fail(403, { error: "Unauthorized" });
    }

    const env = platform?.env;
    if (!env?.DB || !env?.CACHE_KV) {
      return fail(500, { error: "Database not available" });
    }

    const formData = await request.formData();
    const tenantId = formData.get("tenantId")?.toString();
    const enabled = formData.get("enabled") === "true";

    if (!tenantId) {
      return fail(400, { error: "Tenant ID is required" });
    }

    const success = await toggleGreenhouseStatus(tenantId, enabled, {
      DB: env.DB,
      FLAGS_KV: env.CACHE_KV,
    });

    if (!success) {
      return fail(500, { error: "Failed to toggle tenant status" });
    }

    return {
      success: true,
      message: enabled
        ? "Greenhouse access enabled"
        : "Greenhouse access disabled",
    };
  },

  cultivate: async ({ request, locals, platform }) => {
    // Only Autumn can cultivate flags
    if (!locals.user || locals.user.email !== "autumn@grove.place") {
      return fail(403, { error: "Unauthorized" });
    }

    const env = platform?.env;
    if (!env?.DB || !env?.CACHE_KV) {
      return fail(500, { error: "Database not available" });
    }

    const formData = await request.formData();
    const flagId = formData.get("flagId")?.toString();

    if (!flagId) {
      return fail(400, { error: "Flag ID is required" });
    }

    const success = await setFlagEnabled(flagId, true, {
      DB: env.DB,
      FLAGS_KV: env.CACHE_KV,
    });

    if (!success) {
      return fail(500, { error: "Failed to cultivate flag" });
    }

    return { success: true, message: `${flagId} is now cultivated` };
  },

  prune: async ({ request, locals, platform }) => {
    // Only Autumn can prune flags
    if (!locals.user || locals.user.email !== "autumn@grove.place") {
      return fail(403, { error: "Unauthorized" });
    }

    const env = platform?.env;
    if (!env?.DB || !env?.CACHE_KV) {
      return fail(500, { error: "Database not available" });
    }

    const formData = await request.formData();
    const flagId = formData.get("flagId")?.toString();

    if (!flagId) {
      return fail(400, { error: "Flag ID is required" });
    }

    const success = await setFlagEnabled(flagId, false, {
      DB: env.DB,
      FLAGS_KV: env.CACHE_KV,
    });

    if (!success) {
      return fail(500, { error: "Failed to prune flag" });
    }

    return { success: true, message: `${flagId} is now pruned` };
  },
};
