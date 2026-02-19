#!/usr/bin/env npx tsx
/**
 * Backfill Job Index Script
 *
 * This script backfills the worker's D1 job_index table from existing jobs.
 * It reads job IDs from a JSON file and calls the worker's /api/backfill endpoint.
 *
 * Usage:
 *   # First, get job IDs from domains app D1
 *   wrangler d1 execute grove-domains --command "SELECT id FROM domain_search_jobs" --json > jobs.json
 *
 *   # Then run this script
 *   npx tsx scripts/backfill-index.ts jobs.json
 *
 * Or call the backfill endpoint directly:
 *   curl -X POST "https://grove-domain-tool.m7jv4v7npb.workers.dev/api/backfill" \
 *     -H "Content-Type: application/json" \
 *     -d '{"job_ids": ["uuid1", "uuid2", ...]}'
 */

const WORKER_URL = process.env.WORKER_URL || "https://grove-domain-tool.m7jv4v7npb.workers.dev";

interface Job {
	id: string;
}

interface BackfillResponse {
	success: boolean;
	backfilled: number;
	failed: number;
	total: number;
}

async function main() {
	console.log("Backfill Job Index");
	console.log("==================");
	console.log(`Worker URL: ${WORKER_URL}`);
	console.log("");

	// Read jobs from a file
	const fs = await import("fs");
	const jobsFile = process.argv[2] || "jobs.json";

	if (!fs.existsSync(jobsFile)) {
		console.log("Usage: npx tsx scripts/backfill-index.ts [jobs.json]");
		console.log("");
		console.log("First export jobs from domains D1:");
		console.log(
			'  wrangler d1 execute grove-domains --command "SELECT id FROM domain_search_jobs" --json > jobs.json',
		);
		process.exit(1);
	}

	const data = JSON.parse(fs.readFileSync(jobsFile, "utf-8"));
	const jobs: Job[] = data[0]?.results || data.results || data;
	const jobIds = jobs.map((j) => j.id);

	console.log(`Found ${jobIds.length} jobs to backfill`);
	console.log("");

	// Call backfill endpoint in batches of 100
	const batchSize = 100;
	let totalSuccess = 0;
	let totalFailed = 0;

	for (let i = 0; i < jobIds.length; i += batchSize) {
		const batch = jobIds.slice(i, i + batchSize);
		console.log(`Processing batch ${Math.floor(i / batchSize) + 1}...`);

		try {
			const response = await fetch(`${WORKER_URL}/api/backfill`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ job_ids: batch }),
			});

			if (!response.ok) {
				console.error(`  Batch failed: ${response.status}`);
				totalFailed += batch.length;
				continue;
			}

			const result = (await response.json()) as BackfillResponse;
			console.log(`  Backfilled: ${result.backfilled}, Failed: ${result.failed}`);
			totalSuccess += result.backfilled;
			totalFailed += result.failed;
		} catch (err) {
			console.error(`  Batch error:`, err);
			totalFailed += batch.length;
		}
	}

	console.log("");
	console.log(`Done: ${totalSuccess} backfilled, ${totalFailed} failed`);
}

main().catch(console.error);
