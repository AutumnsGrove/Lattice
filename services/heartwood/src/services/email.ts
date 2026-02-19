/**
 * Email Service - Send emails via Resend API
 */

import type { Env } from "../types.js";
import { RESEND_API_URL, EMAIL_FROM } from "../utils/constants.js";

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface ResendResponse {
  id?: string;
  error?: {
    message: string;
    name: string;
  };
}

/**
 * Send an email via Resend API
 */
export async function sendEmail(
  env: Env,
  options: SendEmailOptions,
): Promise<boolean> {
  try {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      }),
    });

    const data = (await response.json()) as ResendResponse;

    if (!response.ok || data.error) {
      console.error(
        "Resend API error:",
        data.error?.message || "Unknown error",
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error("Failed to send email:", error);
    return false;
  }
}

/**
 * Send magic code email
 */
export async function sendMagicCodeEmail(
  env: Env,
  email: string,
  code: string,
): Promise<boolean> {
  const subject = "Your GroveAuth Login Code";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GroveAuth Login Code</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <tr>
      <td>
        <div style="background-color: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <h1 style="margin: 0 0 24px; font-size: 24px; font-weight: 600; color: #18181b; text-align: center;">
            GroveAuth
          </h1>

          <p style="margin: 0 0 24px; font-size: 16px; color: #3f3f46; line-height: 1.5;">
            Here's your login code. It will expire in 10 minutes.
          </p>

          <div style="background-color: #f4f4f5; border-radius: 8px; padding: 24px; text-align: center; margin: 0 0 24px;">
            <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #18181b; font-family: monospace;">
              ${code}
            </span>
          </div>

          <p style="margin: 0 0 8px; font-size: 14px; color: #71717a; line-height: 1.5;">
            If you didn't request this code, you can safely ignore this email.
          </p>

          <p style="margin: 0; font-size: 14px; color: #71717a; line-height: 1.5;">
            This code is valid for 10 minutes and can only be used once.
          </p>
        </div>

        <p style="margin: 24px 0 0; font-size: 12px; color: #a1a1aa; text-align: center;">
          GroveAuth - Centralized authentication for AutumnsGrove
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `
Your GroveAuth Login Code

Your code is: ${code}

This code will expire in 10 minutes.

If you didn't request this code, you can safely ignore this email.

---
GroveAuth - Centralized authentication for AutumnsGrove
  `.trim();

  return sendEmail(env, {
    to: email,
    subject,
    html,
    text,
  });
}
