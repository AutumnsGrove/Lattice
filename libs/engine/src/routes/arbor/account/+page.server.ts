import { error } from "@sveltejs/kit";
import { ARBOR_ERRORS, throwGroveError } from "$lib/errors";
import type { PageServerLoad, Actions } from "./$types";
import { TIERS, type TierKey, getTier } from "$lib/config/tiers";
import type { Passkey } from "$lib/heartwood";
import { AUTH_HUB_URL } from "$lib/config/auth.js";

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
  created_at: number;
}

/**
 * Fetch user passkeys from GroveAuth.
 * Returns empty array on error to allow graceful degradation.
 *
 * Session authentication:
 * - grove_session: SessionDO cookie (preferred, set by session bridge after OAuth)
 * - better-auth.session_token: Better Auth session (set directly by BA after OAuth)
 *
 * Note: access_token (legacy JWT) is no longer used for OAuth accounts.
 */
async function fetchUserPasskeys(
  sessionCookies: {
    groveSession?: string;
    betterAuthSession?: string;
  },
  platform: App.Platform | undefined,
): Promise<{ passkeys: Passkey[]; error: boolean }> {
  const { groveSession, betterAuthSession } = sessionCookies;

  // Need at least one session cookie
  if (!groveSession && !betterAuthSession) {
    return { passkeys: [], error: false };
  }

  // Need service binding to reach Heartwood
  if (!platform?.env?.AUTH) {
    console.error("[Account] AUTH service binding not available");
    return { passkeys: [], error: true };
  }

  try {
    // Build Cookie header with available session cookies
    // GroveAuth validates sessions via Cookie header (not Authorization)
    const cookieParts: string[] = [];
    if (groveSession) {
      cookieParts.push(`grove_session=${groveSession}`);
    }
    if (betterAuthSession) {
      // Better Auth uses this cookie name for session validation
      cookieParts.push(`better-auth.session_token=${betterAuthSession}`);
    }

    // Use service binding — Worker-to-Worker, never public internet
    const response = await platform.env.AUTH.fetch(
      `${AUTH_HUB_URL}/api/auth/passkey/list-user-passkeys`,
      {
        headers: {
          Cookie: cookieParts.join("; "),
        },
      },
    );

    if (!response.ok) {
      console.error("[Account] Failed to fetch passkeys:", response.status);
      return { passkeys: [], error: true };
    }

    const passkeys = (await response.json()) as Passkey[];
    return { passkeys, error: false };
  } catch (e) {
    console.error("[Account] Passkey fetch error:", e);
    return { passkeys: [], error: true };
  }
}

