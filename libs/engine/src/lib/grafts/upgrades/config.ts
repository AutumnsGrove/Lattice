/**
 * UpgradesGraft Configuration
 *
 * Environment-driven configuration for cultivation and garden management.
 * All Stripe logic now lives in billing-api — this config only provides
 * the app URL for constructing redirect URLs and rate limit settings.
 */

import type { UpgradesConfig } from "./types";

/**
 * Create the upgrade configuration from environment variables.
 *
 * @param env - Environment variables (process.env or platform.env)
 * @returns Configured upgrade settings
 */
export function createUpgradeConfig(env: Record<string, string | undefined>): UpgradesConfig {
	return {
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
