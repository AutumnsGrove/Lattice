/**
 * Threshold Rate Limiting Module
 *
 * Provides a complete rate limiting solution for Grove applications:
 * - Tier-based limits (seedling, sapling, oak, evergreen)
 * - Endpoint-specific limits
 * - Middleware helpers for SvelteKit
 * - Abuse tracking with graduated response
 *
 * @example
 * ```typescript
 * import {
 *   checkRateLimit,
 *   rateLimitHeaders,
 *   TIER_RATE_LIMITS
 * } from '@autumnsgrove/groveengine/server';
 *
 * // In a SvelteKit route
 * const { result, response } = await checkRateLimit({
 *   kv: platform.env.CACHE,
 *   key: `endpoint:${userId}`,
 *   limit: 10,
 *   windowSeconds: 60,
 * });
 * if (response) return response;
 * ```
 *
 * @see docs/patterns/threshold-pattern.md
 */

// ============================================================================
// Configuration
// ============================================================================

export {
	TIER_RATE_LIMITS,
	ENDPOINT_RATE_LIMITS,
	ENDPOINT_MAP,
	getEndpointLimit,
	getEndpointLimitByKey,
	getTierLimit,
	isValidTier
} from './config.js';

export type {
	SubscriptionTier,
	RateLimitCategory,
	EndpointKey,
	RateLimitConfig
} from './config.js';

// ============================================================================
// Core Rate Limiting (re-exported from cache for convenience)
// ============================================================================

export { rateLimit, type RateLimitResult } from '../services/cache.js';

// ============================================================================
// Middleware Helpers
// ============================================================================

export { checkRateLimit, rateLimitHeaders, buildRateLimitKey, getClientIP } from './middleware.js';

export type { RateLimitMiddlewareOptions, RateLimitCheckResult } from './middleware.js';

// ============================================================================
// Tenant Rate Limiting
// ============================================================================

export {
	checkTenantRateLimit,
	categorizeRequest,
	getTenantLimitInfo,
	formatLimit
} from './tenant.js';

// ============================================================================
// Abuse Tracking (Graduated Response)
// ============================================================================

export {
	getAbuseState,
	recordViolation,
	isBanned,
	getBanRemaining,
	clearAbuseState
} from './abuse.js';

export type { AbuseState, ViolationResult } from './abuse.js';
