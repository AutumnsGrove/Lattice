import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { shouldSkipCheckout } from "$lib/server/onboarding-helper";

export const load: PageServerLoad = async ({ parent }) => {
  const { user, onboarding } = await parent();

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

  // Free plan (Wanderer) doesn't need checkout — redirect to success
  if (shouldSkipCheckout(onboarding?.planSelected)) {
    redirect(302, "/success");
  }

  // Redirect if already paid
  if (onboarding?.paymentCompleted) {
    redirect(302, "/success");
  }

  return {
    user,
    onboarding,
  };
};
