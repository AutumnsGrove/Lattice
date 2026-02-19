/**
 * Daily History Module
 *
 * Aggregates daily status data for the uptime visualization.
 * Runs at midnight UTC to record the previous day's status.
 */

import { COMPONENTS, STATUS_PRIORITY } from "./config";
import { generateUUID } from "./utils";

/**
 * Environment bindings required by daily history
 */
export interface DailyHistoryEnv {
  DB: D1Database;
}

/**
 * Get yesterday's date in YYYY-MM-DD format (UTC)
 */
function getYesterdayDate(): string {
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  return yesterday.toISOString().split("T")[0];
}

/**
 * Determine the worst status from a list of statuses
 */
function getWorstStatus(statuses: string[]): string {
  if (statuses.length === 0) return "operational";

  return statuses.reduce((worst, current) => {
    const worstPriority = STATUS_PRIORITY[worst] ?? 0;
    const currentPriority = STATUS_PRIORITY[current] ?? 0;
    return currentPriority > worstPriority ? current : worst;
  }, "operational");
}

/**
 * Count incidents for a component on a given date
 */
async function countIncidentsForDate(
  db: D1Database,
  componentId: string,
  date: string,
): Promise<{ incidentCount: number; worstStatus: string }> {
  // Get all incidents that overlapped with this date
  const dateStart = `${date}T00:00:00.000Z`;
  const dateEnd = `${date}T23:59:59.999Z`;

  // Find incidents that were active during this date
  // (started before end of day AND (not resolved OR resolved after start of day))
  const result = await db
    .prepare(
      `SELECT i.id, i.type, i.impact
			 FROM status_incidents i
			 INNER JOIN status_incident_components ic ON i.id = ic.incident_id
			 WHERE ic.component_id = ?
			   AND i.started_at <= ?
			   AND (i.resolved_at IS NULL OR i.resolved_at >= ?)`,
    )
    .bind(componentId, dateEnd, dateStart)
    .all<{ id: string; type: string; impact: string }>();

  const incidents = result.results || [];
  const incidentCount = incidents.length;

  // Map incident impact to component status
  const statusesFromIncidents = incidents.map((i) => {
    switch (i.impact) {
      case "critical":
        return "major_outage";
      case "major":
        return "partial_outage";
      case "minor":
        return "degraded";
      default:
        return "operational";
    }
  });

  // Get current component status as fallback
  const componentResult = await db
    .prepare(`SELECT current_status FROM status_components WHERE id = ?`)
    .bind(componentId)
    .first<{ current_status: string }>();

  const currentStatus = componentResult?.current_status || "operational";

  // If no incidents, use operational; otherwise use worst incident status
  const worstStatus =
    statusesFromIncidents.length > 0
      ? getWorstStatus(statusesFromIncidents)
      : "operational";

  return { incidentCount, worstStatus };
}

/**
 * Update today's worst status for a component.
 * Called after each health check to capture status changes in real-time.
 * Only updates if the new status is worse than what's already recorded.
 */
export async function updateTodayWorstStatus(
  env: DailyHistoryEnv,
  componentId: string,
  currentStatus: string,
): Promise<void> {
  const today = new Date().toISOString().split("T")[0];
  const currentPriority = STATUS_PRIORITY[currentStatus] ?? 0;

  // Skip if operational — no need to write "everything is fine" every 5 min
  if (currentPriority === 0) return;

  // Check existing record for today
  const existing = await env.DB
    .prepare(
      `SELECT status FROM status_daily_history WHERE component_id = ? AND date = ?`,
    )
    .bind(componentId, today)
    .first<{ status: string }>();

  const existingPriority = STATUS_PRIORITY[existing?.status ?? "operational"] ?? 0;

  // Only write if current status is worse than what we've already recorded
  if (currentPriority > existingPriority) {
    const id = generateUUID();
    const now = new Date().toISOString();

    await env.DB
      .prepare(
        `INSERT INTO status_daily_history (id, component_id, date, status, incident_count, created_at)
         VALUES (?, ?, ?, ?, 0, ?)
         ON CONFLICT(component_id, date)
         DO UPDATE SET status = excluded.status`,
      )
      .bind(id, componentId, today, currentStatus, now)
      .run();
  }
}

/**
 * Record daily status for a single component.
 * Health checks already capture worst status in real-time via updateTodayWorstStatus().
 * This midnight job enriches the record with incident counts, and provides a
 * fallback status for days where no health check captured a non-operational state.
 */
async function recordDailyStatusForComponent(
  db: D1Database,
  componentId: string,
  date: string,
): Promise<void> {
  const { incidentCount, worstStatus } = await countIncidentsForDate(
    db,
    componentId,
    date,
  );

  const id = generateUUID();
  const now = new Date().toISOString();

  // If a record already exists (from real-time health checks), only update incident_count.
  // If no record exists yet, insert with the incident-derived status as fallback.
  await db
    .prepare(
      `INSERT INTO status_daily_history (id, component_id, date, status, incident_count, created_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(component_id, date)
       DO UPDATE SET incident_count = excluded.incident_count`,
    )
    .bind(id, componentId, date, worstStatus, incidentCount, now)
    .run();
}

/**
 * Record daily status for all components
 * Called at midnight UTC by the cron trigger
 */
export async function recordDailyHistory(env: DailyHistoryEnv): Promise<void> {
  const yesterday = getYesterdayDate();
  console.log(`[Clearing Monitor] Recording daily history for ${yesterday}`);

  const results = await Promise.allSettled(
    COMPONENTS.map((component) =>
      recordDailyStatusForComponent(env.DB, component.id, yesterday),
    ),
  );

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === "fulfilled") {
      console.log(
        `[Clearing Monitor] Recorded history for ${COMPONENTS[i].name}`,
      );
    } else {
      console.error(
        `[Clearing Monitor] Failed for ${COMPONENTS[i].name}:`,
        result.reason,
      );
    }
  }
}

/**
 * Clean up old history records (keep 90 days)
 * Called periodically to prevent table bloat
 */
export async function cleanupOldHistory(env: DailyHistoryEnv): Promise<void> {
  const cutoffDate = new Date();
  cutoffDate.setUTCDate(cutoffDate.getUTCDate() - 90);
  const cutoffStr = cutoffDate.toISOString().split("T")[0];

  try {
    const result = await env.DB.prepare(
      `DELETE FROM status_daily_history WHERE date < ?`,
    )
      .bind(cutoffStr)
      .run();

    const deleted = result.meta?.changes ?? 0;
    if (deleted > 0) {
      console.log(
        `[Clearing Monitor] Cleaned up ${deleted} old history records`,
      );
    }
  } catch (err) {
    console.error(
      "[Clearing Monitor] Failed to cleanup old history:",
      err instanceof Error ? err.message : String(err),
    );
  }
}
