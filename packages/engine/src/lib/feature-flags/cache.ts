/**
 * Feature Flags Caching Layer
 *
 * KV-based caching for fast flag evaluation.
 * Uses 60-second TTL by default, with per-flag override support.
 *
 * @see docs/plans/feature-flags-spec.md
 */

import type {
  CachedFlagValue,
  EvaluationContext,
  EvaluationResult,
  FeatureFlagsEnv,
} from "./types.js";

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_TTL = 60; // seconds

/**
 * Flags that should never be cached (instant effect).
 * Kill switches and maintenance mode flags should bypass cache.
 */
const INSTANT_FLAGS = new Set(["jxl_kill_switch", "maintenance_mode"]);

// =============================================================================
// CACHE KEY BUILDING
// =============================================================================

/**
 * Sanitize a value for use in cache keys.
 * Removes colons and other separator characters to prevent key injection.
 */
function sanitizeForCacheKey(value: string): string {
  // Replace colons (our separator) and control characters
  // Keep alphanumeric, dash, underscore, and dot
  return value.replace(/[^a-zA-Z0-9\-_.]/g, "-");
}

/**
 * Build a deterministic cache key from flag ID and context.
 *
 * Key format: flag:{flagId}:{context_parts}
 *
 * Examples:
 *   flag:jxl_encoding:global
 *   flag:jxl_encoding:tenant:abc123
 *   flag:meadow_access:tier:oak
 *   flag:meadow_access:tenant:xyz:tier:oak
 *
 * Context values are sanitized to prevent cache key injection.
 */
export function buildCacheKey(
  flagId: string,
  context: EvaluationContext,
): string {
  const parts = ["flag", sanitizeForCacheKey(flagId)];

  // Add context parts in consistent order (sanitized)
  if (context.tenantId) {
    parts.push("tenant", sanitizeForCacheKey(context.tenantId));
  }
  if (context.tier) {
    parts.push("tier", sanitizeForCacheKey(context.tier));
  }
  if (context.userId) {
    parts.push("user", sanitizeForCacheKey(context.userId));
  }
  if (context.sessionId && !context.userId && !context.tenantId) {
    // Only include sessionId if no other identifiers
    parts.push("session", sanitizeForCacheKey(context.sessionId));
  }

  // If no context, use 'global'
  if (parts.length === 2) {
    parts.push("global");
  }

  return parts.join(":");
}

// =============================================================================
// CACHE OPERATIONS
// =============================================================================

/**
 * Get a cached flag value from KV.
 *
 * @returns The cached value if valid, null if not cached or expired
 */
export async function getCachedValue<T>(
  key: string,
  env: FeatureFlagsEnv,
): Promise<CachedFlagValue<T> | null> {
  try {
    const cached = await env.FLAGS_KV.get<CachedFlagValue<T>>(key, "json");

    if (!cached) return null;

    // Check if expired (KV TTL should handle this, but double-check)
    if (isCacheExpired(cached)) {
      // Don't await delete - let it happen in background
      env.FLAGS_KV.delete(key).catch(() => {
        // Ignore delete errors
      });
      return null;
    }

    return cached;
  } catch {
    // KV read failed - return null to trigger fresh evaluation
    return null;
  }
}

/**
 * Check if a cached value is expired.
 */
function isCacheExpired<T>(cached: CachedFlagValue<T>): boolean {
  const expiresAt = new Date(cached.expiresAt);
  return new Date() > expiresAt;
}

/**
 * Cache an evaluation result in KV.
 *
 * @param key - The cache key
 * @param result - The evaluation result to cache
 * @param env - Cloudflare environment bindings
 * @param ttlOverride - Optional TTL override (from flag config)
 */
export async function cacheResult<T>(
  key: string,
  result: EvaluationResult<T>,
  env: FeatureFlagsEnv,
  ttlOverride?: number | null,
): Promise<void> {
  // Skip caching for instant flags
  if (INSTANT_FLAGS.has(result.flagId)) return;

  // Skip if TTL is 0 (explicit no-cache)
  if (ttlOverride === 0) return;

  const ttl = ttlOverride ?? DEFAULT_TTL;

  const cached: CachedFlagValue<T> = {
    value: result.value,
    flagId: result.flagId,
    matched: result.matched,
    matchedRuleId: result.matchedRuleId,
    evaluatedAt: result.evaluatedAt.toISOString(),
    expiresAt: new Date(Date.now() + ttl * 1000).toISOString(),
  };

  try {
    await env.FLAGS_KV.put(key, JSON.stringify(cached), {
      expirationTtl: ttl,
    });
  } catch {
    // Cache write failed - not critical, continue without caching
    console.warn(`Failed to cache flag ${result.flagId}`);
  }
}

/**
 * Convert a cached value to an evaluation result.
 */
export function cachedToResult<T>(
  cached: CachedFlagValue<T>,
): EvaluationResult<T> {
  return {
    value: cached.value,
    flagId: cached.flagId,
    matched: cached.matched,
    matchedRuleId: cached.matchedRuleId,
    evaluatedAt: new Date(cached.evaluatedAt),
    cached: true,
  };
}

// =============================================================================
// CACHE INVALIDATION
// =============================================================================

/**
 * Invalidate all cached values for a specific flag.
 * Called when a flag is updated in the admin UI.
 *
 * Handles pagination for flags with >1000 cached variants.
 */
export async function invalidateFlag(
  flagId: string,
  env: FeatureFlagsEnv,
): Promise<number> {
  const sanitizedFlagId = sanitizeForCacheKey(flagId);
  const prefix = `flag:${sanitizedFlagId}:`;
  let totalDeleted = 0;
  let cursor: string | undefined;

  try {
    do {
      const list = await env.FLAGS_KV.list({ prefix, cursor });

      if (list.keys.length > 0) {
        await Promise.all(list.keys.map((key) => env.FLAGS_KV.delete(key.name)));
        totalDeleted += list.keys.length;
      }

      // Continue if there are more keys (list_complete is false when there's more)
      cursor = list.list_complete ? undefined : list.cursor;
    } while (cursor);

    if (totalDeleted > 0) {
      console.log(`Invalidated ${totalDeleted} cache entries for flag ${flagId}`);
    }
    return totalDeleted;
  } catch (error) {
    console.error(`Failed to invalidate cache for flag ${flagId}:`, error);
    return totalDeleted; // Return what we managed to delete
  }
}

/**
 * Invalidate all feature flag caches.
 * Use sparingly - only for emergency situations.
 *
 * Handles pagination for >1000 total cached flags.
 */
export async function invalidateAllFlags(env: FeatureFlagsEnv): Promise<number> {
  const prefix = "flag:";
  let totalDeleted = 0;
  let cursor: string | undefined;

  try {
    do {
      const list = await env.FLAGS_KV.list({ prefix, cursor });

      if (list.keys.length > 0) {
        await Promise.all(list.keys.map((key) => env.FLAGS_KV.delete(key.name)));
        totalDeleted += list.keys.length;
      }

      cursor = list.list_complete ? undefined : list.cursor;
    } while (cursor);

    console.log(`Invalidated ${totalDeleted} total flag cache entries`);
    return totalDeleted;
  } catch (error) {
    console.error("Failed to invalidate all flag caches:", error);
    return totalDeleted;
  }
}

/**
 * Check if a flag should bypass the cache.
 */
export function shouldBypassCache(flagId: string): boolean {
  return INSTANT_FLAGS.has(flagId);
}

/**
 * Get the default cache TTL.
 */
export function getDefaultTtl(): number {
  return DEFAULT_TTL;
}
