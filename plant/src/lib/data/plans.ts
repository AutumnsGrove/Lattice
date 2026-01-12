/**
 * Shared plan data for Grove Plant onboarding.
 * Single source of truth for pricing tiers used across landing and plans pages.
 */

import {
  Sprout,
  TreeDeciduous,
  Trees,
  Crown,
} from "@autumnsgrove/groveengine/ui/icons";

// ============================================================================
// TYPES
// ============================================================================

/** Tier availability status */
export type TierStatus = "available" | "coming_soon" | "future";

/** Icon keys matching plan IDs */
export type TierIconKey = "seedling" | "sapling" | "oak" | "evergreen";

/** Full plan definition with all details */
export interface Plan {
  id: TierIconKey;
  name: string;
  tagline: string;
  description: string;
  monthlyPrice: number;
  features: string[];
  status: TierStatus;
  icon: TierIconKey;
}

/** Abbreviated plan info for preview cards */
export interface PlanPreview {
  id: TierIconKey;
  name: string;
  tagline: string;
  monthlyPrice: number;
  highlights: string[];
  status: TierStatus;
}

// ============================================================================
// ICON MAPPING
// ============================================================================

/** Map plan icon keys to Lucide icon components */
export const tierIcons: Record<TierIconKey, typeof Sprout> = {
  seedling: Sprout,
  sapling: TreeDeciduous,
  oak: Trees,
  evergreen: Crown,
};

// ============================================================================
// PLAN DATA
// ============================================================================

/** Complete plan definitions */
export const plans: Plan[] = [
  {
    id: "seedling",
    name: "Seedling",
    tagline: "Just planted",
    description:
      "Perfect for getting started. A quiet corner to call your own.",
    monthlyPrice: 8,
    features: [
      "50 posts",
      "1 GB storage",
      "3 curated themes",
      "Meadow access",
      "RSS feed",
      "No ads ever",
    ],
    status: "available",
    icon: "seedling",
  },
  {
    id: "sapling",
    name: "Sapling",
    tagline: "Growing strong",
    description: "For blogs finding their voice. Room to stretch and grow.",
    monthlyPrice: 12,
    features: [
      "250 posts",
      "5 GB storage",
      "10 themes",
      "3 nav pages",
      "Email forwarding",
      "Centennial eligible",
      "Everything in Seedling",
    ],
    status: "coming_soon",
    icon: "sapling",
  },
  {
    id: "oak",
    name: "Oak",
    tagline: "Deep roots",
    description: "Full creative control. Your blog, your rules.",
    monthlyPrice: 25,
    features: [
      "Unlimited posts",
      "20 GB storage",
      "Theme customizer",
      "5 nav pages",
      "Bring your own domain",
      "Centennial eligible",
      "Priority support",
    ],
    status: "future",
    icon: "oak",
  },
  {
    id: "evergreen",
    name: "Evergreen",
    tagline: "Always flourishing",
    description: "The complete package. Everything Grove has to offer.",
    monthlyPrice: 35,
    features: [
      "Unlimited everything",
      "100 GB storage",
      "Custom fonts",
      "8 nav pages",
      "Domain included",
      "Centennial eligible",
      "8 hrs/mo dedicated support",
    ],
    status: "future",
    icon: "evergreen",
  },
];

/** Valid plan IDs for form validation */
export const validPlanIds: TierIconKey[] = plans.map((p) => p.id);

/** Currently available plans (for selection) */
export const availablePlans = plans.filter((p) => p.status === "available");

// ============================================================================
// HELPERS
// ============================================================================

/** Get a plan by ID */
export function getPlanById(id: string): Plan | undefined {
  return plans.find((p) => p.id === id);
}

/** Check if a plan ID is valid */
export function isValidPlanId(id: string): id is TierIconKey {
  return validPlanIds.includes(id as TierIconKey);
}

/** Check if a plan is available for selection */
export function isPlanAvailable(id: string): boolean {
  const plan = getPlanById(id);
  return plan?.status === "available";
}

/** Default number of feature highlights to show in previews */
const DEFAULT_HIGHLIGHT_COUNT = 3;

/**
 * Get plan previews for landing page cards.
 * @param highlightCount - Number of features to include (default: 3)
 */
export function getPlanPreviews(
  highlightCount = DEFAULT_HIGHLIGHT_COUNT,
): PlanPreview[] {
  return plans.map((plan) => ({
    id: plan.id,
    name: plan.name,
    tagline: plan.tagline,
    monthlyPrice: plan.monthlyPrice,
    highlights: plan.features.slice(0, highlightCount),
    status: plan.status,
  }));
}
