/**
 * Tests for wildcard redirect URI validation
 */

import { describe, it, expect, vi } from "vitest";
import {
  extractSubdomainFromRedirectUri,
  isActiveTenant,
  validateClientRedirectUri,
  cleanupOldAuditLogs,
} from "./queries.js";

// Mock D1Database
const createMockDb = (clientData: Record<string, unknown> | null = null) => ({
  prepare: vi.fn().mockReturnValue({
    bind: vi.fn().mockReturnValue({
      first: vi.fn().mockResolvedValue(clientData),
      all: vi.fn().mockResolvedValue({ results: [] }),
      run: vi.fn().mockResolvedValue({ success: true }),
    }),
  }),
});

describe("extractSubdomainFromRedirectUri", () => {
  describe("groveengine client", () => {
    it("extracts subdomain from valid redirect URI", () => {
      const subdomain = extractSubdomainFromRedirectUri(
        "groveengine",
        "https://autumn.grove.place/auth/callback",
      );
      expect(subdomain).toBe("autumn");
    });

    it("normalizes subdomain to lowercase", () => {
      const subdomain = extractSubdomainFromRedirectUri(
        "groveengine",
        "https://AUTUMN.grove.place/auth/callback",
      );
      expect(subdomain).toBe("autumn");
    });

    it("handles hyphenated subdomains", () => {
      const subdomain = extractSubdomainFromRedirectUri(
        "groveengine",
        "https://my-cool-blog.grove.place/auth/callback",
      );
      expect(subdomain).toBe("my-cool-blog");
    });

    it("handles numeric subdomains", () => {
      const subdomain = extractSubdomainFromRedirectUri(
        "groveengine",
        "https://user123.grove.place/auth/callback",
      );
      expect(subdomain).toBe("user123");
    });

    it("returns null for wrong path", () => {
      const subdomain = extractSubdomainFromRedirectUri(
        "groveengine",
        "https://autumn.grove.place/wrong/path",
      );
      expect(subdomain).toBeNull();
    });

    it("returns null for wrong domain", () => {
      const subdomain = extractSubdomainFromRedirectUri(
        "groveengine",
        "https://autumn.evil.com/auth/callback",
      );
      expect(subdomain).toBeNull();
    });

    it("returns null for nested subdomains (security)", () => {
      // This is critical for security - nested subdomains could be attack vectors
      const subdomain = extractSubdomainFromRedirectUri(
        "groveengine",
        "https://evil.attacker.grove.place/auth/callback",
      );
      expect(subdomain).toBeNull();
    });

    it("returns null for HTTP (non-HTTPS)", () => {
      const subdomain = extractSubdomainFromRedirectUri(
        "groveengine",
        "http://autumn.grove.place/auth/callback",
      );
      expect(subdomain).toBeNull();
    });

    it("returns null for root domain", () => {
      const subdomain = extractSubdomainFromRedirectUri(
        "groveengine",
        "https://grove.place/auth/callback",
      );
      expect(subdomain).toBeNull();
    });

    it("returns null for www subdomain edge case", () => {
      const subdomain = extractSubdomainFromRedirectUri(
        "groveengine",
        "https://www.grove.place/auth/callback",
      );
      // www is valid alphanumeric, so it matches the pattern
      // This is expected - www would need to be an active tenant to pass full validation
      expect(subdomain).toBe("www");
    });
  });

  describe("unknown clients", () => {
    it("returns null for unknown client_id", () => {
      const subdomain = extractSubdomainFromRedirectUri(
        "unknown-client",
        "https://autumn.grove.place/auth/callback",
      );
      expect(subdomain).toBeNull();
    });

    it("returns null for third-party clients", () => {
      const subdomain = extractSubdomainFromRedirectUri(
        "some-third-party-app",
        "https://app.example.com/callback",
      );
      expect(subdomain).toBeNull();
    });
  });
});

