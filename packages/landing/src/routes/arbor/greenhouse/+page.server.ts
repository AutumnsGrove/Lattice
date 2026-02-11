import { redirect, fail } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";
import {
  getGreenhouseTenants,
  getFeatureFlags,
  setFlagEnabled,
} from "@autumnsgrove/groveengine/feature-flags";
import type { FeatureFlagSummary } from "@autumnsgrove/groveengine/feature-flags";
import { isWayfinder } from "@autumnsgrove/groveengine/config";

export const load: PageServerLoad = async ({ parent, platform }) => {
  const parentData = await parent();
  if (!parentData.isWayfinder) {
    throw redirect(302, "/arbor");
  }

  const env = platform?.env;
  if (!env?.DB || !env?.CACHE_KV) {
    return {
      enrolledCount: 0,
      activeCount: 0,
      featureFlags: [] as FeatureFlagSummary[],
    };
  }

  const flagsEnv = { DB: env.DB, FLAGS_KV: env.CACHE_KV };
  const [greenhouseTenants, featureFlags] = await Promise.all([
    getGreenhouseTenants(flagsEnv),
    getFeatureFlags(flagsEnv),
  ]);

  return {
    enrolledCount: greenhouseTenants.length,
    activeCount: greenhouseTenants.filter((t) => t.enabled).length,
    featureFlags,
  };
};

export const actions: Actions = {
  cultivate: async ({ request, locals, platform }) => {
    if (!locals.user || !isWayfinder(locals.user.email)) {
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
    if (!locals.user || !isWayfinder(locals.user.email)) {
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
