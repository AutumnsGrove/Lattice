/**
 * Incident Manager Module
 *
 * Handles incident creation, resolution, and component status updates.
 * Uses KV for tracking consecutive failures to prevent false positives.
 */

import type { HealthCheckResult } from "./health-checks";
import { INCIDENT_THRESHOLDS, EMAIL_FROM_ADDRESS, EMAIL_FROM_NAME } from "./config";
import { generateUUID } from "./utils";
import { recordCheckResult } from "./daily-history";
import { createZephyrClient } from "@autumnsgrove/lattice/zephyr";

/**
 * State tracked in KV for each component
 */
export interface ComponentState {
	consecutiveFailures: number;
	consecutiveSuccesses: number;
	activeIncidentId: string | null;
	lastStatus: string;
	lastCheckAt: string;
}

/**
 * Environment bindings required by incident manager
 */
export interface IncidentEnv {
	DB: D1Database;
	MONITOR_KV: KVNamespace;
	ZEPHYR_URL?: string;
	ZEPHYR_API_KEY?: string;
	ALERT_EMAIL?: string;
}

/**
 * Generate a URL-friendly slug from a title
 */
function generateSlug(title: string, timestamp: string): string {
	const dateStr = timestamp.split("T")[0]; // YYYY-MM-DD
	const slugifiedTitle = title
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "")
		.slice(0, 50);
	return `${dateStr}-${slugifiedTitle}`;
}

/**
 * Map component status to incident type and impact
 */
function getIncidentDetails(status: HealthCheckResult["status"]): {
	type: string;
	impact: string;
	title: string;
} {
	switch (status) {
		case "major_outage":
			return { type: "outage", impact: "critical", title: "Major Outage" };
		case "partial_outage":
			return { type: "outage", impact: "major", title: "Partial Outage" };
		case "degraded":
			return {
				type: "degraded",
				impact: "minor",
				title: "Degraded Performance",
			};
		default:
			return { type: "degraded", impact: "minor", title: "Performance Issue" };
	}
}

/**
 * Send email notification via Zephyr email gateway
 */
async function sendEmailAlert(env: IncidentEnv, subject: string, body: string): Promise<void> {
	if (!env.ZEPHYR_URL) {
		console.log("[Clearing Monitor] No ZEPHYR_URL configured, skipping email");
		return;
	}

	try {
		const zephyr = createZephyrClient(env);
		const result = await zephyr.sendRaw({
			to: env.ALERT_EMAIL || "alerts@grove.place",
			subject,
			html: `<pre style="font-family: monospace; white-space: pre-wrap;">${body}</pre>`,
			text: body,
			from: EMAIL_FROM_ADDRESS,
			fromName: EMAIL_FROM_NAME,
			type: "notification",
		});

		if (!result.success) {
			console.error(
				"[Clearing Monitor] Failed to send email:",
				result.errorCode,
				result.errorMessage,
			);
		}
	} catch (err) {
		console.error("[Clearing Monitor] Email error:", err);
	}
}

/**
 * Get component state from KV
 */
async function getComponentState(kv: KVNamespace, componentId: string): Promise<ComponentState> {
	const key = `monitor:${componentId}`;
	const data = await kv.get(key, "json");

	if (data) {
		return data as ComponentState;
	}

	// Default state for new components
	return {
		consecutiveFailures: 0,
		consecutiveSuccesses: 0,
		activeIncidentId: null,
		lastStatus: "operational",
		lastCheckAt: new Date().toISOString(),
	};
}

/**
 * Save component state to KV
 */
async function saveComponentState(
	kv: KVNamespace,
	componentId: string,
	state: ComponentState,
): Promise<void> {
	const key = `monitor:${componentId}`;
	await kv.put(key, JSON.stringify(state), {
		// Keep state for 7 days (in case cron stops running)
		expirationTtl: 7 * 24 * 60 * 60,
	});
}

/**
 * Create a new incident in D1
 */
