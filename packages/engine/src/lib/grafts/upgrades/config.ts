/**
 * UpgradesGraft Configuration
 *
 * Environment-driven configuration for cultivation and garden management.
 */

import type { UpgradesConfig } from "./types";

/**
 * Create the upgrade configuration from environment variables.
 *
 * @param env - Environment variables (process.env or platform.env)
 * @returns Configured upgrade settings
 */
export function createUpgradeConfig(
  env: Record<string, string | undefined>,
): UpgradesConfig {
  return {
    /** Stripe secret key for planting sessions */
    stripeSecretKey: env.STRIPE_SECRET_KEY ?? "",
    /** Stripe webhook secret for verifying garden events */
    stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET ?? "",
    /** Garden shed URL for self-service management */
    gardenShedUrl: createGardenShedUrl(env),
    /** Planting URLs by stage and billing cycle */
    plantingUrls: {
      seedling: {
        monthly: env.STRIPE_PLANT_SEEDLING_MONTHLY,
        yearly: env.STRIPE_PLANT_SEEDLING_YEARLY,
      },
      sapling: {
        monthly: env.STRIPE_PLANT_SAPLING_MONTHLY,
        yearly: env.STRIPE_PLANT_SAPLING_YEARLY,
      },
      oak: {
        monthly: env.STRIPE_PLANT_OAK_MONTHLY,
        yearly: env.STRIPE_PLANT_OAK_YEARLY,
      },
      evergreen: {
        monthly: env.STRIPE_PLANT_EVERGREEN_MONTHLY,
        yearly: env.STRIPE_PLANT_EVERGREEN_YEARLY,
      },
    },
    /** Application URL for constructing return URLs */
    appUrl: env.APP_URL ?? "https://grove.place",
    /** Rate limiting configuration */
    rateLimits: {
      cultivate: {
        limit: parseInt(env.RATE_LIMIT_CULTIVATE ?? "20", 10),
        windowSeconds: 3600, // 1 hour
      },
      tend: {
        limit: parseInt(env.RATE_LIMIT_TEND ?? "20", 10),
        windowSeconds: 3600,
      },
      growth: {
        limit: parseInt(env.RATE_LIMIT_GROWTH ?? "100", 10),
        windowSeconds: 3600,
      },
    },
  };
}

/**
 * Create the garden shed URL.
 */
function createGardenShedUrl(env: Record<string, string | undefined>): string {
  // Use explicit shed URL if configured
  if (env.GARDEN_SHED_URL) {
    return env.GARDEN_SHED_URL;
  }

  // Fall back to constructing from app URL
  const appUrl = env.APP_URL ?? "https://grove.place";
  return `${appUrl}/api/grafts/upgrades/tend`;
}

/**
 * Get the planting URL for a specific stage and billing cycle.
 *
 * @param config - Upgrade configuration
 * @param stage - Target growth stage
 * @param billingCycle - Billing cycle
 * @returns Planting URL or undefined if not configured
 */
export function getPlantingUrl(
  config: UpgradesConfig,
  stage: string,
  billingCycle: "monthly" | "yearly",
): string | undefined {
  const urls = config.plantingUrls[stage as keyof typeof config.plantingUrls];
  if (!urls) {
    return undefined;
  }
  return billingCycle === "yearly" ? urls.yearly : urls.monthly;
}

/**
 * Validate that a stage can be cultivated to.
 *
 * @param config - Upgrade configuration
 * @param stage - Stage to validate
 * @returns true if the stage can be cultivated to
 */
export function canCultivateTo(config: UpgradesConfig, stage: string): boolean {
  const urls = config.plantingUrls[stage as keyof typeof config.plantingUrls];
  return (
    urls !== undefined &&
    (urls.monthly !== undefined || urls.yearly !== undefined)
  );
}
