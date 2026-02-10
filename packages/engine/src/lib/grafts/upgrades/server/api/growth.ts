/**
 * Growth Status API: GET /api/grafts/upgrades/growth
 *
 * Check how your grove is flourishing.
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "@sveltejs/kit";
import type { GrowthStatus, FlourishState } from "../../types";
import { throwGroveError, API_ERRORS } from "$lib/errors";
import { getVerifiedTenantId } from "$lib/auth/session";
import { checkRateLimit } from "$lib/server/rate-limits";
import { isCompedAccount } from "$lib/server/billing";

const GROWTH_RATE_LIMIT = { limit: 100, windowSeconds: 3600 }; // 100 per hour

export const GET: RequestHandler = async ({
  platform,
  locals,
}): Promise<Response> => {
  // Authentication required
  if (!locals.user) {
    throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
  }

  // Environment check
  if (!platform?.env?.DB) {
    throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
  }

  // Get and verify tenant
  const tenantId = locals.tenantId;
  if (!tenantId) {
    throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
  }

  const verifiedTenantId = await getVerifiedTenantId(
    platform.env.DB,
    tenantId,
    locals.user,
  );

  // Rate limiting
  const { response } = await checkRateLimit({
    kv: platform.env.CACHE_KV,
    key: `growth:${verifiedTenantId}`,
    limit: GROWTH_RATE_LIMIT.limit,
    windowSeconds: GROWTH_RATE_LIMIT.windowSeconds,
    namespace: "growth",
  });

  if (response) {
    return response;
  }

  try {
    // Get billing record with all details
    const billing = (await platform.env.DB.prepare(
      `SELECT
				plan,
				status,
				current_period_start,
				current_period_end,
				cancel_at_period_end,
				payment_method_last4,
				payment_method_brand
			FROM platform_billing
			WHERE tenant_id = ?`,
    )
      .bind(verifiedTenantId)
      .first()) as {
      plan: string;
      status: string;
      current_period_start: number | null;
      current_period_end: number | null;
      cancel_at_period_end: number;
      payment_method_last4: string | null;
      payment_method_brand: string | null;
    } | null;

    if (!billing) {
      throwGroveError(404, API_ERRORS.RESOURCE_NOT_FOUND, "API");
    }

    // Determine flourish state
    const flourishState = determineFlourishState(billing.status);

    // Check comped status
    const { isComped: isCompedBool } = await isCompedAccount(
      platform.env.DB,
      verifiedTenantId,
    );

    const response: GrowthStatus = {
      currentStage: billing.plan as GrowthStatus["currentStage"],
      flourishState,
      currentPeriodEnd: billing.current_period_end,
      pruningScheduled: billing.cancel_at_period_end === 1,
      isComped: isCompedBool,
      wateringMethod: billing.payment_method_last4
        ? {
            source: billing.payment_method_brand ?? "unknown",
            lastDigits: billing.payment_method_last4,
          }
        : undefined,
    };

    return json(response);
  } catch (error) {
    if ((error as { status?: number }).status) {
      throw error;
    }

    console.error("[Growth] Failed to get growth status:", error);
    throwGroveError(500, API_ERRORS.INTERNAL_ERROR, "API");
  }
};

/**
 * Determine the flourish state from billing status.
 */
function determineFlourishState(status: string): FlourishState {
  // Map billing status to flourish state
  const statusMap: Record<string, FlourishState> = {
    active: "active",
    past_due: "past_due",
    unpaid: "past_due",
    canceled: "pruned",
    incomplete: "active",
    incomplete_expired: "pruned",
    paused: "resting",
    trialing: "active",
  };

  return statusMap[status] ?? "active";
}
