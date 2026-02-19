/**
 * Envelope Encryption Manager for Tenant Secrets
 *
 * Provides per-tenant key isolation using envelope encryption:
 * - KEK (Key Encryption Key): Stored in Cloudflare Secrets Store
 * - DEK (Data Encryption Key): Per-tenant, stored encrypted in D1
 * - Secrets: Encrypted with tenant's DEK
 *
 * Benefits over single-key encryption:
 * - One tenant compromise ≠ all tenants compromised
 * - Key rotation only re-encrypts small DEKs, not all secrets
 * - KEK never touches application code or D1
 */

import { encryptToken, decryptToken, isEncryptedToken } from "./encryption";

export interface TenantSecret {
  keyName: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Generates a new 256-bit key as 64 hex characters.
 * Used for creating per-tenant DEKs.
 */
function generateDEKHex(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Manages tenant secrets using envelope encryption.
 *
 * Architecture:
 * - KEK (Key Encryption Key): Stored in Cloudflare Secrets Store
 * - DEK (Data Encryption Key): Per-tenant, stored encrypted in D1
 * - Secrets: Encrypted with tenant's DEK
 *
 * Usage:
 * ```ts
 * const secrets = new SecretsManager(env.DB, await env.GROVE_KEK.get());
 *
 * await secrets.setSecret('tenant_123', 'github_token', 'ghp_xxx');
 * const token = await secrets.getSecret('tenant_123', 'github_token');
 * ```
 *
 * ## Cache Behavior
 *
 * The DEK cache is per-instance and lives for the lifetime of the SecretsManager.
 * In Cloudflare Workers, each request typically gets a fresh isolate, so create
 * a new SecretsManager per request via `createSecretsManager(env)`. This ensures:
 * - No memory accumulation across requests
 * - DEKs cached only for the duration of a single request
 * - Multiple operations in one request benefit from cached DEK lookups
 */
export class SecretsManager {
  /** Per-instance DEK cache. Safe because instances are created per-request. */
  private dekCache: Map<string, string> = new Map();

  constructor(
    private db: D1Database,
    private kekHex: string,
  ) {
    // Validate KEK format immediately
    if (kekHex.length !== 64 || !/^[0-9a-fA-F]+$/.test(kekHex)) {
      const hasNonHex = /[^0-9a-fA-F]/.test(kekHex);
      throw new Error(
        `KEK must be 64 hex characters (256 bits). ` +
          `Got ${kekHex.length} chars${hasNonHex ? " with non-hex characters (was this generated with --format hex?)" : ""}.`,
      );
    }
  }

  /**
   * Get or create the DEK for a tenant.
   * DEKs are cached for the lifetime of this SecretsManager instance.
   */
  async getTenantDEK(tenantId: string): Promise<string> {
    // Return cached DEK if available
    const cached = this.dekCache.get(tenantId);
    if (cached) return cached;

    // Fetch tenant record
    const result = await this.db
      .prepare("SELECT encrypted_dek FROM tenants WHERE id = ?")
      .bind(tenantId)
      .first<{ encrypted_dek: string | null }>();

    if (!result) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }

    let dekHex: string;

    if (result.encrypted_dek && isEncryptedToken(result.encrypted_dek)) {
      // Decrypt existing DEK using KEK
      dekHex = await decryptToken(result.encrypted_dek, this.kekHex);
    } else {
      // Generate new DEK for this tenant
      dekHex = generateDEKHex();

      // Encrypt DEK with KEK and store
      const encryptedDek = await encryptToken(dekHex, this.kekHex);
      await this.db
        .prepare("UPDATE tenants SET encrypted_dek = ? WHERE id = ?")
        .bind(encryptedDek, tenantId)
        .run();
    }

    // Cache and return
    this.dekCache.set(tenantId, dekHex);
    return dekHex;
  }

  /**
   * Store a secret for a tenant.
   * Overwrites if key_name already exists.
   */
  async setSecret(
    tenantId: string,
    keyName: string,
    plainValue: string,
  ): Promise<void> {
    const dekHex = await this.getTenantDEK(tenantId);
    const encrypted = await encryptToken(plainValue, dekHex);

    await this.db
      .prepare(
        `
        INSERT INTO tenant_secrets (tenant_id, key_name, encrypted_value, updated_at)
        VALUES (?, ?, ?, datetime('now'))
        ON CONFLICT (tenant_id, key_name)
        DO UPDATE SET
          encrypted_value = excluded.encrypted_value,
          updated_at = datetime('now')
      `,
      )
      .bind(tenantId, keyName, encrypted)
      .run();
  }

  /**
   * Retrieve and decrypt a secret.
   * Returns null if not found.
   * Throws if decryption fails (wrong key, corrupted data).
   */
  async getSecret(tenantId: string, keyName: string): Promise<string | null> {
    const dekHex = await this.getTenantDEK(tenantId);

    const result = await this.db
      .prepare(
        "SELECT encrypted_value FROM tenant_secrets WHERE tenant_id = ? AND key_name = ?",
      )
      .bind(tenantId, keyName)
      .first<{ encrypted_value: string }>();

    if (!result) return null;

    return decryptToken(result.encrypted_value, dekHex);
  }

  /**
   * Safely get a secret, returning null on any error.
   * Useful for graceful degradation.
   */
  async safeGetSecret(
    tenantId: string,
    keyName: string,
  ): Promise<string | null> {
    try {
      return await this.getSecret(tenantId, keyName);
    } catch (error) {
      console.error(
        `[SecretsManager] safeGetSecret failed for ${tenantId}/${keyName}:`,
        error instanceof Error ? error.message : error,
      );
      return null;
    }
  }

  /**
   * Check if a secret exists without decrypting.
   */
  async hasSecret(tenantId: string, keyName: string): Promise<boolean> {
    const result = await this.db
      .prepare(
        "SELECT 1 FROM tenant_secrets WHERE tenant_id = ? AND key_name = ?",
      )
      .bind(tenantId, keyName)
      .first();

    return result !== null;
  }

  /**
   * Delete a secret.
   */
  async deleteSecret(tenantId: string, keyName: string): Promise<boolean> {
    const result = await this.db
      .prepare(
        "DELETE FROM tenant_secrets WHERE tenant_id = ? AND key_name = ?",
      )
      .bind(tenantId, keyName)
      .run();

    return result.meta.changes > 0;
  }

  /**
   * List all secret keys for a tenant (not the values).
   */
  async listSecrets(tenantId: string): Promise<TenantSecret[]> {
    const results = await this.db
      .prepare(
        "SELECT key_name, created_at, updated_at FROM tenant_secrets WHERE tenant_id = ? ORDER BY key_name",
      )
      .bind(tenantId)
      .all<{ key_name: string; created_at: string; updated_at: string }>();

    return results.results.map((r) => ({
      keyName: r.key_name,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  /**
   * Delete all secrets for a tenant.
   * Call this when deleting a tenant account.
   */
  async deleteAllSecrets(tenantId: string): Promise<number> {
    const result = await this.db
      .prepare("DELETE FROM tenant_secrets WHERE tenant_id = ?")
      .bind(tenantId)
      .run();

    // Also clear the DEK
    await this.db
      .prepare("UPDATE tenants SET encrypted_dek = NULL WHERE id = ?")
      .bind(tenantId)
      .run();

    this.dekCache.delete(tenantId);

    return result.meta.changes;
  }

  /**
   * Rotate a tenant's DEK.
   * Re-encrypts all their secrets with a new DEK.
   * Use when a tenant's DEK may have been compromised.
   *
   * Uses D1 batch operations for better performance with many secrets.
   */
  async rotateTenantDEK(tenantId: string): Promise<{ rotated: number }> {
    // Get current DEK
    const oldDekHex = await this.getTenantDEK(tenantId);

    // Generate new DEK
    const newDekHex = generateDEKHex();

    // Get all secrets for this tenant
    const secrets = await this.db
      .prepare(
        "SELECT key_name, encrypted_value FROM tenant_secrets WHERE tenant_id = ?",
      )
      .bind(tenantId)
      .all<{ key_name: string; encrypted_value: string }>();

    // Re-encrypt each secret and collect batch statements
    const batchStatements: D1PreparedStatement[] = [];
    const failedSecrets: string[] = [];

    for (const secret of secrets.results) {
      try {
        // Decrypt with old DEK
        const plainValue = await decryptToken(
          secret.encrypted_value,
          oldDekHex,
        );

        // Encrypt with new DEK
        const newEncrypted = await encryptToken(plainValue, newDekHex);

        // Add to batch
        batchStatements.push(
          this.db
            .prepare(
              "UPDATE tenant_secrets SET encrypted_value = ?, updated_at = datetime('now') WHERE tenant_id = ? AND key_name = ?",
            )
            .bind(newEncrypted, tenantId, secret.key_name),
        );
      } catch (error) {
        console.error(
          `Failed to re-encrypt secret ${tenantId}/${secret.key_name}:`,
          error,
        );
        failedSecrets.push(secret.key_name);
        // Continue with other secrets
      }
    }

    // Execute all updates in a single batch for better performance
    // D1 batch() runs statements in a transaction-like manner
    if (batchStatements.length > 0) {
      // Encrypt and store new DEK as part of the batch
      const encryptedNewDek = await encryptToken(newDekHex, this.kekHex);
      batchStatements.push(
        this.db
          .prepare("UPDATE tenants SET encrypted_dek = ? WHERE id = ?")
          .bind(encryptedNewDek, tenantId),
      );

      await this.db.batch(batchStatements);
    } else {
      // No secrets to rotate, just update the DEK
      const encryptedNewDek = await encryptToken(newDekHex, this.kekHex);
      await this.db
        .prepare("UPDATE tenants SET encrypted_dek = ? WHERE id = ?")
        .bind(encryptedNewDek, tenantId)
        .run();
    }

    // Update cache
    this.dekCache.set(tenantId, newDekHex);

    const rotated = batchStatements.length > 0 ? batchStatements.length - 1 : 0; // Subtract 1 for DEK update
    if (failedSecrets.length > 0) {
      console.warn(
        `[SecretsManager] DEK rotation completed with ${failedSecrets.length} failed secrets: ${failedSecrets.join(", ")}`,
      );
    }

    return { rotated };
  }

  /**
   * Debug helper: Check if a tenant's DEK can be decrypted.
   * Does not expose the actual DEK.
   */
  async debugTenantDEK(tenantId: string): Promise<{
    exists: boolean;
    canDecrypt: boolean;
    error?: string;
  }> {
    const result = await this.db
      .prepare("SELECT encrypted_dek FROM tenants WHERE id = ?")
      .bind(tenantId)
      .first<{ encrypted_dek: string | null }>();

    if (!result) {
      return { exists: false, canDecrypt: false, error: "Tenant not found" };
    }

    if (!result.encrypted_dek) {
      return {
        exists: false,
        canDecrypt: false,
        error: "No DEK stored (will be created on first use)",
      };
    }

    try {
      await decryptToken(result.encrypted_dek, this.kekHex);
      return { exists: true, canDecrypt: true };
    } catch (e) {
      return {
        exists: true,
        canDecrypt: false,
        error: e instanceof Error ? e.message : "Decryption failed",
      };
    }
  }

  /**
   * Migrate a secret from old single-key encryption to envelope encryption.
   * Call this when reading a secret that might be in the old format.
   *
   * @param oldKeyHex - The old TOKEN_ENCRYPTION_KEY
   */
  async migrateSecret(
    tenantId: string,
    keyName: string,
    oldEncryptedValue: string,
    oldKeyHex: string,
  ): Promise<string> {
    // Decrypt with old key
    const plainValue = await decryptToken(oldEncryptedValue, oldKeyHex);

    // Re-encrypt with new envelope system
    await this.setSecret(tenantId, keyName, plainValue);

    return plainValue;
  }
}
