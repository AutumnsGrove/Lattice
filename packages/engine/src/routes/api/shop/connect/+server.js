import { json, error } from "@sveltejs/kit";
import { validateCSRF } from "$lib/utils/csrf.js";
import { createPaymentProvider } from "$lib/payments/index.js";

/**
 * GET /api/shop/connect - Get Connect account status
 */
export async function GET({ url, platform, locals }) {
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }

  if (!platform?.env?.POSTS_DB) {
    throw error(500, "Database not configured");
  }

  const tenantId = url.searchParams.get("tenant_id") || locals.tenant?.id;
  if (!tenantId) {
    throw error(400, "Tenant ID required");
  }

  try {
    // Get Connect account from database
    const account = await platform.env.POSTS_DB
      .prepare(
        `SELECT id, provider_account_id, account_type, status, charges_enabled,
                payouts_enabled, details_submitted, email, country, default_currency,
                onboarding_complete, created_at, updated_at
         FROM connect_accounts WHERE tenant_id = ?`
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
        const stripeAccount = await stripe.getConnectAccount(account.provider_account_id);

        if (stripeAccount) {
          // Update local status
          const newStatus = stripeAccount.chargesEnabled && stripeAccount.payoutsEnabled
            ? "enabled"
            : stripeAccount.detailsSubmitted
            ? "restricted"
            : "pending";

          if (newStatus !== account.status) {
            await platform.env.POSTS_DB
              .prepare(
                `UPDATE connect_accounts SET
                  status = ?, charges_enabled = ?, payouts_enabled = ?,
                  details_submitted = ?, updated_at = ?
                 WHERE id = ?`
              )
              .bind(
                newStatus,
                stripeAccount.chargesEnabled ? 1 : 0,
                stripeAccount.payoutsEnabled ? 1 : 0,
                stripeAccount.detailsSubmitted ? 1 : 0,
                Math.floor(Date.now() / 1000),
                account.id
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
        console.error("Error fetching Stripe account:", stripeErr);
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
    if (err.status) throw err;
    console.error("Error fetching Connect account:", err);
    throw error(500, "Failed to fetch Connect account");
  }
}

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
export async function POST({ request, url, platform, locals }) {
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }

  if (!validateCSRF(request)) {
    throw error(403, "Invalid origin");
  }

  if (!platform?.env?.POSTS_DB) {
    throw error(500, "Database not configured");
  }

  if (!platform?.env?.STRIPE_SECRET_KEY) {
    throw error(500, "Payment provider not configured");
  }

  const tenantId = url.searchParams.get("tenant_id") || locals.tenant?.id;
  if (!tenantId) {
    throw error(400, "Tenant ID required");
  }

  try {
    const data = await request.json();

    if (!data.returnUrl || !data.refreshUrl) {
      throw error(400, "Return URL and refresh URL are required");
    }

    // Check if account already exists
    const existingAccount = await platform.env.POSTS_DB
      .prepare("SELECT id, provider_account_id FROM connect_accounts WHERE tenant_id = ?")
      .bind(tenantId)
      .first();

    const stripe = createPaymentProvider("stripe", {
      secretKey: platform.env.STRIPE_SECRET_KEY,
    });

    if (existingAccount) {
      // Create new account link for existing account
      const link = await stripe.createConnectAccountLink(
        existingAccount.provider_account_id,
        {
          returnUrl: data.returnUrl,
          refreshUrl: data.refreshUrl,
        }
      );

      return json({
        success: true,
        onboardingUrl: link.url,
        accountId: existingAccount.provider_account_id,
        isNew: false,
      });
    }

    // Create new Connect account
    const result = await stripe.createConnectAccount({
      tenantId,
      returnUrl: data.returnUrl,
      refreshUrl: data.refreshUrl,
      type: "express",
      country: data.country || "US",
      email: data.email || locals.user.email,
      businessType: data.businessType,
    });

    // Store in database
    const accountDbId = crypto.randomUUID();
    await platform.env.POSTS_DB
      .prepare(
        `INSERT INTO connect_accounts (
          id, tenant_id, provider_account_id, account_type, status,
          email, country, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        accountDbId,
        tenantId,
        result.accountId,
        "express",
        "pending",
        data.email || locals.user.email || null,
        data.country || "US",
        Math.floor(Date.now() / 1000),
        Math.floor(Date.now() / 1000)
      )
      .run();

    return json({
      success: true,
      onboardingUrl: result.onboardingUrl,
      accountId: result.accountId,
      isNew: true,
    });
  } catch (err) {
    if (err.status) throw err;
    console.error("Error creating Connect account:", err);
    throw error(500, "Failed to create Connect account");
  }
}

/**
 * DELETE /api/shop/connect - Disconnect Connect account
 * (This doesn't delete the Stripe account, just removes the link)
 */
export async function DELETE({ request, url, platform, locals }) {
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }

  if (!validateCSRF(request)) {
    throw error(403, "Invalid origin");
  }

  if (!platform?.env?.POSTS_DB) {
    throw error(500, "Database not configured");
  }

  const tenantId = url.searchParams.get("tenant_id") || locals.tenant?.id;
  if (!tenantId) {
    throw error(400, "Tenant ID required");
  }

  try {
    await platform.env.POSTS_DB
      .prepare("DELETE FROM connect_accounts WHERE tenant_id = ?")
      .bind(tenantId)
      .run();

    return json({
      success: true,
      message: "Connect account disconnected",
    });
  } catch (err) {
    if (err.status) throw err;
    console.error("Error disconnecting Connect account:", err);
    throw error(500, "Failed to disconnect Connect account");
  }
}
