/**
 * Billing and subscription status helpers
 * Used to verify subscription status before allowing premium feature access
 */

import type { D1Database } from "@cloudflare/workers-types";
import { getTiersWithFeature, type TierKey } from "../config/tiers.js";

export type PlanTier = TierKey;
export type SubscriptionStatus =
  | "active"
  | "past_due"
  | "paused"
  | "canceled"
  | "unpaid";

export interface TenantSubscription {
  tier: PlanTier;
  status: SubscriptionStatus | null;
  isActive: boolean;
  currentPeriodEnd: number | null;
}

export interface AuditLogEntry {
  tenantId: string;
  action: string;
  details: Record<string, unknown>;
  userEmail?: string;
}

/**
 * Log a billing action to the audit log.
 * Non-blocking with graceful failure - never blocks user operations.
 */
export async function logBillingAudit(
  db: D1Database,
  entry: AuditLogEntry,
): Promise<void> {
  try {
    await db
      .prepare(
        `INSERT INTO audit_log (id, tenant_id, category, action, details, user_email, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        crypto.randomUUID(),
        entry.tenantId,
        "billing",
        entry.action,
        JSON.stringify(entry.details),
        entry.userEmail,
        Math.floor(Date.now() / 1000),
      )
      .run();
  } catch (e) {
    console.error("[Billing Audit] CRITICAL - Failed to log billing action:", {
      error: e instanceof Error ? e.message : String(e),
      action: entry.action,
      tenantId: entry.tenantId,
      userEmail: entry.userEmail,
    });
  }
}

/**
 * Feature tier requirements derived from unified config.
 */
const FEATURE_REQUIREMENTS: Record<string, PlanTier[]> = {
  ai: getTiersWithFeature("ai"),
  shop: getTiersWithFeature("shop"),
  custom_domain: getTiersWithFeature("customDomain"),
  analytics: getTiersWithFeature("analytics"),
  email_forwarding: getTiersWithFeature("emailForwarding"),
};

/**
 * Get tenant's subscription tier and status
 */
export async function getTenantSubscription(
  db: D1Database,
  tenantId: string,
): Promise<TenantSubscription | null> {
  // Get tenant plan
  const tenant = await db
    .prepare("SELECT plan, active FROM tenants WHERE id = ?")
    .bind(tenantId)
    .first<{ plan: string; active: number }>();

  if (!tenant) return null;

  // Get billing status if exists
  const billing = await db
    .prepare(
      "SELECT status, current_period_end FROM platform_billing WHERE tenant_id = ?",
    )
    .bind(tenantId)
    .first<{ status: string; current_period_end: number }>();

  const tier = (tenant.plan || "free") as PlanTier;
  const status = billing?.status as SubscriptionStatus | null;

  // Subscription is active if:
  // 1. Tenant is active (not suspended)
  // 2. AND either no billing record (free tier) OR billing status is active
  const isActive = tenant.active === 1 && (!billing || status === "active");

  return {
    tier,
    status,
    isActive,
    currentPeriodEnd: billing?.current_period_end || null,
  };
}

/**
 * Check if tenant has access to a premium feature
 */
export async function checkFeatureAccess(
  db: D1Database,
  tenantId: string,
  feature: "ai" | "shop" | "custom_domain" | "analytics" | "email_forwarding",
): Promise<{ allowed: boolean; reason?: string }> {
  const subscription = await getTenantSubscription(db, tenantId);

  if (!subscription) {
    return { allowed: false, reason: "Tenant not found" };
  }

  if (!subscription.isActive) {
    return { allowed: false, reason: "Subscription inactive or suspended" };
  }

  const requiredTiers = FEATURE_REQUIREMENTS[feature];
  if (!requiredTiers) {
    return { allowed: true }; // Unknown feature, allow by default
  }

  if (!requiredTiers.includes(subscription.tier)) {
    return {
      allowed: false,
      reason: `Feature requires ${requiredTiers[0]} plan or higher`,
    };
  }

  return { allowed: true };
}

/**
 * Quick check if subscription is active (for use in endpoints)
 */
export async function requireActiveSubscription(
  db: D1Database,
  tenantId: string,
): Promise<void> {
  const subscription = await getTenantSubscription(db, tenantId);

  if (!subscription) {
    throw new Error("Tenant not found");
  }

  if (!subscription.isActive) {
    throw new Error("Subscription inactive");
  }
}

/**
 * Premium tiers that would normally require payment
 */
const PAID_TIERS: PlanTier[] = ["seedling", "sapling", "oak", "evergreen"];

/**
 * Check if a tenant account is comped (has premium tier without payment on file)
 *
 * Comped accounts are premium tier users who don't have a payment provider customer ID.
 * This includes:
 * - Admin/staff accounts
 * - Friends & family accounts
 * - Beta testers
 * - Promotional accounts
 *
 * These accounts have full access to their tier's features but cannot access
 * the billing portal since there's no Stripe customer record.
 */
export async function isCompedAccount(
  db: D1Database,
  tenantId: string,
): Promise<{ isComped: boolean; tier: PlanTier | null }> {
  // Get tenant plan
  const tenant = await db
    .prepare("SELECT plan FROM tenants WHERE id = ?")
    .bind(tenantId)
    .first<{ plan: string }>();

  if (!tenant) {
    return { isComped: false, tier: null };
  }

  const tier = (tenant.plan || "free") as PlanTier;

  // Free tier is not "comped" - it's just free
  if (!PAID_TIERS.includes(tier)) {
    return { isComped: false, tier };
  }

  // Check if there's a payment provider customer ID
  const billing = await db
    .prepare(
      "SELECT provider_customer_id FROM platform_billing WHERE tenant_id = ?",
    )
    .bind(tenantId)
    .first<{ provider_customer_id: string | null }>();

  // Comped = has paid tier but no provider customer ID
  const isComped = !billing?.provider_customer_id;

  return { isComped, tier };
}