async function createIncident(
	db: D1Database,
	componentId: string,
	componentName: string,
	result: HealthCheckResult,
): Promise<string> {
	const { type, impact, title } = getIncidentDetails(result.status);
	const incidentId = generateUUID();
	const now = new Date().toISOString();
	const fullTitle = `${componentName} - ${title}`;
	const slug = generateSlug(fullTitle, now);

	const updateId = generateUUID();
	const message = result.error
		? `Automated monitoring detected an issue: ${result.error}`
		: `Automated monitoring detected ${result.status.replace("_", " ")}. Investigating.`;

	await db.batch([
		db
			.prepare(
				`INSERT INTO status_incidents (id, title, slug, status, impact, type, started_at, created_at, updated_at)
         VALUES (?, ?, ?, 'investigating', ?, ?, ?, ?, ?)`,
			)
			.bind(incidentId, fullTitle, slug, impact, type, now, now, now),
		db
			.prepare(
				`INSERT INTO status_incident_components (incident_id, component_id)
         VALUES (?, ?)`,
			)
			.bind(incidentId, componentId),
		db
			.prepare(
				`INSERT INTO status_updates (id, incident_id, status, message, created_at)
         VALUES (?, ?, 'investigating', ?, ?)`,
			)
			.bind(updateId, incidentId, message, now),
	]);

	return incidentId;
}

/**
 * Resolve an existing incident in D1.
 * Returns false if the incident no longer exists (e.g., manually deleted).
 */
async function resolveIncident(
	db: D1Database,
	incidentId: string,
	message = "Service has recovered and is operating normally.",
): Promise<boolean> {
	// Verify incident exists before resolving
	const existing = await db
		.prepare(`SELECT id FROM status_incidents WHERE id = ? AND status != 'resolved'`)
		.bind(incidentId)
		.first();

	if (!existing) {
		console.warn(
			`[Clearing Monitor] Incident ${incidentId} not found or already resolved, skipping`,
		);
		return false;
	}

	const now = new Date().toISOString();
	const updateId = generateUUID();

	await db.batch([
		db
			.prepare(
				`UPDATE status_incidents
         SET status = 'resolved', resolved_at = ?, updated_at = ?
         WHERE id = ?`,
			)
			.bind(now, now, incidentId),
		db
			.prepare(
				`INSERT INTO status_updates (id, incident_id, status, message, created_at)
         VALUES (?, ?, 'resolved', ?, ?)`,
			)
			.bind(updateId, incidentId, message, now),
	]);

	return true;
}

/**
 * Update component status in D1
 */
async function updateComponentStatus(
	db: D1Database,
	componentId: string,
	status: string,
): Promise<void> {
	const now = new Date().toISOString();
	await db
		.prepare(
			`UPDATE status_components
			 SET current_status = ?, updated_at = ?
			 WHERE id = ?`,
		)
		.bind(status, now, componentId)
		.run();
}

/**
 * Stamp the time of this check. Written on every check, changed or not, so the
 * page can tell "operational as of two minutes ago" apart from "last seen
 * operational three days ago".
 */
async function touchComponentCheck(
	db: D1Database,
	componentId: string,
	checkedAt: string,
): Promise<void> {
	await db
		.prepare(`UPDATE status_components SET last_check_at = ? WHERE id = ?`)
		.bind(checkedAt, componentId)
		.run();
}

/**
 * Every incident still open for a component, straight from D1.
 *
 * The old code trusted a single `activeIncidentId` in KV, with a 7-day TTL.
 * Lose that key — expiry, eviction, a corrupt write — and the incident became
 * unreachable and unclosable forever, which is how a single flaky check in
 * November was still "ongoing" weeks later. D1 is the record of truth.
 */
async function findOpenIncidents(
	db: D1Database,
	componentId: string,
): Promise<Array<{ id: string; title: string }>> {
	const result = await db
		.prepare(
			`SELECT i.id, i.title
			 FROM status_incidents i
			 INNER JOIN status_incident_components ic ON i.id = ic.incident_id
			 WHERE ic.component_id = ? AND i.resolved_at IS NULL
			 ORDER BY i.started_at ASC`,
		)
		.bind(componentId)
		.all<{ id: string; title: string }>();

	return result.results ?? [];
}

