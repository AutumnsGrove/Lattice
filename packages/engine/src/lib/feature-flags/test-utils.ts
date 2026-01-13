/**
 * Shared Test Utilities for Feature Flags
 *
 * Provides mock implementations for testing feature flag functionality.
 */

import { vi } from "vitest";
import type { FeatureFlagsEnv, FeatureFlagRow, FlagRuleRow } from "./types.js";

/**
 * Create a mock KVNamespace for testing.
 */
export function createMockKV(): KVNamespace {
  const store = new Map<string, string>();
  return {
    get: vi.fn(async (key: string, type?: string) => {
      const value = store.get(key);
      if (!value) return null;
      if (type === "json") return JSON.parse(value);
      return value;
    }),
    put: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    delete: vi.fn(async (key: string) => {
      store.delete(key);
    }),
    list: vi.fn(async (options?: { prefix?: string }) => {
      const keys = Array.from(store.keys())
        .filter((k) => !options?.prefix || k.startsWith(options.prefix))
        .map((name) => ({ name }));
      return { keys };
    }),
    getWithMetadata: vi.fn(),
  } as unknown as KVNamespace;
}

/**
 * Create a mock D1Database for testing.
 */
export function createMockDB(): D1Database {
  const flags = new Map<string, FeatureFlagRow>();
  const rules = new Map<string, FlagRuleRow[]>();

  return {
    prepare: vi.fn((sql: string) => ({
      bind: vi.fn((...args: unknown[]) => ({
        first: vi.fn(async <T>() => {
          if (sql.includes("feature_flags")) {
            const flagId = args[0] as string;
            return (flags.get(flagId) ?? null) as T | null;
          }
          return null;
        }),
        all: vi.fn(async <T>() => {
          if (sql.includes("flag_rules")) {
            const flagId = args[0] as string;
            return { results: rules.get(flagId) ?? [] } as { results: T[] };
          }
          return { results: [] as T[] };
        }),
        run: vi.fn(),
      })),
      first: vi.fn(),
      all: vi.fn(),
      run: vi.fn(),
    })),
    batch: vi.fn(),
    exec: vi.fn(),
    dump: vi.fn(),
  } as unknown as D1Database;
}

/**
 * Create a mock FeatureFlagsEnv for testing.
 */
export function createMockEnv(): FeatureFlagsEnv {
  return {
    DB: createMockDB(),
    FLAGS_KV: createMockKV(),
  };
}

/**
 * Create a mock feature flag row.
 */
export function createFlagRow(
  id: string,
  options: Partial<FeatureFlagRow> = {},
): FeatureFlagRow {
  return {
    id,
    name: options.name ?? id,
    description: options.description ?? null,
    flag_type: options.flag_type ?? "boolean",
    default_value: options.default_value ?? "false",
    enabled: options.enabled ?? 1,
    cache_ttl: options.cache_ttl ?? null,
    created_at: options.created_at ?? new Date().toISOString(),
    updated_at: options.updated_at ?? new Date().toISOString(),
    created_by: options.created_by ?? null,
    updated_by: options.updated_by ?? null,
  };
}

/**
 * Create a mock flag rule row.
 */
export function createRuleRow(
  flagId: string,
  options: Partial<FlagRuleRow> = {},
): FlagRuleRow {
  return {
    id: options.id ?? 1,
    flag_id: flagId,
    priority: options.priority ?? 0,
    rule_type: options.rule_type ?? "always",
    rule_value: options.rule_value ?? "{}",
    result_value: options.result_value ?? "true",
    enabled: options.enabled ?? 1,
    created_at: options.created_at ?? new Date().toISOString(),
  };
}

/**
 * Set up a mock flag in the mock environment.
 */
export function setupMockFlag(
  env: FeatureFlagsEnv,
  flagId: string,
  flagOptions: Partial<FeatureFlagRow> = {},
  rules: Partial<FlagRuleRow>[] = [],
): void {
  const flagRow = createFlagRow(flagId, flagOptions);
  const ruleRows = rules.map((r, i) =>
    createRuleRow(flagId, { ...r, id: r.id ?? i + 1 }),
  );

  // Override prepare to return our mock data
  const mockDB = env.DB as unknown as {
    prepare: ReturnType<typeof vi.fn>;
  };

  mockDB.prepare = vi.fn((sql: string) => ({
    bind: vi.fn((...args: unknown[]) => ({
      first: vi.fn(async () => {
        if (sql.includes("feature_flags") && args[0] === flagId) {
          return flagRow;
        }
        return null;
      }),
      all: vi.fn(async () => {
        if (sql.includes("flag_rules") && args[0] === flagId) {
          return { results: ruleRows };
        }
        return { results: [] };
      }),
      run: vi.fn(),
    })),
    first: vi.fn(),
    all: vi.fn(),
    run: vi.fn(),
  }));
}
