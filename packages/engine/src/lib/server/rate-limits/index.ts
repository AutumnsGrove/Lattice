/**
 * @deprecated Use $lib/threshold/ modules instead.
 * This barrel is a compatibility shim — all real logic lives in threshold/.
 *
 * Migration paths:
 *   $lib/server/rate-limits         → $lib/threshold
 *   $lib/server/rate-limits/config  → $lib/threshold/config
 *   $lib/server/rate-limits/abuse   → $lib/threshold/abuse
 *   checkRateLimit(...)             → createThreshold() + thresholdCheck()
 */

// Configuration (re-exported from threshold)
export {
  ENDPOINT_RATE_LIMITS,
  ENDPOINT_MAP,
  getEndpointLimit,
  getEndpointLimitByKey,
} from "../../threshold/config.js";

export type { EndpointKey } from "../../threshold/config.js";

// Legacy config exports still from local files
export { TIER_RATE_LIMITS, getTierLimit, isValidTier } from "./config.js";

export type {
  SubscriptionTier,
  RateLimitCategory,
  RateLimitConfig,
} from "./config.js";

// Core rate limiting (shim re-exports)
export type { ThresholdResult as RateLimitResult } from "../../threshold/types.js";

// Middleware helpers (shim)
export {
  checkRateLimit,
  rateLimitHeaders,
  buildRateLimitKey,
  getClientIP,
} from "./middleware.js";

// RateLimitMiddlewareOptions and RateLimitCheckResult removed —
// use ThresholdResult (re-exported as RateLimitResult above)

// Tenant rate limiting (still local — not yet in threshold)
export {
  checkTenantRateLimit,
  categorizeRequest,
  getTenantLimitInfo,
  formatLimit,
} from "./tenant.js";

// Abuse tracking (re-exported from threshold)
export {
  getAbuseState,
  recordViolation,
  isBanned,
  getBanRemaining,
  clearAbuseState,
} from "../../threshold/abuse.js";

export type { AbuseState, ViolationResult } from "../../threshold/abuse.js";
