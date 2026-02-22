/**
 * GroveBackups Type Definitions
 *
 * This file contains all TypeScript interfaces and types used throughout the project.
 */

// ============================================
// Environment Bindings
// ============================================

export interface Env {
	// Source D1 Databases (14 total)
	GROVEAUTH_DB: D1Database;
	SCOUT_DB: D1Database;
	GROVE_ENGINE_DB: D1Database;
	GROVEMUSIC_DB: D1Database;
	LIBRARY_ENHANCER_DB: D1Database;
	AUTUMNSGROVE_POSTS_DB: D1Database;
	AUTUMNSGROVE_GIT_STATS_DB: D1Database;
	GROVE_DOMAIN_JOBS_DB: D1Database;
	YOUR_SITE_POSTS_DB: D1Database;
	AMBER_DB: D1Database;
	MYCELIUM_OAUTH_DB: D1Database;
	IVY_DB: D1Database;
	GROVE_CURIOS_DB: D1Database;
	GROVE_OBSERVABILITY_DB: D1Database;

	// Metadata database
	METADATA_DB: D1Database;

	// R2 storage
	BACKUPS: R2Bucket;

	// Environment variables
	RETENTION_WEEKS: string;
	ALERT_ON_SUCCESS: string;
	ALERT_ON_FAILURE: string;

	// Zephyr email alerting
	ZEPHYR_API_KEY?: string;
	ZEPHYR_URL?: string;
	ALERT_EMAIL?: string;

	// Secrets (set via wrangler secret)
	API_KEY?: string;
}

// ============================================
// Database Configuration
// ============================================

export interface DatabaseConfig {
	name: string;
	id: string;
	binding: keyof Pick<
		Env,
		| "GROVEAUTH_DB"
		| "SCOUT_DB"
		| "GROVE_ENGINE_DB"
		| "GROVEMUSIC_DB"
		| "LIBRARY_ENHANCER_DB"
		| "AUTUMNSGROVE_POSTS_DB"
		| "AUTUMNSGROVE_GIT_STATS_DB"
		| "GROVE_DOMAIN_JOBS_DB"
		| "YOUR_SITE_POSTS_DB"
		| "AMBER_DB"
		| "MYCELIUM_OAUTH_DB"
		| "IVY_DB"
		| "GROVE_CURIOS_DB"
		| "GROVE_OBSERVABILITY_DB"
	>;
	description: string;
	priority: "critical" | "high" | "normal";
	estimatedSize: string;
	/** If true, this database is backed up daily (in addition to weekly) */
	dailyBackup?: boolean;
}

// ============================================
// Backup Job Types
// ============================================

export interface BackupJob {
	id: number;
	job_id: string;
	started_at: number;
	completed_at: number | null;
	status: "running" | "completed" | "failed";
	trigger_type: "scheduled" | "manual";
	total_databases: number;
	successful_count: number;
	failed_count: number;
	total_size_bytes: number;
	duration_ms: number | null;
	error_message: string | null;
}

export interface BackupResult {
	id: number;
	job_id: string;
	database_name: string;
	database_id: string;
	status: "success" | "failed" | "skipped";
	r2_key: string | null;
	size_bytes: number | null;
	table_count: number | null;
	row_count: number | null;
	started_at: number;
	completed_at: number | null;
	duration_ms: number | null;
	error_message: string | null;
}

export interface BackupInventory {
	id: number;
	r2_key: string;
	database_name: string;
	backup_date: string;
	size_bytes: number;
	table_count: number | null;
	created_at: number;
	expires_at: number;
	deleted_at: number | null;
}

// ============================================
// Export Types
// ============================================

export interface ExportResult {
	sql: string;
	tableCount: number;
	rowCount: number;
	sizeBytes: number;
	durationMs: number;
}

export interface TableInfo {
	name: string;
	sql: string;
}

// ============================================
// Cleanup Types
// ============================================

export interface CleanupResult {
	totalExpired: number;
	deleted: number;
	failed: number;
	freedBytes: number;
	results: Array<{
		key: string;
		success: boolean;
		error?: string;
	}>;
}

// ============================================
// Alert Types
// ============================================

export interface AlertConfig {
	id: number;
	webhook_url: string | null;
	enabled: number;
	notify_on_success: number;
	notify_on_failure: number;
	created_at: number;
	updated_at: number;
}

export interface AlertPayload {
	type: "backup_completed" | "backup_failed";
	jobId: string;
	status: "success" | "partial_failure" | "failed";
	timestamp: string;
	summary: {
		successful: number;
		failed: number;
		totalSize: string;
		duration: string;
	};
	details?: Array<{
		database: string;
		status: string;
		size?: string;
	}>;
	failures?: Array<{
		database: string;
		error: string;
	}>;
}

// ============================================
// API Response Types
// ============================================

export interface StatusResponse {
	currentStatus: "idle" | "running";
	lastBackup: {
		jobId: string;
		date: string;
		status: string;
		successful: number;
		failed: number;
		totalSize: string;
		duration: string;
	} | null;
	nextScheduled: string;
	recentJobs: Array<{
		jobId: string;
		date: string;
		status: string;
		databases: {
			successful: number;
			failed: number;
		};
	}>;
	storage: {
		totalBackups: number;
		totalSize: string;
		oldestBackup: string;
		newestBackup: string;
	};
}

export interface ListResponse {
	backups: Array<{
		database: string;
		date: string;
		r2Key: string;
		size: string;
		tables: number | null;
		createdAt: string;
		expiresAt: string;
		downloadUrl: string;
	}>;
	total: number;
	filtered: number;
}

export interface TriggerRequest {
	databases?: string[];
	reason?: string;
}

export interface TriggerResponse {
	jobId: string;
	status: string;
	databases: number;
	message: string;
}

export interface RestoreGuideResponse {
	database: string;
	databaseId: string;
	description: string;
	priority: string;
	availableBackups: Array<{
		date: string;
		size: string;
		tables: number | null;
		downloadUrl: string;
	}>;
	restoreInstructions: {
		method1_wrangler: {
			name: string;
			steps: string[];
			warning: string;
		};
		method2_timetravel: {
			name: string;
			steps: string[];
			note: string;
		};
	};
}

export interface HealthResponse {
	status: "healthy" | "degraded" | "unhealthy";
	timestamp: string;
	checks: {
		worker: boolean;
		metadataDb: boolean;
		r2Bucket: boolean;
	};
	version: string;
}

// ============================================
// Internal Helper Types
// ============================================

export interface BackupContext {
	jobId: string;
	env: Env;
	triggerType: "scheduled" | "manual";
	databases: DatabaseConfig[];
}
