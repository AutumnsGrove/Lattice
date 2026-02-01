/**
 * Timeline Curio API - Public Summaries Endpoint
 *
 * GET /api/curios/timeline
 * Returns paginated timeline summaries for the current tenant.
 * Public access - used for embedding timeline on public pages.
 */

import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

interface TimelineSummaryRow {
  id: string;
  summary_date: string;
  brief_summary: string | null;
  detailed_timeline: string | null;
  gutter_content: string | null;
  commit_count: number;
  repos_active: string | null;
  total_additions: number;
  total_deletions: number;
  detected_focus: string | null;
  focus_streak: number | null;
  voice_preset: string | null;
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

  // Check if timeline is enabled for this tenant
  const config = await db
    .prepare(`SELECT enabled FROM timeline_curio_config WHERE tenant_id = ?`)
    .bind(tenantId)
    .first();

  if (!config?.enabled) {
    throw error(404, "Timeline not enabled for this site");
  }

  // Parse query params
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "30"), 100);
  const offset = parseInt(url.searchParams.get("offset") ?? "0");
  const startDate = url.searchParams.get("start"); // YYYY-MM-DD
  const endDate = url.searchParams.get("end"); // YYYY-MM-DD

  // Build query with optional date filtering
  let query = `
    SELECT
      id,
      summary_date,
      brief_summary,
      detailed_timeline,
      gutter_content,
      commit_count,
      repos_active,
      total_additions,
      total_deletions,
      detected_focus,
      focus_streak,
      voice_preset,
      created_at
    FROM timeline_summaries
    WHERE tenant_id = ? AND summary_date IS NOT NULL
  `;
  const params: (string | number)[] = [tenantId];

  if (startDate) {
    query += ` AND summary_date >= ?`;
    params.push(startDate);
  }
  if (endDate) {
    query += ` AND summary_date <= ?`;
    params.push(endDate);
  }

  query += ` ORDER BY summary_date DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const results = await db
    .prepare(query)
    .bind(...params)
    .all<TimelineSummaryRow>();

  // Get total count for pagination
  let countQuery = `SELECT COUNT(*) as count FROM timeline_summaries WHERE tenant_id = ? AND summary_date IS NOT NULL`;
  const countParams: (string | number)[] = [tenantId];

  if (startDate) {
    countQuery += ` AND summary_date >= ?`;
    countParams.push(startDate);
  }
  if (endDate) {
    countQuery += ` AND summary_date <= ?`;
    countParams.push(endDate);
  }

  const countResult = await db
    .prepare(countQuery)
    .bind(...countParams)
    .first<{ count: number }>();

  // Transform results
  const summaries = results.results.map((row) => ({
    id: row.id,
    summary_date: row.summary_date,
    brief_summary: row.brief_summary,
    detailed_timeline: row.detailed_timeline,
    gutter_content: row.gutter_content ? JSON.parse(row.gutter_content) : null,
    commit_count: row.commit_count,
    repos_active: row.repos_active ? JSON.parse(row.repos_active) : [],
    total_additions: row.total_additions,
    total_deletions: row.total_deletions,
    detected_focus: row.detected_focus ? JSON.parse(row.detected_focus) : null,
    focus_streak: row.focus_streak,
  }));

  return json(
    {
      summaries,
      pagination: {
        total: countResult?.count ?? 0,
        limit,
        offset,
        hasMore: offset + summaries.length < (countResult?.count ?? 0),
      },
    },
    {
      headers: {
        // Timeline data is less volatile - cache for 5 minutes
        "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
      },
    },
  );
};
