/**
 * Lumen Quota Limits
 *
 * Tier-based daily request limits for each task type.
 * These limits are designed to balance usage fairness with cost management.
 *
 * To update limits:
 * 1. Modify the LUMEN_QUOTAS constant below
 * 2. Consider the cost impact (see MODEL_COSTS in config.ts)
 * 3. Test with getTierQuota() to verify
 */

import type { TierKey } from "$lib/config/tiers.js";
import type { LumenTask } from "../types.js";

// =============================================================================
// QUOTA DEFINITIONS
// =============================================================================

/**
 * Daily request limits per tier per task.
 *
 * Guidelines for setting limits:
 * - moderation: High limits (free with CF AI, important for safety)
 * - embedding: Medium-high (free with CF AI, needed for search)
 * - generation: Medium (primary cost driver)
 * - summary: Medium (similar cost to generation)
 * - chat: Medium-low (can be expensive with long conversations)
 * - image: Low (Claude via OpenRouter is expensive)
 * - code: Low-medium (Claude is expensive but important for devs)
 */
export const LUMEN_QUOTAS: Record<TierKey, Record<LumenTask, number>> = {
  // Free tier: Meadow only, very limited AI access
  free: {
    moderation: 100, // Safety is important
    generation: 10,
    summary: 10,
    embedding: 50, // For search
    chat: 5,
    image: 0, // No image analysis
    code: 0, // No code help
    transcription: 10, // Basic voice capture
  },

  // Seedling ($8/mo): Entry tier with basic AI
  seedling: {
    moderation: 1000,
    generation: 100,
    summary: 100,
    embedding: 500,
    chat: 50,
    image: 10,
    code: 10,
    transcription: 100,
  },

  // Sapling ($12/mo): Growing tier with more AI
  sapling: {
    moderation: 5000,
    generation: 500,
    summary: 500,
    embedding: 2000,
    chat: 200,
    image: 50,
    code: 50,
    transcription: 500,
  },

  // Oak ($25/mo): Full tier with generous AI
  oak: {
    moderation: 20000,
    generation: 2000,
    summary: 2000,
    embedding: 10000,
    chat: 1000,
    image: 200,
    code: 200,
    transcription: 2000,
  },

  // Evergreen ($35/mo): Premium tier with abundant AI
  evergreen: {
    moderation: Infinity, // Unlimited moderation
    generation: 10000,
    summary: 10000,
    embedding: 50000,
    chat: 5000,
    image: 1000,
    code: 1000,
    transcription: 10000,
  },
};

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Get the daily quota for a specific tier and task
 */
export function getTierQuota(tier: TierKey, task: LumenTask): number {
  return LUMEN_QUOTAS[tier]?.[task] ?? 0;
}

/**
 * Get all quotas for a tier
 */
export function getTierQuotas(tier: TierKey): Record<LumenTask, number> {
  return LUMEN_QUOTAS[tier] ?? LUMEN_QUOTAS.free;
}

/**
 * Check if a task is available for a tier (quota > 0)
 */
export function isTaskAvailable(tier: TierKey, task: LumenTask): boolean {
  return getTierQuota(tier, task) > 0;
}

/**
 * Get a human-readable quota description
 */
export function formatQuota(limit: number): string {
  if (limit === 0) return "Not available";
  if (limit === Infinity) return "Unlimited";
  return `${limit.toLocaleString()} / day`;
}

/**
 * Calculate quota percentage used
 */
export function calculateUsagePercent(used: number, limit: number): number {
  if (limit === 0) return 100;
  if (limit === Infinity) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

/**
 * Check if quota would be exceeded
 */
export function wouldExceedQuota(
  currentUsage: number,
  limit: number,
  requestCount: number = 1,
): boolean {
  if (limit === Infinity) return false;
  return currentUsage + requestCount > limit;
}
