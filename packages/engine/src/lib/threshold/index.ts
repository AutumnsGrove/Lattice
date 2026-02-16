/**
 * Threshold — Unified Rate Limiting SDK
 *
 * Core barrel export. Adapters have separate export paths for tree-shaking:
 * - @autumnsgrove/groveengine/threshold         (this file)
 * - @autumnsgrove/groveengine/threshold/sveltekit
 * - @autumnsgrove/groveengine/threshold/hono
 * - @autumnsgrove/groveengine/threshold/worker
 */

// Core types
export type {
  ThresholdResult,
  ThresholdCheckOptions,
  ThresholdStore,
} from "./types.js";

// Threshold class
export { Threshold, categorizeRequest } from "./threshold.js";
export type { ThresholdOptions } from "./threshold.js";

// Storage adapters
export { ThresholdKVStore } from "./stores/kv.js";
export { ThresholdD1Store } from "./stores/d1.js";

// Configuration
export {
  ENDPOINT_RATE_LIMITS,
  ENDPOINT_MAP,
  getEndpointLimit,
  getEndpointLimitByKey,
} from "./config.js";
export type { EndpointKey } from "./config.js";

// Abuse tracking
export {
  getAbuseState,
  recordViolation,
  isBanned,
  getBanRemaining,
  clearAbuseState,
} from "./abuse.js";
export type { AbuseState, ViolationResult } from "./abuse.js";

// Factory
export { createThreshold } from "./factory.js";

// Errors
export { THRESHOLD_ERRORS, logThresholdError } from "./errors.js";
export type { ThresholdErrorKey } from "./errors.js";

// Test utilities (consumers can import directly from test-utils.js if needed)
export { createMockKV, createMockD1, createMockStore } from "./test-utils.js";
