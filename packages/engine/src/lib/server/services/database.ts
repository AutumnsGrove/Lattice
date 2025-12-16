/**
 * Database Service - D1 SQLite Abstraction
 *
 * Provides typed utilities for D1 database operations:
 * - Type-safe query helpers
 * - Transaction/batch support
 * - Specific error types for debugging
 * - Common utility functions
 *
 * Note: Domain-specific operations (users, sessions, etc.) remain in
 * their respective packages. This module provides shared primitives.
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Type alias for D1 database or session
 * Allows functions to accept either a raw database or a session-scoped connection
 */
export type D1DatabaseOrSession = D1Database | D1DatabaseSession;

/**
 * Query result metadata from D1
 */
export interface QueryMeta {
	/** Number of rows changed (for INSERT/UPDATE/DELETE) */
	changes: number;
	/** Duration of the query in milliseconds */
	duration: number;
	/** Last inserted row ID (SQLite) */
	lastRowId: number;
	/** Number of rows read */
	rowsRead: number;
	/** Number of rows written */
	rowsWritten: number;
}

/**
 * Result from an execute (non-SELECT) operation
 */
export interface ExecuteResult {
	success: boolean;
	meta: QueryMeta;
}

// ============================================================================
// Errors
// ============================================================================

export class DatabaseError extends Error {
	constructor(
		message: string,
		public readonly code: DatabaseErrorCode,
		public readonly cause?: unknown
	) {
		super(message);
		this.name = 'DatabaseError';
	}
}

export type DatabaseErrorCode =
	| 'QUERY_FAILED'
	| 'NOT_FOUND'
	| 'CONSTRAINT_VIOLATION'
	| 'TRANSACTION_FAILED'
	| 'CONNECTION_ERROR'
	| 'INVALID_QUERY';

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate a UUID v4 identifier
 */
export function generateId(): string {
	return crypto.randomUUID();
}

/**
 * Get current timestamp in ISO format
 */
export function now(): string {
	return new Date().toISOString();
}

/**
 * Get a timestamp for a future time
 * @param ms - Milliseconds from now
 */
export function futureTimestamp(ms: number): string {
	return new Date(Date.now() + ms).toISOString();
}

/**
 * Check if a timestamp has expired
 */
export function isExpired(timestamp: string): boolean {
	return new Date(timestamp) < new Date();
}

// ============================================================================
// Query Helpers
// ============================================================================

/**
 * Execute a query expecting a single row result
 *
 * @example
 * ```ts
 * const user = await db.queryOne<User>(
 *   db,
 *   'SELECT * FROM users WHERE id = ?',
 *   [userId]
 * );
 * if (!user) throw new Error('User not found');
 * ```
 */
export async function queryOne<T>(
	db: D1DatabaseOrSession,
	sql: string,
	params: unknown[] = []
): Promise<T | null> {
	try {
		const result = await db
			.prepare(sql)
			.bind(...params)
			.first<T>();
		return result ?? null;
	} catch (err) {
		throw new DatabaseError(`Query failed: ${sql}`, 'QUERY_FAILED', err);
	}
}

/**
 * Execute a query expecting a single row, throw if not found
 *
 * @example
 * ```ts
 * const user = await db.queryOneOrThrow<User>(
 *   db,
 *   'SELECT * FROM users WHERE id = ?',
 *   [userId]
 * );
 * // user is guaranteed to exist here
 * ```
 */
export async function queryOneOrThrow<T>(
	db: D1DatabaseOrSession,
	sql: string,
	params: unknown[] = [],
	errorMessage = 'Record not found'
): Promise<T> {
	const result = await queryOne<T>(db, sql, params);
	if (result === null) {
		throw new DatabaseError(errorMessage, 'NOT_FOUND');
	}
	return result;
}

/**
 * Execute a query expecting multiple rows
 *
 * @example
 * ```ts
 * const users = await db.queryMany<User>(
 *   db,
 *   'SELECT * FROM users WHERE is_admin = ?',
 *   [1]
 * );
 * ```
 */
export async function queryMany<T>(
	db: D1DatabaseOrSession,
	sql: string,
	params: unknown[] = []
): Promise<T[]> {
	try {
		const result = await db
			.prepare(sql)
			.bind(...params)
			.all<T>();
		return result.results ?? [];
	} catch (err) {
		throw new DatabaseError(`Query failed: ${sql}`, 'QUERY_FAILED', err);
	}
}

/**
 * Execute a non-SELECT statement (INSERT, UPDATE, DELETE)
 *
 * @example
 * ```ts
 * const result = await db.execute(
 *   db,
 *   'UPDATE users SET name = ? WHERE id = ?',
 *   [newName, userId]
 * );
 * console.log(`Updated ${result.meta.changes} rows`);
 * ```
 */
