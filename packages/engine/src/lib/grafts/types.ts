/**
 * Core Graft Type Definitions
 *
 * UI Grafts are reusable, configurable components that can be "grafted"
 * onto any Grove property. They're controlled via Feature Grafts (the flag system).
 *
 * Key distinction:
 * - Feature Grafts = flags ("is X enabled?")
 * - UI Grafts = components ("render X")
 */

import type { FeatureFlagsEnv } from "../feature-flags/types.js";
import type { TierKey } from "../config/tiers.js";

// =============================================================================
// GRAFT IDENTIFICATION
// =============================================================================

/**
 * Identifier for UI grafts.
 * Each graft has a unique ID used for registry lookup and feature flag linking.
 */
export type GraftId =
  | "pricing"
  | "upgrades"
  | "nav"
  | "footer"
  | "hero"
  | (string & {});

/**
 * Product identifiers in the Grove ecosystem.
 * Used to configure grafts for different Grove properties.
 */
export type ProductId =
  | "grove"
  | "scout"
  | "daily-clearing"
  | "meadow"
  | (string & {});

// =============================================================================
// REGISTRY TYPES
// =============================================================================

/**
 * Registry entry for each UI graft.
 * Contains metadata and links to the Feature Grafts system.
 */
export interface GraftRegistryEntry {
  /** Unique graft identifier */
  id: GraftId;

  /** Human-readable name */
  name: string;

  /** Description of what this graft does */
  description: string;

  /**
   * Optional feature flag ID that controls this graft's availability.
   * If specified, the graft checks isFeatureEnabled() before rendering.
   * If not specified, the graft is always available.
   */
  featureFlagId?: string;

  /** Semantic version of this graft */
  version: string;

  /** Graft status for tracking stability */
  status: "stable" | "beta" | "experimental" | "deprecated";
}

// =============================================================================
// CONTEXT TYPES
// =============================================================================

/**
 * Context passed to grafts for configuration and rendering.
 * This context helps grafts adapt to different products and tenants.
 */
export interface GraftContext {
  /** Which product this graft is rendering for */
  productId: ProductId;

  /** Optional tenant ID for multi-tenant scenarios */
  tenantId?: string;

  /** Optional tier for tier-gated features */
  tier?: TierKey;

  /** Optional feature flags environment for checking flags */
  env?: FeatureFlagsEnv;
}

// =============================================================================
// COMMON COMPONENT PROPS
// =============================================================================

/**
 * Base props that all grafts should accept.
 * Provides consistent API across all graft components.
 */
export interface BaseGraftProps {
  /** Context for this graft instance */
  context?: GraftContext;

  /** Additional CSS classes to apply */
  class?: string;
}
