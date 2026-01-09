/**
 * Rate Limiting Module
 *
 * Server-side rate limiting utilities following the Threshold pattern.
 * All exports are available from '@autumnsgrove/groveengine/server'.
 *
 * @see docs/patterns/threshold-pattern.md
 * @see plans/threshold-engine-integration.md
 */

// Configuration
export { TIER_RATE_LIMITS, ENDPOINT_RATE_LIMITS, getEndpointLimit } from './config';
export type { SubscriptionTier, RateLimitCategory, EndpointKey } from './config';

// Middleware helpers
export {
	checkRateLimit,
	rateLimitHeaders,
	buildRateLimitKey,
	getClientIP
} from './middleware';
export type {
	RateLimitResult,
	RateLimitMiddlewareOptions,
	RateLimitCheckResult
} from './middleware';
