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
		components: JSON.parse(m.components as unknown as string || '[]')
	}));
}

/**
 * Get 90-day uptime history for all components
 */
export async function getUptimeHistory(db: D1Database): Promise<UptimeHistory[]> {
	const components = await getComponents(db);
	const histories: UptimeHistory[] = [];

	// Calculate date range
	const today = new Date();
	const startDate = new Date();
	startDate.setDate(startDate.getDate() - 90);

	for (const component of components) {
		// Get daily history from database
		const historyResult = await db
			.prepare(`
				SELECT * FROM status_daily_history
				WHERE component_id = ? AND date >= ?
				ORDER BY date ASC
			`)
			.bind(component.id, startDate.toISOString().split('T')[0])
			.all<{ date: string; status: string; incident_count: number }>();

		const existingDays = new Map(
			(historyResult.results || []).map((d) => [d.date, d])
		);

		// Fill in all 90 days (default to operational if no record)
		const days: DailyStatus[] = [];
		for (let i = 0; i < 90; i++) {
			const date = new Date(startDate);
			date.setDate(date.getDate() + i);
			const dateStr = date.toISOString().split('T')[0];

			const existing = existingDays.get(dateStr);
			days.push({
				date: dateStr,
				status: (existing?.status as DailyStatus['status']) || 'operational',
				incidentCount: existing?.incident_count || 0
			});
		}

		// Calculate uptime percentage
		const operationalDays = days.filter((d) => d.status === 'operational').length;
		const uptimePercentage = (operationalDays / days.length) * 100;

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
 * Get all data needed for the main status page
 */
export async function getStatusPageData(db: D1Database) {
	const [components, activeIncidents, recentIncidents, scheduledMaintenance, uptimeHistory] =
		await Promise.all([
			getComponents(db),
			getActiveIncidents(db),
			getRecentIncidents(db, 30),
			getScheduledMaintenance(db),
			getUptimeHistory(db)
		]);

	// Get updates for each active incident
	const activeIncidentsWithDetails = await Promise.all(
		activeIncidents.map(async (incident) => {
			const [components, updates] = await Promise.all([
				getIncidentComponents(db, incident.id),
				getIncidentUpdates(db, incident.id)
			]);
			return { ...incident, components, updates };
		})
	);

	// Get updates for recent resolved incidents
	const recentIncidentsWithDetails = await Promise.all(
		recentIncidents.map(async (incident) => {
			const [components, updates] = await Promise.all([
				getIncidentComponents(db, incident.id),
				getIncidentUpdates(db, incident.id)
			]);
			return { ...incident, components, updates };
		})
	);

	return {
		status: calculateOverallStatus(components),
		components,
		activeIncidents: activeIncidentsWithDetails,
		recentIncidents: recentIncidentsWithDetails,
		scheduledMaintenance,
		uptimeHistory,
		updatedAt: new Date().toISOString()
	};
}
