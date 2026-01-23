/**
 * Incident Manager Module
 *
 * Handles incident creation, resolution, and component status updates.
 * Uses KV for tracking consecutive failures to prevent false positives.
 */

import type { HealthCheckResult } from "./health-checks";
import { INCIDENT_THRESHOLDS, EMAIL_FROM } from "./config";
import { generateUUID } from "./utils";

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
  RESEND_API_KEY?: string;
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
 * Send email notification via Resend
 */
async function sendEmailAlert(
  env: IncidentEnv,
  subject: string,
  body: string,
): Promise<void> {
  if (!env.RESEND_API_KEY) {
    console.log(
      "[Clearing Monitor] No RESEND_API_KEY configured, skipping email",
    );
    return;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [env.ALERT_EMAIL || "alerts@grove.place"],
        subject,
        text: body,
      }),
    });

    if (!response.ok) {
      console.error(
        "[Clearing Monitor] Failed to send email:",
        await response.text(),
      );
    }
  } catch (err) {
    console.error("[Clearing Monitor] Email error:", err);
  }
}

/**
 * Get component state from KV
 */
async function getComponentState(
  kv: KVNamespace,
  componentId: string,
): Promise<ComponentState> {
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
): Promise<boolean> {
  // Verify incident exists before resolving
  const existing = await db
    .prepare(
      `SELECT id FROM status_incidents WHERE id = ? AND status != 'resolved'`,
    )
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
         VALUES (?, ?, 'resolved', 'Service has recovered and is operating normally.', ?)`,
      )
      .bind(updateId, incidentId, now),
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
 * Process a health check result and manage incidents accordingly
 */
export async function processHealthCheckResult(
  env: IncidentEnv,
  result: HealthCheckResult,
): Promise<void> {
  const state = await getComponentState(env.MONITOR_KV, result.componentId);
  const isHealthy = result.status === "operational";

  if (isHealthy) {
    // Reset failure counter, increment success counter
    state.consecutiveFailures = 0;
    state.consecutiveSuccesses++;

    // Check if we should resolve an active incident
    if (
      state.activeIncidentId &&
      state.consecutiveSuccesses >= INCIDENT_THRESHOLDS.SUCCESSES_TO_RESOLVE
    ) {
      console.log(
        `[Clearing Monitor] Resolving incident ${state.activeIncidentId} for ${result.componentName}`,
      );

      const resolved = await resolveIncident(env.DB, state.activeIncidentId);
      await updateComponentStatus(env.DB, result.componentId, "operational");

      // Only send email if the incident was actually resolved
      if (resolved) {
        void sendEmailAlert(
          env,
          `[Grove] Resolved: ${result.componentName} back to operational`,
          `Service: ${result.componentName}\n` +
            `Status: Operational\n` +
            `Time: ${result.timestamp}\n` +
            `Latency: ${result.latencyMs}ms\n\n` +
            `The service has recovered and is operating normally.`,
        ).catch((err) =>
          console.error("[Clearing Monitor] Email send failed:", err),
        );
      }

      state.activeIncidentId = null;
    }
  } else {
    // Reset success counter, increment failure counter
    state.consecutiveSuccesses = 0;
    state.consecutiveFailures++;

    // Always update component status in D1
    await updateComponentStatus(env.DB, result.componentId, result.status);

    // Check if we should create a new incident
    if (
      !state.activeIncidentId &&
      state.consecutiveFailures >= INCIDENT_THRESHOLDS.FAILURES_TO_CREATE
    ) {
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
        console.error("[Clearing Monitor] Email send failed:", err),
      );

      state.activeIncidentId = incidentId;
    }
  }

  // Update state
  state.lastStatus = result.status;
  state.lastCheckAt = result.timestamp;
  await saveComponentState(env.MONITOR_KV, result.componentId, state);
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
        outcome.reason instanceof Error
          ? outcome.reason.message
          : String(outcome.reason),
      );
    }
  }
}
