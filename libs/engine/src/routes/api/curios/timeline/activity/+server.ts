/**
 * Timeline Curio API - Activity Heatmap Endpoint
 *
 * GET /api/curios/timeline/activity
 * Returns activity data for GitHub contribution heatmap visualization.
 * Public access - used for embedding activity charts on public pages.
 */

import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { API_ERRORS, throwGroveError } from "$lib/errors";

interface ActivityRow {
  activity_date: string;
  commit_count: number;
  repos_active: string | null;
  lines_added: number;
  lines_deleted: number;
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

  // Check if timeline is enabled
  const config = await db
    .prepare(`SELECT enabled FROM timeline_curio_config WHERE tenant_id = ?`)
    .bind(tenantId)
    .first();

  if (!config?.enabled) {
    throwGroveError(404, API_ERRORS.FEATURE_DISABLED, "API");
  }

  // Default to last 365 days
  const days = Math.min(parseInt(url.searchParams.get("days") ?? "365"), 365);
  const endDate =
    url.searchParams.get("end") ?? new Date().toISOString().split("T")[0];

  // Calculate start date
  const end = new Date(endDate);
  const start = new Date(end);
  start.setDate(start.getDate() - days);
  const startDate = start.toISOString().split("T")[0];

  // Fetch activity data
  const results = await db
    .prepare(
      `SELECT
        activity_date,
        commit_count,
        repos_active,
        lines_added,
        lines_deleted
      FROM timeline_activity
      WHERE tenant_id = ?
        AND activity_date >= ?
        AND activity_date <= ?
      ORDER BY activity_date ASC`,
    )
    .bind(tenantId, startDate, endDate)
    .all<ActivityRow>();

  // Transform to heatmap format
  const activity = results.results.map((row) => ({
    date: row.activity_date,
    commits: row.commit_count,
    repos: row.repos_active ? JSON.parse(row.repos_active) : [],
    additions: row.lines_added,
    deletions: row.lines_deleted,
    // Intensity level for heatmap coloring (0-4)
    level: getIntensityLevel(row.commit_count),
  }));

  // Calculate stats
  const totalCommits = activity.reduce((sum, d) => sum + d.commits, 0);
  const totalAdditions = activity.reduce((sum, d) => sum + d.additions, 0);
  const totalDeletions = activity.reduce((sum, d) => sum + d.deletions, 0);
  const activeDays = activity.filter((d) => d.commits > 0).length;
  const longestStreak = calculateLongestStreak(activity);
  const currentStreak = calculateCurrentStreak(activity, endDate);

  return json(
    {
      activity,
      stats: {
        totalCommits,
        totalAdditions,
        totalDeletions,
        activeDays,
        totalDays: days,
        longestStreak,
        currentStreak,
      },
      range: {
        start: startDate,
        end: endDate,
      },
    },
    {
      headers: {
        "Cache-Control": "public, max-age=60, stale-while-revalidate=120",
      },
    },
  );
};

/**
 * Calculate intensity level (0-4) based on commit count.
 * Uses GitHub-style quartile thresholds.
 */
function getIntensityLevel(commits: number): number {
  if (commits === 0) return 0;
  if (commits <= 2) return 1;
  if (commits <= 5) return 2;
  if (commits <= 10) return 3;
  return 4;
}

/**
 * Calculate the longest streak of consecutive days with commits.
 */
function calculateLongestStreak(
  activity: { date: string; commits: number }[],
): number {
  let longest = 0;
  let current = 0;

  // Create a map of dates for quick lookup
  const dateMap = new Map(activity.map((a) => [a.date, a.commits]));

  // Sort dates and iterate
  const dates = activity
    .filter((a) => a.commits > 0)
    .map((a) => a.date)
    .sort();

  for (let i = 0; i < dates.length; i++) {
    if (i === 0) {
      current = 1;
    } else {
      const prevDate = new Date(dates[i - 1]);
      const currDate = new Date(dates[i]);
      const diffDays = Math.round(
        (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (diffDays === 1) {
        current++;
      } else {
        longest = Math.max(longest, current);
        current = 1;
      }
    }
  }

  return Math.max(longest, current);
}

/**
 * Calculate current streak (consecutive days ending today or yesterday).
 */
function calculateCurrentStreak(
  activity: { date: string; commits: number }[],
  endDate: string,
): number {
  const dateMap = new Map(activity.map((a) => [a.date, a.commits]));
  const today = new Date(endDate);
  let streak = 0;

  // Check if today or yesterday had commits (grace period)
  const todayStr = today.toISOString().split("T")[0];
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  // Start from the most recent active day
  let checkDate: Date;
  if (dateMap.get(todayStr) && dateMap.get(todayStr)! > 0) {
    checkDate = today;
  } else if (dateMap.get(yesterdayStr) && dateMap.get(yesterdayStr)! > 0) {
    checkDate = yesterday;
  } else {
    return 0;
  }

  // Count consecutive days backward
  while (true) {
    const dateStr = checkDate.toISOString().split("T")[0];
    const commits = dateMap.get(dateStr) ?? 0;

    if (commits > 0) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}
