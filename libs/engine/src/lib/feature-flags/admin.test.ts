/**
 * Tests for Feature Flags Admin API
 *
 * Tests the cultivate/prune functionality that controls
 * global feature flag enable/disable.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { getFeatureFlags, setFlagEnabled, getFeatureFlag } from "./admin.js";
import type { FeatureFlagsEnv, FeatureFlagRow } from "./types.js";

// =============================================================================
// TEST HELPERS
// =============================================================================

function createMockEnv(): FeatureFlagsEnv {
  const mockKV = {
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    list: vi.fn().mockResolvedValue({ keys: [], list_complete: true }),
    getWithMetadata: vi.fn(),
  } as unknown as KVNamespace;

  const mockDB = {
    prepare: vi.fn(),
  } as unknown as D1Database;

  return { DB: mockDB, FLAGS_KV: mockKV };
}

function createMockFlagRow(
  id: string,
  overrides: Partial<FeatureFlagRow> = {},
): FeatureFlagRow {
  return {
    id,
    name: overrides.name ?? id.replace(/_/g, " "),
    description: overrides.description ?? null,
    flag_type: overrides.flag_type ?? "boolean",
    default_value: overrides.default_value ?? "false",
    enabled: overrides.enabled ?? 1,
    greenhouse_only: overrides.greenhouse_only ?? 0,
    cache_ttl: overrides.cache_ttl ?? 300,
    created_at: overrides.created_at ?? "2024-01-01T00:00:00Z",
    updated_at: overrides.updated_at ?? "2024-01-01T00:00:00Z",
    created_by: overrides.created_by ?? null,
    updated_by: overrides.updated_by ?? null,
  };
}

// =============================================================================
// getFeatureFlags
// =============================================================================

describe("getFeatureFlags", () => {
  it("should return all flags sorted by name", async () => {
    // Arrange
    const env = createMockEnv();
    const mockFlags = [
      createMockFlagRow("jxl_encoding", { name: "JXL Encoding" }),
      createMockFlagRow("meadow_access", {
        name: "Meadow Access",
        greenhouse_only: 1,
      }),
    ];

    (env.DB.prepare as ReturnType<typeof vi.fn>).mockReturnValue({
      all: vi.fn().mockResolvedValue({ results: mockFlags }),
    });

    // Act
    const result = await getFeatureFlags(env);

    // Assert
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("jxl_encoding");
    expect(result[0].name).toBe("JXL Encoding");
    expect(result[0].enabled).toBe(true);
    expect(result[0].greenhouseOnly).toBe(false);

    expect(result[1].id).toBe("meadow_access");
    expect(result[1].greenhouseOnly).toBe(true);
  });

  it("should return empty array when no flags exist", async () => {
    // Arrange
    const env = createMockEnv();
    (env.DB.prepare as ReturnType<typeof vi.fn>).mockReturnValue({
      all: vi.fn().mockResolvedValue({ results: [] }),
    });

    // Act
    const result = await getFeatureFlags(env);

    // Assert
    expect(result).toEqual([]);
  });

  it("should return empty array when database query fails", async () => {
    // Arrange
    const env = createMockEnv();
    (env.DB.prepare as ReturnType<typeof vi.fn>).mockReturnValue({
      all: vi.fn().mockRejectedValue(new Error("DB error")),
    });

    // Act
    const result = await getFeatureFlags(env);

    // Assert
    expect(result).toEqual([]);
  });

  it("should correctly parse JSON default values", async () => {
    // Arrange
    const env = createMockEnv();
    const mockFlags = [
      createMockFlagRow("config_flag", {
        flag_type: "json",
        default_value: '{"maxItems": 10}',
      }),
    ];

    (env.DB.prepare as ReturnType<typeof vi.fn>).mockReturnValue({
      all: vi.fn().mockResolvedValue({ results: mockFlags }),
    });

    // Act
    const result = await getFeatureFlags(env);

    // Assert
    expect(result[0].defaultValue).toEqual({ maxItems: 10 });
  });
});

// =============================================================================
// setFlagEnabled (cultivate/prune)
// =============================================================================

describe("setFlagEnabled", () => {
  it("should enable a flag (cultivate)", async () => {
    // Arrange
    const env = createMockEnv();
    const runMock = vi.fn().mockResolvedValue({ meta: { changes: 1 } });

    (env.DB.prepare as ReturnType<typeof vi.fn>).mockReturnValue({
      bind: vi.fn().mockReturnValue({ run: runMock }),
    });

    // Act
    const result = await setFlagEnabled("jxl_encoding", true, env);

    // Assert
    expect(result).toBe(true);
    expect(env.DB.prepare).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE feature_flags"),
    );
  });

  it("should disable a flag (prune)", async () => {
    // Arrange
    const env = createMockEnv();
    const runMock = vi.fn().mockResolvedValue({ meta: { changes: 1 } });
    const bindMock = vi.fn().mockReturnValue({ run: runMock });

    (env.DB.prepare as ReturnType<typeof vi.fn>).mockReturnValue({
      bind: bindMock,
    });

    // Act
    const result = await setFlagEnabled("jxl_encoding", false, env);

    // Assert
    expect(result).toBe(true);
    // First arg is enabled (0 for false), second is flagId
    expect(bindMock).toHaveBeenCalledWith(0, "jxl_encoding");
  });

  it("should return false when flag does not exist", async () => {
    // Arrange
    const env = createMockEnv();
    const runMock = vi.fn().mockResolvedValue({ meta: { changes: 0 } });

    (env.DB.prepare as ReturnType<typeof vi.fn>).mockReturnValue({
      bind: vi.fn().mockReturnValue({ run: runMock }),
    });

    // Act
    const result = await setFlagEnabled("nonexistent_flag", true, env);

    // Assert
    expect(result).toBe(false);
  });

  it("should return false when database update fails", async () => {
    // Arrange
    const env = createMockEnv();
    const runMock = vi.fn().mockRejectedValue(new Error("DB error"));

    (env.DB.prepare as ReturnType<typeof vi.fn>).mockReturnValue({
      bind: vi.fn().mockReturnValue({ run: runMock }),
    });

    // Act
    const result = await setFlagEnabled("jxl_encoding", true, env);

    // Assert
    expect(result).toBe(false);
  });

  it("should invalidate cache after successful update", async () => {
    // Arrange
    const env = createMockEnv();
    const runMock = vi.fn().mockResolvedValue({ meta: { changes: 1 } });

    (env.DB.prepare as ReturnType<typeof vi.fn>).mockReturnValue({
      bind: vi.fn().mockReturnValue({ run: runMock }),
    });

    // Act
    await setFlagEnabled("jxl_encoding", true, env);

    // Assert - cache invalidation should list keys with flag prefix
    expect(env.FLAGS_KV.list).toHaveBeenCalledWith({
      prefix: "flag:jxl_encoding:",
      cursor: undefined,
    });
  });
});

// =============================================================================
// getFeatureFlag
// =============================================================================

describe("getFeatureFlag", () => {
  it("should return a single flag by ID", async () => {
    // Arrange
    const env = createMockEnv();
    const mockFlag = createMockFlagRow("jxl_encoding", {
      name: "JXL Encoding",
      description: "Enable JXL image format",
    });

    (env.DB.prepare as ReturnType<typeof vi.fn>).mockReturnValue({
      bind: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue(mockFlag),
      }),
    });

    // Act
    const result = await getFeatureFlag("jxl_encoding", env);

    // Assert
    expect(result).not.toBeNull();
    expect(result?.id).toBe("jxl_encoding");
    expect(result?.name).toBe("JXL Encoding");
    expect(result?.description).toBe("Enable JXL image format");
  });

  it("should return null when flag not found", async () => {
    // Arrange
    const env = createMockEnv();

    (env.DB.prepare as ReturnType<typeof vi.fn>).mockReturnValue({
      bind: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue(null),
      }),
    });

    // Act
    const result = await getFeatureFlag("nonexistent", env);

    // Assert
    expect(result).toBeNull();
  });

  it("should return null when database query fails", async () => {
    // Arrange
    const env = createMockEnv();

    (env.DB.prepare as ReturnType<typeof vi.fn>).mockReturnValue({
      bind: vi.fn().mockReturnValue({
        first: vi.fn().mockRejectedValue(new Error("DB error")),
      }),
    });

    // Act
    const result = await getFeatureFlag("jxl_encoding", env);

    // Assert
    expect(result).toBeNull();
  });
});
