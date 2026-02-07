import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { validateCSRF } from "$lib/utils/csrf.js";
import { createPaymentProvider } from "$lib/payments";
import { getVerifiedTenantId } from "$lib/auth/session.js";
import { API_ERRORS, throwGroveError } from "$lib/errors";

// Shop feature is temporarily disabled - deferred to Phase 5 (Grove Social and beyond)
const SHOP_DISABLED = true;
const SHOP_DISABLED_MESSAGE =
  "Shop feature is temporarily disabled. It will be available in a future release.";

/**
 * GET /api/shop/connect - Get Connect account status
 */
export const GET: RequestHandler = async ({ url, platform, locals }) => {
  if (SHOP_DISABLED) {
    throwGroveError(503, API_ERRORS.FEATURE_DISABLED, "API");
  }

  if (!locals.user) {
    throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
  }

  if (!platform?.env?.DB) {
    throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
  }

  const requestedTenantId =
    url.searchParams.get("tenant_id") || locals.tenantId;

  try {
    // Verify user owns this tenant
    const tenantId = await getVerifiedTenantId(
      platform.env.DB,
      requestedTenantId,
      locals.user,
    );

    // Get Connect account from database
    const account = await platform.env.DB.prepare(
      `SELECT id, provider_account_id, account_type, status, charges_enabled,
                payouts_enabled, details_submitted, email, country, default_currency,
                onboarding_complete, created_at, updated_at
         FROM connect_accounts WHERE tenant_id = ?`,
    )
      .bind(tenantId)
      .first();

    if (!account) {
      return json({
        connected: false,
        account: null,
      });
    }

    // If account exists, fetch latest status from Stripe
    if (platform.env.STRIPE_SECRET_KEY) {
      const stripe = createPaymentProvider("stripe", {
        secretKey: platform.env.STRIPE_SECRET_KEY,
      });

      try {
        const stripeAccount = await (stripe as any).getConnectAccount?.(
          account.provider_account_id,
        );

        if (stripeAccount) {
          // Update local status
          const newStatus =
            stripeAccount.chargesEnabled && stripeAccount.payoutsEnabled
              ? "enabled"
              : stripeAccount.detailsSubmitted
                ? "restricted"
                : "pending";

          if (newStatus !== account.status) {
            await platform.env.DB.prepare(
              `UPDATE connect_accounts SET
                  status = ?, charges_enabled = ?, payouts_enabled = ?,
                  details_submitted = ?, updated_at = ?
                 WHERE id = ?`,
            )
              .bind(
                newStatus,
                stripeAccount.chargesEnabled ? 1 : 0,
                stripeAccount.payoutsEnabled ? 1 : 0,
                stripeAccount.detailsSubmitted ? 1 : 0,
                Math.floor(Date.now() / 1000),
                account.id,
              )
              .run();
          }

          return json({
            connected: true,
            account: {
              id: account.id,
              status: newStatus,
              chargesEnabled: stripeAccount.chargesEnabled,
              payoutsEnabled: stripeAccount.payoutsEnabled,
              detailsSubmitted: stripeAccount.detailsSubmitted,
              email: stripeAccount.email,
              country: stripeAccount.country,
              defaultCurrency: stripeAccount.defaultCurrency,
              onboardingComplete: newStatus === "enabled",
            },
          });
        }
      } catch (stripeErr) {
        console.error(
          "Error fetching Stripe account:",
          stripeErr instanceof Error ? stripeErr.message : stripeErr,
        );
      }
    }

    return json({
      connected: true,
      account: {
        id: account.id,
        status: account.status,
        chargesEnabled: account.charges_enabled === 1,
        payoutsEnabled: account.payouts_enabled === 1,
        detailsSubmitted: account.details_submitted === 1,
        email: account.email,
        country: account.country,
        defaultCurrency: account.default_currency,
        onboardingComplete: account.onboarding_complete === 1,
      },
    });
  } catch (err) {
    if (err && typeof err === "object" && "status" in err) throw err;
    console.error("Error fetching Connect account:", err);
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API", { cause: err });
  }
};

/**
 * POST /api/shop/connect - Start Connect onboarding
 *
 * Body:
 * {
 *   returnUrl: string
 *   refreshUrl: string
 *   email?: string
 *   country?: string
 *   businessType?: 'individual' | 'company' | 'non_profit'
 * }
 */
