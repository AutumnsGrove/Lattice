/**
 * Arbor Panel Cross-Account Access Security Tests
 *
 * Regression tests for a critical vulnerability where ANY logged-in user
 * could access ANY tenant's admin panel. Two bugs combined:
 *
 * 1. The ownership redirect in arbor/+layout.server.ts was inside a try/catch
 *    that checked `error instanceof Response`. In SvelteKit 2.x, redirect()
 *    throws a Redirect object (not a Response), so the redirect was silently
 *    swallowed and the arbor panel loaded anyway.
 *
 * 2. The footer gear icon in +layout.svelte checked `data?.user` instead of
 *    `data?.isOwner`, showing the admin link to any logged-in visitor.
 *
 * These tests ensure cross-tenant access is always blocked.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { redirect } from "@sveltejs/kit";
import {
  createMockD1,
  createMockKV,
  seedMockD1,
} from "../../../src/lib/server/services/__mocks__/cloudflare.js";

// Mock feature flags (used by arbor layout for grafts)
vi.mock("$lib/feature-flags", () => ({
  getEnabledGrafts: vi.fn(async () => ({})),
  isInGreenhouse: vi.fn(async () => false),
  isFeatureEnabled: vi.fn(async () => false),
}));

// Mock channel messages (used by arbor layout for notifications)
vi.mock("$lib/server/services/messages.js", () => ({
  loadChannelMessages: vi.fn(async () => []),
}));

// Mock tier features (used by root layout)
vi.mock("$lib/server/tier-features.js", () => ({
  getNavPageLimit: vi.fn(() => 5),
}));

// Import the load function AFTER mocks are set up
const { load: arborLayoutLoad } = await import(
  "../../../src/routes/arbor/+layout.server.js"
);
const { load: rootLayoutLoad } = await import(
  "../../../src/routes/+layout.server.js"
);

// ============================================================================
// Helpers
// ============================================================================

/** Create a mock LayoutServerLoad event for the arbor panel */
function createArborEvent(options: {
  tenantId: string;
  user?: { id: string; email: string; name: string; picture: string } | null;
  tenantRow?: {
    id: string;
    subdomain: string;
    display_name: string;
    email: string;
  };
  urlParams?: string;
}) {
  const db = createMockD1();
  const kv = createMockKV();

  // Seed the tenant in the mock database
  if (options.tenantRow) {
    seedMockD1(db, "tenants", [options.tenantRow]);
  }

  // Seed empty tables to prevent query errors
  seedMockD1(db, "comped_invites", []);

  const url = new URL(
    `https://${options.tenantRow?.subdomain || "test"}.grove.place/arbor${options.urlParams || ""}`,
  );

  return {
    locals: {
      user: options.user || null,
      tenantId: options.tenantId,
      context: {
        type: "tenant" as const,
        tenant: {
          id: options.tenantId,
          subdomain: options.tenantRow?.subdomain || "test",
          name: options.tenantRow?.display_name || "Test",
          ownerId: options.tenantRow?.email || "owner@example.com",
          plan: "seedling",
        },
      },
      csrfToken: "test-csrf",
    },
    url,
    platform: {
      env: {
        DB: db,
        CACHE_KV: kv,
      },
    },
    parent: async () => ({
      user: options.user || null,
      context: {
        type: "tenant" as const,
        tenant: {
          id: options.tenantId,
          subdomain: options.tenantRow?.subdomain || "test",
          name: options.tenantRow?.display_name || "Test",
          ownerId: options.tenantRow?.email || "owner@example.com",
          plan: "seedling",
        },
      },
      siteSettings: { font_family: "lexend" },
      navPages: [],
      navPageLimit: 5,
      enabledCuriosCount: 0,
      csrfToken: "test-csrf",
      showTimeline: false,
      showGallery: false,
      dbAccessError: false,
      isOwner: false,
    }),
  };
}

