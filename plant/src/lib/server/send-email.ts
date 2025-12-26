/**
 * Email Sending Utility
 *
 * Uses Resend API to send transactional emails.
 */

import { Resend } from "resend";

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
  resendApiKey: string;
}): Promise<{ success: boolean; error?: string }> {
  const resend = new Resend(params.resendApiKey);

  try {
    const { error } = await resend.emails.send({
      from: "Grove <hello@grove.place>",
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });

    if (error) {
      console.error("[Resend] Error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("[Resend] Exception:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to send email",
    };
  }
}
