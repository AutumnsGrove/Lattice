/**
 * Database Safety Layer
 *
 * Provides additional safety guards for database operations, especially
 * useful when AI agents are performing database operations.
 *
 * Features:
 * - Blocks destructive DDL operations (DROP, TRUNCATE, ALTER)
 * - Enforces row limits on DELETE operations
 * - Audit logging for write operations
 * - Dry-run mode for testing queries
 *
 * @example
 * ```ts
 * // Create a safe database wrapper
 * const safeDb = withSafetyGuards(db, {
 *   allowDDL: false,        // Block DROP/ALTER/TRUNCATE
 *   maxDeleteRows: 100,     // Limit DELETE operations
 *   auditLog: true,         // Log all writes
 * });
 *
 * // This will throw - DDL blocked
 * await safeDb.execute('DROP TABLE users');
 *
 * // This will throw - too many rows
 * await safeDb.deleteWhere('logs', '1=1'); // Would delete all rows
 *
 * // This works - scoped delete
 * await safeDb.deleteWhere('logs', 'created_at < ?', [oldDate]);
 * ```
 */

import { DatabaseError, type D1DatabaseOrSession } from "./database.js";

// ============================================================================
// Types
// ============================================================================

export interface SafetyConfig {
  /**
   * Allow DDL operations (DROP, ALTER, TRUNCATE, CREATE)
   * Default: false - blocks destructive DDL
   */
  allowDDL?: boolean;

  /**
   * Maximum rows that can be deleted in a single operation
   * Set to -1 for unlimited (not recommended)
   * Default: 100
   */
  maxDeleteRows?: number;

  /**
   * Maximum rows that can be updated in a single operation
   * Set to -1 for unlimited
   * Default: 1000
   */
  maxUpdateRows?: number;

  /**
   * Enable audit logging of all write operations
   * Default: false
   */
  auditLog?: boolean;

  /**
   * Custom audit log function
   * Default: console.log
   */
  auditLogFn?: (entry: AuditLogEntry) => void;

  /**
   * Dry-run mode - log queries but don't execute
   * Default: false
   */
  dryRun?: boolean;

  /**
   * Redact parameters from audit logs to prevent leaking sensitive data
   * (passwords, tokens, PII). When true, params are replaced with "[REDACTED]".
   * Default: true (secure by default)
   */
  redactParams?: boolean;

  /**
   * Tables that are protected from DELETE operations
   * Operations on these tables will throw unless explicitly allowed
   */
  protectedTables?: string[];

  /**
   * Allow complex queries (subqueries, JOINs, CTEs, USING) that bypass
   * row limit enforcement. When false (default), these queries are blocked.
   * When true, they proceed with a warning logged.
   * Default: false (secure by default)
   */
  allowComplexQueries?: boolean;
}

export interface AuditLogEntry {
  timestamp: string;
  operation: "INSERT" | "UPDATE" | "DELETE" | "DDL" | "QUERY";
  table?: string;
  sql: string;
  params?: unknown[];
  rowsAffected?: number;
  dryRun: boolean;
}

// ============================================================================
// Safety Guards
// ============================================================================

/**
 * Patterns that indicate destructive DDL operations
 */
const DDL_PATTERNS = [
  /^\s*DROP\s+/i,
  /^\s*TRUNCATE\s+/i,
  /^\s*ALTER\s+TABLE\s+\w+\s+(DROP|RENAME)/i,
  /^\s*DELETE\s+FROM\s+\w+\s*$/i, // DELETE without WHERE
];

/**
 * Patterns that indicate potentially dangerous operations
 *
 * Note: SQL comments (-- line comments and block comments) are intentionally
 * NOT blocked here. While they can be used in injection attacks, they're also
 * used legitimately in SQL for documentation. The primary defense against
 * injection is using parameterized queries, not blocking comment syntax.
 */
const DANGEROUS_PATTERNS = [
  /;\s*DROP\s+/i, // SQL injection attempt (stacked query)
  /;\s*DELETE\s+/i, // SQL injection attempt (stacked query)
  /;\s*TRUNCATE\s+/i, // SQL injection attempt (stacked query)
];

/**
 * Extract table name from SQL statement
 */