/** Create a mock event for the root layout */
function createRootLayoutEvent(options: {
  tenantId?: string;
  user?: { id: string; email: string; name: string; picture: string } | null;
  ownerEmail?: string;
}) {
  const db = createMockD1();
  const kv = createMockKV();

  return {
    locals: {
      user: options.user || null,
      tenantId: options.tenantId || null,
      context: options.tenantId
        ? {
            type: "tenant" as const,
            tenant: {
              id: options.tenantId,
              subdomain: "test",
              name: "Test Tenant",
              ownerId: options.ownerEmail || "owner@example.com",
              plan: "seedling",
            },
          }
        : { type: "landing" as const },
      csrfToken: "test-csrf",
    },
    platform: {
      env: {
        DB: db,
        CACHE_KV: kv,
      },
    },
  };
}

// ============================================================================
// Arbor Panel Access Control
// ============================================================================

describe("Arbor Panel: Cross-Account Access Control", () => {
  const ownerUser = {
    id: "user-owner",
    email: "gracious@example.com",
    name: "Gracious",
    picture: "https://cdn.grove.place/avatars/default.jpg",
  };

  const intruderUser = {
    id: "user-intruder",
    email: "autumn@grove.place",
    name: "Autumn",
    picture: "https://cdn.grove.place/avatars/default.jpg",
  };

  const tenantRow = {
    id: "tenant-gracious",
    subdomain: "gracious",
    display_name: "Gracious",
    email: "gracious@example.com",
  };

  describe("Ownership enforcement", () => {
    it("should redirect non-owner logged-in user away from arbor panel", async () => {
      // Arrange: Autumn (intruder) visits Gracious's arbor panel
      const event = createArborEvent({
        tenantId: "tenant-gracious",
        user: intruderUser,
        tenantRow,
      });

      // Act & Assert: Should throw a redirect
      try {
        await arborLayoutLoad(event as any);
        // If we reach here, the redirect was swallowed — the bug is back!
        expect.fail(
          "Expected redirect to be thrown for non-owner access, but load completed successfully. " +
            "This means a non-owner can access another tenant's admin panel.",
        );
      } catch (error: any) {
        // Verify it's a SvelteKit redirect, not a random error
        expect(error.status).toBe(302);
        expect(error.location).toBe("/");
      }
    });

    it("should allow the actual tenant owner to access arbor panel", async () => {
      // Arrange: Gracious visits their own arbor panel
      const event = createArborEvent({
        tenantId: "tenant-gracious",
        user: ownerUser,
        tenantRow,
      });

      // Act: Should load successfully
      const result = await arborLayoutLoad(event as any);

      // Assert: Loaded with correct tenant data
      expect(result.tenant).toBeDefined();
      expect(result.tenant?.id).toBe("tenant-gracious");
      expect(result.user).toEqual(ownerUser);
    });

    it("should redirect non-owner even with case-different email", async () => {
      // Arrange: User with differently-cased email that doesn't match
      const wrongUser = {
        ...intruderUser,
        email: "AUTUMN@grove.place", // Different email, even with case normalization
      };

      const event = createArborEvent({
        tenantId: "tenant-gracious",
        user: wrongUser,
        tenantRow,
      });

      // Act & Assert: Still redirected
      try {
        await arborLayoutLoad(event as any);
        expect.fail("Expected redirect for non-owner with different email");
      } catch (error: any) {
        expect(error.status).toBe(302);
        expect(error.location).toBe("/");
      }
    });

    it("should allow owner access with case-different email (normalization)", async () => {
      // Arrange: Owner with differently-cased version of their own email
      const caseOwner = {
        ...ownerUser,
        email: "GRACIOUS@EXAMPLE.COM",
      };

      const event = createArborEvent({
        tenantId: "tenant-gracious",
        user: caseOwner,
        tenantRow,
      });

      // Act: Should still load (emailsMatch normalizes case)
      const result = await arborLayoutLoad(event as any);
      expect(result.tenant?.id).toBe("tenant-gracious");
    });
  });

  describe("Authentication enforcement", () => {
    it("should redirect unauthenticated users to login", async () => {
      // Arrange: No user logged in
      const event = createArborEvent({
        tenantId: "tenant-gracious",
        user: null,
        tenantRow,
      });

      // Act & Assert
      try {
        await arborLayoutLoad(event as any);
        expect.fail("Expected redirect to login for unauthenticated user");
      } catch (error: any) {
        expect(error.status).toBe(302);
        expect(error.location).toContain("/auth/login");
      }
    });
  });

  describe("Example tenant bypass (documented S2-F2 risk)", () => {
    it("should allow unauthenticated access to example tenant", async () => {
      // The example tenant is intentionally public for demo purposes
      const exampleTenantRow = {
        id: "example-tenant-001",
        subdomain: "example",
        display_name: "Example Grove",
        email: "example@grove.place",
      };

      const event = createArborEvent({
        tenantId: "example-tenant-001",
        user: null,
        tenantRow: exampleTenantRow,
      });

      // Act: Should load without authentication
      const result = await arborLayoutLoad(event as any);
      expect(result.tenant).toBeDefined();
    });
  });

  describe("Demo mode", () => {
    it("should reject demo access with wrong secret", async () => {
      const event = createArborEvent({
        tenantId: "tenant-gracious",
        user: null,
        tenantRow,
        urlParams: "?demo=wrong-secret",
      });

      // Act & Assert: Should redirect to login (wrong secret = no demo)
      try {
        await arborLayoutLoad(event as any);
        expect.fail("Expected redirect with wrong demo secret");
      } catch (error: any) {
        expect(error.status).toBe(302);
        expect(error.location).toContain("/auth/login");
      }
    });
  });
});

