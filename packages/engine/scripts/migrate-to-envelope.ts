/**
 * Envelope Encryption Migration Script
 *
 * Migrates secrets from old single-key encryption to envelope encryption.
 * This script should be run once to transition existing tenant secrets.
 *
 * PREREQUISITES:
 * 1. Apply database migrations FIRST:
 *    wrangler d1 migrations apply grove-engine-db --local
 *    wrangler d1 migrations apply grove-engine-db --remote
 *
 * 2. Configure GROVE_KEK in Cloudflare Secrets Store:
 *    wrangler secrets-store store create grove-secrets --remote
 *    wrangler secrets-store secret put GROVE_KEK --store grove-secrets --remote
 *
 * Usage:
 *   npx wrangler d1 execute grove-engine-db --command "SELECT * FROM ..." --local
 *   Then run this script with the appropriate environment
 *
 * Strategy:
 * 1. Verify required tables exist (fails fast with helpful message if not)
 * 2. Fetch all existing encrypted secrets (using old TOKEN_ENCRYPTION_KEY)
 * 3. Decrypt each with the old key
 * 4. Re-encrypt using the new envelope encryption system
 * 5. Track success/failure counts
 *
 * Safety:
 * - Script is idempotent (can be re-run safely)
 * - Errors are logged but don't stop other migrations
 * - Original data is preserved until explicitly removed
 * - Preflight checks ensure migrations are applied first
 */

import { SecretsManager } from "../src/lib/server/secrets-manager";
import { decryptToken, isEncryptedToken } from "../src/lib/server/encryption";

interface OldSecret {
  tenant_id: string;
  key_name: string;
  encrypted_value: string;
}

interface MigrationResult {
  success: number;
  failed: number;
  skipped: number;
  errors: Array<{ tenantId: string; keyName: string; error: string }>;
}

/**
 * Verify required tables exist before migration.
 * Throws with helpful message if migrations haven't been applied.
 */
async function verifyTablesExist(db: D1Database): Promise<void> {
  // Check for tenant_secrets table (migration 039)
  try {
    await db
      .prepare(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name='tenant_secrets'",
      )
      .first();
  } catch {
    throw new Error(
      "Migration check failed. Ensure D1 is accessible and migrations 038/039 have been applied:\n" +
        "  wrangler d1 migrations apply grove-engine-db --local\n" +
        "  wrangler d1 migrations apply grove-engine-db --remote",
    );
  }

  const tableExists = await db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='tenant_secrets'",
    )
    .first<{ name: string }>();

  if (!tableExists) {
    throw new Error(
      "Required table 'tenant_secrets' not found.\n" +
        "Please run migrations before this script:\n" +
        "  wrangler d1 migrations apply grove-engine-db --local\n" +
        "  wrangler d1 migrations apply grove-engine-db --remote",
    );
  }

  // Check for encrypted_dek column on tenants (migration 038)
  const columns = await db
    .prepare("PRAGMA table_info(tenants)")
    .all<{ name: string }>();

  const hasEncryptedDek = columns.results.some(
    (col) => col.name === "encrypted_dek",
  );
  if (!hasEncryptedDek) {
    throw new Error(
      "Column 'encrypted_dek' not found on tenants table.\n" +
        "Please run migration 038_add_encrypted_dek.sql first.",
    );
  }
}

/**
 * Migrate all secrets from old single-key encryption to envelope encryption.
 *
 * IMPORTANT: Run migrations 038 and 039 BEFORE running this script.
 *
 * @param db - D1 database instance
 * @param kekHex - New KEK from Secrets Store (64 hex chars)
 * @param oldKeyHex - Old TOKEN_ENCRYPTION_KEY (64 hex chars)
 * @param dryRun - If true, only report what would be migrated
 */
