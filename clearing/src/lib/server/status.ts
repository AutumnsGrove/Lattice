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
	UptimeHistory,
	OverallStatus,
	IncidentWithDetails
} from '$lib/types/status';
import { calculateOverallStatus } from '$lib/types/status';

/**
 * Get all platform components with their current status
 */
export async function getComponents(db: D1Database): Promise<StatusComponent[]> {
	const result = await db
		.prepare('SELECT * FROM status_components ORDER BY display_order ASC')
		.all<StatusComponent>();

	return result.results || [];
}

/**
 * Get active (unresolved) incidents
 */
export async function getActiveIncidents(db: D1Database): Promise<StatusIncident[]> {
	const result = await db
		.prepare(`
			SELECT * FROM status_incidents
			WHERE resolved_at IS NULL
			ORDER BY started_at DESC
		`)
		.all<StatusIncident>();

	return result.results || [];
}

/**
 * Get recent incidents (last 30 days, including resolved)
 */
export async function getRecentIncidents(db: D1Database, days: number = 30): Promise<StatusIncident[]> {
	const cutoffDate = new Date();
	cutoffDate.setDate(cutoffDate.getDate() - days);

	const result = await db
		.prepare(`
			SELECT * FROM status_incidents
			WHERE started_at >= ?
			ORDER BY started_at DESC
		`)
		.bind(cutoffDate.toISOString())
		.all<StatusIncident>();

	return result.results || [];
}

/**
 * Get updates for an incident
 */
export async function getIncidentUpdates(db: D1Database, incidentId: string): Promise<StatusUpdate[]> {
	const result = await db
		.prepare(`
			SELECT * FROM status_updates
			WHERE incident_id = ?
			ORDER BY created_at DESC
		`)
		.bind(incidentId)
		.all<StatusUpdate>();

	return result.results || [];
}

/**
 * Get components affected by an incident
 */
export async function getIncidentComponents(db: D1Database, incidentId: string): Promise<StatusComponent[]> {
	const result = await db
		.prepare(`
			SELECT c.* FROM status_components c
			INNER JOIN status_incident_components ic ON c.id = ic.component_id
			WHERE ic.incident_id = ?
			ORDER BY c.display_order ASC
		`)
		.bind(incidentId)
		.all<StatusComponent>();

	return result.results || [];
}

/**
 * Get a single incident by slug with all details
 */
export async function getIncidentBySlug(db: D1Database, slug: string): Promise<IncidentWithDetails | null> {
	const incidentResult = await db
		.prepare('SELECT * FROM status_incidents WHERE slug = ?')
		.bind(slug)
		.first<StatusIncident>();

	if (!incidentResult) return null;

	const [components, updates] = await Promise.all([
		getIncidentComponents(db, incidentResult.id),
		getIncidentUpdates(db, incidentResult.id)
	]);

	return {
		...incidentResult,
		components,
		updates
	};
}

/**
 * Get upcoming and in-progress scheduled maintenance
 */
export async function getScheduledMaintenance(db: D1Database): Promise<ScheduledMaintenance[]> {
	const result = await db
		.prepare(`
			SELECT * FROM status_scheduled
			WHERE status IN ('scheduled', 'in_progress')
			ORDER BY scheduled_start ASC
		`)
		.all<ScheduledMaintenance>();

	return (result.results || []).map((m) => ({
		...m,
		// D1 returns JSON columns as strings, parse them back to arrays
		components: typeof m.components === 'string'
			? JSON.parse(m.components || '[]')
			: (m.components || [])
	}));
}

/**
 * Uptime weights for different statuses
 * Industry standard: operational = 100%, degraded = partial credit, outages = 0%
 */
const UPTIME_WEIGHTS: Record<string, number> = {
	operational: 1.0,
	degraded: 0.75,        // 75% credit for degraded performance
	partial_outage: 0.25,  // 25% credit for partial outage
	major_outage: 0,       // No credit for major outage
	maintenance: 1.0       // Scheduled maintenance doesn't count against uptime
};

/**
 * Get 90-day uptime history for all components
 * Optimized to fetch all history in a single query
 */
