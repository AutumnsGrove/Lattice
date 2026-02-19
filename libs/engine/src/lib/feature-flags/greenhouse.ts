/**
 * Greenhouse Program Management
 *
 * Functions for managing the greenhouse program - a trusted-tester tier
 * that allows selected tenants early access to experimental features.
 *
 * Features greenhouse_only flag behavior:
 * - Flags with greenhouse_only=1 are only visible to greenhouse tenants
 * - When a flag "graduates" from greenhouse, set greenhouse_only=0
 *
 * @see docs/plans/feature-flags-spec.md
 */

import type {
  FeatureFlagsEnv,
  GreenhouseTenant,
  GreenhouseTenantRow,
} from "./types.js";

// =============================================================================
// CONSTANTS
// =============================================================================

/** Cache TTL for greenhouse membership checks (60 seconds) */
const GREENHOUSE_CACHE_TTL = 60;

/** KV key prefix for greenhouse caching */
const GREENHOUSE_CACHE_PREFIX = "greenhouse:";

// =============================================================================
// GREENHOUSE STATUS CHECKS
// =============================================================================

/**
 * Check if a tenant is enrolled in the greenhouse program.
 * Uses KV caching for performance (60s TTL).
 *
 * @param tenantId - The tenant ID to check
 * @param env - Cloudflare environment bindings
 * @returns True if tenant is in greenhouse and enabled
 *
 * @example
 * ```typescript
 * const inGreenhouse = await isInGreenhouse(locals.tenant.id, platform.env);
 * if (inGreenhouse) {
 *   // Show experimental features
 * }
 * ```
 */
export async function isInGreenhouse(
  tenantId: string,
  env: FeatureFlagsEnv,
): Promise<boolean> {
  if (!tenantId) return false;

  // Check cache first
  const cacheKey = `${GREENHOUSE_CACHE_PREFIX}${tenantId}`;
  try {
    const cached = await env.FLAGS_KV.get(cacheKey);
    if (cached !== null) {
      return cached === "true";
    }
  } catch {
    // Cache read failed - continue to DB query
  }

  // Query database
  try {
    const result = await env.DB.prepare(
      "SELECT enabled FROM greenhouse_tenants WHERE tenant_id = ? AND enabled = 1",
    )
      .bind(tenantId)
      .first<{ enabled: number }>();

    const inGreenhouse = result !== null;

    // Cache the result
    try {
      await env.FLAGS_KV.put(cacheKey, inGreenhouse ? "true" : "false", {
        expirationTtl: GREENHOUSE_CACHE_TTL,
      });
    } catch {
      // Cache write failed - not critical
    }

    return inGreenhouse;
  } catch (error) {
    console.error(`Failed to check greenhouse status for ${tenantId}:`, error);
    return false; // Fail safe - don't grant greenhouse access on error
  }
}

/**
 * Invalidate the greenhouse cache for a specific tenant.
 * Call this after enrollment changes.
 *
 * @param tenantId - The tenant ID to invalidate
 * @param env - Cloudflare environment bindings
 */
export async function invalidateGreenhouseCache(
  tenantId: string,
  env: FeatureFlagsEnv,
): Promise<void> {
  const cacheKey = `${GREENHOUSE_CACHE_PREFIX}${tenantId}`;
  try {
    await env.FLAGS_KV.delete(cacheKey);
  } catch (error) {
    // Log cache invalidation failures - stale cache could cause confusing behavior
    // where tenant thinks they're enrolled but cache says otherwise for up to 60s
    console.warn(
      `Failed to invalidate greenhouse cache for ${tenantId}:`,
      error,
    );
  }
}

// =============================================================================
// GREENHOUSE MANAGEMENT
// =============================================================================

/**
 * Get all tenants enrolled in the greenhouse program.
 * Used by the admin UI to display the enrollment table.
 *
 * @param env - Cloudflare environment bindings
 * @returns Array of greenhouse tenant records
 */
export async function getGreenhouseTenants(
  env: FeatureFlagsEnv,
): Promise<GreenhouseTenant[]> {
  try {
    const result = await env.DB.prepare(
      `SELECT tenant_id, enabled, enrolled_at, enrolled_by, notes
       FROM greenhouse_tenants
       ORDER BY enrolled_at DESC`,
    ).all<GreenhouseTenantRow>();

    return (result.results ?? []).map(rowToGreenhouseTenant);
  } catch (error) {
    console.error("Failed to load greenhouse tenants:", error);
    return [];
  }
}

/**
 * Get a single greenhouse tenant by ID.
 *
 * @param tenantId - The tenant ID to lookup
 * @param env - Cloudflare environment bindings
 * @returns The greenhouse tenant or null if not enrolled
 */
