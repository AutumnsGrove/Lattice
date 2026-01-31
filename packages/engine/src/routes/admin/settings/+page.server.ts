import { fail } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";
import {
  getGreenhouseTenant,
  getTenantControllableGrafts,
  setTenantGraftOverride,
  resetTenantGraftOverrides,
  // Wayfinder-only imports
  getGreenhouseTenants,
  enrollInGreenhouse,
  removeFromGreenhouse,
  toggleGreenhouseStatus,
  getFeatureFlags,
  setFlagEnabled,
} from "$lib/feature-flags";
import type { TenantGraftInfo } from "$lib/feature-flags/tenant-grafts";
import type { GreenhouseTenant } from "$lib/feature-flags/types";
import type { FeatureFlagSummary } from "$lib/feature-flags/admin";

// List of Wayfinder (platform owner) emails
// The Wayfinder has access to system health and other platform-wide features
const WAYFINDER_EMAILS = ["autumn@grove.place"];

function isWayfinder(email: string | undefined): boolean {
  if (!email) return false;
  return WAYFINDER_EMAILS.includes(email.toLowerCase());
}

export const load: PageServerLoad = async ({ locals, platform }) => {
  const env = platform?.env;

  // Check greenhouse status for this tenant
  let greenhouseStatus: {
    inGreenhouse: boolean;
    enrolledAt?: Date;
    notes?: string;
  } = { inGreenhouse: false };

  // Tenant-controllable grafts (only for greenhouse members)
  let tenantGrafts: TenantGraftInfo[] = [];

  // Wayfinder-only data for greenhouse admin
  let greenhouseTenants: GreenhouseTenant[] = [];
  let tenantNames: Record<string, string> = {};
  let availableTenants: Record<string, string> = {};
  let featureFlags: FeatureFlagSummary[] = [];

  const userIsWayfinder = isWayfinder(locals.user?.email);

  if (env?.DB && env?.CACHE_KV && locals.tenantId) {
    try {
      const tenant = await getGreenhouseTenant(locals.tenantId, {
        DB: env.DB,
        FLAGS_KV: env.CACHE_KV,
      });

      if (tenant && tenant.enabled) {
        greenhouseStatus = {
          inGreenhouse: true,
          enrolledAt: tenant.enrolledAt,
          notes: tenant.notes,
        };

        // Load grafts this tenant can control
        tenantGrafts = await getTenantControllableGrafts(locals.tenantId, {
          DB: env.DB,
          FLAGS_KV: env.CACHE_KV,
        });
      }

      // Load Wayfinder-only data for greenhouse admin panel
      if (userIsWayfinder) {
        const flagsEnv = { DB: env.DB, FLAGS_KV: env.CACHE_KV };

        // Load greenhouse tenants and feature flags in parallel
        const [ghTenants, flags] = await Promise.all([
          getGreenhouseTenants(flagsEnv),
          getFeatureFlags(flagsEnv),
        ]);

        greenhouseTenants = ghTenants;
        featureFlags = flags;

        // Build enrolled tenant IDs set for quick lookup
        const enrolledIds = new Set(ghTenants.map((t) => t.tenantId));

        // Load all tenants for name lookup
        // NOTE: This intentionally loads ALL tenants across the Grove instance.
        // The Wayfinder (platform admin) has global visibility to enroll any tenant.
        interface TenantRow {
          id: string;
          username: string;
          display_name: string | null;
        }

        try {
          const result = await env.DB.prepare(
            "SELECT id, username, display_name FROM tenants ORDER BY username",
          ).all<TenantRow>();

          for (const t of result.results ?? []) {
            const displayName = t.display_name || t.username || t.id;
            tenantNames[t.id] = displayName;

            // If not enrolled, add to available list
            if (!enrolledIds.has(t.id)) {
              availableTenants[t.id] = displayName;
            }
          }
        } catch (error) {
          console.error("Failed to load tenants for Wayfinder:", error);
        }
      }
    } catch (error) {
      console.error("Failed to check greenhouse status:", error);
    }
  }

  return {
    isWayfinder: userIsWayfinder,
    greenhouseStatus,
    tenantGrafts,
    // Wayfinder-only data
    greenhouseTenants,
    tenantNames,
    availableTenants,
    featureFlags,
  };
};

