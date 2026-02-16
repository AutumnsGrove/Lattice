/**
 * Timeline Curio Secrets Helper
 *
 * Provides token retrieval with graceful migration from legacy encryption
 * (TOKEN_ENCRYPTION_KEY) to envelope encryption (SecretsManager).
 *
 * Migration strategy:
 * 1. Try SecretsManager first (new system, per-tenant isolation)
 * 2. Fall back to legacy column + TOKEN_ENCRYPTION_KEY
 * 3. Auto-migrate legacy tokens to SecretsManager on successful read
 */

import { createSecretsManager, type SecretsManager } from "$lib/server/secrets";
import { safeDecryptToken } from "$lib/server/encryption";

/** Secret key names for Timeline tokens in SecretsManager */
export const TIMELINE_SECRET_KEYS = {
  GITHUB_TOKEN: "timeline_github_token",
  OPENROUTER_KEY: "timeline_openrouter_key",
} as const;

export type TimelineSecretKey =
  (typeof TIMELINE_SECRET_KEYS)[keyof typeof TIMELINE_SECRET_KEYS];

/**
 * Environment bindings needed for token operations
 */
interface TokenEnv {
  DB: D1Database;
  GROVE_KEK?: string;
  TOKEN_ENCRYPTION_KEY?: string;
}

/**
 * Result of a token retrieval operation
 */
export interface TokenResult {
  token: string | null;
  source: "secrets_manager" | "legacy" | "none";
  migrated: boolean;
}

/** Tag for consistent log grepping */
const TAG = "[Timeline Secrets]";

/**
 * Format an error for logging without leaking secret values.
 * Extracts the message string so catch blocks produce useful output.
 */
