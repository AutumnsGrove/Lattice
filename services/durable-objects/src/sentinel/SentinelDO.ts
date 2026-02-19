/**
 * SentinelDO - Durable Object for Stress Test Coordination
 *
 * Following the Loom pattern, SentinelDO provides:
 * - Long-running test execution (bypasses Worker CPU limits)
 * - Batched D1 writes for metrics
 * - Real-time progress via WebSocket (hibernation-aware)
 * - Persistent state across hibernation
 *
 * ID Pattern: `sentinel:{tenantId}:{runId}`
 *
 * Migrated to LoomDO base class — see libs/engine/src/lib/loom/
 */

import {
	LoomDO,
	type LoomRoute,
	type LoomConfig,
	type LoomRequestContext,
} from "@autumnsgrove/lattice/loom";
import type { LoadProfile, RunResults, SentinelMetric, SentinelCheckpoint } from "./types.js";
import { getOpsPerSecondAt, selectWeightedSystem } from "./profiles.js";
import { executeOperation } from "./operations.js";

// =============================================================================
// TYPES
// =============================================================================

interface SentinelDOEnv extends Record<string, unknown> {
	DB: D1Database;
	KV: KVNamespace;
	IMAGES: R2Bucket;
}

interface SentinelState {
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

	// Retry counter for metrics flush (prevents infinite accumulation on persistent D1 issues)
	metricsFlushRetries: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Max samples to keep for latency tracking (reservoir sampling above this) */
const MAX_LATENCY_SAMPLES = 10_000;

/** Max flush retries before discarding metrics */
const MAX_FLUSH_RETRIES = 3;

/** Metrics flush threshold */
const METRICS_FLUSH_THRESHOLD = 100;

/** Checkpoint interval: 30 seconds */
const CHECKPOINT_INTERVAL_MS = 30_000;

// =============================================================================
// SENTINEL DURABLE OBJECT
// =============================================================================

export class SentinelDO extends LoomDO<SentinelState, SentinelDOEnv> {
	config(): LoomConfig {
		return { name: "SentinelDO", blockOnInit: false, hibernation: true };
	}

	protected async loadState(): Promise<SentinelState | null> {
		const stored = await this.state.storage.get<SentinelState>("runState");
		if (stored) {
			// Reset retry counter on load (fresh start after hibernation)
			return {
				...stored,
				metricsFlushRetries: stored.metricsFlushRetries ?? 0,
			};
		}
		return null;
	}

	protected async persistState(): Promise<void> {
		if (this.state_data) {
			await this.state.storage.put("runState", this.state_data);
		}
	}

	routes(): LoomRoute[] {
		return [
			{
				method: "POST",
				path: "/start",
				handler: (ctx) => this.handleStart(ctx),
			},
			{
				method: "POST",
				path: "/cancel",
				handler: () => this.handleCancel(),
			},
			{
				method: "GET",
				path: "/status",
				handler: () => this.handleStatus(),
			},
		];
	}

	// ════════════════════════════════════════════════════════════════════
	// Custom fetch override — WebSocket upgrade
	// ════════════════════════════════════════════════════════════════════

	async fetch(request: Request): Promise<Response> {
		if (request.headers.get("Upgrade") === "websocket") {
			return this.sockets.accept(request);
		}
		return super.fetch(request);
	}

	// ════════════════════════════════════════════════════════════════════
	// WebSocket Handlers (Hibernation-aware)
	// ════════════════════════════════════════════════════════════════════

	protected async onWebSocketMessage(_ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
		try {
			const data = JSON.parse(message as string);
			this.log.debug("WebSocket message", data);
		} catch {
			this.log.warn("Invalid WebSocket message");
		}
	}

	protected async onWebSocketClose(ws: WebSocket, code: number, reason: string): Promise<void> {
		ws.close(code, reason);
	}

	// ════════════════════════════════════════════════════════════════════
	// Request Handlers
	// ════════════════════════════════════════════════════════════════════

