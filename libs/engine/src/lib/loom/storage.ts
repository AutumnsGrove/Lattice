/**
 * Loom — Storage Utilities
 *
 * Three tools for DO storage:
 * - JsonStore: Key-value JSON blobs in DO SQLite (Gen1 pattern)
 * - SqlHelper: Safe query wrappers (queryOne, queryAll, exec)
 * - safeJsonParse: Parse JSON with a typed fallback
 *
 * Replaces manual INSERT OR REPLACE, .toArray()[0], and
 * duplicated parseJsonFor* functions across 4+ DOs.
 */

import type { LoomLogger } from "./logger.js";

// ============================================================================
// Safe JSON Parse
// ============================================================================

/**
 * Parse a JSON string with a typed fallback.
 * Never throws — returns the fallback on any parse error.
 */
export function safeJsonParse<T>(
  raw: string | null | undefined,
  fallback: T,
): T {
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

// ============================================================================
// SQL Helper
// ============================================================================

/**
 * Safe wrappers around DO SQLite operations.
 * Prevents the common `.toArray()[0]` mistake and provides
 * consistent null-on-empty semantics.
 */
export class SqlHelper {
  private readonly sql: SqlStorage;
  private readonly log: LoomLogger;

  constructor(sql: SqlStorage, log: LoomLogger) {
    this.sql = sql;
    this.log = log;
  }

  /** Execute DDL or write statements (CREATE TABLE, INSERT, DELETE, etc). */
  exec(
    query: string,
    ...bindings: unknown[]
  ): SqlStorageCursor<Record<string, SqlStorageValue>> {
    return this.sql.exec(query, ...bindings);
  }

  /** Query for a single row. Returns null if no rows match. */
  queryOne<T = Record<string, unknown>>(
    query: string,
    ...bindings: unknown[]
  ): T | null {
    const cursor = this.sql.exec(query, ...bindings);
    const row = cursor.one();
    return (row as T) ?? null;
  }

  /** Query for all rows. Returns an empty array if no rows match. */
  queryAll<T = Record<string, unknown>>(
    query: string,
    ...bindings: unknown[]
  ): T[] {
    const cursor = this.sql.exec(query, ...bindings);
    return cursor.toArray() as T[];
  }

  /** Get the raw SqlStorage for advanced operations. */
  get raw(): SqlStorage {
    return this.sql;
  }
}

// ============================================================================
// JSON Store
// ============================================================================

/**
 * Key-value JSON store backed by DO SQLite.
 * Uses the `content(key, value, updated_at)` table pattern
 * from PostContentDO, PostMetaDO, and TenantDO.
 *
 * @example
 * ```typescript
 * await store.set("post_content", myContent);
 * const content = store.get<PostContent>("post_content");
 * ```
 */
export class JsonStore {
  private readonly sqlHelper: SqlHelper;
  private readonly log: LoomLogger;
  private readonly tableName: string;

  constructor(sqlHelper: SqlHelper, log: LoomLogger, tableName = "kv_store") {
    // Validate table name to prevent SQL injection via interpolation.
    // Only alphanumeric + underscore allowed.
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
      throw new Error(
        `[Loom] Invalid JsonStore table name: "${tableName}". Only alphanumeric and underscore allowed.`,
      );
    }
    this.sqlHelper = sqlHelper;
    this.log = log;
    this.tableName = tableName;
  }

  /** Ensure the backing table exists. Called during schema init. */
  createTable(): void {
    this.sqlHelper.exec(`
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);
  }

  /** Get a typed value by key. Returns null if not found. */
  get<T>(key: string): T | null {
    const row = this.sqlHelper.queryOne<{ value: string }>(
      `SELECT value FROM ${this.tableName} WHERE key = ?`,
      key,
    );
    if (!row?.value) return null;
    return safeJsonParse<T | null>(row.value, null);
  }

  /** Set a typed value by key. Upserts (insert or replace). */
  set<T>(key: string, value: T): void {
    this.sqlHelper.exec(
      `INSERT OR REPLACE INTO ${this.tableName} (key, value, updated_at) VALUES (?, ?, ?)`,
      key,
      JSON.stringify(value),
      Date.now(),
    );
  }

  /** Delete a key. */
  delete(key: string): void {
    this.sqlHelper.exec(`DELETE FROM ${this.tableName} WHERE key = ?`, key);
  }

  /** Check if a key exists. */
  has(key: string): boolean {
    const row = this.sqlHelper.queryOne<{ key: string }>(
      `SELECT key FROM ${this.tableName} WHERE key = ?`,
      key,
    );
    return row !== null;
  }
}
