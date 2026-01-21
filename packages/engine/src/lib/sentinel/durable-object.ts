/**
 * SentinelDO - Durable Object for Stress Test Coordination
 *
 * Following the Loom pattern, SentinelDO provides:
 * - Long-running test execution (bypasses Worker CPU limits)
 * - Batched D1 writes for metrics
 * - Real-time progress via WebSocket
 * - Persistent state across hibernation
 *
 * ID Pattern: `sentinel:{tenantId}:{runId}`
 *
 * @see docs/patterns/loom-durable-objects-pattern.md
 */

import type {
  LoadProfile,
  SentinelRun,
  RunResults,
  SentinelMetric,
  SentinelCheckpoint,
  TargetSystem,
  D1Database,
  KVNamespace,
  R2Bucket,
} from "./types.js";
import { getOpsPerSecondAt, selectWeightedSystem } from "./profiles.js";
import { executeOperation } from "./operations.js";

// =============================================================================
// TYPES
// =============================================================================

interface SentinelDOEnv {
  DB: D1Database;
  KV: KVNamespace;
  IMAGES: R2Bucket;
}

interface SentinelDOState {
  runId: string;
  tenantId: string;
  profile: LoadProfile;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";

  // Progress tracking
  startedAt: number | null;
  completedOps: number;
  failedOps: number;
  lastCheckpointAt: number;

  // Batched metrics (flushed periodically)
  metricsBuffer: SentinelMetric[];
  latencies: number[];

  // WebSocket connections for real-time updates
  connections: Set<WebSocket>;
}

// =============================================================================
// SENTINEL DURABLE OBJECT
// =============================================================================

export class SentinelDO {
  private state: DurableObjectState;
  private env: SentinelDOEnv;
  private runState: SentinelDOState | null = null;

  constructor(state: DurableObjectState, env: SentinelDOEnv) {
    this.state = state;
    this.env = env;
  }

  /**
   * Handle incoming requests
   * - POST /start - Start test execution
   * - POST /cancel - Cancel running test
   * - GET /status - Get current status
   * - GET /ws - WebSocket upgrade for real-time updates
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // WebSocket upgrade
    if (request.headers.get("Upgrade") === "websocket") {
      return this.handleWebSocket(request);
    }

    // REST endpoints
    switch (url.pathname) {
      case "/start":
        return this.handleStart(request);
      case "/cancel":
        return this.handleCancel();
      case "/status":
        return this.handleStatus();
      default:
        return new Response("Not found", { status: 404 });
    }
  }

  /**
   * Handle alarm - used for periodic operations during test
   */
  async alarm(): Promise<void> {
    if (!this.runState || this.runState.status !== "running") {
      return;
    }

    // Execute batch of operations
    await this.executeBatch();

    // Check if test should continue
    const elapsed =
      (Date.now() - (this.runState.startedAt ?? Date.now())) / 1000;
    if (
      elapsed < this.runState.profile.durationSeconds &&
      this.runState.status === "running"
    ) {
      // Schedule next batch
      await this.state.storage.setAlarm(Date.now() + 1000); // 1 second intervals
    } else {
      // Test complete
      await this.finishTest();
    }
  }

  // ===========================================================================
  // REQUEST HANDLERS
  // ===========================================================================

  private async handleStart(request: Request): Promise<Response> {
    const body = (await request.json()) as {
      runId: string;
      tenantId: string;
      profile: LoadProfile;
    };

    // Initialize state
    this.runState = {
      runId: body.runId,
      tenantId: body.tenantId,
      profile: body.profile,
      status: "running",
      startedAt: Date.now(),
      completedOps: 0,
      failedOps: 0,
      lastCheckpointAt: Date.now(),
      metricsBuffer: [],
      latencies: [],
      connections: new Set(),
    };

    // Persist initial state
    await this.state.storage.put("runState", this.runState);

    // Update run status in D1
    await this.env.DB.prepare(
      "UPDATE sentinel_runs SET status = ?, started_at = ?, updated_at = ? WHERE id = ?",
    )
      .bind(
        "running",
        Math.floor(Date.now() / 1000),
        Math.floor(Date.now() / 1000),
        body.runId,
      )
      .run();

    // Schedule first batch
    await this.state.storage.setAlarm(Date.now() + 100);

    this.log("Test started", { runId: body.runId });

    return Response.json({ success: true, status: "running" });
  }