function errorDetail(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

/**
 * Summarize which encryption bindings are available for diagnostics.
 * NEVER logs actual key values — only presence/absence and basic format info.
 */
function envDiagnostic(env: TokenEnv): string {
  const parts: string[] = [];

  if (env.GROVE_KEK) {
    const len = env.GROVE_KEK.length;
    const isHex = /^[0-9a-fA-F]+$/.test(env.GROVE_KEK);
    parts.push(
      `GROVE_KEK: ${len} chars, ${isHex ? "hex" : "NOT hex (wrong format!)"}`,
    );
  } else {
    parts.push("GROVE_KEK: missing");
  }

  parts.push(
    `TOKEN_ENCRYPTION_KEY: ${env.TOKEN_ENCRYPTION_KEY ? "present" : "missing"}`,
  );

  return parts.join(", ");
}

/**
 * Get a Timeline token with graceful migration from legacy encryption.
 *
 * Priority:
 * 1. SecretsManager (envelope encryption) - preferred, per-tenant isolation
 * 2. Legacy column + TOKEN_ENCRYPTION_KEY - fallback with auto-migrate
 *
 * @param env - Platform environment with DB and encryption bindings
 * @param tenantId - The tenant ID
 * @param keyName - Which secret to retrieve
 * @param legacyColumnValue - Value from the legacy encrypted column (may be null)
 * @returns TokenResult with the decrypted token and metadata
 */
export async function getTimelineToken(
  env: TokenEnv,
  tenantId: string,
  keyName: TimelineSecretKey,
  legacyColumnValue: string | null,
): Promise<TokenResult> {
  // Try new SecretsManager system first
  if (env.GROVE_KEK) {
    try {
      const secrets = await createSecretsManager({
        DB: env.DB,
        GROVE_KEK: env.GROVE_KEK,
      });
      const token = await secrets.safeGetSecret(tenantId, keyName);

      if (token) {
        return { token, source: "secrets_manager", migrated: false };
      }
    } catch (error) {
      console.error(
        `${TAG} SecretsManager.get FAILED for ${keyName}: ${errorDetail(error)}. ` +
          `Env: ${envDiagnostic(env)}. Falling back to legacy.`,
      );
      // Continue to legacy fallback
    }
  } else {
    console.warn(
      `${TAG} getTimelineToken(${keyName}): GROVE_KEK not configured, skipping SecretsManager`,
    );
  }

  // Fall back to legacy column + TOKEN_ENCRYPTION_KEY
  if (legacyColumnValue && env.TOKEN_ENCRYPTION_KEY) {
    const token = await safeDecryptToken(
      legacyColumnValue,
      env.TOKEN_ENCRYPTION_KEY,
    );

    if (token) {
      // Auto-migrate to SecretsManager if available
      let migrated = false;
      if (env.GROVE_KEK) {
        try {
          const secrets = await createSecretsManager({
            DB: env.DB,
            GROVE_KEK: env.GROVE_KEK,
          });
          await secrets.setSecret(tenantId, keyName, token);
          migrated = true;
          console.warn(
            `${TAG} Auto-migrated ${keyName} for tenant ${tenantId} from legacy to SecretsManager`,
          );
        } catch (error) {
          console.warn(
            `${TAG} Failed to auto-migrate ${keyName}: ${errorDetail(error)}. ` +
              `Token still works from legacy, will retry next read.`,
          );
        }
      }

      return { token, source: "legacy", migrated };
    }
  }

  // Also try legacy column without encryption (plaintext fallback for dev)
  if (legacyColumnValue && !env.TOKEN_ENCRYPTION_KEY) {
    // Check if it looks like an unencrypted token (no v1: prefix)
    if (!legacyColumnValue.startsWith("v1:")) {
      console.warn(
        `${TAG} Using PLAINTEXT legacy token for ${keyName} — no encryption configured. ` +
          `Env: ${envDiagnostic(env)}`,
      );
      return { token: legacyColumnValue, source: "legacy", migrated: false };
    }

    // v1: encrypted token but no decryption key — permanently unreadable
    console.error(
      `${TAG} UNREADABLE TOKEN: Found v1: encrypted ${keyName} but TOKEN_ENCRYPTION_KEY is missing. ` +
        `This token was encrypted with a key that is no longer available. ` +
        `The user must re-save a new token value to overwrite it. ` +
        `Env: ${envDiagnostic(env)}`,
    );
  }

  return { token: null, source: "none", migrated: false };
}

/**
 * Save a Timeline token using SecretsManager (preferred) or legacy encryption.
 *
 * @param env - Platform environment with DB and encryption bindings
 * @param tenantId - The tenant ID
 * @param keyName - Which secret to store
 * @param plainToken - The plaintext token value
 * @returns Object indicating which system was used and why
 */
export async function setTimelineToken(
  env: TokenEnv,
  tenantId: string,
  keyName: TimelineSecretKey,
  plainToken: string,
): Promise<{
  system: "secrets_manager" | "legacy";
  legacyValue: string | null;
  fallbackReason?: string;
}> {
  // Prefer SecretsManager if available
  if (env.GROVE_KEK) {
    try {
      const secrets = await createSecretsManager({
        DB: env.DB,
        GROVE_KEK: env.GROVE_KEK,
      });
      await secrets.setSecret(tenantId, keyName, plainToken);

      console.warn(
        `${TAG} Token ${keyName} saved via SecretsManager (envelope encryption)`,
      );
      // Return null for legacy column to clear it
      return { system: "secrets_manager", legacyValue: null };
    } catch (error) {
      const reason = errorDetail(error);
      console.error(
        `${TAG} SecretsManager.set FAILED for ${keyName}: ${reason}. ` +
          `Env: ${envDiagnostic(env)}. Falling back to legacy storage.`,
      );
      // Fall through to legacy, but carry the reason
      return await setTimelineTokenLegacy(env, keyName, plainToken, reason);
    }
  } else {
    console.warn(
      `${TAG} setTimelineToken(${keyName}): GROVE_KEK not configured, using legacy storage`,
    );
  }

  return await setTimelineTokenLegacy(
    env,
    keyName,
    plainToken,
    "GROVE_KEK not configured",
  );
}

/**
 * Internal: Legacy token storage path. Extracted so the fallback reason
 * can be threaded through for diagnostics.
 */
async function setTimelineTokenLegacy(
  env: TokenEnv,
  keyName: TimelineSecretKey,
  plainToken: string,
  fallbackReason: string,
): Promise<{
  system: "legacy";
  legacyValue: string;
  fallbackReason: string;
}> {
  if (env.TOKEN_ENCRYPTION_KEY) {
    const { encryptToken } = await import("$lib/server/encryption");
    const encrypted = await encryptToken(plainToken, env.TOKEN_ENCRYPTION_KEY);
    console.warn(
      `${TAG} Token ${keyName} saved via legacy encryption (TOKEN_ENCRYPTION_KEY). ` +
        `Reason for legacy: ${fallbackReason}`,
    );
    return { system: "legacy", legacyValue: encrypted, fallbackReason };
  }

  // No encryption available - store plaintext (dev only, with warning)
  console.warn(
    `${TAG} PLAINTEXT STORAGE for ${keyName} — no encryption available! ` +
      `Reason for legacy: ${fallbackReason}. ` +
      `Env: ${envDiagnostic(env)}. ` +
      `This is only acceptable in development.`,
  );
  return { system: "legacy", legacyValue: plainToken, fallbackReason };
}

/**
 * Delete a Timeline token from SecretsManager.
 * Legacy column should be cleared separately via SQL.
 */
export async function deleteTimelineToken(
  env: TokenEnv,
  tenantId: string,
  keyName: TimelineSecretKey,
): Promise<boolean> {
  if (!env.GROVE_KEK) {
    console.warn(
      `${TAG} deleteTimelineToken(${keyName}): GROVE_KEK not configured, cannot delete from SecretsManager`,
    );
    return false;
  }

  try {
    const secrets = await createSecretsManager({
      DB: env.DB,
      GROVE_KEK: env.GROVE_KEK,
    });
    const deleted = await secrets.deleteSecret(tenantId, keyName);
    console.warn(
      `${TAG} Deleted ${keyName} from SecretsManager: ${deleted ? "found and removed" : "not found"}`,
    );
    return deleted;
  } catch (error) {
    console.error(
      `${TAG} deleteTimelineToken FAILED for ${keyName}: ${errorDetail(error)}. ` +
        `Env: ${envDiagnostic(env)}`,
    );
    return false;
  }
}

/**
 * Check if a Timeline token exists in either system.
 */
export async function hasTimelineToken(
  env: TokenEnv,
  tenantId: string,
  keyName: TimelineSecretKey,
  legacyColumnValue: string | null,
): Promise<boolean> {
  // Check SecretsManager first
  if (env.GROVE_KEK) {
    try {
      const secrets = await createSecretsManager({
        DB: env.DB,
        GROVE_KEK: env.GROVE_KEK,
      });
      if (await secrets.hasSecret(tenantId, keyName)) {
        return true;
      }
    } catch (error) {
      console.error(
        `${TAG} hasTimelineToken SecretsManager check FAILED for ${keyName}: ${errorDetail(error)}. ` +
          `Env: ${envDiagnostic(env)}. Falling back to legacy column check.`,
      );
    }
  }

  // Check legacy column — but v1: encrypted tokens without TOKEN_ENCRYPTION_KEY
  // are permanently unreadable, so don't report them as "present"
  if (!legacyColumnValue) return false;
  if (legacyColumnValue.startsWith("v1:") && !env.TOKEN_ENCRYPTION_KEY) {
    console.warn(
      `${TAG} hasTimelineToken(${keyName}): v1: encrypted value exists but TOKEN_ENCRYPTION_KEY missing — reporting as absent`,
    );
    return false;
  }
  return true;
}

/**
 * Create a SecretsManager instance, handling missing GROVE_KEK gracefully.
 * Returns null if GROVE_KEK is not configured.
 */
export async function maybeCreateSecretsManager(
  env: TokenEnv,
): Promise<SecretsManager | null> {
  if (!env.GROVE_KEK) {
    console.warn(`${TAG} maybeCreateSecretsManager: GROVE_KEK not configured`);
    return null;
  }

  try {
    return await createSecretsManager({
      DB: env.DB,
      GROVE_KEK: env.GROVE_KEK,
    });
  } catch (error) {
    console.error(
      `${TAG} maybeCreateSecretsManager FAILED: ${errorDetail(error)}. ` +
        `Env: ${envDiagnostic(env)}`,
    );
    return null;
  }
}
