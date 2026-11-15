/**
 * Server-side status data fetching utilities
 *
 * These functions query the D1 database for status information.
 */
import type {
	StatusComponent,
	StatusIncident,
	StatusUpdate,
	ScheduledMaintenance,
	DailyStatus,
	DailyStatusKind,
	UptimeHistory,
	ComponentStatus,
	OverallStatus,
	IncidentWithDetails,
	StatusPageData,
} from "$lib/types/status";
import { calculateOverallStatus } from "$lib/types/status";
import { STALE_AFTER_MINUTES } from "$lib/server/monitor/config";

/**
 * Get all platform components with their current status
 */
export async function getComponents(db: D1Database): Promise<StatusComponent[]> {
	const result = await db
		.prepare("SELECT * FROM status_components ORDER BY display_order ASC")
		.all<StatusComponent>();

	return result.results || [];
}

/**
 * Get active (unresolved) incidents
 */
export async function getActiveIncidents(db: D1Database): Promise<StatusIncident[]> {
	const result = await db
		.prepare(
			`
			SELECT * FROM status_incidents
			WHERE resolved_at IS NULL
			ORDER BY started_at DESC
		`,
		)
		.all<StatusIncident>();

	return result.results || [];
}

/**
 * Get recent incidents (last 30 days, including resolved)
 */
export async function getRecentIncidents(
	db: D1Database,
	days: number = 30,
): Promise<StatusIncident[]> {
	const cutoffDate = new Date();
	cutoffDate.setDate(cutoffDate.getDate() - days);

	const result = await db
		.prepare(
			`
			SELECT * FROM status_incidents
			WHERE started_at >= ?
			ORDER BY started_at DESC
		`,
		)
		.bind(cutoffDate.toISOString())
		.all<StatusIncident>();

	return result.results || [];
}

/**
 * Get updates for an incident
 */
export async function getIncidentUpdates(
	db: D1Database,
	incidentId: string,
): Promise<StatusUpdate[]> {
	const result = await db
		.prepare(
			`
			SELECT * FROM status_updates
			WHERE incident_id = ?
			ORDER BY created_at DESC
		`,
		)
		.bind(incidentId)
		.all<StatusUpdate>();

	return result.results || [];
}

/**
 * Get components affected by an incident
 */
export async function getIncidentComponents(
	db: D1Database,
	incidentId: string,
): Promise<StatusComponent[]> {
	const result = await db
		.prepare(
			`
			SELECT c.* FROM status_components c
			INNER JOIN status_incident_components ic ON c.id = ic.component_id
			WHERE ic.incident_id = ?
			ORDER BY c.display_order ASC
		`,
		)
		.bind(incidentId)
		.all<StatusComponent>();

	return result.results || [];
}

/**
 * Get a single incident by slug with all details
 */
export async function getIncidentBySlug(
	db: D1Database,
	slug: string,
): Promise<IncidentWithDetails | null> {
	const incidentResult = await db
		.prepare("SELECT * FROM status_incidents WHERE slug = ?")
		.bind(slug)
		.first<StatusIncident>();

	if (!incidentResult) return null;

	const [components, updates] = await Promise.all([
		getIncidentComponents(db, incidentResult.id),
		getIncidentUpdates(db, incidentResult.id),
	]);

	return {
		...incidentResult,
		components,
		updates,
	};
}

/**
 * Get upcoming and in-progress scheduled maintenance
 */
export async function getScheduledMaintenance(db: D1Database): Promise<ScheduledMaintenance[]> {
	const result = await db
		.prepare(
			`
			SELECT * FROM status_scheduled
			WHERE status IN ('scheduled', 'in_progress')
			ORDER BY scheduled_start ASC
		`,
		)
		.all<ScheduledMaintenance>();

	return (result.results || []).map((m) => ({
		...m,
		// D1 returns JSON columns as strings, parse them back to arrays
		components:
			typeof m.components === "string" ? JSON.parse(m.components || "[]") : m.components || [],
	}));
}

/**
 * Uptime weights for different statuses
 * Industry standard: operational = 100%, degraded = partial credit, outages = 0%
 *
 * `unknown` is null on purpose: a day with no check data is left out of both the
 * numerator and the denominator. Counting it as uptime would invent a good day;
 * counting it as an outage would invent a bad one.
 */
const UPTIME_WEIGHTS: Record<DailyStatusKind, number | null> = {
	operational: 1.0,
	degraded: 0.75, // 75% credit for degraded performance
	partial_outage: 0.25, // 25% credit for partial outage
	major_outage: 0, // No credit for major outage
	maintenance: 1.0, // Scheduled maintenance doesn't count against uptime
	unknown: null, // No data — excluded from the calculation
};

function isKnownStatus(value: string | null | undefined): value is ComponentStatus {
	return value !== null && value !== undefined && value in UPTIME_WEIGHTS && value !== "unknown";
}

