#!/usr/bin/env npx tsx
/**
 * Journey Curio Backfill Script
 *
 * Transforms existing history.csv snapshots and summaries into the standardized
 * JourneySnapshot format for the Journey Curio database.
 *
 * Usage:
 *   npx tsx scripts/journey/backfill-snapshots.ts           # Run the backfill
 *   npx tsx scripts/journey/backfill-snapshots.ts --dry-run # Preview changes only
 *
 * Transformations:
 *   - Renames total_code_lines -> total_lines
 *   - Uses doc_lines (drops doc_words from output schema)
 *   - Creates language_breakdown JSON from individual language columns
 *   - Generates unique IDs for database records
 *   - Merges summary data where available
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";

// =============================================================================
// Configuration
// =============================================================================

const GROVE_ROOT = path.resolve(import.meta.dirname, "../..");
const HISTORY_CSV_PATH = path.join(GROVE_ROOT, "apps/landing/static/data/history.csv");
const SUMMARIES_DIR = path.join(GROVE_ROOT, "apps/landing/static/data/summaries");
const OUTPUT_DIR = path.join(GROVE_ROOT, "scripts/journey/output");

// =============================================================================
// Types
// =============================================================================

/**
 * Raw CSV row structure (matches history.csv columns)
 */
interface RawCSVRow {
	timestamp: string;
	label: string;
	git_hash: string;
	total_code_lines: number;
	svelte_lines: number;
	ts_lines: number;
	js_lines: number;
	css_lines: number;
	doc_words: number;
	doc_lines: number;
	total_files: number;
	directories: number;
	estimated_tokens: number;
	commits: number;
	test_files: number;
	test_lines: number;
	bundle_size_kb: number;
	npm_unpacked_size: number;
	py_lines: number;
	go_lines: number;
	sql_lines: number;
	sh_lines: number;
	tsx_lines: number;
}

/**
 * Version summary from JSON files
 */
interface VersionSummary {
	version: string;
	date: string;
	commitHash: string;
	summary: string;
	stats: {
		totalCommits: number;
		features: number;
		fixes: number;
		refactoring: number;
		docs: number;
		tests: number;
		performance: number;
	};
	highlights: {
		features: string[];
		fixes: string[];
	};
}

/**
 * Language breakdown for code composition
 */
interface LanguageBreakdown {
	svelte: number;
	typescript: number;
	javascript: number;
	css: number;
	python: number;
	go: number;
	sql: number;
	shell: number;
	tsx: number;
}

/**
 * Standardized JourneySnapshot for the Journey Curio
 */
interface JourneySnapshot {
	id: string;
	timestamp: string; // ISO 8601 format
	label: string; // Version label (e.g., "v0.9.80")
	git_hash: string;

	// Code metrics (standardized names)
	total_lines: number; // Renamed from total_code_lines
	doc_lines: number; // Documentation metric (not doc_words)
	total_files: number;
	directories: number;
	estimated_tokens: number;

	// Language breakdown as JSON
	language_breakdown: LanguageBreakdown;

	// Git metrics
	commits: number;

	// Test metrics
	test_files: number;
	test_lines: number;

	// Build metrics
	bundle_size_kb: number;

	// Derived date fields
	snapshot_date: string; // YYYY-MM-DD format

	// Optional summary data (if available)
	summary?: {
		text: string;
		stats: VersionSummary["stats"];
		highlights: VersionSummary["highlights"];
	};
}

/**
 * Transformation result for audit logging
 */
interface TransformationResult {
	success: boolean;
	snapshot?: JourneySnapshot;
	issues: string[];
}

// =============================================================================
// CLI Argument Parsing
// =============================================================================

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run") || args.includes("-n");

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Generate a deterministic ID from snapshot data
 * Uses timestamp + label + git_hash to ensure idempotency
 */
function generateSnapshotId(timestamp: string, label: string, gitHash: string): string {
	const input = `${timestamp}:${label}:${gitHash}`;
	return crypto.createHash("sha256").update(input).digest("hex").slice(0, 16);
}

/**
 * Parse CSV timestamp to ISO 8601 format
 * Input: "2026-01-17_13-14-06"
 * Output: "2026-01-17T13:14:06Z"
 */
