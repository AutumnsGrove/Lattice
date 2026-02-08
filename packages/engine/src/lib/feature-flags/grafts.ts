/**
 * Grafts API — Engine-First Feature Flag Loading
 *
 * This module provides the "load once, use everywhere" approach for feature flags.
 * Instead of checking individual flags per-page, load ALL enabled grafts at the
 * layout level and cascade them to child pages.
 *
 * @example
 * ```typescript
 * // In admin/+layout.server.ts
 * import { getEnabledGrafts } from '$lib/feature-flags';
 *
 * const grafts = await getEnabledGrafts(
 *   { tenantId: locals.tenantId, inGreenhouse },
 *   { DB: platform.env.DB, FLAGS_KV: platform.env.FLAGS_KV }
 * );
 *
 * return { ...parentData, grafts };
 *
 * // In any child page (+page.svelte)
 * <MarkdownEditor firesideEnabled={data.grafts.fireside_mode ?? false} />
 * ```
 *
 * @see docs/adr/20260131-dynamic-grafts-cascade.md
 */

import { evaluateFlags } from "./evaluate.js";
import type { EvaluationContext, FeatureFlagsEnv } from "./types.js";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Known graft IDs for type-safe access.
 * Add new grafts here for autocomplete support.
 * Unknown IDs still work — this is just for DX.
 */
export type KnownGraftId =
  | "fireside_mode"
  | "scribe_mode"
  | "meadow_access"
  | "jxl_encoding"
  | "jxl_kill_switch"
  | "image_uploads_enabled"
  | "photo_gallery";

/**
 * Record of graft ID to enabled status.
 * Use `grafts[id]` to check if a graft is enabled.
 */
export type GraftsRecord = Record<string, boolean>;

// =============================================================================
// CORE FUNCTIONS
// =============================================================================

/**
 * Load ALL enabled flag IDs from the database.
 * Returns only the IDs — evaluation happens separately.
 */
async function getAllFlagIds(db: D1Database): Promise<string[]> {
  try {
    const result = await db
      .prepare("SELECT id FROM feature_flags WHERE enabled = 1")
      .all<{ id: string }>();

    return (result.results ?? []).map((row) => row.id);
  } catch (error) {
    console.error("[Grafts] Failed to load flag IDs:", error);
    return [];
  }
}

/**
 * Load ALL enabled grafts for a tenant context.
 *
 * This is the engine-first approach: load once at layout level,
 * cascade to all pages. No per-page flag checking needed.
 *
 * The function:
 * 1. Loads all enabled flag IDs from D1
 * 2. Batch evaluates all flags with the tenant context
 * 3. Returns a simple Record<flagId, boolean>
 *
 * Results are cached in KV per flag (via evaluateFlags), so subsequent
 * requests for the same tenant will hit cache.
 *
 * @param context - Evaluation context (tenantId, tier, inGreenhouse, etc.)
 * @param env - Cloudflare environment bindings (DB, FLAGS_KV)
 * @returns Record where keys are flag IDs and values are booleans
 *
 * @example
 * ```typescript
 * const grafts = await getEnabledGrafts(
 *   { tenantId: 'abc123', inGreenhouse: true },
 *   { DB: platform.env.DB, FLAGS_KV: platform.env.FLAGS_KV }
 * );
 *
 * // grafts = { fireside_mode: true, scribe_mode: false, ... }
 * ```
 */
export async function getEnabledGrafts(
  context: EvaluationContext,
  env: FeatureFlagsEnv,
): Promise<GraftsRecord> {
  // 1. Load all enabled flag IDs
  const flagIds = await getAllFlagIds(env.DB);

  if (flagIds.length === 0) {
    return {};
  }

  // 2. Batch evaluate all flags
  const results = await evaluateFlags(flagIds, context, env);

  // 3. Convert to simple boolean record
  const grafts: GraftsRecord = {};
  for (const [id, result] of results) {
    // Treat any truthy value as enabled, anything else as disabled
    grafts[id] = result.value === true;
  }

  return grafts;
}

/**
 * Check if a specific graft is enabled in a grafts record.
 * Provides a type-safe helper with fallback.
 *
 * @param grafts - The grafts record from getEnabledGrafts
 * @param graftId - The graft ID to check
 * @param fallback - Default value if graft not found (default: false)
 * @returns Whether the graft is enabled
 *
 * @example
 * ```typescript
 * const firesideEnabled = isGraftEnabled(data.grafts, 'fireside_mode');
 * ```
 */
export function isGraftEnabled(
  grafts: GraftsRecord | undefined,
  graftId: string,
  fallback = false,
): boolean {
  return grafts?.[graftId] ?? fallback;
}
