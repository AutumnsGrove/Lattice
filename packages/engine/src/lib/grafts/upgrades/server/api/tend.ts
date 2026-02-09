/**
 * Garden Shed API: POST /api/grafts/upgrades/tend
 *
 * Open the garden shed for self-service billing management.
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import type { TendRequest, TendResponse } from "../../types";
import { createUpgradeConfig } from "../../config";
import { throwGroveError, API_ERRORS } from "$lib/errors";
import { getVerifiedTenantId } from "$lib/auth/session";
import { checkRateLimit } from "$lib/server/rate-limits";
import { createPaymentProvider } from "$lib/payments";
import { logBillingAudit } from "$lib/server/billing";

const TEND_RATE_LIMIT = { limit: 20, windowSeconds: 3600 }; // 20 per hour

export const POST: RequestHandler = async ({
  request,
  platform,
  locals,
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
    key: `tend:${verifiedTenantId}`,
    limit: TEND_RATE_LIMIT.limit,
    windowSeconds: TEND_RATE_LIMIT.windowSeconds,
    namespace: "tend",
  });

  if (response) {
    return response;
  }

  // Parse request body
  let body: TendRequest;
  try {
    body = await request.json();
  } catch {
    throwGroveError(400, API_ERRORS.INVALID_REQUEST, "API");
  }

  const { returnTo } = body;

  try {
    // Get billing record for customer ID
    const billing = (await platform.env.DB.prepare(
      `SELECT provider_customer_id FROM platform_billing WHERE tenant_id = ?`,
    )
      .bind(verifiedTenantId)
      .first()) as { provider_customer_id: string | null } | null;

    if (!billing?.provider_customer_id) {
      throwGroveError(400, API_ERRORS.RESOURCE_NOT_FOUND, "API");
    }

    // Create Stripe Billing Portal session
    const payments = createPaymentProvider("stripe", {
      secretKey: platform.env.STRIPE_SECRET_KEY,
    });

    const config = createUpgradeConfig(
      platform.env as Record<string, string | undefined>,
    );

    const portalSession = await payments.createPortalSession({
      customerId: billing.provider_customer_id,
      returnUrl: constructReturnUrl(config.appUrl, returnTo),
    });

    // Audit log the portal access
    await logBillingAudit(platform.env.DB, {
      tenantId: verifiedTenantId,
      action: "garden_shed_opened",
      details: {
        returnTo,
        sessionId: portalSession.id,
      },
      userEmail: locals.user.email,
    });

    const response: TendResponse = {
      shedUrl: portalSession.url,
    };

    return json(response);
  } catch (error) {
    console.error("[Tend] Failed to create portal session:", error);

    // Audit log the failure
    await logBillingAudit(platform.env.DB, {
      tenantId: verifiedTenantId,
      action: "garden_shed_failed",
      details: {
        returnTo,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      userEmail: locals.user.email,
    });

    throwGroveError(500, API_ERRORS.PAYMENT_PROVIDER_ERROR, "API");
  }
};

/**
 * Construct the return URL after tending the garden.
 */
function constructReturnUrl(appUrl: string, returnTo?: string): string {
  if (returnTo) {
    return returnTo;
  }
  return `${appUrl}/garden`;
}
