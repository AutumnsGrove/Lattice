/**
 * Pricing Graft Type Definitions
 *
 * Types for the PricingGraft component system.
 * These types bridge the unified tier config with display-ready pricing data.
 */

import type { Snippet } from "svelte";
import type {
  TierKey,
  TierLimits,
  TierFeatures,
  TierStatus,
  TierIcon,
} from "../../config/tiers.js";
import type { ProductId, BaseGraftProps } from "../types.js";

// =============================================================================
// BILLING TYPES
// =============================================================================

/**
 * Billing period options.
 */
export type BillingPeriod = "monthly" | "annual";

// =============================================================================
// PRICING TIER (DISPLAY-READY)
// =============================================================================

/**
 * A tier transformed for pricing display.
 * Contains everything needed to render a tier card or table row.
 */
export interface PricingTier {
  /** Tier identifier */
  key: TierKey;

  /** Display name */
  name: string;

  /** Short tagline */
  tagline: string;

  /** Icon identifier */
  icon: TierIcon;

  /** Tier availability status */
  status: TierStatus;

  /** Best-for description */
  bestFor: string;

  /** Monthly price in dollars */
  monthlyPrice: number;

  /** Annual price in dollars (total for year) */
  annualPrice: number;

  /** Percentage saved with annual billing */
  annualSavings: number;

  /** Feature limits (already formatted for display) */
  limits: PricingTierLimits;

  /** Feature availability */
  features: TierFeatures;

  /** Feature strings for bullet lists */
  featureStrings: string[];

  /** Support level display string */
  supportLevel: string;

  /** Whether this tier should be visually highlighted */
  highlight?: boolean;

  /** Optional badge text (e.g., "Most Popular", "Best Value") */
  badge?: string;

  /** Checkout URLs for each billing period */
  checkoutUrls: {
    monthly?: string;
    annual?: string;
  };
}

/**
 * Formatted tier limits for display.
 */
export interface PricingTierLimits {
  posts: string;
  storage: string;
  themes: string;
  navPages: string;
  commentsPerWeek: string;
}

// =============================================================================
// COMPONENT PROPS
// =============================================================================

/**
 * Props for the main PricingGraft orchestrator component.
 */
export interface PricingGraftProps extends BaseGraftProps {
  /** Which product this pricing is for */
  productId: ProductId;

  /** Tiers to display (transformed for display) */
  tiers: PricingTier[];

  /** Default billing period selection */
  defaultPeriod?: BillingPeriod;

  /** Whether to show the full comparison table */
  showComparison?: boolean;

  /** Whether to show the fine print section */
  showFineprint?: boolean;

  /** Whether to show the billing period toggle */
  showToggle?: boolean;

  /** Whether to show cards instead of/alongside table */
  showCards?: boolean;

  // ─────────────────────────────────────────────────────────────────────────
  // Customization snippets
  // ─────────────────────────────────────────────────────────────────────────

  /** Custom header content */
  header?: Snippet;

  /** Custom badge for a tier (receives the tier) */
  tierBadge?: Snippet<[PricingTier]>;

  /** Custom footer for a tier card (receives the tier) */
  tierFooter?: Snippet<[PricingTier]>;

  /** Content to render after the pricing table */
  afterTable?: Snippet;

  /** Content to render after everything */
  footer?: Snippet;

  // ─────────────────────────────────────────────────────────────────────────
  // Events
  // ─────────────────────────────────────────────────────────────────────────

  /** Called when checkout is initiated */
  onCheckout?: (tier: TierKey, period: BillingPeriod) => void;

  /** Called when billing period changes */
  onPeriodChange?: (period: BillingPeriod) => void;
}

/**
 * Props for PricingTable component.
 */
export interface PricingTableProps extends BaseGraftProps {
  /** Tiers to display in the table */
  tiers: PricingTier[];

  /** Current billing period */
  billingPeriod: BillingPeriod;

  /** Called when checkout is initiated */
  onCheckout?: (tier: TierKey, period: BillingPeriod) => void;
}

/**
 * Props for PricingCard component.
 */
export interface PricingCardProps extends BaseGraftProps {
  /** The tier to display */
  tier: PricingTier;

  /** Current billing period */
  billingPeriod: BillingPeriod;

  /** Whether this card should be highlighted */
  highlighted?: boolean;

  /** Custom badge snippet */
  badge?: Snippet<[PricingTier]>;

  /** Custom footer snippet */
  footer?: Snippet<[PricingTier]>;

  /** Called when checkout is initiated */
  onCheckout?: (tier: TierKey, period: BillingPeriod) => void;
}

/**
 * Props for PricingToggle component.
 */
export interface PricingToggleProps extends BaseGraftProps {
  /** Current billing period */
  billingPeriod: BillingPeriod;

  /** Savings percentage to display */
  savingsPercent?: number;

  /** Called when period changes */
  onPeriodChange: (period: BillingPeriod) => void;
}

/**
 * Props for PricingCTA component.
 */
export interface PricingCTAProps extends BaseGraftProps {
  /** The tier for this CTA */
  tier: PricingTier;

  /** Current billing period */
  billingPeriod: BillingPeriod;

  /** Button variant */
  variant?: "primary" | "secondary" | "outline";

  /** Button size */
  size?: "sm" | "md" | "lg";

  /** Called when checkout is initiated */
  onCheckout?: (tier: TierKey, period: BillingPeriod) => void;
}

/**
 * Props for PricingFineprint component.
 */
export interface PricingFineprintProps extends BaseGraftProps {
  /** Which sections to show (all by default) */
  sections?: FineprintSection[];

  /** Whether sections start expanded */
  defaultExpanded?: boolean;
}

/**
 * Available fine print sections.
 */
export type FineprintSection =
  | "reading"
  | "free"
  | "themes"
  | "curios"
  | "comments"
  | "domains"
  | "email"
  | "support"
  | "centennial"
  | "included"
  | "ownership";
