/**
 * Sentinel Scheduler
 *
 * Manages scheduled stress tests and integrates with Cloudflare's
 * cron triggers for automated infrastructure validation.
 */

import type {
  SentinelSchedule,
  LoadProfile,
  D1Database,
  KVNamespace,
  R2Bucket,
} from "./types.js";
import { SentinelRunner, createSentinelRun } from "./runner.js";

// =============================================================================
// SCHEDULE MANAGEMENT
// =============================================================================

/**
 * Create a new sentinel schedule
 */
export async function createSchedule(
  db: D1Database,
  tenantId: string,
  data: {
    name: string;
    description?: string;
    cronExpression: string;
    timezone?: string;
    profile: LoadProfile;
    enableMaintenanceMode?: boolean;
    maintenanceMessage?: string;
    alertOnFailure?: boolean;
    alertEmail?: string;
  },
): Promise<SentinelSchedule> {
  const id = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);

  // Calculate next run time based on cron expression
  const nextRunAt = calculateNextRun(
    data.cronExpression,
    data.timezone ?? "UTC",
  );

  await db
    .prepare(
      `INSERT INTO sentinel_schedules (
        id, tenant_id, name, description, cron_expression, timezone,
        profile_type, target_operations, duration_seconds, concurrency, target_systems,
        enable_maintenance_mode, maintenance_message,
        is_active, next_run_at, alert_on_failure, alert_email,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      tenantId,
      data.name,
      data.description ?? null,
      data.cronExpression,
      data.timezone ?? "UTC",
      data.profile.type,
      data.profile.targetOperations,
      data.profile.durationSeconds,
      data.profile.concurrency,
      JSON.stringify(data.profile.targetSystems),
      data.enableMaintenanceMode ? 1 : 0,
      data.maintenanceMessage ??
        "Scheduled infrastructure validation in progress",
      1, // is_active
      nextRunAt ? Math.floor(nextRunAt.getTime() / 1000) : null,
      data.alertOnFailure ? 1 : 0,
      data.alertEmail ?? null,
      now,
      now,
    )
    .run();

  return {
    id,
    tenantId,
    name: data.name,
    description: data.description,
    cronExpression: data.cronExpression,
    timezone: data.timezone ?? "UTC",
    profile: data.profile,
    enableMaintenanceMode: data.enableMaintenanceMode ?? true,
    maintenanceMessage: data.maintenanceMessage,
    isActive: true,
    nextRunAt: nextRunAt ?? undefined,
    alertOnFailure: data.alertOnFailure ?? true,
    alertEmail: data.alertEmail,
    createdAt: new Date(now * 1000),
    updatedAt: new Date(now * 1000),
  };
}

/**
 * Get all schedules for a tenant
 */
export async function listSchedules(
  db: D1Database,
  tenantId: string,
  options?: { activeOnly?: boolean },
): Promise<SentinelSchedule[]> {
  let query = "SELECT * FROM sentinel_schedules WHERE tenant_id = ?";
  const params: unknown[] = [tenantId];

  if (options?.activeOnly) {
    query += " AND is_active = 1";
  }

  query += " ORDER BY next_run_at ASC";

  const result = await db
    .prepare(query)
    .bind(...params)
    .all<Record<string, unknown>>();
  return result.results.map(mapScheduleRow);
}

/**
 * Get a schedule by ID
 */
export async function getSchedule(
  db: D1Database,
  scheduleId: string,
): Promise<SentinelSchedule | null> {
  const row = await db
    .prepare("SELECT * FROM sentinel_schedules WHERE id = ?")
    .bind(scheduleId)
    .first<Record<string, unknown>>();

  return row ? mapScheduleRow(row) : null;
}

/**
 * Update a schedule
 */
export async function updateSchedule(
  db: D1Database,
  scheduleId: string,
  data: Partial<{
    name: string;
    description: string;
    cronExpression: string;
    timezone: string;
    isActive: boolean;
    enableMaintenanceMode: boolean;
    maintenanceMessage: string;
    alertOnFailure: boolean;
    alertEmail: string;
  }>,
): Promise<void> {
  const updates: string[] = [];
  const params: unknown[] = [];

  if (data.name !== undefined) {
    updates.push("name = ?");
    params.push(data.name);
  }
  if (data.description !== undefined) {
    updates.push("description = ?");
    params.push(data.description);
  }
  if (data.cronExpression !== undefined) {
    updates.push("cron_expression = ?");
    params.push(data.cronExpression);
    // Recalculate next run time
    const nextRun = calculateNextRun(
      data.cronExpression,
      data.timezone ?? "UTC",
    );
    updates.push("next_run_at = ?");
    params.push(nextRun ? Math.floor(nextRun.getTime() / 1000) : null);
  }
  if (data.timezone !== undefined) {
    updates.push("timezone = ?");
    params.push(data.timezone);
  }
  if (data.isActive !== undefined) {
    updates.push("is_active = ?");
    params.push(data.isActive ? 1 : 0);
  }
  if (data.enableMaintenanceMode !== undefined) {
    updates.push("enable_maintenance_mode = ?");
    params.push(data.enableMaintenanceMode ? 1 : 0);
  }
  if (data.maintenanceMessage !== undefined) {
    updates.push("maintenance_message = ?");
    params.push(data.maintenanceMessage);
  }
  if (data.alertOnFailure !== undefined) {
    updates.push("alert_on_failure = ?");
    params.push(data.alertOnFailure ? 1 : 0);
  }
  if (data.alertEmail !== undefined) {
    updates.push("alert_email = ?");
    params.push(data.alertEmail);
  }

  if (updates.length === 0) return;

  updates.push("updated_at = ?");
  params.push(Math.floor(Date.now() / 1000));
  params.push(scheduleId);

  await db
    .prepare(`UPDATE sentinel_schedules SET ${updates.join(", ")} WHERE id = ?`)
    .bind(...params)
    .run();
}

/**
 * Delete a schedule
 */
export async function deleteSchedule(
  db: D1Database,
  scheduleId: string,
): Promise<void> {
  await db
    .prepare("DELETE FROM sentinel_schedules WHERE id = ?")
    .bind(scheduleId)
    .run();
}

// =============================================================================
// CRON TRIGGER HANDLER
// =============================================================================

/**
 * Handle scheduled event from Cloudflare cron trigger
 * This should be called from the scheduled() export in worker
 */
export async function handleScheduledEvent(
  db: D1Database,
  kv: KVNamespace,
  r2: R2Bucket,
  ctx: { waitUntil(promise: Promise<unknown>): void },
  clearingConfig?: { apiUrl: string; apiKey: string },
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);

  // Find schedules that are due to run
  const dueSchedules = await db
    .prepare(
      `SELECT * FROM sentinel_schedules
       WHERE is_active = 1
       AND next_run_at IS NOT NULL
       AND next_run_at <= ?
       ORDER BY next_run_at ASC
       LIMIT 5`,
    )
    .bind(now)
    .all<Record<string, unknown>>();

  for (const row of dueSchedules.results) {
    const schedule = mapScheduleRow(row);

    try {
      // Create a new run
      const run = await createSentinelRun(
        db,
        schedule.tenantId,
        `${schedule.name} - Scheduled Run`,
        schedule.profile,
        {
          description: `Automatically triggered by schedule: ${schedule.id}`,
          triggeredBy: "scheduled",
        },
      );

      // Update schedule with last run info
      const nextRun = calculateNextRun(
        schedule.cronExpression,
        schedule.timezone,
      );
      await db
        .prepare(
          `UPDATE sentinel_schedules
           SET last_run_at = ?, last_run_id = ?, next_run_at = ?, updated_at = ?
           WHERE id = ?`,
        )
        .bind(
          now,
          run.id,
          nextRun ? Math.floor(nextRun.getTime() / 1000) : null,
          now,
          schedule.id,
        )
        .run();

      // Enable maintenance mode if configured
      if (schedule.enableMaintenanceMode) {
        await enableMaintenanceMode(
          clearingConfig ?? null,
          schedule.tenantId,
          schedule.maintenanceMessage,
        );
      }

      // Execute the run in background
      const runner = new SentinelRunner({
        db,
        kv,
        r2,
        tenantId: schedule.tenantId,
        ctx,
        onComplete: async (results) => {
          // Disable maintenance mode after completion
          if (schedule.enableMaintenanceMode) {
            await disableMaintenanceMode(
              clearingConfig ?? null,
              schedule.tenantId,
            );
          }

          // Update clearing status with results
          await updateClearingFromResults(
            clearingConfig ?? null,
            schedule.tenantId,
            run.id,
            results,
          );

          // Send alert if failure rate exceeds threshold
          // TODO: Make threshold configurable per-schedule (currently hardcoded at 10%)
          const errorRateThreshold = 0.1;
          const totalOps =
            results.failedOperations + results.successfulOperations;
          const errorRate =
            totalOps > 0 ? results.failedOperations / totalOps : 0;

          if (schedule.alertOnFailure && errorRate > errorRateThreshold) {
            console.log(
              `[Sentinel Scheduler] Alert: High failure rate (${(errorRate * 100).toFixed(1)}%) for schedule ${schedule.id}`,
            );
            // TODO: Implement email alerting via Resend
          }
        },
      });

      ctx.waitUntil(runner.execute(run));
    } catch (error) {
      console.error(
        `[Sentinel Scheduler] Error executing schedule ${schedule.id}:`,
        error,
      );
    }
  }
}

// =============================================================================
// CLEARING SERVICE INTEGRATION
// =============================================================================
// The Clearing is a separate service - communicate via API calls

interface ClearingConfig {
  apiUrl: string;
  apiKey: string;
}

/**
 * Enable maintenance mode via Clearing API
 */
async function enableMaintenanceMode(
  config: ClearingConfig | null,
  tenantId: string,
  message?: string,
): Promise<void> {
  if (!config) {
    console.log(
      `[Sentinel] Clearing not configured, skipping maintenance mode for tenant ${tenantId}`,
    );
    return;
  }

  try {
    const response = await fetch(`${config.apiUrl}/api/sentinel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        runId: `maintenance-${crypto.randomUUID()}`,
        tenantId,
        status: "completed",
        results: {
          totalOperations: 0,
          successfulOperations: 0,
          failedOperations: 0,
          errorRate: 0,
          avgLatencyMs: 0,
          p95LatencyMs: 0,
          throughputOpsPerSec: 0,
        },
        // Signal maintenance mode
        componentSlug: "blog-engine",
        createIncident: false,
      }),
    });

    if (!response.ok) {
      console.error(
        `[Sentinel] Failed to enable maintenance mode: ${response.status}`,
      );
    } else {
      console.log(`[Sentinel] Maintenance mode enabled: ${message}`);
    }
  } catch (error) {
    console.error("[Sentinel] Error enabling maintenance mode:", error);
  }
}

