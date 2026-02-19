/**
 * UpgradesGraft Types
 *
 * Growth stages, cultivation requests, and garden status.
 */

import type { TierKey } from "$lib/config/tiers";

// ============================================================================
// Growth Stages
// ============================================================================

export type GrowthStage = TierKey;

export const GROWTH_STAGES = {
  wanderer: "Wanderer",
  seedling: "Seedling",
  sapling: "Sapling",
  oak: "Oak",
  evergreen: "Evergreen",
} as const;

export type GrowthStageKey = keyof typeof GROWTH_STAGES;

// ============================================================================
// Cultivation (Upgrade)
// ============================================================================

export interface CultivateRequest {
  /** Target growth stage to cultivate to */
  targetStage: TierKey;
  /** Billing cycle for the new stage */
  billingCycle?: "monthly" | "yearly";
  /** Where to return after the planting ceremony */
  returnTo?: string;
}

export interface CultivateResponse {
  /** URL to redirect to for the planting ceremony */
  plantingUrl: string;
  /** Session ID for tracking */
  sessionId?: string;
}

// ============================================================================
// Tend (Billing Portal)
// ============================================================================

export interface TendRequest {
  /** Where to return after tending the garden */
  returnTo?: string;
}

export interface TendResponse {
  /** URL to redirect to the garden shed */
  shedUrl: string;
}

// ============================================================================
// Growth Status
// ============================================================================

export type FlourishState =
  | "active" // Normal subscription
  | "past_due" // Payment failed
  | "resting" // Canceled at period end
  | "pruned"; // Fully canceled

export interface GrowthStatus {
  /** Current growth stage */
  currentStage: TierKey;
  /** Flourishing state of the grove */
  flourishState: FlourishState;
  /** Current period end timestamp */
  currentPeriodEnd: number | null;
  /** Whether pruning is scheduled */
  pruningScheduled: boolean;
  /** Whether this is a gifted grove */
  isComped: boolean;
  /** Watering method (payment method) */
  wateringMethod?: {
    source: string; // Card brand
    lastDigits: string; // Last 4 digits
  };
}

// ============================================================================
// Planting Session
// ============================================================================

export interface PlantingSession {
  /** Unique session identifier */
  id: string;
  /** Tenant being planted */
  tenantId: string;
  /** Target growth stage */
  targetStage: TierKey;
  /** Billing cycle */
  billingCycle: "monthly" | "yearly";
  /** Session status */
  status: "pending" | "completed" | "failed";
  /** Provider session ID (Stripe) */
  providerSessionId?: string;
  /** When the session was created */
  createdAt: number;
}

// ============================================================================
// Garden Utilities
// ============================================================================

export interface GardenStats {
  totalGroves: number;
  activeGroves: number;
  pastDueGroves: number;
  prunedGroves: number;
  revenue: {
    monthly: number;
    yearly: number;
  };
}

// ============================================================================
// Configuration
// ============================================================================

export interface UpgradesConfig {
  /** Stripe secret key for planting sessions */
  stripeSecretKey: string;
  /** Stripe webhook secret for verifying garden events */
  stripeWebhookSecret: string;
  /** Garden shed URL for self-service management */
  gardenShedUrl: string;
  /** Planting URLs by stage and billing cycle */
  plantingUrls: Record<
    string,
    { monthly?: string; yearly?: string } | undefined
  >;
  /** Application URL for constructing return URLs */
  appUrl: string;
  /** Rate limiting configuration */
  rateLimits: {
    cultivate: { limit: number; windowSeconds: number };
    tend: { limit: number; windowSeconds: number };
    growth: { limit: number; windowSeconds: number };
  };
}