/**
 * Get 90-day uptime history for all components
 * Optimized to fetch all history in a single query
 *
 * Incident counts are derived from the incidents themselves — counting the ones
 * that *started* on a given day — rather than trusting the frozen `incident_count`
 * column, which used to count every incident still open at midnight and made a
 * single slow afternoon look like a dozen outages a day for months.
 */
export async function getUptimeHistory(db: D1Database): Promise<UptimeHistory[]> {
	const components = await getComponents(db);

	// Calculate date range
	const startDate = new Date();
	startDate.setDate(startDate.getDate() - 90);
	const startDateStr = startDate.toISOString().split("T")[0];

	// Fetch all history and incident starts in parallel
	const [allHistoryResult, incidentCountResult] = await Promise.all([
		db
			.prepare(
				`
				SELECT component_id, date, status
				FROM status_daily_history
				WHERE date >= ?
				ORDER BY component_id, date ASC
			`,
			)
			.bind(startDateStr)
			.all<{ component_id: string; date: string; status: string }>(),
		db
			.prepare(
				`
				SELECT ic.component_id AS component_id,
				       substr(i.started_at, 1, 10) AS date,
				       COUNT(*) AS incident_count
				FROM status_incidents i
				INNER JOIN status_incident_components ic ON i.id = ic.incident_id
				WHERE i.started_at >= ?
				GROUP BY ic.component_id, substr(i.started_at, 1, 10)
			`,
			)
			.bind(`${startDateStr}T00:00:00.000Z`)
			.all<{ component_id: string; date: string; incident_count: number }>(),
	]);

	// Group by component
	const historyByComponent = new Map<string, Map<string, string>>();
	for (const row of allHistoryResult.results || []) {
		if (!historyByComponent.has(row.component_id)) {
			historyByComponent.set(row.component_id, new Map());
		}
		historyByComponent.get(row.component_id)!.set(row.date, row.status);
	}

	const incidentsByComponent = new Map<string, Map<string, number>>();
	for (const row of incidentCountResult.results || []) {
		if (!incidentsByComponent.has(row.component_id)) {
			incidentsByComponent.set(row.component_id, new Map());
		}
		incidentsByComponent.get(row.component_id)!.set(row.date, row.incident_count);
	}

	const histories: UptimeHistory[] = [];

	for (const component of components) {
		const componentHistory = historyByComponent.get(component.id) || new Map<string, string>();
		const componentIncidents = incidentsByComponent.get(component.id) || new Map<string, number>();

		const days: DailyStatus[] = [];
		let uptimeSum = 0;
		let countedDays = 0;

		for (let i = 0; i < 90; i++) {
			const date = new Date(startDate);
			date.setDate(date.getDate() + i);
			const dateStr = date.toISOString().split("T")[0];

			const recorded = componentHistory.get(dateStr);
			// A missing day is "unknown", never "operational" — the monitor may not
			// have been running, and guessing in the visitor's favour is still a guess.
			const status: DailyStatusKind = isKnownStatus(recorded) ? recorded : "unknown";

			days.push({
				date: dateStr,
				status,
				incidentCount: componentIncidents.get(dateStr) ?? 0,
			});

			const weight = UPTIME_WEIGHTS[status];
			if (weight !== null) {
				uptimeSum += weight;
				countedDays++;
			}
		}

		histories.push({
			componentId: component.id,
			componentName: component.name,
			days,
			countedDays,
			uptimePercentage: countedDays === 0 ? null : (uptimeSum / countedDays) * 100,
		});
	}

	return histories;
}

/**
 * Get the overall platform status
 */
export async function getOverallStatus(db: D1Database): Promise<OverallStatus> {
	const components = await getComponents(db);
	return calculateOverallStatus(components);
}

/**
 * Latest check timestamp across all components, or null if nothing has
 * ever reported one (e.g. a brand new database).
 *
 * Falls back to updated_at when no last_check_at exists yet — that is the
 * deploy window before migration 0012 runs, where updated_at is the only
 * evidence that anything touched a component.
 */
export function getLastCheckAt(components: StatusComponent[]): string | null {
	const newest = (values: Array<string | null | undefined>): string | null => {
		const timestamps = values
			.filter((value): value is string => typeof value === "string" && value.length > 0)
			.sort();

		return timestamps.length > 0 ? timestamps[timestamps.length - 1] : null;
	};

	return (
		newest(components.map((c) => c.last_check_at)) ?? newest(components.map((c) => c.updated_at))
	);
}

/**
 * True when the newest health check is older than the staleness window, which
 * means the monitor itself has stopped reporting. The page should say so
 * rather than presenting old statuses as current.
 */
export function isMonitorStale(lastCheckAt: string | null, now: Date = new Date()): boolean {
	if (!lastCheckAt) return true;

	const checkedAt = new Date(lastCheckAt).getTime();
	if (Number.isNaN(checkedAt)) return true;

	return now.getTime() - checkedAt > STALE_AFTER_MINUTES * 60 * 1000;
}

/**
 * Maximum number of IDs allowed in a batch query to prevent oversized queries
 */
