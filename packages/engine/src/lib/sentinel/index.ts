/**
 * Sentinel - Grove Infrastructure Stress Testing System
 *
 * "The Sentinel watches over the Grove, ensuring the infrastructure
 * can weather any storm."
 *
 * This module provides comprehensive load testing capabilities for
 * validating Grove's scalability on Cloudflare's edge infrastructure.
 *
 * @example
 * ```typescript
 * import { SentinelRunner, createSpikeProfile, createSentinelRun } from '@groveengine/core/sentinel';
 *
 * // Create a spike test profile
 * const profile = createSpikeProfile({
 *   targetOperations: 10000,
 *   durationSeconds: 300,
 *   targetSystems: ['d1_writes', 'd1_reads', 'kv_get'],
 * });
 *
 * // Create a run record
 * const run = await createSentinelRun(db, tenantId, 'Weekly Spike Test', profile);
 *
 * // Execute the test
 * const runner = new SentinelRunner({ db, kv, r2, tenantId });
 * const results = await runner.execute(run);
 * ```
 */

// Types
export type {
  ProfileType,
  TargetSystem,
  LoadProfile,
  SpikeConfig,
  OscillationConfig,
  RampConfig,
  CustomConfig,
  RunStatus,
  SentinelRun,
  RunResults,
  SystemResult,
  SentinelMetric,
  SentinelCheckpoint,
  SentinelBaseline,
  SentinelSchedule,
  OverallStatus,
  ComponentStatus,
  ClearingStatus,
  IncidentSeverity,
  IncidentStatus,
  ClearingIncident,
  IncidentUpdate,
  OperationResult,
} from './types.js';

// Profiles & Traffic Composition (Sentinel Pattern)
export {
  // Traffic composition
  TRAFFIC_COMPOSITION,
  getSystemWeights,
  selectWeightedSystem,
  // Three-phase model
  DEFAULT_THREE_PHASE,
  createThreePhaseProfile,
  type ThreePhaseConfig,
  // Profile utilities
  getOpsPerSecondAt,
  // Profile presets
  createSpikeProfile,
  createSustainedProfile,
  createOscillationProfile,
  createRampProfile,
  createSmokeTestProfile,
  createStressTestProfile,
  createSoakTestProfile,
  // Cost estimation
  estimateCloudflareCost,
} from './profiles.js';

// Operations
export {
  executeOperation,
  cleanupSentinelData,
} from './operations.js';

// Runner
export {
  SentinelRunner,
  createSentinelRun,
  getSentinelRun,
  listSentinelRuns,
} from './runner.js';

// Scheduler (for cron-triggered tests)
export {
  createSchedule,
  listSchedules,
  getSchedule,
  updateSchedule,
  deleteSchedule,
  handleScheduledEvent,
  getWeeklyMidnightScheduleConfig,
  getDailySmokeTestConfig,
} from './scheduler.js';

// Durable Object (Loom pattern for long-running tests)
// Use SentinelDO for tests longer than 30 seconds to avoid Worker CPU limits
export { SentinelDO } from './durable-object.js';
