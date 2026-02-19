/**
 * UpgradesGraft Component Types
 *
 * Client-side components for cultivation, garden management, and growth tracking.
 */

import type { Snippet } from "svelte";
import type { TierKey } from "$lib/config/tiers";
import type { FlourishState } from "../types.js";
import type { BaseGraftProps } from "../../types.js";

// =============================================================================
// COMPONENT PROPS
// =============================================================================

/**
 * Props for the main UpgradesGraft orchestrator component.
 */
export interface UpgradesGraftProps extends BaseGraftProps {
  /** Current growth stage of the user */
  currentStage?: TierKey;

  /** Flourishing state of the grove */
  flourishState?: FlourishState;

  /** Callback when cultivation is initiated */
  onCultivate?: (stage: TierKey, billingCycle: "monthly" | "annual") => void;

  /** Callback when garden shed is opened */
  onTend?: () => void;

  /** Callback when growth status is requested */
  onRefreshGrowth?: () => Promise<void>;

  /** Show the garden status overview */
  showStatus?: boolean;

  /** Show cultivation options */
  showCultivate?: boolean;

  /** Show garden shed button */
  showTend?: boolean;
}

/**
 * Props for GrowthCard component.
 */
export interface GrowthCardProps extends BaseGraftProps {
  /** The growth stage to display */
  stage: TierKey;

  /** Display name for this stage */
  displayName: string;

  /** Tagline description */
  tagline: string;

  /** Icon component or name */
  icon?: string;

  /** Whether this is the current stage */
  isCurrent?: boolean;

  /** Whether this stage is available for cultivation */
  available?: boolean;

  /** Whether this is the next stage up */
  isNext?: boolean;

  /** Monthly price */
  monthlyPrice?: number;

  /** Annual price */
  annualPrice?: number;

  /** Features list */
  features?: string[];

  /** CTA variant */
  variant?: "primary" | "secondary" | "outline";

  /** Called when cultivated */
  onCultivate?: (stage: TierKey) => void;
}

/**
 * Props for GardenModal component.
 */
export interface GardenModalProps extends BaseGraftProps {
  /** Whether the modal is open */
  open?: boolean;

  /** Current growth stage */
  currentStage?: TierKey;

  /** Flourishing state */
  flourishState?: FlourishState;

  /** Current billing period */
  billingPeriod?: "monthly" | "annual";

  /** Available stages for cultivation */
  availableStages?: TierKey[];

  /** Called when cultivation is requested */
  onCultivate?: (stage: TierKey, billingCycle: "monthly" | "annual") => void;

  /** Called when tending is requested */
  onTend?: () => void;

  /** Called when modal closes */
  onClose?: () => void;
}

/**
 * Props for CurrentStageBadge component.
 */
export interface CurrentStageBadgeProps extends BaseGraftProps {
  /** Current growth stage */
  currentStage?: TierKey;

  /** Flourishing state */
  flourishState?: FlourishState;

  /** Show nurture CTA */
  showNurture?: boolean;

  /** Show tend button */
  showTend?: boolean;

  /** Called when nurture is requested */
  onNurture?: () => void;

  /** Called when tend is requested */
  onTend?: () => void;
}

/**
 * Props for GardenStatus component.
 */
export interface GardenStatusProps extends BaseGraftProps {
  /** Current growth stage */
  currentStage?: TierKey;

  /** Flourishing state */
  flourishState?: FlourishState;

  /** Current period end timestamp */
  currentPeriodEnd?: number | null;

  /** Pruning scheduled */
  pruningScheduled?: boolean;

  /** Payment method brand */
  paymentBrand?: string;

  /** Payment method last digits */
  paymentLast4?: string;

  /** Show detailed status */
  showDetails?: boolean;

  /** Called when tending is requested */
  onTend?: () => void;

  /** Called when nurture (upgrade) is requested */
  onNurture?: () => void;
}
