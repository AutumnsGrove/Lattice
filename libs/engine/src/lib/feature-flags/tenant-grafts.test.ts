/**
 * Tests for Tenant Graft Override API
 *
 * Tests the self-serve graft control system that allows greenhouse tenants
 * to toggle experimental features on/off for their own site.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getTenantControllableGrafts,
  setTenantGraftOverride,
  removeTenantGraftOverride,
  resetTenantGraftOverrides,
} from "./tenant-grafts";
import { createMockEnv, createFlagRow } from "./test-utils";
import type { FeatureFlagsEnv } from "./types";

describe("Tenant Grafts API", () => {
  let env: FeatureFlagsEnv;

  beforeEach(() => {
    env = createMockEnv();
    vi.clearAllMocks();
  });

  describe("getTenantControllableGrafts", () => {
    it("returns empty array when no greenhouse-only flags exist", async () => {
      // Arrange: Mock DB to return no flags
      const mockDB = env.DB as any;
      mockDB.prepare = vi.fn(() => ({
        all: vi.fn(async () => ({ results: [] })),
        bind: vi.fn(() => ({
          all: vi.fn(async () => ({ results: [] })),
        })),
      }));

      // Act
      const grafts = await getTenantControllableGrafts("tenant-123", env);

      // Assert
      expect(grafts).toEqual([]);
    });

    it("returns greenhouse-only enabled flags", async () => {
      // Arrange: Set up mock with greenhouse-only flags
      const mockDB = env.DB as any;

      mockDB.prepare = vi.fn((sql: string) => {
        // First query: get greenhouse-only flags
        if (sql.includes("greenhouse_only = 1")) {
          return {
            all: vi.fn(async () => ({
              results: [
                createFlagRow("fireside_mode", {
                  name: "Fireside Mode",
                  description: "AI writing assistance",
                  enabled: 1,
                  greenhouse_only: 1,
                  default_value: "true",
                }),
                createFlagRow("scribe_mode", {
                  name: "Scribe Mode",
                  description: "Voice transcription",
                  enabled: 1,
                  greenhouse_only: 1,
                  default_value: "true",
                }),
              ],
            })),
          };
        }

        // Second query: get tenant overrides
        if (sql.includes("tenant_override")) {
          return {
            bind: vi.fn(() => ({
              all: vi.fn(async () => ({ results: [] })),
            })),
          };
        }

        return {
          bind: vi.fn(() => ({
            all: vi.fn(async () => ({ results: [] })),
          })),
        };
      });

      // Act
      const grafts = await getTenantControllableGrafts("tenant-123", env);

      // Assert
      expect(grafts).toHaveLength(2);
      expect(grafts[0]).toMatchObject({
        id: "fireside_mode",
        name: "Fireside Mode",
        description: "AI writing assistance",
        enabled: true,
        hasOverride: false,
        globalDefault: true,
        category: "experimental",
      });
      expect(grafts[1]).toMatchObject({
        id: "scribe_mode",
        name: "Scribe Mode",
      });
    });

    it("reflects tenant-specific overrides in enabled status", async () => {
      // Arrange: Set up flag with a tenant override
      const mockDB = env.DB as any;

      mockDB.prepare = vi.fn((sql: string) => {
        if (sql.includes("greenhouse_only = 1")) {
          return {
            all: vi.fn(async () => ({
              results: [
                createFlagRow("fireside_mode", {
                  name: "Fireside Mode",
                  enabled: 1,
                  greenhouse_only: 1,
                  default_value: "true",
                }),
              ],
            })),
          };
        }

        if (sql.includes("tenant_override")) {
          return {
            bind: vi.fn(() => ({
              all: vi.fn(async () => ({
                results: [
                  {
                    flag_id: "fireside_mode",
                    result_value: "false", // Tenant disabled it
                    enabled: 1,
                  },
                ],
              })),
            })),
          };
        }

        return {
          bind: vi.fn(() => ({
            all: vi.fn(async () => ({ results: [] })),
          })),
        };
      });

      // Act
      const grafts = await getTenantControllableGrafts("tenant-123", env);

      // Assert
      expect(grafts[0].enabled).toBe(false); // Override took effect
      expect(grafts[0].hasOverride).toBe(true);
      expect(grafts[0].globalDefault).toBe(true); // Global default still true
    });

    it("handles database errors gracefully", async () => {
      // Arrange: Mock DB to throw
      const mockDB = env.DB as any;
      mockDB.prepare = vi.fn(() => {
        throw new Error("Database connection failed");
      });

      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // Act
      const grafts = await getTenantControllableGrafts("tenant-123", env);

      // Assert
      expect(grafts).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("[TenantGrafts]"),
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });
  });

  describe("setTenantGraftOverride", () => {
    it("creates an override for a valid greenhouse-only flag", async () => {
      // Arrange
      const mockDB = env.DB as any;
      let insertCalled = false;

      mockDB.prepare = vi.fn((sql: string) => {
        // Verify flag exists and is greenhouse-only
        if (sql.includes("SELECT id, greenhouse_only, enabled")) {
          return {
            bind: vi.fn(() => ({
              first: vi.fn(async () => ({
                id: "fireside_mode",
                greenhouse_only: 1,
                enabled: 1,
              })),
            })),
          };
        }

        // Try to update existing rule (returns 0 changes)
        if (sql.includes("UPDATE flag_rules")) {
          return {
            bind: vi.fn(() => ({
              run: vi.fn(async () => ({ meta: { changes: 0 } })),
            })),
          };
        }

        // Insert new rule
        if (sql.includes("INSERT INTO flag_rules")) {
          insertCalled = true;
          return {
            bind: vi.fn(() => ({
              run: vi.fn(async () => ({ meta: { changes: 1 } })),
            })),
          };
        }

        return {
          bind: vi.fn(() => ({
            run: vi.fn(async () => ({ meta: { changes: 0 } })),
          })),
        };
      });

      // Mock KV for cache invalidation
      const mockKV = env.FLAGS_KV as any;
      mockKV.delete = vi.fn(async () => {});

      // Act
      const result = await setTenantGraftOverride(
        "fireside_mode",
        "tenant-123",
        false,
        env,
      );

      // Assert
      expect(result).toBe(true);
      expect(insertCalled).toBe(true);
    });

    it("rejects non-greenhouse-only flags", async () => {
      // Arrange
      const mockDB = env.DB as any;

      mockDB.prepare = vi.fn((sql: string) => {
        if (sql.includes("SELECT id, greenhouse_only, enabled")) {
          return {
            bind: vi.fn(() => ({
              first: vi.fn(async () => ({
                id: "public_flag",
                greenhouse_only: 0, // Not greenhouse-only
                enabled: 1,
              })),
            })),
          };
        }

        return {
          bind: vi.fn(() => ({
            run: vi.fn(async () => ({ meta: { changes: 0 } })),
          })),
        };
      });

      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // Act
      const result = await setTenantGraftOverride(
        "public_flag",
        "tenant-123",
        false,
        env,
      );

      // Assert
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("not greenhouse-only"),
      );

      consoleSpy.mockRestore();
    });

    it("rejects non-existent flags", async () => {
      // Arrange
      const mockDB = env.DB as any;

      mockDB.prepare = vi.fn((sql: string) => {
        if (sql.includes("SELECT id, greenhouse_only, enabled")) {
          return {
            bind: vi.fn(() => ({
              first: vi.fn(async () => null),
            })),
          };
        }

        return {
          bind: vi.fn(() => ({
            run: vi.fn(async () => ({ meta: { changes: 0 } })),
          })),
        };
      });

      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // Act
      const result = await setTenantGraftOverride(
        "nonexistent_flag",
        "tenant-123",
        false,
        env,
      );

      // Assert
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("not found"),
      );

      consoleSpy.mockRestore();
    });

    it("updates existing override instead of creating duplicate", async () => {
      // Arrange
      const mockDB = env.DB as any;
      let updateCalled = false;
      let insertCalled = false;

      mockDB.prepare = vi.fn((sql: string) => {
        if (sql.includes("SELECT id, greenhouse_only, enabled")) {
          return {
            bind: vi.fn(() => ({
              first: vi.fn(async () => ({
                id: "fireside_mode",
                greenhouse_only: 1,
                enabled: 1,
              })),
            })),
          };
        }

        // Existing rule found, update it
        if (sql.includes("UPDATE flag_rules")) {
          updateCalled = true;
          return {
            bind: vi.fn(() => ({
              run: vi.fn(async () => ({ meta: { changes: 1 } })),
            })),
          };
        }

        if (sql.includes("INSERT INTO flag_rules")) {
          insertCalled = true;
          return {
            bind: vi.fn(() => ({
              run: vi.fn(async () => ({ meta: { changes: 1 } })),
            })),
          };
        }

        return {
          bind: vi.fn(() => ({
            run: vi.fn(async () => ({ meta: { changes: 0 } })),
          })),
        };
      });

      const mockKV = env.FLAGS_KV as any;
      mockKV.delete = vi.fn(async () => {});

      // Act
      const result = await setTenantGraftOverride(
        "fireside_mode",
        "tenant-123",
        true,
        env,
      );

      // Assert
      expect(result).toBe(true);
      expect(updateCalled).toBe(true);
      expect(insertCalled).toBe(false); // Should not insert if update succeeded
    });
  });

  describe("removeTenantGraftOverride", () => {
    it("removes an existing override", async () => {
      // Arrange
      const mockDB = env.DB as any;
      let deleteCalled = false;

      mockDB.prepare = vi.fn((sql: string) => {
        if (sql.includes("DELETE FROM flag_rules")) {
          deleteCalled = true;
          return {
            bind: vi.fn(() => ({
              run: vi.fn(async () => ({ meta: { changes: 1 } })),
            })),
          };
        }

        return {
          bind: vi.fn(() => ({
            run: vi.fn(async () => ({ meta: { changes: 0 } })),
          })),
        };
      });

      const mockKV = env.FLAGS_KV as any;
      mockKV.delete = vi.fn(async () => {});

      // Act
      const result = await removeTenantGraftOverride(
        "fireside_mode",
        "tenant-123",
        env,
      );

      // Assert
      expect(result).toBe(true);
      expect(deleteCalled).toBe(true);
    });

    it("succeeds even when no override exists", async () => {
      // Arrange
      const mockDB = env.DB as any;

      mockDB.prepare = vi.fn(() => ({
        bind: vi.fn(() => ({
          run: vi.fn(async () => ({ meta: { changes: 0 } })),
        })),
      }));

      const mockKV = env.FLAGS_KV as any;
      mockKV.delete = vi.fn(async () => {});

      // Act
      const result = await removeTenantGraftOverride(
        "fireside_mode",
        "tenant-123",
        env,
      );

      // Assert - should still succeed (idempotent)
      expect(result).toBe(true);
    });
  });

  describe("resetTenantGraftOverrides", () => {
    it("removes all overrides for a tenant", async () => {
      // Arrange
      const mockDB = env.DB as any;
      let deleteCalled = false;

      mockDB.prepare = vi.fn((sql: string) => {
        if (
          sql.includes("DELETE FROM flag_rules") &&
          sql.includes("tenant_override")
        ) {
          deleteCalled = true;
          return {
            bind: vi.fn(() => ({
              run: vi.fn(async () => ({ meta: { changes: 3 } })),
            })),
          };
        }

        return {
          bind: vi.fn(() => ({
            run: vi.fn(async () => ({ meta: { changes: 0 } })),
          })),
        };
      });

      const mockKV = env.FLAGS_KV as any;
      mockKV.delete = vi.fn(async () => {});

      // Act
      const count = await resetTenantGraftOverrides("tenant-123", env);

      // Assert
      expect(count).toBe(3);
      expect(deleteCalled).toBe(true);
    });

    it("returns 0 when no overrides exist", async () => {
      // Arrange
      const mockDB = env.DB as any;

      mockDB.prepare = vi.fn(() => ({
        bind: vi.fn(() => ({
          run: vi.fn(async () => ({ meta: { changes: 0 } })),
        })),
      }));

      const mockKV = env.FLAGS_KV as any;
      mockKV.delete = vi.fn(async () => {});

      // Act
      const count = await resetTenantGraftOverrides("tenant-123", env);

      // Assert
      expect(count).toBe(0);
    });

    it("handles database errors gracefully", async () => {
      // Arrange
      const mockDB = env.DB as any;
      mockDB.prepare = vi.fn(() => {
        throw new Error("Database error");
      });

      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // Act
      const count = await resetTenantGraftOverrides("tenant-123", env);

      // Assert
      expect(count).toBe(0);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});

describe("Tenant Grafts Category Detection", () => {
  let env: FeatureFlagsEnv;

  beforeEach(() => {
    env = createMockEnv();
    vi.clearAllMocks();
  });

  it("categorizes flags by ID prefix", async () => {
    // Arrange
    const mockDB = env.DB as any;

    mockDB.prepare = vi.fn((sql: string) => {
      if (sql.includes("greenhouse_only = 1")) {
        return {
          all: vi.fn(async () => ({
            results: [
              createFlagRow("beta_dark_theme", {
                name: "Dark Theme Beta",
                enabled: 1,
                greenhouse_only: 1,
                default_value: "true",
              }),
              createFlagRow("stable_markdown_v2", {
                name: "Markdown V2",
                enabled: 1,
                greenhouse_only: 1,
                default_value: "true",
              }),
              createFlagRow("fireside_mode", {
                name: "Fireside Mode",
                enabled: 1,
                greenhouse_only: 1,
                default_value: "true",
              }),
            ],
          })),
        };
      }

      return {
        bind: vi.fn(() => ({
          all: vi.fn(async () => ({ results: [] })),
        })),
      };
    });

    // Act
    const grafts = await getTenantControllableGrafts("tenant-123", env);

    // Assert
    expect(grafts.find((g) => g.id === "beta_dark_theme")?.category).toBe(
      "beta",
    );
    expect(grafts.find((g) => g.id === "stable_markdown_v2")?.category).toBe(
      "stable",
    );
    expect(grafts.find((g) => g.id === "fireside_mode")?.category).toBe(
      "experimental",
    );
  });
});
