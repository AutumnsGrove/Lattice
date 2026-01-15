/**
 * Type definitions for Account page components.
 */

import type { TierStatus } from "$lib/config/tiers";

export interface BillingData {
  plan: string;
  status: string;
  hasSubscription: boolean;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  trialEnd: string | null;
  paymentMethod: {
    last4: string;
    brand: string | null;
  } | null;
  customerId: string | null;
}

export interface UsageData {
  storageUsed: number;
  storageLimit: number;
  postCount: number;
  postLimit: number | null;
  accountAge: number;
}

export interface TierConfig {
  name: string;
  tagline: string;
  icon: string;
  features: string[];
  support: string;
}

export interface AvailableTier {
  id: string;
  name: string;
  tagline: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: string[];
  status: TierStatus;
  isCurrent: boolean;
  isUpgrade: boolean;
}

export interface AccountPageData {
  billing: BillingData | null;
  billingError: boolean;
  usage: UsageData | null;
  usageError: boolean;
  currentPlan: string;
  tierConfig: TierConfig | null;
  availableTiers: AvailableTier[];
}

// Re-export from canonical source to avoid duplication
export type { ExportType } from "../../api/export/+server";
