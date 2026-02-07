/**
 * Beta Invite Email
 *
 * Sends a warm invite email when someone is added to the beta.
 * Uses the BetaInviteEmail React Email template via Zephyr → email-render worker.
 * The email includes a unique link to plant.grove.place/invited
 * with their token pre-attached, so their email is pre-filled.
 */

import { ZephyrClient } from "@autumnsgrove/groveengine/zephyr";

const DEFAULT_ZEPHYR_URL = "https://grove-zephyr.m7jv4v7npb.workers.dev";

interface InviteEmailParams {
  email: string;
  tier: string;
  inviteType: "comped" | "beta";
  customMessage: string | null;
  inviteToken: string;
  invitedBy: string;
}

/**
 * Email content by invite type — used for preview and subject lines
 */
export const INVITE_EMAIL_CONTENT = {
  beta: {
    subject: "You're invited to the Grove beta",
    heading: "You're invited to the beta",
    intro:
      "We're building something different — a quiet corner of the internet where your words actually belong to you. No algorithms, no ads, no tracking.",
    middle: "We'd love for you to be one of the first to try it.",
    feedback:
      "As a beta tester, your feedback helps shape what Grove becomes. Every rough edge you find makes this place better for everyone who comes after.",
    cta: "Join the Beta",
  },
  comped: {
    subject: "You've been invited to Grove",
    heading: "You've been invited",
    intro:
      "Someone believes you deserve your own corner of the internet — a quiet space where your words can grow without algorithms, ads, or tracking.",
    middle: "Your space is waiting whenever you're ready.",
    feedback: null,
    cta: "Claim Your Invite",
  },
} as const;

/**
 * Get subject line for an invite email
 */
export function getInviteSubject(inviteType: "beta" | "comped"): string {
  return INVITE_EMAIL_CONTENT[inviteType].subject;
}

/**
 * Send the beta invite email via Zephyr using the BetaInviteEmail template
 */
export async function sendInviteEmail(
  params: InviteEmailParams & {
    zephyrApiKey: string;
    zephyrUrl?: string;
  },
): Promise<{ success: boolean; error?: string }> {
  const { zephyrApiKey, zephyrUrl, ...emailParams } = params;

  const inviteUrl = `https://plant.grove.place/invited?token=${encodeURIComponent(emailParams.inviteToken)}`;
  const content =
    INVITE_EMAIL_CONTENT[emailParams.inviteType] || INVITE_EMAIL_CONTENT.beta;

  const zephyr = new ZephyrClient({
    baseUrl: zephyrUrl || DEFAULT_ZEPHYR_URL,
    apiKey: zephyrApiKey,
  });

  const result = await zephyr.send({
    type: "transactional",
    template: "BetaInviteEmail",
    to: emailParams.email,
    subject: content.subject,
    data: {
      tier: emailParams.tier,
      inviteType: emailParams.inviteType,
      customMessage: emailParams.customMessage || undefined,
      inviteUrl,
      subject: content.subject,
    },
    idempotencyKey: `beta-invite-${emailParams.inviteToken}`,
    source: "landing-admin",
  });

  if (!result.success) {
    console.error("[Invite Email] Zephyr error:", result.errorMessage);
    return { success: false, error: result.errorMessage };
  }

  console.log(
    "[Invite Email] Sent to:",
    emailParams.email?.replace(/(.{2}).*(@.*)/, "$1***$2") ?? "unknown",
  );
  return { success: true };
}
