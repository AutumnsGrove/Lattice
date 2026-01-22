/**
 * Thorn - Content Moderation Types
 *
 * Type definitions for Grove's text content moderation system.
 * Thorn wraps Lumen's moderation task with Grove-specific policy logic.
 *
 * @see docs/specs/thorn-spec.md
 */

// =============================================================================
// Core Types
// =============================================================================

/**
 * Content types that Thorn can moderate.
 * Each type may have different threshold/action configurations.
 */
export type ThornContentType = "blog_post" | "comment" | "profile_bio";

/**
 * Actions Thorn can take based on moderation results.
 * Graduated enforcement: allow → warn → flag_review → block
 */
export type ThornAction = "allow" | "warn" | "flag_review" | "block";

/**
 * Hook points where moderation can be triggered.
 * Used by the future integration layer.
 */
export type ThornHookPoint =
  | "on_publish"
  | "on_comment"
  | "on_profile_update"
  | "on_edit";

// =============================================================================
// Results
// =============================================================================

/**
 * Result of a Thorn moderation check
 */
export interface ThornResult {
  /** Whether content is allowed to proceed */
  allowed: boolean;
  /** Action to take based on policy */
  action: ThornAction;
  /** Flagged categories (if any) */
  categories: string[];
  /** Confidence score from the moderation model */
  confidence: number;
  /** Model used for moderation */
  model: string;
}

/**
 * Options for the moderation function
 */
export interface ThornOptions {
  /** The Lumen client instance */
  lumen: import("../lumen/index.js").LumenClient;
  /** Tenant ID for quota tracking */
  tenant: string;
  /** Content type determines which thresholds apply */
  contentType: ThornContentType;
}

// =============================================================================
// Configuration Types
// =============================================================================

/**
 * Per-category threshold configuration
 */
export interface ThornCategoryThreshold {
  /** Categories that trigger this action at this confidence level */
  categories: string[];
  /** Minimum confidence to trigger */
  minConfidence: number;
  /** Action to take */
  action: ThornAction;
}

/**
 * Per-content-type threshold overrides
 */
export interface ThornContentTypeConfig {
  /** Display name for logging */
  name: string;
  /** Category-action mappings (checked in order, first match wins) */
  thresholds: ThornCategoryThreshold[];
}

/**
 * Full Thorn configuration
 */
export interface ThornConfig {
  /** Per-content-type configurations */
  contentTypes: Record<ThornContentType, ThornContentTypeConfig>;
  /** Default confidence below which to always allow */
  globalAllowBelow: number;
  /** Default confidence above which to always block */
  globalBlockAbove: number;
}

// =============================================================================
// Event Types (for future audit trail)
// =============================================================================

/**
 * Moderation event for audit logging (future DB table)
 */
export interface ThornEvent {
  /** Unique event ID */
  id: string;
  /** Tenant ID */
  tenantId: string;
  /** User who created the content */
  userId: string;
  /** Content type */
  contentType: ThornContentType;
  /** Action taken */
  action: ThornAction;
  /** Flagged categories */
  categories: string[];
  /** Confidence score */
  confidence: number;
  /** Model used */
  model: string;
  /** Hook that triggered this check */
  hookPoint: ThornHookPoint;
  /** Timestamp */
  createdAt: string;
  /** Appeal status (for future appeal workflow) */
  appealStatus?: "none" | "pending" | "approved" | "denied";
}