function parseTimestamp(timestamp: string): {
	iso: string;
	date: string;
} {
	if (!timestamp || !timestamp.includes("_")) {
		return { iso: new Date().toISOString(), date: "unknown" };
	}

	const [datePart, timePart] = timestamp.split("_");

	if (!timePart) {
		return { iso: `${datePart}T00:00:00Z`, date: datePart };
	}

	const [hours, minutes, seconds] = timePart.split("-");
	const isoTime = `${hours}:${minutes}:${seconds || "00"}`;

	return {
		iso: `${datePart}T${isoTime}Z`,
		date: datePart,
	};
}

/**
 * Safely parse an integer from a string value
 */
function safeParseInt(value: string | undefined): number {
	if (!value || value.trim() === "") return 0;
	const parsed = parseInt(value.trim(), 10);
	return isNaN(parsed) ? 0 : parsed;
}

// =============================================================================
// Data Loading Functions
// =============================================================================

/**
 * Parse the history.csv file into raw row objects
 */
function loadCSV(): RawCSVRow[] {
	console.log("\n[1/4] Loading CSV data...");
	console.log(`      Source: ${HISTORY_CSV_PATH}`);

	if (!fs.existsSync(HISTORY_CSV_PATH)) {
		console.error(`      ERROR: CSV file not found at ${HISTORY_CSV_PATH}`);
		process.exit(1);
	}

	const content = fs.readFileSync(HISTORY_CSV_PATH, "utf-8");
	const lines = content.trim().split("\n");

	if (lines.length < 2) {
		console.error("      ERROR: CSV has no data rows");
		process.exit(1);
	}

	// Skip header row
	const dataLines = lines.slice(1).filter((line) => line.trim());
	const rows: RawCSVRow[] = [];

	for (let i = 0; i < dataLines.length; i++) {
		const values = dataLines[i].split(",");

		if (values.length !== 23) {
			console.warn(
				`      WARNING: Skipping line ${i + 2}: expected 23 columns, got ${values.length}`,
			);
			continue;
		}

		rows.push({
			timestamp: values[0],
			label: values[1],
			git_hash: values[2],
			total_code_lines: safeParseInt(values[3]),
			svelte_lines: safeParseInt(values[4]),
			ts_lines: safeParseInt(values[5]),
			js_lines: safeParseInt(values[6]),
			css_lines: safeParseInt(values[7]),
			doc_words: safeParseInt(values[8]),
			doc_lines: safeParseInt(values[9]),
			total_files: safeParseInt(values[10]),
			directories: safeParseInt(values[11]),
			estimated_tokens: safeParseInt(values[12]),
			commits: safeParseInt(values[13]),
			test_files: safeParseInt(values[14]),
			test_lines: safeParseInt(values[15]),
			bundle_size_kb: safeParseInt(values[16]),
			npm_unpacked_size: safeParseInt(values[17]),
			py_lines: safeParseInt(values[18]),
			go_lines: safeParseInt(values[19]),
			sql_lines: safeParseInt(values[20]),
			sh_lines: safeParseInt(values[21]),
			tsx_lines: safeParseInt(values[22]),
		});
	}

	console.log(`      Found ${rows.length} snapshot rows`);
	return rows;
}

/**
 * Load all version summaries from JSON files
 */
function loadSummaries(): Map<string, VersionSummary> {
	console.log("\n[2/4] Loading summaries...");
	console.log(`      Source: ${SUMMARIES_DIR}`);

	const summaries = new Map<string, VersionSummary>();

	if (!fs.existsSync(SUMMARIES_DIR)) {
		console.warn(`      WARNING: Summaries directory not found`);
		return summaries;
	}

	const files = fs.readdirSync(SUMMARIES_DIR).filter((f) => f.endsWith(".json"));

	for (const file of files) {
		try {
			const filePath = path.join(SUMMARIES_DIR, file);
			const content = fs.readFileSync(filePath, "utf-8");
			const summary = JSON.parse(content) as VersionSummary;

			if (summary.version) {
				summaries.set(summary.version, summary);
			}
		} catch (error) {
			console.warn(`      WARNING: Failed to parse ${file}: ${error}`);
		}
	}

	console.log(`      Found ${summaries.size} summary files`);
	return summaries;
}

