// Database operations for the CDN system

// ============================================================================
// Utility Functions
// ============================================================================

export function generateId(): string {
	return crypto.randomUUID();
}

export function now(): string {
	return new Date().toISOString();
}

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

export async function getOrCreateUser(db: D1Database, email: string): Promise<User> {
	const existing = await db
		.prepare('SELECT * FROM users WHERE email = ?')
		.bind(email.toLowerCase())
		.first<UserRow>();

	if (existing) {
		return {
			...existing,
			is_admin: existing.is_admin === 1
		};
	}

	const id = generateId();
	const timestamp = now();

	await db
		.prepare('INSERT INTO users (id, email, is_admin, created_at, updated_at) VALUES (?, ?, 0, ?, ?)')
		.bind(id, email.toLowerCase(), timestamp, timestamp)
		.run();

	return {
		id,
		email: email.toLowerCase(),
		is_admin: false,
		created_at: timestamp,
		updated_at: timestamp
	};
}

export async function getUserByEmail(db: D1Database, email: string): Promise<User | null> {
	const result = await db
		.prepare('SELECT * FROM users WHERE email = ?')
		.bind(email.toLowerCase())
		.first<UserRow>();

	if (!result) return null;

	return {
		...result,
		is_admin: result.is_admin === 1
	};
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

export async function createSession(db: D1Database, userId: string): Promise<Session> {
	const id = generateId();
	const timestamp = now();
	const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days

	await db
		.prepare('INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
		.bind(id, userId, expiresAt, timestamp)
		.run();

	return {
		id,
		user_id: userId,
		expires_at: expiresAt,
		created_at: timestamp
	};
}

export async function deleteSession(db: D1Database, sessionId: string): Promise<void> {
	await db.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run();
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

export async function createMagicCode(db: D1Database, email: string): Promise<MagicCode> {
	const id = generateId();
	const code = Math.random().toString(36).substring(2, 8).toUpperCase(); // 6-char code
	const timestamp = now();
	const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes

	await db
		.prepare('INSERT INTO magic_codes (id, email, code, expires_at, created_at) VALUES (?, ?, ?, ?, ?)')
		.bind(id, email.toLowerCase(), code, expiresAt, timestamp)
		.run();

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
	db: D1Database,
	email: string,
	code: string
): Promise<boolean> {
	const result = await db
		.prepare(
			'SELECT * FROM magic_codes WHERE email = ? AND code = ? AND expires_at > datetime("now") AND used_at IS NULL'
		)
		.bind(email.toLowerCase(), code.toUpperCase())
		.first<MagicCode>();

	if (!result) return false;

	// Mark code as used
	await db
		.prepare('UPDATE magic_codes SET used_at = datetime("now") WHERE id = ?')
		.bind(result.id)
		.run();

	return true;
}

// ============================================================================
// CDN Files Operations
// ============================================================================

export interface CdnFile {
	id: string;
	filename: string;
	original_filename: string;
	key: string;
	content_type: string;
	size_bytes: number;
	folder: string;
	alt_text: string | null;
	uploaded_by: string;
	created_at: string;
}

export async function createCdnFile(
	db: D1Database,
	data: {
		filename: string;
		original_filename: string;
		key: string;
		content_type: string;
		size_bytes: number;
		folder?: string;
		alt_text?: string;
		uploaded_by: string;
	}
): Promise<CdnFile> {
	const id = generateId();
	const timestamp = now();

	await db
		.prepare(
			`INSERT INTO cdn_files (id, filename, original_filename, key, content_type, size_bytes, folder, alt_text, uploaded_by, created_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
		)
		.bind(
			id,
			data.filename,
			data.original_filename,
			data.key,
			data.content_type,
			data.size_bytes,
			data.folder ?? '/',
			data.alt_text ?? null,
			data.uploaded_by,
			timestamp
		)
		.run();

	return {
		id,
		filename: data.filename,
		original_filename: data.original_filename,
		key: data.key,
		content_type: data.content_type,
		size_bytes: data.size_bytes,
		folder: data.folder ?? '/',
		alt_text: data.alt_text ?? null,
		uploaded_by: data.uploaded_by,
		created_at: timestamp
	};
}

export async function getCdnFile(db: D1Database, id: string): Promise<CdnFile | null> {
	const result = await db.prepare('SELECT * FROM cdn_files WHERE id = ?').bind(id).first<CdnFile>();
	return result ?? null;
}

export async function getCdnFileByKey(db: D1Database, key: string): Promise<CdnFile | null> {
	const result = await db
		.prepare('SELECT * FROM cdn_files WHERE key = ?')
		.bind(key)
		.first<CdnFile>();
	return result ?? null;
}

export async function listCdnFiles(
	db: D1Database,
	options?: { folder?: string; limit?: number; offset?: number }
): Promise<{ files: CdnFile[]; total: number }> {
	const folder = options?.folder ?? '/';
	const limit = options?.limit ?? 50;
	const offset = options?.offset ?? 0;

	const [filesResult, countResult] = await Promise.all([
		db
			.prepare(
				`SELECT * FROM cdn_files
				 WHERE folder = ?
				 ORDER BY created_at DESC
				 LIMIT ? OFFSET ?`
			)
			.bind(folder, limit, offset)
			.all<CdnFile>(),
		db
			.prepare('SELECT COUNT(*) as count FROM cdn_files WHERE folder = ?')
			.bind(folder)
			.first<{ count: number }>()
	]);

	return {
		files: filesResult.results ?? [],
		total: countResult?.count ?? 0
	};
}

export async function listAllCdnFiles(
	db: D1Database,
	options?: { limit?: number; offset?: number }
): Promise<{ files: CdnFile[]; total: number }> {
	const limit = options?.limit ?? 50;
	const offset = options?.offset ?? 0;

	const [filesResult, countResult] = await Promise.all([
		db
			.prepare(
				`SELECT * FROM cdn_files
				 ORDER BY created_at DESC
				 LIMIT ? OFFSET ?`
			)
			.bind(limit, offset)
			.all<CdnFile>(),
		db.prepare('SELECT COUNT(*) as count FROM cdn_files').first<{ count: number }>()
	]);

	return {
		files: filesResult.results ?? [],
		total: countResult?.count ?? 0
	};
}

export async function deleteCdnFile(db: D1Database, id: string): Promise<string | null> {
	const file = await getCdnFile(db, id);
	if (!file) return null;

	await db.prepare('DELETE FROM cdn_files WHERE id = ?').bind(id).run();
	return file.key;
}

export async function updateCdnFileAltText(
	db: D1Database,
	id: string,
	altText: string
): Promise<void> {
	await db.prepare('UPDATE cdn_files SET alt_text = ? WHERE id = ?').bind(altText, id).run();
}

export async function getCdnFolders(db: D1Database): Promise<string[]> {
	const result = await db
		.prepare('SELECT DISTINCT folder FROM cdn_files ORDER BY folder')
		.all<{ folder: string }>();
	return (result.results ?? []).map((r) => r.folder);
}