function extractTableName(sql: string): string | null {
  // Match common patterns
  const patterns = [
    /FROM\s+(\w+)/i,
    /INTO\s+(\w+)/i,
    /UPDATE\s+(\w+)/i,
    /TABLE\s+(\w+)/i,
  ];

  for (const pattern of patterns) {
    const match = sql.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Determine operation type from SQL
 *
 * Handles CTEs (WITH ... AS (...) DELETE/UPDATE/SELECT) by extracting
 * the actual operation from within the CTE structure.
 */
function getOperationType(
  sql: string,
): "INSERT" | "UPDATE" | "DELETE" | "DDL" | "QUERY" {
  let trimmed = sql.trim().toUpperCase();

  // Handle CTEs: WITH ... AS (...) <actual_operation>
  // Extract the operation that follows the CTE definition
  if (trimmed.startsWith("WITH ")) {
    // Find the actual operation after the CTE (DELETE, UPDATE, INSERT, SELECT)
    const cteMatch = trimmed.match(/\)\s*(DELETE|UPDATE|INSERT|SELECT)\b/i);
    if (cteMatch) {
      trimmed = cteMatch[1];
    }
  }

  if (trimmed.startsWith("INSERT")) return "INSERT";
  if (trimmed.startsWith("UPDATE")) return "UPDATE";
  if (trimmed.startsWith("DELETE")) return "DELETE";
  if (
    trimmed.startsWith("DROP") ||
    trimmed.startsWith("ALTER") ||
    trimmed.startsWith("TRUNCATE") ||
    trimmed.startsWith("CREATE")
  ) {
    return "DDL";
  }
  return "QUERY";
}

/**
 * Check if SQL contains a WHERE clause
 */
function hasWhereClause(sql: string): boolean {
  return /\bWHERE\b/i.test(sql);
}

// ============================================================================
// Safety Errors
// ============================================================================

export class SafetyViolationError extends Error {
  constructor(
    message: string,
    public readonly code: SafetyErrorCode,
    public readonly sql?: string,
  ) {
    super(message);
    this.name = "SafetyViolationError";
  }
}

export type SafetyErrorCode =
  | "DDL_BLOCKED"
  | "DANGEROUS_PATTERN"
  | "MISSING_WHERE"
  | "PROTECTED_TABLE"
  | "ROW_LIMIT_EXCEEDED"
  | "COMPLEX_QUERY_BLOCKED"
  | "DRY_RUN";

// ============================================================================
// Safe Database Wrapper
// ============================================================================

export class SafeDatabase {
  private db: D1DatabaseOrSession;
  private config: Required<SafetyConfig>;

  constructor(db: D1DatabaseOrSession, config: SafetyConfig = {}) {
    this.db = db;
    this.config = {
      allowDDL: config.allowDDL ?? false,
      maxDeleteRows: config.maxDeleteRows ?? 100,
      maxUpdateRows: config.maxUpdateRows ?? 1000,
      auditLog: config.auditLog ?? false,
      auditLogFn: config.auditLogFn ?? console.log,
      dryRun: config.dryRun ?? false,
      redactParams: config.redactParams ?? true, // Secure by default
      protectedTables: config.protectedTables ?? [],
      allowComplexQueries: config.allowComplexQueries ?? false, // Secure by default
    };
  }

  /**
   * Validate SQL before execution
   */
  private validateSql(sql: string): void {
    const operation = getOperationType(sql);
    const table = extractTableName(sql);

    // Check for DDL operations
    if (!this.config.allowDDL && operation === "DDL") {
      throw new SafetyViolationError(
        `DDL operations are blocked. SQL: ${sql.slice(0, 100)}...`,
        "DDL_BLOCKED",
        sql,
      );
    }

    // Check for dangerous patterns
    for (const pattern of DANGEROUS_PATTERNS) {
      if (pattern.test(sql)) {
        throw new SafetyViolationError(
          `Potentially dangerous SQL pattern detected. SQL: ${sql.slice(0, 100)}...`,
          "DANGEROUS_PATTERN",
          sql,
        );
      }
    }

    // Check for DELETE without WHERE
    if (operation === "DELETE" && !hasWhereClause(sql)) {
      throw new SafetyViolationError(
        `DELETE without WHERE clause is blocked. Use deleteWhere() with explicit conditions.`,
        "MISSING_WHERE",
        sql,
      );
    }

    // Check for protected tables (includes UPDATE to prevent mass data corruption)
    if (
      table &&
      this.config.protectedTables.includes(table.toLowerCase()) &&
      (operation === "DELETE" || operation === "UPDATE" || operation === "DDL")
    ) {
      throw new SafetyViolationError(
        `Table '${table}' is protected from ${operation} operations.`,
        "PROTECTED_TABLE",
        sql,
      );
    }
  }

  /**
   * Log an audit entry
   *
   * When redactParams is enabled (default), parameters are replaced with
   * "[REDACTED]" to prevent sensitive data (passwords, tokens, PII) from
   * appearing in logs.
   */
  private logAudit(entry: Omit<AuditLogEntry, "timestamp" | "dryRun">): void {
    if (this.config.auditLog) {
      const fullEntry: AuditLogEntry = {
        ...entry,
        // Redact params by default to prevent sensitive data leakage
        params: this.config.redactParams
          ? entry.params?.map(() => "[REDACTED]")
          : entry.params,
        timestamp: new Date().toISOString(),
        dryRun: this.config.dryRun,
      };
      this.config.auditLogFn(fullEntry);
    }
  }

  /**
   * Execute a query with safety checks
   */
  async query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    this.validateSql(sql);

    this.logAudit({
      operation: "QUERY",
      sql,
      params,
      table: extractTableName(sql) ?? undefined,
    });

    if (this.config.dryRun) {
      console.log(`[DRY RUN] Would execute: ${sql}`);
      return [];
    }

    const result = await this.db
      .prepare(sql)
      .bind(...params)
      .all<T>();
    return result.results ?? [];
  }

  /**
   * Execute a statement with safety checks
   */
  async execute(
    sql: string,
    params: unknown[] = [],
  ): Promise<{ success: boolean; changes: number }> {
    this.validateSql(sql);

    const operation = getOperationType(sql);
    const table = extractTableName(sql);

    // For DELETE/UPDATE, check row limits before executing
    if (operation === "DELETE" || operation === "UPDATE") {
      // Detect complex queries that can't be reliably counted
      // These patterns indicate the row count transformation won't work correctly
      const isComplexQuery =
        /\bUSING\b/i.test(sql) || // USING clause (PostgreSQL-style join)
        /\bJOIN\b/i.test(sql) || // Explicit JOINs
        /^\s*WITH\b/i.test(sql) || // CTEs (Common Table Expressions)
        /\(\s*SELECT\b/i.test(sql); // Subqueries

      if (isComplexQuery) {
        if (!this.config.allowComplexQueries) {
          // Block complex queries by default - they bypass row limit enforcement
          throw new SafetyViolationError(
            `Complex ${operation} query blocked (contains subquery/JOIN/CTE/USING). ` +
              `These queries bypass row limit enforcement. Set allowComplexQueries: true to permit.`,
            "COMPLEX_QUERY_BLOCKED",
            sql,
          );
        }

        // If allowed, log for audit trail and proceed without row limit enforcement
        console.warn(
          `[DB SAFETY] Complex ${operation} query detected (subquery/JOIN/CTE/USING). ` +
            `Row limit enforcement skipped. SQL: ${sql.slice(0, 100)}...`,
        );

        // Log to audit if enabled
        this.logAudit({
          operation,
          sql,
          params,
          table: table ?? undefined,
        });
      } else {
        // Transform query to count affected rows before execution.
        //
        // SECURITY NOTE: This assumes callers use parameterized queries.
        // The safety layer catches common SQL injection patterns (stacked queries)
        // but parameterization is the primary defense against injection attacks.
        //
        // LIMITATION: This simple regex transformation only works for basic
        // DELETE/UPDATE statements. Complex queries with subqueries, JOINs,
        // CTEs, or USING clauses are detected above and skipped.
        const countSql = sql
          .replace(/^DELETE\s+FROM/i, "SELECT COUNT(*) as count FROM")
          .replace(
            /^UPDATE\s+(\w+)\s+SET\s+.*?\s+WHERE/i,
            "SELECT COUNT(*) as count FROM $1 WHERE",
          );

        // Only do the count check if we can transform the query
        if (countSql !== sql) {
          // Validate the transformed SQL too - defense in depth
          for (const pattern of DANGEROUS_PATTERNS) {
            if (pattern.test(countSql)) {
              throw new SafetyViolationError(
                `Potentially dangerous pattern in transformed count query. Original SQL: ${sql.slice(0, 100)}...`,
                "DANGEROUS_PATTERN",
                sql,
              );
            }
          }

          try {
            const countResult = await this.db
              .prepare(countSql)
              .bind(...params)
              .first<{ count: number }>();

            const count = countResult?.count ?? 0;
            const limit =
              operation === "DELETE"
                ? this.config.maxDeleteRows
                : this.config.maxUpdateRows;

            if (limit !== -1 && count > limit) {
              throw new SafetyViolationError(
                `${operation} would affect ${count} rows, but limit is ${limit}. ` +
                  `Add more specific WHERE conditions or increase the limit.`,
                "ROW_LIMIT_EXCEEDED",
                sql,
              );
            }
          } catch (err) {
            // If count check fails, proceed with caution but log the warning
            if (err instanceof SafetyViolationError) throw err;
            // Log that we couldn't verify row count - the operation will proceed
            // but without row limit enforcement
            console.warn(
              `[DB SAFETY] Could not verify row count for ${operation} operation. ` +
                `Proceeding without row limit enforcement. Error:`,
              err,
            );
          }
        }
      }
    }

    this.logAudit({
      operation,
      sql,
      params,
      table: table ?? undefined,
    });

    if (this.config.dryRun) {
      console.log(`[DRY RUN] Would execute: ${sql}`);
      return { success: true, changes: 0 };
    }

    const result = await this.db
      .prepare(sql)
      .bind(...params)
      .run();

    this.logAudit({
      operation,
      sql,
      params,
      table: table ?? undefined,
      rowsAffected: result.meta.changes ?? 0,
    });

    return {
      success: result.success,
      changes: result.meta.changes ?? 0,
    };
  }

  /**
   * Get the underlying database for operations that need it
   * Use with caution - bypasses safety checks
   */
  get unsafeDb(): D1DatabaseOrSession {
    console.warn(
      "[SAFETY] Accessing unsafeDb bypasses safety checks. Use with caution.",
    );
    return this.db;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Wrap a database with safety guards
 *
 * @example
 * ```ts
 * // Default safe mode - blocks DDL, limits deletes to 100 rows
 * const safeDb = withSafetyGuards(db);
 *
 * // Custom configuration
 * const safeDb = withSafetyGuards(db, {
 *   allowDDL: false,
 *   maxDeleteRows: 50,
 *   maxUpdateRows: 500,
 *   auditLog: true,
 *   redactParams: true,  // Redact params in audit logs (default: true)
 *   protectedTables: ['users', 'tenants', 'subscriptions'],
 * });
 *
 * // Dry-run mode for testing
 * const testDb = withSafetyGuards(db, { dryRun: true });
 *
 * // Opt-in to logging full parameters (use with caution!)
 * const debugDb = withSafetyGuards(db, {
 *   auditLog: true,
 *   redactParams: false,  // Only in dev/debug environments
 * });
 * ```
 */
export function withSafetyGuards(
  db: D1DatabaseOrSession,
  config?: SafetyConfig,
): SafeDatabase {
  return new SafeDatabase(db, config);
}

/**
 * Default safety configuration for agent operations
 *
 * This configuration is recommended when AI agents are performing
 * database operations to prevent accidental data loss.
 */
export const AGENT_SAFE_CONFIG: SafetyConfig = {
  allowDDL: false,
  maxDeleteRows: 50,
  maxUpdateRows: 200,
  auditLog: true,
  redactParams: true, // Prevent sensitive data in logs
  protectedTables: [
    "users",
    "tenants",
    "subscriptions",
    "payments",
    "sessions",
  ],
};

/**
 * Create a database wrapper with agent-safe defaults
 */
export function withAgentSafetyGuards(db: D1DatabaseOrSession): SafeDatabase {
  return withSafetyGuards(db, AGENT_SAFE_CONFIG);
}
