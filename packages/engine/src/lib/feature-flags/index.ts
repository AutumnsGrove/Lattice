/**
 * Feature Flags System
 *
 * Cloudflare-native feature flag system for Grove.
 * Supports boolean flags, percentage rollouts, tier-gated features, and A/B variants.
 *
 * @example
 * ```typescript
 * import { isFeatureEnabled, getFeatureValue, getVariant } from '$lib/feature-flags';
 *
 * // Simple boolean check
 * const useJxl = await isFeatureEnabled('jxl_encoding', { tenantId }, env);
 *
 * // Get typed value with default
 * const maxUploads = await getFeatureValue('max_uploads', { tier }, env, 10);
 *
 * // A/B variant
 * const variant = await getVariant('pricing_experiment', { sessionId }, env);
 * ```
 *
 * @see docs/plans/feature-flags-spec.md
 */

import { evaluateFlag, evaluateFlags } from "./evaluate.js";
import type { EvaluationContext, EvaluationResult, FeatureFlagsEnv } from "./types.js";

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Check if a boolean feature flag is enabled.
 *
 * Most common use case - simple on/off flags.
 *
 * @param flagId - The flag identifier
 * @param context - The evaluation context
 * @param env - Cloudflare environment bindings
 * @returns True if the flag is enabled for this context
 *
 * @example
 * ```typescript
 * const useJxl = await isFeatureEnabled('jxl_encoding', {
 *   tenantId: locals.tenantId,
 *   userId: locals.user?.id
 * }, platform.env);
 *
 * if (useJxl) {
 *   return encodeAsJxl(file);
 * }
 * ```
 */
export async function isFeatureEnabled(
  flagId: string,
  context: EvaluationContext,
  env: FeatureFlagsEnv,
): Promise<boolean> {
  const result = await evaluateFlag<boolean>(flagId, context, env);
  return result.value === true;
}

/**
 * Get the value of a feature flag with a typed default.
 *
 * For percentage rollouts, variants, or JSON configs.
 *
 * @param flagId - The flag identifier
 * @param context - The evaluation context
 * @param env - Cloudflare environment bindings
 * @param defaultValue - Default value if flag doesn't match or doesn't exist
 * @returns The flag value or default
 *
 * @example
 * ```typescript
 * const maxPosts = await getFeatureValue('max_posts_override', {
 *   tier: locals.tenant?.tier
 * }, platform.env, 50);
 * ```
 */
export async function getFeatureValue<T>(
  flagId: string,
  context: EvaluationContext,
  env: FeatureFlagsEnv,
  defaultValue: T,
): Promise<T> {
  const result = await evaluateFlag<T>(flagId, context, env);
  return result.matched ? result.value : defaultValue;
}

/**
 * Get a variant value for A/B testing.
 *
 * Returns the variant key (e.g., 'control', 'treatment_a', 'treatment_b').
 *
 * @param flagId - The flag identifier
 * @param context - The evaluation context
 * @param env - Cloudflare environment bindings
 * @returns The variant key, defaults to 'control'
 *
 * @example
 * ```typescript
 * const pricingVariant = await getVariant('pricing_experiment', {
 *   sessionId: cookies.get('session_id')
 * }, platform.env);
 *
 * // Returns 'control', 'annual_first', or 'comparison_table'
 * ```
 */
export async function getVariant(
  flagId: string,
  context: EvaluationContext,
  env: FeatureFlagsEnv,
): Promise<string> {
  const result = await evaluateFlag<string>(flagId, context, env);
  // For missing flags or non-string values, default to 'control'
  if (!result.matched || typeof result.value !== "string") {
    return "control";
  }
  return result.value;
}

/**
 * Get the full evaluation result for a flag.
 *
 * Use this when you need metadata like whether the value was cached,
 * which rule matched, etc.
 *
 * @param flagId - The flag identifier
 * @param context - The evaluation context
 * @param env - Cloudflare environment bindings
 * @returns The full evaluation result
 */
export async function getFlag<T = unknown>(
  flagId: string,
  context: EvaluationContext,
  env: FeatureFlagsEnv,
): Promise<EvaluationResult<T>> {
  return evaluateFlag<T>(flagId, context, env);
}

/**
 * Batch evaluate multiple flags at once.
 *
 * More efficient than evaluating flags one at a time when you need
 * multiple flags for a page load.
 *
 * @param flagIds - Array of flag identifiers
 * @param context - The evaluation context
 * @param env - Cloudflare environment bindings
 * @returns Map of flag ID to evaluation result
 *
 * @example
 * ```typescript
 * const flags = await getFlags(
 *   ['meadow_access', 'dark_mode_default', 'new_nav'],
 *   { tenantId, tier, userId },
 *   platform.env
 * );
 *
 * return {
 *   canAccessMeadow: flags.get('meadow_access')?.value ?? false,
 *   darkModeDefault: flags.get('dark_mode_default')?.value ?? false,
 * };
 * ```
 */
export async function getFlags(
  flagIds: string[],
  context: EvaluationContext,
  env: FeatureFlagsEnv,
): Promise<Map<string, EvaluationResult>> {
  return evaluateFlags(flagIds, context, env);
}

// =============================================================================
// RE-EXPORTS
// =============================================================================

// Types
export type {
  EvaluationContext,
  EvaluationResult,
  FeatureFlag,
  FeatureFlagsEnv,
  FlagRule,
  FlagType,
  RuleType,
  RuleCondition,
  TenantRuleCondition,
  TierRuleCondition,
  PercentageRuleCondition,
  UserRuleCondition,
  TimeRuleCondition,
  AuditAction,
  FlagAuditEntry,
} from "./types.js";

// Cache utilities (for admin operations)
export { invalidateFlag, invalidateAllFlags } from "./cache.js";

// Rule utilities (for tier-based checks)
export { isTierAtLeast, getTiersAtLeast } from "./rules.js";

// Percentage utilities (for debugging)
export { getUserBucket, getUserBucketSync } from "./percentage.js";
