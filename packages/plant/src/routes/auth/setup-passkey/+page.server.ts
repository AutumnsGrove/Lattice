/**
 * Passkey Setup Page - Server
 *
 * Ensures user is authenticated before showing passkey setup.
 */

import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ parent, cookies }) => {
  const { user, onboarding } = await parent();

  // Must be authenticated
  if (!user || !onboarding) {
    redirect(302, "/");
  }

  // If user already completed onboarding, skip to their next step
  if (onboarding.tenantCreated) {
    redirect(302, "/plans");
  }

  return {
    user,
    email: user.email,
  };
};
