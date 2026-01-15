/**
 * Sentinel Load Profiles
 *
 * Define different stress test patterns for infrastructure validation.
 * Based on the Sentinel Pattern specification:
 * - Traffic composition mirrors actual user behavior
 * - Three-phase testing model (Ramp-up, Peak, Steady-state)
 * - Focus on user experience metrics (p95 latency, actual patterns)
 *
 * @see docs/patterns/sentinel-pattern.md
 */

import type {
  LoadProfile,
  ProfileType,
  SpikeConfig,
  OscillationConfig,
  RampConfig,
  TargetSystem,
} from './types.js';

// =============================================================================
// TRAFFIC COMPOSITION (Based on Sentinel Pattern)
// =============================================================================

/**
 * Realistic traffic composition based on actual user behavior patterns.
 * This distribution should be used when generating operations.
 *
 * From the Sentinel Pattern:
 * - Post reading (35%) - dominant activity
 * - Blog browsing (25%) - discovery behavior
 * - Authentication (10%) - login/logout patterns
 * - Writing operations (5%) - content creation
 * - Media operations (10%) - image uploads/downloads
 * - Analytics (8%) - tracking events
 * - Comments (7%) - comment operations
 */
export const TRAFFIC_COMPOSITION = {
  post_reading: 0.35,      // 35% - dominant activity (view blog posts)
  blog_browsing: 0.25,     // 25% - discovery behavior (list posts, search)
  auth_flows: 0.10,        // 10% - login/logout patterns
  writing_ops: 0.05,       // 5% - content creation (post CRUD)
  media_ops: 0.10,         // 10% - image uploads/downloads
  analytics: 0.08,         // 8% - analytics events
  comments: 0.07,          // 7% - comment operations (future)
} as const;

/**
 * Map traffic composition to target systems for weighted operation selection
 */
export function getSystemWeights(): Map<TargetSystem, number> {
  return new Map<TargetSystem, number>([
    ['d1_reads', 0.60],        // post_reading + blog_browsing
    ['d1_writes', 0.05],       // writing_ops
    ['kv_get', 0.15],          // session checks, caching
    ['kv_put', 0.05],          // session creation, cache updates
    ['r2_download', 0.08],     // media serving
    ['r2_upload', 0.02],       // media uploads
    ['auth_flows', 0.10],      // authentication
  ]);
}

/**
 * Select a target system based on traffic composition weights
 */
export function selectWeightedSystem(systems: TargetSystem[]): TargetSystem {
  const weights = getSystemWeights();
  const availableWeights: Array<[TargetSystem, number]> = [];
  let totalWeight = 0;

  for (const system of systems) {
    const weight = weights.get(system) ?? 0.1;
    availableWeights.push([system, weight]);
    totalWeight += weight;
  }

  // Normalize and select
  const random = Math.random() * totalWeight;
  let cumulative = 0;

  for (const [system, weight] of availableWeights) {
    cumulative += weight;
    if (random <= cumulative) {
      return system;
    }
  }

  return systems[0];
}

// =============================================================================
// THREE-PHASE TESTING MODEL (Sentinel Pattern)
// =============================================================================

export interface ThreePhaseConfig {
  rampUpSeconds: number;      // Phase 1: Users increase from zero to peak
  peakSeconds: number;        // Phase 2: Sustained maximum load
  steadyStateSeconds: number; // Phase 3: Moderate load for recovery validation
  peakMultiplier: number;     // How much higher peak is vs steady state
}

/**
 * Default three-phase configuration based on Sentinel Pattern
 */
export const DEFAULT_THREE_PHASE: ThreePhaseConfig = {
  rampUpSeconds: 120,         // 2 minutes ramp-up
  peakSeconds: 180,           // 3 minutes at peak
  steadyStateSeconds: 300,    // 5 minutes steady state
  peakMultiplier: 3,          // Peak is 3x steady state
};

/**
 * Create a three-phase load profile following the Sentinel Pattern
 *
 * Phase 1 (Ramp-up): Users increase from zero to peak over 2 minutes
 *   - Observe degradation patterns as load increases
 *
 * Phase 2 (Peak): Sustained maximum load
 *   - Identify breaking points and bottlenecks
 *
 * Phase 3 (Steady-state): Moderate load for recovery
 *   - Validate recovery and sustainable performance
 */