/**
 * Disable maintenance mode via Clearing API
 */
async function disableMaintenanceMode(
  config: ClearingConfig | null,
  tenantId: string,
): Promise<void> {
  if (!config) {
    console.log(
      `[Sentinel] Clearing not configured, skipping disable maintenance for tenant ${tenantId}`,
    );
    return;
  }

  // Setting status to operational after test
  try {
    const response = await fetch(`${config.apiUrl}/api/sentinel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        runId: `maintenance-end-${Date.now()}`,
        tenantId,
        status: "completed",
        results: {
          totalOperations: 1,
          successfulOperations: 1,
          failedOperations: 0,
          errorRate: 0,
          avgLatencyMs: 0,
          p95LatencyMs: 0,
          throughputOpsPerSec: 0,
        },
        createIncident: false,
      }),
    });

    if (!response.ok) {
      console.error(
        `[Sentinel] Failed to disable maintenance mode: ${response.status}`,
      );
    } else {
      console.log("[Sentinel] Maintenance mode disabled");
    }
  } catch (error) {
    console.error("[Sentinel] Error disabling maintenance mode:", error);
  }
}

/**
 * Update Clearing status with sentinel results
 * Creates an incident if error rate is high
 */
async function updateClearingFromResults(
  config: ClearingConfig | null,
  tenantId: string,
  runId: string,
  results: {
    failedOperations: number;
    successfulOperations: number;
    avgLatencyMs?: number;
    p95LatencyMs?: number;
    throughputOpsPerSec?: number;
  },
): Promise<void> {
  const totalOps = results.successfulOperations + results.failedOperations;
  const errorRate = totalOps > 0 ? results.failedOperations / totalOps : 0;

  // Determine status based on error rate
  let status = "operational";
  if (errorRate > 0.5) {
    status = "major_outage";
  } else if (errorRate > 0.2) {
    status = "partial_outage";
  } else if (errorRate > 0.05) {
    status = "degraded";
  }

  console.log(
    `[Sentinel] Run ${runId} completed with status: ${status}, error rate: ${(errorRate * 100).toFixed(1)}%`,
  );

  if (!config) {
    console.log("[Sentinel] Clearing not configured, skipping status update");
    return;
  }

  try {
    const response = await fetch(`${config.apiUrl}/api/sentinel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        runId,
        tenantId,
        status: "completed",
        results: {
          totalOperations: totalOps,
          successfulOperations: results.successfulOperations,
          failedOperations: results.failedOperations,
          errorRate,
          avgLatencyMs: results.avgLatencyMs ?? 0,
          p95LatencyMs: results.p95LatencyMs ?? 0,
          throughputOpsPerSec: results.throughputOpsPerSec ?? 0,
        },
        // Create incident if error rate is significant
        createIncident: errorRate > 0.1,
      }),
    });

    if (!response.ok) {
      console.error(`[Sentinel] Failed to update Clearing: ${response.status}`);
    } else {
      const data = await response.json();
      console.log("[Sentinel] Clearing updated:", data);
    }
  } catch (error) {
    console.error("[Sentinel] Error updating Clearing:", error);
  }
}

