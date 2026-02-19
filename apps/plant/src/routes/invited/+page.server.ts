/**
 * Invited Landing Page Server
 *
 * Handles the /invited?token=... route where beta invitees land
 * after clicking the link in their invite email. Looks up the
 * invite by token and returns the invitee's email so the
 * sign-in form can be pre-filled.
 */

import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

interface InviteData {
  email: string;
  tier: string;
  invite_type: "comped" | "beta";
  custom_message: string | null;
}

export const load: PageServerLoad = async ({ url, platform, parent }) => {
  const token = url.searchParams.get("token");

  // No token — redirect to main plant page
  if (!token) {
    redirect(302, "/");
  }

  const db = platform?.env?.DB;
  if (!db) {
    redirect(302, "/");
  }

  // Look up the invite by token
  const invite = await db
    .prepare(
      `SELECT email, tier, invite_type, custom_message
       FROM comped_invites
       WHERE invite_token = ? AND used_at IS NULL`,
    )
    .bind(token)
    .first<InviteData>();

  if (!invite) {
    // Token invalid or invite already used — show the regular page
    redirect(302, "/?notice=invite_expired");
  }

  // Check if user is already authenticated
  const { user, onboarding } = await parent();

  // If already authenticated and it's this user, send them forward
  if (user && user.email.toLowerCase() === invite.email.toLowerCase()) {
    if (!onboarding?.profileCompleted) {
      redirect(302, "/profile");
    }
    if (!onboarding?.emailVerified) {
      redirect(302, "/verify-email");
    }
    redirect(302, "/plans");
  }

  return {
    inviteEmail: invite.email,
    inviteTier: invite.tier,
    inviteType: invite.invite_type,
    customMessage: invite.custom_message,
    token,
    expired: url.searchParams.get("expired") === "true",
    errorCode: url.searchParams.get("errorCode") || null,
  };
};
