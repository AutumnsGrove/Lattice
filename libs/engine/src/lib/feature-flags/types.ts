/**
 * Feature Flags Type Definitions
 *
 * Types for Grove's Cloudflare-native feature flag system.
 * Supports boolean flags, percentage rollouts, tier-gated features, and A/B variants.
 *
 * @see docs/plans/feature-flags-spec.md
 */

import type { TierKey } from "../config/tiers.js";

// =============================================================================
// FLAG TYPES
// =============================================================================

/**
 * Types of feature flags supported by the system.
 */
export type FlagType = "boolean" | "percentage" | "variant" | "tier" | "json";

/**
 * Types of rules that can be applied to flags.
 */
export type RuleType =
  | "tenant" // Specific tenant IDs
  | "tier" // Subscription tiers
  | "percentage" // Gradual rollout
  | "user" // Specific user IDs
  | "time" // Time-based (start/end dates)
  | "greenhouse" // Greenhouse program tenants
  | "tenant_override" // Tenant self-service override
  | "always"; // Catch-all default

// =============================================================================
// RULE CONDITIONS
// =============================================================================

/**
 * Condition for tenant-specific rules.
 */
export interface TenantRuleCondition {
  tenantIds: string[];
}

/**
 * Condition for tier-based rules.
 */
export interface TierRuleCondition {
  tiers: TierKey[];
}

/**
 * Condition for percentage rollout rules.
 */
export interface PercentageRuleCondition {
  percentage: number; // 0-100
  salt?: string; // Optional salt for flag-specific bucketing
}

/**
 * Condition for user-specific rules.
 */
export interface UserRuleCondition {
  userIds: string[];
}

/**
 * Condition for time-based rules.
 */
export interface TimeRuleCondition {
  startDate?: string; // ISO 8601 date string
  endDate?: string; // ISO 8601 date string
}

/**
 * Condition for tenant self-service overrides.
 * Matches a single tenant who opted in/out of a greenhouse graft.
 */
export interface TenantOverrideCondition {
  tenantId: string;
}

/**
 * Condition for always-matching rules (catch-all).
 */
export type AlwaysRuleCondition = Record<string, never>;

/**
 * Condition for greenhouse rules.
 * Matches any tenant enrolled in the greenhouse program.
 */
export type GreenhouseRuleCondition = Record<string, never>;

/**
 * Union type for all rule conditions.
 */
export type RuleCondition =
  | TenantRuleCondition
  | TierRuleCondition
  | PercentageRuleCondition
  | UserRuleCondition
  | TimeRuleCondition
  | TenantOverrideCondition
  | GreenhouseRuleCondition
  | AlwaysRuleCondition;

// =============================================================================
// FLAG ENTITIES
// =============================================================================

/**
 * A feature flag configuration.
 */
export interface FeatureFlag {
  id: string;
  name: string;
  description?: string;
  flagType: FlagType;
  defaultValue: unknown;
  enabled: boolean;
  greenhouseOnly?: boolean; // If true, only available to greenhouse tenants
  cacheTtl?: number; // KV cache TTL in seconds
  rules: FlagRule[];
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

/**
 * A rule attached to a feature flag.
 */
export interface FlagRule {
  id: number;
  flagId: string;
  priority: number;
  ruleType: RuleType;
  ruleValue: RuleCondition;
  resultValue: unknown;
  enabled: boolean;
  createdAt: Date;
}

/**
 * Database row representation of a feature flag.
 */
export interface FeatureFlagRow {
  id: string;
  name: string;
  description: string | null;
  flag_type: string;
  default_value: string;
  enabled: number;
  greenhouse_only: number;
  cache_ttl: number | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

/**
 * Database row representation of a flag rule.
 */
export interface FlagRuleRow {
  id: number;
  flag_id: string;
  priority: number;
  rule_type: string;
  rule_value: string;
  result_value: string;
  enabled: number;
  created_at: string;
}

// =============================================================================
// EVALUATION CONTEXT & RESULT
// =============================================================================

/**
 * Context provided when evaluating a feature flag.
 */
export interface EvaluationContext {
  tenantId?: string;
  userId?: string;
  tier?: TierKey;
  sessionId?: string; // For anonymous percentage rollouts
  inGreenhouse?: boolean; // Whether the tenant is in the greenhouse program
  attributes?: Record<string, unknown>; // Custom attributes for future extensibility
}

/**
 * Result of evaluating a feature flag.
 */
export interface EvaluationResult<T = unknown> {
  value: T;
  flagId: string;
  matched: boolean;
  matchedRuleId?: number;
  evaluatedAt: Date;
  cached: boolean;
}

// =============================================================================
// CACHED VALUE
// =============================================================================

/**
 * Value stored in KV cache.
 */
export interface CachedFlagValue<T = unknown> {
  value: T;
  flagId: string;
  matched: boolean;
  matchedRuleId?: number;
  evaluatedAt: string; // ISO 8601
  expiresAt: string; // ISO 8601
}

// =============================================================================
// AUDIT LOG
// =============================================================================

/**
 * Actions that can be recorded in the audit log.
 */
export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "enable"
  | "disable"
  | "rule_add"
  | "rule_update"
  | "rule_delete";

/**
 * Audit log entry.
 */
export interface FlagAuditEntry {
  id: number;
  flagId: string;
  action: AuditAction;
  oldValue?: unknown;
  newValue?: unknown;
  changedBy?: string;
  changedAt: Date;
  reason?: string;
}

// =============================================================================
// ENVIRONMENT BINDINGS
// =============================================================================

/**
 * Cloudflare environment bindings required for feature flags.
 * These should be available on platform.env in SvelteKit.
 */
export interface FeatureFlagsEnv {
  DB: D1Database;
  FLAGS_KV: KVNamespace;
}

// =============================================================================
// GREENHOUSE TYPES
// =============================================================================

/**
 * A tenant enrolled in the greenhouse program.
 */
export interface GreenhouseTenant {
  tenantId: string;
  enabled: boolean;
  enrolledAt: Date;
  enrolledBy?: string;
  notes?: string;
}

/**
 * Database row representation of a greenhouse tenant.
 */
export interface GreenhouseTenantRow {
  tenant_id: string;
  enabled: number;
  enrolled_at: string;
  enrolled_by: string | null;
  notes: string | null;
}
