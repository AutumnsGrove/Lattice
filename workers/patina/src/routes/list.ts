/**
 * GET /list
 *
 * Lists all available backups with optional filtering.
 *
 * Query parameters:
 * - database: Filter by database name
 * - date: Filter by backup date (YYYY-MM-DD)
 * - limit: Max results (default 50, max 100)
 * - offset: Pagination offset
 */

import type { Context } from "hono";
import type { Env, ListResponse, BackupInventory } from "../types";
import { formatBytes } from "../lib/utils";

export async function listHandler(c: Context<{ Bindings: Env }>): Promise<Response> {
	const db = c.env.METADATA_DB;

	// Parse query parameters
	const database = c.req.query("database");
	const date = c.req.query("date");
	const limit = Math.min(parseInt(c.req.query("limit") || "50"), 100);
	const offset = parseInt(c.req.query("offset") || "0");

	try {
		// Build query with optional filters
		let query = `
      SELECT *
      FROM backup_inventory
      WHERE deleted_at IS NULL
    `;
		const params: (string | number)[] = [];

		if (database) {
			query += ` AND database_name = ?`;
			params.push(database);
		}

		if (date) {
			query += ` AND backup_date = ?`;
			params.push(date);
		}

		// Get total count for pagination
		const countQuery = query.replace("SELECT *", "SELECT COUNT(*) as count");
		const countResult = await db
			.prepare(countQuery)
			.bind(...params)
			.first<{ count: number }>();
		const totalCount = countResult?.count || 0;

		// Add ordering and pagination
		query += ` ORDER BY backup_date DESC, database_name ASC LIMIT ? OFFSET ?`;
		params.push(limit, offset);

		// Execute main query
		const result = await db
			.prepare(query)
			.bind(...params)
			.all<BackupInventory>();

		const backups = (result.results || []).map((backup) => ({
			database: backup.database_name,
			date: backup.backup_date,
			r2Key: backup.r2_key,
			size: formatBytes(backup.size_bytes),
			tables: backup.table_count,
			createdAt: new Date(backup.created_at * 1000).toISOString(),
			expiresAt: new Date(backup.expires_at * 1000).toISOString(),
			downloadUrl: `https://grove-backups.m7jv4v7npb.workers.dev/download/${backup.backup_date}/${backup.database_name}`,
		}));

		const response: ListResponse = {
			backups,
			total: totalCount,
			filtered: backups.length,
		};

		return c.json(response);
	} catch (error) {
		console.error("List endpoint error:", error);
		return c.json(
			{
				error: "Failed to list backups",
				message: error instanceof Error ? error.message : String(error),
			},
			500,
		);
	}
}
