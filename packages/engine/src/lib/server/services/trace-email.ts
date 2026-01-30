/**
 * Trace Email Notification Service
 *
 * Sends email notifications when feedback is submitted via Trace.
 * Uses Resend API with Grove's warm, friendly tone.
 */

import { Resend } from "resend";

export interface TraceNotification {
  sourcePath: string;
  vote: "up" | "down";
  comment?: string;
  id: string;
}

/**
 * Send email notification for new trace feedback.
 *
 * @param apiKey - Resend API key
 * @param adminEmail - Email address to notify
 * @param trace - Trace feedback data
 * @returns Success status and optional error
 */
export async function sendTraceNotification(
  apiKey: string,
  adminEmail: string,
  trace: TraceNotification,
): Promise<{ success: boolean; error?: string }> {
  const resend = new Resend(apiKey);

  const emoji = trace.vote === "up" ? "👍" : "👎";
  const voteText = trace.vote === "up" ? "positive" : "negative";

  try {
    const { error } = await resend.emails.send({
      from: "Grove <hello@grove.place>",
      to: adminEmail,
      subject: `[Trace] ${emoji} ${trace.sourcePath}`,
      html: buildHtmlEmail(trace, emoji, voteText),
      text: buildTextEmail(trace, emoji, voteText),
    });

    if (error) {
      console.error("[Trace Email] Resend error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("[Trace Email] Exception:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to send email",
    };
  }
}

function buildHtmlEmail(
  trace: TraceNotification,
  emoji: string,
  voteText: string,
): string {
  const commentSection = trace.comment
    ? `
      <div style="margin-top: 16px; padding: 16px; background-color: #f5f0e6; border-radius: 8px; border-left: 4px solid #4a5d23;">
        <p style="margin: 0; color: #1a1a1a; font-style: italic;">"${escapeHtml(trace.comment)}"</p>
      </div>
    `
    : "";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #faf8f5; color: #1a1a1a;">
  <div style="max-width: 580px; margin: 0 auto; padding: 40px 20px;">
    <div style="background-color: #ffffff; border-radius: 16px; padding: 32px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);">

      <!-- Header -->
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="font-size: 48px;">${emoji}</span>
        <h1 style="margin: 12px 0 0 0; font-size: 24px; color: #4a5d23;">Someone left a trace</h1>
      </div>

      <!-- Details -->
      <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
        <tr>
          <td style="padding: 8px 0; color: #666; width: 100px;">Location</td>
          <td style="padding: 8px 0; font-family: monospace; color: #1a1a1a;">${escapeHtml(trace.sourcePath)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Feedback</td>
          <td style="padding: 8px 0; color: #1a1a1a; text-transform: capitalize;">${voteText}</td>
        </tr>
      </table>

      ${commentSection}

      <!-- Footer -->
      <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e8e4dc; text-align: center;">
        <a href="https://grove.place/admin/traces" style="display: inline-block; padding: 12px 24px; background-color: #4a5d23; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 500;">View all traces</a>
      </div>

    </div>

    <p style="text-align: center; margin-top: 24px; color: #888; font-size: 12px;">
      You're receiving this because someone left feedback on Grove.
    </p>
  </div>
</body>
</html>
  `.trim();
}

function buildTextEmail(
  trace: TraceNotification,
  emoji: string,
  voteText: string,
): string {
  let text = `${emoji} Someone left a trace\n\n`;
  text += `Location: ${trace.sourcePath}\n`;
  text += `Feedback: ${voteText}\n`;

  if (trace.comment) {
    text += `\nComment:\n"${trace.comment}"\n`;
  }

  text += `\n---\nView all traces: https://grove.place/admin/traces`;

  return text;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
