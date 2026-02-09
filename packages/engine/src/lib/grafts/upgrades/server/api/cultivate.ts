/**
 * Cultivation API: POST /api/grafts/upgrades/cultivate
 *
 * Help your grove grow to the next stage.
 */

import { json, redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import type { CultivateRequest, CultivateResponse } from "../../types";
import { createUpgradeConfig, getPlantingUrl } from "../../config";
import { throwGroveError, API_ERRORS } from "$lib/errors";
import { getVerifiedTenantId } from "$lib/auth/session";
import { checkRateLimit } from "$lib/server/rate-limits";
import { PLANS } from "$lib/config/tiers";
import { createPaymentProvider } from "$lib/payments";
import { logBillingAudit } from "$lib/server/billing";
import { isCompedAccount } from "$lib/server/billing";

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

  // CSRF validation
  const origin =
    request.headers.get("origin") || request.headers.get("referer");
  if (!origin || !origin.startsWith(locals.origin ?? "https://grove.place")) {
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
    throwGroveError(400, API_ERRORS.TENANT_REQUIRED, "API");
  }

  const verifiedTenantId = await getVerifiedTenantId(
    platform.env.DB,
    tenantId,
    locals.user,
  );

  // Rate limiting
  const { result, response } = await checkRateLimit({
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
    throwGroveError(400, API_ERRORS.INVALID_REQUEST, "API");
  }

  const { targetStage, billingCycle = "monthly", returnTo } = body;

  // Validate target stage
  const validStages = ["seedling", "sapling", "oak", "evergreen"];
  if (!targetStage || !validStages.includes(targetStage)) {
    throwGroveError(400, API_ERRORS.INVALID_REQUEST, "API");
  }

  // Validate billing cycle
  if (billingCycle !== "monthly" && billingCycle !== "yearly") {
    throwGroveError(400, API_ERRORS.INVALID_REQUEST, "API");
  }

  // Get configuration
  const config = createUpgradeConfig(
    platform.env as Record<string, string | undefined>,
  );

  // Check if cultivation is allowed to this stage
  const plantingUrl = getPlantingUrl(config, targetStage, billingCycle);
  if (!plantingUrl) {
    throwGroveError(400, API_ERRORS.INVALID_REQUEST, "API");
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
  const isComped = await isCompedAccount(platform.env.DB, verifiedTenantId);
  if (isComped) {
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
    const session = await payments.createCheckoutSession({
      customerId: providerCustomerId.provider_customer_id,
      successUrl: constructSuccessUrl(config.appUrl, returnTo),
      cancelUrl: constructCancelUrl(config.appUrl, returnTo),
      lineItems: [
        {
          price: getStagePriceId(targetStage, billingCycle),
          quantity: 1,
        },
      ],
      mode: "subscription",
      metadata: {
        tenantId: verifiedTenantId,
        targetStage,
        billingCycle,
        type: "cultivation",
      },
      allowPromotionCodes: true,
      // Enable proration for immediate effect
      subscriptionData: {
        prorationBehavior: "create_prorations",
      },
    });

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

    throwGroveError(500, API_ERRORS.PAYMENT_PROVIDER_ERROR, "API");
  }
};

/**
 * Get the Stripe price ID for a stage and billing cycle.
 */
function getStagePriceId(stage: string, billingCycle: string): string {
  const prices: Record<string, Record<string, string>> = {
    seedling: {
      monthly: process.env.STRIPE_PRICE_SEEDLING_MONTHLY ?? "",
      yearly: process.env.STRIPE_PRICE_SEEDLING_YEARLY ?? "",
    },
    sapling: {
      monthly: process.env.STRIPE_PRICE_SAPLING_MONTHLY ?? "",
      yearly: process.env.STRIPE_PRICE_SAPLING_YEARLY ?? "",
    },
    oak: {
      monthly: process.env.STRIPE_PRICE_OAK_MONTHLY ?? "",
      yearly: process.env.STRIPE_PRICE_OAK_YEARLY ?? "",
    },
    evergreen: {
      monthly: process.env.STRIPE_PRICE_EVERGREEN_MONTHLY ?? "",
      yearly: process.env.STRIPE_PRICE_EVERGREEN_YEARLY ?? "",
    },
  };

  return prices[stage]?.[billingCycle] ?? "";
}

/**
 * Construct the success URL for after cultivation.
 */
function constructSuccessUrl(appUrl: string, returnTo?: string): string {
  const baseUrl = `${appUrl}/api/grafts/upgrades/cultivate/complete`;
  const params = new URLSearchParams();

  if (returnTo) {
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

  if (returnTo) {
    params.set("returnTo", returnTo);
  }

  return `${baseUrl}?${params.toString()}`;
}
