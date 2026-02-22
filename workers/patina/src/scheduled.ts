/**
 * Scheduled Backup Handler
 *
 * Runs on cron schedule (every Sunday at 3:00 AM UTC)
 * Backs up all 14 Grove D1 databases to R2
 */

import type { Env, BackupResult, DatabaseConfig } from "./types";
import { DATABASES, DAILY_DATABASES, CRON_DAILY } from "./lib/databases";
import {
	generateJobId,
	getUnixTimestamp,
	formatDate,
	calculateExpirationTimestamp,
} from "./lib/utils";
import { exportDatabase } from "./lib/exporter";
import { cleanupOldBackups } from "./lib/cleanup";
import { sendAlert } from "./lib/alerting";

interface BackupJobResult {
	jobId: string;
	triggerType: "scheduled" | "manual";
	startedAt: number;
	completedAt: number;
	successfulCount: number;
	failedCount: number;
	totalSizeBytes: number;
	durationMs: number;
	results: BackupResult[];
}

/**
 * Determine which databases to back up based on cron pattern
 */
function getDatabasesToBackup(cronPattern: string | undefined): DatabaseConfig[] {
	if (cronPattern === CRON_DAILY) {
		// Daily cron: only priority databases
		return DAILY_DATABASES;
	}
	// Weekly cron or manual trigger: all databases
	return DATABASES;
}

/**
 * Main scheduled handler
 * Triggered by cron or manual /trigger endpoint
 */
export async function handleScheduled(
	event: ScheduledEvent | null,
	env: Env,
	triggerType: "scheduled" | "manual" = "scheduled",
): Promise<void> {
	const cronPattern = event?.cron;
	const databasesToBackup = getDatabasesToBackup(cronPattern);
	const isDaily = cronPattern === CRON_DAILY;

	const jobId = generateJobId();
	const startTime = Date.now();
	const startedAt = getUnixTimestamp();
	const backupDate = formatDate(new Date());

	const backupType = isDaily ? "daily priority" : "weekly full";
	console.log(
		`[${jobId}] Starting ${backupType} backup (${triggerType}) for ${databasesToBackup.length} databases`,
	);

	const results: BackupResult[] = [];
	let successfulCount = 0;
	let failedCount = 0;
	let totalSizeBytes = 0;

	try {
		// Create job record
		await createJobRecord(env, jobId, triggerType, startedAt, databasesToBackup.length);

		// Backup each database
		for (const dbConfig of databasesToBackup) {
			const result = await backupDatabase(env, jobId, dbConfig, backupDate);
			results.push(result);

			if (result.status === "success") {
				successfulCount++;
				totalSizeBytes += result.size_bytes ?? 0;
			} else {
				failedCount++;
			}
		}

		// Cleanup old backups
		console.log(`[${jobId}] Running cleanup...`);
		const retentionWeeks = parseInt(env.RETENTION_WEEKS || "12");
		await cleanupOldBackups(env.BACKUPS, env.METADATA_DB, retentionWeeks);

		const completedAt = getUnixTimestamp();
		const durationMs = Date.now() - startTime;

		// Update job as completed
		await completeJobRecord(
			env,
			jobId,
			completedAt,
			successfulCount,
			failedCount,
			totalSizeBytes,
			durationMs,
		);

		console.log(
			`[${jobId}] Backup job completed: ${successfulCount}/${databasesToBackup.length} successful in ${durationMs}ms`,
		);

		// Send alert
		const jobResult: BackupJobResult = {
			jobId,
			triggerType,
			startedAt,
			completedAt,
			successfulCount,
			failedCount,
			totalSizeBytes,
			durationMs,
			results,
		};
		await sendAlertIfConfigured(env, jobResult);
	} catch (error) {
		console.error(`[${jobId}] Backup job failed:`, error);
		await failJobRecord(env, jobId, error);
	}
}

/**
 * Backup a single database
 */
