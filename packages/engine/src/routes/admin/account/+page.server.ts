import { error } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";
import { TIERS, type TierKey, getTier } from "$lib/config/tiers";

/**
 * Account & Subscription Management Page
 *
 * Allows users to:
 * - View current subscription status
 * - Cancel/resume subscription
 * - Change plan (upgrade/downgrade)
 * - Access billing portal for payment updates
 * - Export their data
 */

interface BillingRecord {
  id: string;
  tenant_id: string;
  plan: string;
  status: string;
  provider_customer_id: string | null;
  provider_subscription_id: string | null;
  current_period_start: number | null;
  current_period_end: number | null;
  cancel_at_period_end: number;
  trial_end: number | null;
  payment_method_last4: string | null;
  payment_method_brand: string | null;
  created_at: number;
  updated_at: number;
}

interface TenantRecord {
  id: string;
  subdomain: string;
  display_name: string;
  email: string;
  plan: string;
  storage_used: number;
  storage_limit: number;
  post_count: number;
  post_limit: number | null;
  created_at: number;
}

export const load: PageServerLoad = async ({ locals, platform, parent }) => {
  const parentData = await parent();

  if (!locals.tenantId) {
    throw error(400, "No tenant context");
  }

  if (!platform?.env?.DB) {
    throw error(500, "Database not configured");
  }

  // Load billing information
  let billing: BillingRecord | null = null;
  try {
    billing = await platform.env.DB.prepare(
      `SELECT id, tenant_id, plan, status, provider_customer_id, provider_subscription_id,
              current_period_start, current_period_end, cancel_at_period_end,
              trial_end, payment_method_last4, payment_method_brand,
              created_at, updated_at
       FROM platform_billing WHERE tenant_id = ?`
    )
      .bind(locals.tenantId)
      .first<BillingRecord>();
  } catch (e) {
    console.error("[Account] Failed to load billing:", e);
  }

  // Load tenant information for usage stats
  let tenant: TenantRecord | null = null;
  try {
    tenant = await platform.env.DB.prepare(
      `SELECT id, subdomain, display_name, email, plan, storage_used, storage_limit,
              post_count, post_limit, created_at
       FROM tenants WHERE id = ?`
    )
      .bind(locals.tenantId)
      .first<TenantRecord>();
  } catch (e) {
    console.error("[Account] Failed to load tenant:", e);
  }

  // Get tier configuration
  const currentPlan = (billing?.plan || tenant?.plan || "seedling") as TierKey;
  const tierConfig = getTier(currentPlan);

  // Get available tiers for plan changes
  const availableTiers = Object.entries(TIERS)
    .filter(([key, config]) => config.status === "available" || config.status === "coming_soon")
    .map(([key, config]) => ({
      id: key,
      name: config.display.name,
      tagline: config.display.tagline,
      monthlyPrice: config.pricing.monthlyPrice,
      yearlyPrice: config.pricing.yearlyPrice,
      features: config.display.featureStrings,
      status: config.status,
      isCurrent: key === currentPlan,
      isUpgrade: config.order > (TIERS[currentPlan]?.order ?? 0),
    }));

  return {
    ...parentData,
    billing: billing
      ? {
          plan: billing.plan,
          status: billing.status,
          hasSubscription: !!billing.provider_subscription_id,
          currentPeriodStart: billing.current_period_start
            ? new Date(billing.current_period_start * 1000).toISOString()
            : null,
          currentPeriodEnd: billing.current_period_end
            ? new Date(billing.current_period_end * 1000).toISOString()
            : null,
          cancelAtPeriodEnd: billing.cancel_at_period_end === 1,
          trialEnd: billing.trial_end
            ? new Date(billing.trial_end * 1000).toISOString()
            : null,
          paymentMethod: billing.payment_method_last4
            ? {
                last4: billing.payment_method_last4,
                brand: billing.payment_method_brand,
              }
            : null,
          customerId: billing.provider_customer_id,
        }
      : null,
    usage: tenant
      ? {
          storageUsed: tenant.storage_used,
          storageLimit: tenant.storage_limit,
          postCount: tenant.post_count,
          postLimit: tenant.post_limit,
          accountAge: Math.floor(
            (Date.now() / 1000 - tenant.created_at) / (24 * 60 * 60)
          ),
        }
      : null,
    currentPlan,
    tierConfig: {
      name: tierConfig.display.name,
      tagline: tierConfig.display.tagline,
      icon: tierConfig.display.icon,
      features: tierConfig.display.featureStrings,
      support: tierConfig.support.displayString,
    },
    availableTiers,
  };
};
