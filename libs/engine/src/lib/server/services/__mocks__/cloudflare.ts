/**
 * Mock implementations for Cloudflare services (D1, KV, R2)
 * Used for testing the service abstraction layer.
 *
 * ## Mock D1 — Supported SQL Operations
 *
 * The mock D1 uses a simple in-memory SQL parser. It supports:
 *
 * | Operation | Features                                                |
 * |-----------|---------------------------------------------------------|
 * | SELECT    | WHERE (= ? / IS NULL / IS NOT NULL / AND), ORDER BY, LIMIT |
 * | INSERT    | Column list + VALUES with positional params             |
 * | UPDATE    | SET with positional params, WHERE (same as SELECT)      |
 * | DELETE    | WHERE (same as SELECT), or full table delete            |
 * | batch()   | Sequential execution of prepared statements             |
 *
 * ### NOT Supported (use Miniflare for these):
 * - OR conditions, LIKE patterns, IN clauses
 * - JOINs, subqueries, DISTINCT
 * - GROUP BY / HAVING / aggregate functions
 * - INSERT ... ON CONFLICT (upsert)
 * - ALTER TABLE, CREATE TABLE
 * - Type coercion (values are stored as-is)
 *
 * ## Mock KV — Supported Operations
 * - get, put (with expirationTtl), delete, list (with prefix/cursor/limit)
 * - getWithMetadata (metadata stored alongside value)
 * - TTL-based expiration (checked on read)
 *
 * ## Mock R2 — Supported Operations
 * - get, put, delete, head, list (with prefix/cursor/limit)
 * - Accepts: ArrayBuffer, string, Blob, ReadableStream
 * - Stores: httpMetadata (contentType, cacheControl), customMetadata
 * - Returns: R2Object with body as ReadableStream, arrayBuffer(), text(), json()
 *
 * ## Helper Functions
 * - `seedMockD1(db, tableName, rows)` — Pre-populate table data
 * - `clearMockD1(db)` — Wipe all tables
 * - `advanceKVTime(kv, ms)` — Simulate time passage for TTL testing
 */

import { vi } from "vitest";

// ============================================================================
// D1 Database Mock
// ============================================================================

interface MockRow {
  [key: string]: unknown;
}

interface MockQueryResult {
  results: MockRow[];
  success: boolean;
  meta: {
    changes: number;
    duration: number;
    last_row_id: number;
    rows_read: number;
    rows_written: number;
  };
}

/**
 * Creates a mock D1 database with in-memory storage
 */
export function createMockD1(): D1Database & {
  _tables: Map<string, MockRow[]>;
} {
  const tables = new Map<string, MockRow[]>();

  const createStatement = (sql: string) => {
    let boundParams: unknown[] = [];

    const statement = {
      bind: (...params: unknown[]) => {
        boundParams = params;
        return statement;
      },
      first: vi.fn(async <T>(): Promise<T | null> => {
        const result = await statement.all();
        return (result.results[0] as T) ?? null;
      }),
      all: vi.fn(async <
        T,
      >(): Promise<{ results: T[]; success: boolean; meta: MockQueryResult["meta"] }> => {
        const result = executeSql(sql, boundParams, tables);
        return {
          results: result.results as T[],
          success: result.success,
          meta: result.meta,
        };
      }),
      run: vi.fn(async (): Promise<MockQueryResult> => {
        return executeSql(sql, boundParams, tables);
      }),
      raw: vi.fn(async () => {
        const result = await statement.all();
        return result.results.map((row) => Object.values(row as object));
      }),
    };

    return statement;
  };

  const db = {
    _tables: tables,
    prepare: vi.fn((sql: string) => createStatement(sql)),
    batch: vi.fn(async (statements: ReturnType<typeof createStatement>[]) => {
      const results: MockQueryResult[] = [];
      for (const stmt of statements) {
        results.push(await stmt.run());
      }
      return results;
    }),
    exec: vi.fn(async (sql: string) => {
      // Simple exec - runs raw SQL
      return { count: 1, duration: 0 };
    }),
    dump: vi.fn(async () => new ArrayBuffer(0)),
    withSession: vi.fn(() => createMockD1Session(tables)),
  };

  return db as unknown as D1Database & { _tables: Map<string, MockRow[]> };
}