// ============================================================================
// Root Layout: isOwner Computation
// ============================================================================

describe("Root Layout: isOwner for Admin Icon Visibility", () => {
  it("should set isOwner=true when logged-in user owns the tenant", async () => {
    const event = createRootLayoutEvent({
      tenantId: "tenant-1",
      user: {
        id: "user-1",
        email: "owner@example.com",
        name: "Owner",
        picture: "",
      },
      ownerEmail: "owner@example.com",
    });

    const result = await rootLayoutLoad(event as any);
    expect(result.isOwner).toBe(true);
  });

  it("should set isOwner=false when logged-in user does NOT own the tenant", async () => {
    const event = createRootLayoutEvent({
      tenantId: "tenant-1",
      user: {
        id: "user-2",
        email: "visitor@example.com",
        name: "Visitor",
        picture: "",
      },
      ownerEmail: "owner@example.com",
    });

    const result = await rootLayoutLoad(event as any);
    expect(result.isOwner).toBe(false);
  });

  it("should set isOwner=false when no user is logged in", async () => {
    const event = createRootLayoutEvent({
      tenantId: "tenant-1",
      user: null,
      ownerEmail: "owner@example.com",
    });

    const result = await rootLayoutLoad(event as any);
    expect(result.isOwner).toBe(false);
  });

  it("should set isOwner=false on non-tenant context (landing page)", async () => {
    const event = createRootLayoutEvent({
      user: {
        id: "user-1",
        email: "someone@example.com",
        name: "Someone",
        picture: "",
      },
    });

    const result = await rootLayoutLoad(event as any);
    expect(result.isOwner).toBe(false);
  });

  it("should handle case-insensitive email matching for isOwner", async () => {
    const event = createRootLayoutEvent({
      tenantId: "tenant-1",
      user: {
        id: "user-1",
        email: "OWNER@EXAMPLE.COM",
        name: "Owner",
        picture: "",
      },
      ownerEmail: "owner@example.com",
    });

    const result = await rootLayoutLoad(event as any);
    expect(result.isOwner).toBe(true);
  });
});
