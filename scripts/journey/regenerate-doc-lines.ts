#!/usr/bin/env npx tsx
/**
 * Regenerate doc_lines from Git History (No-Checkout Version)
 *
 * For each version in history.csv, this script:
 * 1. Lists all markdown files at that commit using `git ls-tree`
 * 2. Counts lines for each file using `git show <commit>:<file>`
 * 3. Updates the doc_lines value in history.csv
 *
 * This approach DOES NOT checkout commits, avoiding stash/merge conflicts.
 *
 * Usage:
 *   npx tsx scripts/journey/regenerate-doc-lines.ts           # Run the regeneration
 *   npx tsx scripts/journey/regenerate-doc-lines.ts --dry-run # Preview changes only
 *
 * Security Note:
 *   Local dev tool. Git hashes from our controlled CSV, validated before use.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { execSync } from "node:child_process";

// =============================================================================
// Configuration
// =============================================================================

const GROVE_ROOT = path.resolve(import.meta.dirname, "../..");
const HISTORY_CSV_PATH = path.join(GROVE_ROOT, "apps/landing/static/data/history.csv");
const BACKUP_PATH = path.join(GROVE_ROOT, "apps/landing/static/data/history.csv.backup");

// Patterns to exclude when counting doc lines
const EXCLUDE_PATTERNS = [
	"node_modules/",
	"_deprecated/",
	"_archived/",
	".svelte-kit/",
	"dist/",
	"build/",
];

// =============================================================================
// CLI Arguments
// =============================================================================

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run") || args.includes("-n");
const VERBOSE = args.includes("--verbose") || args.includes("-v");

// =============================================================================
// Utility Functions
// =============================================================================

function exec(cmd: string): string {
	try {
		return execSync(cmd, {
			cwd: GROVE_ROOT,
			encoding: "utf-8",
			stdio: ["pipe", "pipe", "pipe"],
			maxBuffer: 50 * 1024 * 1024, // 50MB buffer for large outputs
		}).trim();
	} catch (error) {
		if (VERBOSE) {
			console.error(`Command failed: ${cmd}`);
		}
		return "";
	}
}

function isValidGitHash(hash: string): boolean {
	return /^[0-9a-f]{7,40}$/i.test(hash);
}

/**
 * List all markdown files at a specific commit using git ls-tree.
 * Returns array of file paths.
 */
function listMarkdownFilesAtCommit(commitHash: string): string[] {
	if (!isValidGitHash(commitHash)) {
		console.error(`Invalid git hash: ${commitHash}`);
		return [];
	}

	// List all files at this commit, filter for .md
	const output = exec(`git ls-tree -r --name-only ${commitHash}`);
	if (!output) return [];

	const allFiles = output.split("\n").filter((f) => f.endsWith(".md"));

	// Filter out excluded paths
	return allFiles.filter((file) => {
		return !EXCLUDE_PATTERNS.some((pattern) => file.includes(pattern));
	});
}

/**
 * Count lines in a file at a specific commit using git show.
 */
function countLinesAtCommit(commitHash: string, filePath: string): number {
	try {
		// Use git show to get file content, pipe to wc -l
		const content = exec(`git show ${commitHash}:"${filePath}"`);
		if (!content) return 0;
		return content.split("\n").length;
	} catch {
		return 0;
	}
}

/**
 * Count total markdown lines at a specific commit.
 */
function countDocLinesAtCommit(commitHash: string): number {
	const files = listMarkdownFilesAtCommit(commitHash);
	let totalLines = 0;

	for (const file of files) {
		totalLines += countLinesAtCommit(commitHash, file);
	}

	return totalLines;
}

// =============================================================================
// CSV Parsing
// =============================================================================

interface CSVRow {
	values: string[];
	gitHash: string;
	label: string;
	docLinesIndex: number;
}

function parseCSV(): { header: string; rows: CSVRow[] } {
	const content = fs.readFileSync(HISTORY_CSV_PATH, "utf-8");
	const lines = content.trim().split("\n");

	const header = lines[0];
	const headerCols = header.split(",");

	const docLinesIndex = headerCols.indexOf("doc_lines");
	if (docLinesIndex === -1) {
		throw new Error("doc_lines column not found in CSV header");
	}

	const rows: CSVRow[] = [];
	for (let i = 1; i < lines.length; i++) {
		const values = lines[i].split(",");
		if (values.length >= 3) {
			rows.push({
				values,
				gitHash: values[2],
				label: values[1],
				docLinesIndex,
			});
		}
	}

	return { header, rows };
}