describe("isActiveTenant", () => {
  it("returns true for active tenant", async () => {
    const mockDb = createMockDb({ 1: 1 });
    const result = await isActiveTenant(
      mockDb as unknown as D1Database,
      "autumn",
    );

    expect(result).toBe(true);
    expect(mockDb.prepare).toHaveBeenCalledWith(
      "SELECT 1 FROM tenants WHERE subdomain = ? AND active = 1",
    );
  });

  it("returns false for non-existent tenant", async () => {
    const mockDb = createMockDb(null);
    const result = await isActiveTenant(
      mockDb as unknown as D1Database,
      "doesnotexist",
    );

    expect(result).toBe(false);
  });

  it("normalizes subdomain to lowercase", async () => {
    const mockDb = createMockDb({ 1: 1 });
    await isActiveTenant(mockDb as unknown as D1Database, "AUTUMN");

    const bindCall = mockDb.prepare().bind;
    expect(bindCall).toHaveBeenCalledWith("autumn");
  });
});

describe("validateClientRedirectUri", () => {
  const createMockClient = (redirectUris: string[]) => ({
    id: "test-id",
    name: "Test Client",
    client_id: "groveengine",
    client_secret_hash: "hash",
    redirect_uris: JSON.stringify(redirectUris),
    allowed_origins: "[]",
    domain: null,
    is_internal_service: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  describe("exact match (backward compatibility)", () => {
    it("allows exact match from registered redirect_uris", async () => {
      const client = createMockClient([
        "https://grove.place/auth/callback",
        "https://admin.grove.place/auth/callback",
      ]);
      const mockDb = createMockDb(client);

      const result = await validateClientRedirectUri(
        mockDb as unknown as D1Database,
        "groveengine",
        "https://grove.place/auth/callback",
      );

      expect(result).toBe(true);
    });

    it("rejects non-matching URI without engineDb", async () => {
      const client = createMockClient(["https://grove.place/auth/callback"]);
      const mockDb = createMockDb(client);

      const result = await validateClientRedirectUri(
        mockDb as unknown as D1Database,
        "groveengine",
        "https://autumn.grove.place/auth/callback",
        // No engineDb provided - wildcard validation skipped
      );

      expect(result).toBe(false);
    });
  });

  describe("wildcard validation with engineDb", () => {
    it("allows wildcard URI for active tenant", async () => {
      const client = createMockClient(["https://grove.place/auth/callback"]);
      const mockHeartwood = createMockDb(client);

      // Mock ENGINE_DB that returns an active tenant
      const mockEngineDb = createMockDb({ 1: 1 });

      const result = await validateClientRedirectUri(
        mockHeartwood as unknown as D1Database,
        "groveengine",
        "https://autumn.grove.place/auth/callback",
        mockEngineDb as unknown as D1Database,
      );

      expect(result).toBe(true);
    });

    it("rejects wildcard URI for non-existent tenant", async () => {
      const client = createMockClient(["https://grove.place/auth/callback"]);
      const mockHeartwood = createMockDb(client);

      // Mock ENGINE_DB that returns no tenant
      const mockEngineDb = createMockDb(null);

      const result = await validateClientRedirectUri(
        mockHeartwood as unknown as D1Database,
        "groveengine",
        "https://doesnotexist.grove.place/auth/callback",
        mockEngineDb as unknown as D1Database,
      );

      expect(result).toBe(false);
    });

    it("rejects wildcard URI for suspended tenant (active = 0)", async () => {
      const client = createMockClient(["https://grove.place/auth/callback"]);
      const mockHeartwood = createMockDb(client);

      // Mock ENGINE_DB - the query has WHERE active = 1, so suspended tenants return null
      const mockEngineDb = createMockDb(null);

      const result = await validateClientRedirectUri(
        mockHeartwood as unknown as D1Database,
        "groveengine",
        "https://suspended-user.grove.place/auth/callback",
        mockEngineDb as unknown as D1Database,
      );

      expect(result).toBe(false);
    });

    it("prioritizes exact match over wildcard", async () => {
      // If URI is in redirect_uris, we don't even check engineDb
      const client = createMockClient([
        "https://grove.place/auth/callback",
        "https://autumn.grove.place/auth/callback", // Explicit entry
      ]);
      const mockHeartwood = createMockDb(client);

      // ENGINE_DB should NOT be called because exact match succeeds first
      const mockEngineDb = createMockDb(null);

      const result = await validateClientRedirectUri(
        mockHeartwood as unknown as D1Database,
        "groveengine",
        "https://autumn.grove.place/auth/callback",
        mockEngineDb as unknown as D1Database,
      );

      expect(result).toBe(true);
      // Verify engineDb was NOT queried (exact match short-circuited)
      expect(mockEngineDb.prepare).not.toHaveBeenCalled();
    });
  });

  describe("non-groveengine clients", () => {
    it("only uses exact match for non-wildcard clients", async () => {
      const client = {
        ...createMockClient(["https://example.com/callback"]),
        client_id: "third-party-app",
      };
      const mockHeartwood = createMockDb(client);
      const mockEngineDb = createMockDb({ 1: 1 }); // Would return active tenant

      const result = await validateClientRedirectUri(
        mockHeartwood as unknown as D1Database,
        "third-party-app",
        "https://autumn.grove.place/auth/callback", // Not in their redirect_uris
        mockEngineDb as unknown as D1Database,
      );

      expect(result).toBe(false);
      // engineDb shouldn't be queried for non-groveengine clients
      expect(mockEngineDb.prepare).not.toHaveBeenCalled();
    });
  });

  describe("client not found", () => {
    it("returns false when client does not exist", async () => {
      const mockDb = createMockDb(null); // No client found

      const result = await validateClientRedirectUri(
        mockDb as unknown as D1Database,
        "nonexistent-client",
        "https://example.com/callback",
      );

      expect(result).toBe(false);
    });
  });

  describe("security edge cases", () => {
    it("rejects nested subdomains", async () => {
      const client = createMockClient(["https://grove.place/auth/callback"]);
      const mockHeartwood = createMockDb(client);
      const mockEngineDb = createMockDb({ 1: 1 }); // Would return active

      const result = await validateClientRedirectUri(
        mockHeartwood as unknown as D1Database,
        "groveengine",
        "https://evil.attacker.grove.place/auth/callback",
        mockEngineDb as unknown as D1Database,
      );

      expect(result).toBe(false);
    });

    it("rejects HTTP scheme", async () => {
      const client = createMockClient(["https://grove.place/auth/callback"]);
      const mockHeartwood = createMockDb(client);
      const mockEngineDb = createMockDb({ 1: 1 });

      const result = await validateClientRedirectUri(
        mockHeartwood as unknown as D1Database,
        "groveengine",
        "http://autumn.grove.place/auth/callback",
        mockEngineDb as unknown as D1Database,
      );

      expect(result).toBe(false);
    });

    it("rejects wrong path", async () => {
      const client = createMockClient(["https://grove.place/auth/callback"]);
      const mockHeartwood = createMockDb(client);
      const mockEngineDb = createMockDb({ 1: 1 });

      const result = await validateClientRedirectUri(
        mockHeartwood as unknown as D1Database,
        "groveengine",
        "https://autumn.grove.place/wrong/callback",
        mockEngineDb as unknown as D1Database,
      );

      expect(result).toBe(false);
    });

    it("rejects path traversal attempts", async () => {
      const client = createMockClient(["https://grove.place/auth/callback"]);
      const mockHeartwood = createMockDb(client);
      const mockEngineDb = createMockDb({ 1: 1 });

      const result = await validateClientRedirectUri(
        mockHeartwood as unknown as D1Database,
        "groveengine",
        "https://autumn.grove.place/auth/callback/../../../etc/passwd",
        mockEngineDb as unknown as D1Database,
      );

      expect(result).toBe(false);
    });
  });
});

// ==================== Audit Log Cleanup Tests ====================

describe("cleanupOldAuditLogs", () => {
  const createMockDbWithChanges = (deletedRows: number = 0) => ({
    prepare: vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnValue({
        run: vi.fn().mockResolvedValue({
          meta: { changes: deletedRows },
        }),
      }),
    }),
  });

  it("should delete logs older than retention period", async () => {
    const mockDb = createMockDbWithChanges(42);

    const deleted = await cleanupOldAuditLogs(mockDb as any, 90);

    expect(deleted).toBe(42);
    expect(mockDb.prepare).toHaveBeenCalledWith(
      "DELETE FROM audit_log WHERE created_at < ?",
    );
  });

  it("should use 90-day default retention", async () => {
    const mockDb = createMockDbWithChanges(0);
    const prepareCall = vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnValue({
        run: vi.fn().mockResolvedValue({ meta: { changes: 0 } }),
      }),
    });
    mockDb.prepare = prepareCall;

    await cleanupOldAuditLogs(mockDb as any);

    // Verify the cutoff date is approximately 90 days ago
    const bindCall = prepareCall.mock.results[0].value.bind;
    expect(bindCall).toHaveBeenCalled();

    const cutoffArg = bindCall.mock.calls[0][0];
    const cutoffDate = new Date(cutoffArg);
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Should be within 1 second of expected date
    expect(
      Math.abs(cutoffDate.getTime() - ninetyDaysAgo.getTime()),
    ).toBeLessThan(1000);
  });

  it("should respect custom retention period", async () => {
    const mockDb = createMockDbWithChanges(0);
    const prepareCall = vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnValue({
        run: vi.fn().mockResolvedValue({ meta: { changes: 0 } }),
      }),
    });
    mockDb.prepare = prepareCall;

    await cleanupOldAuditLogs(mockDb as any, 30); // 30 days

    const bindCall = prepareCall.mock.results[0].value.bind;
    const cutoffArg = bindCall.mock.calls[0][0];
    const cutoffDate = new Date(cutoffArg);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    expect(
      Math.abs(cutoffDate.getTime() - thirtyDaysAgo.getTime()),
    ).toBeLessThan(1000);
  });

  it("should return 0 when no logs deleted", async () => {
    const mockDb = createMockDbWithChanges(0);

    const deleted = await cleanupOldAuditLogs(mockDb as any, 90);

    expect(deleted).toBe(0);
  });

  it("should handle missing meta.changes gracefully", async () => {
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({}), // No meta field
        }),
      }),
    };

    const deleted = await cleanupOldAuditLogs(mockDb as any, 90);

    expect(deleted).toBe(0);
  });

  it("should handle 31-day retention (just above minimum)", async () => {
    const mockDb = createMockDbWithChanges(100);
    const prepareCall = vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnValue({
        run: vi.fn().mockResolvedValue({ meta: { changes: 100 } }),
      }),
    });
    mockDb.prepare = prepareCall;

    // 31 days - just above minimum
    const deleted = await cleanupOldAuditLogs(mockDb as any, 31);

    expect(deleted).toBe(100);

    const bindCall = prepareCall.mock.results[0].value.bind;
    const cutoffArg = bindCall.mock.calls[0][0];
    const cutoffDate = new Date(cutoffArg);
    const thirtyOneDaysAgo = new Date();
    thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31);

    expect(
      Math.abs(cutoffDate.getTime() - thirtyOneDaysAgo.getTime()),
    ).toBeLessThan(1000);
  });

  it("should throw error for retention below minimum (30 days)", async () => {
    const mockDb = createMockDbWithChanges(0);

    // 29 days is below minimum
    await expect(cleanupOldAuditLogs(mockDb as any, 29)).rejects.toThrow(
      "Audit log retention must be at least 30 days",
    );

    // 0 days should also throw
    await expect(cleanupOldAuditLogs(mockDb as any, 0)).rejects.toThrow(
      "Audit log retention must be at least 30 days",
    );

    // 15 days should throw
    await expect(cleanupOldAuditLogs(mockDb as any, 15)).rejects.toThrow(
      "Audit log retention must be at least 30 days",
    );
  });

  it("should accept exactly 30 days retention (minimum)", async () => {
    const mockDb = createMockDbWithChanges(50);
    const prepareCall = vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnValue({
        run: vi.fn().mockResolvedValue({ meta: { changes: 50 } }),
      }),
    });
    mockDb.prepare = prepareCall;

    // Exactly 30 days should work
    const deleted = await cleanupOldAuditLogs(mockDb as any, 30);

    expect(deleted).toBe(50);

    const bindCall = prepareCall.mock.results[0].value.bind;
    const cutoffArg = bindCall.mock.calls[0][0];
    const cutoffDate = new Date(cutoffArg);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    expect(
      Math.abs(cutoffDate.getTime() - thirtyDaysAgo.getTime()),
    ).toBeLessThan(1000);
  });
});
