/**
 * Sentinel Load Profiles
 *
 * Define different stress test patterns for infrastructure validation.
 * Based on the Sentinel Pattern specification:
 * - Traffic composition mirrors actual user behavior
 * - Three-phase testing model (Ramp-up, Peak, Steady-state)
 * - Focus on user experience metrics (p95 latency, actual patterns)
 */

import type { LoadProfile, TargetSystem } from "./types.js";

// =============================================================================
// TRAFFIC COMPOSITION (Based on Sentinel Pattern)
// =============================================================================

/**
 * Map traffic composition to target systems for weighted operation selection
 */
export function getSystemWeights(): Map<TargetSystem, number> {
  return new Map<TargetSystem, number>([
    ["d1_reads", 0.6], // post_reading + blog_browsing
    ["d1_writes", 0.05], // writing_ops
    ["kv_get", 0.15], // session checks, caching
    ["kv_put", 0.05], // session creation, cache updates
    ["r2_download", 0.08], // media serving
    ["r2_upload", 0.02], // media uploads
    ["auth_flows", 0.1], // authentication
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
// PROFILE GENERATORS
// =============================================================================

/**
 * Get the target operations per second at a given time point
 */
export function getOpsPerSecondAt(
  profile: LoadProfile,
  elapsedSeconds: number,
): number {
  const baseOps = profile.targetOperations / profile.durationSeconds;

  switch (profile.type) {
    case "spike":
      return getSpikeOpsPerSecond(profile, elapsedSeconds, baseOps);
    case "sustained":
      return baseOps; // Constant rate
    case "oscillation":
      return getOscillationOpsPerSecond(profile, elapsedSeconds, baseOps);
    case "ramp":
      return getRampOpsPerSecond(profile, elapsedSeconds);
    case "custom":
      return getCustomOpsPerSecond(profile, elapsedSeconds);
    default:
      return baseOps;
  }
}

function getSpikeOpsPerSecond(
  profile: LoadProfile,
  elapsedSeconds: number,
  baseOps: number,
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
    // Guard against division by zero when warmupSeconds is 0
    return spikeStart === 0 ? baseOps : baseOps * (elapsedSeconds / spikeStart);
  } else if (elapsedSeconds < spikeEnd) {
    // Spike phase
    return baseOps * spikeMultiplier;
  } else {
    // Cooldown phase - gradual decrease
    const cooldownProgress =
      (elapsedSeconds - spikeEnd) / (profile.durationSeconds - spikeEnd);
    return baseOps * (1 - cooldownProgress * 0.5);
  }
}

function getOscillationOpsPerSecond(
  profile: LoadProfile,
  elapsedSeconds: number,
  baseOps: number,
): number {
  const config = profile.oscillationConfig ?? {
    minOpsPerSecond: baseOps * 0.2,
    maxOpsPerSecond: baseOps * 2,
    periodSeconds: 60,
    waveform: "sine" as const,
  };

  const { minOpsPerSecond, maxOpsPerSecond, periodSeconds, waveform } = config;
  const amplitude = (maxOpsPerSecond - minOpsPerSecond) / 2;
  const midpoint = minOpsPerSecond + amplitude;
  const phase = (elapsedSeconds / periodSeconds) * 2 * Math.PI;

  switch (waveform) {
    case "sine":
      return midpoint + amplitude * Math.sin(phase);
    case "square":
      return Math.sin(phase) >= 0 ? maxOpsPerSecond : minOpsPerSecond;
    case "sawtooth":
      return (
        minOpsPerSecond +
        (maxOpsPerSecond - minOpsPerSecond) *
          ((elapsedSeconds % periodSeconds) / periodSeconds)
      );
    default:
      return midpoint;
  }
}

function getRampOpsPerSecond(
  profile: LoadProfile,
  elapsedSeconds: number,
): number {
  const config = profile.rampConfig ?? {
    startOpsPerSecond: 1,
    endOpsPerSecond: (profile.targetOperations / profile.durationSeconds) * 2,
    rampUpSeconds: profile.durationSeconds * 0.3,
    sustainSeconds: profile.durationSeconds * 0.4,
    rampDownSeconds: profile.durationSeconds * 0.3,
  };

  const {
    startOpsPerSecond,
    endOpsPerSecond,
    rampUpSeconds,
    sustainSeconds,
    rampDownSeconds,
  } = config;
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
    // Guard against division by zero when rampDownSeconds is 0
    const progress =
      rampDownSeconds === 0
        ? 1
        : (elapsedSeconds - rampDownStart) / rampDownSeconds;
    return endOpsPerSecond - (endOpsPerSecond - startOpsPerSecond) * progress;
  }
}

function getCustomOpsPerSecond(
  profile: LoadProfile,
  elapsedSeconds: number,
): number {
  const curve = profile.customConfig?.loadCurve ?? [];
  if (curve.length === 0) return 1;

  // Find the two points to interpolate between
  let prevPoint = curve[0];
  let nextPoint = curve[curve.length - 1];

  for (let i = 0; i < curve.length - 1; i++) {
    if (
      curve[i].second <= elapsedSeconds &&
      curve[i + 1].second > elapsedSeconds
    ) {
      prevPoint = curve[i];
      nextPoint = curve[i + 1];
      break;
    }
  }

  // Linear interpolation
  const range = nextPoint.second - prevPoint.second;
  if (range === 0) return prevPoint.opsPerSecond;

  const progress = (elapsedSeconds - prevPoint.second) / range;
  return (
    prevPoint.opsPerSecond +
    (nextPoint.opsPerSecond - prevPoint.opsPerSecond) * progress
  );
}
