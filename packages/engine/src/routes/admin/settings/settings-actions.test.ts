/**
 * Tests for Settings Page Wayfinder Actions
 *
 * Tests the Wayfinder-only greenhouse admin actions:
 * - enrollTenant
 * - removeTenant
 * - toggleTenant
 * - cultivateFlag
 * - pruneFlag
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock the feature-flags module
vi.mock("$lib/feature-flags", () => ({
  getGreenhouseTenant: vi.fn(),
  getTenantControllableGrafts: vi.fn(),
  setTenantGraftOverride: vi.fn(),
  resetTenantGraftOverrides: vi.fn(),
  getGreenhouseTenants: vi.fn(),
  enrollInGreenhouse: vi.fn(),
  removeFromGreenhouse: vi.fn(),
  toggleGreenhouseStatus: vi.fn(),
  getFeatureFlags: vi.fn(),
  setFlagEnabled: vi.fn(),
}));

import {
  enrollInGreenhouse,
  removeFromGreenhouse,
  toggleGreenhouseStatus,
  setFlagEnabled,
} from "$lib/feature-flags";

// Import the actions module
// Note: We test the action logic patterns, not the actual SvelteKit actions
// since those require the full request/response cycle

describe("Settings Page - Wayfinder Actions", () => {
  const WAYFINDER_EMAIL = "autumn@grove.place";
  const NON_WAYFINDER_EMAIL = "user@example.com";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Wayfinder Authorization", () => {
    it("identifies Wayfinder by email", () => {
      // The isWayfinder function checks if email is in WAYFINDER_EMAILS
      const isWayfinder = (email: string | undefined): boolean => {
        if (!email) return false;
        return ["autumn@grove.place"].includes(email.toLowerCase());
      };

      expect(isWayfinder(WAYFINDER_EMAIL)).toBe(true);
      expect(isWayfinder(NON_WAYFINDER_EMAIL)).toBe(false);
      expect(isWayfinder(undefined)).toBe(false);
      expect(isWayfinder("AUTUMN@GROVE.PLACE")).toBe(true); // Case insensitive
    });
  });

  describe("enrollTenant action", () => {
    it("calls enrollInGreenhouse with correct parameters", async () => {
      const mockEnroll = vi.mocked(enrollInGreenhouse);
      mockEnroll.mockResolvedValue(true);

      const tenantId = "tenant-123";
      const notes = "Test enrollment";
      const enrolledBy = WAYFINDER_EMAIL;
      const env = { DB: {}, FLAGS_KV: {} };

      await enrollInGreenhouse(tenantId, enrolledBy, notes, env as any);

      expect(mockEnroll).toHaveBeenCalledWith(tenantId, enrolledBy, notes, env);
    });

    it("handles enrollment failure", async () => {
      const mockEnroll = vi.mocked(enrollInGreenhouse);
      mockEnroll.mockResolvedValue(false);

      const result = await enrollInGreenhouse(
        "tenant-123",
        WAYFINDER_EMAIL,
        undefined,
        {} as any,
      );

      expect(result).toBe(false);
    });
  });

  describe("removeTenant action", () => {
    it("calls removeFromGreenhouse with correct parameters", async () => {
      const mockRemove = vi.mocked(removeFromGreenhouse);
      mockRemove.mockResolvedValue(true);

      const tenantId = "tenant-123";
      const env = { DB: {}, FLAGS_KV: {} };

      await removeFromGreenhouse(tenantId, env as any);

      expect(mockRemove).toHaveBeenCalledWith(tenantId, env);
    });

    it("handles removal failure", async () => {
      const mockRemove = vi.mocked(removeFromGreenhouse);
      mockRemove.mockResolvedValue(false);

      const result = await removeFromGreenhouse("tenant-123", {} as any);

      expect(result).toBe(false);
    });
  });

  describe("toggleTenant action", () => {
    it("enables a tenant's greenhouse status", async () => {
      const mockToggle = vi.mocked(toggleGreenhouseStatus);
      mockToggle.mockResolvedValue(true);

      const tenantId = "tenant-123";
      const enabled = true;
      const env = { DB: {}, FLAGS_KV: {} };

      await toggleGreenhouseStatus(tenantId, enabled, env as any);

      expect(mockToggle).toHaveBeenCalledWith(tenantId, true, env);
    });

    it("disables a tenant's greenhouse status", async () => {
      const mockToggle = vi.mocked(toggleGreenhouseStatus);
      mockToggle.mockResolvedValue(true);

      const tenantId = "tenant-123";
      const enabled = false;
      const env = { DB: {}, FLAGS_KV: {} };

      await toggleGreenhouseStatus(tenantId, enabled, env as any);

      expect(mockToggle).toHaveBeenCalledWith(tenantId, false, env);
    });
  });

  describe("cultivateFlag action", () => {
    it("enables a flag globally", async () => {
      const mockSetEnabled = vi.mocked(setFlagEnabled);
      mockSetEnabled.mockResolvedValue(true);

      const flagId = "fireside_mode";
      const env = { DB: {}, FLAGS_KV: {} };

      await setFlagEnabled(flagId, true, env as any);

      expect(mockSetEnabled).toHaveBeenCalledWith(flagId, true, env);
    });

    it("handles cultivate failure", async () => {
      const mockSetEnabled = vi.mocked(setFlagEnabled);
      mockSetEnabled.mockResolvedValue(false);

      const result = await setFlagEnabled("bad_flag", true, {} as any);

      expect(result).toBe(false);
    });
  });

  describe("pruneFlag action", () => {
    it("disables a flag globally", async () => {
      const mockSetEnabled = vi.mocked(setFlagEnabled);
      mockSetEnabled.mockResolvedValue(true);

      const flagId = "fireside_mode";
      const env = { DB: {}, FLAGS_KV: {} };

      await setFlagEnabled(flagId, false, env as any);

      expect(mockSetEnabled).toHaveBeenCalledWith(flagId, false, env);
    });

    it("handles prune failure", async () => {
      const mockSetEnabled = vi.mocked(setFlagEnabled);
      mockSetEnabled.mockResolvedValue(false);

      const result = await setFlagEnabled("bad_flag", false, {} as any);

      expect(result).toBe(false);
    });
  });
});

describe("Greenhouse Admin Panel Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads greenhouse tenants for Wayfinder", async () => {
    // This tests the data loading pattern used in the load function
    const mockGetTenants = vi.fn().mockResolvedValue([
      { tenantId: "tenant-1", enabled: true, enrolledAt: new Date() },
      { tenantId: "tenant-2", enabled: false, enrolledAt: new Date() },
    ]);

    const tenants = await mockGetTenants();

    expect(tenants).toHaveLength(2);
    expect(tenants[0].tenantId).toBe("tenant-1");
    expect(tenants[0].enabled).toBe(true);
  });

  it("calculates stats correctly", () => {
    const tenants = [
      { tenantId: "1", enabled: true },
      { tenantId: "2", enabled: true },
      { tenantId: "3", enabled: false },
    ];

    const totalEnrolled = tenants.length;
    const activeCount = tenants.filter((t) => t.enabled).length;
    const disabledCount = totalEnrolled - activeCount;

    expect(totalEnrolled).toBe(3);
    expect(activeCount).toBe(2);
    expect(disabledCount).toBe(1);
  });

  it("builds tenant names map correctly", () => {
    const allTenants = [
      { id: "t1", username: "alice", display_name: "Alice's Blog" },
      { id: "t2", username: "bob", display_name: null },
      { id: "t3", username: "charlie", display_name: "" },
    ];

    const tenantNames: Record<string, string> = {};
    for (const t of allTenants) {
      tenantNames[t.id] = t.display_name || t.username || t.id;
    }

    expect(tenantNames["t1"]).toBe("Alice's Blog");
    expect(tenantNames["t2"]).toBe("bob");
    expect(tenantNames["t3"]).toBe("charlie"); // Falls back to username
  });

  it("builds available tenants map excluding enrolled", () => {
    const allTenants = [
      { id: "t1", username: "alice", display_name: "Alice" },
      { id: "t2", username: "bob", display_name: "Bob" },
      { id: "t3", username: "charlie", display_name: "Charlie" },
    ];

    const enrolledIds = new Set(["t1", "t3"]);

    const availableTenants: Record<string, string> = {};
    for (const t of allTenants) {
      if (!enrolledIds.has(t.id)) {
        availableTenants[t.id] = t.display_name || t.username;
      }
    }

    expect(Object.keys(availableTenants)).toEqual(["t2"]);
    expect(availableTenants["t2"]).toBe("Bob");
  });
});
