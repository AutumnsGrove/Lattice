/**
 * Sentinel Stress Testing System - Type Definitions
 *
 * The Sentinel is Grove's infrastructure validation system, designed to
 * stress test the platform and ensure scalability from 10 to 10 million users.
 */

// =============================================================================
// LOAD PROFILES
// =============================================================================

export type ProfileType =
  | "spike"
  | "sustained"
  | "oscillation"
  | "ramp"
  | "custom";

export type TargetSystem =
  | "d1_writes"
  | "d1_reads"
  | "kv_get"
  | "kv_put"
  | "r2_upload"
  | "r2_download"
  | "auth_flows"
  | "post_crud"
  | "media_ops";

export interface LoadProfile {
  type: ProfileType;
  targetOperations: number;
  durationSeconds: number;
  concurrency: number;
  targetSystems: TargetSystem[];

  // Profile-specific settings
  spikeConfig?: SpikeConfig;
  oscillationConfig?: OscillationConfig;
  rampConfig?: RampConfig;
  customConfig?: CustomConfig;
}

export interface SpikeConfig {
  warmupSeconds: number; // Time before spike
  spikeDurationSeconds: number; // How long the spike lasts
  spikeMultiplier: number; // e.g., 10x normal load
  cooldownSeconds: number; // Recovery period
}

export interface OscillationConfig {
  minOpsPerSecond: number;
  maxOpsPerSecond: number;
  periodSeconds: number; // Time for one full cycle
  waveform: "sine" | "square" | "sawtooth";
}

export interface RampConfig {
  startOpsPerSecond: number;
  endOpsPerSecond: number;
  rampUpSeconds: number;
  sustainSeconds: number;
  rampDownSeconds: number;
}

export interface CustomConfig {
  // Array of {second, opsPerSecond} points for custom load curve
  loadCurve: Array<{ second: number; opsPerSecond: number }>;
}

// =============================================================================
// TEST RUNS
// =============================================================================

export type RunStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export interface SentinelRun {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  profile: LoadProfile;
  status: RunStatus;

  // Scheduling
  scheduledAt?: Date;
  startedAt?: Date;
  completedAt?: Date;

  // Results
  results?: RunResults;

  // Metadata
  triggeredBy: "manual" | "scheduled" | "api";
  notes?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface RunResults {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;

  // Latency stats (milliseconds)
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  maxLatencyMs: number;
  minLatencyMs: number;

  // Throughput
  throughputOpsPerSec: number;

  // Errors
  errorCount: number;
  errorTypes: Record<string, number>;

  // Cost estimate
  estimatedCostUsd?: number;

  // Breakdown by system
  systemResults?: Record<TargetSystem, SystemResult>;
}

export interface SystemResult {
  operations: number;
  successes: number;
  failures: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
}

// =============================================================================
// METRICS & CHECKPOINTS
// =============================================================================

export interface SentinelMetric {
  id: string;
  runId: string;
  tenantId: string;
  operationType: TargetSystem;
  operationName?: string;
  batchIndex: number;
  startedAt: Date;
  completedAt?: Date;
  latencyMs?: number;
  success: boolean;
  errorMessage?: string;
  errorCode?: string;
  rowsAffected?: number;
  bytesTransferred?: number;
  metadata?: Record<string, unknown>;
}

export interface SentinelCheckpoint {
  id: string;
  runId: string;
  tenantId: string;
  checkpointIndex: number;
  recordedAt: Date;
  elapsedSeconds: number;
  operationsCompleted: number;
  operationsFailed: number;
  currentThroughput: number;
  avgLatencyMs: number;
  estimatedD1Reads?: number;
  estimatedD1Writes?: number;
  estimatedKvOps?: number;
  estimatedR2Ops?: number;
  errorRate: number;
}

// =============================================================================
// OPERATION RESULTS
// =============================================================================

export interface OperationResult {
  success: boolean;
  latencyMs: number;
  operationName: string;
  errorMessage?: string;
  errorCode?: string;
  rowsAffected?: number;
  bytesTransferred?: number;
}
