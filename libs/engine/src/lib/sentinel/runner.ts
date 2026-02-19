/**
 * Sentinel Test Runner
 *
 * Orchestrates stress test execution with real-time metrics collection.
 * Designed for Cloudflare Workers with consideration for execution limits.
 */

import type {
  LoadProfile,
  SentinelRun,
  RunStatus,
  RunResults,
  SystemResult,
  SentinelMetric,
  SentinelCheckpoint,
  TargetSystem,
  D1Database,
  KVNamespace,
  R2Bucket,
} from "./types.js";
import { getOpsPerSecondAt, estimateCloudflareCost } from "./profiles.js";
import { executeOperation, cleanupSentinelData } from "./operations.js";

// =============================================================================
// RUNNER CONFIGURATION
// =============================================================================

interface RunnerConfig {
  db: D1Database;
  kv: KVNamespace;
  r2: R2Bucket;
  tenantId: string;

  // Callbacks for real-time updates
  onProgress?: (progress: RunProgress) => void;
  onCheckpoint?: (checkpoint: SentinelCheckpoint) => void;
  onComplete?: (results: RunResults) => void;
  onError?: (error: Error) => void;

  // Execution context for long-running operations
  ctx?: ExecutionContext;

  // Performance settings
  checkpointIntervalSeconds?: number;
  maxBatchSize?: number;
}

interface RunProgress {
  runId: string;
  elapsedSeconds: number;
  totalOperations: number;
  completedOperations: number;
  failedOperations: number;
  currentOpsPerSec: number;
  avgLatencyMs: number;
  percentComplete: number;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

// =============================================================================
// SENTINEL RUNNER
// =============================================================================

export class SentinelRunner {
  private config: RunnerConfig;
  private metrics: SentinelMetric[] = [];
  private checkpoints: SentinelCheckpoint[] = [];
  private isRunning = false;
  private isCancelled = false;
  private currentRunId = "";

  constructor(config: RunnerConfig) {
    this.config = {
      checkpointIntervalSeconds: 30,
      maxBatchSize: 50,
      ...config,
    };
  }

  /**
   * Execute a stress test run
   */
  async execute(run: SentinelRun): Promise<RunResults> {
    if (this.isRunning) {
      throw new Error("Runner is already executing a test");
    }

    this.isRunning = true;
    this.isCancelled = false;
    this.metrics = [];
    this.checkpoints = [];
    this.currentRunId = run.id;

    const { db, kv, r2, tenantId } = this.config;
    const { profile } = run;
    const startTime = Date.now();

    // Update run status to running
    await this.updateRunStatus(run.id, "running", { startedAt: new Date() });

    try {
      // Calculate total operations and scheduling
      const opsSchedule = this.generateOpsSchedule(profile);
      let completedOps = 0;
      let failedOps = 0;
      let lastCheckpoint = 0;

      // Execute operations according to schedule
      for (const batch of opsSchedule) {
        if (this.isCancelled) {
          break;
        }

        const elapsedSeconds = (Date.now() - startTime) / 1000;

        // Check if we've exceeded duration
        if (elapsedSeconds >= profile.durationSeconds) {
          break;
        }

        // Wait until batch time
        const batchDelay = batch.time * 1000 - (Date.now() - startTime);
        if (batchDelay > 0) {
          await this.sleep(batchDelay);
        }

        // Execute batch operations
        const batchResults = await this.executeBatch(
          batch.systems,
          batch.count,
          db,
          kv,
          r2,
          tenantId,
          completedOps,
        );

        completedOps += batchResults.completed;
        failedOps += batchResults.failed;

        // Record checkpoint if interval passed
        const currentElapsed = (Date.now() - startTime) / 1000;
        if (
          currentElapsed - lastCheckpoint >=
          (this.config.checkpointIntervalSeconds ?? 30)
        ) {
          await this.recordCheckpoint(
            run.id,
            tenantId,
            currentElapsed,
            completedOps,
            failedOps,
          );
          lastCheckpoint = currentElapsed;
        }

        // Report progress
        this.reportProgress(
          run.id,
          currentElapsed,
          profile.targetOperations,
          completedOps,
          failedOps,
        );
      }

      // Calculate final results
      const results = this.calculateResults(
        profile,
        completedOps,
        failedOps,
        startTime,
      );

      // Update run with results
      await this.updateRunStatus(run.id, "completed", {
        completedAt: new Date(),
        results,
      });

      this.config.onComplete?.(results);
      return results;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      await this.updateRunStatus(run.id, "failed", {
        errorMessage: err.message,
      });
      this.config.onError?.(err);
      throw error;
    } finally {
      this.isRunning = false;

      // Always cleanup test data (runs on success, failure, or cancellation)
      try {
        if (this.config.ctx) {
          this.config.ctx.waitUntil(cleanupSentinelData(db, kv, r2, tenantId));
        } else {
          await cleanupSentinelData(db, kv, r2, tenantId);
        }
      } catch {
        // Cleanup is best-effort
      }
    }
  }