export async function execute(
	db: D1DatabaseOrSession,
	sql: string,
	params: unknown[] = []
): Promise<ExecuteResult> {
	try {
		const result = await db
			.prepare(sql)
			.bind(...params)
			.run();

		return {
			success: result.success,
			meta: {
				changes: result.meta.changes ?? 0,
				duration: result.meta.duration,
				lastRowId: result.meta.last_row_id ?? 0,
				rowsRead: result.meta.rows_read ?? 0,
				rowsWritten: result.meta.rows_written ?? 0
			}
		};
	} catch (err) {
		throw new DatabaseError(`Execute failed: ${sql}`, 'QUERY_FAILED', err);
	}
}

/**
 * Execute a statement and throw if no rows were affected
 *
 * @example
 * ```ts
 * await db.executeOrThrow(
 *   db,
 *   'DELETE FROM sessions WHERE id = ?',
 *   [sessionId],
 *   'Session not found'
 * );
 * ```
 */
export async function executeOrThrow(
	db: D1DatabaseOrSession,
	sql: string,
	params: unknown[] = [],
	errorMessage = 'No rows affected'
): Promise<ExecuteResult> {
	const result = await execute(db, sql, params);
	if (result.meta.changes === 0) {
		throw new DatabaseError(errorMessage, 'NOT_FOUND');
	}
	return result;
}

// ============================================================================
// Batch / Transaction Helpers
// ============================================================================

/**
 * Execute multiple statements atomically
 * All statements succeed or all fail (D1 batch semantics)
 *
 * @example
 * ```ts
 * await db.batch(db, [
 *   { sql: 'INSERT INTO users (id, email) VALUES (?, ?)', params: [id, email] },
 *   { sql: 'INSERT INTO profiles (user_id) VALUES (?)', params: [id] }
 * ]);
 * ```
 */
export async function batch(
	db: D1Database,
	statements: Array<{ sql: string; params?: unknown[] }>
): Promise<ExecuteResult[]> {
	try {
		const prepared = statements.map((stmt) =>
			db.prepare(stmt.sql).bind(...(stmt.params ?? []))
		);

		const results = await db.batch(prepared);

		return results.map((result) => ({
			success: result.success,
			meta: {
				changes: result.meta.changes ?? 0,
				duration: result.meta.duration,
				lastRowId: result.meta.last_row_id ?? 0,
				rowsRead: result.meta.rows_read ?? 0,
				rowsWritten: result.meta.rows_written ?? 0
			}
		}));
	} catch (err) {
		throw new DatabaseError('Batch operation failed', 'TRANSACTION_FAILED', err);
	}
}

/**
 * Execute a function within a database session for read consistency
 *
 * @example
 * ```ts
 * const result = await db.withSession(db, async (session) => {
 *   const user = await queryOne<User>(session, 'SELECT * FROM users WHERE id = ?', [id]);
 *   const posts = await queryMany<Post>(session, 'SELECT * FROM posts WHERE user_id = ?', [id]);
 *   return { user, posts };
 * });
 * ```
 */
export async function withSession<T>(
	db: D1Database,
	fn: (session: D1DatabaseSession) => Promise<T>
): Promise<T> {
	const session = db.withSession();
	try {
		return await fn(session);
	} catch (err) {
		throw new DatabaseError('Session operation failed', 'TRANSACTION_FAILED', err);
	}
}

// ============================================================================
// Table Name Validation
// ============================================================================

/**
 * Valid table name pattern - alphanumeric and underscores only
 * This prevents SQL injection in functions that accept table names
 */
const VALID_TABLE_NAME = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

function validateTableName(table: string): void {
	if (!VALID_TABLE_NAME.test(table)) {
		throw new DatabaseError(
			`Invalid table name: ${table}. Table names must be alphanumeric with underscores only.`,
			'INVALID_QUERY'
		);
	}
}

// ============================================================================
// Insert Helpers
// ============================================================================

/**
 * Insert a row and return the generated ID
 *
 * SECURITY: Table name is validated to prevent SQL injection.
 * Only use with hardcoded table names, never user input.
 *
 * @example
 * ```ts
 * const id = await db.insert(db, 'users', {
 *   email: 'user@example.com',
 *   name: 'John'
 * });
 * ```
 */
export async function insert(
	db: D1DatabaseOrSession,
	table: string,
	data: Record<string, unknown>,
	options?: { id?: string }
): Promise<string> {
	validateTableName(table);
	const id = options?.id ?? generateId();
	const timestamp = now();

	const dataWithMeta = {
		id,
		...data,
		created_at: timestamp,
		updated_at: timestamp
	};

	const columns = Object.keys(dataWithMeta);
	const placeholders = columns.map(() => '?').join(', ');
	const values = Object.values(dataWithMeta);

	const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;

	try {
		await db
			.prepare(sql)
			.bind(...values)
			.run();
		return id;
	} catch (err) {
		if (err instanceof Error && err.message.includes('UNIQUE constraint')) {
			throw new DatabaseError(
				`Duplicate entry in ${table} (columns: ${columns.join(', ')})`,
				'CONSTRAINT_VIOLATION',
				err
			);
		}
		throw new DatabaseError(
			`Insert into ${table} failed (columns: ${columns.join(', ')})`,
			'QUERY_FAILED',
			err
		);
	}
}

