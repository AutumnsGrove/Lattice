/**
 * Rule Evaluation Logic
 *
 * Evaluates individual rules against an evaluation context.
 *
 * @see docs/plans/feature-flags-spec.md
 */

import { TIER_ORDER, type TierKey } from "../config/tiers.js";
import { evaluatePercentageRule } from "./percentage.js";
import type {
  EvaluationContext,
  FlagRule,
  RuleType,
  TenantRuleCondition,
  TierRuleCondition,
  PercentageRuleCondition,
  UserRuleCondition,
  TimeRuleCondition,
} from "./types.js";

/**
 * Evaluate a single rule against the provided context.
 *
 * @param rule - The rule to evaluate
 * @param context - The evaluation context
 * @param flagId - The flag ID (needed for percentage rules)
 * @returns True if the rule matches the context
 */
export async function evaluateRule(
  rule: FlagRule,
  context: EvaluationContext,
  flagId: string,
): Promise<boolean> {
  if (!rule.enabled) return false;

  switch (rule.ruleType as RuleType) {
    case "tenant":
      return evaluateTenantRule(
        rule.ruleValue as TenantRuleCondition,
        context,
      );
    case "tier":
      return evaluateTierRule(rule.ruleValue as TierRuleCondition, context);
    case "percentage":
      return evaluatePercentageRule(
        rule.ruleValue as PercentageRuleCondition,
        context,
        flagId,
      );
    case "user":
      return evaluateUserRule(rule.ruleValue as UserRuleCondition, context);
    case "time":
      return evaluateTimeRule(rule.ruleValue as TimeRuleCondition);
    case "always":
      return true;
    default:
      // Unknown rule type - fail safe
      return false;
  }
}

/**
 * Evaluate a tenant-specific rule.
 * Matches if the context's tenantId is in the rule's tenant list.
 */
function evaluateTenantRule(
  condition: TenantRuleCondition,
  context: EvaluationContext,
): boolean {
  if (!context.tenantId) return false;
  return condition.tenantIds.includes(context.tenantId);
}

/**
 * Evaluate a tier-based rule.
 * Matches if the context's tier is in the rule's tier list.
 */
function evaluateTierRule(
  condition: TierRuleCondition,
  context: EvaluationContext,
): boolean {
  if (!context.tier) return false;
  return condition.tiers.includes(context.tier);
}

/**
 * Evaluate a user-specific rule.
 * Matches if the context's userId is in the rule's user list.
 */
function evaluateUserRule(
  condition: UserRuleCondition,
  context: EvaluationContext,
): boolean {
  if (!context.userId) return false;
  return condition.userIds.includes(context.userId);
}

/**
 * Evaluate a time-based rule.
 * Matches if the current time is within the rule's time window.
 */
function evaluateTimeRule(condition: TimeRuleCondition): boolean {
  const now = new Date();

  if (condition.startDate) {
    const start = new Date(condition.startDate);
    if (now < start) return false;
  }

  if (condition.endDate) {
    const end = new Date(condition.endDate);
    if (now > end) return false;
  }

  return true;
}

/**
 * Check if a tier is at or above a minimum tier level.
 * Useful for "oak_and_above" type rules.
 *
 * @param userTier - The user's current tier
 * @param minimumTier - The minimum required tier
 * @returns True if userTier >= minimumTier
 */
export function isTierAtLeast(userTier: TierKey, minimumTier: TierKey): boolean {
  const userIndex = TIER_ORDER.indexOf(userTier);
  const minIndex = TIER_ORDER.indexOf(minimumTier);

  // Invalid tier - fail safe
  if (userIndex === -1 || minIndex === -1) return false;

  return userIndex >= minIndex;
}

/**
 * Get all tiers at or above a minimum tier level.
 * Useful for generating tier rule conditions.
 *
 * @param minimumTier - The minimum required tier
 * @returns Array of tier keys at or above the minimum
 */
export function getTiersAtLeast(minimumTier: TierKey): TierKey[] {
  const minIndex = TIER_ORDER.indexOf(minimumTier);
  if (minIndex === -1) return [];
  return TIER_ORDER.slice(minIndex) as TierKey[];
}
