import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import {
  getPriceId,
  createCheckoutSession,
  type PlanId,
  type BillingCycle,
} from "$lib/server/stripe";

export const POST: RequestHandler = async ({ cookies, platform, url }) => {
  const onboardingId = cookies.get("onboarding_id");
  if (!onboardingId) {
    return json(
      { error: "Session expired. Please start over." },
      { status: 401 },
    );
  }

  const db = platform?.env?.DB;
  const stripeSecretKey = platform?.env?.STRIPE_SECRET_KEY;

  // Use configured base URL or fall back to production URL
  // This ensures redirects go to the correct domain (plant.grove.place, not pages.dev)
  const baseUrl = platform?.env?.PUBLIC_APP_URL || "https://plant.grove.place";

  if (!db) {
    console.error("[Checkout] Database not available");
    return json({ error: "Database not configured" }, { status: 503 });
  }

  if (!stripeSecretKey) {
    console.error("[Checkout] Stripe not configured");
    return json(
      {
        error:
          "Stripe not configured. Please set STRIPE_SECRET_KEY in Cloudflare Dashboard.",
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

    // Get price ID from hardcoded config
    let priceId: string;
    try {
      priceId = getPriceId(plan, billingCycle);
    } catch (error) {
      console.error("[Checkout] Price ID not configured:", error);
      return json(
        {
          error: `Price not configured for ${plan} ${billingCycle}. Check stripe.ts configuration.`,
        },
        { status: 503 },
      );
    }

    // Create Stripe Checkout session
    const session = await createCheckoutSession({
      stripeSecretKey,
      priceId,
      customerEmail: onboarding.email as string,
      onboardingId: onboarding.id as string,
      username: onboarding.username as string,
      plan,
      billingCycle,
      // Stripe uses {CHECKOUT_SESSION_ID} placeholder
      successUrl: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${baseUrl}/plans`,
    });

    // Store the checkout session ID
    await db
      .prepare(
        `UPDATE user_onboarding
         SET stripe_checkout_session_id = ?, updated_at = unixepoch()
         WHERE id = ?`,
      )
      .bind(session.sessionId, onboardingId)
      .run();

    return json({ url: session.url });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("[Checkout] Error creating session:", errorMessage, err);
    return json({ error: `Checkout failed: ${errorMessage}` }, { status: 500 });
  }
};
