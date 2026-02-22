/**
 * Journey Curio API - Public Snapshots Endpoint
 *
 * GET /api/curios/journey
 * Returns paginated repository snapshots for the current tenant.
 * Public access - used for embedding journey visualizations on public pages.
 */

import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import {
	type LanguageBreakdown,
	safeParseInt,
	DEFAULT_SNAPSHOT_LIMIT,
	MAX_SNAPSHOT_LIMIT,
} from "$lib/curios/journey";
import { safeParseJson } from "$lib/utils/json";
import { API_ERRORS, throwGroveError } from "$lib/errors";

interface JourneyConfigRow {
	enabled: number;
}

interface JourneySnapshotRow {
	id: string;
	tenant_id: string;
	snapshot_date: string;
	label: string;
	git_hash: string;
	total_lines: number;
	language_breakdown: string | null;
	doc_lines: number;
	total_files: number;
	directories: number;
	total_commits: number;
	commits_since_last: number;
	test_files: number;
	test_lines: number;
	estimated_tokens: number;
	bundle_size_kb: number;
	ingestion_source: string;
	created_at: number;
}

export const GET: RequestHandler = async ({ url, platform, locals }) => {
	const db = platform?.env?.CURIO_DB;
	const tenantId = locals.tenantId;

	if (!db) {
		throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
	}

	if (!tenantId) {
		throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
	}

	// Check if journey is enabled for this tenant
	const config = await db
		.prepare(`SELECT enabled FROM journey_curio_config WHERE tenant_id = ?`)
		.bind(tenantId)
		.first<JourneyConfigRow>();

	if (!config?.enabled) {
		throwGroveError(404, API_ERRORS.FEATURE_DISABLED, "API");
	}

	// Parse query params with safe defaults for invalid values
	const limit = safeParseInt(
		url.searchParams.get("limit"),
		DEFAULT_SNAPSHOT_LIMIT,
		1,
		MAX_SNAPSHOT_LIMIT,
	);
	const offset = safeParseInt(url.searchParams.get("offset"), 0, 0);

	// Query snapshots
	const results = await db
		.prepare(
			`SELECT
        id,
        tenant_id,
        snapshot_date,
        label,
        git_hash,
        total_lines,
        language_breakdown,
        doc_lines,
        total_files,
        directories,
        total_commits,
        commits_since_last,
        test_files,
        test_lines,
        estimated_tokens,
        bundle_size_kb,
        ingestion_source,
        created_at
      FROM journey_snapshots
      WHERE tenant_id = ?
      ORDER BY snapshot_date DESC
      LIMIT ? OFFSET ?`,
		)
		.bind(tenantId, limit, offset)
		.all<JourneySnapshotRow>();

	// Get total count for pagination
	const countResult = await db
		.prepare(`SELECT COUNT(*) as count FROM journey_snapshots WHERE tenant_id = ?`)
		.bind(tenantId)
		.first<{ count: number }>();

	// Transform results to camelCase
	const snapshots = (results.results ?? []).map((row) => ({
		id: row.id,
		tenantId: row.tenant_id,
		snapshotDate: row.snapshot_date,
		label: row.label,
		gitHash: row.git_hash,
		totalLines: row.total_lines,
		languageBreakdown: safeParseJson<LanguageBreakdown>(row.language_breakdown, {}),
		docLines: row.doc_lines,
		totalFiles: row.total_files,
		directories: row.directories,
		totalCommits: row.total_commits,
		commitsSinceLast: row.commits_since_last,
		testFiles: row.test_files,
		testLines: row.test_lines,
		estimatedTokens: row.estimated_tokens,
		bundleSizeKb: row.bundle_size_kb,
		ingestionSource: row.ingestion_source,
		createdAt: row.created_at,
	}));

	return json({
		snapshots,
		pagination: {
			total: countResult?.count ?? 0,
			limit,
			offset,
			hasMore: offset + snapshots.length < (countResult?.count ?? 0),
		},
	});
};
