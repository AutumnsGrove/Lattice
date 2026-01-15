/**
 * The Clearing - Grove Status Page (Server)
 *
 * Public status page showing system health, recent sentinel test results,
 * and any active incidents or maintenance windows.
 */

import type { PageServerLoad } from './$types.js';
import type { ClearingStatus, ClearingIncident, SentinelRun } from '$lib/sentinel/types.js';

export const load: PageServerLoad = async ({ platform, locals }) => {
  if (!platform?.env?.DB) {
    return {
      status: null,
      recentRuns: [],
      incidents: [],
      error: 'Database not configured',
    };
  }

  const tenantId = locals.tenantId ?? 'default';
  const db = platform.env.DB;

  try {
    // Fetch current status
    const statusRow = await db
      .prepare('SELECT * FROM clearing_status WHERE tenant_id = ?')
      .bind(tenantId)
      .first<Record<string, unknown>>();

    // Fetch recent sentinel runs (completed only, for public display)
    const runsResult = await db
      .prepare(
        `SELECT id, name, profile_type, status, started_at, completed_at,
                total_operations, successful_operations, failed_operations,
                avg_latency_ms, p95_latency_ms, throughput_ops_sec
         FROM sentinel_runs
         WHERE tenant_id = ? AND status = 'completed'
         ORDER BY completed_at DESC
         LIMIT 5`
      )
      .bind(tenantId)
      .all<Record<string, unknown>>();

    // Fetch active incidents
    const incidentsResult = await db
      .prepare(
        `SELECT * FROM clearing_incidents
         WHERE tenant_id = ? AND is_public = 1
         AND (status != 'resolved' OR resolved_at > ?)
         ORDER BY started_at DESC
         LIMIT 10`
      )
      .bind(tenantId, Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60) // Show resolved incidents from last 7 days
      .all<Record<string, unknown>>();

    // Map status
    const status: ClearingStatus | null = statusRow ? {
      id: statusRow.id as string,
      tenantId: statusRow.tenant_id as string,
      overallStatus: (statusRow.overall_status as ClearingStatus['overallStatus']) ?? 'operational',
      componentStatuses: JSON.parse((statusRow.component_statuses as string) || '{}'),
      lastSentinelRunId: statusRow.last_sentinel_run_id as string | undefined,
      lastSentinelStatus: statusRow.last_sentinel_status as string | undefined,
      lastSentinelAt: statusRow.last_sentinel_at
        ? new Date((statusRow.last_sentinel_at as number) * 1000)
        : undefined,
      showLatency: statusRow.show_latency === 1,
      showThroughput: statusRow.show_throughput === 1,
      showUptime: statusRow.show_uptime === 1,
      uptimePercentage30d: statusRow.uptime_percentage_30d as number | undefined,
      uptimePercentage90d: statusRow.uptime_percentage_90d as number | undefined,
      maintenanceActive: statusRow.maintenance_active === 1,
      maintenanceMessage: statusRow.maintenance_message as string | undefined,
      maintenanceStartedAt: statusRow.maintenance_started_at
        ? new Date((statusRow.maintenance_started_at as number) * 1000)
        : undefined,
      maintenanceExpectedEnd: statusRow.maintenance_expected_end
        ? new Date((statusRow.maintenance_expected_end as number) * 1000)
        : undefined,
      updatedAt: new Date((statusRow.updated_at as number) * 1000),
    } : {
      id: '',
      tenantId,
      overallStatus: 'operational',
      componentStatuses: {},
      showLatency: false,
      showThroughput: false,
      showUptime: true,
      maintenanceActive: false,
      updatedAt: new Date(),
    };

    // Map recent runs
    const recentRuns = runsResult.results.map(row => ({
      id: row.id as string,
      name: row.name as string,
      profileType: row.profile_type as string,
      status: row.status as string,
      startedAt: row.started_at ? new Date((row.started_at as number) * 1000) : null,
      completedAt: row.completed_at ? new Date((row.completed_at as number) * 1000) : null,
      totalOperations: row.total_operations as number,
      successfulOperations: row.successful_operations as number,
      failedOperations: row.failed_operations as number,
      avgLatencyMs: row.avg_latency_ms as number,
      p95LatencyMs: row.p95_latency_ms as number,
      throughputOpsPerSec: row.throughput_ops_sec as number,
      successRate: row.total_operations
        ? ((row.successful_operations as number) / (row.total_operations as number) * 100).toFixed(1)
        : '0',
    }));

    // Map incidents
    const incidents: ClearingIncident[] = incidentsResult.results.map(row => ({
      id: row.id as string,
      tenantId: row.tenant_id as string,
      title: row.title as string,
      description: row.description as string | undefined,
      severity: row.severity as ClearingIncident['severity'],
      status: row.status as ClearingIncident['status'],
      affectedComponents: JSON.parse((row.affected_components as string) || '[]'),
      startedAt: new Date((row.started_at as number) * 1000),
      identifiedAt: row.identified_at
        ? new Date((row.identified_at as number) * 1000)
        : undefined,
      resolvedAt: row.resolved_at
        ? new Date((row.resolved_at as number) * 1000)
        : undefined,
      updates: JSON.parse((row.updates as string) || '[]'),
      sentinelRunId: row.sentinel_run_id as string | undefined,
      isPublic: row.is_public === 1,
      createdAt: new Date((row.created_at as number) * 1000),
      updatedAt: new Date((row.updated_at as number) * 1000),
    }));

    return {
      status,
      recentRuns,
      incidents,
      error: null,
    };
  } catch (err) {
    console.error('[Clearing] Load error:', err);
    return {
      status: null,
      recentRuns: [],
      incidents: [],
      error: 'Failed to load status data',
    };
  }
};