// =============================================================================
// Transformation Functions
// =============================================================================

/**
 * Transform a raw CSV row into a JourneySnapshot
 */
function transformRow(
	row: RawCSVRow,
	summaries: Map<string, VersionSummary>,
): TransformationResult {
	const issues: string[] = [];

	// Parse timestamp
	const { iso: timestamp, date: snapshotDate } = parseTimestamp(row.timestamp);

	// Generate deterministic ID
	const id = generateSnapshotId(row.timestamp, row.label, row.git_hash);

	// Create language breakdown (all 9 languages)
	const languageBreakdown: LanguageBreakdown = {
		svelte: row.svelte_lines,
		typescript: row.ts_lines,
		javascript: row.js_lines,
		css: row.css_lines,
		python: row.py_lines,
		go: row.go_lines,
		sql: row.sql_lines,
		shell: row.sh_lines,
		tsx: row.tsx_lines,
	};

	// Validate language breakdown sums reasonably
	const languageSum =
		languageBreakdown.svelte +
		languageBreakdown.typescript +
		languageBreakdown.javascript +
		languageBreakdown.css +
		languageBreakdown.python +
		languageBreakdown.go +
		languageBreakdown.sql +
		languageBreakdown.shell +
		languageBreakdown.tsx;

	if (languageSum > row.total_code_lines * 1.1) {
		issues.push(
			`Language breakdown sum (${languageSum}) exceeds total_lines (${row.total_code_lines}) by >10%`,
		);
	}

	// Look up summary if available
	const summary = summaries.get(row.label);

	// Build the snapshot
	const snapshot: JourneySnapshot = {
		id,
		timestamp,
		label: row.label,
		git_hash: row.git_hash,

		// Code metrics (renamed)
		total_lines: row.total_code_lines,
		doc_lines: row.doc_lines, // Using doc_lines directly (not doc_words)
		total_files: row.total_files,
		directories: row.directories,
		estimated_tokens: row.estimated_tokens,

		// Language breakdown
		language_breakdown: languageBreakdown,

		// Git metrics
		commits: row.commits,

		// Test metrics
		test_files: row.test_files,
		test_lines: row.test_lines,

		// Build metrics
		bundle_size_kb: row.bundle_size_kb,

		// Derived fields
		snapshot_date: snapshotDate,
	};

	// Add summary if available
	if (summary) {
		snapshot.summary = {
			text: summary.summary,
			stats: summary.stats,
			highlights: summary.highlights,
		};
	} else {
		issues.push(`No summary found for ${row.label}`);
	}

	return {
		success: true,
		snapshot,
		issues,
	};
}

/**
 * Transform all CSV rows into JourneySnapshots
 */
function transformAllRows(
	rows: RawCSVRow[],
	summaries: Map<string, VersionSummary>,
): { snapshots: JourneySnapshot[]; totalIssues: string[] } {
	console.log("\n[3/4] Transforming data...");

	const snapshots: JourneySnapshot[] = [];
	const totalIssues: string[] = [];
	let withSummary = 0;
	let withoutSummary = 0;

	for (const row of rows) {
		const result = transformRow(row, summaries);

		if (result.success && result.snapshot) {
			snapshots.push(result.snapshot);

			if (result.snapshot.summary) {
				withSummary++;
			} else {
				withoutSummary++;
			}
		}

		if (result.issues.length > 0) {
			for (const issue of result.issues) {
				totalIssues.push(`${row.label}: ${issue}`);
			}
		}
	}

	console.log(`      Transformed ${snapshots.length} snapshots`);
	console.log(`      - With summary: ${withSummary}`);
	console.log(`      - Without summary: ${withoutSummary}`);

	return { snapshots, totalIssues };
}

// =============================================================================
// Output Functions
// =============================================================================

/**
 * Write the transformed snapshots to output files
 */
