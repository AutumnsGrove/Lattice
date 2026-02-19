/**
 * Tests for Grafts API — Engine-First Feature Flag Loading
 *
 * Tests the dynamic graft loading system that cascades all enabled
 * flags to admin pages via a single layout call.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { getEnabledGrafts, isGraftEnabled, type GraftsRecord } from "./grafts";
import { createMockEnv, createFlagRow } from "./test-utils";
import type { FeatureFlagsEnv } from "./types";

describe("Grafts API", () => {
  let env: FeatureFlagsEnv;

  beforeEach(() => {
    env = createMockEnv();
    vi.clearAllMocks();
  });

  describe("getEnabledGrafts", () => {
    it("returns empty record when no flags exist", async () => {
      // Arrange: Mock DB to return no flags
      const mockDB = env.DB as any;
      mockDB.prepare = vi.fn(() => ({
        all: vi.fn(async () => ({ results: [] })),
        bind: vi.fn(() => ({
          first: vi.fn(async () => null),
          all: vi.fn(async () => ({ results: [] })),
        })),
      }));

      // Act
      const grafts = await getEnabledGrafts({}, env);

      // Assert
      expect(grafts).toEqual({});
    });

    it("returns all enabled flags as booleans", async () => {
      // Arrange: Set up mock with multiple flags
      const mockDB = env.DB as any;
      const callCount = 0;

      mockDB.prepare = vi.fn((sql: string) => {
        // First call: getAllFlagIds - return list of flag IDs
        if (sql.includes("SELECT id FROM feature_flags")) {
          return {
            all: vi.fn(async () => ({
              results: [
                { id: "fireside_mode" },
                { id: "scribe_mode" },
                { id: "disabled_feature" },
              ],
            })),
          };
        }

        // Subsequent calls: individual flag evaluation
        return {
          bind: vi.fn((flagId: string) => ({
            first: vi.fn(async () => {
              if (flagId === "fireside_mode") {
                return createFlagRow("fireside_mode", {
                  enabled: 1,
                  default_value: "true",
                });
              }
              if (flagId === "scribe_mode") {
                return createFlagRow("scribe_mode", {
                  enabled: 1,
                  default_value: "true",
                });
              }
              if (flagId === "disabled_feature") {
                return createFlagRow("disabled_feature", {
                  enabled: 1,
                  default_value: "false",
                });
              }
              return null;
            }),
            all: vi.fn(async () => ({ results: [] })),
          })),
        };
      });

      // Act
      const grafts = await getEnabledGrafts({}, env);

      // Assert
      expect(grafts).toHaveProperty("fireside_mode");
      expect(grafts).toHaveProperty("scribe_mode");
      expect(grafts).toHaveProperty("disabled_feature");
      expect(grafts.fireside_mode).toBe(true);
      expect(grafts.scribe_mode).toBe(true);
      expect(grafts.disabled_feature).toBe(false);
    });

    it("respects greenhouse-only flags for non-greenhouse tenants", async () => {
      // Arrange: Set up a greenhouse-only flag
      const mockDB = env.DB as any;

      mockDB.prepare = vi.fn((sql: string) => {
        if (sql.includes("SELECT id FROM feature_flags")) {
          return {
            all: vi.fn(async () => ({
              results: [{ id: "greenhouse_feature" }],
            })),
          };
        }

        return {
          bind: vi.fn(() => ({
            first: vi.fn(async () =>
              createFlagRow("greenhouse_feature", {
                enabled: 1,
                default_value: "true",
                greenhouse_only: 1, // This flag requires greenhouse
              }),
            ),
            all: vi.fn(async () => ({ results: [] })),
          })),
        };
      });

      // Act: Evaluate WITHOUT greenhouse context
      const grafts = await getEnabledGrafts({ tenantId: "tenant-123" }, env);

      // Assert: Should be false because tenant is not in greenhouse
      expect(grafts.greenhouse_feature).toBe(false);
    });

    it("enables greenhouse-only flags for greenhouse tenants", async () => {
      // Arrange
      const mockDB = env.DB as any;

      mockDB.prepare = vi.fn((sql: string) => {
        if (sql.includes("SELECT id FROM feature_flags")) {
          return {
            all: vi.fn(async () => ({
              results: [{ id: "greenhouse_feature" }],
            })),
          };
        }

        return {
          bind: vi.fn(() => ({
            first: vi.fn(async () =>
              createFlagRow("greenhouse_feature", {
                enabled: 1,
                default_value: "true",
                greenhouse_only: 1,
              }),
            ),
            all: vi.fn(async () => ({ results: [] })),
          })),
        };
      });

      // Act: Evaluate WITH greenhouse context
      const grafts = await getEnabledGrafts(
        { tenantId: "tenant-123", inGreenhouse: true },
        env,
      );

      // Assert: Should be true because tenant IS in greenhouse
      expect(grafts.greenhouse_feature).toBe(true);
    });

    it("handles database errors gracefully", async () => {
      // Arrange: Mock DB to throw an error
      const mockDB = env.DB as any;
      mockDB.prepare = vi.fn(() => ({
        all: vi.fn(async () => {
          throw new Error("Database connection failed");
        }),
      }));

      // Spy on console.error to verify error logging
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // Act
      const grafts = await getEnabledGrafts({}, env);

      // Assert: Should return empty record, not throw
      expect(grafts).toEqual({});
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("[Grafts]"),
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });

    it("applies tenant-specific rules correctly", async () => {
      // Arrange: Set up flag with tenant rule
      const mockDB = env.DB as any;

      mockDB.prepare = vi.fn((sql: string) => {
        if (sql.includes("SELECT id FROM feature_flags")) {
          return {
            all: vi.fn(async () => ({
              results: [{ id: "tenant_gated" }],
            })),
          };
        }

        if (sql.includes("flag_rules")) {
          return {
            bind: vi.fn(() => ({
              all: vi.fn(async () => ({
                results: [
                  {
                    id: 1,
                    flag_id: "tenant_gated",
                    priority: 100,
                    rule_type: "tenant",
                    rule_value: JSON.stringify({
                      tenantIds: ["autumn-primary"],
                    }),
                    result_value: "true",
                    enabled: 1,
                    created_at: new Date().toISOString(),
                  },
                ],
              })),
            })),
          };
        }

        return {
          bind: vi.fn(() => ({
            first: vi.fn(async () =>
              createFlagRow("tenant_gated", {
                enabled: 1,
                default_value: "false", // Default is false
              }),
            ),
            all: vi.fn(async () => ({
              results: [
                {
                  id: 1,
                  flag_id: "tenant_gated",
                  priority: 100,
                  rule_type: "tenant",
                  rule_value: JSON.stringify({ tenantIds: ["autumn-primary"] }),
                  result_value: "true",
                  enabled: 1,
                  created_at: new Date().toISOString(),
                },
              ],
            })),
          })),
        };
      });

      // Act: Test with matching tenant
      const matchingGrafts = await getEnabledGrafts(
        { tenantId: "autumn-primary" },
        env,
      );

      // Assert
      expect(matchingGrafts.tenant_gated).toBe(true);
    });
  });

  describe("isGraftEnabled", () => {
    it("returns fallback when grafts is undefined", () => {
      // Act & Assert
      expect(isGraftEnabled(undefined, "fireside_mode")).toBe(false);
      expect(isGraftEnabled(undefined, "fireside_mode", true)).toBe(true);
    });

    it("returns fallback when graft not in record", () => {
      // Arrange
      const grafts: GraftsRecord = {
        existing_graft: true,
      };

      // Act & Assert
      expect(isGraftEnabled(grafts, "missing_graft")).toBe(false);
      expect(isGraftEnabled(grafts, "missing_graft", true)).toBe(true);
    });

    it("returns actual value when graft exists", () => {
      // Arrange
      const grafts: GraftsRecord = {
        enabled_graft: true,
        disabled_graft: false,
      };

      // Act & Assert
      expect(isGraftEnabled(grafts, "enabled_graft")).toBe(true);
      expect(isGraftEnabled(grafts, "disabled_graft")).toBe(false);
      // Fallback should be ignored when value exists
      expect(isGraftEnabled(grafts, "disabled_graft", true)).toBe(false);
    });
  });
});

describe("Grafts Integration", () => {
  it("works with the standard test utilities", async () => {
    // Arrange: Use the standard createMockEnv pattern
    const env = createMockEnv();
    const mockDB = env.DB as any;

    // Set up multiple flags using the same pattern as other tests
    mockDB.prepare = vi.fn((sql: string) => {
      if (sql.includes("SELECT id FROM feature_flags")) {
        return {
          all: vi.fn(async () => ({
            results: [{ id: "fireside_mode" }, { id: "scribe_mode" }],
          })),
        };
      }

      return {
        bind: vi.fn((flagId: string) => ({
          first: vi.fn(async () => {
            if (flagId === "fireside_mode" || flagId === "scribe_mode") {
              return createFlagRow(flagId, {
                enabled: 1,
                default_value: "true",
                greenhouse_only: 1,
              });
            }
            return null;
          }),
          all: vi.fn(async () => ({ results: [] })),
        })),
      };
    });

    // Act: Simulate what admin layout does
    const grafts = await getEnabledGrafts(
      { tenantId: "autumn-primary", inGreenhouse: true },
      env,
    );

    // Assert: Both grafts should be enabled for greenhouse tenant
    expect(isGraftEnabled(grafts, "fireside_mode")).toBe(true);
    expect(isGraftEnabled(grafts, "scribe_mode")).toBe(true);
    // Unknown grafts should return false
    expect(isGraftEnabled(grafts, "unknown_graft")).toBe(false);
  });
});
