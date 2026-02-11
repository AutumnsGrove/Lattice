/**
 * Tenant Detail Page - View individual tenant details + admin controls
 *
 * Shows full tenant info with stats (posts, pages, media, sessions).
 * Admin controls: greenhouse enrollment, upload suspension, graft overrides.
 * Danger zone provides CLI commands for destructive actions —
 * they cannot be executed from this panel.
 */

import { redirect, error, fail } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";
import {
  getGreenhouseTenant,
  enrollInGreenhouse,
  removeFromGreenhouse,
  toggleGreenhouseStatus,
  updateGreenhouseNotes,
  getTenantUploadSuspension,
  setUploadSuspension,
  getTenantControllableGrafts,
  setTenantGraftOverride,
  resetTenantGraftOverrides,
} from "@autumnsgrove/groveengine/feature-flags";
import { isWayfinder } from "@autumnsgrove/groveengine/config";

interface Tenant {
  id: string;
  subdomain: string;
  display_name: string;
  email: string;
  plan: string;
  storage_used: number;
  post_count: number;
  custom_domain: string | null;
  theme: string;
  active: number;
  created_at: number;
  updated_at: number;
}

export const load: PageServerLoad = async ({ parent, platform, params }) => {
  const parentData = await parent();
  if (!parentData.isWayfinder) {
    throw redirect(302, "/arbor");
  }

  if (!platform?.env?.DB) {
    throw error(500, "Database not available");
  }

  const DB = platform.env.DB;
  const { id } = params;

  const tenant = await DB.prepare("SELECT * FROM tenants WHERE id = ?")
    .bind(id)
    .first<Tenant>();

  if (!tenant) {
    throw error(404, "Tenant not found");
  }

  // Build flags env if KV is available
  const flagsEnv = platform.env.CACHE_KV
    ? { DB, FLAGS_KV: platform.env.CACHE_KV }
    : null;

  // Load content stats + admin data in parallel
  const [postResult, pageResult, mediaResult, storageResult, greenhouse] =
    await Promise.all([
      DB.prepare("SELECT COUNT(*) as count FROM posts WHERE tenant_id = ?")
        .bind(id)
        .first<{ count: number }>()
        .catch(() => ({ count: 0 })),
      DB.prepare("SELECT COUNT(*) as count FROM pages WHERE tenant_id = ?")
        .bind(id)
        .first<{ count: number }>()
        .catch(() => ({ count: 0 })),
      DB.prepare("SELECT COUNT(*) as count FROM media WHERE tenant_id = ?")
        .bind(id)
        .first<{ count: number }>()
        .catch(() => ({ count: 0 })),
      DB.prepare(
        "SELECT COALESCE(SUM(size), 0) as total FROM media WHERE tenant_id = ?",
      )
        .bind(id)
        .first<{ total: number }>()
        .catch(() => ({ total: 0 })),
      flagsEnv ? getGreenhouseTenant(id, flagsEnv) : Promise.resolve(null),
    ]);

  // Upload status + graft overrides (grafts only if in greenhouse)
  const [uploadStatus, tenantGrafts] = flagsEnv
    ? await Promise.all([
        getTenantUploadSuspension(id, flagsEnv),
        greenhouse ? getTenantControllableGrafts(id, flagsEnv) : [],
      ])
    : [{ tenantId: id, suspended: true, ruleId: null }, []];

  return {
    tenant: { ...tenant, storage_used: storageResult?.total || 0 },
    postCount: postResult?.count || 0,
    pageCount: pageResult?.count || 0,
    mediaCount: mediaResult?.count || 0,
    greenhouse,
    uploadSuspended: uploadStatus.suspended,
    tenantGrafts,
  };
};

// =============================================================================
// FORM ACTIONS — All Wayfinder-gated, scoped to params.id
// =============================================================================

