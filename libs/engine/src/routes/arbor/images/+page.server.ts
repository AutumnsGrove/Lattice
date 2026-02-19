import type { PageServerLoad } from "./$types";
import {
  isFeatureEnabled,
  getFeatureValue,
  type FeatureFlagsEnv,
} from "$lib/feature-flags";

/**
 * Server-side data for the admin images page.
 *
 * Evaluates JXL feature flags and passes the config to the client.
 * This allows controlled rollout of JPEG XL encoding.
 */
export const load: PageServerLoad = async ({ platform, locals }) => {
  // Default configuration (no flags, JXL disabled)
  const defaultConfig = {
    jxlEnabled: false,
    jxlRolloutPercentage: 0,
    jxlKillSwitchActive: false,
  };

  // If no platform env or missing feature flag bindings, return defaults
  if (!platform?.env?.DB || !platform?.env?.CACHE_KV) {
    return {
      jxl: defaultConfig,
    };
  }

  // Cast env to feature flags env type (it has DB and CACHE_KV)
  const flagsEnv = platform.env as unknown as FeatureFlagsEnv;

  // Evaluation context - use tenant and user for percentage rollout
  const context = {
    tenantId: locals.tenantId,
    userId: locals.user?.id,
  };

  try {
    // Check kill switch first (if disabled, JXL is force-disabled)
    const killSwitchEnabled = await isFeatureEnabled(
      "jxl_kill_switch",
      context,
      flagsEnv,
    );

    // If kill switch is disabled (emergency mode), force WebP
    if (!killSwitchEnabled) {
      return {
        jxl: {
          jxlEnabled: false,
          jxlRolloutPercentage: 0,
          jxlKillSwitchActive: true, // Signal that kill switch is active
        },
      };
    }

    // Check main encoding flag
    const jxlEnabled = await isFeatureEnabled(
      "jxl_encoding",
      context,
      flagsEnv,
    );

    // Get rollout percentage (for gradual rollout)
    const rolloutPercentage = await getFeatureValue<number>(
      "jxl_rollout_percentage",
      context,
      flagsEnv,
      0,
    );

    return {
      jxl: {
        jxlEnabled,
        jxlRolloutPercentage: rolloutPercentage,
        jxlKillSwitchActive: false,
      },
    };
  } catch (error) {
    // Log error but don't break the page - fall back to defaults
    console.error("[Admin Images] Feature flag evaluation failed:", error);
    return {
      jxl: defaultConfig,
    };
  }
};
