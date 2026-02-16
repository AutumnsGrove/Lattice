/**
 * Threshold — Test Utilities
 *
 * Mock implementations for testing rate limit functionality.
 * Provides in-memory KV, D1, and ThresholdStore mocks.
 */

import { vi } from "vitest";
import type {
  ThresholdStore,
  ThresholdCheckOptions,
  ThresholdResult,
} from "./types.js";

// ============================================================================
// Mock KV
// ============================================================================

/**
 * Create a mock KVNamespace backed by an in-memory Map.
 * Supports get (text + json), put (with expirationTtl), delete, list.
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
    list: vi.fn(),
    getWithMetadata: vi.fn(),
  } as unknown as KVNamespace;
}

// ============================================================================
// Mock D1
// ============================================================================

interface D1Row {
  count: number;
  window_start: number;
}

/**
 * Create a mock D1Database that supports the atomic INSERT ON CONFLICT RETURNING
 * pattern used by ThresholdD1Store.
 */
export function createMockD1(): D1Database {
  const rows = new Map<string, D1Row>();

  const mockDb = {
    prepare: vi.fn((sql: string) => {
      return {
        bind: vi.fn((...params: unknown[]) => {
          return {
            first: vi.fn(async <T>(): Promise<T | null> => {
              // Parse the INSERT ON CONFLICT RETURNING pattern
              const key = params[0] as string;
              const nowSeconds = params[1] as number;
              const windowStart = params[2] as number;

              const existing = rows.get(key);

              if (!existing) {
                // New row
                const row: D1Row = { count: 1, window_start: nowSeconds };
                rows.set(key, row);
                return row as T;
              }

              // Existing row — check window expiry
              if (existing.window_start < windowStart) {
                // Window expired, reset
                const row: D1Row = { count: 1, window_start: nowSeconds };
                rows.set(key, row);
                return row as T;
              }

              // Within window, increment
              existing.count += 1;
              rows.set(key, existing);
              return existing as T;
            }),
            run: vi.fn(),
            all: vi.fn(),
          };
        }),
      };
    }),
    exec: vi.fn(),
    batch: vi.fn(),
    dump: vi.fn(),
  } as unknown as D1Database;

  return mockDb;
}

// ============================================================================
// Mock ThresholdStore
// ============================================================================

/**
 * Create a simple mock ThresholdStore backed by a Map.
 * Useful for testing the Threshold class and framework adapters
 * without involving real storage logic.
 */
export function createMockStore(): ThresholdStore & {
  _store: Map<string, { count: number; resetAt: number }>;
} {
  const store = new Map<string, { count: number; resetAt: number }>();

  return {
    _store: store,
    check: vi.fn(
      async (options: ThresholdCheckOptions): Promise<ThresholdResult> => {
        const now = Math.floor(Date.now() / 1000);
        const existing = store.get(options.key);

        // New or expired window
        if (!existing || existing.resetAt <= now) {
          const resetAt = now + options.windowSeconds;
          store.set(options.key, { count: 1, resetAt });
          return { allowed: true, remaining: options.limit - 1, resetAt };
        }

        // Over limit
        if (existing.count >= options.limit) {
          return {
            allowed: false,
            remaining: 0,
            resetAt: existing.resetAt,
            retryAfter: existing.resetAt - now,
          };
        }

        // Increment
        existing.count += 1;
        return {
          allowed: true,
          remaining: options.limit - existing.count,
          resetAt: existing.resetAt,
        };
      },
    ),
  };
}
