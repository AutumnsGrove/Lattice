import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { getTenantForOnboarding } from "$lib/server/tenant";

/**
 * Success Page Server Load
 *
 * This page handles the redirect after Lemon Squeezy checkout completion.
 * The actual tenant creation happens in the webhook handler - this page
 * just verifies the user's state and waits for the tenant to be ready.
 *
 * URL params:
 * - checkout_id: Lemon Squeezy checkout ID (from LS redirect)
 */
export const load: PageServerLoad = async ({
  url,
  cookies,
  platform,
  parent,
}) => {
  const { user, onboarding } = await parent();

  // Get checkout_id from URL (Lemon Squeezy redirect)
  const checkoutId = url.searchParams.get("checkout_id");
  const db = platform?.env?.DB;

  // If coming from Lemon Squeezy with checkout_id but not authenticated,
  // try to find and redirect to the tenant
  if (checkoutId && db && !user) {
    try {
      // Look up onboarding by checkout ID
      const onboardingRecord = await db
        .prepare(
          `SELECT id FROM user_onboarding WHERE lemonsqueezy_checkout_id = ?`,
        )
        .bind(checkoutId)
        .first();

      if (onboardingRecord) {
        // Check if tenant was created by webhook
        const tenant = await getTenantForOnboarding(
          db,
          onboardingRecord.id as string,
        );

        if (tenant) {
          // Redirect directly to admin panel
          redirect(
            302,
            `https://${tenant.subdomain}.grove.place/admin?welcome=true`,
          );
        }
      }
    } catch (error) {
      console.error(
        "[Success] Error handling unauthenticated checkout redirect:",
        error,
      );
      // Fall through to normal flow
    }
  }

  // Redirect if not authenticated
  if (!user) {
    redirect(302, "/");
  }

  // Redirect if profile not completed
  if (!onboarding?.profileCompleted) {
    redirect(302, "/profile");
  }

  // Redirect if no plan selected
  if (!onboarding?.planSelected) {
    redirect(302, "/plans");
  }

  // If we have a checkout_id, update the onboarding record
  // (The webhook handles the actual tenant creation)
  if (checkoutId && db && !onboarding?.paymentCompleted) {
    const onboardingId = cookies.get("onboarding_id");

    if (onboardingId) {
      try {
        // Just mark that we received the checkout redirect
        // The webhook will handle the rest
        await db
          .prepare(
            `UPDATE user_onboarding
             SET lemonsqueezy_checkout_id = ?,
                 updated_at = unixepoch()
             WHERE id = ? AND lemonsqueezy_checkout_id IS NULL`,
          )
          .bind(checkoutId, onboardingId)
          .run();
      } catch (error) {
        console.error("[Success] Error updating checkout ID:", error);
      }
    }
  }

  return {
    user,
    onboarding,
  };
};
