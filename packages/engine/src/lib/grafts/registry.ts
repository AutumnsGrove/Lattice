/**
 * Graft Registry & Helpers
 *
 * Central registry for all UI grafts with helpers for checking
 * graft availability via the Feature Grafts system.
 */

import { isFeatureEnabled } from "../feature-flags/index.js";
import type { GraftId, GraftContext, GraftRegistryEntry } from "./types.js";

// =============================================================================
// REGISTRY
// =============================================================================

/**
 * Registry of all available UI grafts.
 * New grafts should be added here with their metadata.
 */
export const GRAFT_REGISTRY = new Map<GraftId, GraftRegistryEntry>([
  [
    "pricing",
    {
      id: "pricing",
      name: "Pricing Graft",
      description:
        "Reusable pricing table, cards, and checkout components for any Grove product",
      featureFlagId: "pricing_graft", // Optional: enable gradual rollout
      version: "1.0.0",
      status: "stable",
    },
  ],
  [
    "upgrades",
    {
      id: "upgrades",
      name: "UpgradesGraft",
      description:
        "Cultivation, garden management, and growth tracking for Grove products",
      featureFlagId: "upgrades_graft",
      version: "1.0.0",
      status: "experimental",
    },
  ],
  // Future grafts will be added here:
  // ['nav', { ... }],
  // ['footer', { ... }],
  // ['hero', { ... }],
]);

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Get a graft's registry entry.
 *
 * @param graftId - The graft identifier
 * @returns The registry entry, or undefined if not found
 */
export function getGraftEntry(
  graftId: GraftId,
): GraftRegistryEntry | undefined {
  return GRAFT_REGISTRY.get(graftId);
}

/**
 * Check if a UI graft should render based on its feature flag.
 *
 * This wraps the Feature Grafts system - if a graft has a linked feature flag,
 * we check if that flag is enabled for the given context.
 *
 * @param graftId - The graft identifier
 * @param context - The evaluation context
 * @returns True if the graft should render
 *
 * @example
 * ```typescript
 * const shouldRender = await isGraftEnabled('pricing', {
 *   productId: 'grove',
 *   tenantId: locals.tenantId,
 *   tier: locals.tenant?.tier
 * });
 *
 * if (shouldRender) {
 *   // Render the pricing graft
 * }
 * ```
 */
export async function isGraftEnabled(
  graftId: GraftId,
  context: GraftContext,
): Promise<boolean> {
  const entry = GRAFT_REGISTRY.get(graftId);

  // Unknown graft - don't render
  if (!entry) {
    return false;
  }

  // No feature flag linked - always enabled
  if (!entry.featureFlagId) {
    return true;
  }

  // No env provided - can't check flags, default to enabled
  if (!context.env) {
    return true;
  }

  // Check the feature flag
  return isFeatureEnabled(
    entry.featureFlagId,
    {
      tenantId: context.tenantId,
      tier: context.tier,
    },
    context.env,
  );
}

/**
 * Get all registered grafts.
 *
 * @returns Array of all graft registry entries
 */
export function getAllGrafts(): GraftRegistryEntry[] {
  return Array.from(GRAFT_REGISTRY.values());
}

/**
 * Get grafts by status.
 *
 * @param status - The status to filter by
 * @returns Array of grafts with that status
 */
export function getGraftsByStatus(
  status: GraftRegistryEntry["status"],
): GraftRegistryEntry[] {
  return getAllGrafts().filter((g) => g.status === status);
}