export const actions: Actions = {
  /**
   * Toggle a graft on/off for the current tenant
   */
  toggleGraft: async ({ request, locals, platform }) => {
    const env = platform?.env;
    if (!env?.DB || !env?.CACHE_KV) {
      return fail(500, { error: "Database not available" });
    }

    if (!locals.tenantId) {
      return fail(403, { error: "Tenant context required" });
    }

    // Verify greenhouse membership
    const tenant = await getGreenhouseTenant(locals.tenantId, {
      DB: env.DB,
      FLAGS_KV: env.CACHE_KV,
    });

    if (!tenant?.enabled) {
      return fail(403, { error: "Greenhouse membership required" });
    }

    const formData = await request.formData();
    const graftId = formData.get("graftId")?.toString();
    const enabled = formData.get("enabled") === "true";

    if (!graftId) {
      return fail(400, { error: "Graft ID is required" });
    }

    const success = await setTenantGraftOverride(
      graftId,
      locals.tenantId,
      enabled,
      {
        DB: env.DB,
        FLAGS_KV: env.CACHE_KV,
      },
    );

    if (!success) {
      return fail(500, { error: "Failed to update graft preference" });
    }

    return {
      success: true,
      message: enabled
        ? `${graftId} enabled for your site`
        : `${graftId} disabled for your site`,
    };
  },

  /**
   * Reset all graft overrides to defaults
   */
  resetGrafts: async ({ locals, platform }) => {
    const env = platform?.env;
    if (!env?.DB || !env?.CACHE_KV) {
      return fail(500, { error: "Database not available" });
    }

    if (!locals.tenantId) {
      return fail(403, { error: "Tenant context required" });
    }

    // Verify greenhouse membership
    const tenant = await getGreenhouseTenant(locals.tenantId, {
      DB: env.DB,
      FLAGS_KV: env.CACHE_KV,
    });

    if (!tenant?.enabled) {
      return fail(403, { error: "Greenhouse membership required" });
    }

    const count = await resetTenantGraftOverrides(locals.tenantId, {
      DB: env.DB,
      FLAGS_KV: env.CACHE_KV,
    });

    return {
      success: true,
      message:
        count > 0
          ? `Reset ${count} graft preference${count === 1 ? "" : "s"} to defaults`
          : "No custom preferences to reset",
    };
  },

  // =========================================================================
  // WAYFINDER-ONLY ACTIONS (Greenhouse Admin)
  // =========================================================================

  /**
   * Enroll a tenant in the greenhouse program (Wayfinder-only)
   */
  enrollTenant: async ({ request, locals, platform }) => {
    if (!isWayfinder(locals.user?.email)) {
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
      locals.user?.email || "wayfinder",
      notes,
      { DB: env.DB, FLAGS_KV: env.CACHE_KV },
    );

    if (!success) {
      return fail(500, { error: "Failed to enroll tenant" });
    }

    return { success: true, message: "Tenant enrolled in greenhouse" };
  },

  /**
   * Remove a tenant from the greenhouse program (Wayfinder-only)
   */
  removeTenant: async ({ request, locals, platform }) => {
    if (!isWayfinder(locals.user?.email)) {
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

  /**
   * Toggle a tenant's greenhouse status (Wayfinder-only)
   */
  toggleTenant: async ({ request, locals, platform }) => {
    if (!isWayfinder(locals.user?.email)) {
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

  /**
   * Cultivate (enable) a feature flag globally (Wayfinder-only)
   */
  cultivateFlag: async ({ request, locals, platform }) => {
    if (!isWayfinder(locals.user?.email)) {
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

  /**
   * Prune (disable) a feature flag globally (Wayfinder-only)
   */
  pruneFlag: async ({ request, locals, platform }) => {
    if (!isWayfinder(locals.user?.email)) {
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