export function createThreePhaseProfile(options: {
  targetUsersAtPeak?: number;
  opsPerUser?: number;
  phaseConfig?: Partial<ThreePhaseConfig>;
  targetSystems?: TargetSystem[];
  concurrency?: number;
}): LoadProfile {
  const config: ThreePhaseConfig = {
    ...DEFAULT_THREE_PHASE,
    ...options.phaseConfig,
  };

  const targetUsersAtPeak = options.targetUsersAtPeak ?? 1000;
  const opsPerUser = options.opsPerUser ?? 10;
  const peakOpsPerSecond = targetUsersAtPeak * opsPerUser / config.peakSeconds;
  const steadyOpsPerSecond = peakOpsPerSecond / config.peakMultiplier;

  const totalDuration = config.rampUpSeconds + config.peakSeconds + config.steadyStateSeconds;
  const totalOps = Math.ceil(
    // Ramp-up: average is half of peak
    (config.rampUpSeconds * peakOpsPerSecond * 0.5) +
    // Peak: full rate
    (config.peakSeconds * peakOpsPerSecond) +
    // Steady state: reduced rate
    (config.steadyStateSeconds * steadyOpsPerSecond)
  );

  return {
    type: 'custom',
    targetOperations: totalOps,
    durationSeconds: totalDuration,
    concurrency: options.concurrency ?? Math.min(targetUsersAtPeak, 500),
    targetSystems: options.targetSystems ?? ['d1_reads', 'd1_writes', 'kv_get', 'auth_flows'],
    customConfig: {
      loadCurve: [
        { second: 0, opsPerSecond: 0 },
        { second: config.rampUpSeconds, opsPerSecond: peakOpsPerSecond },
        { second: config.rampUpSeconds + config.peakSeconds, opsPerSecond: peakOpsPerSecond },
        { second: config.rampUpSeconds + config.peakSeconds + 1, opsPerSecond: steadyOpsPerSecond },
        { second: totalDuration, opsPerSecond: steadyOpsPerSecond },
      ],
    },
  };
}

// =============================================================================
// PROFILE GENERATORS
// =============================================================================

/**
 * Get the target operations per second at a given time point
 */
export function getOpsPerSecondAt(profile: LoadProfile, elapsedSeconds: number): number {
  const baseOps = profile.targetOperations / profile.durationSeconds;

  switch (profile.type) {
    case 'spike':
      return getSpikeOpsPerSecond(profile, elapsedSeconds, baseOps);
    case 'sustained':
      return baseOps; // Constant rate
    case 'oscillation':
      return getOscillationOpsPerSecond(profile, elapsedSeconds, baseOps);
    case 'ramp':
      return getRampOpsPerSecond(profile, elapsedSeconds);
    case 'custom':
      return getCustomOpsPerSecond(profile, elapsedSeconds);
    default:
      return baseOps;
  }
}

function getSpikeOpsPerSecond(
  profile: LoadProfile,
  elapsedSeconds: number,
  baseOps: number
): number {
  const config = profile.spikeConfig ?? {
    warmupSeconds: profile.durationSeconds * 0.2,
    spikeDurationSeconds: profile.durationSeconds * 0.3,
    spikeMultiplier: 10,
    cooldownSeconds: profile.durationSeconds * 0.5,
  };

  const { warmupSeconds, spikeDurationSeconds, spikeMultiplier } = config;
  const spikeStart = warmupSeconds;
  const spikeEnd = spikeStart + spikeDurationSeconds;

  if (elapsedSeconds < spikeStart) {
    // Warmup phase - gradual ramp to base
    return baseOps * (elapsedSeconds / spikeStart);
  } else if (elapsedSeconds < spikeEnd) {
    // Spike phase
    return baseOps * spikeMultiplier;
  } else {
    // Cooldown phase - gradual decrease
    const cooldownProgress = (elapsedSeconds - spikeEnd) / (profile.durationSeconds - spikeEnd);
    return baseOps * (1 - cooldownProgress * 0.5);
  }
}

function getOscillationOpsPerSecond(
  profile: LoadProfile,
  elapsedSeconds: number,
  baseOps: number
): number {
  const config = profile.oscillationConfig ?? {
    minOpsPerSecond: baseOps * 0.2,
    maxOpsPerSecond: baseOps * 2,
    periodSeconds: 60,
    waveform: 'sine' as const,
  };

  const { minOpsPerSecond, maxOpsPerSecond, periodSeconds, waveform } = config;
  const amplitude = (maxOpsPerSecond - minOpsPerSecond) / 2;
  const midpoint = minOpsPerSecond + amplitude;
  const phase = (elapsedSeconds / periodSeconds) * 2 * Math.PI;

  switch (waveform) {
    case 'sine':
      return midpoint + amplitude * Math.sin(phase);
    case 'square':
      return Math.sin(phase) >= 0 ? maxOpsPerSecond : minOpsPerSecond;
    case 'sawtooth':
      return minOpsPerSecond + (maxOpsPerSecond - minOpsPerSecond) * ((elapsedSeconds % periodSeconds) / periodSeconds);
    default:
      return midpoint;
  }
}