// =============================================================================
// CRON EXPRESSION PARSING
// =============================================================================

/**
 * Calculate the next run time from a cron expression
 *
 * LIMITATIONS: This is a basic implementation that only handles:
 * - Specific values: "0", "30", "12"
 * - Wildcards: "*"
 * - Day of week: "0" (Sunday) through "6" (Saturday)
 *
 * NOT SUPPORTED (TODO: Consider using cron-parser library):
 * - Ranges: "1-5" (Monday through Friday)
 * - Lists: "1,3,5" (Monday, Wednesday, Friday)
 * - Step values: e.g. every 5 minutes syntax
 * - Month constraints
 * - Day of month constraints
 *
 * For complex scheduling requirements, migrate to a production cron library.
 */
function calculateNextRun(
  cronExpression: string,
  _timezone: string,
): Date | null {
  try {
    // Parse cron: minute hour day month dayOfWeek
    const parts = cronExpression.trim().split(/\s+/);
    if (parts.length !== 5) return null;

    const [minute, hour, _day, _month, dayOfWeek] = parts;

    const now = new Date();
    const next = new Date(now);

    // Reset seconds and milliseconds
    next.setSeconds(0);
    next.setMilliseconds(0);

    // Set specific hour/minute if provided
    if (minute !== "*") {
      next.setMinutes(parseInt(minute, 10));
    }
    if (hour !== "*") {
      next.setHours(parseInt(hour, 10));
    }

    // Handle day of week first (0 = Sunday)
    if (dayOfWeek !== "*") {
      const targetDay = parseInt(dayOfWeek, 10);
      const currentDay = next.getDay();
      let daysUntil = (targetDay - currentDay + 7) % 7;

      // If we're on the target day but time has passed, move to next week
      if (daysUntil === 0 && next <= now) {
        daysUntil = 7;
      }

      next.setDate(next.getDate() + daysUntil);
    } else {
      // No day constraint - if time has passed today, move to tomorrow
      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }
    }

    return next;
  } catch {
    return null;
  }
}