	private async handleStart(ctx: LoomRequestContext): Promise<Response> {
		const body = (await ctx.request.json()) as {
			runId: string;
			tenantId: string;
			profile: LoadProfile;
		};

		// Initialize state
		this.state_data = {
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
			metricsFlushRetries: 0,
		};

		await this.persistState();

		// Update run status in D1
		await this.env.DB.prepare(
			"UPDATE sentinel_runs SET status = ?, started_at = ?, updated_at = ? WHERE id = ?",
		)
			.bind("running", Math.floor(Date.now() / 1000), Math.floor(Date.now() / 1000), body.runId)
			.run();

		// Schedule first batch
		await this.alarms.schedule(100);

		this.log.info("Test started", { runId: body.runId });

		return Response.json({ success: true, status: "running" });
	}

	private async handleCancel(): Promise<Response> {
		if (!this.state_data) {
			return Response.json({ success: false, error: "No active test" }, { status: 400 });
		}

		this.state_data.status = "cancelled";
		await this.persistState();
		await this.state.storage.deleteAlarm();

		// Update D1
		await this.env.DB.prepare("UPDATE sentinel_runs SET status = ?, updated_at = ? WHERE id = ?")
			.bind("cancelled", Math.floor(Date.now() / 1000), this.state_data.runId)
			.run();

		this.sockets.broadcast({ type: "cancelled" });
		this.log.info("Test cancelled");

		return Response.json({ success: true, status: "cancelled" });
	}

	private async handleStatus(): Promise<Response> {
		if (!this.state_data) {
			return Response.json({ status: "idle" });
		}

		const elapsed = this.state_data.startedAt ? (Date.now() - this.state_data.startedAt) / 1000 : 0;

		return Response.json({
			status: this.state_data.status,
			runId: this.state_data.runId,
			elapsed,
			completedOps: this.state_data.completedOps,
			failedOps: this.state_data.failedOps,
			progress: Math.min(100, (elapsed / this.state_data.profile.durationSeconds) * 100),
		});
	}

	// ════════════════════════════════════════════════════════════════════
	// Alarm Handler
	// ════════════════════════════════════════════════════════════════════

	protected async onAlarm(): Promise<void> {
		if (!this.state_data || this.state_data.status !== "running") {
			return;
		}

		// Execute batch of operations
		await this.executeBatch();

		// Check if test should continue
		const elapsed = (Date.now() - (this.state_data.startedAt ?? Date.now())) / 1000;
		if (elapsed < this.state_data.profile.durationSeconds && this.state_data.status === "running") {
			// Schedule next batch (1 second intervals)
			await this.alarms.schedule(1000);
		} else {
			// Test complete
			await this.finishTest();
		}
	}

	// ════════════════════════════════════════════════════════════════════
	// Test Execution (Following Loom Batching Pattern)
	// ════════════════════════════════════════════════════════════════════

