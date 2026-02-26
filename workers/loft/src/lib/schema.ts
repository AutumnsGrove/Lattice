/**
 * D1 Schema Initialization
 *
 * Creates Loft-specific tables alongside Firefly's own tables.
 * All CREATE statements are idempotent (IF NOT EXISTS).
 */

let initialized = false;

export async function initializeSchema(db: D1Database): Promise<void> {
	if (initialized) return;

	await db.batch([
		// Firefly SDK tables (D1FireflyStore creates these too, but we want them
		// in our batch for atomicity on first deploy)
		db.prepare(`
			CREATE TABLE IF NOT EXISTS firefly_instances (
				id TEXT PRIMARY KEY,
				provider_server_id TEXT NOT NULL,
				provider TEXT NOT NULL,
				public_ip TEXT,
				status TEXT NOT NULL DEFAULT 'provisioning',
				created_at INTEGER NOT NULL,
				metadata TEXT DEFAULT '{}'
			)
		`),
		db.prepare(`
			CREATE TABLE IF NOT EXISTS firefly_sessions (
				id TEXT PRIMARY KEY,
				instance_id TEXT NOT NULL,
				consumer TEXT NOT NULL,
				provider TEXT NOT NULL,
				size TEXT,
				region TEXT,
				started_at INTEGER NOT NULL,
				ended_at INTEGER,
				duration_sec INTEGER,
				cost REAL,
				status TEXT NOT NULL
			)
		`),
		// Loft config (key/value store for SSH key, preferences)
		db.prepare(`
			CREATE TABLE IF NOT EXISTS loft_config (
				key TEXT PRIMARY KEY,
				value TEXT NOT NULL,
				updated_at INTEGER NOT NULL
			)
		`),
		// Per-instance activity tracking for idle detection
		db.prepare(`
			CREATE TABLE IF NOT EXISTS loft_activity (
				instance_id TEXT PRIMARY KEY,
				last_activity_at INTEGER NOT NULL,
				hard_cap_at INTEGER NOT NULL,
				warned INTEGER NOT NULL DEFAULT 0
			)
		`),
		// Persisted events for observability
		db.prepare(`
			CREATE TABLE IF NOT EXISTS loft_events (
				id TEXT PRIMARY KEY,
				type TEXT NOT NULL,
				instance_id TEXT,
				timestamp INTEGER NOT NULL,
				metadata TEXT DEFAULT '{}'
			)
		`),
	]);

	initialized = true;
}
