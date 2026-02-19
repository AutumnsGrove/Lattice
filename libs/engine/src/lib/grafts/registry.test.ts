/**
 * Graft Registry Tests
 *
 * Tests for the graft registry and helper functions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  GRAFT_REGISTRY,
  getGraftEntry,
  isGraftEnabled,
  getAllGrafts,
  getGraftsByStatus,
} from "./registry.js";
import type { GraftContext } from "./types.js";

// Mock the feature flags module
vi.mock("../feature-flags/index.js", () => ({
  isFeatureEnabled: vi.fn(),
}));

describe("Graft Registry", () => {
  describe("GRAFT_REGISTRY", () => {
    it("contains the pricing graft", () => {
      expect(GRAFT_REGISTRY.has("pricing")).toBe(true);
    });

    it("pricing graft has correct metadata", () => {
      const pricing = GRAFT_REGISTRY.get("pricing");

      expect(pricing).toBeDefined();
      expect(pricing?.id).toBe("pricing");
      expect(pricing?.name).toBe("Pricing Graft");
      expect(pricing?.version).toBe("1.0.0");
      expect(pricing?.status).toBe("stable");
      expect(pricing?.featureFlagId).toBe("pricing_graft");
    });
  });

  describe("getGraftEntry", () => {
    it("returns graft entry for valid ID", () => {
      const entry = getGraftEntry("pricing");

      expect(entry).toBeDefined();
      expect(entry?.id).toBe("pricing");
    });

    it("returns undefined for unknown graft ID", () => {
      const entry = getGraftEntry("nonexistent");

      expect(entry).toBeUndefined();
    });
  });

  describe("getAllGrafts", () => {
    it("returns array of all registered grafts", () => {
      const grafts = getAllGrafts();

      expect(Array.isArray(grafts)).toBe(true);
      expect(grafts.length).toBe(GRAFT_REGISTRY.size);
    });

    it("includes the pricing graft", () => {
      const grafts = getAllGrafts();
      const pricing = grafts.find((g) => g.id === "pricing");

      expect(pricing).toBeDefined();
    });
  });

  describe("getGraftsByStatus", () => {
    it("returns stable grafts", () => {
      const stable = getGraftsByStatus("stable");

      expect(stable.every((g) => g.status === "stable")).toBe(true);
      expect(stable.find((g) => g.id === "pricing")).toBeDefined();
    });

    it("returns empty array for status with no grafts", () => {
      const deprecated = getGraftsByStatus("deprecated");

      // Might be empty if no deprecated grafts
      expect(Array.isArray(deprecated)).toBe(true);
      expect(deprecated.every((g) => g.status === "deprecated")).toBe(true);
    });
  });

  describe("isGraftEnabled", () => {
    beforeEach(() => {
      vi.resetAllMocks();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("returns false for unknown graft", async () => {
      const context: GraftContext = { productId: "grove" };
      const enabled = await isGraftEnabled("unknown_graft", context);

      expect(enabled).toBe(false);
    });

    it("returns true when graft has no feature flag", async () => {
      // Temporarily add a graft without a feature flag
      const testGraft = {
        id: "test_no_flag",
        name: "Test Graft",
        description: "A test graft without feature flag",
        version: "1.0.0",
        status: "stable" as const,
        // Note: no featureFlagId
      };

      GRAFT_REGISTRY.set("test_no_flag", testGraft);

      try {
        const context: GraftContext = { productId: "grove" };
        const enabled = await isGraftEnabled("test_no_flag", context);

        expect(enabled).toBe(true);
      } finally {
        // Clean up
        GRAFT_REGISTRY.delete("test_no_flag");
      }
    });

    it("returns true when no env provided (can't check flags)", async () => {
      const context: GraftContext = {
        productId: "grove",
        // Note: no env provided
      };

      const enabled = await isGraftEnabled("pricing", context);

      expect(enabled).toBe(true);
    });

    it("checks feature flag when env is provided", async () => {
      const { isFeatureEnabled } = await import("../feature-flags/index.js");
      const mockIsFeatureEnabled = vi.mocked(isFeatureEnabled);
      mockIsFeatureEnabled.mockResolvedValue(true);

      const mockEnv = {
        FEATURE_FLAGS: {} as unknown,
      };

      const context: GraftContext = {
        productId: "grove",
        tenantId: "tenant123",
        tier: "seedling",
        env: mockEnv as import("../feature-flags/types.js").FeatureFlagsEnv,
      };

      const enabled = await isGraftEnabled("pricing", context);

      expect(enabled).toBe(true);
      expect(mockIsFeatureEnabled).toHaveBeenCalledWith(
        "pricing_graft",
        expect.objectContaining({
          tenantId: "tenant123",
          tier: "seedling",
        }),
        mockEnv,
      );
    });

    it("returns false when feature flag check fails", async () => {
      const { isFeatureEnabled } = await import("../feature-flags/index.js");
      const mockIsFeatureEnabled = vi.mocked(isFeatureEnabled);
      mockIsFeatureEnabled.mockResolvedValue(false);

      const mockEnv = {
        FEATURE_FLAGS: {} as unknown,
      };

      const context: GraftContext = {
        productId: "grove",
        env: mockEnv as import("../feature-flags/types.js").FeatureFlagsEnv,
      };

      const enabled = await isGraftEnabled("pricing", context);

      expect(enabled).toBe(false);
    });
  });
});