	private async executeBatch(): Promise<void> {
		if (!this.state_data || this.state_data.status !== "running") return;

		const elapsed = (Date.now() - (this.state_data.startedAt ?? Date.now())) / 1000;
		const targetOps = getOpsPerSecondAt(this.state_data.profile, elapsed);
		const batchSize = Math.min(Math.ceil(targetOps), this.state_data.profile.concurrency);

		const { tenantId, profile } = this.state_data;
		const promises: Promise<void>[] = [];

		for (let i = 0; i < batchSize; i++) {
			const system = selectWeightedSystem(profile.targetSystems);
			const index = this.state_data.completedOps + this.state_data.failedOps + i;
			const operationStartedAt = new Date();

			promises.push(
				executeOperation(system, this.env.DB, this.env.KV, this.env.IMAGES, tenantId, index)
					.then((result) => {
						if (result.success) {
							this.state_data!.completedOps++;
							if (result.latencyMs) {
								const latencies = this.state_data!.latencies;
								if (latencies.length < MAX_LATENCY_SAMPLES) {
									latencies.push(result.latencyMs);
								} else {
									// Reservoir sampling: replace a random entry to maintain representative distribution
									const idx = Math.floor(
										Math.random() * (this.state_data!.completedOps + this.state_data!.failedOps),
									);
									if (idx < MAX_LATENCY_SAMPLES) {
										latencies[idx] = result.latencyMs;
									}
								}
							}
						} else {
							this.state_data!.failedOps++;
						}

						// Add to metrics buffer (batched write)
						this.state_data!.metricsBuffer.push({
							id: crypto.randomUUID(),
							runId: this.state_data!.runId,
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
						this.state_data!.failedOps++;
					}),
			);
		}

		await Promise.all(promises);

		// Flush metrics buffer if large enough (Loom batching pattern)
		if (this.state_data.metricsBuffer.length >= METRICS_FLUSH_THRESHOLD) {
			await this.flushMetrics();
		}

		// Record checkpoint every 30 seconds
		if (Date.now() - this.state_data.lastCheckpointAt >= CHECKPOINT_INTERVAL_MS) {
			await this.recordCheckpoint(elapsed);
			this.state_data.lastCheckpointAt = Date.now();
		}

		// Persist state
		await this.persistState();

		// Broadcast progress
		this.sockets.broadcast({
			type: "progress",
			elapsed,
			completedOps: this.state_data.completedOps,
			failedOps: this.state_data.failedOps,
			progress: Math.min(100, (elapsed / profile.durationSeconds) * 100),
		});
	}

	/**
	 * Flush metrics to D1 in batch (Loom pattern)
	 */
	private async flushMetrics(): Promise<void> {
		if (!this.state_data || this.state_data.metricsBuffer.length === 0) return;

		const metrics = this.state_data.metricsBuffer;
		this.state_data.metricsBuffer = [];

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
			this.log.info("Flushed metrics", { count: metrics.length });
			// Reset retry counter on successful flush
			this.state_data.metricsFlushRetries = 0;
		} catch (error) {
			this.log.error("Failed to flush metrics", { error: String(error) });
			this.state_data.metricsFlushRetries++;

			// Re-add to buffer for retry, but discard after max retries to prevent infinite growth
			if (this.state_data.metricsFlushRetries < MAX_FLUSH_RETRIES) {
				this.state_data.metricsBuffer.push(...metrics);
			} else {
				this.log.warn("Discarding metrics after max retries", {
					count: metrics.length,
					retries: this.state_data.metricsFlushRetries,
				});
			}
		}
	}

	private async recordCheckpoint(elapsedSeconds: number): Promise<void> {
		if (!this.state_data) return;

		const latencies = this.state_data.latencies.sort((a, b) => a - b);
		const avgLatency =
			latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;

		const checkpoint: SentinelCheckpoint = {
			id: crypto.randomUUID(),
			runId: this.state_data.runId,
			tenantId: this.state_data.tenantId,
			checkpointIndex: Math.floor(elapsedSeconds / 30),
			recordedAt: new Date(),
			elapsedSeconds: Math.floor(elapsedSeconds),
			operationsCompleted: this.state_data.completedOps,
			operationsFailed: this.state_data.failedOps,
			currentThroughput: this.state_data.completedOps / Math.max(elapsedSeconds, 1),
			avgLatencyMs: avgLatency,
			errorRate:
				this.state_data.failedOps /
				Math.max(this.state_data.completedOps + this.state_data.failedOps, 1),
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
		if (!this.state_data) return;

		// Flush remaining metrics
		await this.flushMetrics();

		// Calculate final results
		const latencies = this.state_data.latencies.sort((a, b) => a - b);
		const totalOps = this.state_data.completedOps + this.state_data.failedOps;
		const elapsed = (Date.now() - (this.state_data.startedAt ?? Date.now())) / 1000;

		const results: RunResults = {
			totalOperations: totalOps,
			successfulOperations: this.state_data.completedOps,
			failedOperations: this.state_data.failedOps,
			avgLatencyMs:
				latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0,
			p50LatencyMs: latencies[Math.floor(latencies.length * 0.5)] ?? 0,
			p95LatencyMs: latencies[Math.floor(latencies.length * 0.95)] ?? 0,
			p99LatencyMs: latencies[Math.floor(latencies.length * 0.99)] ?? 0,
			maxLatencyMs: latencies[latencies.length - 1] ?? 0,
			minLatencyMs: latencies[0] ?? 0,
			throughputOpsPerSec: this.state_data.completedOps / Math.max(elapsed, 1),
			errorCount: this.state_data.failedOps,
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
				this.state_data.runId,
			)
			.run();

		this.state_data.status = "completed";
		await this.persistState();

		// Broadcast completion
		this.sockets.broadcast({ type: "completed", results });

		this.log.info("Test completed", {
			runId: this.state_data.runId,
			totalOps,
			successRate:
				totalOps > 0 ? ((this.state_data.completedOps / totalOps) * 100).toFixed(1) : "0.0",
			throughput: results.throughputOpsPerSec.toFixed(1),
		});
	}
}
