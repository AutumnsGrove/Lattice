/**
 * Tenant Rate Limiting
 *
 * Provides tier-based rate limiting for multi-tenant applications.
 * Each tenant has rate limits based on their subscription tier.
 *
 * @see docs/patterns/threshold-pattern.md
 */

import { rateLimit, type RateLimitResult } from '../services/cache.js';
import { TIER_RATE_LIMITS, type SubscriptionTier, type RateLimitCategory } from './config.js';

// ============================================================================
// Tenant Rate Limiting
// ============================================================================

/**
 * Check rate limit for a tenant based on their subscription tier.
 *
 * @example
 * ```typescript
 * // In a SvelteKit hook or route
 * const tenantId = event.url.hostname.split('.')[0]; // e.g., 'alice' from alice.grove.place
 * const tier = await getTenantTier(tenantId); // Your tier lookup
 *
 * const result = await checkTenantRateLimit(kv, tenantId, tier, 'writes');
 * if (!result.allowed) {
 *   return json({ error: 'Tenant rate limited' }, { status: 429 });
 * }
 * ```
 */
export async function checkTenantRateLimit(
	kv: KVNamespace,
	tenantId: string,
	tier: SubscriptionTier,
	category: RateLimitCategory
): Promise<RateLimitResult> {
	const tierConfig = TIER_RATE_LIMITS[tier];
	const categoryConfig = tierConfig[category];

	return rateLimit(kv, `tenant:${tenantId}:${category}`, {
		limit: categoryConfig.limit,
		windowSeconds: categoryConfig.windowSeconds,
		namespace: 'tenant-ratelimit'
	});
}

/**
 * Determine the rate limit category for a request based on method and path.
 *
 * @example
 * ```typescript
 * const category = categorizeRequest('POST', '/api/posts');
 * // Returns: 'writes'
 * ```
 */
export function categorizeRequest(method: string, pathname: string): RateLimitCategory {
	// AI endpoints (most expensive) - use startsWith for robust prefix matching
	if (
		pathname.startsWith('/api/ai/') ||
		pathname.startsWith('/api/wisp') ||
		pathname.startsWith('/api/grove/wisp')
	) {
		return 'ai';
	}

	// Upload endpoints
	if (
		pathname.startsWith('/api/upload') ||
		pathname.startsWith('/api/images') ||
		pathname.startsWith('/api/cdn')
	) {
		return 'uploads';
	}

	// Write operations (POST, PUT, DELETE)
	if (method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE') {
		return 'writes';
	}

	// Everything else is a read request
	return 'requests';
}

/**
 * Get the tenant rate limit info for display in UI.
 *
 * @example
 * ```typescript
 * const limits = getTenantLimitInfo('sapling');
 * // Returns: { requests: { limit: 500, windowSeconds: 60 }, ... }
 * ```
 */
export function getTenantLimitInfo(tier: SubscriptionTier) {
	return TIER_RATE_LIMITS[tier];
}

/**
 * Format rate limit for user-friendly display.
 *
 * @example
 * ```typescript
 * formatLimit(100, 60); // '100 per minute'
 * formatLimit(50, 3600); // '50 per hour'
 * formatLimit(25, 86400); // '25 per day'
 * ```
 */
export function formatLimit(limit: number, windowSeconds: number): string {
	// Exactly 1 minute
	if (windowSeconds <= 60) {
		return `${limit} per minute`;
	}

	// Exactly 1 hour (3600 seconds)
	if (windowSeconds === 3600) {
		return `${limit} per hour`;
	}

	// Exactly 1 day (86400 seconds)
	if (windowSeconds === 86400) {
		return `${limit} per day`;
	}

	// Less than 1 hour - show in minutes
	if (windowSeconds < 3600) {
		const minutes = Math.round(windowSeconds / 60);
		return `${limit} per ${minutes} minutes`;
	}

	// Less than 1 day - show in hours
	if (windowSeconds < 86400) {
		const hours = Math.round(windowSeconds / 3600);
		return hours === 1 ? `${limit} per hour` : `${limit} per ${hours} hours`;
	}

	// Multiple days
	const days = Math.round(windowSeconds / 86400);
	return days === 1 ? `${limit} per day` : `${limit} per ${days} days`;
}
