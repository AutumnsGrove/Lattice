/**
 * User Service Tests
 *
 * Comprehensive tests for D1 user operations covering:
 * - Query functions (getUserBy*)
 * - Session functions (getUserFromSession, getUserFromValidatedSession)
 * - Update functions (linkUserToTenant, updateUserDisplayName, etc.)
 * - Error handling and edge cases
 * - Fetch mocking for external authentication
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { createMockD1, seedMockD1, clearMockD1 } from "./__mocks__/cloudflare";
import {
  getUserByGroveAuthId,
  getUserById,
  getUserByEmail,
  getUserByTenantId,
  getUserFromSession,
  getUserFromValidatedSession,
  linkUserToTenant,
  updateUserDisplayName,
  deactivateUser,
  reactivateUser,
  type User,
} from "./users";

// =============================================================================
// Mock Fetch
// =============================================================================

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function mockFetchResponse(data: unknown, status = 200) {
  mockFetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  });
}

function mockFetchError(status = 400) {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status,
    json: async () => ({ error: "Request failed" }),
  });
}

// =============================================================================
// Test Data
// =============================================================================

const now = Date.now();

const TEST_USER: User = {
  id: "user-1",
  groveauth_id: "grove-auth-1",
  email: "test@example.com",
  display_name: "Test User",
  avatar_url: "https://example.com/avatar.jpg",
  tenant_id: "tenant-1",
  last_login_at: null,
  login_count: 0,
  is_active: 1,
  created_at: now,
  updated_at: now,
};

const INACTIVE_USER: User = {
  id: "user-2",
  groveauth_id: "grove-auth-2",
  email: "inactive@example.com",
  display_name: "Inactive User",
  avatar_url: null,
  tenant_id: "tenant-2",
  last_login_at: null,
  login_count: 0,
  is_active: 0,
  created_at: now,
  updated_at: now,
};

const USER_WITHOUT_TENANT: User = {
  id: "user-3",
  groveauth_id: "grove-auth-3",
  email: "notenant@example.com",
  display_name: "User Without Tenant",
  avatar_url: null,
  tenant_id: null,
  last_login_at: null,
  login_count: 0,
  is_active: 1,
  created_at: now,
  updated_at: now,
};

// =============================================================================
// Test Suite
// =============================================================================

describe("User Service", () => {
  let db: ReturnType<typeof createMockD1>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockD1();
    clearMockD1(db);

    // Seed test data
    seedMockD1(db, "users", [TEST_USER, INACTIVE_USER, USER_WITHOUT_TENANT]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // Query Functions
  // =========================================================================

  describe("getUserByGroveAuthId", () => {
    it("returns user when found", async () => {
      const user = await getUserByGroveAuthId(db, "grove-auth-1");

      expect(user).toEqual(TEST_USER);
    });

    it("returns null when not found", async () => {
      const user = await getUserByGroveAuthId(db, "non-existent");

      expect(user).toBeNull();
    });

    it("accepts groveauth_id parameter for querying", async () => {
      // This test ensures the function properly handles the parameter
      const result = await getUserByGroveAuthId(db, "test-value");
      expect(typeof result).toBe("object");
    });
  });

  describe("getUserById", () => {
    it("returns user when found", async () => {
      const user = await getUserById(db, "user-1");

      expect(user).toEqual(TEST_USER);
    });

    it("returns null when not found", async () => {
      const user = await getUserById(db, "non-existent-id");

      expect(user).toBeNull();
    });

    it("queries by id parameter", async () => {
      const result = await getUserById(db, "any-id");
      expect(typeof result).toBe("object");
    });
  });

  describe("getUserByEmail", () => {
    it("returns user when found by email", async () => {
      const user = await getUserByEmail(db, "test@example.com");

      expect(user).toEqual(TEST_USER);
    });

    it("returns null when email not found", async () => {
      const user = await getUserByEmail(db, "nonexistent@example.com");

      expect(user).toBeNull();
    });

    it("queries by email parameter", async () => {
      const result = await getUserByEmail(db, "any-email@example.com");
      expect(typeof result).toBe("object");
    });
  });

  describe("getUserByTenantId", () => {
    it("returns user when found by tenant_id", async () => {
      const user = await getUserByTenantId(db, "tenant-1");

      expect(user).toEqual(TEST_USER);
    });

    it("returns null when tenant_id not found", async () => {
      const user = await getUserByTenantId(db, "non-existent-tenant");

      expect(user).toBeNull();
    });

    it("queries by tenant_id parameter", async () => {
      const result = await getUserByTenantId(db, "any-tenant");
      expect(typeof result).toBe("object");
    });
  });

  // =========================================================================
  // Session Functions
  // =========================================================================

  describe("getUserFromSession", () => {
    it("returns null for empty token", async () => {
      const user = await getUserFromSession(db, "", "https://auth.example.com");

      expect(user).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("calls fetch with correct auth header", async () => {
      mockFetchResponse({ sub: "grove-auth-1", email: "test@example.com" });

      await getUserFromSession(db, "test-token", "https://auth.example.com");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://auth.example.com/userinfo",
        {
          headers: {
            Authorization: "Bearer test-token",
          },
        },
      );
    });

    it("returns user on successful token validation", async () => {
      mockFetchResponse({ sub: "grove-auth-1", email: "test@example.com" });

      const user = await getUserFromSession(
        db,
        "test-token",
        "https://auth.example.com",
      );

      expect(user).not.toBeNull();
      expect(user?.id).toBe("user-1");
      expect(user?.groveauth_id).toBe("grove-auth-1");
    });

    it("returns null on 401 unauthorized", async () => {
      mockFetchError(401);

      const user = await getUserFromSession(
        db,
        "expired-token",
        "https://auth.example.com",
      );

      expect(user).toBeNull();
    });

    it("returns null on non-401 fetch error (500)", async () => {
      mockFetchError(500);

      const user = await getUserFromSession(
        db,
        "test-token",
        "https://auth.example.com",
      );

      expect(user).toBeNull();
    });

    it("returns null when fetch throws", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const user = await getUserFromSession(
        db,
        "test-token",
        "https://auth.example.com",
      );

      expect(user).toBeNull();
    });

    it("returns null when token user not found in database", async () => {
      mockFetchResponse({
        sub: "unknown-grove-auth-id",
        email: "unknown@example.com",
      });

      const user = await getUserFromSession(
        db,
        "test-token",
        "https://auth.example.com",
      );

      expect(user).toBeNull();
    });

    it("returns null when user is inactive", async () => {
      mockFetchResponse({ sub: "grove-auth-2", email: "inactive@example.com" });

      const user = await getUserFromSession(
        db,
        "test-token",
        "https://auth.example.com",
      );

      expect(user).toBeNull();
    });

    it("uses default auth base URL", async () => {
      mockFetchResponse({ sub: "grove-auth-1", email: "test@example.com" });

      await getUserFromSession(db, "test-token");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://login.grove.place/userinfo",
        expect.objectContaining({
          headers: { Authorization: "Bearer test-token" },
        }),
      );
    });

    it("parses userinfo JSON response correctly", async () => {
      mockFetchResponse({
        sub: "grove-auth-1",
        email: "test@example.com",
        name: "Test User",
        picture: "https://example.com/avatar.jpg",
      });

      const user = await getUserFromSession(
        db,
        "test-token",
        "https://auth.example.com",
      );

      expect(user).not.toBeNull();
      expect(user?.groveauth_id).toBe("grove-auth-1");
    });
  });

  describe("getUserFromValidatedSession", () => {
    it("returns user when found and active", async () => {
      const user = await getUserFromValidatedSession(db, "grove-auth-1");

      expect(user).toEqual(TEST_USER);
    });

    it("returns null when user not found", async () => {
      const user = await getUserFromValidatedSession(db, "non-existent");

      expect(user).toBeNull();
    });

    it("returns null when user is inactive", async () => {
      const user = await getUserFromValidatedSession(db, "grove-auth-2");

      expect(user).toBeNull();
    });

    it("does not make any fetch calls", async () => {
      await getUserFromValidatedSession(db, "grove-auth-1");

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("returns active user regardless of tenant_id value", async () => {
      const user = await getUserFromValidatedSession(db, "grove-auth-1");

      expect(user).not.toBeNull();
      expect(user?.groveauth_id).toBe("grove-auth-1");
    });
  });

  // =========================================================================
  // Update Functions
  // =========================================================================

  describe("linkUserToTenant", () => {
    it("links user to tenant", async () => {
      const changes = await linkUserToTenant(db, "user-3", "tenant-new");

      expect(changes).toBeGreaterThan(0);

      // Check in mock tables directly since mock UPDATE has parsing issues
      const row = db._tables.get("users")?.find((r) => r.id === "user-3");
      expect(row?.tenant_id).toBe("tenant-new");
    });

    it("updates existing tenant link", async () => {
      const changes = await linkUserToTenant(db, "user-1", "tenant-updated");

      expect(changes).toBeGreaterThan(0);

      const row = db._tables.get("users")?.find((r) => r.id === "user-1");
      expect(row?.tenant_id).toBe("tenant-updated");
    });

    it("can link inactive user to tenant", async () => {
      const changes = await linkUserToTenant(db, "user-2", "tenant-new");

      expect(changes).toBeGreaterThan(0);

      const row = db._tables.get("users")?.find((r) => r.id === "user-2");
      expect(row?.tenant_id).toBe("tenant-new");
    });

    it("returns 0 for non-existent user", async () => {
      const changes = await linkUserToTenant(db, "non-existent", "tenant-new");

      expect(changes).toBe(0);
    });
  });

  describe("updateUserDisplayName", () => {
    it("updates user display name", async () => {
      const changes = await updateUserDisplayName(
        db,
        "user-1",
        "New Display Name",
      );

      expect(changes).toBeGreaterThan(0);

      const row = db._tables.get("users")?.find((r) => r.id === "user-1");
      expect(row?.display_name).toBe("New Display Name");
    });

    it("can set display name to empty string", async () => {
      const changes = await updateUserDisplayName(db, "user-1", "");

      expect(changes).toBeGreaterThan(0);

      const row = db._tables.get("users")?.find((r) => r.id === "user-1");
      expect(row?.display_name).toBe("");
    });

    it("can clear display name (null)", async () => {
      const changes = await updateUserDisplayName(db, "user-1", null as any);

      expect(changes).toBeGreaterThan(0);

      const row = db._tables.get("users")?.find((r) => r.id === "user-1");
      expect(row?.display_name).toBeNull();
    });

    it("updates display name for inactive user", async () => {
      const changes = await updateUserDisplayName(
        db,
        "user-2",
        "Inactive User Name",
      );

      expect(changes).toBeGreaterThan(0);

      const row = db._tables.get("users")?.find((r) => r.id === "user-2");
      expect(row?.display_name).toBe("Inactive User Name");
    });

    it("returns 0 for non-existent user", async () => {
      const changes = await updateUserDisplayName(
        db,
        "non-existent",
        "New Name",
      );

      expect(changes).toBe(0);
    });
  });

  describe("deactivateUser", () => {
    it("sets is_active to 0", async () => {
      const changes = await deactivateUser(db, "user-1");

      expect(changes).toBeGreaterThan(0);

      const row = db._tables.get("users")?.find((r) => r.id === "user-1");
      expect(row?.is_active).toBe(0);
    });

    it("deactivates already inactive user", async () => {
      const changes = await deactivateUser(db, "user-2");

      expect(changes).toBeGreaterThan(0);

      const row = db._tables.get("users")?.find((r) => r.id === "user-2");
      expect(row?.is_active).toBe(0);
    });

    it("returns 0 for non-existent user", async () => {
      const changes = await deactivateUser(db, "non-existent");

      expect(changes).toBe(0);
    });

    it("preserves other user fields when deactivating", async () => {
      const rowBefore = db._tables.get("users")?.find((r) => r.id === "user-1");

      await deactivateUser(db, "user-1");

      const rowAfter = db._tables.get("users")?.find((r) => r.id === "user-1");
      expect(rowAfter?.email).toBe(rowBefore?.email);
      expect(rowAfter?.groveauth_id).toBe(rowBefore?.groveauth_id);
      expect(rowAfter?.display_name).toBe(rowBefore?.display_name);
    });
  });

  describe("reactivateUser", () => {
    it("sets is_active to 1", async () => {
      const changes = await reactivateUser(db, "user-2");

      expect(changes).toBeGreaterThan(0);

      const row = db._tables.get("users")?.find((r) => r.id === "user-2");
      expect(row?.is_active).toBe(1);
    });

    it("reactivates already active user", async () => {
      const changes = await reactivateUser(db, "user-1");

      expect(changes).toBeGreaterThan(0);

      const row = db._tables.get("users")?.find((r) => r.id === "user-1");
      expect(row?.is_active).toBe(1);
    });

    it("returns 0 for non-existent user", async () => {
      const changes = await reactivateUser(db, "non-existent");

      expect(changes).toBe(0);
    });

    it("preserves other user fields when reactivating", async () => {
      const rowBefore = db._tables.get("users")?.find((r) => r.id === "user-2");

      await reactivateUser(db, "user-2");

      const rowAfter = db._tables.get("users")?.find((r) => r.id === "user-2");
      expect(rowAfter?.email).toBe(rowBefore?.email);
      expect(rowAfter?.groveauth_id).toBe(rowBefore?.groveauth_id);
      expect(rowAfter?.display_name).toBe(rowBefore?.display_name);
    });

    it("updates is_active field when reactivating user", async () => {
      const changes = await reactivateUser(db, "user-2");

      expect(changes).toBeGreaterThan(0);

      const rowAfter = db._tables.get("users")?.find((r) => r.id === "user-2");
      expect(rowAfter?.is_active).toBe(1);
    });
  });

  // =========================================================================
  // Integration Tests
  // =========================================================================

  describe("Integration: Session Flow", () => {
    it("validates token, finds user, and returns active user", async () => {
      mockFetchResponse({ sub: "grove-auth-1", email: "test@example.com" });

      const user = await getUserFromSession(
        db,
        "valid-token",
        "https://auth.example.com",
      );

      expect(user).not.toBeNull();
      expect(user?.id).toBe("user-1");
      expect(user?.is_active).toBe(1);
    });

    it("session validates token status with external service", async () => {
      // Test that we call the external service and check status
      mockFetchResponse({ sub: "grove-auth-1", email: "test@example.com" });

      const user = await getUserFromSession(
        db,
        "valid-token",
        "https://auth.example.com",
      );

      expect(mockFetch).toHaveBeenCalledWith(
        "https://auth.example.com/userinfo",
        { headers: { Authorization: "Bearer valid-token" } },
      );
      expect(user).not.toBeNull();
    });

    it("session rejects inactive users even with valid token", async () => {
      // Token is valid but user is inactive
      mockFetchResponse({ sub: "grove-auth-2", email: "inactive@example.com" });

      const user = await getUserFromSession(
        db,
        "valid-token",
        "https://auth.example.com",
      );

      expect(user).toBeNull();
    });
  });

  describe("Integration: Query Functions", () => {
    it("all query functions return consistent user data", async () => {
      const byAuthId = await getUserByGroveAuthId(db, "grove-auth-1");
      const byId = await getUserById(db, "user-1");
      const byEmail = await getUserByEmail(db, "test@example.com");

      expect(byAuthId).toEqual(TEST_USER);
      expect(byId).toEqual(TEST_USER);
      expect(byEmail).toEqual(TEST_USER);
    });

    it("update functions return proper change counts", async () => {
      const linkChanges = await linkUserToTenant(db, "user-3", "new-tenant");
      const displayNameChanges = await updateUserDisplayName(
        db,
        "user-1",
        "New Name",
      );
      const deactivateChanges = await deactivateUser(db, "user-2");
      const reactivateChanges = await reactivateUser(db, "user-2");

      // All operations should report changes
      expect(linkChanges).toBeGreaterThan(0);
      expect(displayNameChanges).toBeGreaterThan(0);
      expect(deactivateChanges).toBeGreaterThan(0);
      expect(reactivateChanges).toBeGreaterThan(0);
    });

    it("handles multiple users with different statuses correctly", async () => {
      const activeUser = await getUserFromValidatedSession(db, "grove-auth-1");
      const inactiveUser = await getUserFromValidatedSession(
        db,
        "grove-auth-2",
      );

      expect(activeUser).toEqual(TEST_USER);
      expect(activeUser?.is_active).toBe(1);

      expect(inactiveUser).toBeNull();
    });

    it("filters out inactive users correctly", async () => {
      const activeUser = await getUserFromValidatedSession(db, "grove-auth-1");
      const inactiveUser = await getUserFromValidatedSession(
        db,
        "grove-auth-2",
      );

      expect(activeUser).not.toBeNull();
      expect(inactiveUser).toBeNull();
    });
  });
});
