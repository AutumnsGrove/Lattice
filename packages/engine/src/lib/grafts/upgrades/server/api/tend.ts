/**
 * Garden Shed API: POST /api/grafts/upgrades/tend
 *
 * Open the garden shed for self-service billing management.
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "@sveltejs/kit";
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
    throwGroveError(400, API_ERRORS.INVALID_REQUEST_BODY, "API");
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
      platform.env as unknown as Record<string, string | undefined>,
    );

    const portalSession = await payments.createBillingPortalSession(
      billing.provider_customer_id,
      constructReturnUrl(config.appUrl, returnTo),
    );

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

    throwGroveError(500, API_ERRORS.INTERNAL_ERROR, "API");
  }
};

/**
 * Construct the return URL after tending the garden.
 */
function constructReturnUrl(appUrl: string, returnTo?: string): string {
  if (returnTo && returnTo.startsWith("/")) {
    return `${appUrl}${returnTo}`;
  }
  return `${appUrl}/garden`;
}
