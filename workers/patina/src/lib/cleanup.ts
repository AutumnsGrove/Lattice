/**
 * Backup Cleanup Logic
 *
 * Removes backups older than the retention period from R2 and metadata DB.
 */

import type { CleanupResult } from "../types";
import { getUnixTimestamp } from "./utils";

interface ExpiredBackup {
	id: number;
	r2_key: string;
	database_name: string;
	backup_date: string;
	size_bytes: number;
}

/**
 * Clean up backups older than the retention period
 *
 * @param bucket - R2 bucket for backup storage
 * @param metadataDb - D1 database for backup metadata
 * @param retentionWeeks - Number of weeks to retain backups
 * @returns Cleanup result with statistics
 */
export async function cleanupOldBackups(
	bucket: R2Bucket,
	metadataDb: D1Database,
	_retentionWeeks: number, // Used for future dynamic retention, currently expires_at is pre-calculated
): Promise<CleanupResult> {
	const now = getUnixTimestamp();

	// Query expired backups from inventory
	const expiredResult = await metadataDb
		.prepare(
			`
    SELECT id, r2_key, database_name, backup_date, size_bytes
    FROM backup_inventory
    WHERE expires_at < ?
    AND deleted_at IS NULL
  `,
		)
		.bind(now)
		.all<ExpiredBackup>();

	const expiredBackups = expiredResult.results;

	if (expiredBackups.length === 0) {
		return {
			totalExpired: 0,
			deleted: 0,
			failed: 0,
			freedBytes: 0,
			results: [],
		};
	}

	const results: Array<{ key: string; success: boolean; error?: string }> = [];
	let deletedCount = 0;
	let failedCount = 0;
	let freedBytes = 0;

	for (const backup of expiredBackups) {
		try {
			// Delete from R2
			await bucket.delete(backup.r2_key);

			// Mark as deleted in inventory
			await metadataDb
				.prepare(
					`
        UPDATE backup_inventory
        SET deleted_at = ?
        WHERE id = ?
      `,
				)
				.bind(now, backup.id)
				.run();

			results.push({ key: backup.r2_key, success: true });
			deletedCount++;
			freedBytes += backup.size_bytes;

			console.log(`Cleaned up expired backup: ${backup.r2_key}`);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			results.push({ key: backup.r2_key, success: false, error: errorMessage });
			failedCount++;

			console.error(`Failed to cleanup backup ${backup.r2_key}: ${errorMessage}`);
		}
	}

	return {
		totalExpired: expiredBackups.length,
		deleted: deletedCount,
		failed: failedCount,
		freedBytes,
		results,
	};
}