/**
 * Creates a mock D1 session (for read replication testing)
 */
function createMockD1Session(
  tables: Map<string, MockRow[]>,
): D1DatabaseSession {
  const createStatement = (sql: string) => {
    let boundParams: unknown[] = [];

    const statement = {
      bind: (...params: unknown[]) => {
        boundParams = params;
        return statement;
      },
      first: vi.fn(async <T>(): Promise<T | null> => {
        const result = await statement.all();
        return (result.results[0] as T) ?? null;
      }),
      all: vi.fn(async <
        T,
      >(): Promise<{ results: T[]; success: boolean; meta: MockQueryResult["meta"] }> => {
        const result = executeSql(sql, boundParams, tables);
        return {
          results: result.results as T[],
          success: result.success,
          meta: result.meta,
        };
      }),
      run: vi.fn(async (): Promise<MockQueryResult> => {
        return executeSql(sql, boundParams, tables);
      }),
      raw: vi.fn(async () => {
        const result = await statement.all();
        return result.results.map((row) => Object.values(row as object));
      }),
    };

    return statement;
  };

  return {
    prepare: vi.fn((sql: string) => createStatement(sql)),
  } as unknown as D1DatabaseSession;
}

/**
 * Simple SQL parser/executor for mocking
 * Supports basic SELECT, INSERT, UPDATE, DELETE operations
 */
function executeSql(
  sql: string,
  params: unknown[],
  tables: Map<string, MockRow[]>,
): MockQueryResult {
  const normalizedSql = sql.trim().toUpperCase();
  let paramIndex = 0;
  const getNextParam = () => params[paramIndex++];

  // Extract table name from SQL
  const tableMatch = sql.match(/(?:FROM|INTO|UPDATE)\s+(\w+)/i);
  const tableName = tableMatch?.[1]?.toLowerCase() ?? "unknown";

  // Ensure table exists
  if (!tables.has(tableName)) {
    tables.set(tableName, []);
  }

  const tableData = tables.get(tableName)!;

  if (normalizedSql.startsWith("SELECT")) {
    // Handle SELECT queries
    const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s+ORDER|\s+LIMIT|$)/i);
    let results = [...tableData];

    if (whereMatch) {
      results = filterRows(results, whereMatch[1], params);
    }

    // Handle ORDER BY
    const orderMatch = sql.match(/ORDER\s+BY\s+(\w+)(?:\s+(ASC|DESC))?/i);
    if (orderMatch) {
      const col = orderMatch[1];
      const direction = orderMatch[2]?.toUpperCase() === "DESC" ? -1 : 1;
      results.sort((a, b) => {
        const aVal = a[col];
        const bVal = b[col];
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return 1 * direction;
        if (bVal == null) return -1 * direction;
        if (aVal < bVal) return -1 * direction;
        if (aVal > bVal) return 1 * direction;
        return 0;
      });
    }

    // Handle LIMIT
    const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
    if (limitMatch) {
      results = results.slice(0, parseInt(limitMatch[1], 10));
    }

    return {
      results,
      success: true,
      meta: {
        changes: 0,
        duration: 1,
        last_row_id: 0,
        rows_read: results.length,
        rows_written: 0,
      },
    };
  }

  if (normalizedSql.startsWith("INSERT")) {
    // Handle INSERT queries
    const columnsMatch = sql.match(/\(([^)]+)\)\s+VALUES/i);
    const columns = columnsMatch?.[1]?.split(",").map((c) => c.trim()) ?? [];

    const row: MockRow = {};
    for (const col of columns) {
      row[col] = getNextParam();
    }

    tableData.push(row);

    return {
      results: [],
      success: true,
      meta: {
        changes: 1,
        duration: 1,
        last_row_id: tableData.length,
        rows_read: 0,
        rows_written: 1,
      },
    };
  }

  if (normalizedSql.startsWith("UPDATE")) {
    // Handle UPDATE queries
    const setMatch = sql.match(/SET\s+(.+?)\s+WHERE/i);
    const whereMatch = sql.match(/WHERE\s+(.+)$/i);

    if (!setMatch || !whereMatch) {
      return {
        results: [],
        success: false,
        meta: {
          changes: 0,
          duration: 1,
          last_row_id: 0,
          rows_read: 0,
          rows_written: 0,
        },
      };
    }

    // Parse SET clause
    const setClauses = setMatch[1].split(",").map((s) => s.trim());
    const updates: Record<string, unknown> = {};
    for (const clause of setClauses) {
      const [col] = clause.split("=").map((s) => s.trim());
      updates[col] = getNextParam();
    }

    // Find and update matching rows using filterRows
    // paramIndex is now past SET params, pointing to WHERE params
    const whereParams = params.slice(paramIndex);
    const matchingRows = filterRows(tableData, whereMatch[1], whereParams);
    let changes = 0;

    for (const row of matchingRows) {
      Object.assign(row, updates);
      changes++;
    }

    return {
      results: [],
      success: true,
      meta: {
        changes,
        duration: 1,
        last_row_id: 0,
        rows_read: changes,
        rows_written: changes,
      },
    };
  }

  if (normalizedSql.startsWith("DELETE")) {
    // Handle DELETE queries
    const whereMatch = sql.match(/WHERE\s+(.+)$/i);

    if (!whereMatch) {
      const changes = tableData.length;
      tables.set(tableName, []);
      return {
        results: [],
        success: true,
        meta: {
          changes,
          duration: 1,
          last_row_id: 0,
          rows_read: 0,
          rows_written: changes,
        },
      };
    }

    const initialLength = tableData.length;
    const filtered = filterRows(tableData, whereMatch[1], params, true);
    tables.set(tableName, filtered);
    const changes = initialLength - filtered.length;

    return {
      results: [],
      success: true,
      meta: {
        changes,
        duration: 1,
        last_row_id: 0,
        rows_read: 0,
        rows_written: changes,
      },
    };
  }

  // Default fallback
  return {
    results: [],
    success: true,
    meta: {
      changes: 0,
      duration: 1,
      last_row_id: 0,
      rows_read: 0,
      rows_written: 0,
    },
  };
}

