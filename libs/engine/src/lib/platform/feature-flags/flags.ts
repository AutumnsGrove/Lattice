/**
 * Flags API — Engine-First Feature Flag Loading
 *
 * This module provides the "load once, use everywhere" approach for feature flags.
 * Instead of checking individual flags per-page, load ALL enabled flags at the
 * layout level and cascade them to child pages.
 *
 * @example
 * ```typescript
 * // In admin/+layout.server.ts
 * import { getEnabledFlags } from '$lib/platform/feature-flags';
 *
 * const flags = await getEnabledFlags(
 *   { tenantId: locals.tenantId, inGreenhouse },
 *   { DB: platform.env.DB, FLAGS_KV: platform.env.FLAGS_KV }
 * );
 *
 * return { ...parentData, flags };
 *
 * // In any child page (+page.svelte)
 * <Gallery enabled={data.flags.photo_gallery ?? false} />
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
 * Known flag IDs for type-safe access.
 * Add new flags here for autocomplete support.
 * Unknown IDs still work — this is just for DX.
 */
export type KnownFlagId =
	| "image_uploads_enabled"
	| "image_uploads"
	| "uploads_suspended"
	| "photo_gallery"
	| "thorn_moderation"
	| "lantern_enabled";

/**
 * Record of flag ID to enabled status.
 * Use `flags[id]` to check if a flag is enabled.
 */
export type FlagsRecord = Record<string, boolean>;

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
		console.error("[Flags] Failed to load flag IDs:", error);
		return [];
	}
}

/**
 * Load ALL enabled flags for a tenant context.
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
 * const flags = await getEnabledFlags(
 *   { tenantId: 'abc123', inGreenhouse: true },
 *   { DB: platform.env.DB, FLAGS_KV: platform.env.FLAGS_KV }
 * );
 *
 * // flags = { fireside_mode: true, scribe_mode: false, ... }
 * ```
 */
export async function getEnabledFlags(
	context: EvaluationContext,
	env: FeatureFlagsEnv,
): Promise<FlagsRecord> {
	// 1. Load all enabled flag IDs
	const flagIds = await getAllFlagIds(env.DB);

	if (flagIds.length === 0) {
		return {};
	}

	// 2. Batch evaluate all flags
	const results = await evaluateFlags(flagIds, context, env);

	// 3. Convert to simple boolean record
	const flags: FlagsRecord = {};
	for (const [id, result] of results) {
		// Treat any truthy value as enabled, anything else as disabled
		flags[id] = result.value === true;
	}

	return flags;
}

/**
 * Check if a specific flag is enabled in a flags record.
 * Provides a type-safe helper with fallback.
 *
 * @param flags - The flags record from getEnabledFlags
 * @param flagId - The flag ID to check
 * @param fallback - Default value if flag not found (default: false)
 * @returns Whether the flag is enabled
 *
 * @example
 * ```typescript
 * const firesideEnabled = isFlagEnabled(data.flags, 'fireside_mode');
 * ```
 */
export function isFlagEnabled(
	flags: FlagsRecord | undefined,
	flagId: string,
	fallback = false,
): boolean {
	return flags?.[flagId] ?? fallback;
}

// =============================================================================
// BACKWARD COMPATIBILITY
// =============================================================================

/** @deprecated Use KnownFlagId instead */
export type KnownGraftId = KnownFlagId;

/** @deprecated Use FlagsRecord instead */
export type GraftsRecord = FlagsRecord;

/** @deprecated Use getEnabledFlags instead */
export const getEnabledGrafts = getEnabledFlags;

/** @deprecated Use isFlagEnabled instead */
export const isGraftEnabled = isFlagEnabled;
