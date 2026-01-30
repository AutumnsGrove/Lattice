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
 * @throws If GROVE_KEK binding is not configured
 */
export async function createSecretsManager(env: {
  DB: D1Database;
  GROVE_KEK?: { get(): Promise<string> };
}): Promise<SecretsManager> {
  if (!env.GROVE_KEK) {
    throw new Error(
      "GROVE_KEK binding not configured. See wrangler.toml for setup instructions.",
    );
  }

  const kek = await env.GROVE_KEK.get();
  return new SecretsManager(env.DB, kek);
}

// Re-export for direct usage
export { SecretsManager } from "./secrets-manager";
export type { TenantSecret } from "./secrets-manager";
