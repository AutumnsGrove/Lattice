/**
 * Sentinel Stress Testing System - Type Definitions
 *
 * The Sentinel is Grove's infrastructure validation system, designed to
 * stress test the platform and ensure scalability from 10 to 10 million users.
 */

// =============================================================================
// LOAD PROFILES
// =============================================================================

export type ProfileType = 'spike' | 'sustained' | 'oscillation' | 'ramp' | 'custom';

export type TargetSystem =
  | 'd1_writes'
  | 'd1_reads'
  | 'kv_get'
  | 'kv_put'
  | 'r2_upload'
  | 'r2_download'
  | 'auth_flows'
  | 'post_crud'
  | 'media_ops';

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
  warmupSeconds: number;        // Time before spike
  spikeDurationSeconds: number; // How long the spike lasts
  spikeMultiplier: number;      // e.g., 10x normal load
  cooldownSeconds: number;      // Recovery period
}

export interface OscillationConfig {
  minOpsPerSecond: number;
  maxOpsPerSecond: number;
  periodSeconds: number;        // Time for one full cycle
  waveform: 'sine' | 'square' | 'sawtooth';
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

export type RunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

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
  triggeredBy: 'manual' | 'scheduled' | 'api';
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
// BASELINES & SCHEDULES
// =============================================================================

export interface SentinelBaseline {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  profileType: ProfileType;
  targetSystems: TargetSystem[];

  // Expected performance
  baselineThroughput: number;
  baselineP50Latency: number;
  baselineP95Latency: number;
  baselineP99Latency: number;
  baselineErrorRate: number;

  // Alert thresholds
  throughputThreshold?: number;
  latencyP95Threshold?: number;
  errorRateThreshold?: number;

  sourceRunIds: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SentinelSchedule {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  cronExpression: string;
  timezone: string;
  profile: LoadProfile;
  enableMaintenanceMode: boolean;
  maintenanceMessage?: string;
  isActive: boolean;
  lastRunAt?: Date;
  lastRunId?: string;
  nextRunAt?: Date;
  alertOnFailure: boolean;
  alertEmail?: string;
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// THE CLEARING (STATUS PAGE)
// =============================================================================

export type OverallStatus = 'operational' | 'degraded' | 'partial_outage' | 'major_outage' | 'maintenance';

export type ComponentStatus = 'operational' | 'degraded' | 'outage';

export interface ClearingStatus {
  id: string;
  tenantId: string;
  overallStatus: OverallStatus;
  componentStatuses: Record<string, ComponentStatus>;
  lastSentinelRunId?: string;
  lastSentinelStatus?: RunStatus;
  lastSentinelAt?: Date;
  showLatency: boolean;
  showThroughput: boolean;
  showUptime: boolean;
  uptimePercentage30d?: number;
  uptimePercentage90d?: number;
  maintenanceActive: boolean;
  maintenanceMessage?: string;
  maintenanceStartedAt?: Date;
  maintenanceExpectedEnd?: Date;
  updatedAt: Date;
}

export type IncidentSeverity = 'minor' | 'major' | 'critical';
export type IncidentStatus = 'investigating' | 'identified' | 'monitoring' | 'resolved';

export interface ClearingIncident {
  id: string;
  tenantId: string;
  title: string;
  description?: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  affectedComponents: string[];
  startedAt: Date;
  identifiedAt?: Date;
  resolvedAt?: Date;
  updates: IncidentUpdate[];
  sentinelRunId?: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IncidentUpdate {
  timestamp: Date;
  message: string;
  status: IncidentStatus;
}

// =============================================================================
// OPERATION GENERATORS
// =============================================================================

export interface OperationGenerator {
  type: TargetSystem;
  generate: (
    db: D1Database,
    kv: KVNamespace,
    r2: R2Bucket,
    tenantId: string,
    index: number
  ) => Promise<OperationResult>;
}

export interface OperationResult {
  success: boolean;
  latencyMs: number;
  operationName: string;
  errorMessage?: string;
  errorCode?: string;
  rowsAffected?: number;
  bytesTransferred?: number;
}

// =============================================================================
// CLOUDFLARE TYPES (for reference)
// =============================================================================

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(): Promise<T | null>;
  all<T = unknown>(): Promise<D1Result<T>>;
  run(): Promise<D1Result>;
}

export interface D1Result<T = unknown> {
  results: T[];
  success: boolean;
  meta?: {
    changes?: number;
    last_row_id?: number;
    duration?: number;
  };
}

export interface KVNamespace {
  get(key: string, options?: { type?: 'text' | 'json' | 'arrayBuffer' | 'stream' }): Promise<string | object | ArrayBuffer | ReadableStream | null>;
  put(key: string, value: string | ArrayBuffer | ReadableStream, options?: { expirationTtl?: number; metadata?: object }): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: { prefix?: string; limit?: number; cursor?: string }): Promise<{ keys: { name: string }[]; list_complete: boolean; cursor?: string }>;
}

export interface R2Bucket {
  put(key: string, value: ReadableStream | ArrayBuffer | ArrayBufferView | string | null, options?: R2PutOptions): Promise<R2Object>;
  get(key: string, options?: R2GetOptions): Promise<R2ObjectBody | null>;
  delete(key: string | string[]): Promise<void>;
  list(options?: R2ListOptions): Promise<R2Objects>;
}

export interface R2PutOptions {
  httpMetadata?: R2HTTPMetadata;
  customMetadata?: Record<string, string>;
}

export interface R2GetOptions {
  range?: { offset?: number; length?: number };
}

export interface R2ListOptions {
  prefix?: string;
  limit?: number;
  cursor?: string;
  delimiter?: string;
}

export interface R2HTTPMetadata {
  contentType?: string;
  contentLanguage?: string;
  contentDisposition?: string;
  contentEncoding?: string;
  cacheControl?: string;
}

export interface R2Object {
  key: string;
  version: string;
  size: number;
  etag: string;
  httpMetadata?: R2HTTPMetadata;
  customMetadata?: Record<string, string>;
}

export interface R2ObjectBody extends R2Object {
  body: ReadableStream;
  bodyUsed: boolean;
  arrayBuffer(): Promise<ArrayBuffer>;
  text(): Promise<string>;
  json<T = unknown>(): Promise<T>;
}

export interface R2Objects {
  objects: R2Object[];
  truncated: boolean;
  cursor?: string;
}
