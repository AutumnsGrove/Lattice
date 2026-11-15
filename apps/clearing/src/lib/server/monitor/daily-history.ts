/**
 * Daily History Module
 *
 * Aggregates daily status data for the uptime visualization.
 * Runs at midnight UTC to record the previous day's status.
 */

import { COMPONENTS } from "./config";
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
export function getYesterdayDate(): string {
	const yesterday = new Date();
	yesterday.setUTCDate(yesterday.getUTCDate() - 1);
	return yesterday.toISOString().split("T")[0];
}

/**
 * Maps a health check status to its counter column in status_daily_history.
 * Restricted to these five known columns — never built from external input.
 */
const STATUS_CHECK_COLUMN: Record<string, string> = {
	operational: "operational_checks",
	degraded: "degraded_checks",
	partial_outage: "partial_outage_checks",
	major_outage: "major_outage_checks",
	maintenance: "maintenance_checks",
};

/**
 * Severity of a check outcome, for averaging over a day.
 *
 * Maintenance is deliberately absent: it is planned, not a fault, and it has no
 * place on a linear scale. Putting it between "operational" and "degraded"
 * meant a day that was a third partial-outage rounded onto the maintenance
 * bucket and collected 100% uptime credit. Maintenance checks are excluded from
 * the severity average and only describe a day that was entirely maintenance.
 */
const DAILY_STATUS_WEIGHT: Record<string, number> = {
	operational: 0,
	degraded: 1,
	partial_outage: 2,
	major_outage: 3,
};

const STATUS_FROM_BUCKET = ["operational", "degraded", "partial_outage", "major_outage"];

/**
 * Derive a single representative status for the day from the count of
 * every individual check outcome, weighted by severity. A handful of
 * blips among hundreds of healthy checks barely moves this average —
 * unlike the old "worst status seen" approach, which locked in red for
 * the rest of the day after a single failure.
 *
 * The same arithmetic is duplicated in migration 0013 to rebuild historical
 * rows; keep the two in step.
 */
export function averageStatusFromCounts(counts: Record<string, number>): string {
	let ratedChecks = 0;
	let weightedSum = 0;

	for (const [status, weight] of Object.entries(DAILY_STATUS_WEIGHT)) {
		const count = counts[status] ?? 0;
		ratedChecks += count;
		weightedSum += weight * count;
	}

	if (ratedChecks === 0) {
		// Nothing to average. A full day of maintenance is the one case we can
		// name; otherwise we have no data and no opinion.
		return (counts.maintenance ?? 0) > 0 ? "maintenance" : "unknown";
	}

	const bucket = Math.min(3, Math.max(0, Math.round(weightedSum / ratedChecks)));
	return STATUS_FROM_BUCKET[bucket];
}

/**
 * Count the incidents that STARTED on a given date.
 *
 * Counting every incident that merely overlapped the day made one slow
 * afternoon stack up into double figures of "incidents" on days that were
 * 100% operational, and the number grew every day an old incident stayed open.
 * An incident happens once, on the day it begins.
 */
async function countIncidentsStartedOnDate(
	db: D1Database,
	componentId: string,
	date: string,
): Promise<number> {
	const result = await db
		.prepare(
			`SELECT COUNT(*) AS incident_count
			 FROM status_incidents i
			 INNER JOIN status_incident_components ic ON i.id = ic.incident_id
			 WHERE ic.component_id = ?
			   AND substr(i.started_at, 1, 10) = ?`,
		)
		.bind(componentId, date)
		.first<{ incident_count: number }>();

	return result?.incident_count ?? 0;
}

/**
 * Record a single health check's outcome toward today's running average.
 * Called after every health check, regardless of pass/fail — the day's
 * displayed status is recomputed from the full distribution of outcomes
 * so far, not just the worst one seen.
 */
export async function recordCheckResult(
	env: DailyHistoryEnv,
	componentId: string,
	status: string,
): Promise<void> {
	const today = new Date().toISOString().split("T")[0];
	const column = STATUS_CHECK_COLUMN[status] ?? STATUS_CHECK_COLUMN.operational;
	const id = generateUUID();
	const now = new Date().toISOString();

	await env.DB.prepare(
		`INSERT INTO status_daily_history (id, component_id, date, status, incident_count, ${column}, created_at)
         VALUES (?, ?, ?, 'operational', 0, 1, ?)
         ON CONFLICT(component_id, date)
         DO UPDATE SET ${column} = ${column} + 1`,
	)
		.bind(id, componentId, today, now)
		.run();

	const counts = await env.DB.prepare(
		`SELECT operational_checks, degraded_checks, partial_outage_checks, major_outage_checks, maintenance_checks
         FROM status_daily_history WHERE component_id = ? AND date = ?`,
	)
		.bind(componentId, today)
		.first<{
			operational_checks: number;
			degraded_checks: number;
			partial_outage_checks: number;
			major_outage_checks: number;
			maintenance_checks: number;
		}>();

	if (!counts) return;

	const avgStatus = averageStatusFromCounts({
		operational: counts.operational_checks,
		degraded: counts.degraded_checks,
		partial_outage: counts.partial_outage_checks,
		major_outage: counts.major_outage_checks,
		maintenance: counts.maintenance_checks,
	});

	await env.DB.prepare(
		`UPDATE status_daily_history SET status = ? WHERE component_id = ? AND date = ?`,
	)
		.bind(avgStatus, componentId, today)
		.run();
}

/**
 * Record daily status for a single component.
 * Health checks already maintain an averaged status in real-time via
 * recordCheckResult(). This midnight job enriches the record with the day's
 * incident count, and creates a placeholder for days where the monitor cron
 * didn't run at all.
 *
 * That placeholder is 'unknown', never a guessed status: a day without checks
 * is a day we know nothing about, and it is excluded from uptime rather than
 * being painted green or red on the strength of an incident that overlapped it.
 */
async function recordDailyStatusForComponent(
	db: D1Database,
	componentId: string,
	date: string,
): Promise<void> {
	const incidentCount = await countIncidentsStartedOnDate(db, componentId, date);

	const id = generateUUID();
	const now = new Date().toISOString();

	// If a record already exists (from real-time health checks), only update incident_count.
	await db
		.prepare(
			`INSERT INTO status_daily_history (id, component_id, date, status, incident_count, created_at)
       VALUES (?, ?, ?, 'unknown', ?, ?)
       ON CONFLICT(component_id, date)
       DO UPDATE SET incident_count = excluded.incident_count`,
		)
		.bind(id, componentId, date, incidentCount, now)
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
		COMPONENTS.map((component) => recordDailyStatusForComponent(env.DB, component.id, yesterday)),
	);

	for (let i = 0; i < results.length; i++) {
		const result = results[i];
		if (result.status === "fulfilled") {
			console.log(`[Clearing Monitor] Recorded history for ${COMPONENTS[i].name}`);
		} else {
			console.error(`[Clearing Monitor] Failed for ${COMPONENTS[i].name}:`, result.reason);
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
		const result = await env.DB.prepare(`DELETE FROM status_daily_history WHERE date < ?`)
			.bind(cutoffStr)
			.run();

		const deleted = result.meta?.changes ?? 0;
		if (deleted > 0) {
			console.log(`[Clearing Monitor] Cleaned up ${deleted} old history records`);
		}
	} catch (err) {
		console.error(
			"[Clearing Monitor] Failed to cleanup old history:",
			err instanceof Error ? err.message : String(err),
		);
	}
}
