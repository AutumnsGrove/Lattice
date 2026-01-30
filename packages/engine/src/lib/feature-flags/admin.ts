/**
 * Feature Flags Admin API
 *
 * Functions for managing feature flags in the admin UI.
 * Provides simple global enable/disable (cultivate/prune) controls.
 *
 * @example
 * ```typescript
 * import { getFeatureFlags, setFlagEnabled } from '$lib/feature-flags/admin';
 *
 * // Get all flags for display
 * const flags = await getFeatureFlags(env);
 *
 * // Cultivate (enable globally)
 * await setFlagEnabled('jxl_encoding', true, env);
 *
 * // Prune (disable globally)
 * await setFlagEnabled('jxl_encoding', false, env);
 * ```
 */

import type { FeatureFlagsEnv, FlagType, FeatureFlagRow } from "./types.js";
import { invalidateFlag } from "./cache.js";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Summary of a feature flag for admin display.
 */
export interface FeatureFlagSummary {
  /** Unique flag identifier */
  id: string;

  /** Human-readable flag name */
  name: string;

  /** Optional description */
  description?: string;

  /** Whether the flag is globally enabled (cultivated) */
  enabled: boolean;

  /** Whether the flag is only available to greenhouse tenants */
  greenhouseOnly: boolean;

  /** The type of flag value */
  flagType: FlagType;

  /** Default value when no rules match */
  defaultValue: unknown;

  /** Cache TTL in seconds (0 = no cache) */
  cacheTtl: number;
}

// =============================================================================
// ADMIN FUNCTIONS
// =============================================================================

/**
 * Get all feature flags for admin display.
 *
 * @param env - Cloudflare environment bindings
 * @returns Array of flag summaries sorted by name
 */
export async function getFeatureFlags(
  env: FeatureFlagsEnv,
): Promise<FeatureFlagSummary[]> {
  try {
    const result = await env.DB.prepare(
      `SELECT id, name, description, flag_type, default_value, enabled, greenhouse_only, cache_ttl
       FROM feature_flags
       ORDER BY name ASC`,
    ).all<FeatureFlagRow>();

    return (result.results ?? []).map(rowToFlagSummary);
  } catch (error) {
    console.error("Failed to load feature flags:", error);
    return [];
  }
}

/**
 * Toggle a flag's enabled status (cultivate/prune).
 *
 * When enabled = true (cultivate): Flag rules are evaluated normally
 * When enabled = false (prune): Flag always returns default_value
 *
 * @param flagId - The flag identifier
 * @param enabled - Whether to enable (cultivate) or disable (prune)
 * @param env - Cloudflare environment bindings
 * @returns True if the update succeeded
 */
export async function setFlagEnabled(
  flagId: string,
  enabled: boolean,
  env: FeatureFlagsEnv,
): Promise<boolean> {
  try {
    const result = await env.DB.prepare(
      `UPDATE feature_flags
       SET enabled = ?, updated_at = datetime('now')
       WHERE id = ?`,
    )
      .bind(enabled ? 1 : 0, flagId)
      .run();

    if (result.meta.changes === 0) {
      // Flag not found
      return false;
    }

    // Invalidate the cache so the change takes effect immediately
    await invalidateFlag(flagId, env);

    return true;
  } catch (error) {
    console.error(`Failed to update flag ${flagId}:`, error);
    return false;
  }
}

/**
 * Get a single flag's summary by ID.
 *
 * @param flagId - The flag identifier
 * @param env - Cloudflare environment bindings
 * @returns The flag summary or null if not found
 */
export async function getFeatureFlag(
  flagId: string,
  env: FeatureFlagsEnv,
): Promise<FeatureFlagSummary | null> {
  try {
    const result = await env.DB.prepare(
      `SELECT id, name, description, flag_type, default_value, enabled, greenhouse_only, cache_ttl
       FROM feature_flags
       WHERE id = ?`,
    )
      .bind(flagId)
      .first<FeatureFlagRow>();

    return result ? rowToFlagSummary(result) : null;
  } catch (error) {
    console.error(`Failed to load flag ${flagId}:`, error);
    return null;
  }
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Convert a database row to a FeatureFlagSummary.
 */
function rowToFlagSummary(row: FeatureFlagRow): FeatureFlagSummary {
  let defaultValue: unknown;
  try {
    defaultValue = JSON.parse(row.default_value);
  } catch {
    defaultValue = row.default_value;
  }

  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    enabled: row.enabled === 1,
    greenhouseOnly: row.greenhouse_only === 1,
    flagType: row.flag_type as FlagType,
    defaultValue,
    cacheTtl: row.cache_ttl ?? 300,
  };
}
