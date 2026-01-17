/**
 * Journey Curio API - Milestones Endpoint
 *
 * GET /api/curios/journey/milestones
 * Returns paginated version milestones with AI-generated summaries.
 * Public access - used for embedding milestone cards on public pages.
 */

import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import type { JourneySummaryStats } from "$lib/curios/journey";

interface MilestoneRow {
  id: string;
  tenant_id: string;
  snapshot_id: string;
  version: string;
  summary_date: string;
  summary: string;
  highlights_features: string | null;
  highlights_fixes: string | null;
  stats: string | null;
  ai_model: string;
  ai_cost_usd: number;
  created_at: number;
}

export const GET: RequestHandler = async ({ url, platform, locals }) => {
  const db = platform?.env?.DB;
  const tenantId = locals.tenantId;

  if (!db) {
    throw error(503, "Database not configured");
  }

  if (!tenantId) {
    throw error(400, "Tenant context required");
  }

  // Check if journey is enabled for this tenant
  const config = await db
    .prepare(
      `SELECT enabled, show_milestones FROM journey_curio_config WHERE tenant_id = ?`,
    )
    .bind(tenantId)
    .first();

  if (!config?.enabled) {
    throw error(404, "Journey not enabled for this site");
  }

  if (!config?.show_milestones) {
    throw error(404, "Milestones are disabled for this site");
  }

  // Parse query params
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "10"), 50);
  const offset = parseInt(url.searchParams.get("offset") ?? "0");

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
        stats,
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
    highlightsFeatures: row.highlights_features
      ? (JSON.parse(row.highlights_features) as string[])
      : [],
    highlightsFixes: row.highlights_fixes
      ? (JSON.parse(row.highlights_fixes) as string[])
      : [],
    stats: row.stats
      ? (JSON.parse(row.stats) as JourneySummaryStats)
      : null,
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