  /**
   * Cancel an in-progress run
   */
  cancel(): void {
    this.isCancelled = true;
  }

  /**
   * Generate operation schedule based on profile
   */
  private generateOpsSchedule(profile: LoadProfile): Array<{
    time: number;
    count: number;
    systems: TargetSystem[];
  }> {
    const schedule: Array<{
      time: number;
      count: number;
      systems: TargetSystem[];
    }> = [];
    const { durationSeconds, targetSystems, concurrency } = profile;
    const maxBatchSize = this.config.maxBatchSize ?? 50;

    // Generate schedule at 1-second intervals
    for (let second = 0; second < durationSeconds; second++) {
      const opsPerSecond = getOpsPerSecondAt(profile, second);
      const ops = Math.ceil(opsPerSecond);

      if (ops <= 0) continue;

      // Split into batches respecting concurrency
      const batchCount = Math.ceil(ops / maxBatchSize);
      const opsPerBatch = Math.ceil(ops / batchCount);

      for (let i = 0; i < batchCount; i++) {
        const batchOps = Math.min(opsPerBatch, ops - i * opsPerBatch);
        const batchTime = second + i / batchCount;

        schedule.push({
          time: batchTime,
          count: Math.min(batchOps, concurrency),
          systems: targetSystems,
        });
      }
    }

    return schedule;
  }

  /**
   * Execute a batch of operations concurrently
   */
  private async executeBatch(
    systems: TargetSystem[],
    count: number,
    db: D1Database,
    kv: KVNamespace,
    r2: R2Bucket,
    tenantId: string,
    baseIndex: number,
  ): Promise<{ completed: number; failed: number }> {
    const promises: Promise<void>[] = [];
    let completed = 0;
    let failed = 0;

    for (let i = 0; i < count; i++) {
      // Round-robin through target systems
      const system = systems[i % systems.length];
      const index = baseIndex + i;
      const operationStartedAt = new Date();

      promises.push(
        executeOperation(system, db, kv, r2, tenantId, index)
          .then((result) => {
            this.metrics.push({
              id: crypto.randomUUID(),
              runId: this.currentRunId,
              tenantId,
              operationType: system,
              operationName: result.operationName,
              batchIndex: Math.floor(
                baseIndex / (this.config.maxBatchSize ?? 50),
              ),
              startedAt: operationStartedAt,
              completedAt: new Date(),
              latencyMs: result.latencyMs,
              success: result.success,
              errorMessage: result.errorMessage,
              errorCode: result.errorCode,
              rowsAffected: result.rowsAffected,
              bytesTransferred: result.bytesTransferred,
            });

            if (result.success) {
              completed++;
            } else {
              failed++;
            }
          })
          .catch(() => {
            failed++;
          }),
      );
    }

    await Promise.all(promises);
    return { completed, failed };
  }