function writeOutput(snapshots: JourneySnapshot[]): void {
	console.log("\n[4/4] Writing output...");

	if (DRY_RUN) {
		console.log("      DRY RUN - No files will be written\n");
		console.log("      Would write to:");
		console.log(`        - ${OUTPUT_DIR}/snapshots.json`);
		console.log(`        - ${OUTPUT_DIR}/snapshots-formatted.json`);
		return;
	}

	// Create output directory
	if (!fs.existsSync(OUTPUT_DIR)) {
		fs.mkdirSync(OUTPUT_DIR, { recursive: true });
	}

	// Write minified JSON (for programmatic use)
	const minifiedPath = path.join(OUTPUT_DIR, "snapshots.json");
	fs.writeFileSync(minifiedPath, JSON.stringify(snapshots));
	console.log(`      Written: ${minifiedPath}`);

	// Write formatted JSON (for human review)
	const formattedPath = path.join(OUTPUT_DIR, "snapshots-formatted.json");
	fs.writeFileSync(formattedPath, JSON.stringify(snapshots, null, 2));
	console.log(`      Written: ${formattedPath}`);
}

/**
 * Print a summary of the transformation
 */
function printSummary(snapshots: JourneySnapshot[], issues: string[]): void {
	console.log("\n" + "=".repeat(70));
	console.log("TRANSFORMATION SUMMARY");
	console.log("=".repeat(70));

	if (snapshots.length === 0) {
		console.log("\nNo snapshots processed.");
		return;
	}

	const first = snapshots[0];
	const last = snapshots[snapshots.length - 1];

	console.log(`\nSnapshots: ${snapshots.length}`);
	console.log(`  First:   ${first.label} (${first.snapshot_date})`);
	console.log(`  Last:    ${last.label} (${last.snapshot_date})`);

	console.log("\nMetric Ranges:");
	console.log(
		`  total_lines:      ${first.total_lines.toLocaleString()} -> ${last.total_lines.toLocaleString()}`,
	);
	console.log(
		`  doc_lines:        ${first.doc_lines.toLocaleString()} -> ${last.doc_lines.toLocaleString()}`,
	);
	console.log(
		`  commits:          ${first.commits.toLocaleString()} -> ${last.commits.toLocaleString()}`,
	);
	console.log(
		`  total_files:      ${first.total_files.toLocaleString()} -> ${last.total_files.toLocaleString()}`,
	);

	console.log("\nTransformation Notes:");
	console.log("  - total_code_lines renamed to total_lines");
	console.log("  - Using doc_lines (not doc_words) as documentation metric");
	console.log("  - Language columns combined into language_breakdown JSON");
	console.log("  - Deterministic IDs generated from timestamp+label+hash");

	if (issues.length > 0) {
		console.log(`\nIssues Encountered (${issues.length}):`);
		// Only show first 10 issues to avoid flooding console
		const displayIssues = issues.slice(0, 10);
		for (const issue of displayIssues) {
			console.log(`  - ${issue}`);
		}
		if (issues.length > 10) {
			console.log(`  ... and ${issues.length - 10} more`);
		}
	} else {
		console.log("\nNo issues encountered.");
	}

	console.log("\n" + "=".repeat(70));

	if (DRY_RUN) {
		console.log("\nDRY RUN COMPLETE - No files were modified.");
		console.log("Run without --dry-run to write output files.\n");
	} else {
		console.log("\nBACKFILL COMPLETE");
		console.log(`Output written to: ${OUTPUT_DIR}\n`);
	}
}

/**
 * Print sample transformed data for verification
 */
function printSampleData(snapshots: JourneySnapshot[]): void {
	if (snapshots.length === 0) return;

	console.log("\n" + "-".repeat(70));
	console.log("SAMPLE OUTPUT (latest snapshot)");
	console.log("-".repeat(70));

	const sample = snapshots[snapshots.length - 1];
	console.log(JSON.stringify(sample, null, 2));
}

// =============================================================================
// Main Execution
// =============================================================================

function main(): void {
	console.log("=".repeat(70));
	console.log("JOURNEY CURIO BACKFILL SCRIPT");
	console.log("=".repeat(70));

	if (DRY_RUN) {
		console.log("\n*** DRY RUN MODE - No files will be modified ***");
	}

	// Load data
	const csvRows = loadCSV();
	const summaries = loadSummaries();

	// Transform
	const { snapshots, totalIssues } = transformAllRows(csvRows, summaries);

	// Output
	writeOutput(snapshots);
	printSampleData(snapshots);
	printSummary(snapshots, totalIssues);
}

// Run the script
main();