export async function getUptimeHistory(db: D1Database): Promise<UptimeHistory[]> {
	const components = await getComponents(db);

	// Calculate date range
	const startDate = new Date();
	startDate.setDate(startDate.getDate() - 90);
	const startDateStr = startDate.toISOString().split('T')[0];

	// Fetch all history for all components in a single query
	const allHistoryResult = await db
		.prepare(`
			SELECT component_id, date, status, incident_count
			FROM status_daily_history
			WHERE date >= ?
			ORDER BY component_id, date ASC
		`)
		.bind(startDateStr)
		.all<{ component_id: string; date: string; status: string; incident_count: number }>();

	// Group by component
	const historyByComponent = new Map<string, Map<string, { status: string; incident_count: number }>>();
	for (const row of allHistoryResult.results || []) {
		if (!historyByComponent.has(row.component_id)) {
			historyByComponent.set(row.component_id, new Map());
		}
		historyByComponent.get(row.component_id)!.set(row.date, {
			status: row.status,
			incident_count: row.incident_count
		});
	}

	const histories: UptimeHistory[] = [];

	for (const component of components) {
		const componentHistory = historyByComponent.get(component.id) || new Map();

		// Fill in all 90 days (default to operational if no record)
		const days: DailyStatus[] = [];
		let uptimeSum = 0;

		for (let i = 0; i < 90; i++) {
			const date = new Date(startDate);
			date.setDate(date.getDate() + i);
			const dateStr = date.toISOString().split('T')[0];

			const existing = componentHistory.get(dateStr);
			const status = (existing?.status as DailyStatus['status']) || 'operational';

			days.push({
				date: dateStr,
				status,
				incidentCount: existing?.incident_count || 0
			});

			// Calculate weighted uptime
			uptimeSum += UPTIME_WEIGHTS[status] ?? 1.0;
		}

		// Calculate weighted uptime percentage
		const uptimePercentage = (uptimeSum / days.length) * 100;

		histories.push({
			componentId: component.id,
			componentName: component.name,
			days,
			uptimePercentage
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
 * Get recent incidents with all updates in optimized batch queries
 * Reduces N+1 queries by fetching all updates and components in bulk
 */
export async function getRecentIncidentsWithUpdates(
	db: D1Database,
	days: number = 30
): Promise<IncidentWithDetails[]> {
	const cutoffDate = new Date();
	cutoffDate.setDate(cutoffDate.getDate() - days);

	// Get all incidents in the date range
	const incidentsResult = await db
		.prepare(`
			SELECT * FROM status_incidents
			WHERE started_at >= ?
			ORDER BY started_at DESC
			LIMIT ?
		`)
		.bind(cutoffDate.toISOString(), MAX_BATCH_SIZE)
		.all<StatusIncident>();

	const incidents = incidentsResult.results || [];
	if (incidents.length === 0) return [];

	const incidentIds = incidents.map((i) => i.id);

	// Defense-in-depth: validate all IDs are proper UUIDs
	if (!validateUUIDs(incidentIds)) {
		console.error('[status] Invalid UUID detected in incident IDs, aborting batch query');
		return [];
	}

	// SAFETY: This dynamic SQL is safe because:
	// 1. incidentIds are UUIDs retrieved from a trusted database query above
	// 2. All IDs are validated as proper UUIDs before use
	// 3. The parameterized bindings ensure proper escaping
	// 4. D1 doesn't support array parameters natively, so this pattern is required
	// Batch fetch all updates for these incidents
	const updatesResult = await db
		.prepare(`
			SELECT * FROM status_updates
			WHERE incident_id IN (${incidentIds.map(() => '?').join(',')})
			ORDER BY created_at DESC
		`)
		.bind(...incidentIds)
		.all<StatusUpdate>();

	// SAFETY: Same as above - incidentIds are validated UUIDs from database
	// Batch fetch all component relationships
	const componentRelationsResult = await db
		.prepare(`
			SELECT ic.incident_id, c.*
			FROM status_incident_components ic
			INNER JOIN status_components c ON c.id = ic.component_id
			WHERE ic.incident_id IN (${incidentIds.map(() => '?').join(',')})
			ORDER BY c.display_order ASC
		`)
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
		components: componentsByIncident.get(incident.id) || []
	}));
}

/**
 * Get all data needed for the main status page
 * Optimized to minimize database queries
 */
export async function getStatusPageData(db: D1Database) {
	// Parallel fetch of independent data
	const [components, scheduledMaintenance, uptimeHistory] = await Promise.all([
		getComponents(db),
		getScheduledMaintenance(db),
		getUptimeHistory(db)
	]);

	// Get all recent incidents with their updates and components in batch
	const allIncidentsWithDetails = await getRecentIncidentsWithUpdates(db, 30);

	// Split into active and resolved
	const activeIncidents = allIncidentsWithDetails.filter((i) => !i.resolved_at);
	const recentIncidents = allIncidentsWithDetails;

	return {
		status: calculateOverallStatus(components),
		components,
		activeIncidents,
		recentIncidents,
		scheduledMaintenance,
		uptimeHistory,
		updatedAt: new Date().toISOString()
	};
}