export async function migrateToEnvelope(
  db: D1Database,
  kekHex: string,
  oldKeyHex: string,
  dryRun = false,
): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  console.log(`[Migration] Starting envelope encryption migration...`);
  console.log(`[Migration] Dry run: ${dryRun}`);

  // Validate key formats (fail fast with clear errors)
  if (kekHex.length !== 64 || !/^[0-9a-fA-F]+$/.test(kekHex)) {
    throw new Error(
      "Invalid KEK format. Must be 64 hex characters (256 bits).\n" +
        "Generate with: openssl rand -hex 32",
    );
  }
  if (oldKeyHex.length !== 64 || !/^[0-9a-fA-F]+$/.test(oldKeyHex)) {
    throw new Error(
      "Invalid old key format. Must be 64 hex characters (256 bits).\n" +
        "This should be your existing TOKEN_ENCRYPTION_KEY value.",
    );
  }

  // Verify tables exist before proceeding
  console.log(`[Migration] Verifying required tables...`);
  await verifyTablesExist(db);
  console.log(`[Migration] Tables verified ✓`);

  // Create the new secrets manager
  const manager = new SecretsManager(db, kekHex);

  // Fetch all existing secrets from the old location
  // Adjust this query based on where old secrets are stored
  // This example assumes they're in a generic "secrets" column somewhere
  const oldSecrets = await db
    .prepare(
      `
      SELECT tenant_id, key_name, encrypted_value
      FROM tenant_secrets
      WHERE encrypted_value IS NOT NULL
    `,
    )
    .all<OldSecret>();

  console.log(
    `[Migration] Found ${oldSecrets.results.length} secrets to check`,
  );

  for (const secret of oldSecrets.results) {
    const { tenant_id, key_name, encrypted_value } = secret;

    try {
      // Check if this is already in envelope format
      // Envelope-encrypted values use the same v1: format, so we check
      // by attempting to decrypt with the new system first
      let needsMigration = false;

      try {
        // Try to get it with the new system
        const existing = await manager.getSecret(tenant_id, key_name);
        if (existing !== null) {
          // Already migrated or new format
          console.log(
            `[Migration] Skipping ${tenant_id}/${key_name} (already migrated)`,
          );
          result.skipped++;
          continue;
        }
      } catch {
        // Couldn't decrypt with new system, needs migration
        needsMigration = true;
      }

      if (!isEncryptedToken(encrypted_value)) {
        console.log(
          `[Migration] Skipping ${tenant_id}/${key_name} (not encrypted)`,
        );
        result.skipped++;
        continue;
      }

      // Decrypt with old key
      let plainValue: string;
      try {
        plainValue = await decryptToken(encrypted_value, oldKeyHex);
      } catch (decryptError) {
        // Couldn't decrypt with old key - maybe already migrated or corrupted
        console.warn(
          `[Migration] Cannot decrypt ${tenant_id}/${key_name} with old key:`,
          decryptError,
        );
        result.errors.push({
          tenantId: tenant_id,
          keyName: key_name,
          error: `Decryption failed: ${decryptError}`,
        });
        result.failed++;
        continue;
      }

      if (dryRun) {
        console.log(`[Migration] Would migrate ${tenant_id}/${key_name}`);
        result.success++;
        continue;
      }

      // Re-encrypt with new envelope system
      await manager.setSecret(tenant_id, key_name, plainValue);

      console.log(`[Migration] Migrated ${tenant_id}/${key_name}`);
      result.success++;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(
        `[Migration] Failed ${tenant_id}/${key_name}:`,
        errorMessage,
      );
      result.errors.push({
        tenantId: tenant_id,
        keyName: key_name,
        error: errorMessage,
      });
      result.failed++;
    }
  }

  // Summary
  console.log(`\n[Migration] Complete!`);
  console.log(`  Success: ${result.success}`);
  console.log(`  Failed:  ${result.failed}`);
  console.log(`  Skipped: ${result.skipped}`);

  if (result.errors.length > 0) {
    console.log(`\n[Migration] Errors:`);
    for (const err of result.errors) {
      console.log(`  - ${err.tenantId}/${err.keyName}: ${err.error}`);
    }
  }

  return result;
}

/**
 * Migrate a specific tenant's GitHub token from the old git_dashboard table.
 * This is a common migration case for Grove.
 *
 * IMPORTANT: Run migrations 038 and 039 BEFORE running this function.
 */
export async function migrateGitDashboardTokens(
  db: D1Database,
  kekHex: string,
  oldKeyHex: string,
  dryRun = false,
): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  console.log(`[Migration] Migrating git_dashboard tokens...`);

  // Validate key formats (fail fast with clear errors)
  if (kekHex.length !== 64 || !/^[0-9a-fA-F]+$/.test(kekHex)) {
    throw new Error(
      "Invalid KEK format. Must be 64 hex characters (256 bits).",
    );
  }
  if (oldKeyHex.length !== 64 || !/^[0-9a-fA-F]+$/.test(oldKeyHex)) {
    throw new Error(
      "Invalid old key format. Must be 64 hex characters (256 bits).",
    );
  }

  // Verify tables exist before proceeding
  console.log(`[Migration] Verifying required tables...`);
  await verifyTablesExist(db);
  console.log(`[Migration] Tables verified ✓`);

  const manager = new SecretsManager(db, kekHex);

  // Fetch tokens from git_dashboard table
  const tokens = await db
    .prepare(
      `
      SELECT tenant_id, encrypted_token
      FROM git_dashboard
      WHERE encrypted_token IS NOT NULL
    `,
    )
    .all<{ tenant_id: string; encrypted_token: string }>();

  console.log(
    `[Migration] Found ${tokens.results.length} git_dashboard tokens`,
  );

  for (const row of tokens.results) {
    const { tenant_id, encrypted_token } = row;
    const keyName = "github_token"; // Standard key name for GitHub tokens

    try {
      // Check if already migrated
      const existing = await manager.safeGetSecret(tenant_id, keyName);
      if (existing !== null) {
        console.log(
          `[Migration] Skipping ${tenant_id} (already has github_token)`,
        );
        result.skipped++;
        continue;
      }

      if (!isEncryptedToken(encrypted_token)) {
        console.log(`[Migration] Skipping ${tenant_id} (not encrypted)`);
        result.skipped++;
        continue;
      }

      // Decrypt with old key
      let plainToken: string;
      try {
        plainToken = await decryptToken(encrypted_token, oldKeyHex);
      } catch {
        console.warn(`[Migration] Cannot decrypt token for ${tenant_id}`);
        result.failed++;
        continue;
      }

      if (dryRun) {
        console.log(`[Migration] Would migrate github_token for ${tenant_id}`);
        result.success++;
        continue;
      }

      // Store with new envelope system
      await manager.setSecret(tenant_id, keyName, plainToken);
      console.log(`[Migration] Migrated github_token for ${tenant_id}`);
      result.success++;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`[Migration] Failed ${tenant_id}:`, errorMessage);
      result.errors.push({
        tenantId: tenant_id,
        keyName: "github_token",
        error: errorMessage,
      });
      result.failed++;
    }
  }

  console.log(`\n[Migration] Git dashboard tokens complete!`);
  console.log(`  Success: ${result.success}`);
  console.log(`  Failed:  ${result.failed}`);
  console.log(`  Skipped: ${result.skipped}`);

  return result;
}
