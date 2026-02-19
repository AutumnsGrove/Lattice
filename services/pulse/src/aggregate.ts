/**
 * Pulse Worker — Cron Aggregation
 *
 * Hourly: Roll up events into pulse_hourly_activity
 * Daily: Finalize pulse_daily_stats from events
 */

import type { Env } from "./types";

/**
 * Run hourly aggregation. Called by cron at the top of each hour.
 * Ensures hourly_activity is populated even if the per-event update missed something.
 */
export async function runHourlyAggregation(env: Env): Promise<void> {
  const now = new Date();
  const previousHour = new Date(now.getTime() - 3600000);
  const dateStr = previousHour.toISOString().split("T")[0];
  const hour = previousHour.getUTCHours();

  console.log(`[Pulse Aggregate] Hourly rollup for ${dateStr} hour ${hour}`);

  // Get all tenants with events in the previous hour
  const startTs = Math.floor(previousHour.setMinutes(0, 0, 0) / 1000);
  const endTs = startTs + 3600;

  const results = await env.DB.prepare(
    `SELECT tenant_id,
            SUM(CASE WHEN event_type = 'push' THEN 1 ELSE 0 END) as commits,
            COUNT(*) as events
     FROM pulse_events
     WHERE occurred_at >= ? AND occurred_at < ?
     GROUP BY tenant_id`,
  )
    .bind(startTs, endTs)
    .all<{ tenant_id: string; commits: number; events: number }>();

  for (const row of results.results) {
    await env.DB.prepare(
      `INSERT INTO pulse_hourly_activity (id, tenant_id, date, hour, commits, events)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(tenant_id, date, hour) DO UPDATE SET
         commits = MAX(commits, excluded.commits),
         events = MAX(events, excluded.events)`,
    )
      .bind(
        crypto.randomUUID(),
        row.tenant_id,
        dateStr,
        hour,
        row.commits,
        row.events,
      )
      .run();
  }

  console.log(
    `[Pulse Aggregate] Hourly rollup complete: ${results.results.length} tenants`,
  );
}

/**
 * Run daily aggregation. Called by cron at 00:05 UTC.
 * Finalizes the previous day's stats from raw events.
 */
export async function runDailyAggregation(env: Env): Promise<void> {
  const yesterday = new Date(Date.now() - 86400000);
  const dateStr = yesterday.toISOString().split("T")[0];
  const startTs = Math.floor(new Date(dateStr + "T00:00:00Z").getTime() / 1000);
  const endTs = startTs + 86400;

  console.log(`[Pulse Aggregate] Daily rollup for ${dateStr}`);

  // Aggregate events per tenant for the day
  const tenantEvents = await env.DB.prepare(
    `SELECT tenant_id, event_type, action, data
     FROM pulse_events
     WHERE occurred_at >= ? AND occurred_at < ?`,
  )
    .bind(startTs, endTs)
    .all<{
      tenant_id: string;
      event_type: string;
      action: string | null;
      data: string;
    }>();

  // Group by tenant
  const tenantStats = new Map<
    string,
    {
      commits: number;
      linesAdded: number;
      linesRemoved: number;
      filesChanged: number;
      prsOpened: number;
      prsMerged: number;
      prsClosed: number;
      issuesOpened: number;
      issuesClosed: number;
      releases: number;
      ciPasses: number;
      ciFailures: number;
    }
  >();

  for (const row of tenantEvents.results) {
    if (!tenantStats.has(row.tenant_id)) {
      tenantStats.set(row.tenant_id, {
        commits: 0,
        linesAdded: 0,
        linesRemoved: 0,
        filesChanged: 0,
        prsOpened: 0,
        prsMerged: 0,
        prsClosed: 0,
        issuesOpened: 0,
        issuesClosed: 0,
        releases: 0,
        ciPasses: 0,
        ciFailures: 0,
      });
    }

    const stats = tenantStats.get(row.tenant_id)!;
    let data: Record<string, unknown> = {};
    if (row.data) {
      try {
        data = JSON.parse(row.data);
      } catch {
        continue; // Skip events with corrupted data
      }
    }

    switch (row.event_type) {
      case "push":
        stats.commits += data.commits ?? 1;
        stats.linesAdded += data.additions ?? 0;
        stats.linesRemoved += data.deletions ?? 0;
        stats.filesChanged += data.files_changed ?? 0;
        break;
      case "pull_request":
        if (row.action === "opened") stats.prsOpened++;
        if (data.merged) stats.prsMerged++;
        if (row.action === "closed" && !data.merged) stats.prsClosed++;
        break;
      case "issues":
        if (row.action === "opened") stats.issuesOpened++;
        if (row.action === "closed") stats.issuesClosed++;
        break;
      case "release":
        stats.releases++;
        break;
      case "workflow_run":
        if (data.conclusion === "success") stats.ciPasses++;
        else stats.ciFailures++;
        break;
    }
  }

  // Write daily stats for each tenant
  for (const [tenantId, stats] of tenantStats) {
    await env.DB.prepare(
      `INSERT INTO pulse_daily_stats (
        id, tenant_id, date, repo_name,
        commits, lines_added, lines_removed, files_changed,
        prs_opened, prs_merged, prs_closed,
        issues_opened, issues_closed, releases,
        ci_passes, ci_failures
      ) VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(tenant_id, date, repo_name) DO UPDATE SET
        commits = excluded.commits,
        lines_added = excluded.lines_added,
        lines_removed = excluded.lines_removed,
        files_changed = excluded.files_changed,
        prs_opened = excluded.prs_opened,
        prs_merged = excluded.prs_merged,
        prs_closed = excluded.prs_closed,
        issues_opened = excluded.issues_opened,
        issues_closed = excluded.issues_closed,
        releases = excluded.releases,
        ci_passes = excluded.ci_passes,
        ci_failures = excluded.ci_failures,
        updated_at = strftime('%s', 'now')`,
    )
      .bind(
        crypto.randomUUID(),
        tenantId,
        dateStr,
        stats.commits,
        stats.linesAdded,
        stats.linesRemoved,
        stats.filesChanged,
        stats.prsOpened,
        stats.prsMerged,
        stats.prsClosed,
        stats.issuesOpened,
        stats.issuesClosed,
        stats.releases,
        stats.ciPasses,
        stats.ciFailures,
      )
      .run();

    // Update streak in KV
    await updateStreak(env, tenantId, dateStr);
  }

  console.log(
    `[Pulse Aggregate] Daily rollup complete: ${tenantStats.size} tenants`,
  );
}

async function updateStreak(
  env: Env,
  tenantId: string,
  date: string,
): Promise<void> {
  // Count consecutive days with commits going back from today
  const result = await env.DB.prepare(
    `WITH RECURSIVE dates AS (
       SELECT ? as d, 1 as streak
       UNION ALL
       SELECT date(d, '-1 day'), streak + 1
       FROM dates
       WHERE EXISTS (
         SELECT 1 FROM pulse_daily_stats
         WHERE tenant_id = ? AND date = date(d, '-1 day') AND commits > 0
       )
     )
     SELECT MAX(streak) as days, MIN(d) as since FROM dates`,
  )
    .bind(date, tenantId)
    .first<{ days: number; since: string }>();

  if (result && result.days > 0) {
    await env.KV.put(
      `pulse:${tenantId}:streak`,
      JSON.stringify({ days: result.days, since: result.since }),
      { expirationTtl: 86400 },
    );
  }
}
