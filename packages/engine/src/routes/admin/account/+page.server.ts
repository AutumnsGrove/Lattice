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
    // This is a critical infrastructure failure - fail hard.
    // Query-level errors below use graceful degradation (billingError, usageError).
    throw error(500, "Database not configured");
  }

  // PERFORMANCE: Run billing and tenant queries in parallel
  // These are independent queries that were previously sequential (~400ms savings)
  // Each still has individual error handling to prevent cascading failures
  let billing: BillingRecord | null = null;
  let billingError = false;
  let tenant: TenantRecord | null = null;
  let usageError = false;

  const [billingResult, tenantResult] = await Promise.all([
    // Billing query
    platform.env.DB.prepare(
      `SELECT id, tenant_id, plan, status, provider_customer_id, provider_subscription_id,
              current_period_start, current_period_end, cancel_at_period_end,
              trial_end, payment_method_last4, payment_method_brand,
              created_at, updated_at
       FROM platform_billing WHERE tenant_id = ?`,
    )
      .bind(locals.tenantId)
      .first<BillingRecord>()
      .catch((e) => {
        console.error("[Account] Failed to load billing:", e);
        billingError = true;
        return null;
      }),

    // Tenant query
    platform.env.DB.prepare(
      `SELECT id, subdomain, display_name, email, plan, storage_used, storage_limit,
              post_count, post_limit, created_at
       FROM tenants WHERE id = ?`,
    )
      .bind(locals.tenantId)
      .first<TenantRecord>()
      .catch((e) => {
        console.error("[Account] Failed to load tenant:", e);
        usageError = true;
        return null;
      }),
  ]);

  billing = billingResult;
  tenant = tenantResult;

  // Load export counts for size validation in frontend
  // This prevents users from wasting rate limit quota on oversized exports
  const MAX_EXPORT_ITEMS = 5000;
  let exportCounts = { posts: 0, pages: 0, media: 0 };
  let exportTooLarge = false;
  try {
    const [postResult, pageResult, mediaResult] = await Promise.all([
      platform.env.DB.prepare(
        "SELECT COUNT(*) as count FROM posts WHERE tenant_id = ?",
      )
        .bind(locals.tenantId)
        .first<{ count: number }>(),
      platform.env.DB.prepare(
        "SELECT COUNT(*) as count FROM pages WHERE tenant_id = ?",
      )
        .bind(locals.tenantId)
        .first<{ count: number }>(),
      platform.env.DB.prepare(
        "SELECT COUNT(*) as count FROM media WHERE tenant_id = ?",
      )
        .bind(locals.tenantId)
        .first<{ count: number }>(),
    ]);
    exportCounts = {
      posts: postResult?.count ?? 0,
      pages: pageResult?.count ?? 0,
      media: mediaResult?.count ?? 0,
    };
    exportTooLarge = Object.values(exportCounts).some(
      (count) => count > MAX_EXPORT_ITEMS,
    );
  } catch (e) {
    console.error("[Account] Failed to load export counts:", e);
    // Non-critical - continue without counts
  }

  // Get tier configuration
  // Prioritize billing.plan (source of truth from Stripe) using nullish coalescing
  const currentPlan = (billing?.plan ?? tenant?.plan ?? "seedling") as TierKey;
  const tierConfig = getTier(currentPlan);

  // Get available tiers for plan changes
  const availableTiers = Object.entries(TIERS)
    .filter(
      ([key, config]) =>
        config.status === "available" || config.status === "coming_soon",
    )
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
    billingError,
    usage: tenant
      ? {
          storageUsed: tenant.storage_used,
          storageLimit: tenant.storage_limit,
          postCount: tenant.post_count,
          postLimit: tenant.post_limit,
          accountAge: tenant.created_at
            ? Math.floor(
                (Date.now() / 1000 - tenant.created_at) / (24 * 60 * 60),
              )
            : 0,
        }
      : null,
    usageError,
    exportCounts,
    exportTooLarge,
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