function getRampOpsPerSecond(profile: LoadProfile, elapsedSeconds: number): number {
  const config = profile.rampConfig ?? {
    startOpsPerSecond: 1,
    endOpsPerSecond: profile.targetOperations / profile.durationSeconds * 2,
    rampUpSeconds: profile.durationSeconds * 0.3,
    sustainSeconds: profile.durationSeconds * 0.4,
    rampDownSeconds: profile.durationSeconds * 0.3,
  };

  const { startOpsPerSecond, endOpsPerSecond, rampUpSeconds, sustainSeconds, rampDownSeconds } = config;
  const sustainStart = rampUpSeconds;
  const rampDownStart = sustainStart + sustainSeconds;

  if (elapsedSeconds < rampUpSeconds) {
    // Ramp up phase
    const progress = elapsedSeconds / rampUpSeconds;
    return startOpsPerSecond + (endOpsPerSecond - startOpsPerSecond) * progress;
  } else if (elapsedSeconds < rampDownStart) {
    // Sustain phase
    return endOpsPerSecond;
  } else {
    // Ramp down phase
    const progress = (elapsedSeconds - rampDownStart) / rampDownSeconds;
    return endOpsPerSecond - (endOpsPerSecond - startOpsPerSecond) * progress;
  }
}

function getCustomOpsPerSecond(profile: LoadProfile, elapsedSeconds: number): number {
  const curve = profile.customConfig?.loadCurve ?? [];
  if (curve.length === 0) return 1;

  // Find the two points to interpolate between
  let prevPoint = curve[0];
  let nextPoint = curve[curve.length - 1];

  for (let i = 0; i < curve.length - 1; i++) {
    if (curve[i].second <= elapsedSeconds && curve[i + 1].second > elapsedSeconds) {
      prevPoint = curve[i];
      nextPoint = curve[i + 1];
      break;
    }
  }

  // Linear interpolation
  const range = nextPoint.second - prevPoint.second;
  if (range === 0) return prevPoint.opsPerSecond;

  const progress = (elapsedSeconds - prevPoint.second) / range;
  return prevPoint.opsPerSecond + (nextPoint.opsPerSecond - prevPoint.opsPerSecond) * progress;
}

// =============================================================================
// PRESET PROFILES
// =============================================================================

/**
 * Create a standard spike test profile
 * Simulates sudden traffic surges (viral post, marketing campaign)
 */
export function createSpikeProfile(options: {
  targetOperations?: number;
  durationSeconds?: number;
  concurrency?: number;
  targetSystems?: TargetSystem[];
  spikeMultiplier?: number;
}): LoadProfile {
  const duration = options.durationSeconds ?? 300; // 5 minutes default
  return {
    type: 'spike',
    targetOperations: options.targetOperations ?? 10000,
    durationSeconds: duration,
    concurrency: options.concurrency ?? 50,
    targetSystems: options.targetSystems ?? ['d1_writes', 'd1_reads', 'kv_get'],
    spikeConfig: {
      warmupSeconds: duration * 0.15,
      spikeDurationSeconds: duration * 0.3,
      spikeMultiplier: options.spikeMultiplier ?? 10,
      cooldownSeconds: duration * 0.55,
    },
  };
}

/**
 * Create a sustained load profile
 * Tests system stability under constant load
 */
export function createSustainedProfile(options: {
  targetOperations?: number;
  durationSeconds?: number;
  concurrency?: number;
  targetSystems?: TargetSystem[];
}): LoadProfile {
  return {
    type: 'sustained',
    targetOperations: options.targetOperations ?? 50000,
    durationSeconds: options.durationSeconds ?? 600, // 10 minutes default
    concurrency: options.concurrency ?? 100,
    targetSystems: options.targetSystems ?? ['d1_writes', 'd1_reads', 'kv_get', 'kv_put'],
  };
}

/**
 * Create an oscillation profile
 * Tests system behavior under varying load (normal daily patterns)
 */
export function createOscillationProfile(options: {
  targetOperations?: number;
  durationSeconds?: number;
  concurrency?: number;
  targetSystems?: TargetSystem[];
  periodSeconds?: number;
}): LoadProfile {
  const baseOps = (options.targetOperations ?? 30000) / (options.durationSeconds ?? 600);
  return {
    type: 'oscillation',
    targetOperations: options.targetOperations ?? 30000,
    durationSeconds: options.durationSeconds ?? 600,
    concurrency: options.concurrency ?? 50,
    targetSystems: options.targetSystems ?? ['d1_writes', 'd1_reads'],
    oscillationConfig: {
      minOpsPerSecond: baseOps * 0.2,
      maxOpsPerSecond: baseOps * 2.5,
      periodSeconds: options.periodSeconds ?? 60,
      waveform: 'sine',
    },
  };
}

