/**
 * Email Service - Send auth emails through the Zephyr gateway
 */

import { createZephyrClient } from "@autumnsgrove/lattice/zephyr";
import type { Env } from "../types.js";
import { EMAIL_FROM_ADDRESS, EMAIL_FROM_NAME, EMAIL_OTP_EXPIRES_IN } from "../utils/constants.js";

/**
 * Send the 6-digit sign-in code email.
 *
 * Returns false (and logs) on any delivery failure so the caller can decide
 * how loudly to fail — the code itself is never logged here.
 */
export async function sendLoginCodeEmail(env: Env, email: string, code: string): Promise<boolean> {
	const minutes = Math.round(EMAIL_OTP_EXPIRES_IN / 60);
	const subject = `${code} is your Grove sign-in code`;

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
          Welcome in, Wanderer
        </h1>
        <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: rgba(245, 242, 234, 0.7);">
          Here's your sign-in code. Type it into the page you came from — it's good for ${minutes} minutes.
        </p>
        <div style="background-color: rgba(22, 163, 74, 0.1); border-radius: 8px; padding: 24px; text-align: center; margin: 0 0 24px;">
          <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #15803d; font-family: 'SF Mono', 'Menlo', monospace;">
            ${code}
          </span>
        </div>
        <p style="margin: 0 0 8px 0; font-size: 14px; color: rgba(245, 242, 234, 0.5);">
          If you didn't ask for this, you can safely ignore this email. No one can sign in without the code.
        </p>
        <p style="margin: 0; font-size: 14px; color: rgba(245, 242, 234, 0.5);">
          It works once, and never share it with anyone.
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
Welcome in, Wanderer

Your Grove sign-in code is: ${code}

Type it into the page you came from. It's good for ${minutes} minutes and works once.

If you didn't ask for this, you can safely ignore this email. No one can sign in without the code.

— Grove
  `.trim();

	try {
		const result = await createZephyrClient(env).sendRaw({
			type: "verification",
			to: email,
			subject,
			html,
			text,
			from: EMAIL_FROM_ADDRESS,
			fromName: EMAIL_FROM_NAME,
		});

		if (!result.success) {
			console.error("[LoginCode] Zephyr send failed:", result.errorCode, result.errorMessage);
			return false;
		}
		return true;
	} catch (error) {
		console.error("[LoginCode] Zephyr send threw:", error);
		return false;
	}
}