// ============================================================================
// Update Helpers
// ============================================================================

/**
 * Update rows matching a condition
 *
 * SECURITY: Table name is validated to prevent SQL injection.
 * Only use with hardcoded table names, never user input.
 *
 * @example
 * ```ts
 * const changes = await db.update(db, 'users', { name: 'Jane' }, 'id = ?', [userId]);
 * ```
 */
export async function update(
	db: D1DatabaseOrSession,
	table: string,
	data: Record<string, unknown>,
	where: string,
	whereParams: unknown[] = []
): Promise<number> {
	validateTableName(table);
	const dataWithTimestamp = {
		...data,
		updated_at: now()
	};

	const setClauses = Object.keys(dataWithTimestamp)
		.map((key) => `${key} = ?`)
		.join(', ');
	const values = [...Object.values(dataWithTimestamp), ...whereParams];

	const sql = `UPDATE ${table} SET ${setClauses} WHERE ${where}`;

	try {
		const result = await db
			.prepare(sql)
			.bind(...values)
			.run();
		return result.meta.changes ?? 0;
	} catch (err) {
		const fields = Object.keys(dataWithTimestamp).join(', ');
		throw new DatabaseError(
			`Update ${table} failed (fields: ${fields}, where: ${where})`,
			'QUERY_FAILED',
			err
		);
	}
}

// ============================================================================
// Delete Helpers
// ============================================================================

/**
 * Delete rows matching a condition
 *
 * SECURITY: Table name is validated to prevent SQL injection.
 * Only use with hardcoded table names, never user input.
 *
 * @example
 * ```ts
 * const deleted = await db.deleteWhere(db, 'sessions', 'expires_at < datetime("now")');
 * ```
 */
export async function deleteWhere(
	db: D1DatabaseOrSession,
	table: string,
	where: string,
	whereParams: unknown[] = []
): Promise<number> {
	validateTableName(table);
	const sql = `DELETE FROM ${table} WHERE ${where}`;

	try {
		const result = await db
			.prepare(sql)
			.bind(...whereParams)
			.run();
		return result.meta.changes ?? 0;
	} catch (err) {
		throw new DatabaseError(`Delete from ${table} failed (where: ${where})`, 'QUERY_FAILED', err);
	}
}

/**
 * Delete a single row by ID
 *
 * @example
 * ```ts
 * await db.deleteById(db, 'users', userId);
 * ```
 */
export async function deleteById(
	db: D1DatabaseOrSession,
	table: string,
	id: string
): Promise<boolean> {
	const changes = await deleteWhere(db, table, 'id = ?', [id]);
	return changes > 0;
}

// ============================================================================
// Existence Checks
// ============================================================================

/**
 * Check if a row exists
 *
 * SECURITY: Table name is validated to prevent SQL injection.
 * Only use with hardcoded table names, never user input.
 *
 * @example
 * ```ts
 * if (await db.exists(db, 'users', 'email = ?', [email])) {
 *   throw new Error('Email already registered');
 * }
 * ```
 */
export async function exists(
	db: D1DatabaseOrSession,
	table: string,
	where: string,
	whereParams: unknown[] = []
): Promise<boolean> {
	validateTableName(table);
	const sql = `SELECT 1 FROM ${table} WHERE ${where} LIMIT 1`;

	try {
		const result = await db
			.prepare(sql)
			.bind(...whereParams)
			.first();
		return result !== null;
	} catch (err) {
		throw new DatabaseError(`Existence check on ${table} failed`, 'QUERY_FAILED', err);
	}
}

/**
 * Count rows matching a condition
 *
 * SECURITY: Table name is validated to prevent SQL injection.
 * Only use with hardcoded table names, never user input.
 *
 * @example
 * ```ts
 * const activeUsers = await db.count(db, 'users', 'is_active = ?', [1]);
 * ```
 */
export async function count(
	db: D1DatabaseOrSession,
	table: string,
	where?: string,
	whereParams: unknown[] = []
): Promise<number> {
	validateTableName(table);
	const sql = where
		? `SELECT COUNT(*) as count FROM ${table} WHERE ${where}`
		: `SELECT COUNT(*) as count FROM ${table}`;

	try {
		const result = await db
			.prepare(sql)
			.bind(...whereParams)
			.first<{ count: number }>();
		return result?.count ?? 0;
	} catch (err) {
		throw new DatabaseError(`Count on ${table} failed`, 'QUERY_FAILED', err);
	}
}