/**
 * Simple row filtering for WHERE clauses
 */
function filterRows(
  rows: MockRow[],
  whereClause: string,
  params: unknown[],
  invert = false,
): MockRow[] {
  // Very simple WHERE parsing - supports "column = ?" patterns
  const conditions = whereClause.split(/\s+AND\s+/i);

  return rows.filter((row) => {
    let matches = true;
    // Reset paramIndex per row — each row must be evaluated against the same params
    let paramIndex = 0;

    for (const condition of conditions) {
      const eqMatch = condition.match(/(\w+)\s*=\s*\?/);
      if (eqMatch) {
        const col = eqMatch[1];
        const value = params[paramIndex++];
        if (row[col] !== value) {
          matches = false;
          break;
        }
        continue;
      }
      // Handle IS NOT NULL
      const isNotNullMatch = condition.match(/(\w+)\s+IS\s+NOT\s+NULL/i);
      if (isNotNullMatch) {
        const col = isNotNullMatch[1];
        if (row[col] === null || row[col] === undefined) {
          matches = false;
          break;
        }
        continue;
      }
      // Handle IS NULL
      const isNullMatch = condition.match(/(\w+)\s+IS\s+NULL/i);
      if (isNullMatch) {
        const col = isNullMatch[1];
        if (row[col] !== null && row[col] !== undefined) {
          matches = false;
          break;
        }
      }
    }

    return invert ? !matches : matches;
  });
}

// ============================================================================
// KV Namespace Mock
// ============================================================================

interface KVEntry {
  value: string;
  expiresAt?: number;
  metadata?: unknown;
}

/**
 * Creates a mock KV namespace with in-memory storage
 */