export const actions: Actions = {
  enroll: async ({ request, locals, platform, params }) => {
    if (!locals.user || !isWayfinder(locals.user.email)) {
      return fail(403, { error: "Unauthorized" });
    }

    const env = platform?.env;
    if (!env?.DB || !env?.CACHE_KV) {
      return fail(500, { error: "Database not available" });
    }

    const formData = await request.formData();
    const notes = formData.get("notes")?.toString() || undefined;

    if (notes && notes.length > 500) {
      return fail(400, { error: "Notes must be 500 characters or less" });
    }

    const success = await enrollInGreenhouse(
      params.id,
      locals.user.email,
      notes,
      { DB: env.DB, FLAGS_KV: env.CACHE_KV },
    );

    if (!success) {
      return fail(500, { error: "Failed to enroll tenant in greenhouse" });
    }

    return { success: true, message: "Enrolled in greenhouse" };
  },

  unenroll: async ({ locals, platform, params }) => {
    if (!locals.user || !isWayfinder(locals.user.email)) {
      return fail(403, { error: "Unauthorized" });
    }

    const env = platform?.env;
    if (!env?.DB || !env?.CACHE_KV) {
      return fail(500, { error: "Database not available" });
    }

    const success = await removeFromGreenhouse(params.id, {
      DB: env.DB,
      FLAGS_KV: env.CACHE_KV,
    });

    if (!success) {
      return fail(500, { error: "Failed to remove tenant from greenhouse" });
    }

    return { success: true, message: "Removed from greenhouse" };
  },

  toggleGreenhouse: async ({ request, locals, platform, params }) => {
    if (!locals.user || !isWayfinder(locals.user.email)) {
      return fail(403, { error: "Unauthorized" });
    }

    const env = platform?.env;
    if (!env?.DB || !env?.CACHE_KV) {
      return fail(500, { error: "Database not available" });
    }

    const formData = await request.formData();
    const enabled = formData.get("enabled") === "true";

    const success = await toggleGreenhouseStatus(params.id, enabled, {
      DB: env.DB,
      FLAGS_KV: env.CACHE_KV,
    });

    if (!success) {
      return fail(500, { error: "Failed to toggle greenhouse status" });
    }

    return {
      success: true,
      message: enabled
        ? "Greenhouse access enabled"
        : "Greenhouse access paused",
    };
  },

  updateNotes: async ({ request, locals, platform, params }) => {
    if (!locals.user || !isWayfinder(locals.user.email)) {
      return fail(403, { error: "Unauthorized" });
    }

    const env = platform?.env;
    if (!env?.DB || !env?.CACHE_KV) {
      return fail(500, { error: "Database not available" });
    }

    const formData = await request.formData();
    const notes = formData.get("notes")?.toString() || "";

    if (notes.length > 500) {
      return fail(400, { error: "Notes must be 500 characters or less" });
    }

    const success = await updateGreenhouseNotes(params.id, notes, {
      DB: env.DB,
      FLAGS_KV: env.CACHE_KV,
    });

    if (!success) {
      return fail(500, { error: "Failed to update notes" });
    }

    return { success: true, message: "Notes updated" };
  },

  toggleUploadSuspension: async ({ request, locals, platform, params }) => {
    if (!locals.user || !isWayfinder(locals.user.email)) {
      return fail(403, { error: "Unauthorized" });
    }

    const env = platform?.env;
    if (!env?.DB || !env?.CACHE_KV) {
      return fail(500, { error: "Database not available" });
    }

    const formData = await request.formData();
    const suspended = formData.get("suspended") === "true";

    const success = await setUploadSuspension(params.id, suspended, {
      DB: env.DB,
      FLAGS_KV: env.CACHE_KV,
    });

    if (!success) {
      return fail(500, { error: "Failed to update upload suspension" });
    }

    return {
      success: true,
      message: suspended ? "Uploads suspended" : "Uploads enabled",
    };
  },

  toggleGraft: async ({ request, locals, platform, params }) => {
    if (!locals.user || !isWayfinder(locals.user.email)) {
      return fail(403, { error: "Unauthorized" });
    }

    const env = platform?.env;
    if (!env?.DB || !env?.CACHE_KV) {
      return fail(500, { error: "Database not available" });
    }

    const formData = await request.formData();
    const flagId = formData.get("flagId")?.toString();
    const enabled = formData.get("enabled") === "true";

    if (!flagId || !/^[a-z0-9_]+$/.test(flagId)) {
      return fail(400, { error: "Invalid flag ID" });
    }

    const success = await setTenantGraftOverride(flagId, params.id, enabled, {
      DB: env.DB,
      FLAGS_KV: env.CACHE_KV,
    });

    if (!success) {
      return fail(500, { error: "Failed to toggle graft override" });
    }

    return {
      success: true,
      message: `${flagId} ${enabled ? "enabled" : "disabled"}`,
    };
  },

  resetGrafts: async ({ locals, platform, params }) => {
    if (!locals.user || !isWayfinder(locals.user.email)) {
      return fail(403, { error: "Unauthorized" });
    }

    const env = platform?.env;
    if (!env?.DB || !env?.CACHE_KV) {
      return fail(500, { error: "Database not available" });
    }

    const removed = await resetTenantGraftOverrides(params.id, {
      DB: env.DB,
      FLAGS_KV: env.CACHE_KV,
    });

    return {
      success: true,
      message: `Reset ${removed} graft override${removed !== 1 ? "s" : ""} to defaults`,
    };
  },
};
