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
export async function sendEmail(env: Env, options: SendEmailOptions): Promise<boolean> {
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
			console.error("Resend API error:", data.error?.message || "Unknown error");
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
export async function sendMagicCodeEmail(env: Env, email: string, code: string): Promise<boolean> {
	const subject = "Your Grove login code";

	const html = `
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
        <img src="https://cdn.grove.place/email/logo.png" width="48" height="48" alt="Grove" style="display: inline-block; border-radius: 50%;" />
      </td>
    </tr>
    <tr>
      <td style="padding: 30px; background-color: #1e2227; border-radius: 12px;">
        <h1 style="margin: 0 0 16px 0; font-size: 24px; color: #f5f2ea; font-weight: normal;">
          Grove
        </h1>
        <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: rgba(245, 242, 234, 0.7);">
          Here's your login code. It will expire in 10 minutes.
        </p>
        <div style="background-color: rgba(22, 163, 74, 0.1); border-radius: 8px; padding: 24px; text-align: center; margin: 0 0 24px;">
          <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #15803d; font-family: 'SF Mono', 'Menlo', monospace;">
            ${code}
          </span>
        </div>
        <p style="margin: 0 0 8px 0; font-size: 14px; color: rgba(245, 242, 234, 0.5);">
          If you didn't request this code, you can safely ignore this email.
        </p>
        <p style="margin: 0; font-size: 14px; color: rgba(245, 242, 234, 0.5);">
          This code is valid for 10 minutes and can only be used once.
        </p>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding-top: 30px;">
        <p style="margin: 0; font-size: 12px; color: rgba(61, 41, 20, 0.4);">
          grove.place
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

	const text = `
Your Grove Login Code

Your code is: ${code}

This code will expire in 10 minutes.

If you didn't request this code, you can safely ignore this email.

— Grove
  `.trim();

	return sendEmail(env, {
		to: email,
		subject,
		html,
		text,
	});
}
