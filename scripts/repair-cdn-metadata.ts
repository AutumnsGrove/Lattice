#!/usr/bin/env npx tsx
/**
 * CDN Metadata Repair Script
 *
 * NOTE: This script is DEPRECATED. Wrangler CLI does not support R2 object listing.
 * Use the admin UI sync button instead: /admin/cdn → "Sync from Storage"
 *
 * The admin UI uses the R2 SDK via Worker bindings which CAN list objects.
 *
 * ---
 *
 * Original intent: Scan R2 bucket objects and reconcile missing metadata in D1.
 * Use this when D1 cdn_files records are lost but R2 files still exist.
 *
 * Mapping from R2 → D1:
 *   R2 key          → D1 key, folder, filename
 *   R2 size         → D1 size_bytes
 *   R2 uploaded     → D1 created_at
 *   R2 contentType  → D1 content_type
 *   (generated)     → D1 id (UUID)
 *   (fallback)      → D1 uploaded_by, original_filename
 */

import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";

// =============================================================================
// Configuration
// =============================================================================

const GROVE_ROOT = path.resolve(import.meta.dirname, "..");
const DATABASE_NAME = "grove-engine-db";
const BUCKET_NAME = "grove-cdn";
const SQL_OUTPUT_PATH = path.join(GROVE_ROOT, "scripts/output/repair-cdn-metadata.sql");

// Default uploader ID when original is unknown
const DEFAULT_UPLOADED_BY = "system-recovered";

// =============================================================================
// CLI Arguments
// =============================================================================

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run") || args.includes("-n");
const LOCAL = args.includes("--local");

// Parse --uploaded-by=<id> argument
const uploadedByArg = args.find((a) => a.startsWith("--uploaded-by="));
const UPLOADED_BY = uploadedByArg ? uploadedByArg.split("=")[1] : DEFAULT_UPLOADED_BY;

// =============================================================================
// Types
// =============================================================================

interface R2Object {
	key: string;
	size: number;
	uploaded: string;
	etag: string;
	httpMetadata?: {
		contentType?: string;
		cacheControl?: string;
	};
	customMetadata?: Record<string, string>;
}

interface R2ListResult {
	objects: R2Object[];
	truncated: boolean;
	cursor?: string;
}

// =============================================================================
// R2 Operations (via wrangler)
// =============================================================================

function listR2Objects(): R2Object[] {
	console.log("      Fetching objects from R2 bucket...");

	const remoteFlag = LOCAL ? "" : "--remote";
	const cmd = `npx wrangler r2 object list ${BUCKET_NAME} ${remoteFlag} --json`;

	try {
		const output = execSync(cmd, {
			cwd: GROVE_ROOT,
			encoding: "utf-8",
			maxBuffer: 50 * 1024 * 1024, // 50MB buffer for large buckets
		});

		const result: R2ListResult = JSON.parse(output);

		if (result.truncated) {
			console.warn("      ⚠️  Warning: R2 list was truncated. Some objects may be missing.");
			console.warn(
				"         Run script again to sync remaining objects (pagination not yet implemented).",
			);
		}

		return result.objects;
	} catch (error) {
		console.error("\nError listing R2 objects:", error);
		throw error;
	}
}

// =============================================================================
// D1 Operations (via wrangler)
// =============================================================================

function getExistingKeys(): Set<string> {
	console.log("      Querying existing keys from D1...");

	const remoteFlag = LOCAL ? "" : "--remote";
	const cmd = `npx wrangler d1 execute ${DATABASE_NAME} --command "SELECT key FROM cdn_files" ${remoteFlag} --json`;

	try {
		const output = execSync(cmd, {
			cwd: GROVE_ROOT,
			encoding: "utf-8",
		});

		const result = JSON.parse(output);
		// D1 JSON output structure: [{ results: [...], success: true, ... }]
		const rows = result[0]?.results || [];
		return new Set(rows.map((r: { key: string }) => r.key));
	} catch (error) {
		// If table doesn't exist or query fails, assume empty
		console.warn("      ⚠️  Could not query existing keys, assuming empty.");
		return new Set();
	}
}

