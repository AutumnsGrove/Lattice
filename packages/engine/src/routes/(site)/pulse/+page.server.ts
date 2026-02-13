/**
 * Pulse Public Route — Server
 *
 * Loads pulse data for the public /pulse page.
 * Requires Pulse Curio to be enabled for the current tenant.
 */

import type { PageServerLoad } from "./$types";
import { SITE_ERRORS, throwGroveError } from "$lib/errors";

interface EventRow {
  id: string;
  delivery_id: string | null;
  event_type: string;
  action: string | null;
  repo_name: string;
  repo_full_name: string;
  actor: string;
  title: string | null;
  ref: string | null;
  data: string | null;
  occurred_at: number;
}

interface ConfigRow {
  enabled: number;
  show_heatmap: number;
  show_feed: number;
  show_stats: number;
  show_trends: number;
  show_ci: number;
  timezone: string;
  feed_max_items: number;
}

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

export const load: PageServerLoad = async ({ platform, locals }) => {
  const db = platform?.env?.DB;
  const kv = platform?.env?.CACHE_KV;
  const tenantId = locals.tenantId;

  if (!db) throwGroveError(503, SITE_ERRORS.DB_NOT_CONFIGURED, "Site");
  if (!tenantId)
    throwGroveError(400, SITE_ERRORS.TENANT_CONTEXT_REQUIRED, "Site");

  // Check if Pulse is enabled
  const config = await db
    .prepare(
      `SELECT enabled, show_heatmap, show_feed, show_stats, show_trends, show_ci,
              timezone, feed_max_items
       FROM pulse_curio_config WHERE tenant_id = ?`,
    )
    .bind(tenantId)
    .first<ConfigRow>();

  if (!config?.enabled) {
    throwGroveError(404, SITE_ERRORS.FEATURE_NOT_ENABLED, "Site");
  }

  // Parallel: KV hot data + D1 historical
  const [
    activeData,
    todayData,
    streakData,
    eventsResult,
    dailyResult,
    hourlyResult,
  ] = await Promise.all([
    kv?.get(`pulse:${tenantId}:active`, "json").catch(() => null) ?? null,
    kv?.get(`pulse:${tenantId}:today`, "json").catch(() => null) ?? null,
    kv?.get(`pulse:${tenantId}:streak`, "json").catch(() => null) ?? null,

    // Recent events (graceful degradation — empty on failure)
    db
      .prepare(
        `SELECT id, delivery_id, event_type, action, repo_name, repo_full_name,
                  actor, title, ref, data, occurred_at
           FROM pulse_events WHERE tenant_id = ?
           ORDER BY occurred_at DESC LIMIT ?`,
      )
      .bind(tenantId, Math.min(config.feed_max_items, 100))
      .all<EventRow>()
      .catch(() => ({ results: [] as EventRow[] })),

    // Daily stats (30 days)
    db
      .prepare(
        `SELECT date, repo_name, commits, lines_added, lines_removed, files_changed,
                  prs_opened, prs_merged, prs_closed, issues_opened, issues_closed,
                  releases, ci_passes, ci_failures, stars_total, forks_total
           FROM pulse_daily_stats WHERE tenant_id = ? AND date >= date('now', '-30 days')
           ORDER BY date ASC`,
      )
      .bind(tenantId)
      .all<DailyStatsRow>()
      .catch(() => ({ results: [] as DailyStatsRow[] })),

    // Hourly activity (7 days)
    db
      .prepare(
        `SELECT date, hour, commits, events
           FROM pulse_hourly_activity WHERE tenant_id = ? AND date >= date('now', '-7 days')
           ORDER BY date ASC, hour ASC`,
      )
      .bind(tenantId)
      .all<HourlyRow>()
      .catch(() => ({ results: [] as HourlyRow[] })),
  ]);

  const active = (activeData as any) ?? { isActive: false };
  const today = (todayData as any) ?? {
    commits: 0,
    prsMerged: 0,
    issuesClosed: 0,
    linesAdded: 0,
    linesRemoved: 0,
  };
  const streak = (streakData as any) ?? { days: 0, since: "" };

  const events = eventsResult.results.map((row) => {
    let data: Record<string, unknown> = {};
    if (row.data) {
      try {
        data = JSON.parse(row.data);
      } catch {
        // Corrupted stored JSON — use empty object
      }
    }
    return {
      id: row.id,
      deliveryId: row.delivery_id,
      eventType: row.event_type,
      action: row.action,
      repoName: row.repo_name,
      repoFullName: row.repo_full_name,
      actor: row.actor,
      title: row.title,
      ref: row.ref,
      data,
      occurredAt: row.occurred_at,
    };
  });

  const dailyStats = dailyResult.results.map((row) => ({
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

  const hourlyActivity = hourlyResult.results.map((row) => ({
    date: row.date,
    hour: row.hour,
    commits: row.commits,
    events: row.events,
  }));

  return {
    config: {
      enabled: true,
      showHeatmap: Boolean(config.show_heatmap),
      showFeed: Boolean(config.show_feed),
      showStats: Boolean(config.show_stats),
      showTrends: Boolean(config.show_trends),
      showCi: Boolean(config.show_ci),
      timezone: config.timezone,
      feedMaxItems: config.feed_max_items,
      hasWebhookSecret: true,
      webhookUrl: "",
    },
    active,
    today,
    streak,
    events,
    dailyStats,
    hourlyActivity,
  };
};
