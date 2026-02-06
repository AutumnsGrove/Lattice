/**
 * Post Limit Enforcement
 *
 * High-level utilities for enforcing post limits in GroveEngine.
 * Uses GroveAuth subscription API to check and update limits.
 */

import type { SubscriptionStatus, CanPostResponse } from './types.js';
import { TIER_POST_LIMITS, TIER_NAMES } from './types.js';

// =============================================================================
// LIMIT STATUS HELPERS
// =============================================================================

/**
 * Get a human-readable description of the quota status
 */
export function getQuotaDescription(status: SubscriptionStatus): string {
  if (status.post_limit === null) {
    return 'Unlimited posts';
  }

  const remaining = status.posts_remaining ?? 0;
  const limit = status.post_limit;
  const used = status.post_count;

  if (status.upgrade_required) {
    return `Limit reached (${used}/${limit}). Upgrade required.`;
  }

  if (status.is_in_grace_period && status.grace_period_days_remaining !== null) {
    return `Limit reached. ${status.grace_period_days_remaining} days remaining in grace period.`;
  }

  if (status.is_at_limit) {
    return `At limit (${used}/${limit}). Delete posts or upgrade.`;
  }

  if (status.percentage_used !== null && status.percentage_used >= 90) {
    return `${remaining} posts remaining (${status.percentage_used.toFixed(0)}% used)`;
  }

  return `${used}/${limit} posts used`;
}

/**
 * Get the urgency level for the current quota status
 */
export function getQuotaUrgency(status: SubscriptionStatus): 'healthy' | 'warning' | 'critical' | 'blocked' {
  if (status.upgrade_required) {
    return 'blocked';
  }

  if (status.is_at_limit || (status.percentage_used !== null && status.percentage_used >= 100)) {
    return 'critical';
  }

  if (status.percentage_used !== null && status.percentage_used >= 90) {
    return 'warning';
  }

  return 'healthy';
}

/**
 * Get suggested actions based on quota status
 */
export function getSuggestedActions(status: SubscriptionStatus): string[] {
  const actions: string[] = [];

  if (status.upgrade_required) {
    actions.push('Upgrade your plan to continue posting');
    actions.push('Delete older posts to free up space');
    return actions;
  }

  if (status.is_in_grace_period) {
    actions.push(`Upgrade within ${status.grace_period_days_remaining} days to avoid read-only mode`);
    actions.push('Delete older posts to get under the limit');
  }

  if (status.is_at_limit) {
    actions.push('Upgrade your plan for more posts');
    actions.push('Delete older posts to create new ones');
  }

  if (status.percentage_used !== null && status.percentage_used >= 75 && status.percentage_used < 90) {
    actions.push('Consider upgrading soon - you\'re using most of your quota');
  }

  return actions;
}

/**
 * Get upgrade recommendation based on current usage
 */
export function getUpgradeRecommendation(status: SubscriptionStatus): {
  recommended: boolean;
  fromTier: string;
  toTier: string | null;
  reason: string;
} {
  const tierName = TIER_NAMES[status.tier];

  if (status.tier === 'evergreen') {
    return {
      recommended: false,
      fromTier: tierName,
      toTier: null,
      reason: 'You have the highest tier with unlimited posts',
    };
  }

  if (status.tier === 'oak') {
    return {
      recommended: false,
      fromTier: tierName,
      toTier: 'Evergreen',
      reason: 'You already have unlimited posts. Evergreen adds domain search and support hours.',
    };
  }

  if (status.upgrade_required || status.is_at_limit) {
    const toTier = status.tier === 'seedling' ? 'Sapling' : 'Oak';
    return {
      recommended: true,
      fromTier: tierName,
      toTier,
      reason: 'You\'ve reached your post limit',
    };
  }

  if (status.percentage_used !== null && status.percentage_used >= 80) {
    const toTier = status.tier === 'seedling' ? 'Sapling' : 'Oak';
    return {
      recommended: true,
      fromTier: tierName,
      toTier,
      reason: `You're using ${status.percentage_used.toFixed(0)}% of your quota`,
    };
  }

  return {
    recommended: false,
    fromTier: tierName,
    toTier: null,
    reason: 'Your current plan is sufficient for your usage',
  };
}

