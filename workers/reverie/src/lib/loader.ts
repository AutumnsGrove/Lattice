/**
 * Reverie Loader — Schema Loading with Tier Limits
 *
 * Wraps getSchemas() from the registry with tier-based domain limits.
 * Higher tiers can modify more domains per request.
 */

import { getSchemas } from "@autumnsgrove/lattice/reverie";
import type { DomainId, DomainSchema } from "@autumnsgrove/lattice/reverie";

// =============================================================================
// Tier Limits
// =============================================================================

/** Maximum number of domains per request, by tier */
const TIER_DOMAIN_LIMITS: Record<string, number> = {
	free: 0,
	seedling: 3,
	sapling: 5,
	oak: 10,
	evergreen: 20,
};

// =============================================================================
// Loader
// =============================================================================

/**
 * Load domain schemas with tier-based limits.
 * Returns the schemas and whether any were trimmed due to tier limits.
 */
export function loadSchemas(
	domainIds: DomainId[],
	tier: string,
): { schemas: DomainSchema[]; trimmed: boolean; limit: number } {
	const limit = TIER_DOMAIN_LIMITS[tier] ?? 0;
	const trimmed = domainIds.length > limit;
	const limitedIds = domainIds.slice(0, limit);
	const schemas = getSchemas(limitedIds);

	return { schemas, trimmed, limit };
}