async function backupDatabase(
	env: Env,
	jobId: string,
	dbConfig: DatabaseConfig,
	backupDate: string,
): Promise<BackupResult> {
	const startedAt = getUnixTimestamp();
	const startTime = Date.now();

	console.log(`[${jobId}] Backing up ${dbConfig.name}...`);

	try {
		// Get the database binding - use type assertion for dynamic binding access
		const db = env[dbConfig.binding as keyof Env] as D1Database;

		// Export to SQL
		const exportResult = await exportDatabase(db, dbConfig.name, jobId);

		// Upload to R2
		const r2Key = `${backupDate}/${dbConfig.name}.sql`;
		await env.BACKUPS.put(r2Key, exportResult.sql, {
			customMetadata: {
				jobId,
				database: dbConfig.name,
				tableCount: exportResult.tableCount.toString(),
				rowCount: exportResult.rowCount.toString(),
				exportDurationMs: exportResult.durationMs.toString(),
			},
		});

		const completedAt = getUnixTimestamp();
		const durationMs = Date.now() - startTime;

		// Record in inventory
		const retentionWeeks = parseInt(env.RETENTION_WEEKS || "12");
		await recordBackupInventory(
			env,
			r2Key,
			dbConfig.name,
			backupDate,
			exportResult.sizeBytes,
			exportResult.tableCount,
			completedAt,
			calculateExpirationTimestamp(retentionWeeks),
		);

		// Record result
		const result: BackupResult = {
			id: 0,
			job_id: jobId,
			database_name: dbConfig.name,
			database_id: dbConfig.id,
			status: "success",
			r2_key: r2Key,
			size_bytes: exportResult.sizeBytes,
			table_count: exportResult.tableCount,
			row_count: exportResult.rowCount,
			started_at: startedAt,
			completed_at: completedAt,
			duration_ms: durationMs,
			error_message: null,
		};

		await recordBackupResult(env, result);

		console.log(
			`[${jobId}] ✓ ${dbConfig.name}: ${exportResult.tableCount} tables, ${exportResult.rowCount} rows, ${exportResult.sizeBytes} bytes`,
		);

		return result;
	} catch (error) {
		const completedAt = getUnixTimestamp();
		const errorMessage = error instanceof Error ? error.message : String(error);

		console.error(`[${jobId}] ✗ ${dbConfig.name}: ${errorMessage}`);

		const result: BackupResult = {
			id: 0,
			job_id: jobId,
			database_name: dbConfig.name,
			database_id: dbConfig.id,
			status: "failed",
			r2_key: null,
			size_bytes: null,
			table_count: null,
			row_count: null,
			started_at: startedAt,
			completed_at: completedAt,
			duration_ms: Date.now() - startTime,
			error_message: errorMessage,
		};

		await recordBackupResult(env, result);

		return result;
	}
}

/**
 * Create initial job record in metadata DB
 */
async function createJobRecord(
	env: Env,
	jobId: string,
	triggerType: "scheduled" | "manual",
	startedAt: number,
	totalDatabases: number,
): Promise<void> {
	await env.METADATA_DB.prepare(
		`
    INSERT INTO backup_jobs (job_id, started_at, status, trigger_type, total_databases)
    VALUES (?, ?, 'running', ?, ?)
  `,
	)
		.bind(jobId, startedAt, triggerType, totalDatabases)
		.run();
}

/**
 * Update job record as completed
 */
async function completeJobRecord(
	env: Env,
	jobId: string,
	completedAt: number,
	successfulCount: number,
	failedCount: number,
	totalSizeBytes: number,
	durationMs: number,
): Promise<void> {
	await env.METADATA_DB.prepare(
		`
    UPDATE backup_jobs
    SET completed_at = ?, status = 'completed', successful_count = ?, failed_count = ?, total_size_bytes = ?, duration_ms = ?
    WHERE job_id = ?
  `,
	)
		.bind(completedAt, successfulCount, failedCount, totalSizeBytes, durationMs, jobId)
		.run();
}

/**
 * Update job record as failed
 */
async function failJobRecord(env: Env, jobId: string, error: unknown): Promise<void> {
	const errorMessage = error instanceof Error ? error.message : String(error);
	await env.METADATA_DB.prepare(
		`
    UPDATE backup_jobs
    SET completed_at = ?, status = 'failed', error_message = ?
    WHERE job_id = ?
  `,
	)
		.bind(getUnixTimestamp(), errorMessage, jobId)
		.run();
}

/**
 * Record individual backup result
 */
async function recordBackupResult(env: Env, result: BackupResult): Promise<void> {
	await env.METADATA_DB.prepare(
		`
    INSERT INTO backup_results (job_id, database_name, database_id, status, r2_key, size_bytes, table_count, row_count, started_at, completed_at, duration_ms, error_message)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
	)
		.bind(
			result.job_id,
			result.database_name,
			result.database_id,
			result.status,
			result.r2_key,
			result.size_bytes,
			result.table_count,
			result.row_count,
			result.started_at,
			result.completed_at,
			result.duration_ms,
			result.error_message,
		)
		.run();
}

/**
 * Record backup in inventory
 *
 * Uses INSERT OR IGNORE to handle the case where daily and weekly backups
 * overlap on Sundays (daily runs at 3 AM, weekly at 4 AM). If the daily
 * backup already created the inventory record, we silently skip the duplicate.
 */
async function recordBackupInventory(
	env: Env,
	r2Key: string,
	databaseName: string,
	backupDate: string,
	sizeBytes: number,
	tableCount: number,
	createdAt: number,
	expiresAt: number,
): Promise<void> {
	await env.METADATA_DB.prepare(
		`
    INSERT OR IGNORE INTO backup_inventory (r2_key, database_name, backup_date, size_bytes, table_count, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `,
	)
		.bind(r2Key, databaseName, backupDate, sizeBytes, tableCount, createdAt, expiresAt)
		.run();
}

/**
 * Send alert if configured
 */
async function sendAlertIfConfigured(env: Env, result: BackupJobResult): Promise<void> {
	const shouldAlertOnSuccess = env.ALERT_ON_SUCCESS === "true";
	const shouldAlertOnFailure = env.ALERT_ON_FAILURE === "true";

	const hasFailures = result.failedCount > 0;

	if (hasFailures && shouldAlertOnFailure) {
		await sendAlert(env, result, "failure");
	} else if (!hasFailures && shouldAlertOnSuccess) {
		await sendAlert(env, result, "success");
	}
}
