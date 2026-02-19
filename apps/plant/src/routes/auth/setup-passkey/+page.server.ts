/**
 * Passkey Setup Page - Server
 *
 * Redirects to login.grove.place/passkey for same-origin WebAuthn ceremony.
 * The passkey registration must happen on login.grove.place because:
 * 1. WebAuthn origin must match the passkey config (login.grove.place)
 * 2. Challenge cookies need to be same-origin
 * 3. better-auth's client library handles the ceremony properly
 */

import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ parent }) => {
  const { user, onboarding } = await parent();

  // Must be authenticated
  if (!user || !onboarding) {
    redirect(302, "/");
  }

  // If user already completed onboarding, skip to their next step
  if (onboarding.tenantCreated) {
    redirect(302, "/plans");
  }

  // Redirect to login.grove.place for passkey creation
  // After creation (or skip), user returns to /profile on Plant
  redirect(
    302,
    `https://login.grove.place/passkey?redirect=${encodeURIComponent("https://plant.grove.place/profile")}`,
  );
};