const MAX_BATCH_SIZE = 100;

/**
 * UUID validation regex - matches standard UUID format
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validates that all IDs in an array are valid UUIDs
 * This provides defense-in-depth for batch queries
 */
function validateUUIDs(ids: string[]): boolean {
	return ids.every((id) => UUID_REGEX.test(id));
}

/**
 * Get recent incidents (last `days` days, including resolved) plus any
 * unresolved incident no matter how old it is. An incident that has been open
 * for months must never be invisible just because it started outside the
 * window — it still colours the uptime chart.
 */
export async function getRecentIncidentsWithUpdates(
	db: D1Database,
	days: number = 30,
): Promise<IncidentWithDetails[]> {
	const cutoffDate = new Date();
	cutoffDate.setDate(cutoffDate.getDate() - days);

	// Get all incidents in the date range, plus anything still open
	const incidentsResult = await db
		.prepare(
			`
			SELECT * FROM status_incidents
			WHERE started_at >= ? OR resolved_at IS NULL
			ORDER BY started_at DESC
			LIMIT ?
		`,
		)
		.bind(cutoffDate.toISOString(), MAX_BATCH_SIZE)
		.all<StatusIncident>();

	const incidents = incidentsResult.results || [];
	if (incidents.length === 0) return [];

	const incidentIds = incidents.map((i) => i.id);

	// Defense-in-depth: validate all IDs are proper UUIDs
	if (!validateUUIDs(incidentIds)) {
		console.error("[status] Invalid UUID detected in incident IDs, aborting batch query");
		return [];
	}

	// SAFETY: This dynamic SQL is safe because:
	// 1. incidentIds are UUIDs retrieved from a trusted database query above
	// 2. All IDs are validated as proper UUIDs before use
	// 3. The parameterized bindings ensure proper escaping
	// 4. D1 doesn't support array parameters natively, so this pattern is required
	// Batch fetch all updates for these incidents
	const updatesResult = await db
		.prepare(
			`
			SELECT * FROM status_updates
			WHERE incident_id IN (${incidentIds.map(() => "?").join(",")})
			ORDER BY created_at DESC
		`,
		)
		.bind(...incidentIds)
		.all<StatusUpdate>();

	// SAFETY: Same as above - incidentIds are validated UUIDs from database
	// Batch fetch all component relationships
	const componentRelationsResult = await db
		.prepare(
			`
			SELECT ic.incident_id, c.*
			FROM status_incident_components ic
			INNER JOIN status_components c ON c.id = ic.component_id
			WHERE ic.incident_id IN (${incidentIds.map(() => "?").join(",")})
			ORDER BY c.display_order ASC
		`,
		)
		.bind(...incidentIds)
		.all<StatusComponent & { incident_id: string }>();

	// Group updates by incident
	const updatesByIncident = new Map<string, StatusUpdate[]>();
	for (const update of updatesResult.results || []) {
		if (!updatesByIncident.has(update.incident_id)) {
			updatesByIncident.set(update.incident_id, []);
		}
		updatesByIncident.get(update.incident_id)!.push(update);
	}

	// Group components by incident
	const componentsByIncident = new Map<string, StatusComponent[]>();
	for (const row of componentRelationsResult.results || []) {
		const incidentId = row.incident_id;
		if (!componentsByIncident.has(incidentId)) {
			componentsByIncident.set(incidentId, []);
		}
		// Extract component without incident_id
		const { incident_id, ...component } = row;
		componentsByIncident.get(incidentId)!.push(component as StatusComponent);
	}

	// Combine into IncidentWithDetails
	return incidents.map((incident) => ({
		...incident,
		updates: updatesByIncident.get(incident.id) || [],
		components: componentsByIncident.get(incident.id) || [],
	}));
}

/**
 * Get all data needed for the main status page
 * Optimized to minimize database queries
 */
export async function getStatusPageData(db: D1Database): Promise<StatusPageData> {
	// Parallel fetch of independent data
	const [components, scheduledMaintenance, uptimeHistory] = await Promise.all([
		getComponents(db),
		getScheduledMaintenance(db),
		getUptimeHistory(db),
	]);

	// Get all recent incidents with their updates and components in batch
	const allIncidentsWithDetails = await getRecentIncidentsWithUpdates(db, 30);

	// Split into active and resolved
	const activeIncidents = allIncidentsWithDetails.filter((i) => !i.resolved_at);
	const recentIncidents = allIncidentsWithDetails;

	// "Last updated" must mean the last time a health check actually ran.
	// Falling back to render time made the page claim "Just now" over day-old data.
	const lastCheckAt = getLastCheckAt(components);

	return {
		status: calculateOverallStatus(components),
		components,
		activeIncidents,
		recentIncidents,
		scheduledMaintenance,
		uptimeHistory,
		lastCheckAt,
		monitorStale: isMonitorStale(lastCheckAt),
		updatedAt: lastCheckAt ?? new Date().toISOString(),
	};
}