// =============================================================================
// QUOTA WIDGET DATA
// =============================================================================

export interface QuotaWidgetData {
  /** Current post count */
  count: number;
  /** Post limit (null if unlimited) */
  limit: number | null;
  /** Percentage used (null if unlimited) */
  percentage: number | null;
  /** Posts remaining (null if unlimited) */
  remaining: number | null;
  /** Status color */
  color: 'green' | 'yellow' | 'red' | 'gray';
  /** Status text */
  statusText: string;
  /** Human-readable description */
  description: string;
  /** Whether to show upgrade prompt */
  showUpgrade: boolean;
  /** Tier name */
  tierName: string;
  /** Whether user can create posts */
  canPost: boolean;
}

/**
 * Get data for rendering a quota widget
 */
export function getQuotaWidgetData(status: SubscriptionStatus): QuotaWidgetData {
  const urgency = getQuotaUrgency(status);

  const colorMap: Record<typeof urgency, 'green' | 'yellow' | 'red' | 'gray'> = {
    healthy: 'green',
    warning: 'yellow',
    critical: 'red',
    blocked: 'red',
  };

  const statusTextMap: Record<typeof urgency, string> = {
    healthy: 'Healthy',
    warning: 'Warning',
    critical: 'Critical',
    blocked: 'Blocked',
  };

  return {
    count: status.post_count,
    limit: status.post_limit,
    percentage: status.percentage_used,
    remaining: status.posts_remaining,
    color: status.post_limit === null ? 'gray' : colorMap[urgency],
    statusText: status.post_limit === null ? 'Unlimited' : statusTextMap[urgency],
    description: getQuotaDescription(status),
    showUpgrade: urgency === 'warning' || urgency === 'critical' || urgency === 'blocked',
    tierName: TIER_NAMES[status.tier],
    canPost: status.can_create_post,
  };
}

// =============================================================================
// PRE-SUBMISSION CHECK
// =============================================================================

export interface PreSubmitCheckResult {
  /** Whether the post can be created */
  allowed: boolean;
  /** Whether to show a warning dialog */
  showWarning: boolean;
  /** Warning message if applicable */
  warningMessage: string | null;
  /** Whether upgrade is required */
  upgradeRequired: boolean;
  /** Full status for additional UI */
  status: SubscriptionStatus;
}

/**
 * Check if a post can be created and whether to show warnings
 */
export function getPreSubmitCheck(response: CanPostResponse): PreSubmitCheckResult {
  const { allowed, status } = response;

  // Upgrade required - can't post at all
  if (status.upgrade_required) {
    return {
      allowed: false,
      showWarning: true,
      warningMessage: 'Your grace period has expired. Please upgrade your plan or delete posts to continue.',
      upgradeRequired: true,
      status,
    };
  }

  // In grace period - show warning but allow
  if (status.is_in_grace_period) {
    return {
      allowed: true,
      showWarning: true,
      warningMessage: `You're over your post limit. ${status.grace_period_days_remaining} days remaining before your account becomes read-only.`,
      upgradeRequired: false,
      status,
    };
  }

  // At or near limit - show warning
  if (status.is_at_limit) {
    return {
      allowed,
      showWarning: true,
      warningMessage: 'You\'ve reached your post limit. Creating a new post will start your grace period.',
      upgradeRequired: false,
      status,
    };
  }

  // Near limit (90%+) - gentle warning
  if (status.percentage_used !== null && status.percentage_used >= 90) {
    return {
      allowed: true,
      showWarning: true,
      warningMessage: `You're at ${status.percentage_used.toFixed(0)}% of your post limit. Consider upgrading soon.`,
      upgradeRequired: false,
      status,
    };
  }

  // All good
  return {
    allowed: true,
    showWarning: false,
    warningMessage: null,
    upgradeRequired: false,
    status,
  };
}
