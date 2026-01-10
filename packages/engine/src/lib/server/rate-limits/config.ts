/**
 * Threshold Rate Limiting Configuration
 *
 * Tier-based and endpoint-specific rate limits for Grove applications.
 * Each category specifies both the limit and the time window.
 *
 * @see docs/patterns/threshold-pattern.md
 */

// ============================================================================
// Tier-Based Rate Limits
// ============================================================================

/**
 * Rate limits by subscription tier.
 * Higher tiers get progressively more generous limits.
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
// Endpoint-Specific Rate Limits
// ============================================================================

/**
 * Rate limits for specific endpoints.
 * These apply in addition to tier-based limits.
 */
export const ENDPOINT_RATE_LIMITS = {
	// Auth endpoints (most sensitive)
	'auth/login': { limit: 5, windowSeconds: 300 },
	'auth/callback': { limit: 10, windowSeconds: 300 },
	'auth/token': { limit: 10, windowSeconds: 60 },
	'auth/password-reset': { limit: 3, windowSeconds: 3600 },

	// Write endpoints
	'posts/create': { limit: 10, windowSeconds: 3600 },
	'posts/update': { limit: 30, windowSeconds: 3600 },
	'comments/create': { limit: 20, windowSeconds: 300 },

	// Upload endpoints
	'upload/image': { limit: 20, windowSeconds: 3600 },
	'upload/media': { limit: 10, windowSeconds: 3600 },

	// AI endpoints (expensive)
	'ai/wisp': { limit: 50, windowSeconds: 86400 },
	'ai/fireside': { limit: 50, windowSeconds: 86400 },
	'ai/draft': { limit: 20, windowSeconds: 86400 },

	// Default for unspecified endpoints
	default: { limit: 100, windowSeconds: 60 }
} as const;

// ============================================================================
// Endpoint Mapping
// ============================================================================

/**
 * Map of HTTP method:path patterns to endpoint keys.
 * Extend this as new endpoints are added.
 */
export const ENDPOINT_MAP: Record<string, EndpointKey> = {
	'POST:/api/auth/login': 'auth/login',
	'POST:/api/auth/token': 'auth/token',
	'POST:/api/auth/password-reset': 'auth/password-reset',
	'POST:/api/posts': 'posts/create',
	'PUT:/api/posts': 'posts/update',
	'PATCH:/api/posts': 'posts/update',
	'POST:/api/comments': 'comments/create',
	'POST:/api/upload': 'upload/image',
	'POST:/api/images': 'upload/image',
	'POST:/api/grove/wisp': 'ai/wisp',
	'POST:/api/ai/wisp': 'ai/wisp',
	'POST:/api/ai/fireside': 'ai/fireside',
	'POST:/api/ai/draft': 'ai/draft'
};

// ============================================================================
// Types
// ============================================================================

export type SubscriptionTier = keyof typeof TIER_RATE_LIMITS;
export type RateLimitCategory = keyof (typeof TIER_RATE_LIMITS)['seedling'];
export type EndpointKey = keyof typeof ENDPOINT_RATE_LIMITS;

export interface RateLimitConfig {
	limit: number;
	windowSeconds: number;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Get rate limit configuration for an endpoint by method and pathname.
 * Returns default limits if endpoint is not explicitly configured.
 */
export function getEndpointLimit(method: string, pathname: string): RateLimitConfig {
	const key = `${method}:${pathname}`;
	const endpointKey = ENDPOINT_MAP[key] ?? 'default';
	return ENDPOINT_RATE_LIMITS[endpointKey];
}

/**
 * Get rate limit configuration by direct endpoint key.
 * Use this when you know the endpoint key directly (e.g., 'auth/login', 'auth/callback').
 * Returns default limits if the key is not found.
 */
export function getEndpointLimitByKey(key: EndpointKey): RateLimitConfig {
	return ENDPOINT_RATE_LIMITS[key] ?? ENDPOINT_RATE_LIMITS['default'];
}

/**
 * Get tier limits for a specific category.
 */
export function getTierLimit(tier: SubscriptionTier, category: RateLimitCategory): RateLimitConfig {
	return TIER_RATE_LIMITS[tier][category];
}

/**
 * Check if a tier exists.
 */
export function isValidTier(tier: string): tier is SubscriptionTier {
	return tier in TIER_RATE_LIMITS;
}
