/**
 * Database Export Logic
 *
 * Exports D1 databases to SQL dump format with full schema and data.
 */

import type { ExportResult, TableInfo } from "../types";
import { formatSqlValue } from "./utils";

/** Batch size for exporting rows to avoid memory issues */
const BATCH_SIZE = 1000;

/**
 * Export a D1 database to SQL dump format
 *
 * @param db - D1Database instance
 * @param dbName - Name of the database
 * @param jobId - UUID of the backup job
 * @returns Export result with SQL dump and metadata
 */
export async function exportDatabase(
	db: D1Database,
	dbName: string,
	jobId: string,
): Promise<ExportResult> {
	const startTime = Date.now();
	let totalRows = 0;

	// Get all user tables
	const tables = await getUserTables(db);

	// Build header
	const lines: string[] = [];
	lines.push("-- ================================================");
	lines.push(`-- Grove Backup: ${dbName}`);
	lines.push(`-- Generated: ${new Date().toISOString()}`);
	lines.push(`-- Job ID: ${jobId}`);
	lines.push(`-- Tables: ${tables.length}`);
	lines.push("-- ================================================");
	lines.push("");
	lines.push("PRAGMA foreign_keys=OFF;");
	lines.push("BEGIN TRANSACTION;");
	lines.push("");

	// Export each table
	for (const table of tables) {
		const rowCount = await getRowCount(db, table.name);
		totalRows += rowCount;

		lines.push(`-- Table: ${table.name}`);
		lines.push(`-- Rows: ${rowCount}`);
		lines.push(`DROP TABLE IF EXISTS "${table.name}";`);
		lines.push(`${table.sql};`);
		lines.push("");

		// Export rows in batches
		if (rowCount > 0) {
			const rowsSQL = await exportTableRows(db, table.name, rowCount);
			lines.push(rowsSQL);
		}
	}

	lines.push("COMMIT;");
	lines.push("PRAGMA foreign_keys=ON;");
	lines.push("");

	const durationMs = Date.now() - startTime;

	// Add footer
	lines.push("-- ================================================");
	lines.push("-- Backup Complete");
	lines.push(`-- Duration: ${(durationMs / 1000).toFixed(3)}s`);
	lines.push(`-- Total Rows: ${totalRows.toLocaleString()}`);
	lines.push("-- ================================================");

	const sql = lines.join("\n");

	return {
		sql,
		tableCount: tables.length,
		rowCount: totalRows,
		sizeBytes: new TextEncoder().encode(sql).length,
		durationMs,
	};
}

/**
 * Get all user tables from a D1 database
 * Excludes Cloudflare internal tables (_cf%) and SQLite system tables
 */
async function getUserTables(db: D1Database): Promise<TableInfo[]> {
	const result = await db
		.prepare(
			`
    SELECT name, sql FROM sqlite_master
    WHERE type = 'table'
    AND name NOT LIKE '_cf%'
    AND name NOT LIKE 'sqlite%'
    ORDER BY name
  `,
		)
		.all<{ name: string; sql: string }>();

	return result.results.map((row) => ({
		name: row.name,
		sql: row.sql,
	}));
}

/**
 * Get row count for a table
 */
async function getRowCount(db: D1Database, tableName: string): Promise<number> {
	const result = await db
		.prepare(`SELECT COUNT(*) as count FROM "${tableName}"`)
		.first<{ count: number }>();

	return result?.count ?? 0;
}

/**
 * Export table rows in batches
 */
async function exportTableRows(
	db: D1Database,
	tableName: string,
	rowCount: number,
): Promise<string> {
	const lines: string[] = [];
	let offset = 0;

	while (offset < rowCount) {
		const batch = await db
			.prepare(`SELECT * FROM "${tableName}" LIMIT ${BATCH_SIZE} OFFSET ${offset}`)
			.all();

		for (const row of batch.results) {
			const record = row as Record<string, unknown>;
			const columns = Object.keys(record);
			const values = Object.values(record).map(formatSqlValue);

			lines.push(
				`INSERT INTO "${tableName}" (${columns.map((c) => `"${c}"`).join(", ")}) VALUES (${values.join(", ")});`,
			);
		}

		offset += BATCH_SIZE;
	}

	lines.push("");
	return lines.join("\n");
}