// =============================================================================
// Metadata Extraction
// =============================================================================

function extractFolder(key: string): string {
	const lastSlash = key.lastIndexOf("/");
	if (lastSlash === -1) return "/";
	return "/" + key.substring(0, lastSlash);
}

function extractFilename(key: string): string {
	const lastSlash = key.lastIndexOf("/");
	return lastSlash === -1 ? key : key.substring(lastSlash + 1);
}

function guessContentType(key: string): string {
	const ext = key.split(".").pop()?.toLowerCase();
	const mimeTypes: Record<string, string> = {
		jpg: "image/jpeg",
		jpeg: "image/jpeg",
		png: "image/png",
		gif: "image/gif",
		webp: "image/webp",
		avif: "image/avif",
		svg: "image/svg+xml",
		pdf: "application/pdf",
		mp4: "video/mp4",
		webm: "video/webm",
		mp3: "audio/mpeg",
		wav: "audio/wav",
		woff: "font/woff",
		woff2: "font/woff2",
		ttf: "font/ttf",
		otf: "font/otf",
		json: "application/json",
		css: "text/css",
		js: "application/javascript",
	};
	return mimeTypes[ext || ""] || "application/octet-stream";
}

// =============================================================================
// SQL Generation
// =============================================================================

function escapeString(str: string): string {
	return str.replace(/'/g, "''");
}

function generateInsertSQL(objects: R2Object[], uploadedBy: string): string {
	const statements: string[] = [];

	statements.push(`-- CDN Metadata Repair`);
	statements.push(`-- Generated: ${new Date().toISOString()}`);
	statements.push(`-- Uploader ID: ${uploadedBy}`);
	statements.push(`-- Objects: ${objects.length}`);
	statements.push("");

	for (const obj of objects) {
		const id = crypto.randomUUID();
		const filename = extractFilename(obj.key);
		const folder = extractFolder(obj.key);
		const contentType = obj.httpMetadata?.contentType || guessContentType(obj.key);
		const createdAt = obj.uploaded || new Date().toISOString();

		const sql = `INSERT OR IGNORE INTO cdn_files (
  id,
  filename,
  original_filename,
  key,
  content_type,
  size_bytes,
  folder,
  alt_text,
  uploaded_by,
  created_at
) VALUES (
  '${escapeString(id)}',
  '${escapeString(filename)}',
  '${escapeString(filename)}',
  '${escapeString(obj.key)}',
  '${escapeString(contentType)}',
  ${obj.size},
  '${escapeString(folder)}',
  NULL,
  '${escapeString(uploadedBy)}',
  '${escapeString(createdAt)}'
);`;

		statements.push(sql);
		statements.push("");
	}

	return statements.join("\n");
}

// =============================================================================
// Execution
// =============================================================================

function executeSQL(sql: string): void {
	// Ensure output directory exists
	const outputDir = path.dirname(SQL_OUTPUT_PATH);
	if (!fs.existsSync(outputDir)) {
		fs.mkdirSync(outputDir, { recursive: true });
	}

	// Write SQL to temp file
	fs.writeFileSync(SQL_OUTPUT_PATH, sql);
	console.log(`      SQL written to: ${SQL_OUTPUT_PATH}`);

	// Execute with wrangler
	const remoteFlag = LOCAL ? "" : "--remote";
	const cmd = `npx wrangler d1 execute ${DATABASE_NAME} --file="${SQL_OUTPUT_PATH}" ${remoteFlag}`;

	console.log(`\n      Executing: ${cmd}\n`);

	try {
		execSync(cmd, {
			cwd: GROVE_ROOT,
			encoding: "utf-8",
			stdio: "inherit",
		});
	} catch (error) {
		console.error("\nError executing SQL:", error);
		throw error;
	}
}

// =============================================================================
// Main
// =============================================================================

async function main(): Promise<void> {
	console.log("=".repeat(70));
	console.log("CDN METADATA REPAIR - DEPRECATED");
	console.log("=".repeat(70));
	console.log("");
	console.log("⚠️  This script cannot run because wrangler CLI does not support");
	console.log("   R2 object listing. Use the admin UI instead:");
	console.log("");
	console.log("   1. Deploy the latest code to production");
	console.log("   2. Visit: https://grove.place/admin/cdn");
	console.log("   3. Click 'Sync from Storage' button");
	console.log("");
	console.log("   The admin UI uses R2 Worker bindings which CAN list objects.");
	console.log("=".repeat(70));
	process.exit(0);

	console.log(`\nConfiguration:`);
	console.log(`  Bucket:      ${BUCKET_NAME}`);
	console.log(`  Database:    ${DATABASE_NAME}`);
	console.log(`  Target:      ${LOCAL ? "LOCAL" : "REMOTE"}`);
	console.log(`  Uploaded By: ${UPLOADED_BY}`);
	console.log(`  Dry Run:     ${DRY_RUN}`);

	// Step 1: List R2 objects
	console.log("\n[1/4] Scanning R2 bucket...");
	const r2Objects = listR2Objects();
	console.log(`      Found ${r2Objects.length} objects in R2`);

	if (r2Objects.length === 0) {
		console.log("\n*** No objects in R2 bucket - nothing to sync ***\n");
		return;
	}

	// Step 2: Get existing D1 keys
	console.log("\n[2/4] Checking existing D1 records...");
	const existingKeys = getExistingKeys();
	console.log(`      Found ${existingKeys.size} existing keys in D1`);

	// Step 3: Find missing objects
	console.log("\n[3/4] Finding missing records...");
	const missingObjects = r2Objects.filter((obj) => !existingKeys.has(obj.key));
	console.log(`      Found ${missingObjects.length} objects missing from D1`);

	if (missingObjects.length === 0) {
		console.log("\n*** All R2 objects already have D1 records - nothing to sync ***\n");
		return;
	}

	// Show preview of what will be synced
	console.log("\n      Objects to sync:");
	for (const obj of missingObjects.slice(0, 10)) {
		const sizeKB = (obj.size / 1024).toFixed(1);
		console.log(`        - ${obj.key} (${sizeKB} KB)`);
	}
	if (missingObjects.length > 10) {
		console.log(`        ... and ${missingObjects.length - 10} more`);
	}

	// Generate SQL
	const sql = generateInsertSQL(missingObjects, UPLOADED_BY);

	if (DRY_RUN) {
		console.log("\n[4/4] Dry run - SQL preview:");
		console.log("-".repeat(70));
		const lines = sql.split("\n").slice(0, 40);
		console.log(lines.join("\n"));
		if (sql.split("\n").length > 40) {
			console.log(`\n... (${sql.split("\n").length - 40} more lines)`);
		}
		console.log("-".repeat(70));
		console.log("\n*** DRY RUN COMPLETE - No changes made ***");
		console.log("Run without --dry-run to execute.\n");
		return;
	}

	// Execute
	console.log("\n[4/4] Inserting records into D1...");
	executeSQL(sql);

	console.log("\n" + "=".repeat(70));
	console.log("REPAIR COMPLETE");
	console.log("=".repeat(70));
	console.log(`\nSummary:`);
	console.log(`  R2 objects:    ${r2Objects.length}`);
	console.log(`  Already in D1: ${existingKeys.size}`);
	console.log(`  Synced:        ${missingObjects.length}`);
	console.log(`  Target:        ${LOCAL ? "local D1" : "remote D1 (production)"}`);
	console.log(`\nVerification command:`);
	console.log(
		`  npx wrangler d1 execute ${DATABASE_NAME} --command "SELECT COUNT(*) FROM cdn_files" ${LOCAL ? "" : "--remote"}`,
	);
	console.log("");
}

main().catch((error) => {
	console.error("\nError:", error.message);
	process.exit(1);
});