export const load: PageServerLoad = async ({
  locals,
  platform,
  parent,
  cookies,
}) => {
  const parentData = await parent();

  if (!locals.tenantId) {
    throwGroveError(400, ARBOR_ERRORS.TENANT_CONTEXT_REQUIRED, "Arbor");
  }

  if (!platform?.env?.DB) {
    // This is a critical infrastructure failure - fail hard.
    // Query-level errors below use graceful degradation (billingError, usageError).
    throwGroveError(500, ARBOR_ERRORS.DB_NOT_AVAILABLE, "Arbor");
  }

  // Get session cookies for passkey API calls
  // grove_session: SessionDO cookie (set by session bridge after OAuth)
  // better-auth.session_token: Better Auth session cookie (set directly after OAuth)
  // Note: access_token (legacy JWT) is no longer used for OAuth accounts
  const groveSession = cookies.get("grove_session");
  const betterAuthSession =
    cookies.get("__Secure-better-auth.session_token") ||
    cookies.get("better-auth.session_token");
  // ISOLATED QUERIES: D1 queries and external API calls are separated
  // D1 queries (billing, tenant) are fast (~50ms) and critical for page render
  // Passkey fetch is an external API call that can be slower and is non-critical
  // This prevents a slow GroveAuth response from blocking billing/tenant display
  let billing: BillingRecord | null = null;
  let billingError = false;
  let tenant: TenantRecord | null = null;
  let usageError = false;

  // Start passkey fetch early (runs concurrently with D1 queries)
  // Returned as deferred data - page renders immediately, passkeys stream in
  const passkeyPromise = fetchUserPasskeys(
    { groveSession, betterAuthSession },
    platform,
  );

  // Await critical D1 queries
  const [billingResult, tenantResult] = await Promise.all([
    // Billing query
    platform.env.DB.prepare(
      `SELECT id, tenant_id, plan, status, provider_customer_id, provider_subscription_id,
              current_period_start, current_period_end, cancel_at_period_end,
              payment_method_last4, payment_method_brand,
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

    // Tenant query (limits come from tier config, not DB)
    platform.env.DB.prepare(
      `SELECT id, subdomain, display_name, email, plan, created_at
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
  let curiosCount = 0;
  let storageUsedBytes = 0;
  try {
    const [
      postResult,
      pageResult,
      mediaResult,
      storageResult,
      timelineCurio,
      galleryCurio,
      journeyCurio,
      pulseCurio,
    ] = await Promise.all([
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
      // Calculate actual storage from image_hashes (not stale tenants.storage_used)
      platform.env.DB.prepare(
        "SELECT COALESCE(SUM(COALESCE(stored_size_bytes, 0)), 0) as total_bytes FROM image_hashes WHERE tenant_id = ?",
      )
        .bind(locals.tenantId)
        .first<{ total_bytes: number }>(),
      // Curio config queries
      platform.env.DB.prepare(
        "SELECT enabled FROM timeline_curio_config WHERE tenant_id = ?",
      )
        .bind(locals.tenantId)
        .first<{ enabled: number }>()
        .catch(() => null),
      platform.env.DB.prepare(
        "SELECT enabled FROM gallery_curio_config WHERE tenant_id = ?",
      )
        .bind(locals.tenantId)
        .first<{ enabled: number }>()
        .catch(() => null),
      platform.env.DB.prepare(
        "SELECT enabled FROM journey_curio_config WHERE tenant_id = ?",
      )
        .bind(locals.tenantId)
        .first<{ enabled: number }>()
        .catch(() => null),
      platform.env.DB.prepare(
        "SELECT enabled FROM pulse_curio_config WHERE tenant_id = ?",
      )
        .bind(locals.tenantId)
        .first<{ enabled: number }>()
        .catch(() => null),
    ]);
    storageUsedBytes = storageResult?.total_bytes ?? 0;
    exportCounts = {
      posts: postResult?.count ?? 0,
      pages: pageResult?.count ?? 0,
      media: mediaResult?.count ?? 0,
    };
    exportTooLarge = Object.values(exportCounts).some(
      (count) => count > MAX_EXPORT_ITEMS,
    );
    // Count enabled curios
    curiosCount =
      (timelineCurio?.enabled === 1 ? 1 : 0) +
      (galleryCurio?.enabled === 1 ? 1 : 0) +
      (journeyCurio?.enabled === 1 ? 1 : 0) +
      (pulseCurio?.enabled === 1 ? 1 : 0);
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

  // Build billing data - handle comped accounts (oak/evergreen without billing record)
  const isCompedPremium =
    !billing && ["oak", "evergreen"].includes(currentPlan);

  const billingData = billing
    ? {
        plan: billing.plan,
        status: billing.status,
        hasSubscription:
          !!billing.provider_subscription_id ||
          ["oak", "evergreen"].includes(billing.plan),
        currentPeriodStart: billing.current_period_start
          ? new Date(billing.current_period_start * 1000).toISOString()
          : null,
        currentPeriodEnd: billing.current_period_end
          ? new Date(billing.current_period_end * 1000).toISOString()
          : null,
        cancelAtPeriodEnd: billing.cancel_at_period_end === 1,
        paymentMethod: billing.payment_method_last4
          ? {
              last4: billing.payment_method_last4,
              brand: billing.payment_method_brand,
            }
          : null,
        customerId: billing.provider_customer_id,
      }
    : isCompedPremium
      ? {
          // Synthetic billing for comped premium accounts (admin, invited, etc.)
          plan: currentPlan,
          status: "active" as const,
          hasSubscription: true,
          currentPeriodStart: null,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
          paymentMethod: null,
          customerId: null,
        }
      : null;

  return {
    ...parentData,
    billing: billingData,
    billingError,
    usage: tenant
      ? {
          // Use actual storage from image_hashes, not stale tenants.storage_used
          storageUsed: storageUsedBytes,
          storageLimit: tierConfig.limits.storage,
          // Use actual post count from posts table, not stale tenants.post_count
          postCount: exportCounts.posts,
          postLimit:
            tierConfig.limits.posts === Infinity
              ? null
              : tierConfig.limits.posts,
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
    curiosCount,
    // Deferred: passkey data streams in after initial render
    // Use {#await data.passkeyData} in the page to handle loading state
    passkeyData: passkeyPromise,
  };
};
