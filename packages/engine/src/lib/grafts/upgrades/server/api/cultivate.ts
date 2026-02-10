/**
 * Cultivation API: POST /api/grafts/upgrades/cultivate
 *
 * Help your grove grow to the next stage.
 */

import { json, redirect } from "@sveltejs/kit";
import type { RequestHandler } from "@sveltejs/kit";
import type { CultivateRequest, CultivateResponse } from "../../types";
import { createUpgradeConfig, getPlantingUrl } from "../../config";
import { throwGroveError, API_ERRORS } from "$lib/errors";
import { getVerifiedTenantId } from "$lib/auth/session";
import { checkRateLimit } from "$lib/server/rate-limits";
import { createPaymentProvider } from "$lib/payments";
import { logBillingAudit, isCompedAccount } from "$lib/server/billing";

const CULTIVATE_RATE_LIMIT = { limit: 20, windowSeconds: 3600 }; // 20 per hour

export const POST: RequestHandler = async ({
  request,
  platform,
  locals,
  url,
}): Promise<Response> => {
  // Authentication required
  if (!locals.user) {
    throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
  }

  // CSRF validation — use URL.origin for exact domain match (prevents grove.place.evil.com bypass)
  const requestOrigin =
    request.headers.get("origin") || request.headers.get("referer");
  try {
    if (!requestOrigin) throw new Error("Missing origin");
    const originUrl = new URL(requestOrigin);
    const expectedUrl = new URL(locals.origin ?? "https://grove.place");
    if (originUrl.origin !== expectedUrl.origin) {
      throwGroveError(403, API_ERRORS.INVALID_ORIGIN, "API");
    }
  } catch (e) {
    if ((e as { status?: number }).status === 403) throw e;
    throwGroveError(403, API_ERRORS.INVALID_ORIGIN, "API");
  }

  // Environment check
  if (!platform?.env?.DB) {
    throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
  }

  if (!platform?.env?.STRIPE_SECRET_KEY) {
    throwGroveError(500, API_ERRORS.PAYMENT_PROVIDER_NOT_CONFIGURED, "API");
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
    key: `cultivate:${verifiedTenantId}`,
    limit: CULTIVATE_RATE_LIMIT.limit,
    windowSeconds: CULTIVATE_RATE_LIMIT.windowSeconds,
    namespace: "cultivate",
  });

  if (response) {
    return response;
  }

  // Parse request body
  let body: CultivateRequest;
  try {
    body = await request.json();
  } catch {
    throwGroveError(400, API_ERRORS.INVALID_REQUEST_BODY, "API");
  }

  const { targetStage, billingCycle = "monthly", returnTo } = body;

  // Validate target stage
  const validStages = ["seedling", "sapling", "oak", "evergreen"];
  if (!targetStage || !validStages.includes(targetStage)) {
    throwGroveError(400, API_ERRORS.INVALID_REQUEST_BODY, "API");
  }

  // Validate billing cycle
  if (billingCycle !== "monthly" && billingCycle !== "yearly") {
    throwGroveError(400, API_ERRORS.INVALID_REQUEST_BODY, "API");
  }

  // Get configuration
  const config = createUpgradeConfig(
    platform.env as unknown as Record<string, string | undefined>,
  );

  // Check if cultivation is allowed to this stage
  const plantingUrl = getPlantingUrl(config, targetStage, billingCycle);
  if (!plantingUrl) {
    throwGroveError(400, API_ERRORS.INVALID_REQUEST_BODY, "API");
  }

  // Check if already at or above target stage
  const billing = (await platform.env.DB.prepare(
    `SELECT plan FROM platform_billing WHERE tenant_id = ?`,
  )
    .bind(verifiedTenantId)
    .first()) as { plan: string } | null;

  if (billing) {
    const currentStageOrder = [
      "wanderer",
      "seedling",
      "sapling",
      "oak",
      "evergreen",
    ];
    const currentIndex = currentStageOrder.indexOf(billing.plan);
    const targetIndex = currentStageOrder.indexOf(targetStage);

    if (targetIndex <= currentIndex) {
      // Already at or above target stage
      const params = new URLSearchParams();
      params.set("returnTo", returnTo ?? "/garden");
      return redirect(302, `/garden?${params.toString()}`);
    }
  }

  // Check for comped status
  const { isComped: isCompedBool } = await isCompedAccount(
    platform.env.DB,
    verifiedTenantId,
  );
  if (isCompedBool) {
    // Comped accounts cannot upgrade through cultivation
    const params = new URLSearchParams();
    params.set("error", "comped");
    params.set("returnTo", returnTo ?? "/garden");
    return redirect(302, `/garden?${params.toString()}`);
  }

  try {
    // Create Stripe Checkout Session for cultivation
    const payments = createPaymentProvider("stripe", {
      secretKey: platform.env.STRIPE_SECRET_KEY,
    });

    const providerCustomerId = (await platform.env.DB.prepare(
      `SELECT provider_customer_id FROM platform_billing WHERE tenant_id = ?`,
    )
      .bind(verifiedTenantId)
      .first()) as { provider_customer_id: string | null } | null;

    if (!providerCustomerId?.provider_customer_id) {
      throwGroveError(400, API_ERRORS.RESOURCE_NOT_FOUND, "API");
    }

    // Create checkout session with proration
    const items = [
      {
        variantId: targetStage,
        quantity: 1,
      },
    ];
    const resolveVariant = async (): Promise<null> => null;
    const session = await payments.createCheckoutSession(
      items,
      {
        mode: "subscription",
        successUrl: constructSuccessUrl(config.appUrl, returnTo),
        cancelUrl: constructCancelUrl(config.appUrl, returnTo),
        customerId: providerCustomerId.provider_customer_id,
        metadata: {
          tenantId: verifiedTenantId,
          targetStage,
          billingCycle,
          type: "cultivation",
        },
        allowPromotionCodes: true,
        subscriptionData: {
          prorationBehavior: "create_prorations",
        },
      },
      resolveVariant,
    );

    // Audit log the cultivation attempt
    await logBillingAudit(platform.env.DB, {
      tenantId: verifiedTenantId,
      action: "cultivation_started",
      details: {
        targetStage,
        billingCycle,
        returnTo,
        sessionId: session.id,
      },
      userEmail: locals.user.email,
    });

    const response: CultivateResponse = {
      plantingUrl: session.url ?? plantingUrl,
      sessionId: session.id,
    };

    return json(response);
  } catch (error) {
    console.error("[Cultivate] Failed to create cultivation session:", error);

    // Audit log the failure
    await logBillingAudit(platform.env.DB, {
      tenantId: verifiedTenantId,
      action: "cultivation_failed",
      details: {
        targetStage,
        billingCycle,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      userEmail: locals.user.email,
    });

    throwGroveError(500, API_ERRORS.INTERNAL_ERROR, "API");
  }
};

/**
 * Construct the success URL for after cultivation.
 */
function constructSuccessUrl(appUrl: string, returnTo?: string): string {
  const baseUrl = `${appUrl}/api/grafts/upgrades/cultivate/complete`;
  const params = new URLSearchParams();

  if (returnTo && returnTo.startsWith("/")) {
    params.set("returnTo", returnTo);
  }

  return `${baseUrl}?${params.toString()}`;
}

/**
 * Construct the cancel URL for canceled cultivation.
 */
function constructCancelUrl(appUrl: string, returnTo?: string): string {
  const baseUrl = `${appUrl}/garden`;
  const params = new URLSearchParams();

  if (returnTo && returnTo.startsWith("/")) {
    params.set("returnTo", returnTo);
  }

  return `${baseUrl}?${params.toString()}`;
}
