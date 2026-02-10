/**
 * API: Select Plan
 *
 * POST /api/select-plan
 *
 * JSON API endpoint for plan selection during onboarding.
 * Mirrors the form action from /plans but returns JSON for client-side navigation.
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import {
  transformAllTiers,
  type PricingTier,
} from "@autumnsgrove/groveengine/grafts/pricing";
import { type TierKey, isValidTier } from "@autumnsgrove/groveengine/config";
import { PLANT_ERRORS, logPlantError } from "$lib/errors";
import { createTenant, getTenantForOnboarding } from "$lib/server/tenant";
import {
  checkFreeAccountIPLimit,
  logFreeAccountCreation,
} from "$lib/server/free-account-limits";
import { shouldSkipCheckout } from "$lib/server/onboarding-helper";

// Valid billing cycles for database storage
const VALID_BILLING_CYCLES = ["monthly", "yearly"] as const;
type BillingCycle = (typeof VALID_BILLING_CYCLES)[number];

// Transform all tiers including free (Wanderer)
const tiers = transformAllTiers();

function isValidPlanId(id: string): id is TierKey {
  return isValidTier(id);
}

function isPlanAvailable(id: string): boolean {
  const tier = tiers.find((t: PricingTier) => t.key === id);
  return tier?.status === "available";
}

function getTierByKey(id: string): PricingTier | undefined {
  return tiers.find((t: PricingTier) => t.key === id);
}

export const POST: RequestHandler = async ({
  request,
  cookies,
  platform,
  getClientAddress,
}) => {
  let body: {
    plan?: string;
    billingCycle?: string;
  };

  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request" }, { status: 400 });
  }

  const plan = body.plan?.trim();
  const billingCycle = body.billingCycle || "monthly";

  // Validate plan
  if (!plan || !isValidPlanId(plan)) {
    return json({ error: "Please select a valid plan" }, { status: 400 });
  }

  // Check plan availability
  if (!isPlanAvailable(plan)) {
    const selectedTier = getTierByKey(plan);
    const statusMessage =
      selectedTier?.status === "coming_soon"
        ? "This plan is coming soon and not yet available."
        : "This plan is not currently available.";
    return json({ error: statusMessage }, { status: 400 });
  }

  if (!VALID_BILLING_CYCLES.includes(billingCycle as BillingCycle)) {
    return json({ error: "Invalid billing cycle" }, { status: 400 });
  }

  // Get onboarding ID from cookie
  const onboardingId = cookies.get("onboarding_id");
  if (!onboardingId) {
    logPlantError(PLANT_ERRORS.COOKIE_ERROR, {
      path: "/api/select-plan",
      detail: "Missing onboarding_id cookie",
    });
    return json(
      { error: "Session expired. Please sign in again." },
      { status: 401 },
    );
  }

  const db = platform?.env?.DB;
  if (!db) {
    logPlantError(PLANT_ERRORS.DB_UNAVAILABLE, { path: "/api/select-plan" });
    return json({ error: "Service temporarily unavailable" }, { status: 503 });
  }

  // Validate onboarding steps are complete before allowing plan selection
  try {
    const onboarding = await db
      .prepare(
        `SELECT profile_completed_at, email_verified
         FROM user_onboarding WHERE id = ?`,
      )
      .bind(onboardingId)
      .first<{
        profile_completed_at: number | null;
        email_verified: number | null;
      }>();

    if (!onboarding) {
      return json(
        { error: "Onboarding session not found. Please sign in again." },
        { status: 404 },
      );
    }

    if (!onboarding.profile_completed_at) {
      return json(
        { error: "Please complete your profile before selecting a plan." },
        { status: 400 },
      );
    }

    if (!onboarding.email_verified) {
      return json(
        { error: "Please verify your email before selecting a plan." },
        { status: 400 },
      );
    }
  } catch (err) {
    logPlantError(PLANT_ERRORS.DB_UNAVAILABLE, {
      path: "/api/select-plan",
      detail: "Failed to validate onboarding status",
      cause: err,
    });
    return json(
      { error: "Unable to validate onboarding status. Please try again." },
      { status: 500 },
    );
  }

  // Update onboarding record with selected plan
  try {
    await db
      .prepare(
        `UPDATE user_onboarding
         SET plan_selected = ?,
             plan_billing_cycle = ?,
             plan_selected_at = unixepoch(),
             updated_at = unixepoch()
         WHERE id = ?`,
      )
      .bind(plan, billingCycle, onboardingId)
      .run();
  } catch (err) {
    logPlantError(PLANT_ERRORS.ONBOARDING_UPDATE_FAILED, {
      path: "/api/select-plan",
      detail: `UPDATE user_onboarding plan for id=${onboardingId}`,
      cause: err,
    });
    return json(
      { error: "Unable to save selection. Please try again." },
      { status: 500 },
    );
  }

  console.log(
    `[Select Plan API] Saved plan=${plan} cycle=${billingCycle} for ${onboardingId.slice(0, 8)}...`,
  );

  // Free plan (Wanderer) skips checkout — create tenant directly
  if (shouldSkipCheckout(plan)) {
    // Resolve client IP once for both rate-check and logging
    let clientIP: string | undefined;
    try {
      clientIP =
        request.headers.get("CF-Connecting-IP") ||
        request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
        getClientAddress();
    } catch {
      // Best-effort — IP resolution is non-critical
    }

    // IP-based abuse prevention: max 3 free accounts per IP per 30 days
    // Check BEFORE updating payment status to prevent write-then-reject
    if (clientIP) {
      const ipAllowed = await checkFreeAccountIPLimit(db, clientIP).catch(
        () => true,
      );
      if (!ipAllowed) {
        return json(
          {
            error:
              "Too many free accounts have been created from this location recently. Please try again later.",
          },
          { status: 429 },
        );
      }

      // Log IP immediately after check passes to close the TOCTOU window.
      // Must happen before any other async work so concurrent requests
      // see the updated count.
      await logFreeAccountCreation(db, clientIP).catch(() => {});
    }

    await db
      .prepare(
        `UPDATE user_onboarding
         SET payment_completed = 1,
             payment_completed_at = unixepoch(),
             updated_at = unixepoch()
         WHERE id = ?`,
      )
      .bind(onboardingId)
      .run();

    try {
      // Check for existing tenant (idempotency)
      const existing = await getTenantForOnboarding(db, onboardingId);
      if (!existing) {
        const onboarding = await db
          .prepare(
            `SELECT username, display_name, email, favorite_color
             FROM user_onboarding WHERE id = ?`,
          )
          .bind(onboardingId)
          .first<{
            username: string;
            display_name: string;
            email: string;
            favorite_color: string | null;
          }>();

        if (!onboarding) {
          return json(
            { error: "Onboarding session not found." },
            { status: 404 },
          );
        }

        // Create the tenant immediately (no webhook needed)
        await createTenant(db, {
          onboardingId,
          username: onboarding.username,
          displayName: onboarding.display_name,
          email: onboarding.email,
          plan: "free",
          favoriteColor: onboarding.favorite_color,
        });

        console.log(
          `[Select Plan API] Created free tier tenant for ${onboarding.username}`,
        );
      }
    } catch (err) {
      logPlantError(PLANT_ERRORS.ONBOARDING_UPDATE_FAILED, {
        path: "/api/select-plan",
        detail: `Free plan tenant creation for id=${onboardingId}`,
        cause: err,
      });
      return json(
        { error: "Unable to complete signup. Please try again." },
        { status: 500 },
      );
    }

    return json({ success: true, redirect: "/success" });
  }

  return json({ success: true, redirect: "/checkout" });
};