function writeCSV(header: string, rows: CSVRow[]): void {
	const lines = [header, ...rows.map((r) => r.values.join(","))];
	fs.writeFileSync(HISTORY_CSV_PATH, lines.join("\n") + "\n");
}

// =============================================================================
// Main Logic
// =============================================================================

async function main(): Promise<void> {
	console.log("=".repeat(70));
	console.log("REGENERATE DOC_LINES FROM GIT HISTORY (No-Checkout)");
	console.log("=".repeat(70));

	if (DRY_RUN) {
		console.log("\n*** DRY RUN MODE - No files will be modified ***\n");
	}

	// Check for shallow clone
	const shallowFile = path.join(GROVE_ROOT, ".git/shallow");
	if (fs.existsSync(shallowFile)) {
		console.log("\n⚠️  Shallow clone detected - fetching full history...");
		exec("git fetch --unshallow origin");
		console.log("   Done.\n");
	}

	// Parse CSV
	console.log("[1/3] Loading history.csv...");
	const { header, rows } = parseCSV();
	console.log(`      Found ${rows.length} versions to process`);

	// Backup CSV
	if (!DRY_RUN) {
		console.log("\n[2/3] Creating backup...");
		fs.copyFileSync(HISTORY_CSV_PATH, BACKUP_PATH);
		console.log(`      Backup: ${BACKUP_PATH}`);
	} else {
		console.log("\n[2/3] Skipping backup (dry run)");
	}

	// Process each version
	console.log("\n[3/3] Processing versions (using git show, no checkout)...");
	const updates: Array<{
		label: string;
		oldValue: number;
		newValue: number;
	}> = [];

	for (let i = 0; i < rows.length; i++) {
		const row = rows[i];
		const progress = `[${i + 1}/${rows.length}]`;

		process.stdout.write(`      ${progress} ${row.label} (${row.gitHash})... `);

		if (!isValidGitHash(row.gitHash)) {
			console.log("SKIP (invalid hash)");
			continue;
		}

		// Count markdown lines at this commit
		const newDocLines = countDocLinesAtCommit(row.gitHash);
		const oldDocLines = parseInt(row.values[row.docLinesIndex], 10) || 0;

		if (newDocLines === 0) {
			console.log(`SKIP (no files found or error)`);
			continue;
		}

		if (newDocLines !== oldDocLines) {
			updates.push({
				label: row.label,
				oldValue: oldDocLines,
				newValue: newDocLines,
			});

			if (!DRY_RUN) {
				row.values[row.docLinesIndex] = String(newDocLines);
			}

			const diff = newDocLines - oldDocLines;
			const sign = diff > 0 ? "+" : "";
			console.log(
				`${oldDocLines.toLocaleString()} -> ${newDocLines.toLocaleString()} (${sign}${diff.toLocaleString()})`,
			);
		} else {
			console.log(`${oldDocLines.toLocaleString()} (unchanged)`);
		}
	}

	// Write updated CSV
	if (!DRY_RUN && updates.length > 0) {
		writeCSV(header, rows);
		console.log(`\n      Updated: ${HISTORY_CSV_PATH}`);
	}

	// Summary
	console.log("\n" + "=".repeat(70));
	console.log("SUMMARY");
	console.log("=".repeat(70));
	console.log(`\nVersions processed: ${rows.length}`);
	console.log(`Values updated: ${updates.length}`);

	if (updates.length > 0) {
		console.log("\nChanges:");
		for (const update of updates.slice(0, 15)) {
			const diff = update.newValue - update.oldValue;
			const sign = diff > 0 ? "+" : "";
			console.log(
				`  ${update.label}: ${update.oldValue.toLocaleString()} -> ${update.newValue.toLocaleString()} (${sign}${diff.toLocaleString()})`,
			);
		}
		if (updates.length > 15) {
			console.log(`  ... and ${updates.length - 15} more`);
		}
	}

	if (DRY_RUN) {
		console.log("\n*** DRY RUN COMPLETE - No files were modified ***");
		console.log("Run without --dry-run to apply changes.\n");
	} else if (updates.length > 0) {
		console.log("\n*** REGENERATION COMPLETE ***");
		console.log(`Backup saved to: ${BACKUP_PATH}\n`);
	} else {
		console.log("\n*** No changes needed - all values are accurate ***\n");
	}
}

main().catch((error) => {
	console.error("\nError:", error.message);
	process.exit(1);
});
