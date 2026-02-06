/**
 * Beta Invite Email
 *
 * Sends a warm invite email when someone is added to the beta.
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
 * Base email wrapper with Grove styling (matches plant email-templates.ts pattern)
 */
function wrapEmail(content: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Grove</title>
</head>
<body style="margin: 0; padding: 0; background-color: #fefdfb; font-family: 'Lexend', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <tr>
      <td align="center" style="padding-bottom: 30px;">
        <!-- Grove Logo -->
        <svg width="48" height="59" viewBox="0 0 417 512.238" xmlns="http://www.w3.org/2000/svg">
          <path fill="#5d4037" d="M171.274 344.942h74.09v167.296h-74.09V344.942z"/>
          <path fill="#22c55e" d="M0 173.468h126.068l-89.622-85.44 49.591-50.985 85.439 87.829V0h74.086v124.872L331 37.243l49.552 50.785-89.58 85.24H417v70.502H290.252l90.183 87.629L331 381.192 208.519 258.11 86.037 381.192l-49.591-49.591 90.218-87.631H0v-70.502z"/>
        </svg>
      </td>
    </tr>
    ${content}
    <tr>
      <td align="center" style="padding-top: 40px;">
        <p style="margin: 0; font-size: 12px; color: rgba(61, 41, 20, 0.4);">
          grove.place
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();
}

/**
 * Capitalize a tier name for display
 */
function displayTier(tier: string): string {
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

/**
 * Escape HTML special characters to prevent XSS in email content.
 * Custom messages from admins are user-input and must be escaped.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Generate the beta invite email content
 */
export function getBetaInviteEmail(params: InviteEmailParams): {
  subject: string;
  html: string;
  text: string;
} {
  const inviteUrl = `https://plant.grove.place/invited?token=${encodeURIComponent(params.inviteToken)}`;
  const isBeta = params.inviteType === "beta";
  const tierName = displayTier(params.tier);

  const subject = isBeta
    ? "You're invited to the Grove beta"
    : "You've been invited to Grove";

  const customMessageHtml = params.customMessage
    ? `
        <div style="padding: 16px; border-radius: 8px; background-color: rgba(245, 242, 234, 0.05); border: 1px solid rgba(245, 242, 234, 0.1); margin: 0 0 24px 0;">
          <p style="margin: 0; font-size: 15px; line-height: 1.6; color: rgba(245, 242, 234, 0.8); font-style: italic;">
            "${escapeHtml(params.customMessage)}"
          </p>
        </div>`
    : "";

  // Text variant: plain text is inherently safe from XSS, but we still
  // escape to establish a consistent pattern and prevent copy-paste risk
  // if this template is ever adapted for HTML contexts.
  const customMessageText = params.customMessage
    ? `\n"${escapeHtml(params.customMessage)}"\n`
    : "";

  const html = wrapEmail(`
    <tr>
      <td style="padding: 30px; background-color: #1e2227; border-radius: 12px;">
        <h1 style="margin: 0 0 16px 0; font-size: 24px; color: #f5f2ea; font-weight: normal;">
          ${isBeta ? "Welcome to the Grove beta" : "You've been invited to Grove"}
        </h1>
        <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: rgba(245, 242, 234, 0.7);">
          ${
            isBeta
              ? "We're building something different — a quiet corner of the internet for your words to grow. No algorithms, no ads, no tracking. And we'd love for you to be one of the first to try it."
              : "Someone believes you deserve your own corner of the internet — a quiet space where your words can grow without algorithms, ads, or tracking."
          }
        </p>
        ${customMessageHtml}
        <p style="margin: 0 0 8px 0; font-size: 16px; line-height: 1.6; color: rgba(245, 242, 234, 0.7);">
          You're getting the <strong style="color: #16a34a;">${tierName}</strong> plan, completely free.
        </p>
        <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: rgba(245, 242, 234, 0.5);">
          ${isBeta ? "As a beta tester, your feedback helps shape what Grove becomes." : ""}
        </p>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding-top: 30px;">
        <a href="${inviteUrl}" style="display: inline-block; padding: 14px 28px; background-color: #16a34a; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 16px;">
          ${isBeta ? "Join the Beta" : "Claim Your Invite"}
        </a>
      </td>
    </tr>
    <tr>
      <td style="padding-top: 24px;">
        <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: rgba(245, 242, 234, 0.5); text-align: center;">
          This link is just for you. Click it whenever you're ready — no rush.
        </p>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding-top: 16px;">
        <p style="margin: 0; font-size: 14px; color: rgba(245, 242, 234, 0.5);">
          See you in the Grove,<br>
          — Autumn
        </p>
      </td>
    </tr>
  `);

  const text = `
${isBeta ? "Welcome to the Grove beta" : "You've been invited to Grove"}

${
  isBeta
    ? "We're building something different -- a quiet corner of the internet for your words to grow. No algorithms, no ads, no tracking. And we'd love for you to be one of the first to try it."
    : "Someone believes you deserve your own corner of the internet -- a quiet space where your words can grow without algorithms, ads, or tracking."
}
${customMessageText}
You're getting the ${tierName} plan, completely free.
${isBeta ? "As a beta tester, your feedback helps shape what Grove becomes." : ""}

Get started here:
${inviteUrl}

This link is just for you. Click it whenever you're ready -- no rush.

See you in the Grove,
-- Autumn
`.trim();

  return { subject, html, text };
}

/**
 * Send the beta invite email via Zephyr
 */
export async function sendInviteEmail(
  params: InviteEmailParams & {
    zephyrApiKey: string;
    zephyrUrl?: string;
  },
): Promise<{ success: boolean; error?: string }> {
  const { zephyrApiKey, zephyrUrl, ...emailParams } = params;

  const email = getBetaInviteEmail(emailParams);

  const zephyr = new ZephyrClient({
    baseUrl: zephyrUrl || DEFAULT_ZEPHYR_URL,
    apiKey: zephyrApiKey,
  });

  const result = await zephyr.sendRaw({
    to: emailParams.email,
    subject: email.subject,
    html: email.html,
    text: email.text,
    type: "transactional",
    idempotencyKey: `beta-invite-${emailParams.inviteToken}`,
  });

  if (!result.success) {
    console.error("[Invite Email] Zephyr error:", result.errorMessage);
    return { success: false, error: result.errorMessage };
  }

  console.log("[Invite Email] Sent to:", emailParams.email);
  return { success: true };
}