/**
 * Process a health check result and manage incidents accordingly
 */
export async function processHealthCheckResult(
	env: IncidentEnv,
	result: HealthCheckResult,
): Promise<void> {
	// Record this check's raw outcome toward today's average, independent of
	// the debounced incident/current-status logic below — a single blip should
	// barely move the day's status, not freeze it at "worst status seen".
	//
	// History is a record, not a gate: if this write fails, the component must
	// still get its status and incident handling. Before, a D1 hiccup here threw
	// out of the whole function and silently froze a component's status forever.
	try {
		await recordCheckResult(env, result.componentId, result.status);
	} catch (err) {
		console.error(
			`[Clearing Monitor] Failed to record check history for ${result.componentName}:`,
			err instanceof Error ? err.message : String(err),
		);
	}

	const state = await getComponentState(env.MONITOR_KV, result.componentId);
	const isHealthy = result.status === "operational";
	const isMaintenance = result.status === "maintenance";

	// The timestamp is bookkeeping, not a gate: if the column isn't there yet
	// (migration 0012 lands separately from this deploy), a missing stamp must
	// not stop the component's status and incidents from being handled.
	try {
		await touchComponentCheck(env.DB, result.componentId, result.timestamp);
	} catch (err) {
		console.error(
			`[Clearing Monitor] Failed to stamp last_check_at for ${result.componentName}:`,
			err instanceof Error ? err.message : String(err),
		);
	}

	// Maintenance is intentional — just update status, no incidents
	if (isMaintenance) {
		await updateComponentStatus(env.DB, result.componentId, "maintenance");
		state.lastStatus = result.status;
		state.lastCheckAt = result.timestamp;
		await saveComponentState(env.MONITOR_KV, result.componentId, state);
		return;
	}

	if (isHealthy) {
		// Reset failure counter, increment success counter
		state.consecutiveFailures = 0;
		state.consecutiveSuccesses++;

		// Update component status after meeting the success threshold
		// (prevents flapping from a single lucky check)
		if (state.consecutiveSuccesses >= INCIDENT_THRESHOLDS.SUCCESSES_TO_RESOLVE) {
			await updateComponentStatus(env.DB, result.componentId, "operational");

			// Resolve whatever is open for this component, not just the one
			// incident KV happens to remember.
			const openIncidents = await findOpenIncidents(env.DB, result.componentId);
			let resolvedCount = 0;

			for (const incident of openIncidents) {
				console.log(
					`[Clearing Monitor] Resolving incident ${incident.id} (${incident.title}) for ${result.componentName}`,
				);

				const resolved = await resolveIncident(env.DB, incident.id);
				if (resolved) resolvedCount++;
			}

			if (resolvedCount > 0) {
				void sendEmailAlert(
					env,
					`[Grove] Resolved: ${result.componentName} back to operational`,
					`Service: ${result.componentName}\n` +
						`Status: Operational\n` +
						`Time: ${result.timestamp}\n` +
						`Latency: ${result.latencyMs}ms\n` +
						`Incidents resolved: ${resolvedCount}\n\n` +
						`The service has recovered and is operating normally.`,
				).catch((err) =>
					console.error("[Clearing Monitor] Recovery email failed:", err, {
						component: result.componentName,
						status: "operational",
					}),
				);
			}

			state.activeIncidentId = null;
		}
	} else {
		// Reset success counter, increment failure counter
		state.consecutiveSuccesses = 0;
		state.consecutiveFailures++;

		// Only update component status after meeting the degradation threshold
		// (prevents flapping from a single slow check due to CF-to-CF latency)
		if (state.consecutiveFailures >= INCIDENT_THRESHOLDS.CHECKS_TO_DEGRADE) {
			await updateComponentStatus(env.DB, result.componentId, result.status);
		}

		// Check if we should create a new incident
		if (state.consecutiveFailures >= INCIDENT_THRESHOLDS.FAILURES_TO_CREATE) {
			const openIncidents = await findOpenIncidents(env.DB, result.componentId);

			if (openIncidents.length > 0) {
				// Already tracked. Re-adopt it in KV so local state stops drifting.
				state.activeIncidentId = openIncidents[0].id;
			} else if (result.latencyDegraded) {
				// Slow but answering 200 with a valid body. That colours the day and
				// shows the component as degraded; it is not a public incident and it
				// is not worth waking anyone for.
				console.log(
					`[Clearing Monitor] ${result.componentName} slow (${result.latencyMs}ms) — recorded as degraded, no incident`,
				);
			} else {
				console.log(
					`[Clearing Monitor] Creating incident for ${result.componentName} after ${state.consecutiveFailures} failures`,
				);

				const incidentId = await createIncident(
					env.DB,
					result.componentId,
					result.componentName,
					result,
				);

				// Fire-and-forget incident email
				void sendEmailAlert(
					env,
					`[Grove] Incident: ${result.componentName} - ${result.status.replace("_", " ")}`,
					`Service: ${result.componentName}\n` +
						`Status: ${result.status.replace("_", " ")}\n` +
						`Time: ${result.timestamp}\n` +
						`Latency: ${result.latencyMs}ms\n` +
						`Error: ${result.error || "N/A"}\n\n` +
						`Automated monitoring has detected an issue and created an incident.`,
				).catch((err) =>
					console.error("[Clearing Monitor] Incident email failed:", err, {
						component: result.componentName,
						status: result.status,
					}),
				);

				state.activeIncidentId = incidentId;
			}
		}
	}

	// Update state
	state.lastStatus = result.status;
	state.lastCheckAt = result.timestamp;
	await saveComponentState(env.MONITOR_KV, result.componentId, state);
}