export function createMockKV(): KVNamespace & { _store: Map<string, KVEntry> } {
  const store = new Map<string, KVEntry>();

  const kv = {
    _store: store,

    get: vi.fn(
      async (key: string, typeOrOptions?: string | { type?: string }) => {
        const entry = store.get(key);
        if (!entry) return null;

        // Check expiration
        if (entry.expiresAt && entry.expiresAt < Date.now()) {
          store.delete(key);
          return null;
        }

        // Handle type parameter (positional string or options object)
        const type =
          typeof typeOrOptions === "string"
            ? typeOrOptions
            : typeOrOptions?.type;

        if (type === "json") {
          try {
            return JSON.parse(entry.value);
          } catch {
            return null;
          }
        }

        return entry.value;
      },
    ),

    getWithMetadata: vi.fn(async (key: string) => {
      const entry = store.get(key);
      if (!entry) return { value: null, metadata: null };

      if (entry.expiresAt && entry.expiresAt < Date.now()) {
        store.delete(key);
        return { value: null, metadata: null };
      }

      return { value: entry.value, metadata: entry.metadata ?? null };
    }),

    put: vi.fn(
      async (
        key: string,
        value: string,
        options?: { expirationTtl?: number; metadata?: unknown },
      ) => {
        const entry: KVEntry = { value };
        if (options?.expirationTtl) {
          entry.expiresAt = Date.now() + options.expirationTtl * 1000;
        }
        if (options?.metadata) {
          entry.metadata = options.metadata;
        }
        store.set(key, entry);
      },
    ),

    delete: vi.fn(async (key: string) => {
      store.delete(key);
    }),

    list: vi.fn(
      async (options?: {
        prefix?: string;
        cursor?: string;
        limit?: number;
      }) => {
        const keys: {
          name: string;
          expiration?: number;
          metadata?: unknown;
        }[] = [];
        const prefix = options?.prefix ?? "";
        const limit = options?.limit ?? 1000;

        for (const [key, entry] of store.entries()) {
          if (key.startsWith(prefix)) {
            // Skip expired entries
            if (entry.expiresAt && entry.expiresAt < Date.now()) {
              continue;
            }
            keys.push({
              name: key,
              expiration: entry.expiresAt
                ? Math.floor(entry.expiresAt / 1000)
                : undefined,
              metadata: entry.metadata,
            });
            if (keys.length >= limit) break;
          }
        }

        return {
          keys,
          list_complete: keys.length < limit,
          cursor: keys.length >= limit ? "next-cursor" : undefined,
        };
      },
    ),
  };

  return kv as unknown as KVNamespace & { _store: Map<string, KVEntry> };
}

// ============================================================================
// R2 Bucket Mock
// ============================================================================

interface R2Entry {
  body: ArrayBuffer;
  httpMetadata?: {
    contentType?: string;
    cacheControl?: string;
  };
  customMetadata?: Record<string, string>;
  etag: string;
  uploaded: Date;
  size: number;
}

/**
 * Creates a mock R2 bucket with in-memory storage
 */