export async function getGreenhouseTenant(
  tenantId: string,
  env: FeatureFlagsEnv,
): Promise<GreenhouseTenant | null> {
  try {
    const result = await env.DB.prepare(
      `SELECT tenant_id, enabled, enrolled_at, enrolled_by, notes
       FROM greenhouse_tenants
       WHERE tenant_id = ?`,
    )
      .bind(tenantId)
      .first<GreenhouseTenantRow>();

    return result ? rowToGreenhouseTenant(result) : null;
  } catch (error) {
    console.error(`Failed to load greenhouse tenant ${tenantId}:`, error);
    return null;
  }
}

/**
 * Enroll a tenant in the greenhouse program.
 *
 * @param tenantId - The tenant ID to enroll
 * @param enrolledBy - Email/name of the person enrolling the tenant
 * @param notes - Optional notes about why this tenant was enrolled
 * @param env - Cloudflare environment bindings
 * @returns True if enrollment succeeded
 */
export async function enrollInGreenhouse(
  tenantId: string,
  enrolledBy: string | undefined,
  notes: string | undefined,
  env: FeatureFlagsEnv,
): Promise<boolean> {
  try {
    await env.DB.prepare(
      `INSERT OR REPLACE INTO greenhouse_tenants (tenant_id, enabled, enrolled_at, enrolled_by, notes)
       VALUES (?, 1, datetime('now'), ?, ?)`,
    )
      .bind(tenantId, enrolledBy ?? null, notes ?? null)
      .run();

    // Invalidate cache
    await invalidateGreenhouseCache(tenantId, env);

    return true;
  } catch (error) {
    console.error(`Failed to enroll tenant ${tenantId} in greenhouse:`, error);
    return false;
  }
}

/**
 * Remove a tenant from the greenhouse program.
 *
 * @param tenantId - The tenant ID to remove
 * @param env - Cloudflare environment bindings
 * @returns True if removal succeeded
 */
export async function removeFromGreenhouse(
  tenantId: string,
  env: FeatureFlagsEnv,
): Promise<boolean> {
  try {
    await env.DB.prepare("DELETE FROM greenhouse_tenants WHERE tenant_id = ?")
      .bind(tenantId)
      .run();

    // Invalidate cache
    await invalidateGreenhouseCache(tenantId, env);

    return true;
  } catch (error) {
    console.error(
      `Failed to remove tenant ${tenantId} from greenhouse:`,
      error,
    );
    return false;
  }
}

/**
 * Toggle a tenant's greenhouse status (enabled/disabled).
 * Disabled tenants remain in the table but don't receive greenhouse features.
 *
 * @param tenantId - The tenant ID to toggle
 * @param enabled - Whether to enable or disable
 * @param env - Cloudflare environment bindings
 * @returns True if toggle succeeded
 */
export async function toggleGreenhouseStatus(
  tenantId: string,
  enabled: boolean,
  env: FeatureFlagsEnv,
): Promise<boolean> {
  try {
    const result = await env.DB.prepare(
      "UPDATE greenhouse_tenants SET enabled = ? WHERE tenant_id = ?",
    )
      .bind(enabled ? 1 : 0, tenantId)
      .run();

    if (result.meta.changes === 0) {
      // Tenant not in greenhouse
      return false;
    }

    // Invalidate cache
    await invalidateGreenhouseCache(tenantId, env);

    return true;
  } catch (error) {
    console.error(`Failed to toggle greenhouse status for ${tenantId}:`, error);
    return false;
  }
}

/**
 * Update notes for a greenhouse tenant.
 *
 * @param tenantId - The tenant ID to update
 * @param notes - New notes (can be null to clear)
 * @param env - Cloudflare environment bindings
 * @returns True if update succeeded
 */
export async function updateGreenhouseNotes(
  tenantId: string,
  notes: string | null,
  env: FeatureFlagsEnv,
): Promise<boolean> {
  try {
    const result = await env.DB.prepare(
      "UPDATE greenhouse_tenants SET notes = ? WHERE tenant_id = ?",
    )
      .bind(notes, tenantId)
      .run();

    return result.meta.changes > 0;
  } catch (error) {
    console.error(`Failed to update greenhouse notes for ${tenantId}:`, error);
    return false;
  }
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Convert a database row to a GreenhouseTenant object.
 */
function rowToGreenhouseTenant(row: GreenhouseTenantRow): GreenhouseTenant {
  return {
    tenantId: row.tenant_id,
    enabled: row.enabled === 1,
    enrolledAt: new Date(row.enrolled_at),
    enrolledBy: row.enrolled_by ?? undefined,
    notes: row.notes ?? undefined,
  };
}
