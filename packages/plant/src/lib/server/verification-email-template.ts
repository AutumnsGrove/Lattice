/**
 * Email Verification Template
 *
 * Template for the verification code email sent during onboarding.
 * Matches Grove's warm, friendly voice and visual style.
 */

interface VerificationEmailParams {
  name: string;
  code: string;
  expiryMinutes: number;
}

/**
 * Base email wrapper with Grove styling (matches existing templates)
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
 * Generate the verification email content
 */
export function getVerificationEmail(params: VerificationEmailParams): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `${params.code} is your Grove verification code`;

  // Split code into individual digits for visual display
  const codeDigits = params.code.split("");
  const codeBoxes = codeDigits
    .map(
      (digit) =>
        `<td style="width: 40px; height: 48px; background-color: rgba(22, 163, 74, 0.1); border-radius: 8px; text-align: center; font-size: 24px; font-weight: 600; color: #15803d; font-family: 'SF Mono', 'Menlo', monospace;">${digit}</td>`,
    )
    .join('<td style="width: 8px;"></td>');

  const html = wrapEmail(`
    <tr>
      <td style="padding: 30px; background-color: #1e2227; border-radius: 12px;">
        <h1 style="margin: 0 0 16px 0; font-size: 24px; color: #f5f2ea; font-weight: normal;">
          Verify your email, ${params.name}
        </h1>
        <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: rgba(245, 242, 234, 0.7);">
          Enter this code to verify your email address and continue setting up your Grove blog:
        </p>
        <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto 24px auto;">
          <tr>
            ${codeBoxes}
          </tr>
        </table>
        <p style="margin: 0 0 8px 0; font-size: 14px; color: rgba(245, 242, 234, 0.5);">
          This code expires in ${params.expiryMinutes} minutes.
        </p>
        <p style="margin: 0; font-size: 14px; color: rgba(245, 242, 234, 0.5);">
          If you didn't request this, you can safely ignore this email.
        </p>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding-top: 30px;">
        <p style="margin: 0; font-size: 14px; color: rgba(245, 242, 234, 0.5);">
          — Grove
        </p>
      </td>
    </tr>
  `);

  const text = `
Verify your email, ${params.name}

Enter this code to verify your email address and continue setting up your Grove blog:

${params.code}

This code expires in ${params.expiryMinutes} minutes.

If you didn't request this, you can safely ignore this email.

— Grove
`.trim();

  return { subject, html, text };
}
