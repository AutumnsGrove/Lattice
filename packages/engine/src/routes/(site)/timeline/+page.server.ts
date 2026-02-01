/**
 * Timeline Public Route - Server
 *
 * Loads timeline summaries and activity data for the public timeline page.
 * Requires Timeline Curio to be enabled for the current tenant.
 */

import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

interface SummaryRow {
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
}

interface ActivityRow {
  activity_date: string;
  commit_count: number;
}

interface ConfigRow {
  enabled: number;
  github_username: string;
  owner_name: string | null;
}

export const load: PageServerLoad = async ({ url, platform, locals }) => {
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
    .prepare(
      `SELECT enabled, github_username, owner_name
       FROM timeline_curio_config
       WHERE tenant_id = ?`,
    )
    .bind(tenantId)
    .first<ConfigRow>();

  if (!config?.enabled) {
    throw error(404, "Timeline is not enabled for this site");
  }

  // Pagination params
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "30"), 100);
  const offset = parseInt(url.searchParams.get("offset") ?? "0");

  // Run all three queries in parallel (300-600ms savings vs sequential)
  // Wrap in try-catch to provide graceful error handling
  let summariesResult: D1Result<SummaryRow>;
  let countResult: { total: number } | null;
  let activityResult: D1Result<ActivityRow>;

  try {
    [summariesResult, countResult, activityResult] = await Promise.all([
      // Fetch summaries
      db
        .prepare(
          `SELECT
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
            focus_streak
          FROM timeline_summaries
          WHERE tenant_id = ? AND summary_date IS NOT NULL
          ORDER BY summary_date DESC
          LIMIT ? OFFSET ?`,
        )
        .bind(tenantId, limit, offset)
        .all<SummaryRow>(),

      // Get total count
      db
        .prepare(
          `SELECT COUNT(*) as total FROM timeline_summaries WHERE tenant_id = ? AND summary_date IS NOT NULL`,
        )
        .bind(tenantId)
        .first<{ total: number }>(),

      // Fetch activity data for heatmap (last 365 days)
      db
        .prepare(
          `SELECT activity_date, commit_count
           FROM timeline_activity
           WHERE tenant_id = ?
             AND activity_date >= date('now', '-365 days')
           ORDER BY activity_date ASC`,
        )
        .bind(tenantId)
        .all<ActivityRow>(),
    ]);
  } catch (err) {
    console.error("[Timeline] Query failed:", err);
    throw error(500, "Failed to load timeline data");
  }

  const total = countResult?.total ?? 0;

  // Transform summaries
  const summaries = summariesResult.results.map((row) => ({
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

  const activity = activityResult.results.map((row) => ({
    date: row.activity_date,
    commits: row.commit_count,
  }));

  return {
    summaries,
    activity,
    pagination: {
      limit,
      offset,
      total,
      hasMore: offset + summaries.length < total,
    },
    config: {
      githubUsername: config.github_username,
      ownerName: config.owner_name,
    },
  };
};
