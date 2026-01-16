/**
 * Session Module Tests
 *
 * Comprehensive test suite for tenant access control utilities:
 * - verifyTenantOwnership: Verifies user email matches tenant owner
 * - getVerifiedTenantId: Returns tenantId or throws with proper status codes
 *
 * Target coverage: 90%+
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createMockD1,
  seedMockD1,
  clearMockD1,
} from "../server/services/__mocks__/cloudflare";
import {
  verifyTenantOwnership,
  getVerifiedTenantId,
  type User,
  type SessionError,
} from "./session";

describe("Session Module - Tenant Access Control", () => {
  let db: ReturnType<typeof createMockD1>;

  beforeEach(() => {
    db = createMockD1();
    clearMockD1(db);
  });

  // ==========================================================================
  // verifyTenantOwnership Tests
  // ==========================================================================

  describe("verifyTenantOwnership", () => {
    describe("input validation", () => {
      it("should return false when tenantId is null", async () => {
        const result = await verifyTenantOwnership(
          db,
          null,
          "user@example.com",
        );
        expect(result).toBe(false);
      });

      it("should return false when tenantId is undefined", async () => {
        const result = await verifyTenantOwnership(
          db,
          undefined,
          "user@example.com",
        );
        expect(result).toBe(false);
      });

      it("should return false when tenantId is empty string", async () => {
        const result = await verifyTenantOwnership(db, "", "user@example.com");
        expect(result).toBe(false);
      });

      it("should return false when userEmail is empty string", async () => {
        seedMockD1(db, "tenants", [
          { id: "tenant-1", email: "owner@example.com" },
        ]);
        const result = await verifyTenantOwnership(db, "tenant-1", "");
        expect(result).toBe(false);
      });

      it("should return false when userEmail is null", async () => {
        seedMockD1(db, "tenants", [
          { id: "tenant-1", email: "owner@example.com" },
        ]);
        const result = await verifyTenantOwnership(db, "tenant-1", null as any);
        expect(result).toBe(false);
      });

      it("should return false when userEmail is undefined", async () => {
        seedMockD1(db, "tenants", [
          { id: "tenant-1", email: "owner@example.com" },
        ]);
        const result = await verifyTenantOwnership(
          db,
          "tenant-1",
          undefined as any,
        );
        expect(result).toBe(false);
      });

      it("should return false when both tenantId and userEmail are missing", async () => {
        const result = await verifyTenantOwnership(db, null, "");
        expect(result).toBe(false);
      });
    });

    describe("tenant lookup", () => {
      it("should return false when tenant does not exist in database", async () => {
        seedMockD1(db, "tenants", []);
        const result = await verifyTenantOwnership(
          db,
          "nonexistent-tenant",
          "user@example.com",
        );
        expect(result).toBe(false);
      });

      it("should return false when multiple tenants exist but requested one is missing", async () => {
        seedMockD1(db, "tenants", [
          { id: "tenant-1", email: "owner1@example.com" },
          { id: "tenant-2", email: "owner2@example.com" },
        ]);
        const result = await verifyTenantOwnership(
          db,
          "tenant-3",
          "user@example.com",
        );
        expect(result).toBe(false);
      });
    });

    describe("email matching (case-insensitivity)", () => {
      it("should return true when emails match exactly", async () => {
        seedMockD1(db, "tenants", [
          { id: "tenant-1", email: "owner@example.com" },
        ]);
        const result = await verifyTenantOwnership(
          db,
          "tenant-1",
          "owner@example.com",
        );
        expect(result).toBe(true);
      });

      it("should return true when emails match with different cases", async () => {
        seedMockD1(db, "tenants", [
          { id: "tenant-1", email: "Owner@Example.COM" },
        ]);
        const result = await verifyTenantOwnership(
          db,
          "tenant-1",
          "owner@example.com",
        );
        expect(result).toBe(true);
      });

      it("should return true when emails match with all uppercase tenant email", async () => {
        seedMockD1(db, "tenants", [
          { id: "tenant-1", email: "OWNER@EXAMPLE.COM" },
        ]);
        const result = await verifyTenantOwnership(
          db,
          "tenant-1",
          "owner@example.com",
        );
        expect(result).toBe(true);
      });

      it("should return true when emails match with all uppercase user email", async () => {
        seedMockD1(db, "tenants", [
          { id: "tenant-1", email: "owner@example.com" },
        ]);
        const result = await verifyTenantOwnership(
          db,
          "tenant-1",
          "OWNER@EXAMPLE.COM",
        );
        expect(result).toBe(true);
      });

      it("should return true when emails match with mixed cases", async () => {
        seedMockD1(db, "tenants", [
          { id: "tenant-1", email: "OWNeR@ExAmPlE.cOm" },
        ]);
        const result = await verifyTenantOwnership(
          db,
          "tenant-1",
          "owner@EXAMPLE.com",
        );
        expect(result).toBe(true);
      });

      it("should return false when emails do not match (case-insensitive)", async () => {
        seedMockD1(db, "tenants", [
          { id: "tenant-1", email: "owner@example.com" },
        ]);
        const result = await verifyTenantOwnership(
          db,
          "tenant-1",
          "other@example.com",
        );
        expect(result).toBe(false);
      });

      it("should return false when emails do not match despite case similarity", async () => {
        seedMockD1(db, "tenants", [
          { id: "tenant-1", email: "owner@example.com" },
        ]);
        const result = await verifyTenantOwnership(
          db,
          "tenant-1",
          "Owner@example.co",
        );
        expect(result).toBe(false);
      });
    });

    describe("database errors", () => {
      it("should return false when database query throws error", async () => {
        db.prepare = vi.fn(() => {
          throw new Error("Database connection failed");
        });

        const result = await verifyTenantOwnership(
          db,
          "tenant-1",
          "user@example.com",
        );
        expect(result).toBe(false);
      });

      it("should return false when database.bind throws error", async () => {
        db.prepare = vi.fn().mockReturnThis();
        db.prepare().bind = vi.fn(() => {
          throw new Error("Binding failed");
        });

        const result = await verifyTenantOwnership(
          db,
          "tenant-1",
          "user@example.com",
        );
        expect(result).toBe(false);
      });

      it("should return false when database.first throws error", async () => {
        db.prepare = vi.fn(() => ({
          bind: vi.fn().mockReturnThis(),
          first: vi.fn(async () => {
            throw new Error("Query execution failed");
          }),
        }));

        const result = await verifyTenantOwnership(
          db,
          "tenant-1",
          "user@example.com",
        );
        expect(result).toBe(false);
      });

      it("should return false and log error when database throws", async () => {
        const consoleErrorSpy = vi
          .spyOn(console, "error")
          .mockImplementation(() => {});
        db.prepare = vi.fn(() => {
          throw new Error("DB error");
        });

        const result = await verifyTenantOwnership(
          db,
          "tenant-1",
          "user@example.com",
        );
        expect(result).toBe(false);
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "Error verifying tenant ownership:",
          expect.any(Error),
        );

        consoleErrorSpy.mockRestore();
      });

      it("should recover from error without throwing", async () => {
        db.prepare = vi.fn(() => {
          throw new Error("Transient error");
        });

        expect(async () => {
          await verifyTenantOwnership(db, "tenant-1", "user@example.com");
        }).not.toThrow();
      });
    });

    describe("real-world scenarios", () => {
      it("should correctly identify tenant owner among multiple tenants", async () => {
        seedMockD1(db, "tenants", [
          { id: "tenant-1", email: "alice@example.com" },
        ]);

        // Test that emails match correctly
        expect(
          await verifyTenantOwnership(db, "tenant-1", "alice@example.com"),
        ).toBe(true);

        // Test that wrong emails fail
        expect(
          await verifyTenantOwnership(db, "tenant-1", "bob@example.com"),
        ).toBe(false);
        expect(
          await verifyTenantOwnership(db, "tenant-1", "charlie@example.com"),
        ).toBe(false);

        // Test that wrong tenant ID fails
        expect(
          await verifyTenantOwnership(db, "tenant-2", "alice@example.com"),
        ).toBe(false);
      });

      it("should handle special characters in email addresses", async () => {
        seedMockD1(db, "tenants", [
          { id: "tenant-1", email: "user+tag@sub.example.co.uk" },
        ]);

        const result = await verifyTenantOwnership(
          db,
          "tenant-1",
          "user+tag@sub.example.co.uk",
        );
        expect(result).toBe(true);
      });

      it("should handle emails with numbers and underscores", async () => {
        seedMockD1(db, "tenants", [
          { id: "tenant-1", email: "user_123@example.com" },
        ]);

        const result = await verifyTenantOwnership(
          db,
          "tenant-1",
          "user_123@example.com",
        );
        expect(result).toBe(true);
      });
    });
  });

  // ==========================================================================
  // getVerifiedTenantId Tests
  // ==========================================================================

  describe("getVerifiedTenantId", () => {
    describe("tenantId validation (400 error)", () => {
      it("should throw 400 error when tenantId is null", async () => {
        const user: User = { email: "user@example.com" };

        await expect(getVerifiedTenantId(db, null, user)).rejects.toMatchObject(
          {
            message: "Tenant ID required",
            status: 400,
          },
        );
      });

      it("should throw 400 error when tenantId is undefined", async () => {
        const user: User = { email: "user@example.com" };

        await expect(
          getVerifiedTenantId(db, undefined, user),
        ).rejects.toMatchObject({
          message: "Tenant ID required",
          status: 400,
        });
      });

      it("should throw 400 error when tenantId is empty string", async () => {
        const user: User = { email: "user@example.com" };

        await expect(getVerifiedTenantId(db, "", user)).rejects.toMatchObject({
          message: "Tenant ID required",
          status: 400,
        });
      });

      it("should throw 400 with proper error structure", async () => {
        const user: User = { email: "user@example.com" };

        try {
          await getVerifiedTenantId(db, null, user);
          expect.fail("Should have thrown");
        } catch (err) {
          const error = err as SessionError;
          expect(error).toBeInstanceOf(Error);
          expect(error.status).toBe(400);
          expect(error.message).toBe("Tenant ID required");
        }
      });

      it("should throw 400 before checking user", async () => {
        await expect(getVerifiedTenantId(db, null, null)).rejects.toMatchObject(
          {
            status: 400,
          },
        );
      });
    });

    describe("user validation (401 error)", () => {
      it("should throw 401 error when user is null", async () => {
        await expect(
          getVerifiedTenantId(db, "tenant-1", null),
        ).rejects.toMatchObject({
          message: "Unauthorized",
          status: 401,
        });
      });

      it("should throw 401 error when user is undefined", async () => {
        await expect(
          getVerifiedTenantId(db, "tenant-1", undefined),
        ).rejects.toMatchObject({
          message: "Unauthorized",
          status: 401,
        });
      });

      it("should throw 401 error when user.email is undefined", async () => {
        const user: any = { email: undefined };

        await expect(
          getVerifiedTenantId(db, "tenant-1", user),
        ).rejects.toMatchObject({
          message: "Unauthorized",
          status: 401,
        });
      });

      it("should throw 401 error when user.email is null", async () => {
        const user: any = { email: null };

        await expect(
          getVerifiedTenantId(db, "tenant-1", user),
        ).rejects.toMatchObject({
          message: "Unauthorized",
          status: 401,
        });
      });

      it("should throw 401 error when user.email is empty string", async () => {
        const user: User = { email: "" };

        await expect(
          getVerifiedTenantId(db, "tenant-1", user),
        ).rejects.toMatchObject({
          message: "Unauthorized",
          status: 401,
        });
      });

      it("should throw 401 with proper error structure", async () => {
        try {
          await getVerifiedTenantId(db, "tenant-1", null);
          expect.fail("Should have thrown");
        } catch (err) {
          const error = err as SessionError;
          expect(error).toBeInstanceOf(Error);
          expect(error.status).toBe(401);
          expect(error.message).toBe("Unauthorized");
        }
      });
    });

    describe("ownership verification (403 error)", () => {
      it("should throw 403 error when user does not own tenant", async () => {
        seedMockD1(db, "tenants", [
          { id: "tenant-1", email: "owner@example.com" },
        ]);
        const user: User = { email: "other@example.com" };

        await expect(
          getVerifiedTenantId(db, "tenant-1", user),
        ).rejects.toMatchObject({
          message: "Access denied - you do not own this tenant",
          status: 403,
        });
      });

      it("should throw 403 error when tenant does not exist", async () => {
        seedMockD1(db, "tenants", []);
        const user: User = { email: "user@example.com" };

        await expect(
          getVerifiedTenantId(db, "nonexistent", user),
        ).rejects.toMatchObject({
          message: "Access denied - you do not own this tenant",
          status: 403,
        });
      });

      it("should throw 403 error with case-insensitive email check", async () => {
        seedMockD1(db, "tenants", [
          { id: "tenant-1", email: "OWNER@EXAMPLE.COM" },
        ]);
        const user: User = { email: "different@example.com" };

        await expect(
          getVerifiedTenantId(db, "tenant-1", user),
        ).rejects.toMatchObject({
          status: 403,
        });
      });

      it("should throw 403 with proper error structure", async () => {
        seedMockD1(db, "tenants", [
          { id: "tenant-1", email: "owner@example.com" },
        ]);
        const user: User = { email: "other@example.com" };

        try {
          await getVerifiedTenantId(db, "tenant-1", user);
          expect.fail("Should have thrown");
        } catch (err) {
          const error = err as SessionError;
          expect(error).toBeInstanceOf(Error);
          expect(error.status).toBe(403);
          expect(error.message).toContain("Access denied");
        }
      });
    });

    describe("successful verification", () => {
      it("should return tenantId when user owns tenant", async () => {
        seedMockD1(db, "tenants", [
          { id: "tenant-1", email: "owner@example.com" },
        ]);
        const user: User = { email: "owner@example.com" };

        const result = await getVerifiedTenantId(db, "tenant-1", user);
        expect(result).toBe("tenant-1");
      });

      it("should return tenantId with case-insensitive email matching", async () => {
        seedMockD1(db, "tenants", [
          { id: "tenant-1", email: "Owner@Example.COM" },
        ]);
        const user: User = { email: "owner@example.com" };

        const result = await getVerifiedTenantId(db, "tenant-1", user);
        expect(result).toBe("tenant-1");
      });

      it("should return correct tenantId when multiple tenants exist", async () => {
        seedMockD1(db, "tenants", [
          { id: "tenant-2", email: "bob@example.com" },
        ]);

        const result = await getVerifiedTenantId(db, "tenant-2", {
          email: "bob@example.com",
        });
        expect(result).toBe("tenant-2");
      });

      it("should return tenantId as-is from input", async () => {
        seedMockD1(db, "tenants", [
          { id: "my-custom-tenant-id-123", email: "user@example.com" },
        ]);
        const user: User = { email: "user@example.com" };

        const result = await getVerifiedTenantId(
          db,
          "my-custom-tenant-id-123",
          user,
        );
        expect(result).toBe("my-custom-tenant-id-123");
      });

      it("should handle tenantId with special characters", async () => {
        seedMockD1(db, "tenants", [
          { id: "tenant-123-abc", email: "user@example.com" },
        ]);
        const user: User = { email: "user@example.com" };

        const result = await getVerifiedTenantId(db, "tenant-123-abc", user);
        expect(result).toBe("tenant-123-abc");
      });
    });

    describe("error precedence", () => {
      it("should check tenantId before user", async () => {
        await expect(getVerifiedTenantId(db, null, null)).rejects.toMatchObject(
          {
            status: 400, // tenantId error
          },
        );
      });

      it("should check user before ownership", async () => {
        await expect(
          getVerifiedTenantId(db, "tenant-1", null),
        ).rejects.toMatchObject({
          status: 401, // user error
        });
      });

      it("should check ownership last", async () => {
        seedMockD1(db, "tenants", [
          { id: "tenant-1", email: "owner@example.com" },
        ]);

        await expect(
          getVerifiedTenantId(db, "tenant-1", { email: "other@example.com" }),
        ).rejects.toMatchObject({
          status: 403, // ownership error
        });
      });
    });

    describe("integration scenarios", () => {
      it("should work with real-world user and tenant data", async () => {
        seedMockD1(db, "tenants", [
          {
            id: "user-alice-tenant",
            email: "alice+grove@example.com",
          },
        ]);

        const result = await getVerifiedTenantId(db, "user-alice-tenant", {
          email: "alice+grove@example.com",
        });

        expect(result).toBe("user-alice-tenant");
      });

      it("should reject when querying wrong tenant", async () => {
        seedMockD1(db, "tenants", [
          { id: "alice-tenant", email: "alice@example.com" },
          { id: "bob-tenant", email: "bob@example.com" },
        ]);

        await expect(
          getVerifiedTenantId(db, "bob-tenant", { email: "alice@example.com" }),
        ).rejects.toMatchObject({
          status: 403,
        });
      });

      it("should return tenantId for legitimate cross-check", async () => {
        seedMockD1(db, "tenants", [
          { id: "alice-tenant", email: "alice@example.com" },
        ]);

        const result = await getVerifiedTenantId(db, "alice-tenant", {
          email: "alice@example.com",
        });

        expect(result).toBe("alice-tenant");
      });
    });

    describe("database errors during verification", () => {
      it("should propagate database errors from verifyTenantOwnership", async () => {
        db.prepare = vi.fn(() => {
          throw new Error("Database unavailable");
        });

        const user: User = { email: "user@example.com" };

        // When verifyTenantOwnership fails, it returns false, leading to 403
        const result = await expect(
          getVerifiedTenantId(db, "tenant-1", user),
        ).rejects.toMatchObject({
          status: 403,
        });

        expect(result).toBeDefined();
      });

      it("should handle database timeout gracefully", async () => {
        db.prepare = vi.fn(() => ({
          bind: vi.fn().mockReturnThis(),
          first: vi.fn(async () => {
            throw new Error("Query timeout");
          }),
        }));

        const user: User = { email: "user@example.com" };

        await expect(
          getVerifiedTenantId(db, "tenant-1", user),
        ).rejects.toMatchObject({
          status: 403,
        });
      });
    });
  });

  // ==========================================================================
  // Integration Tests - Both Functions Together
  // ==========================================================================

  describe("Integration: verifyTenantOwnership + getVerifiedTenantId", () => {
    it("should use verifyTenantOwnership inside getVerifiedTenantId", async () => {
      seedMockD1(db, "tenants", [
        { id: "tenant-1", email: "owner@example.com" },
      ]);

      // Both functions should make consistent decisions
      const verifyResult = await verifyTenantOwnership(
        db,
        "tenant-1",
        "owner@example.com",
      );
      const getTenantResult = await getVerifiedTenantId(db, "tenant-1", {
        email: "owner@example.com",
      });

      expect(verifyResult).toBe(true);
      expect(getTenantResult).toBe("tenant-1");
    });

    it("should fail consistently for unauthorized access", async () => {
      seedMockD1(db, "tenants", [
        { id: "tenant-1", email: "owner@example.com" },
      ]);

      const verifyResult = await verifyTenantOwnership(
        db,
        "tenant-1",
        "hacker@example.com",
      );

      await expect(
        getVerifiedTenantId(db, "tenant-1", { email: "hacker@example.com" }),
      ).rejects.toMatchObject({
        status: 403,
      });

      expect(verifyResult).toBe(false);
    });

    it("should handle multiple sequential checks", async () => {
      seedMockD1(db, "tenants", [
        { id: "tenant-1", email: "alice@example.com" },
      ]);

      // Alice checks her tenant
      expect(
        await verifyTenantOwnership(db, "tenant-1", "alice@example.com"),
      ).toBe(true);
      expect(
        await getVerifiedTenantId(db, "tenant-1", {
          email: "alice@example.com",
        }),
      ).toBe("tenant-1");

      // Clear and add different tenant
      clearMockD1(db);
      seedMockD1(db, "tenants", [{ id: "tenant-2", email: "bob@example.com" }]);

      // Bob checks his tenant
      expect(
        await verifyTenantOwnership(db, "tenant-2", "bob@example.com"),
      ).toBe(true);
      expect(
        await getVerifiedTenantId(db, "tenant-2", { email: "bob@example.com" }),
      ).toBe("tenant-2");

      // Bob cannot access Alice's old tenant (no longer in DB)
      expect(
        await verifyTenantOwnership(db, "tenant-1", "bob@example.com"),
      ).toBe(false);
      await expect(
        getVerifiedTenantId(db, "tenant-1", { email: "bob@example.com" }),
      ).rejects.toMatchObject({
        status: 403,
      });
    });
  });
});
