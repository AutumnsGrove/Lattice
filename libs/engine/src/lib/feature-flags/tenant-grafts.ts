/**
 * Tenant Graft Override API
 *
 * Allows greenhouse tenants to self-serve their own graft preferences.
 * Creates tenant-specific override rules rather than changing global flags.
 *
 * This is the "self-serve" layer of the grafts system - tenants can toggle
 * greenhouse-only features on/off for their own site without affecting
 * other tenants or requiring operator intervention.
 *
 * @example
 * ```typescript
 * import { setTenantGraftOverride, getTenantControllableGrafts } from '$lib/feature-flags/tenant-grafts';
 *
 * // Get grafts a tenant can control
 * const grafts = await getTenantControllableGrafts(tenantId, env);
 *
 * // Tenant toggles Fireside off for themselves
 * await setTenantGraftOverride('fireside_mode', tenantId, false, env);
 * ```
 */

import type { FeatureFlagsEnv, FeatureFlagRow, FlagRuleRow } from "./types.js";
import { invalidateFlag } from "./cache.js";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Information about a graft that a tenant can control.
 */
export interface TenantGraftInfo {
  /** Unique flag identifier */
  id: string;

  /** Human-readable flag name */
  name: string;

  /** Optional description explaining what this graft does */
  description?: string;

  /** Whether the graft is currently enabled for this tenant */
  enabled: boolean;

  /** Whether the tenant has a custom override (vs. using default) */
  hasOverride: boolean;

  /** The graft's global default value */
  globalDefault: boolean;

  /** Category for grouping (derived from flag ID prefix) */
  category: "experimental" | "stable" | "beta";
}

// =============================================================================
// TENANT GRAFT FUNCTIONS
// =============================================================================

/**
 * Get all grafts that a tenant can control.
 *
 * Returns greenhouse-only grafts that are globally enabled (cultivated).
 * Tenants can toggle these on/off for their own site.
 *
 * @param tenantId - The tenant identifier
 * @param env - Cloudflare environment bindings
 * @returns Array of controllable grafts with current status
 */
export async function getTenantControllableGrafts(
  tenantId: string,
  env: FeatureFlagsEnv,
): Promise<TenantGraftInfo[]> {
  try {
    // Get all greenhouse-only flags that are enabled
    const flagsResult = await env.DB.prepare(
      `SELECT id, name, description, flag_type, default_value, enabled, greenhouse_only
       FROM feature_flags
       WHERE greenhouse_only = 1 AND enabled = 1 AND flag_type = 'boolean'
       ORDER BY name ASC`,
    ).all<FeatureFlagRow>();

    const flags = flagsResult.results ?? [];
    if (flags.length === 0) return [];

    // Get any tenant-specific overrides
    const flagIds = flags.map((f) => f.id);
    const placeholders = flagIds.map(() => "?").join(",");

    const rulesResult = await env.DB.prepare(
      `SELECT flag_id, result_value, enabled
       FROM flag_rules
       WHERE rule_type = 'tenant_override'
         AND flag_id IN (${placeholders})
         AND rule_value LIKE ?
         AND enabled = 1`,
    )
      .bind(...flagIds, `%"${tenantId}"%`)
      .all<{ flag_id: string; result_value: string; enabled: number }>();

    // Build a map of tenant overrides
    const overrides = new Map<string, boolean>();
    for (const rule of rulesResult.results ?? []) {
      try {
        const value = JSON.parse(rule.result_value);
        overrides.set(rule.flag_id, value === true);
      } catch {
        // Skip malformed rules
      }
    }

    // Build the response
    return flags.map((flag) => {
      const globalDefault = flag.default_value === "true";
      const hasOverride = overrides.has(flag.id);
      const enabled = hasOverride ? overrides.get(flag.id)! : globalDefault;

      return {
        id: flag.id,
        name: flag.name,
        description: flag.description ?? undefined,
        enabled,
        hasOverride,
        globalDefault,
        category: getCategoryFromId(flag.id),
      };
    });
  } catch (error) {
    console.error("[TenantGrafts] Failed to load controllable grafts:", error);
    return [];
  }
}

/**
 * Set a tenant-specific graft override.
 *
 * This creates or updates a flag_rule with rule_type = 'tenant_override'.
 * The rule is specific to this tenant and doesn't affect other tenants.
 *
 * @param flagId - The graft identifier
 * @param tenantId - The tenant identifier
 * @param enabled - Whether to enable or disable the graft
 * @param env - Cloudflare environment bindings
 * @returns True if the override was set successfully
 */