  private async handleCancel(): Promise<Response> {
    if (!this.runState) {
      return Response.json(
        { success: false, error: "No active test" },
        { status: 400 },
      );
    }

    this.runState.status = "cancelled";
    await this.state.storage.put("runState", this.runState);
    await this.state.storage.deleteAlarm();

    // Update D1
    await this.env.DB.prepare(
      "UPDATE sentinel_runs SET status = ?, updated_at = ? WHERE id = ?",
    )
      .bind("cancelled", Math.floor(Date.now() / 1000), this.runState.runId)
      .run();

    this.broadcast({ type: "cancelled" });
    this.log("Test cancelled");

    return Response.json({ success: true, status: "cancelled" });
  }

  private async handleStatus(): Promise<Response> {
    await this.loadState();

    if (!this.runState) {
      return Response.json({ status: "idle" });
    }

    const elapsed = this.runState.startedAt
      ? (Date.now() - this.runState.startedAt) / 1000
      : 0;

    return Response.json({
      status: this.runState.status,
      runId: this.runState.runId,
      elapsed,
      completedOps: this.runState.completedOps,
      failedOps: this.runState.failedOps,
      progress: Math.min(
        100,
        (elapsed / this.runState.profile.durationSeconds) * 100,
      ),
    });
  }

  private handleWebSocket(request: Request): Response {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    this.state.acceptWebSocket(server);

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  // ===========================================================================
  // HIBERNATION-AWARE WEBSOCKET (Loom Pattern)
  // ===========================================================================

  async webSocketMessage(
    ws: WebSocket,
    message: string | ArrayBuffer,
  ): Promise<void> {
    // Handle client messages (e.g., subscription preferences)
    try {
      const data = JSON.parse(message as string);
      this.log("WebSocket message", data);
    } catch (error) {
      this.log("Invalid WebSocket message", { error: String(error) });
    }
  }

  async webSocketClose(
    ws: WebSocket,
    code: number,
    reason: string,
  ): Promise<void> {
    // Connection closed
    ws.close(code, reason);
  }

  // ===========================================================================
  // TEST EXECUTION (Following Loom Batching Pattern)
  // ===========================================================================

  private async executeBatch(): Promise<void> {
    if (!this.runState || this.runState.status !== "running") return;

    await this.loadState();

    const elapsed =
      (Date.now() - (this.runState.startedAt ?? Date.now())) / 1000;
    const targetOps = getOpsPerSecondAt(this.runState.profile, elapsed);
    const batchSize = Math.min(
      Math.ceil(targetOps),
      this.runState.profile.concurrency,
    );

    const { tenantId, profile } = this.runState;
    const promises: Promise<void>[] = [];

    for (let i = 0; i < batchSize; i++) {
      const system = selectWeightedSystem(profile.targetSystems);
      const index = this.runState.completedOps + this.runState.failedOps + i;
      const operationStartedAt = new Date();

      promises.push(
        executeOperation(
          system,
          this.env.DB,
          this.env.KV,
          this.env.IMAGES,
          tenantId,
          index,
        )
          .then((result) => {
            if (result.success) {
              this.runState!.completedOps++;
              if (result.latencyMs) {
                this.runState!.latencies.push(result.latencyMs);
              }
            } else {
              this.runState!.failedOps++;
            }

            // Add to metrics buffer (batched write)
            this.runState!.metricsBuffer.push({
              id: crypto.randomUUID(),
              runId: this.runState!.runId,
              tenantId,
              operationType: system,
              operationName: result.operationName,
              batchIndex: Math.floor(index / batchSize),
              startedAt: operationStartedAt,
              completedAt: new Date(),
              latencyMs: result.latencyMs,
              success: result.success,
              errorMessage: result.errorMessage,
              errorCode: result.errorCode,
              rowsAffected: result.rowsAffected,
              bytesTransferred: result.bytesTransferred,
            });
          })
          .catch(() => {
            this.runState!.failedOps++;
          }),
      );
    }

    await Promise.all(promises);

    // Flush metrics buffer if large enough (Loom batching pattern)
    if (this.runState.metricsBuffer.length >= 100) {
      await this.flushMetrics();
    }

    // Record checkpoint every 30 seconds
    if (Date.now() - this.runState.lastCheckpointAt >= 30000) {
      await this.recordCheckpoint(elapsed);
      this.runState.lastCheckpointAt = Date.now();
    }

    // Persist state
    await this.state.storage.put("runState", this.runState);

    // Broadcast progress
    this.broadcast({
      type: "progress",
      elapsed,
      completedOps: this.runState.completedOps,
      failedOps: this.runState.failedOps,
      progress: Math.min(100, (elapsed / profile.durationSeconds) * 100),
    });
  }

  /**
   * Flush metrics to D1 in batch (Loom pattern)
   */
  private async flushMetrics(): Promise<void> {
    if (!this.runState || this.runState.metricsBuffer.length === 0) return;

    const metrics = this.runState.metricsBuffer;
    this.runState.metricsBuffer = [];

    // Batch insert using D1 batch()
    const statements = metrics.map((m) =>
      this.env.DB.prepare(
        `INSERT INTO sentinel_metrics (
          id, run_id, tenant_id, operation_type, operation_name, batch_index,
          started_at, completed_at, latency_ms, success, error_message, error_code,
          rows_affected, bytes_transferred
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        m.id,
        m.runId,
        m.tenantId,
        m.operationType,
        m.operationName ?? null,
        m.batchIndex,
        Math.floor(m.startedAt.getTime() / 1000),
        m.completedAt ? Math.floor(m.completedAt.getTime() / 1000) : null,
        m.latencyMs ?? null,
        m.success ? 1 : 0,
        m.errorMessage ?? null,
        m.errorCode ?? null,
        m.rowsAffected ?? null,
        m.bytesTransferred ?? null,
      ),
    );

    try {
      await this.env.DB.batch(statements);
      this.log("Flushed metrics", { count: metrics.length });
    } catch (error) {
      this.log("Failed to flush metrics", { error: String(error) });
      // Re-add to buffer for retry
      this.runState.metricsBuffer.push(...metrics);
    }
  }

  private async recordCheckpoint(elapsedSeconds: number): Promise<void> {
    if (!this.runState) return;

    const latencies = this.runState.latencies.sort((a, b) => a - b);
    const avgLatency =
      latencies.length > 0
        ? latencies.reduce((a, b) => a + b, 0) / latencies.length
        : 0;

    const checkpoint: SentinelCheckpoint = {
      id: crypto.randomUUID(),
      runId: this.runState.runId,
      tenantId: this.runState.tenantId,
      checkpointIndex: Math.floor(elapsedSeconds / 30),
      recordedAt: new Date(),
      elapsedSeconds: Math.floor(elapsedSeconds),
      operationsCompleted: this.runState.completedOps,
      operationsFailed: this.runState.failedOps,
      currentThroughput:
        this.runState.completedOps / Math.max(elapsedSeconds, 1),
      avgLatencyMs: avgLatency,
      errorRate:
        this.runState.failedOps /
        Math.max(this.runState.completedOps + this.runState.failedOps, 1),
    };

    await this.env.DB.prepare(
      `INSERT INTO sentinel_checkpoints (
          id, run_id, tenant_id, checkpoint_index, recorded_at, elapsed_seconds,
          operations_completed, operations_failed, current_throughput, avg_latency_ms, error_rate
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        checkpoint.id,
        checkpoint.runId,
        checkpoint.tenantId,
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
  }

  private async finishTest(): Promise<void> {
    if (!this.runState) return;

    // Flush remaining metrics
    await this.flushMetrics();

    // Calculate final results
    const latencies = this.runState.latencies.sort((a, b) => a - b);
    const totalOps = this.runState.completedOps + this.runState.failedOps;
    const elapsed =
      (Date.now() - (this.runState.startedAt ?? Date.now())) / 1000;

    const results: RunResults = {
      totalOperations: totalOps,
      successfulOperations: this.runState.completedOps,
      failedOperations: this.runState.failedOps,
      avgLatencyMs:
        latencies.length > 0
          ? latencies.reduce((a, b) => a + b, 0) / latencies.length
          : 0,
      p50LatencyMs: latencies[Math.floor(latencies.length * 0.5)] ?? 0,
      p95LatencyMs: latencies[Math.floor(latencies.length * 0.95)] ?? 0,
      p99LatencyMs: latencies[Math.floor(latencies.length * 0.99)] ?? 0,
      maxLatencyMs: latencies[latencies.length - 1] ?? 0,
      minLatencyMs: latencies[0] ?? 0,
      throughputOpsPerSec: this.runState.completedOps / Math.max(elapsed, 1),
      errorCount: this.runState.failedOps,
      errorTypes: {},
    };

    // Update D1 with results
    await this.env.DB.prepare(
      `UPDATE sentinel_runs SET
          status = ?, completed_at = ?, total_operations = ?, successful_operations = ?,
          failed_operations = ?, avg_latency_ms = ?, p50_latency_ms = ?, p95_latency_ms = ?,
          p99_latency_ms = ?, max_latency_ms = ?, min_latency_ms = ?, throughput_ops_sec = ?,
          error_count = ?, updated_at = ?
        WHERE id = ?`,
    )
      .bind(
        "completed",
        Math.floor(Date.now() / 1000),
        results.totalOperations,
        results.successfulOperations,
        results.failedOperations,
        results.avgLatencyMs,
        results.p50LatencyMs,
        results.p95LatencyMs,
        results.p99LatencyMs,
        results.maxLatencyMs,
        results.minLatencyMs,
        results.throughputOpsPerSec,
        results.errorCount,
        Math.floor(Date.now() / 1000),
        this.runState.runId,
      )
      .run();

    this.runState.status = "completed";
    await this.state.storage.put("runState", this.runState);

    // Broadcast completion
    this.broadcast({ type: "completed", results });

    this.log("Test completed", {
      runId: this.runState.runId,
      totalOps,
      successRate: totalOps > 0 ? ((this.runState.completedOps / totalOps) * 100).toFixed(1) : '0.0',
      throughput: results.throughputOpsPerSec.toFixed(1),
    });
  }

  // ===========================================================================
  // UTILITIES
  // ===========================================================================

  private async loadState(): Promise<void> {
    if (!this.runState) {
      this.runState = (await this.state.storage.get(
        "runState",
      )) as SentinelDOState | null;
      if (this.runState) {
        // Re-initialize connections Set after hibernation - Sets cannot be serialized
        // to storage. Active WebSockets are tracked via state.getWebSockets() instead.
        this.runState.connections = new Set();
      }
    }
  }

  private broadcast(message: object): void {
    const data = JSON.stringify(message);
    for (const ws of this.state.getWebSockets()) {
      try {
        ws.send(data);
      } catch {
        // Connection closed
      }
    }
  }

  private log(message: string, data?: object): void {
    console.log(
      JSON.stringify({
        do: "SentinelDO",
        id: this.state.id.toString(),
        message,
        ...data,
        timestamp: new Date().toISOString(),
      }),
    );
  }
}

// =============================================================================
// DURABLE OBJECT STATE TYPE (for Cloudflare)
// =============================================================================

interface DurableObjectState {
  id: DurableObjectId;
  storage: DurableObjectStorage;
  acceptWebSocket(ws: WebSocket): void;
  getWebSockets(): WebSocket[];
}

interface DurableObjectStorage {
  get<T>(key: string): Promise<T | undefined>;
  put<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<boolean>;
  setAlarm(scheduledTime: number): Promise<void>;
  deleteAlarm(): Promise<void>;
}

interface DurableObjectId {
  toString(): string;
}