  /**
   * Record a checkpoint for the run
   */
  private async recordCheckpoint(
    runId: string,
    tenantId: string,
    elapsedSeconds: number,
    completedOps: number,
    failedOps: number,
  ): Promise<void> {
    const recentMetrics = this.metrics.slice(-100);
    const avgLatency =
      recentMetrics.length > 0
        ? recentMetrics.reduce((sum, m) => sum + (m.latencyMs ?? 0), 0) /
          recentMetrics.length
        : 0;

    const checkpoint: SentinelCheckpoint = {
      id: crypto.randomUUID(),
      runId,
      tenantId,
      checkpointIndex: this.checkpoints.length,
      recordedAt: new Date(),
      elapsedSeconds: Math.floor(elapsedSeconds),
      operationsCompleted: completedOps,
      operationsFailed: failedOps,
      currentThroughput: completedOps / Math.max(elapsedSeconds, 1),
      avgLatencyMs: avgLatency,
      errorRate: failedOps / Math.max(completedOps + failedOps, 1),
    };

    this.checkpoints.push(checkpoint);
    this.config.onCheckpoint?.(checkpoint);

    // Persist checkpoint to database
    try {
      await this.config.db
        .prepare(
          `INSERT INTO sentinel_checkpoints (
            id, run_id, tenant_id, checkpoint_index, recorded_at, elapsed_seconds,
            operations_completed, operations_failed, current_throughput, avg_latency_ms, error_rate
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          checkpoint.id,
          runId,
          tenantId,
          checkpoint.checkpointIndex,
          Math.floor(checkpoint.recordedAt.getTime() / 1000),
          checkpoint.elapsedSeconds,
          checkpoint.operationsCompleted,
          checkpoint.operationsFailed,
          checkpoint.currentThroughput,
          checkpoint.avgLatencyMs,
          checkpoint.errorRate,
        )
        .run();
    } catch {
      // Checkpoint persistence is best-effort
    }
  }

  /**
   * Report progress to callback
   */
  private reportProgress(
    runId: string,
    elapsedSeconds: number,
    totalOps: number,
    completedOps: number,
    failedOps: number,
  ): void {
    const recentMetrics = this.metrics.slice(-50);
    const avgLatency =
      recentMetrics.length > 0
        ? recentMetrics.reduce((sum, m) => sum + (m.latencyMs ?? 0), 0) /
          recentMetrics.length
        : 0;

    const progress: RunProgress = {
      runId,
      elapsedSeconds,
      totalOperations: totalOps,
      completedOperations: completedOps,
      failedOperations: failedOps,
      currentOpsPerSec: completedOps / Math.max(elapsedSeconds, 1),
      avgLatencyMs: avgLatency,
      percentComplete: Math.min(100, (completedOps / totalOps) * 100),
    };

    this.config.onProgress?.(progress);
  }

  /**
   * Calculate final results from collected metrics
   */
  private calculateResults(
    profile: LoadProfile,
    completedOps: number,
    failedOps: number,
    startTime: number,
  ): RunResults {
    const latencies = this.metrics
      .filter((m) => m.success && m.latencyMs !== undefined)
      .map((m) => m.latencyMs!)
      .sort((a, b) => a - b);

    const durationMs = Date.now() - startTime;
    const durationSeconds = durationMs / 1000;

    // Calculate percentiles
    const p50Index = Math.floor(latencies.length * 0.5);
    const p95Index = Math.floor(latencies.length * 0.95);
    const p99Index = Math.floor(latencies.length * 0.99);

    // Calculate error types
    const errorTypes: Record<string, number> = {};
    this.metrics
      .filter((m) => !m.success && m.errorCode)
      .forEach((m) => {
        errorTypes[m.errorCode!] = (errorTypes[m.errorCode!] || 0) + 1;
      });

    // Calculate per-system results
    const systemResults: Record<
      string,
      {
        operations: number;
        successes: number;
        failures: number;
        avgLatencyMs: number;
        p95LatencyMs: number;
      }
    > = {};

    for (const system of profile.targetSystems) {
      const systemMetrics = this.metrics.filter(
        (m) => m.operationType === system,
      );
      const systemLatencies = systemMetrics
        .filter((m) => m.success && m.latencyMs !== undefined)
        .map((m) => m.latencyMs!)
        .sort((a, b) => a - b);

      systemResults[system] = {
        operations: systemMetrics.length,
        successes: systemMetrics.filter((m) => m.success).length,
        failures: systemMetrics.filter((m) => !m.success).length,
        avgLatencyMs:
          systemLatencies.length > 0
            ? systemLatencies.reduce((a, b) => a + b, 0) /
              systemLatencies.length
            : 0,
        p95LatencyMs:
          systemLatencies[Math.floor(systemLatencies.length * 0.95)] ?? 0,
      };
    }

    const costEstimate = estimateCloudflareCost(profile);

    return {
      totalOperations: completedOps + failedOps,
      successfulOperations: completedOps,
      failedOperations: failedOps,
      avgLatencyMs:
        latencies.length > 0
          ? latencies.reduce((a, b) => a + b, 0) / latencies.length
          : 0,
      p50LatencyMs: latencies[p50Index] ?? 0,
      p95LatencyMs: latencies[p95Index] ?? 0,
      p99LatencyMs: latencies[p99Index] ?? 0,
      maxLatencyMs: latencies[latencies.length - 1] ?? 0,
      minLatencyMs: latencies[0] ?? 0,
      throughputOpsPerSec: completedOps / Math.max(durationSeconds, 1),
      errorCount: failedOps,
      errorTypes,
      estimatedCostUsd: costEstimate.totalCost,
      systemResults: systemResults as Record<TargetSystem, SystemResult>,
    };
  }

  /**
   * Update run status in database
   */
  private async updateRunStatus(
    runId: string,
    status: RunStatus,
    extra?: {
      startedAt?: Date;
      completedAt?: Date;
      results?: RunResults;
      errorMessage?: string;
    },
  ): Promise<void> {
    const updates: string[] = ["status = ?", "updated_at = ?"];
    const params: unknown[] = [status, Math.floor(Date.now() / 1000)];

    if (extra?.startedAt) {
      updates.push("started_at = ?");
      params.push(Math.floor(extra.startedAt.getTime() / 1000));
    }

    if (extra?.completedAt) {
      updates.push("completed_at = ?");
      params.push(Math.floor(extra.completedAt.getTime() / 1000));
    }

    if (extra?.results) {
      const r = extra.results;
      updates.push(
        "total_operations = ?",
        "successful_operations = ?",
        "failed_operations = ?",
        "avg_latency_ms = ?",
        "p50_latency_ms = ?",
        "p95_latency_ms = ?",
        "p99_latency_ms = ?",
        "max_latency_ms = ?",
        "min_latency_ms = ?",
        "throughput_ops_sec = ?",
        "error_count = ?",
        "error_types = ?",
        "estimated_cost_usd = ?",
      );
      params.push(
        r.totalOperations,
        r.successfulOperations,
        r.failedOperations,
        r.avgLatencyMs,
        r.p50LatencyMs,
        r.p95LatencyMs,
        r.p99LatencyMs,
        r.maxLatencyMs,
        r.minLatencyMs,
        r.throughputOpsPerSec,
        r.errorCount,
        JSON.stringify(r.errorTypes),
        r.estimatedCostUsd,
      );
    }

    params.push(runId);

    try {
      await this.config.db
        .prepare(`UPDATE sentinel_runs SET ${updates.join(", ")} WHERE id = ?`)
        .bind(...params)
        .run();
    } catch {
      // Best-effort status update
    }
  }

  /**
   * Simple sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get collected metrics (for debugging/export)
   */
  getMetrics(): SentinelMetric[] {
    return [...this.metrics];
  }

  /**
   * Get checkpoints (for progress tracking)
   */
  getCheckpoints(): SentinelCheckpoint[] {
    return [...this.checkpoints];
  }
}

// =============================================================================
// DATABASE OPERATIONS
// =============================================================================

/**
 * Create a new sentinel run in the database
 */
export async function createSentinelRun(
  db: D1Database,
  tenantId: string,
  name: string,
  profile: LoadProfile,
  options?: {
    description?: string;
    scheduledAt?: Date;
    triggeredBy?: "manual" | "scheduled" | "api";
    notes?: string;
  },
): Promise<SentinelRun> {
  const id = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);

  await db
    .prepare(
      `INSERT INTO sentinel_runs (
        id, tenant_id, name, description, profile_type, target_operations,
        duration_seconds, concurrency, target_systems, status, scheduled_at,
        triggered_by, notes, config_snapshot, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      tenantId,
      name,
      options?.description ?? null,
      profile.type,
      profile.targetOperations,
      profile.durationSeconds,
      profile.concurrency,
      JSON.stringify(profile.targetSystems),
      "pending",
      options?.scheduledAt
        ? Math.floor(options.scheduledAt.getTime() / 1000)
        : null,
      options?.triggeredBy ?? "manual",
      options?.notes ?? null,
      JSON.stringify(profile),
      now,
      now,
    )
    .run();

  return {
    id,
    tenantId,
    name,
    description: options?.description,
    profile,
    status: "pending",
    scheduledAt: options?.scheduledAt,
    triggeredBy: options?.triggeredBy ?? "manual",
    notes: options?.notes,
    createdAt: new Date(now * 1000),
    updatedAt: new Date(now * 1000),
  };
}

/**
 * Get a sentinel run by ID
 */
export async function getSentinelRun(
  db: D1Database,
  runId: string,
): Promise<SentinelRun | null> {
  const row = await db
    .prepare("SELECT * FROM sentinel_runs WHERE id = ?")
    .bind(runId)
    .first<Record<string, unknown>>();

  if (!row) return null;

  return mapRunRow(row);
}

/**
 * List sentinel runs for a tenant
 */
export async function listSentinelRuns(
  db: D1Database,
  tenantId: string,
  options?: {
    status?: RunStatus;
    limit?: number;
    offset?: number;
  },
): Promise<SentinelRun[]> {
  let query = "SELECT * FROM sentinel_runs WHERE tenant_id = ?";
  const params: unknown[] = [tenantId];

  if (options?.status) {
    query += " AND status = ?";
    params.push(options.status);
  }

  query += " ORDER BY created_at DESC";

  if (options?.limit) {
    query += " LIMIT ?";
    params.push(options.limit);
  }

  if (options?.offset) {
    query += " OFFSET ?";
    params.push(options.offset);
  }

  const result = await db
    .prepare(query)
    .bind(...params)
    .all<Record<string, unknown>>();
  return result.results.map(mapRunRow);
}

/**
 * Map database row to SentinelRun
 */
function mapRunRow(row: Record<string, unknown>): SentinelRun {
  const configSnapshot = row.config_snapshot as string | null;
  const profile: LoadProfile = configSnapshot
    ? JSON.parse(configSnapshot)
    : {
        type: row.profile_type as LoadProfile["type"],
        targetOperations: row.target_operations as number,
        durationSeconds: row.duration_seconds as number,
        concurrency: row.concurrency as number,
        targetSystems: JSON.parse((row.target_systems as string) || "[]"),
      };

  const results: RunResults | undefined = row.total_operations
    ? {
        totalOperations: row.total_operations as number,
        successfulOperations: row.successful_operations as number,
        failedOperations: row.failed_operations as number,
        avgLatencyMs: row.avg_latency_ms as number,
        p50LatencyMs: row.p50_latency_ms as number,
        p95LatencyMs: row.p95_latency_ms as number,
        p99LatencyMs: row.p99_latency_ms as number,
        maxLatencyMs: row.max_latency_ms as number,
        minLatencyMs: row.min_latency_ms as number,
        throughputOpsPerSec: row.throughput_ops_sec as number,
        errorCount: row.error_count as number,
        errorTypes: JSON.parse((row.error_types as string) || "{}"),
        estimatedCostUsd: row.estimated_cost_usd as number,
      }
    : undefined;

  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    name: row.name as string,
    description: row.description as string | undefined,
    profile,
    status: row.status as RunStatus,
    scheduledAt: row.scheduled_at
      ? new Date((row.scheduled_at as number) * 1000)
      : undefined,
    startedAt: row.started_at
      ? new Date((row.started_at as number) * 1000)
      : undefined,
    completedAt: row.completed_at
      ? new Date((row.completed_at as number) * 1000)
      : undefined,
    results,
    triggeredBy:
      (row.triggered_by as "manual" | "scheduled" | "api") || "manual",
    notes: row.notes as string | undefined,
    createdAt: new Date((row.created_at as number) * 1000),
    updatedAt: new Date((row.updated_at as number) * 1000),
  };
}