export async function setTenantGraftOverride(
  flagId: string,
  tenantId: string,
  enabled: boolean,
  env: FeatureFlagsEnv,
): Promise<boolean> {
  try {
    // First verify this is a valid greenhouse-only flag
    const flag = await env.DB.prepare(
      `SELECT id, greenhouse_only, enabled FROM feature_flags WHERE id = ?`,
    )
      .bind(flagId)
      .first<{ id: string; greenhouse_only: number; enabled: number }>();

    if (!flag) {
      console.error(`[TenantGrafts] Flag not found: ${flagId}`);
      return false;
    }

    if (flag.greenhouse_only !== 1) {
      console.error(`[TenantGrafts] Flag is not greenhouse-only: ${flagId}`);
      return false;
    }

    if (flag.enabled !== 1) {
      console.error(`[TenantGrafts] Flag is not globally enabled: ${flagId}`);
      return false;
    }

    // Build the rule_value JSON for this tenant
    const ruleValue = JSON.stringify({ tenantId });
    const resultValue = JSON.stringify(enabled);

    // Try to update existing override first
    const updateResult = await env.DB.prepare(
      `UPDATE flag_rules
       SET result_value = ?, enabled = 1, created_at = datetime('now')
       WHERE flag_id = ? AND rule_type = 'tenant_override' AND rule_value = ?`,
    )
      .bind(resultValue, flagId, ruleValue)
      .run();

    if (updateResult.meta.changes === 0) {
      // No existing rule, insert a new one
      // Auto-assign unique priority in 40-59 range (below explicit tenant rules at 100)
      await env.DB.prepare(
        `INSERT INTO flag_rules (flag_id, priority, rule_type, rule_value, result_value, enabled, created_at)
         VALUES (?, (SELECT COALESCE(MAX(priority), 39) + 1 FROM flag_rules WHERE flag_id = ? AND priority BETWEEN 40 AND 59), 'tenant_override', ?, ?, 1, datetime('now'))`,
      )
        .bind(flagId, flagId, ruleValue, resultValue)
        .run();
    }

    // Invalidate cache so the change takes effect immediately
    await invalidateFlag(flagId, env);

    return true;
  } catch (error) {
    console.error(
      `[TenantGrafts] Failed to set override for ${flagId}:`,
      error,
    );
    return false;
  }
}

/**
 * Remove a tenant's graft override, returning to default behavior.
 *
 * @param flagId - The graft identifier
 * @param tenantId - The tenant identifier
 * @param env - Cloudflare environment bindings
 * @returns True if the override was removed successfully
 */
export async function removeTenantGraftOverride(
  flagId: string,
  tenantId: string,
  env: FeatureFlagsEnv,
): Promise<boolean> {
  try {
    const ruleValue = JSON.stringify({ tenantId });

    await env.DB.prepare(
      `DELETE FROM flag_rules
       WHERE flag_id = ? AND rule_type = 'tenant_override' AND rule_value = ?`,
    )
      .bind(flagId, ruleValue)
      .run();

    // Invalidate cache
    await invalidateFlag(flagId, env);

    return true;
  } catch (error) {
    console.error(
      `[TenantGrafts] Failed to remove override for ${flagId}:`,
      error,
    );
    return false;
  }
}

/**
 * Reset all graft overrides for a tenant to defaults.
 *
 * @param tenantId - The tenant identifier
 * @param env - Cloudflare environment bindings
 * @returns Number of overrides removed
 */
export async function resetTenantGraftOverrides(
  tenantId: string,
  env: FeatureFlagsEnv,
): Promise<number> {
  try {
    // Find all overrides for this tenant
    const ruleValue = JSON.stringify({ tenantId });

    const result = await env.DB.prepare(
      `DELETE FROM flag_rules
       WHERE rule_type = 'tenant_override' AND rule_value = ?`,
    )
      .bind(ruleValue)
      .run();

    // Invalidate all greenhouse flags to be safe
    // (We could be smarter and only invalidate affected flags)
    await env.FLAGS_KV.delete(`greenhouse:${tenantId}`);

    return result.meta.changes ?? 0;
  } catch (error) {
    console.error("[TenantGrafts] Failed to reset overrides:", error);
    return 0;
  }
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Derive a category from a flag ID.
 * Convention: IDs starting with "beta_" are beta, others are experimental.
 */
function getCategoryFromId(id: string): "experimental" | "stable" | "beta" {
  if (id.startsWith("beta_")) return "beta";
  if (id.startsWith("stable_")) return "stable";
  return "experimental";
}
