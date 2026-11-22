/**
 * Type definitions for Grove Clearing (Status Page)
 */

/**
 * Component status levels
 */
export type ComponentStatus =
	| "operational" // Green - Everything working normally
	| "degraded" // Yellow - Slower than usual, but functional
	| "partial_outage" // Orange - Some functionality unavailable
	| "major_outage" // Red - Component is down
	| "maintenance"; // Blue - Planned maintenance in progress

/**
 * How a single day in the uptime chart is summarised.
 *
 * "unknown" means we have no check data for that day — either the monitor
 * didn't run or the day predates per-check history. It is deliberately
 * distinct from "operational": an absence of evidence is not evidence that
 * everything was fine, and it must never inflate an uptime percentage.
 */
export type DailyStatusKind = ComponentStatus | "unknown";

/**
 * Incident status lifecycle
 */
export type IncidentStatus =
	| "investigating" // We're aware and looking into it
	| "identified" // Root cause found, working on fix
	| "monitoring" // Fix deployed, watching for stability
	| "resolved"; // Issue fully resolved

/**
 * Incident impact levels
 */
export type IncidentImpact = "none" | "minor" | "major" | "critical";

/**
 * Incident types
 */
export type IncidentType =
	| "outage" // Service unavailable
	| "degraded" // Service slow or unreliable
	| "maintenance" // Scheduled work
	| "security"; // Security-related issue

/**
 * Scheduled maintenance status
 */
export type ScheduledStatus = "scheduled" | "in_progress" | "completed";

/**
 * A trackable platform component
 */
export interface StatusComponent {
	id: string;
	name: string;
	slug: string;
	description: string | null;
	display_order: number;
	current_status: ComponentStatus;
	created_at: string;
	/** Written on every health check; null for components never checked. */
	last_check_at?: string | null;
	updated_at: string;
}

/**
 * An incident (outage, maintenance, etc.)
 */
export interface StatusIncident {
	id: string;
	title: string;
	slug: string;
	status: IncidentStatus;
	impact: IncidentImpact;
	type: IncidentType;
	started_at: string;
	resolved_at: string | null;
	created_at: string;
	updated_at: string;
}

/**
 * An update posted to an incident
 */
export interface StatusUpdate {
	id: string;
	incident_id: string;
	status: IncidentStatus;
	message: string;
	created_at: string;
}

/**
 * Scheduled maintenance announcement
 */
export interface ScheduledMaintenance {
	id: string;
	title: string;
	description: string | null;
	scheduled_start: string;
	scheduled_end: string;
	components: string[]; // JSON array of component IDs
	status: ScheduledStatus;
	created_at: string;
}

/**
 * Incident with its associated components and updates
 */
export interface IncidentWithDetails extends StatusIncident {
	components: StatusComponent[];
	updates: StatusUpdate[];
}

/**
 * Overall platform status (derived from components)
 */
export type OverallStatus =
	| "operational" // All components operational
	| "degraded" // Some components degraded
	| "partial_outage" // Partial outage in progress
	| "major_outage" // Major outage in progress
	| "maintenance"; // Under maintenance

/**
 * API response for current status
 */
export interface CurrentStatusResponse {
	status: OverallStatus;
	components: StatusComponent[];
	activeIncidents: StatusIncident[];
	scheduledMaintenance: ScheduledMaintenance[];
	updatedAt: string;
}

/**
 * Daily status record for uptime visualization
 */
export interface DailyStatus {
	date: string; // YYYY-MM-DD
	status: DailyStatusKind;
	incidentCount: number;
}

/**
 * 90-day uptime data for a component
 */
export interface UptimeHistory {
	componentId: string;
	componentName: string;
	days: DailyStatus[];
	/** Percentage over days that have data. Null when no day is measurable. */
	uptimePercentage: number | null;
	/** Days with a known status, i.e. the denominator behind the percentage. */
	countedDays: number;
}

/**
 * Everything the status page renders, minus the page-only extras
 * (backup status, grove messages, mock flag).
 *
 * Both the real loader and the mock loader return this shape, so drift between
 * them shows up as a type error at the mock instead of as a confusing union
 * deeper in the page.
 */
export interface StatusPageData {
	status: OverallStatus;
	components: StatusComponent[];
	activeIncidents: IncidentWithDetails[];
	recentIncidents: IncidentWithDetails[];
	scheduledMaintenance: ScheduledMaintenance[];
	uptimeHistory: UptimeHistory[];
	/** Newest health check across all components, null if none ever ran. */
	lastCheckAt: string | null;
	/** True when the newest check is older than the staleness window. */
	monitorStale: boolean;
	updatedAt: string;
}

/**
 * Helper to get display label for status
 */
export function getStatusLabel(status: DailyStatusKind): string {
	const labels: Record<DailyStatusKind, string> = {
		operational: "Operational",
		degraded: "Degraded Performance",
		partial_outage: "Partial Outage",
		major_outage: "Major Outage",
		maintenance: "Under Maintenance",
		unknown: "No data",
	};
	return labels[status];
}

/**
 * Helper to get display label for incident status
 */
export function getIncidentStatusLabel(status: IncidentStatus): string {
	const labels: Record<IncidentStatus, string> = {
		investigating: "Investigating",
		identified: "Identified",
		monitoring: "Monitoring",
		resolved: "Resolved",
	};
	return labels[status];
}

/**
 * Calculate overall status from component statuses
 *
 * Maintenance is excluded from the overall calculation — a single service
 * in scheduled maintenance shouldn't override the banner when everything
 * else is healthy. Only if ALL components are in maintenance does the
 * overall status show maintenance.
 */
export function calculateOverallStatus(components: StatusComponent[]): OverallStatus {
	if (components.length === 0) return "operational";

	const activeComponents = components.filter((c) => c.current_status !== "maintenance");

	// All components in maintenance — show maintenance
	if (activeComponents.length === 0) return "maintenance";

	const hasOutage = activeComponents.some((c) => c.current_status === "major_outage");
	if (hasOutage) return "major_outage";

	const hasPartial = activeComponents.some((c) => c.current_status === "partial_outage");
	if (hasPartial) return "partial_outage";

	const hasDegraded = activeComponents.some((c) => c.current_status === "degraded");
	if (hasDegraded) return "degraded";

	return "operational";
}
