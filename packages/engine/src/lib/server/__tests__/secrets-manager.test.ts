/**
 * Tests for SecretsManager (Envelope Encryption)
 *
 * Tests user-facing behavior: storing secrets, retrieving them,
 * tenant isolation, key rotation, and error handling.
 *
 * These are integration-style tests using a mock D1 database.
 * They verify the complete encryption/decryption flow.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { SecretsManager, type TenantSecret } from "../secrets-manager";

// Valid 256-bit KEK (64 hex characters)
const TEST_KEK =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

// Different valid key for testing cross-tenant isolation
const DIFFERENT_KEK =
  "fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210";

/**
 * Create a mock D1 database that stores data in memory.
 * This simulates real D1 behavior for testing.
 */
function createMockD1() {
  // In-memory storage
  const tenants = new Map<
    string,
    { id: string; encrypted_dek: string | null }
  >();
  const secrets = new Map<
    string,
    {
      tenant_id: string;
      key_name: string;
      encrypted_value: string;
      created_at: string;
      updated_at: string;
    }
  >();

  // Add test tenants
  tenants.set("tenant_1", { id: "tenant_1", encrypted_dek: null });
  tenants.set("tenant_2", { id: "tenant_2", encrypted_dek: null });

  return {
    prepare: (sql: string) => {
      const normalizedSql = sql.replace(/\s+/g, " ").trim().toLowerCase();

      return {
        bind: (...params: unknown[]) => ({
          run: async () => {
            // Handle INSERT/UPDATE for tenant_secrets
            if (normalizedSql.includes("insert into tenant_secrets")) {
              const [tenantId, keyName, encryptedValue] = params as string[];
              const key = `${tenantId}:${keyName}`;
              const now = new Date().toISOString();
              secrets.set(key, {
                tenant_id: tenantId,
                key_name: keyName,
                encrypted_value: encryptedValue,
                created_at: secrets.get(key)?.created_at || now,
                updated_at: now,
              });
              return { success: true, meta: { changes: 1 } };
            }

            // Handle UPDATE for tenant encrypted_dek
            if (normalizedSql.includes("update tenants set encrypted_dek")) {
              const [encryptedDek, tenantId] = params as string[];
              const tenant = tenants.get(tenantId);
              if (tenant) {
                tenant.encrypted_dek = encryptedDek;
              }
              return { success: true, meta: { changes: tenant ? 1 : 0 } };
            }

            // Handle DELETE for tenant_secrets (single secret)
            if (
              normalizedSql.includes(
                "delete from tenant_secrets where tenant_id = ? and key_name = ?",
              )
            ) {
              const [tenantId, keyName] = params as string[];
              const key = `${tenantId}:${keyName}`;
              const existed = secrets.has(key);
              secrets.delete(key);
              return { success: true, meta: { changes: existed ? 1 : 0 } };
            }

            // Handle DELETE for tenant_secrets (all for tenant)
            if (
              normalizedSql.includes(
                "delete from tenant_secrets where tenant_id = ?",
              )
            ) {
              const [tenantId] = params as string[];
              let deleted = 0;
              for (const [key] of secrets) {
                if (key.startsWith(`${tenantId}:`)) {
                  secrets.delete(key);
                  deleted++;
                }
              }
              return { success: true, meta: { changes: deleted } };
            }

            // Handle UPDATE for tenant_secrets (during rotation)
            if (
              normalizedSql.includes(
                "update tenant_secrets set encrypted_value",
              )
            ) {
              const [encryptedValue, tenantId, keyName] = params as string[];
              const key = `${tenantId}:${keyName}`;
              const secret = secrets.get(key);
              if (secret) {
                secret.encrypted_value = encryptedValue;
                secret.updated_at = new Date().toISOString();
              }
              return { success: true, meta: { changes: secret ? 1 : 0 } };
            }

            return { success: true, meta: { changes: 0 } };
          },

          first: async <T>(): Promise<T | null> => {
            // Handle SELECT from tenants
            if (normalizedSql.includes("select encrypted_dek from tenants")) {
              const [tenantId] = params as string[];
              const tenant = tenants.get(tenantId);
              if (!tenant) return null;
              return { encrypted_dek: tenant.encrypted_dek } as T;
            }

            // Handle SELECT from tenant_secrets (single secret)
            if (
              normalizedSql.includes(
                "select encrypted_value from tenant_secrets",
              )
            ) {
              const [tenantId, keyName] = params as string[];
              const secret = secrets.get(`${tenantId}:${keyName}`);
              if (!secret) return null;
              return { encrypted_value: secret.encrypted_value } as T;
            }

            // Handle SELECT 1 (exists check)
            if (normalizedSql.includes("select 1 from tenant_secrets")) {
              const [tenantId, keyName] = params as string[];
              return secrets.has(`${tenantId}:${keyName}`) ? ({} as T) : null;
            }

            return null;
          },

          all: async <T>(): Promise<{ results: T[] }> => {
            // Handle SELECT all secrets for a tenant (list)
            if (
              normalizedSql.includes(
                "select key_name, created_at, updated_at from tenant_secrets",
              )
            ) {
              const [tenantId] = params as string[];
              const results: T[] = [];
              for (const [key, secret] of secrets) {
                if (key.startsWith(`${tenantId}:`)) {
                  results.push({
                    key_name: secret.key_name,
                    created_at: secret.created_at,
                    updated_at: secret.updated_at,
                  } as T);
                }
              }
              // Sort by key_name
              results.sort((a, b) =>
                (a as { key_name: string }).key_name.localeCompare(
                  (b as { key_name: string }).key_name,
                ),
              );
              return { results };
            }

            // Handle SELECT all secrets for rotation
            if (
              normalizedSql.includes(
                "select key_name, encrypted_value from tenant_secrets",
              )
            ) {
              const [tenantId] = params as string[];
              const results: T[] = [];
              for (const [key, secret] of secrets) {
                if (key.startsWith(`${tenantId}:`)) {
                  results.push({
                    key_name: secret.key_name,
                    encrypted_value: secret.encrypted_value,
                  } as T);
                }
              }
              return { results };
            }

            return { results: [] };
          },
        }),
      };
    },

    // Helper to reset state between tests
    _reset: () => {
      tenants.clear();
      secrets.clear();
      tenants.set("tenant_1", { id: "tenant_1", encrypted_dek: null });
      tenants.set("tenant_2", { id: "tenant_2", encrypted_dek: null });
    },

    // Helper to add a tenant for specific tests
    _addTenant: (id: string) => {
      tenants.set(id, { id, encrypted_dek: null });
    },

    // D1 batch() support for rotation operations
    batch: async (statements: Array<{ run: () => Promise<unknown> }>) => {
      const results = [];
      for (const stmt of statements) {
        results.push(await stmt.run());
      }
      return results;
    },
  } as unknown as D1Database & {
    _reset: () => void;
    _addTenant: (id: string) => void;
  };
}

