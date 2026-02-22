/**
 * GET /status
 *
 * Returns current backup status and recent history.
 */

import type { Context } from "hono";
import type { Env, StatusResponse, BackupJob } from "../types";
import { formatBytes } from "../lib/utils";

/**
 * Calculate next scheduled backup time
 */
function getNextScheduledTime(): string {
	const now = new Date();
	const next = new Date(now);

	// Next daily backup is at 3 AM UTC
	next.setUTCHours(3, 0, 0, 0);
	if (next <= now) {
		next.setUTCDate(next.getUTCDate() + 1);
	}

	return next.toISOString();
}

export async function statusHandler(c: Context<{ Bindings: Env }>): Promise<Response> {
	const db = c.env.METADATA_DB;

	try {
		// Check if a backup is currently running
		const runningJob = await db
			.prepare(
				`SELECT * FROM backup_jobs WHERE status = 'running' ORDER BY started_at DESC LIMIT 1`,
			)
			.first<BackupJob>();

		// Get last completed backup
		const lastJob = await db
			.prepare(
				`SELECT * FROM backup_jobs WHERE status = 'completed' ORDER BY completed_at DESC LIMIT 1`,
			)
			.first<BackupJob>();

		// Get recent jobs (last 10)
		const recentJobsResult = await db
			.prepare(`SELECT * FROM backup_jobs ORDER BY started_at DESC LIMIT 10`)
			.all<BackupJob>();

		// Get storage statistics from inventory
		const storageStats = await db
			.prepare(
				`
        SELECT
          COUNT(*) as total_backups,
          COALESCE(SUM(size_bytes), 0) as total_size,
          MIN(backup_date) as oldest_backup,
          MAX(backup_date) as newest_backup
        FROM backup_inventory
        WHERE deleted_at IS NULL
      `,
			)
			.first<{
				total_backups: number;
				total_size: number;
				oldest_backup: string | null;
				newest_backup: string | null;
			}>();

		const response: StatusResponse = {
			currentStatus: runningJob ? "running" : "idle",
			lastBackup: lastJob
				? {
						jobId: lastJob.job_id,
						date: new Date(lastJob.completed_at! * 1000).toISOString(),
						status: lastJob.status,
						successful: lastJob.successful_count,
						failed: lastJob.failed_count,
						totalSize: formatBytes(lastJob.total_size_bytes),
						duration: `${(lastJob.duration_ms! / 1000).toFixed(1)}s`,
					}
				: null,
			nextScheduled: getNextScheduledTime(),
			recentJobs: (recentJobsResult.results || []).map((job) => ({
				jobId: job.job_id,
				date: new Date(job.started_at * 1000).toISOString(),
				status: job.status,
				databases: {
					successful: job.successful_count,
					failed: job.failed_count,
				},
			})),
			storage: {
				totalBackups: storageStats?.total_backups || 0,
				totalSize: formatBytes(storageStats?.total_size || 0),
				oldestBackup: storageStats?.oldest_backup || "",
				newestBackup: storageStats?.newest_backup || "",
			},
		};

		return c.json(response);
	} catch (error) {
		console.error("Status endpoint error:", error);
		return c.json(
			{
				error: "Failed to fetch status",
				message: error instanceof Error ? error.message : String(error),
			},
			500,
		);
	}
}