/**
 * Create a ramp profile
 * Tests system scalability by gradually increasing load
 */
export function createRampProfile(options: {
  targetOperations?: number;
  durationSeconds?: number;
  concurrency?: number;
  targetSystems?: TargetSystem[];
  maxOpsPerSecond?: number;
}): LoadProfile {
  const duration = options.durationSeconds ?? 900; // 15 minutes default
  return {
    type: 'ramp',
    targetOperations: options.targetOperations ?? 100000,
    durationSeconds: duration,
    concurrency: options.concurrency ?? 200,
    targetSystems: options.targetSystems ?? ['d1_writes', 'd1_reads', 'kv_get', 'kv_put'],
    rampConfig: {
      startOpsPerSecond: 1,
      endOpsPerSecond: options.maxOpsPerSecond ?? 500,
      rampUpSeconds: duration * 0.4,
      sustainSeconds: duration * 0.3,
      rampDownSeconds: duration * 0.3,
    },
  };
}

// =============================================================================
// QUICK TESTS (for development/verification)
// =============================================================================

/**
 * Quick smoke test - minimal load to verify system works
 */
export function createSmokeTestProfile(): LoadProfile {
  return {
    type: 'sustained',
    targetOperations: 100,
    durationSeconds: 30,
    concurrency: 5,
    targetSystems: ['d1_reads', 'd1_writes'],
  };
}

/**
 * Stress test - high load for finding breaking points
 */
export function createStressTestProfile(): LoadProfile {
  return createRampProfile({
    targetOperations: 500000,
    durationSeconds: 1800, // 30 minutes
    concurrency: 500,
    maxOpsPerSecond: 1000,
    targetSystems: ['d1_writes', 'd1_reads', 'kv_get', 'kv_put', 'r2_upload'],
  });
}

/**
 * Soak test - moderate load for extended period to detect memory leaks
 */
export function createSoakTestProfile(): LoadProfile {
  return createSustainedProfile({
    targetOperations: 360000, // 100 ops/sec for 1 hour
    durationSeconds: 3600,
    concurrency: 50,
    targetSystems: ['d1_writes', 'd1_reads', 'kv_get'],
  });
}

// =============================================================================
// COST ESTIMATION
// =============================================================================

/**
 * Estimate Cloudflare costs for a test run
 * Based on Cloudflare's pricing as of 2024
 */
export function estimateCloudflareCosat(profile: LoadProfile): {
  d1ReadsCost: number;
  d1WritesCost: number;
  kvOpsCost: number;
  r2OpsCost: number;
  totalCost: number;
  breakdown: string;
} {
  const { targetOperations, targetSystems } = profile;

  // Rough distribution assumptions
  const d1Reads = targetSystems.includes('d1_reads') ? targetOperations * 0.4 : 0;
  const d1Writes = targetSystems.includes('d1_writes') ? targetOperations * 0.3 : 0;
  const kvOps = (targetSystems.includes('kv_get') || targetSystems.includes('kv_put'))
    ? targetOperations * 0.2
    : 0;
  const r2Ops = (targetSystems.includes('r2_upload') || targetSystems.includes('r2_download'))
    ? targetOperations * 0.1
    : 0;

  // Cloudflare pricing (approximate, check current pricing)
  // D1: First 25B reads/month free, then $0.001 per million
  // D1 Writes: First 50M writes/month free, then $1 per million
  // KV: First 10M reads/month free, then $0.50 per million
  // R2: First 10M Class A ops free, Class B $0.36 per million

  const d1ReadsCost = Math.max(0, (d1Reads - 25_000_000_000) / 1_000_000 * 0.001);
  const d1WritesCost = Math.max(0, (d1Writes - 50_000_000) / 1_000_000 * 1);
  const kvOpsCost = Math.max(0, (kvOps - 10_000_000) / 1_000_000 * 0.50);
  const r2OpsCost = Math.max(0, (r2Ops - 10_000_000) / 1_000_000 * 0.36);

  const totalCost = d1ReadsCost + d1WritesCost + kvOpsCost + r2OpsCost;

  const breakdown = [
    `D1 Reads: ${d1Reads.toLocaleString()} ops ($${d1ReadsCost.toFixed(4)})`,
    `D1 Writes: ${d1Writes.toLocaleString()} ops ($${d1WritesCost.toFixed(4)})`,
    `KV Ops: ${kvOps.toLocaleString()} ops ($${kvOpsCost.toFixed(4)})`,
    `R2 Ops: ${r2Ops.toLocaleString()} ops ($${r2OpsCost.toFixed(4)})`,
  ].join('\n');

  return {
    d1ReadsCost,
    d1WritesCost,
    kvOpsCost,
    r2OpsCost,
    totalCost,
    breakdown,
  };
}
