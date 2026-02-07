/**
 * Journey Curio API - Milestones Endpoint
 *
 * GET /api/curios/journey/milestones
 * Returns paginated version milestones with AI-generated summaries.
 * Public access - used for embedding milestone cards on public pages.
 */

import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import {
  safeParseInt,
  DEFAULT_MILESTONE_LIMIT,
  MAX_MILESTONE_LIMIT,
} from "$lib/curios/journey";
import { safeParseJson } from "$lib/utils/json";
import { API_ERRORS, throwGroveError } from "$lib/errors";

interface MilestoneRow {
  id: string;
  tenant_id: string;
  snapshot_id: string;
  version: string;
  summary_date: string;
  summary: string;
  highlights_features: string | null;
  highlights_fixes: string | null;
  stats_commits: number | null;
  stats_features: number | null;
  stats_fixes: number | null;
  stats_refactoring: number | null;
  stats_docs: number | null;
  stats_tests: number | null;
  stats_performance: number | null;
  ai_model: string;
  ai_cost_usd: number;
  created_at: number;
}

export const GET: RequestHandler = async ({ url, platform, locals }) => {
  const db = platform?.env?.DB;
  const tenantId = locals.tenantId;

  if (!db) {
    throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
  }

  if (!tenantId) {
    throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
  }

  // Check if journey is enabled for this tenant
  const config = await db
    .prepare(
      `SELECT enabled, show_milestones FROM journey_curio_config WHERE tenant_id = ?`,
    )
    .bind(tenantId)
    .first();

  if (!config?.enabled) {
    throwGroveError(404, API_ERRORS.FEATURE_DISABLED, "API");
  }

  if (!config?.show_milestones) {
    throwGroveError(404, API_ERRORS.FEATURE_DISABLED, "API");
  }

  // Parse query params with safe defaults for invalid values
  const limit = safeParseInt(
    url.searchParams.get("limit"),
    DEFAULT_MILESTONE_LIMIT,
    1,
    MAX_MILESTONE_LIMIT,
  );
  const offset = safeParseInt(url.searchParams.get("offset"), 0, 0);

  // Query milestones with summaries
  const results = await db
    .prepare(
      `SELECT
        id,
        tenant_id,
        snapshot_id,
        version,
        summary_date,
        summary,
        highlights_features,
        highlights_fixes,
        stats_commits,
        stats_features,
        stats_fixes,
        stats_refactoring,
        stats_docs,
        stats_tests,
        stats_performance,
        ai_model,
        ai_cost_usd,
        created_at
      FROM journey_summaries
      WHERE tenant_id = ?
      ORDER BY summary_date DESC
      LIMIT ? OFFSET ?`,
    )
    .bind(tenantId, limit, offset)
    .all<MilestoneRow>();

  // Get total count for pagination
  const countResult = await db
    .prepare(
      `SELECT COUNT(*) as count FROM journey_summaries WHERE tenant_id = ?`,
    )
    .bind(tenantId)
    .first<{ count: number }>();

  // Transform results to camelCase
  const milestones = results.results.map((row) => ({
    id: row.id,
    tenantId: row.tenant_id,
    snapshotId: row.snapshot_id,
    version: row.version,
    summaryDate: row.summary_date,
    summary: row.summary,
    highlightsFeatures: safeParseJson<string[]>(row.highlights_features, []),
    highlightsFixes: safeParseJson<string[]>(row.highlights_fixes, []),
    stats: {
      commits: row.stats_commits ?? 0,
      features: row.stats_features ?? 0,
      fixes: row.stats_fixes ?? 0,
      refactoring: row.stats_refactoring ?? 0,
      docs: row.stats_docs ?? 0,
      tests: row.stats_tests ?? 0,
      performance: row.stats_performance ?? 0,
    },
    aiModel: row.ai_model,
    aiCostUsd: row.ai_cost_usd,
    createdAt: row.created_at,
  }));

  return json({
    milestones,
    pagination: {
      total: countResult?.count ?? 0,
      limit,
      offset,
      hasMore: offset + milestones.length < (countResult?.count ?? 0),
    },
  });
};
