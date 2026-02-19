/**
 * Grafts Cascade Integration Tests
 *
 * Tests the full grafts cascade flow:
 * 1. Feature flags in database → getEnabledGrafts() → admin layout → page data
 * 2. Greenhouse-only flags are correctly gated
 * 3. Tenant-specific rules are applied
 *
 * These tests verify the "engine-first" architecture where grafts are loaded
 * once at the admin layout level and cascaded to all child pages.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { createMockD1, createMockKV } from "../helpers/index.js";
import {
  getEnabledGrafts,
  isInGreenhouse,
} from "../../../src/lib/feature-flags/index.js";
import type { FeatureFlagsEnv } from "../../../src/lib/feature-flags/types.js";

// ============================================================================
// Test Fixtures
// ============================================================================

/**
 * Seed feature flags for integration testing
 */
function seedFeatureFlags(db: ReturnType<typeof createMockD1>) {
  // Set up the mock to track flags and their rules
  const flags = new Map<string, any>();
  const flagRules = new Map<string, any[]>();

  // Add test flags
  flags.set("fireside_mode", {
    id: "fireside_mode",
    name: "Fireside Mode",
    flag_type: "boolean",
    default_value: "true",
    enabled: 1,
    greenhouse_only: 1,
    cache_ttl: 60,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  flags.set("scribe_mode", {
    id: "scribe_mode",
    name: "Scribe Mode",
    flag_type: "boolean",
    default_value: "true",
    enabled: 1,
    greenhouse_only: 1,
    cache_ttl: 60,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  flags.set("public_feature", {
    id: "public_feature",
    name: "Public Feature",
    flag_type: "boolean",
    default_value: "true",
    enabled: 1,
    greenhouse_only: 0, // NOT greenhouse-only
    cache_ttl: 60,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  flags.set("tenant_gated_feature", {
    id: "tenant_gated_feature",
    name: "Tenant Gated Feature",
    flag_type: "boolean",
    default_value: "false", // Default is false
    enabled: 1,
    greenhouse_only: 0,
    cache_ttl: 60,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  // Add tenant rule for tenant_gated_feature
  flagRules.set("tenant_gated_feature", [
    {
      id: 1,
      flag_id: "tenant_gated_feature",
      priority: 100,
      rule_type: "tenant",
      rule_value: JSON.stringify({
        tenantIds: ["autumn-primary", "special-tenant"],
      }),
      result_value: "true",
      enabled: 1,
      created_at: new Date().toISOString(),
    },
  ]);

  // Configure the mock prepare function
  db.prepare = vi.fn((sql: string) => {
    // Handle "SELECT id FROM feature_flags WHERE enabled = 1"
    if (sql.includes("SELECT id FROM feature_flags")) {
      return {
        all: vi.fn(async () => ({
          results: Array.from(flags.keys()).map((id) => ({ id })),
        })),
      };
    }

    // Handle "SELECT * FROM feature_flags WHERE id = ?"
    if (sql.includes("SELECT * FROM feature_flags WHERE id")) {
      return {
        bind: vi.fn((flagId: string) => ({
          first: vi.fn(async () => flags.get(flagId) ?? null),
        })),
      };
    }

    // Handle "SELECT * FROM flag_rules WHERE flag_id = ?"
    if (sql.includes("flag_rules")) {
      return {
        bind: vi.fn((flagId: string) => ({
          all: vi.fn(async () => ({
            results: flagRules.get(flagId) ?? [],
          })),
        })),
      };
    }

    // Handle greenhouse_tenants queries
    if (sql.includes("greenhouse_tenants")) {
      return {
        bind: vi.fn((tenantId: string) => ({
          first: vi.fn(async () => {
            // Mock: autumn-primary is in greenhouse
            if (tenantId === "autumn-primary") {
              return { tenant_id: tenantId, enabled: 1 };
            }
            return null;
          }),
        })),
      };
    }

    // Default fallback
    return {
      bind: vi.fn(() => ({
        first: vi.fn(async () => null),
        all: vi.fn(async () => ({ results: [] })),
      })),
      first: vi.fn(async () => null),
      all: vi.fn(async () => ({ results: [] })),
    };
  });

  return { flags, flagRules };
}

// ============================================================================
// Integration Tests
// ============================================================================

describe("Grafts Cascade Integration", () => {
  let db: ReturnType<typeof createMockD1>;
  let kv: ReturnType<typeof createMockKV>;
  let env: FeatureFlagsEnv;

  beforeEach(() => {
    db = createMockD1();
    kv = createMockKV();
    env = {
      DB: db as unknown as D1Database,
      FLAGS_KV: kv as unknown as KVNamespace,
    };
    seedFeatureFlags(db);
  });

  describe("Full cascade flow", () => {
    it("loads all enabled grafts for greenhouse tenant", async () => {
      // Arrange: Simulate what admin layout does
      const tenantId = "autumn-primary";

      // Act: Check greenhouse status and load grafts (as admin layout would)
      const inGreenhouse = await isInGreenhouse(tenantId, env);
      const grafts = await getEnabledGrafts({ tenantId, inGreenhouse }, env);

      // Assert: Greenhouse tenant should have access to greenhouse-only flags
      expect(inGreenhouse).toBe(true);
      expect(grafts.fireside_mode).toBe(true);
      expect(grafts.scribe_mode).toBe(true);
      expect(grafts.public_feature).toBe(true);
    });

    it("restricts greenhouse-only grafts for non-greenhouse tenant", async () => {
      // Arrange
      const tenantId = "regular-tenant";

      // Act
      const inGreenhouse = await isInGreenhouse(tenantId, env);
      const grafts = await getEnabledGrafts({ tenantId, inGreenhouse }, env);

      // Assert: Non-greenhouse tenant should NOT have greenhouse-only flags
      expect(inGreenhouse).toBe(false);
      expect(grafts.fireside_mode).toBe(false); // Greenhouse-only, should be false
      expect(grafts.scribe_mode).toBe(false); // Greenhouse-only, should be false
      expect(grafts.public_feature).toBe(true); // NOT greenhouse-only, should be true
    });

    it("applies tenant-specific rules correctly", async () => {
      // Arrange
      const specialTenant = "special-tenant";
      const regularTenant = "random-tenant";

      // Act: Check both tenants (neither is in greenhouse, but one has a rule)
      const specialGrafts = await getEnabledGrafts(
        { tenantId: specialTenant, inGreenhouse: false },
        env,
      );
      const regularGrafts = await getEnabledGrafts(
        { tenantId: regularTenant, inGreenhouse: false },
        env,
      );

      // Assert: tenant_gated_feature has a rule for "special-tenant"
      expect(specialGrafts.tenant_gated_feature).toBe(true); // Has tenant rule
      expect(regularGrafts.tenant_gated_feature).toBe(false); // Falls back to default
    });
  });

  describe("Page data cascade simulation", () => {
    it("simulates admin layout returning grafts to pages", async () => {
      // This simulates what happens in admin/+layout.server.ts
      const tenantId = "autumn-primary";

      // Step 1: Layout checks greenhouse status
      const inGreenhouse = await isInGreenhouse(tenantId, env);

      // Step 2: Layout loads all grafts
      const grafts = await getEnabledGrafts({ tenantId, inGreenhouse }, env);

      // Step 3: Layout returns data object (simulating SvelteKit data cascade)
      const layoutData = {
        user: { id: "user-123", email: "test@grove.place" },
        tenant: { id: tenantId, subdomain: "autumn" },
        grafts, // <-- This is what we added
        csrfToken: "test-token",
      };

      // Assert: Page would receive this data and use it
      expect(layoutData.grafts.fireside_mode).toBe(true);
      expect(layoutData.grafts.scribe_mode).toBe(true);

      // Simulate component usage:
      // <MarkdownEditor firesideEnabled={data.grafts.fireside_mode} />
      const firesideEnabled = layoutData.grafts.fireside_mode ?? false;
      const scribeEnabled = layoutData.grafts.scribe_mode ?? false;

      expect(firesideEnabled).toBe(true);
      expect(scribeEnabled).toBe(true);
    });

    it("handles missing grafts gracefully in page components", async () => {
      // Simulate a tenant without any special grafts
      const tenantId = "new-tenant";
      const grafts = await getEnabledGrafts(
        { tenantId, inGreenhouse: false },
        env,
      );

      // Simulate page component accessing grafts with fallback
      const layoutData = { grafts };

      // Components should use ?? false pattern for safety
      const firesideEnabled = layoutData.grafts?.fireside_mode ?? false;
      const unknownGraft = layoutData.grafts?.some_future_graft ?? false;

      expect(firesideEnabled).toBe(false); // Greenhouse-only, tenant not in greenhouse
      expect(unknownGraft).toBe(false); // Doesn't exist, fallback works
    });
  });

  describe("Dynamic flag discovery", () => {
    it("automatically includes new flags without code changes", async () => {
      // Arrange: Add a new flag dynamically (simulating INSERT INTO feature_flags)
      const flags = new Map<string, any>();
      flags.set("new_experimental_feature", {
        id: "new_experimental_feature",
        name: "New Experimental Feature",
        flag_type: "boolean",
        default_value: "true",
        enabled: 1,
        greenhouse_only: 0,
        cache_ttl: 60,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      // Re-mock to include the new flag
      db.prepare = vi.fn((sql: string) => {
        if (sql.includes("SELECT id FROM feature_flags")) {
          return {
            all: vi.fn(async () => ({
              results: [{ id: "new_experimental_feature" }],
            })),
          };
        }
        if (sql.includes("SELECT * FROM feature_flags WHERE id")) {
          return {
            bind: vi.fn(() => ({
              first: vi.fn(async () => flags.get("new_experimental_feature")),
            })),
          };
        }
        if (sql.includes("flag_rules")) {
          return {
            bind: vi.fn(() => ({
              all: vi.fn(async () => ({ results: [] })),
            })),
          };
        }
        return {
          bind: vi.fn(() => ({
            first: vi.fn(async () => null),
            all: vi.fn(async () => ({ results: [] })),
          })),
        };
      });

      // Act: Load grafts (no code changes needed!)
      const grafts = await getEnabledGrafts({ tenantId: "any-tenant" }, env);

      // Assert: New flag is automatically available
      expect(grafts).toHaveProperty("new_experimental_feature");
      expect(grafts.new_experimental_feature).toBe(true);
    });
  });
});

describe("image_uploads_enabled graft", () => {
  let db: ReturnType<typeof createMockD1>;
  let kv: ReturnType<typeof createMockKV>;
  let env: FeatureFlagsEnv;

  beforeEach(() => {
    db = createMockD1();
    kv = createMockKV();
    env = {
      DB: db as unknown as D1Database,
      FLAGS_KV: kv as unknown as KVNamespace,
    };
  });

  it("evaluates to true when default_value is 'true' with no rules", async () => {
    // Arrange: Flag enabled with default_value = "true" (the fix we applied)
    db.prepare = vi.fn((sql: string) => {
      if (sql.includes("SELECT id FROM feature_flags")) {
        return {
          all: vi.fn(async () => ({
            results: [{ id: "image_uploads_enabled" }],
          })),
        };
      }
      if (sql.includes("SELECT * FROM feature_flags WHERE id")) {
        return {
          bind: vi.fn(() => ({
            first: vi.fn(async () => ({
              id: "image_uploads_enabled",
              name: "Image Uploads",
              flag_type: "boolean",
              default_value: "true",
              enabled: 1,
              greenhouse_only: 0,
              cache_ttl: 60,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })),
          })),
        };
      }
      if (sql.includes("flag_rules")) {
        return {
          bind: vi.fn(() => ({
            all: vi.fn(async () => ({ results: [] })),
          })),
        };
      }
      return {
        bind: vi.fn(() => ({
          first: vi.fn(async () => null),
          all: vi.fn(async () => ({ results: [] })),
        })),
      };
    });

    // Act
    const grafts = await getEnabledGrafts({ tenantId: "any-tenant" }, env);

    // Assert: The flag should evaluate to true
    expect(grafts.image_uploads_enabled).toBe(true);

    // Simulate component derivation pattern:
    // const uploadsEnabled = $derived(grafts?.image_uploads_enabled ?? false);
    const uploadsEnabled = grafts?.image_uploads_enabled ?? false;
    expect(uploadsEnabled).toBe(true);
  });

  it("evaluates to false when default_value is 'false' with no rules (the original bug)", async () => {
    // Arrange: This was the production state that caused issue #955
    db.prepare = vi.fn((sql: string) => {
      if (sql.includes("SELECT id FROM feature_flags")) {
        return {
          all: vi.fn(async () => ({
            results: [{ id: "image_uploads_enabled" }],
          })),
        };
      }
      if (sql.includes("SELECT * FROM feature_flags WHERE id")) {
        return {
          bind: vi.fn(() => ({
            first: vi.fn(async () => ({
              id: "image_uploads_enabled",
              name: "Image Uploads",
              flag_type: "boolean",
              default_value: "false", // <-- The original bug
              enabled: 1,
              greenhouse_only: 0,
              cache_ttl: 60,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })),
          })),
        };
      }
      if (sql.includes("flag_rules")) {
        return {
          bind: vi.fn(() => ({
            all: vi.fn(async () => ({ results: [] })), // No rules!
          })),
        };
      }
      return {
        bind: vi.fn(() => ({
          first: vi.fn(async () => null),
          all: vi.fn(async () => ({ results: [] })),
        })),
      };
    });

    // Act
    const grafts = await getEnabledGrafts({ tenantId: "any-tenant" }, env);

    // Assert: With default_value "false" and no rules, flag is false
    expect(grafts.image_uploads_enabled).toBe(false);

    // Component would block uploads:
    const uploadsEnabled = grafts?.image_uploads_enabled ?? false;
    expect(uploadsEnabled).toBe(false);
  });

  it("cascades to page data like editor and gallery would consume", async () => {
    // Arrange: Set up flag as enabled
    db.prepare = vi.fn((sql: string) => {
      if (sql.includes("SELECT id FROM feature_flags")) {
        return {
          all: vi.fn(async () => ({
            results: [{ id: "image_uploads_enabled" }],
          })),
        };
      }
      if (sql.includes("SELECT * FROM feature_flags WHERE id")) {
        return {
          bind: vi.fn(() => ({
            first: vi.fn(async () => ({
              id: "image_uploads_enabled",
              name: "Image Uploads",
              flag_type: "boolean",
              default_value: "true",
              enabled: 1,
              greenhouse_only: 0,
              cache_ttl: 60,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })),
          })),
        };
      }
      if (sql.includes("flag_rules")) {
        return {
          bind: vi.fn(() => ({
            all: vi.fn(async () => ({ results: [] })),
          })),
        };
      }
      return {
        bind: vi.fn(() => ({
          first: vi.fn(async () => null),
          all: vi.fn(async () => ({ results: [] })),
        })),
      };
    });

    // Act: Simulate admin layout data cascade
    const grafts = await getEnabledGrafts({ tenantId: "test-tenant" }, env);

    const layoutData = {
      user: { id: "user-1" },
      tenant: { id: "test-tenant" },
      grafts,
    };

    // Assert: MarkdownEditor pattern — receives grafts as prop
    const editorGrafts = layoutData.grafts;
    const uploadsEnabled = editorGrafts?.image_uploads_enabled ?? false;
    expect(uploadsEnabled).toBe(true);

    // Assert: Gallery page pattern — reads from data.grafts
    const pageData = { ...layoutData, jxl: { jxlEnabled: false } };
    const galleryUploadsEnabled =
      pageData.grafts?.image_uploads_enabled ?? false;
    expect(galleryUploadsEnabled).toBe(true);
  });
});

describe("Grafts Error Handling", () => {
  it("returns empty grafts when database is unavailable", async () => {
    // Arrange: Create env with failing DB
    const failingDb = createMockD1();
    failingDb.prepare = vi.fn(() => {
      throw new Error("Database connection failed");
    });

    const kv = createMockKV();
    const env: FeatureFlagsEnv = {
      DB: failingDb as unknown as D1Database,
      FLAGS_KV: kv as unknown as KVNamespace,
    };

    // Suppress console.error for cleaner test output
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Act: Should not throw, should return empty
    const grafts = await getEnabledGrafts({ tenantId: "test" }, env);

    // Assert
    expect(grafts).toEqual({});
    consoleSpy.mockRestore();
  });

  it("continues loading other grafts when one flag fails", async () => {
    // Arrange: Set up mixed success/failure scenario
    const db = createMockD1();
    const callCount = 0;

    db.prepare = vi.fn((sql: string) => {
      if (sql.includes("SELECT id FROM feature_flags")) {
        return {
          all: vi.fn(async () => ({
            results: [{ id: "good_flag" }, { id: "bad_flag" }],
          })),
        };
      }

      if (sql.includes("SELECT * FROM feature_flags WHERE id")) {
        return {
          bind: vi.fn((flagId: string) => ({
            first: vi.fn(async () => {
              if (flagId === "bad_flag") {
                throw new Error("Flag corrupted");
              }
              return {
                id: "good_flag",
                name: "Good Flag",
                flag_type: "boolean",
                default_value: "true",
                enabled: 1,
                greenhouse_only: 0,
                cache_ttl: 60,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              };
            }),
          })),
        };
      }

      if (sql.includes("flag_rules")) {
        return {
          bind: vi.fn(() => ({
            all: vi.fn(async () => ({ results: [] })),
          })),
        };
      }

      return {
        bind: vi.fn(() => ({
          first: vi.fn(async () => null),
          all: vi.fn(async () => ({ results: [] })),
        })),
      };
    });

    const kv = createMockKV();
    const env: FeatureFlagsEnv = {
      DB: db as unknown as D1Database,
      FLAGS_KV: kv as unknown as KVNamespace,
    };

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Act
    const grafts = await getEnabledGrafts({ tenantId: "test" }, env);

    // Assert: good_flag should still be loaded
    expect(grafts.good_flag).toBe(true);
    // bad_flag should be false (failed to load)
    expect(grafts.bad_flag).toBe(false);

    consoleSpy.mockRestore();
  });
});
