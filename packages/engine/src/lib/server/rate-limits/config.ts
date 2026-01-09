/**
 * Rate Limit Configuration
 *
 * Tier-based and endpoint-specific rate limits following the Threshold pattern.
 * All limits include embedded window durations for simplicity.
 *
 * @see docs/patterns/threshold-pattern.md
 */

// ============================================================================
// Tier-Based Limits (for multi-tenant fairness)
// ============================================================================

/**
 * Tier-based rate limits with embedded window durations.
 * Each category specifies both the limit and the time window.
 */
export const TIER_RATE_LIMITS = {
	seedling: {
		requests: { limit: 100, windowSeconds: 60 },
		writes: { limit: 50, windowSeconds: 3600 },
		uploads: { limit: 10, windowSeconds: 86400 },
		ai: { limit: 25, windowSeconds: 86400 }
	},
	sapling: {
		requests: { limit: 500, windowSeconds: 60 },
		writes: { limit: 200, windowSeconds: 3600 },
		uploads: { limit: 50, windowSeconds: 86400 },
		ai: { limit: 100, windowSeconds: 86400 }
	},
	oak: {
		requests: { limit: 1000, windowSeconds: 60 },
		writes: { limit: 500, windowSeconds: 3600 },
		uploads: { limit: 200, windowSeconds: 86400 },
		ai: { limit: 500, windowSeconds: 86400 }
	},
	evergreen: {
		requests: { limit: 5000, windowSeconds: 60 },
		writes: { limit: 2000, windowSeconds: 3600 },
		uploads: { limit: 1000, windowSeconds: 86400 },
		ai: { limit: 2500, windowSeconds: 86400 }
	}
} as const;

// ============================================================================
// Endpoint-Specific Limits (for sensitive operations)
// ============================================================================

/**
 * Endpoint-specific rate limits.
 * Auth endpoints are intentionally strict to prevent brute force attacks.
 */
export const ENDPOINT_RATE_LIMITS = {
	// Auth endpoints - most sensitive (brute force protection)
	'auth/login': { limit: 10, windowSeconds: 300 }, // 10 per 5 minutes
	'auth/callback': { limit: 20, windowSeconds: 300 }, // 20 per 5 minutes
	'auth/token': { limit: 10, windowSeconds: 60 }, // 10 per minute

	// Write endpoints
	'posts/create': { limit: 10, windowSeconds: 3600 }, // 10 per hour
	'comments/create': { limit: 20, windowSeconds: 300 }, // 20 per 5 minutes

	// Upload endpoints
	'upload/image': { limit: 20, windowSeconds: 3600 }, // 20 per hour

	// AI endpoints (expensive operations)
	'ai/wisp': { limit: 50, windowSeconds: 86400 }, // 50 per day

	// Default for unspecified endpoints
	default: { limit: 100, windowSeconds: 60 } // 100 per minute
} as const;

// ============================================================================
// Type Exports
// ============================================================================

export type SubscriptionTier = keyof typeof TIER_RATE_LIMITS;
export type RateLimitCategory = keyof (typeof TIER_RATE_LIMITS)['seedling'];
export type EndpointKey = keyof typeof ENDPOINT_RATE_LIMITS;

/**
 * Get rate limit config for a specific endpoint.
 * Returns default limits if endpoint is not explicitly configured.
 */
export function getEndpointLimit(
	endpointKey: string
): { limit: number; windowSeconds: number } {
	if (endpointKey in ENDPOINT_RATE_LIMITS) {
		return ENDPOINT_RATE_LIMITS[endpointKey as EndpointKey];
	}
	return ENDPOINT_RATE_LIMITS.default;
}