/**
 * Close incidents that have outlived their component's trouble.
 *
 * A backstop, not the main path — recovery closes incidents within a couple of
 * checks. This catches the residue: an incident left open for a component that
 * has been operational for longer than `maxAgeHours`, usually because the
 * monitor or its KV state was lost mid-incident.
 */
export async function closeStaleIncidents(env: IncidentEnv, maxAgeHours = 24): Promise<number> {
	const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000).toISOString();

	const result = await env.DB.prepare(
		`SELECT i.id, i.title, c.name AS component_name, i.started_at
		 FROM status_incidents i
		 INNER JOIN status_incident_components ic ON i.id = ic.incident_id
		 INNER JOIN status_components c ON c.id = ic.component_id
		 WHERE i.resolved_at IS NULL
		   AND i.started_at < ?
		   AND c.current_status = 'operational'`,
	)
		.bind(cutoff)
		.all<{ id: string; title: string; component_name: string; started_at: string }>();

	const stale = result.results ?? [];
	let closed = 0;

	for (const incident of stale) {
		const message =
			`${incident.component_name} has been reporting operational since this incident began, ` +
			`so automated monitoring is closing it. If that doesn't match what you saw, ` +
			`reopen it with what actually broke.`;

		const resolved = await resolveIncident(env.DB, incident.id, message);
		if (resolved) {
			closed++;
			console.log(
				`[Clearing Monitor] Closed stale incident ${incident.id} (${incident.title}), open since ${incident.started_at}`,
			);
		}
	}

	return closed;
}

/**
 * Process all health check results in parallel
 */
export async function processAllResults(
	env: IncidentEnv,
	results: HealthCheckResult[],
): Promise<void> {
	const outcomes = await Promise.allSettled(
		results.map((result) => processHealthCheckResult(env, result)),
	);

	for (let i = 0; i < outcomes.length; i++) {
		const outcome = outcomes[i];
		if (outcome.status === "rejected") {
			console.error(
				`[Clearing Monitor] Failed to process ${results[i].componentName}:`,
				outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason),
			);
		}
	}
}
