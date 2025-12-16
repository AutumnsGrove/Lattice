/**
 * Database operations for the Landing site
 *
 * CDN file operations have been moved to @autumnsgrove/groveengine/services
 * Use: import { storage } from '@autumnsgrove/groveengine/services'
 */

import {
	type D1DatabaseOrSession,
	generateId,
	now,
	futureTimestamp,
	queryOne,
	execute
} from '@autumnsgrove/groveengine/services';

// Re-export for backwards compatibility
export { generateId, now };
export type { D1DatabaseOrSession };

// ============================================================================
// Constants
// ============================================================================

/** Session duration: 30 days in milliseconds */
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

/** Magic code expiration: 15 minutes in milliseconds */
const MAGIC_CODE_EXPIRY_MS = 15 * 60 * 1000;

// ============================================================================
// User Operations
// ============================================================================

export interface User {
	id: string;
	email: string;
	is_admin: boolean;
	created_at: string;
	updated_at: string;
}

interface UserRow {
	id: string;
	email: string;
	is_admin: number;
	created_at: string;
	updated_at: string;
}

function mapUserRow(row: UserRow): User {
	return {
		...row,
		is_admin: row.is_admin === 1
	};
}

export async function getOrCreateUser(
	db: D1DatabaseOrSession,
	email: string
): Promise<User> {
	const normalizedEmail = email.toLowerCase();

	const existing = await queryOne<UserRow>(
		db,
		'SELECT * FROM users WHERE email = ?',
		[normalizedEmail]
	);

	if (existing) {
		return mapUserRow(existing);
	}

	const id = generateId();
	const timestamp = now();

	await execute(
		db,
		'INSERT INTO users (id, email, is_admin, created_at, updated_at) VALUES (?, ?, 0, ?, ?)',
		[id, normalizedEmail, timestamp, timestamp]
	);

	return {
		id,
		email: normalizedEmail,
		is_admin: false,
		created_at: timestamp,
		updated_at: timestamp
	};
}

export async function getUserByEmail(
	db: D1DatabaseOrSession,
	email: string
): Promise<User | null> {
	const result = await queryOne<UserRow>(
		db,
		'SELECT * FROM users WHERE email = ?',
		[email.toLowerCase()]
	);

	return result ? mapUserRow(result) : null;
}

// ============================================================================
// Session Operations
// ============================================================================

export interface Session {
	id: string;
	user_id: string;
	expires_at: string;
	created_at: string;
}

export async function createSession(
	db: D1DatabaseOrSession,
	userId: string
): Promise<Session> {
	const id = generateId();
	const timestamp = now();
	const expiresAt = futureTimestamp(SESSION_DURATION_MS);

	await execute(
		db,
		'INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)',
		[id, userId, expiresAt, timestamp]
	);

	return {
		id,
		user_id: userId,
		expires_at: expiresAt,
		created_at: timestamp
	};
}

export async function deleteSession(
	db: D1DatabaseOrSession,
	sessionId: string
): Promise<void> {
	await execute(db, 'DELETE FROM sessions WHERE id = ?', [sessionId]);
}

// ============================================================================
// Magic Code Operations
// ============================================================================

export interface MagicCode {
	id: string;
	email: string;
	code: string;
	expires_at: string;
	used_at: string | null;
	created_at: string;
}

export async function createMagicCode(
	db: D1DatabaseOrSession,
	email: string
): Promise<MagicCode> {
	const id = generateId();
	const code = Math.random().toString(36).substring(2, 8).toUpperCase(); // 6-char code
	const timestamp = now();
	const expiresAt = futureTimestamp(MAGIC_CODE_EXPIRY_MS);

	await execute(
		db,
		'INSERT INTO magic_codes (id, email, code, expires_at, created_at) VALUES (?, ?, ?, ?, ?)',
		[id, email.toLowerCase(), code, expiresAt, timestamp]
	);

	return {
		id,
		email: email.toLowerCase(),
		code,
		expires_at: expiresAt,
		used_at: null,
		created_at: timestamp
	};
}

export async function verifyMagicCode(
	db: D1DatabaseOrSession,
	email: string,
	code: string
): Promise<boolean> {
	const result = await queryOne<MagicCode>(
		db,
		'SELECT * FROM magic_codes WHERE email = ? AND code = ? AND expires_at > datetime("now") AND used_at IS NULL',
		[email.toLowerCase(), code.toUpperCase()]
	);

	if (!result) return false;

	// Mark code as used
	await execute(
		db,
		'UPDATE magic_codes SET used_at = datetime("now") WHERE id = ?',
		[result.id]
	);

	return true;
}
