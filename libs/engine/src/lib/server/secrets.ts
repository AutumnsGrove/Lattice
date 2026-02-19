/**
 * Factory and Exports for SecretsManager
 *
 * Provides a convenient factory function to create SecretsManager instances
 * from the Worker environment, handling KEK retrieval from Secrets Store.
 */

import { SecretsManager } from "./secrets-manager";

/**
 * Create a SecretsManager instance from the Worker environment.
 * Call once per request and reuse.
 *
 * @example
 * ```ts
 * const secrets = await createSecretsManager(platform.env);
 * const token = await secrets.getSecret(tenantId, 'github_token');
 * ```
 *
 * @throws If GROVE_KEK secret is not configured
 */
export async function createSecretsManager(env: {
  DB: D1Database;
  GROVE_KEK?: string;
}): Promise<SecretsManager> {
  if (!env.GROVE_KEK) {
    throw new Error(
      "GROVE_KEK secret not configured. Run: wrangler secret put GROVE_KEK",
    );
  }

  return new SecretsManager(env.DB, env.GROVE_KEK);
}

// Re-export for direct usage
export { SecretsManager } from "./secrets-manager";
export type { TenantSecret } from "./secrets-manager";