export function createMockR2(): R2Bucket & { _objects: Map<string, R2Entry> } {
  const objects = new Map<string, R2Entry>();

  const createR2Object = (key: string, entry: R2Entry): R2Object => ({
    key,
    version: "v1",
    size: entry.size,
    etag: entry.etag,
    httpEtag: `"${entry.etag}"`,
    uploaded: entry.uploaded,
    httpMetadata: entry.httpMetadata,
    customMetadata: entry.customMetadata,
    range: undefined,
    checksums: {
      toJSON: () => ({}),
    },
    storageClass: "Standard",
    writeHttpMetadata: vi.fn(),
  });

  const createR2ObjectBody = (key: string, entry: R2Entry): R2ObjectBody => ({
    ...createR2Object(key, entry),
    body: new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(entry.body));
        controller.close();
      },
    }),
    bodyUsed: false,
    arrayBuffer: vi.fn(async () => entry.body),
    bytes: vi.fn(async () => new Uint8Array(entry.body)),
    text: vi.fn(async () => new TextDecoder().decode(entry.body)),
    json: vi.fn(async () => JSON.parse(new TextDecoder().decode(entry.body))),
    blob: vi.fn(async () => new Blob([entry.body])),
    writeHttpMetadata: vi.fn(),
  });

  const bucket = {
    _objects: objects,

    head: vi.fn(async (key: string): Promise<R2Object | null> => {
      const entry = objects.get(key);
      if (!entry) return null;
      return createR2Object(key, entry);
    }),

    get: vi.fn(async (key: string): Promise<R2ObjectBody | null> => {
      const entry = objects.get(key);
      if (!entry) return null;
      return createR2ObjectBody(key, entry);
    }),

    put: vi.fn(
      async (
        key: string,
        value: ArrayBuffer | ReadableStream | string | Blob,
        options?: {
          httpMetadata?: { contentType?: string; cacheControl?: string };
          customMetadata?: Record<string, string>;
        },
      ): Promise<R2Object> => {
        let body: ArrayBuffer;
        if (value instanceof ArrayBuffer) {
          body = value;
        } else if (typeof value === "string") {
          body = new TextEncoder().encode(value).buffer;
        } else if (value instanceof Blob) {
          body = await value.arrayBuffer();
        } else {
          // ReadableStream
          const reader = value.getReader();
          const chunks: Uint8Array[] = [];
          let done = false;
          while (!done) {
            const { value: chunk, done: isDone } = await reader.read();
            if (chunk) chunks.push(chunk);
            done = isDone;
          }
          const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
          const result = new Uint8Array(totalLength);
          let offset = 0;
          for (const chunk of chunks) {
            result.set(chunk, offset);
            offset += chunk.length;
          }
          body = result.buffer;
        }

        const etag = `etag-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const entry: R2Entry = {
          body,
          httpMetadata: options?.httpMetadata,
          customMetadata: options?.customMetadata,
          etag,
          uploaded: new Date(),
          size: body.byteLength,
        };

        objects.set(key, entry);
        return createR2Object(key, entry);
      },
    ),

    delete: vi.fn(async (key: string | string[]) => {
      const keys = Array.isArray(key) ? key : [key];
      for (const k of keys) {
        objects.delete(k);
      }
    }),

    list: vi.fn(
      async (options?: {
        prefix?: string;
        cursor?: string;
        limit?: number;
      }) => {
        const prefix = options?.prefix ?? "";
        const limit = options?.limit ?? 1000;
        const result: R2Object[] = [];

        for (const [key, entry] of objects.entries()) {
          if (key.startsWith(prefix)) {
            result.push(createR2Object(key, entry));
            if (result.length >= limit) break;
          }
        }

        return {
          objects: result,
          truncated: result.length >= limit,
          cursor: result.length >= limit ? "next-cursor" : undefined,
          delimitedPrefixes: [],
        };
      },
    ),

    createMultipartUpload: vi.fn(),
    resumeMultipartUpload: vi.fn(),
  };

  return bucket as unknown as R2Bucket & { _objects: Map<string, R2Entry> };
}

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Seed a mock D1 database with initial data
 */
export function seedMockD1(
  db: ReturnType<typeof createMockD1>,
  tableName: string,
  rows: MockRow[],
): void {
  // Deep-clone each row to prevent Object.assign mutations in UPDATE
  // from leaking across test boundaries via shared object references
  db._tables.set(
    tableName,
    rows.map((row) => ({ ...row })),
  );
}

/**
 * Clear all data from a mock D1 database
 */
export function clearMockD1(db: ReturnType<typeof createMockD1>): void {
  db._tables.clear();
}

/**
 * Advance time for KV expiration testing
 */
export function advanceKVTime(
  kv: ReturnType<typeof createMockKV>,
  ms: number,
): void {
  // Modify expiration times to simulate time passage
  for (const [key, entry] of kv._store.entries()) {
    if (entry.expiresAt) {
      entry.expiresAt -= ms;
    }
  }
}
