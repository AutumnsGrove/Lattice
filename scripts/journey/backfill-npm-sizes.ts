#!/usr/bin/env npx tsx
/**
 * Backfill NPM Package Sizes from Registry
 *
 * For each version in history.csv, this script:
 * 1. Fetches the NPM registry metadata for @autumnsgrove/lattice
 * 2. Extracts the unpackedSize (bytes) for each version
 * 3. Adds/updates the npm_unpacked_size column in history.csv
 *
 * The unpacked size is what NPM reports as the package size - more meaningful
 * to users than "estimated tokens" since it represents actual downloadable code.
 *
 * Usage:
 *   npx tsx scripts/journey/backfill-npm-sizes.ts           # Run the backfill
 *   npx tsx scripts/journey/backfill-npm-sizes.ts --dry-run # Preview changes only
 *   npx tsx scripts/journey/backfill-npm-sizes.ts --no-cache # Force fresh fetch from NPM
 *   npx tsx scripts/journey/backfill-npm-sizes.ts --csv path/to/history.csv  # Custom CSV path
 *
 * CSV Path Resolution:
 *   1. --csv argument (if provided)
 *   2. snapshots/history.csv (CI/workflow location)
 *   3. apps/landing/static/data/history.csv (local dev location)
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as https from "node:https";

// =============================================================================
// Configuration
// =============================================================================

const GROVE_ROOT = path.resolve(import.meta.dirname, "../..");

// Possible CSV locations (in order of preference)
const CSV_PATHS = [
	path.join(GROVE_ROOT, "snapshots/history.csv"), // CI/workflow location
	path.join(GROVE_ROOT, "apps/landing/static/data/history.csv"), // Local dev location
];

const NPM_PACKAGE_NAME = "@autumnsgrove/lattice";
const NPM_REGISTRY_URL = `https://registry.npmjs.org/${NPM_PACKAGE_NAME}`;
const NPM_CACHE_PATH = path.join(GROVE_ROOT, "scripts/journey/npm-metadata.json");

// =============================================================================
// CLI Arguments
// =============================================================================

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run") || args.includes("-n");
const VERBOSE = args.includes("--verbose") || args.includes("-v");
const NO_CACHE = args.includes("--no-cache");

// Allow custom CSV path via --csv argument
const csvArgIndex = args.findIndex((a) => a === "--csv");
const CUSTOM_CSV_PATH = csvArgIndex !== -1 ? args[csvArgIndex + 1] : null;

// Find the CSV path to use
function findHistoryCSV(): string {
	if (CUSTOM_CSV_PATH) {
		if (!fs.existsSync(CUSTOM_CSV_PATH)) {
			throw new Error(`Custom CSV path not found: ${CUSTOM_CSV_PATH}`);
		}
		return CUSTOM_CSV_PATH;
	}

	for (const csvPath of CSV_PATHS) {
		if (fs.existsSync(csvPath)) {
			return csvPath;
		}
	}

	throw new Error(`No history.csv found. Checked:\n  - ${CSV_PATHS.join("\n  - ")}`);
}

const HISTORY_CSV_PATH = findHistoryCSV();
const BACKUP_PATH = HISTORY_CSV_PATH + ".backup";

// =============================================================================
// NPM Registry Types
// =============================================================================

interface NPMVersion {
	name: string;
	version: string;
	dist: {
		tarball: string;
		shasum: string;
		integrity?: string;
		unpackedSize?: number;
		fileCount?: number;
	};
}

interface NPMPackageMetadata {
	name: string;
	versions: Record<string, NPMVersion>;
	"dist-tags": Record<string, string>;
}

// =============================================================================
// Utility Functions
// =============================================================================

function fetchNPMMetadata(): Promise<NPMPackageMetadata> {
	// Try loading from local cache first (useful if network is unavailable)
	// Cache can be created with: curl -s "https://registry.npmjs.org/@autumnsgrove/lattice" > scripts/journey/npm-metadata.json
	// Use --no-cache to force a fresh fetch
	if (!NO_CACHE && fs.existsSync(NPM_CACHE_PATH)) {
		console.log(`      Loading from cache: ${NPM_CACHE_PATH}`);
		console.log(`      (use --no-cache to force fresh fetch)`);
		const cacheData = fs.readFileSync(NPM_CACHE_PATH, "utf-8");
		return Promise.resolve(JSON.parse(cacheData) as NPMPackageMetadata);
	}

	if (NO_CACHE && fs.existsSync(NPM_CACHE_PATH)) {
		console.log(`      Removing stale cache...`);
		fs.unlinkSync(NPM_CACHE_PATH);
	}

	console.log(`      Fetching: ${NPM_REGISTRY_URL}`);

	return new Promise((resolve, reject) => {
		https
			.get(NPM_REGISTRY_URL, { headers: { Accept: "application/json" } }, (res) => {
				if (res.statusCode !== 200) {
					reject(new Error(`NPM registry returned ${res.statusCode}: ${res.statusMessage}`));
					return;
				}

				let data = "";
				res.on("data", (chunk) => {
					data += chunk;
				});
				res.on("end", () => {
					try {
						const parsed = JSON.parse(data) as NPMPackageMetadata;
						// Cache for future use
						fs.writeFileSync(NPM_CACHE_PATH, data);
						resolve(parsed);
					} catch (e) {
						reject(new Error(`Failed to parse NPM response: ${e}`));
					}
				});
			})
			.on("error", reject);
	});
}

function extractVersionFromLabel(label: string): string {
	// Convert "v0.1.0" to "0.1.0"
	return label.startsWith("v") ? label.slice(1) : label;
}

function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// =============================================================================
// CSV Operations
// =============================================================================

interface CSVRow {
	values: string[];
	label: string;
}

function parseCSV(): { header: string; headerCols: string[]; rows: CSVRow[] } {
	const content = fs.readFileSync(HISTORY_CSV_PATH, "utf-8");
	const lines = content.trim().split("\n");

	const header = lines[0];
	const headerCols = header.split(",");

	const rows: CSVRow[] = [];
	for (let i = 1; i < lines.length; i++) {
		const values = lines[i].split(",");
		if (values.length >= 2) {
			rows.push({
				values,
				label: values[1], // label is column 1 (0-indexed)
			});
		}
	}

	return { header, headerCols, rows };
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
	console.log("BACKFILL NPM PACKAGE SIZES FROM REGISTRY");
	console.log("=".repeat(70));

	if (DRY_RUN) {
		console.log("\n*** DRY RUN MODE - No files will be modified ***\n");
	}

	// Fetch NPM metadata
	console.log("\n[1/4] Fetching NPM registry metadata...");
	const npmData = await fetchNPMMetadata();
	const availableVersions = Object.keys(npmData.versions);
	console.log(`      Found ${availableVersions.length} published versions`);

	if (VERBOSE) {
		console.log(`      Versions: ${availableVersions.join(", ")}`);
	}

	// Parse CSV
	console.log("\n[2/4] Loading history.csv...");
	const csvData = parseCSV();
	let header = csvData.header;
	const { headerCols, rows } = csvData;
	console.log(`      Found ${rows.length} versions in CSV`);

	// Check if npm_unpacked_size column exists
	let sizeColIndex = headerCols.indexOf("npm_unpacked_size");
	const columnExists = sizeColIndex !== -1;

	if (!columnExists) {
		console.log("      Column 'npm_unpacked_size' not found - will add it");
		sizeColIndex = headerCols.length;
		header = header + ",npm_unpacked_size";
		headerCols.push("npm_unpacked_size");

		// Add empty values to all existing rows
		for (const row of rows) {
			row.values.push("0");
		}
	} else {
		console.log(`      Column 'npm_unpacked_size' exists at index ${sizeColIndex}`);
	}

	// Backup CSV
	if (!DRY_RUN) {
		console.log("\n[3/4] Creating backup...");
		fs.copyFileSync(HISTORY_CSV_PATH, BACKUP_PATH);
		console.log(`      Backup: ${BACKUP_PATH}`);
	} else {
		console.log("\n[3/4] Skipping backup (dry run)");
	}

	// Process each version
	console.log("\n[4/4] Processing versions...");
	const updates: Array<{
		label: string;
		oldValue: number;
		newValue: number;
		formatted: string;
	}> = [];
	let notFound = 0;

	for (let i = 0; i < rows.length; i++) {
		const row = rows[i];
		const progress = `[${i + 1}/${rows.length}]`;
		const npmVersion = extractVersionFromLabel(row.label);

		process.stdout.write(`      ${progress} ${row.label} -> ${npmVersion}... `);

		const versionData = npmData.versions[npmVersion];

		if (!versionData) {
			console.log("NOT FOUND in registry");
			notFound++;
			continue;
		}

		const unpackedSize = versionData.dist.unpackedSize || 0;
		const oldValue = parseInt(row.values[sizeColIndex], 10) || 0;

		if (unpackedSize !== oldValue) {
			updates.push({
				label: row.label,
				oldValue,
				newValue: unpackedSize,
				formatted: formatBytes(unpackedSize),
			});

			if (!DRY_RUN) {
				row.values[sizeColIndex] = String(unpackedSize);
			}

			console.log(`${formatBytes(unpackedSize)} (${unpackedSize.toLocaleString()} bytes)`);
		} else {
			console.log(`${formatBytes(unpackedSize)} (unchanged)`);
		}
	}

	// Write updated CSV
	if (!DRY_RUN && (updates.length > 0 || !columnExists)) {
		writeCSV(header, rows);
		console.log(`\n      Updated: ${HISTORY_CSV_PATH}`);
	}

	// Summary
	console.log("\n" + "=".repeat(70));
	console.log("SUMMARY");
	console.log("=".repeat(70));
	console.log(`\nVersions in CSV: ${rows.length}`);
	console.log(`Found in NPM: ${rows.length - notFound}`);
	console.log(`Not found in NPM: ${notFound}`);
	console.log(`Values updated: ${updates.length}`);

	if (updates.length > 0) {
		console.log("\nChanges:");
		for (const update of updates.slice(0, 20)) {
			const displayOld = update.oldValue === 0 ? "(new)" : formatBytes(update.oldValue);
			console.log(`  ${update.label}: ${displayOld} -> ${update.formatted}`);
		}
		if (updates.length > 20) {
			console.log(`  ... and ${updates.length - 20} more`);
		}
	}

	if (notFound > 0) {
		console.log("\nVersions not in NPM registry (may be unpublished or pre-release):");
		for (const row of rows) {
			const npmVersion = extractVersionFromLabel(row.label);
			if (!npmData.versions[npmVersion]) {
				console.log(`  ${row.label}`);
			}
		}
	}

	if (DRY_RUN) {
		console.log("\n*** DRY RUN COMPLETE - No files were modified ***");
		console.log("Run without --dry-run to apply changes.\n");
	} else if (updates.length > 0 || !columnExists) {
		console.log("\n*** BACKFILL COMPLETE ***");
		console.log(`Backup saved to: ${BACKUP_PATH}\n`);
	} else {
		console.log("\n*** No changes needed - all values are accurate ***\n");
	}
}

main().catch((error) => {
	console.error("\nError:", error.message);
	if (VERBOSE && error.stack) {
		console.error(error.stack);
	}
	process.exit(1);
});