export const POST: RequestHandler = async ({
  request,
  url,
  platform,
  locals,
}) => {
  if (SHOP_DISABLED) {
    throwGroveError(503, API_ERRORS.FEATURE_DISABLED, "API");
  }

  if (!locals.user) {
    throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
  }

  if (!validateCSRF(request)) {
    throwGroveError(403, API_ERRORS.INVALID_ORIGIN, "API");
  }

  if (!platform?.env?.DB) {
    throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
  }

  if (!platform?.env?.STRIPE_SECRET_KEY) {
    throwGroveError(500, API_ERRORS.PAYMENT_PROVIDER_NOT_CONFIGURED, "API");
  }

  const requestedTenantId =
    url.searchParams.get("tenant_id") || locals.tenantId;

  try {
    // Verify user owns this tenant
    const tenantId = await getVerifiedTenantId(
      platform.env.DB,
      requestedTenantId,
      locals.user,
    );

    const data = (await request.json()) as Record<string, unknown>;

    const returnUrl = data.returnUrl as string;
    const refreshUrl = data.refreshUrl as string;
    if (!returnUrl || !refreshUrl) {
      throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "API");
    }

    // Check if account already exists
    const existingAccount = (await platform.env.DB.prepare(
      "SELECT id, provider_account_id FROM connect_accounts WHERE tenant_id = ?",
    )
      .bind(tenantId)
      .first()) as Record<string, unknown> | undefined;

    const stripe = createPaymentProvider("stripe", {
      secretKey: platform.env.STRIPE_SECRET_KEY,
    });

    if (existingAccount) {
      // Create new account link for existing account
      const link = await (stripe as any).createConnectAccountLink?.(
        existingAccount.provider_account_id as string,
        {
          returnUrl,
          refreshUrl,
        },
      );

      return json({
        success: true,
        onboardingUrl: link?.url || "",
        accountId: existingAccount.provider_account_id,
        isNew: false,
      });
    }

    // Create new Connect account
    const result = await (stripe as any).createConnectAccount?.({
      tenantId,
      returnUrl,
      refreshUrl,
      type: "express",
      country: (data.country as string) || "US",
      email: (data.email as string) || locals.user?.email,
      businessType: data.businessType as string | undefined,
    });

    // Store in database
    const accountDbId = crypto.randomUUID();
    await platform.env.DB.prepare(
      `INSERT INTO connect_accounts (
          id, tenant_id, provider_account_id, account_type, status,
          email, country, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        accountDbId,
        tenantId,
        result?.accountId,
        "express",
        "pending",
        (data.email as string) || locals.user?.email || null,
        (data.country as string) || "US",
        Math.floor(Date.now() / 1000),
        Math.floor(Date.now() / 1000),
      )
      .run();

    return json({
      success: true,
      onboardingUrl: result?.onboardingUrl || "",
      accountId: result?.accountId || "",
      isNew: true,
    });
  } catch (err) {
    if (err && typeof err === "object" && "status" in err) throw err;
    console.error("Error creating Connect account:", err);
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API", { cause: err });
  }
};

/**
 * DELETE /api/shop/connect - Disconnect Connect account
 * (This doesn't delete the Stripe account, just removes the link)
 */
export const DELETE: RequestHandler = async ({
  request,
  url,
  platform,
  locals,
}) => {
  if (SHOP_DISABLED) {
    throwGroveError(503, API_ERRORS.FEATURE_DISABLED, "API");
  }

  if (!locals.user) {
    throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
  }

  if (!validateCSRF(request)) {
    throwGroveError(403, API_ERRORS.INVALID_ORIGIN, "API");
  }

  if (!platform?.env?.DB) {
    throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
  }

  const requestedTenantId =
    url.searchParams.get("tenant_id") || locals.tenantId;

  try {
    // Verify user owns this tenant
    const tenantId = await getVerifiedTenantId(
      platform.env.DB,
      requestedTenantId,
      locals.user,
    );

    await platform.env.DB.prepare(
      "DELETE FROM connect_accounts WHERE tenant_id = ?",
    )
      .bind(tenantId)
      .run();

    return json({
      success: true,
      message: "Connect account disconnected",
    });
  } catch (err) {
    if (err && typeof err === "object" && "status" in err) throw err;
    console.error("Error disconnecting Connect account:", err);
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API", { cause: err });
  }
};