// =============================================================================
// ROW MAPPER
// =============================================================================

function mapScheduleRow(row: Record<string, unknown>): SentinelSchedule {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    name: row.name as string,
    description: row.description as string | undefined,
    cronExpression: row.cron_expression as string,
    timezone: (row.timezone as string) || "UTC",
    profile: {
      type: row.profile_type as LoadProfile["type"],
      targetOperations: row.target_operations as number,
      durationSeconds: row.duration_seconds as number,
      concurrency: row.concurrency as number,
      targetSystems: JSON.parse((row.target_systems as string) || "[]"),
    },
    enableMaintenanceMode: row.enable_maintenance_mode === 1,
    maintenanceMessage: row.maintenance_message as string | undefined,
    isActive: row.is_active === 1,
    lastRunAt: row.last_run_at
      ? new Date((row.last_run_at as number) * 1000)
      : undefined,
    lastRunId: row.last_run_id as string | undefined,
    nextRunAt: row.next_run_at
      ? new Date((row.next_run_at as number) * 1000)
      : undefined,
    alertOnFailure: row.alert_on_failure === 1,
    alertEmail: row.alert_email as string | undefined,
    createdAt: new Date((row.created_at as number) * 1000),
    updatedAt: new Date((row.updated_at as number) * 1000),
  };
}

// =============================================================================
// COMMON SCHEDULE PRESETS
// =============================================================================

/**
 * Create a weekly midnight stress test schedule
 */
export function getWeeklyMidnightScheduleConfig(): {
  cronExpression: string;
  name: string;
  description: string;
} {
  return {
    cronExpression: "0 0 * * 0", // Sunday at midnight
    name: "Weekly Infrastructure Validation",
    description: "Automated weekly stress test to validate system health",
  };
}

/**
 * Create a daily smoke test schedule
 */
export function getDailySmokeTestConfig(): {
  cronExpression: string;
  name: string;
  description: string;
} {
  return {
    cronExpression: "0 4 * * *", // 4 AM daily
    name: "Daily Smoke Test",
    description: "Quick daily validation of core functionality",
  };
}
