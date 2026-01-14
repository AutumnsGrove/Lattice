import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import {
  getVariantId,
  createCheckoutSession,
  type PlanId,
  type BillingCycle,
} from "$lib/server/lemonsqueezy";

export const POST: RequestHandler = async ({ cookies, platform, url }) => {
  const onboardingId = cookies.get("onboarding_id");
  if (!onboardingId) {
    return json(
      { error: "Session expired. Please start over." },
      { status: 401 },
    );
  }

  const db = platform?.env?.DB;
  const lemonSqueezyApiKey = platform?.env?.LEMON_SQUEEZY_API_KEY;
  const lemonSqueezyStoreId = platform?.env?.LEMON_SQUEEZY_STORE_ID;

  // Use configured base URL or fall back to production URL
  // This ensures redirects go to the correct domain (plant.grove.place, not pages.dev)
  const baseUrl = platform?.env?.PUBLIC_APP_URL || "https://plant.grove.place";

  if (!db) {
    console.error("[Checkout] Database not available");
    return json({ error: "Database not configured" }, { status: 503 });
  }

  if (!lemonSqueezyApiKey || !lemonSqueezyStoreId) {
    console.error("[Checkout] Lemon Squeezy not configured");
    return json(
      {
        error:
          "Lemon Squeezy not configured. Please set LEMON_SQUEEZY_API_KEY and LEMON_SQUEEZY_STORE_ID in Cloudflare Dashboard.",
      },
      { status: 503 },
    );
  }

  try {
    // Get onboarding data
    const onboarding = await db
      .prepare(
        `SELECT id, email, username, plan_selected, plan_billing_cycle
				 FROM user_onboarding WHERE id = ?`,
      )
      .bind(onboardingId)
      .first();

    if (!onboarding) {
      return json(
        { error: "Session not found. Please start over." },
        { status: 404 },
      );
    }

    const plan = onboarding.plan_selected as PlanId;
    const billingCycle = (onboarding.plan_billing_cycle ||
      "monthly") as BillingCycle;

    // Get variant ID from environment or config
    // Extract only the string env vars needed for variant lookup
    const envStrings: Record<string, string> = {
      LEMON_SQUEEZY_SEEDLING_VARIANT_MONTHLY:
        platform?.env?.LEMON_SQUEEZY_SEEDLING_VARIANT_MONTHLY ?? "",
      LEMON_SQUEEZY_SEEDLING_VARIANT_YEARLY:
        platform?.env?.LEMON_SQUEEZY_SEEDLING_VARIANT_YEARLY ?? "",
      LEMON_SQUEEZY_SAPLING_VARIANT_MONTHLY:
        platform?.env?.LEMON_SQUEEZY_SAPLING_VARIANT_MONTHLY ?? "",
      LEMON_SQUEEZY_SAPLING_VARIANT_YEARLY:
        platform?.env?.LEMON_SQUEEZY_SAPLING_VARIANT_YEARLY ?? "",
      LEMON_SQUEEZY_OAK_VARIANT_MONTHLY:
        platform?.env?.LEMON_SQUEEZY_OAK_VARIANT_MONTHLY ?? "",
      LEMON_SQUEEZY_OAK_VARIANT_YEARLY:
        platform?.env?.LEMON_SQUEEZY_OAK_VARIANT_YEARLY ?? "",
      LEMON_SQUEEZY_EVERGREEN_VARIANT_MONTHLY:
        platform?.env?.LEMON_SQUEEZY_EVERGREEN_VARIANT_MONTHLY ?? "",
      LEMON_SQUEEZY_EVERGREEN_VARIANT_YEARLY:
        platform?.env?.LEMON_SQUEEZY_EVERGREEN_VARIANT_YEARLY ?? "",
    };
    const variantId = getVariantId(plan, billingCycle, envStrings);

    if (!variantId || variantId === 0) {
      console.error(
        "[Checkout] Invalid variant ID for plan:",
        plan,
        billingCycle,
      );
      return json(
        {
          error: `Lemon Squeezy variant not configured for ${plan} ${billingCycle}. Please set LEMON_SQUEEZY_${plan.toUpperCase()}_VARIANT_${billingCycle.toUpperCase()} in Cloudflare Dashboard.`,
        },
        { status: 503 },
      );
    }

    // Create Lemon Squeezy checkout session
    const session = await createCheckoutSession({
      lemonSqueezyApiKey,
      lemonSqueezyStoreId,
      variantId,
      customerEmail: onboarding.email as string,
      onboardingId: onboarding.id as string,
      username: onboarding.username as string,
      plan,
      billingCycle,
      successUrl: `${baseUrl}/success?checkout_id={CHECKOUT_ID}`,
      cancelUrl: `${baseUrl}/plans`,
    });

    // Store the checkout ID
    await db
      .prepare(
        `UPDATE user_onboarding
				 SET lemonsqueezy_checkout_id = ?, updated_at = unixepoch()
				 WHERE id = ?`,
      )
      .bind(session.checkoutId, onboardingId)
      .run();

    return json({ url: session.url });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("[Checkout] Error creating session:", errorMessage, err);
    return json({ error: `Checkout failed: ${errorMessage}` }, { status: 500 });
  }
};
