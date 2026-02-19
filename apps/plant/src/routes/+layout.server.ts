import type { LayoutServerLoad } from "./$types";
import { loadChannelMessages } from "@autumnsgrove/lattice/services";
import { PLANT_ERRORS } from "$lib/errors";

export const load: LayoutServerLoad = async ({ cookies, platform }) => {
  // Fail-fast: Check if database binding is configured
  if (!platform?.env?.DB) {
    console.error(
      "[Layout] Database binding missing. Configure in Cloudflare Dashboard > Pages > grove-plant > Settings > Database bindings",
    );
    return {
      user: null,
      onboarding: null,
      messages: [],
      bindingError: "database",
      errorDetails: PLANT_ERRORS.DB_UNAVAILABLE,
    };
  }

  // Check if user has an active onboarding session
  const onboardingId = cookies.get("onboarding_id");
  const accessToken = cookies.get("access_token");

  if (!onboardingId || !accessToken) {
    // Still load messages even for unauthenticated visitors
    const messages = await loadChannelMessages(platform.env.DB, "plant").catch(
      () => [],
    );
    return {
      user: null,
      onboarding: null,
      messages,
    };
  }

  // Fetch onboarding state from database
  const db = platform.env.DB;

  try {
    const result = await db
      .prepare(
        `SELECT
					id,
					groveauth_id,
					email,
					display_name,
					username,
					favorite_color,
					interests,
					profile_completed_at,
					email_verified,
					email_verified_at,
					email_verified_via,
					plan_selected,
					plan_billing_cycle,
					payment_completed_at,
					tenant_id,
					tour_completed_at,
					tour_skipped
				FROM user_onboarding
				WHERE id = ?`,
      )
      .bind(onboardingId)
      .first();

    // Load plant-channel messages (available for all authenticated users)
    const messages = await loadChannelMessages(db, "plant").catch(() => []);

    if (!result) {
      // Invalid onboarding session, clear cookies
      cookies.delete("onboarding_id", { path: "/" });
      return {
        user: null,
        onboarding: null,
        messages,
      };
    }

    // Determine current step (now includes verify-email between profile and plans)
    let step:
      | "auth"
      | "profile"
      | "verify-email"
      | "plans"
      | "checkout"
      | "success"
      | "tour" = "profile";
    if (!result.profile_completed_at) {
      step = "profile";
    } else if (!result.email_verified) {
      step = "verify-email";
    } else if (!result.plan_selected) {
      step = "plans";
    } else if (
      !result.payment_completed_at &&
      result.plan_selected !== "free"
    ) {
      step = "checkout";
    } else if (!result.tenant_id) {
      step = "success";
    } else if (!result.tour_completed_at && !result.tour_skipped) {
      step = "tour";
    } else {
      step = "success";
    }

    return {
      user: {
        id: result.id as string,
        groveauthId: result.groveauth_id as string,
        email: result.email as string,
        displayName: result.display_name as string | null,
        username: result.username as string | null,
      },
      onboarding: {
        id: result.id as string,
        step,
        profileCompleted: !!result.profile_completed_at,
        emailVerified: !!result.email_verified,
        emailVerifiedVia: result.email_verified_via as string | null,
        planSelected: result.plan_selected as string | null,
        billingCycle: result.plan_billing_cycle as string | null,
        paymentCompleted: !!result.payment_completed_at,
        tenantCreated: !!result.tenant_id,
        tenantId: result.tenant_id as string | null,
        favoriteColor: result.favorite_color as string | null,
        interests: result.interests
          ? JSON.parse(result.interests as string)
          : [],
      },
      messages,
    };
  } catch (error) {
    console.error("[Layout] Error loading onboarding state:", error);
    return {
      user: null,
      onboarding: null,
      messages: [],
      loadError: true,
    };
  }
};
