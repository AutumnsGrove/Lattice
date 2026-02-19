/**
 * Pulse Curio API — Aggregated Stats Endpoint
 *
 * GET /api/curios/pulse/stats — Fetch aggregated stats for charts
 *
 * Query params:
 *   days — Number of days of daily stats (default 30, max 90)
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { API_ERRORS, throwGroveError } from "$lib/errors";

interface DailyStatsRow {
  date: string;
  repo_name: string | null;
  commits: number;
  lines_added: number;
  lines_removed: number;
  files_changed: number;
  prs_opened: number;
  prs_merged: number;
  prs_closed: number;
  issues_opened: number;
  issues_closed: number;
  releases: number;
  ci_passes: number;
  ci_failures: number;
  stars_total: number | null;
  forks_total: number | null;
}

interface HourlyRow {
  date: string;
  hour: number;
  commits: number;
  events: number;
}

export const GET: RequestHandler = async ({ url, platform, locals }) => {
  const db = platform?.env?.DB;
  const tenantId = locals.tenantId;

  if (!db) throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
  if (!tenantId)
    throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");

  // Check enabled
  const config = await db
    .prepare(
      `SELECT enabled FROM pulse_curio_config WHERE tenant_id = ? AND enabled = 1`,
    )
    .bind(tenantId)
    .first<{ enabled: number }>();

  if (!config) {
    throwGroveError(404, API_ERRORS.FEATURE_DISABLED, "API");
  }

  const rawDays = parseInt(url.searchParams.get("days") ?? "30");
  const days = Math.min(Math.max(isNaN(rawDays) ? 30 : rawDays, 1), 90);

  const [dailyResult, hourlyResult] = await Promise.all([
    db
      .prepare(
        `SELECT date, repo_name, commits, lines_added, lines_removed, files_changed,
                prs_opened, prs_merged, prs_closed, issues_opened, issues_closed,
                releases, ci_passes, ci_failures, stars_total, forks_total
         FROM pulse_daily_stats
         WHERE tenant_id = ? AND date >= date('now', '-' || ? || ' days')
         ORDER BY date ASC`,
      )
      .bind(tenantId, days)
      .all<DailyStatsRow>(),

    db
      .prepare(
        `SELECT date, hour, commits, events
         FROM pulse_hourly_activity
         WHERE tenant_id = ? AND date >= date('now', '-7 days')
         ORDER BY date ASC, hour ASC`,
      )
      .bind(tenantId)
      .all<HourlyRow>(),
  ]);

  const daily = dailyResult.results.map((row) => ({
    date: row.date,
    repoName: row.repo_name,
    commits: row.commits,
    linesAdded: row.lines_added,
    linesRemoved: row.lines_removed,
    filesChanged: row.files_changed,
    prsOpened: row.prs_opened,
    prsMerged: row.prs_merged,
    prsClosed: row.prs_closed,
    issuesOpened: row.issues_opened,
    issuesClosed: row.issues_closed,
    releases: row.releases,
    ciPasses: row.ci_passes,
    ciFailures: row.ci_failures,
    starsTotal: row.stars_total,
    forksTotal: row.forks_total,
  }));

  const hourly = hourlyResult.results.map((row) => ({
    date: row.date,
    hour: row.hour,
    commits: row.commits,
    events: row.events,
  }));

  return json(
    { daily, hourly },
    {
      headers: {
        "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
      },
    },
  );
};
