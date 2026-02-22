/**
 * GET /restore-guide/:db
 *
 * Returns restore instructions for a specific database.
 */

import type { Context } from "hono";
import type { Env, RestoreGuideResponse, BackupInventory } from "../types";
import { DATABASES } from "../lib/databases";
import { formatBytes } from "../lib/utils";

const WORKER_URL = "https://grove-backups.m7jv4v7npb.workers.dev";

export async function restoreGuideHandler(c: Context<{ Bindings: Env }>): Promise<Response> {
	const dbName = c.req.param("db");
	const dbConfig = DATABASES.find((d) => d.name === dbName);

	if (!dbConfig) {
		return c.json(
			{
				error: "Database not found",
				availableDatabases: DATABASES.map((d) => d.name),
			},
			404,
		);
	}

	try {
		// Get available backups for this database
		const backupsResult = await c.env.METADATA_DB.prepare(
			`
      SELECT backup_date, size_bytes, table_count
      FROM backup_inventory
      WHERE database_name = ? AND deleted_at IS NULL
      ORDER BY backup_date DESC
      LIMIT 10
    `,
		)
			.bind(dbName)
			.all<BackupInventory>();

		const availableBackups = (backupsResult.results || []).map((b) => ({
			date: b.backup_date,
			size: formatBytes(b.size_bytes),
			tables: b.table_count,
			downloadUrl: `${WORKER_URL}/download/${b.backup_date}/${dbName}`,
		}));

		const latestDate = availableBackups[0]?.date || "YYYY-MM-DD";

		const response: RestoreGuideResponse = {
			database: dbConfig.name,
			databaseId: dbConfig.id,
			description: dbConfig.description,
			priority: dbConfig.priority,
			availableBackups,
			restoreInstructions: {
				method1_wrangler: {
					name: "Wrangler CLI (Recommended)",
					steps: [
						`# Step 1: Download the backup`,
						`curl -o ${dbName}-backup.sql ${WORKER_URL}/download/${latestDate}/${dbName}`,
						``,
						`# Step 2: Review the SQL file (recommended)`,
						`head -50 ${dbName}-backup.sql`,
						``,
						`# Step 3: Restore to D1 (WARNING: This replaces all data!)`,
						`wrangler d1 execute ${dbName} --file=${dbName}-backup.sql`,
						``,
						`# Step 4: Verify the restore`,
						`wrangler d1 execute ${dbName} --command="SELECT name FROM sqlite_master WHERE type='table'"`,
					],
					warning:
						"This will DROP and recreate all tables. All existing data will be permanently replaced. Make sure you have a current backup before proceeding.",
				},
				method2_timetravel: {
					name: "D1 Time Travel (Last 30 days only)",
					steps: [
						`# Step 1: View available restore points`,
						`wrangler d1 time-travel info ${dbName}`,
						``,
						`# Step 2: Restore to a specific timestamp`,
						`wrangler d1 time-travel restore ${dbName} --timestamp="2026-01-02T03:00:00Z"`,
						``,
						`# Step 3: Verify the restore`,
						`wrangler d1 execute ${dbName} --command="SELECT COUNT(*) FROM sqlite_master WHERE type='table'"`,
					],
					note: "Time Travel is faster and built into D1, but only works for the last 30 days. Use Patina backups for older restores.",
				},
			},
		};

		return c.json(response);
	} catch (error) {
		console.error("Restore guide endpoint error:", error);
		return c.json(
			{
				error: "Failed to generate restore guide",
				message: error instanceof Error ? error.message : String(error),
			},
			500,
		);
	}
}