describe("SecretsManager", () => {
  let db: D1Database & { _reset: () => void; _addTenant: (id: string) => void };

  beforeEach(() => {
    db = createMockD1();
  });

  describe("initialization", () => {
    it("should reject invalid KEK (too short)", () => {
      expect(() => new SecretsManager(db, "too-short")).toThrow(
        "KEK must be 64 hex characters",
      );
    });

    it("should reject invalid KEK (non-hex characters)", () => {
      const invalidKey = "x".repeat(64); // Valid length but not hex
      expect(() => new SecretsManager(db, invalidKey)).toThrow(
        "KEK must be 64 hex characters",
      );
    });

    it("should accept valid KEK", () => {
      expect(() => new SecretsManager(db, TEST_KEK)).not.toThrow();
    });
  });

  describe("store and retrieve secrets", () => {
    it("should store and retrieve a secret round-trip", async () => {
      const manager = new SecretsManager(db, TEST_KEK);

      await manager.setSecret("tenant_1", "api_key", "sk-test-12345");
      const retrieved = await manager.getSecret("tenant_1", "api_key");

      expect(retrieved).toBe("sk-test-12345");
    });

    it("should return null for non-existent secrets", async () => {
      const manager = new SecretsManager(db, TEST_KEK);

      const result = await manager.getSecret("tenant_1", "nonexistent");

      expect(result).toBeNull();
    });

    it("should overwrite existing secrets", async () => {
      const manager = new SecretsManager(db, TEST_KEK);

      await manager.setSecret("tenant_1", "key", "old-value");
      await manager.setSecret("tenant_1", "key", "new-value");

      const result = await manager.getSecret("tenant_1", "key");
      expect(result).toBe("new-value");
    });

    it("should handle empty string values", async () => {
      const manager = new SecretsManager(db, TEST_KEK);

      await manager.setSecret("tenant_1", "empty", "");
      const result = await manager.getSecret("tenant_1", "empty");

      expect(result).toBe("");
    });
  });

  describe("tenant isolation", () => {
    it("should isolate secrets between tenants", async () => {
      const manager = new SecretsManager(db, TEST_KEK);

      await manager.setSecret("tenant_1", "token", "tenant-1-secret");
      await manager.setSecret("tenant_2", "token", "tenant-2-secret");

      expect(await manager.getSecret("tenant_1", "token")).toBe(
        "tenant-1-secret",
      );
      expect(await manager.getSecret("tenant_2", "token")).toBe(
        "tenant-2-secret",
      );
    });

    it("should not expose tenant_1 secrets to tenant_2", async () => {
      const manager = new SecretsManager(db, TEST_KEK);

      await manager.setSecret("tenant_1", "private_key", "super-secret");

      // tenant_2 should not see tenant_1's secret
      const result = await manager.getSecret("tenant_2", "private_key");
      expect(result).toBeNull();
    });

    it("should generate unique DEKs per tenant", async () => {
      const manager = new SecretsManager(db, TEST_KEK);

      // Trigger DEK generation for both tenants
      await manager.setSecret("tenant_1", "test", "value1");
      await manager.setSecret("tenant_2", "test", "value2");

      // Each tenant should have their own DEK cached
      const dek1 = await manager.getTenantDEK("tenant_1");
      const dek2 = await manager.getTenantDEK("tenant_2");

      expect(dek1).not.toBe(dek2);
    });
  });

  describe("special characters and edge cases", () => {
    it("should handle unicode and emojis", async () => {
      const manager = new SecretsManager(db, TEST_KEK);
      const unicodeValue = "émojis 🔐 and ünïcödé 日本語";

      await manager.setSecret("tenant_1", "unicode", unicodeValue);
      const result = await manager.getSecret("tenant_1", "unicode");

      expect(result).toBe(unicodeValue);
    });

    it("should handle newlines and special whitespace", async () => {
      const manager = new SecretsManager(db, TEST_KEK);
      const value = "line1\nline2\ttabbed\r\nwindows";

      await manager.setSecret("tenant_1", "multiline", value);
      const result = await manager.getSecret("tenant_1", "multiline");

      expect(result).toBe(value);
    });

    it("should handle JSON values", async () => {
      const manager = new SecretsManager(db, TEST_KEK);
      const jsonValue = JSON.stringify({
        api_key: "secret",
        nested: { value: 123 },
      });

      await manager.setSecret("tenant_1", "config", jsonValue);
      const result = await manager.getSecret("tenant_1", "config");

      expect(result).toBe(jsonValue);
      expect(JSON.parse(result!)).toEqual({
        api_key: "secret",
        nested: { value: 123 },
      });
    });

    it("should handle long values", async () => {
      const manager = new SecretsManager(db, TEST_KEK);
      const longValue = "a".repeat(10000);

      await manager.setSecret("tenant_1", "long", longValue);
      const result = await manager.getSecret("tenant_1", "long");

      expect(result).toBe(longValue);
    });
  });

  describe("secret management operations", () => {
    it("should check if secret exists", async () => {
      const manager = new SecretsManager(db, TEST_KEK);

      expect(await manager.hasSecret("tenant_1", "key")).toBe(false);

      await manager.setSecret("tenant_1", "key", "value");

      expect(await manager.hasSecret("tenant_1", "key")).toBe(true);
    });

    it("should delete a secret", async () => {
      const manager = new SecretsManager(db, TEST_KEK);

      await manager.setSecret("tenant_1", "key", "value");
      expect(await manager.hasSecret("tenant_1", "key")).toBe(true);

      const deleted = await manager.deleteSecret("tenant_1", "key");

      expect(deleted).toBe(true);
      expect(await manager.hasSecret("tenant_1", "key")).toBe(false);
    });

    it("should return false when deleting non-existent secret", async () => {
      const manager = new SecretsManager(db, TEST_KEK);

      const deleted = await manager.deleteSecret("tenant_1", "nonexistent");

      expect(deleted).toBe(false);
    });

    it("should list secret keys without values", async () => {
      const manager = new SecretsManager(db, TEST_KEK);

      await manager.setSecret("tenant_1", "github_token", "ghp_xxx");
      await manager.setSecret("tenant_1", "openrouter_key", "sk_xxx");

      const list = await manager.listSecrets("tenant_1");

      expect(list.map((s) => s.keyName)).toContain("github_token");
      expect(list.map((s) => s.keyName)).toContain("openrouter_key");
      // Values should NOT be exposed
      expect(list.some((s: TenantSecret) => "value" in s)).toBe(false);
      expect(list.some((s: TenantSecret) => "encrypted_value" in s)).toBe(
        false,
      );
    });

    it("should delete all secrets for a tenant", async () => {
      const manager = new SecretsManager(db, TEST_KEK);

      await manager.setSecret("tenant_1", "key1", "value1");
      await manager.setSecret("tenant_1", "key2", "value2");
      await manager.setSecret("tenant_2", "key1", "other-tenant");

      const deleted = await manager.deleteAllSecrets("tenant_1");

      expect(deleted).toBe(2);
      expect(await manager.listSecrets("tenant_1")).toHaveLength(0);
      // tenant_2 secrets should be unaffected
      expect(await manager.getSecret("tenant_2", "key1")).toBe("other-tenant");
    });
  });

  describe("safeGetSecret", () => {
    it("should return value for existing secrets", async () => {
      const manager = new SecretsManager(db, TEST_KEK);

      await manager.setSecret("tenant_1", "key", "value");
      const result = await manager.safeGetSecret("tenant_1", "key");

      expect(result).toBe("value");
    });

    it("should return null for non-existent secrets", async () => {
      const manager = new SecretsManager(db, TEST_KEK);

      const result = await manager.safeGetSecret("tenant_1", "nonexistent");

      expect(result).toBeNull();
    });

    it("should return null on errors instead of throwing", async () => {
      const manager = new SecretsManager(db, TEST_KEK);

      // Try to get secret for non-existent tenant
      const result = await manager.safeGetSecret("nonexistent_tenant", "key");

      expect(result).toBeNull();
    });
  });

  describe("DEK rotation", () => {
    it("should rotate DEK and maintain access to secrets", async () => {
      const manager = new SecretsManager(db, TEST_KEK);

      // Store some secrets
      await manager.setSecret("tenant_1", "key1", "value1");
      await manager.setSecret("tenant_1", "key2", "value2");

      // Get old DEK for comparison
      const oldDek = await manager.getTenantDEK("tenant_1");

      // Rotate
      const result = await manager.rotateTenantDEK("tenant_1");

      expect(result.rotated).toBe(2);

      // Secrets should still be accessible
      expect(await manager.getSecret("tenant_1", "key1")).toBe("value1");
      expect(await manager.getSecret("tenant_1", "key2")).toBe("value2");

      // DEK should have changed
      const newDek = await manager.getTenantDEK("tenant_1");
      expect(newDek).not.toBe(oldDek);
    });

    it("should not affect other tenants during rotation", async () => {
      const manager = new SecretsManager(db, TEST_KEK);

      await manager.setSecret("tenant_1", "key", "value1");
      await manager.setSecret("tenant_2", "key", "value2");

      // Rotate tenant_1 only
      await manager.rotateTenantDEK("tenant_1");

      // tenant_2 should be unaffected
      expect(await manager.getSecret("tenant_2", "key")).toBe("value2");
    });
  });

  describe("debugTenantDEK", () => {
    it("should report no DEK for new tenant", async () => {
      const manager = new SecretsManager(db, TEST_KEK);

      const result = await manager.debugTenantDEK("tenant_1");

      expect(result.exists).toBe(false);
      expect(result.error).toContain("No DEK stored");
    });

    it("should report DEK exists after storing a secret", async () => {
      const manager = new SecretsManager(db, TEST_KEK);

      await manager.setSecret("tenant_1", "key", "value");
      const result = await manager.debugTenantDEK("tenant_1");

      expect(result.exists).toBe(true);
      expect(result.canDecrypt).toBe(true);
    });

    it("should report tenant not found for invalid tenant", async () => {
      const manager = new SecretsManager(db, TEST_KEK);

      const result = await manager.debugTenantDEK("nonexistent_tenant");

      expect(result.exists).toBe(false);
      expect(result.error).toContain("Tenant not found");
    });
  });

  describe("error handling", () => {
    it("should throw for non-existent tenant when getting secret", async () => {
      const manager = new SecretsManager(db, TEST_KEK);

      await expect(
        manager.getSecret("nonexistent_tenant", "key"),
      ).rejects.toThrow("Tenant not found");
    });

    it("should throw for non-existent tenant when setting secret", async () => {
      const manager = new SecretsManager(db, TEST_KEK);

      await expect(
        manager.setSecret("nonexistent_tenant", "key", "value"),
      ).rejects.toThrow("Tenant not found");
    });
  });
});

describe("SecretsManager edge cases", () => {
  it("should cache DEK for performance", async () => {
    const db = createMockD1();
    const manager = new SecretsManager(db, TEST_KEK);

    // First call generates and caches DEK
    await manager.setSecret("tenant_1", "key1", "value1");
    const dek1 = await manager.getTenantDEK("tenant_1");

    // Second call should return cached DEK without DB query
    const dek2 = await manager.getTenantDEK("tenant_1");

    expect(dek1).toBe(dek2);
  });
});
