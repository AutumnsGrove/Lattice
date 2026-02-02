/**
 * Verification Code Email Template
 *
 * Sent during email verification flow in Plant.
 */

import { wrapEmail, paragraph, codeBox } from "./base";
import type { RenderResult } from "./index";

export interface VerificationCodeData {
  /** The 6-digit verification code */
  code: string;
  /** Code expiration time (e.g., "15 minutes") */
  expiresIn?: string;
  /** User's display name (optional) */
  name?: string;
}

/**
 * Render the verification code email.
 */
export function verificationCodeTemplate(
  data: VerificationCodeData,
): RenderResult {
  const { code, expiresIn = "15 minutes", name } = data;

  const greeting = name ? `Hey ${name},` : "Hey,";

  const contentHtml = `
    ${paragraph(greeting)}
    ${paragraph("Here's your verification code for Grove:")}
    ${codeBox(code)}
    ${paragraph(`This code will expire in ${expiresIn}. If you didn't request this, you can safely ignore this email.`)}
  `;

  const html = wrapEmail({
    previewText: `Your Grove verification code: ${code}`,
    content: contentHtml,
    signature: "— Grove",
  });

  const text = `${greeting}

Here's your verification code for Grove:

${code}

This code will expire in ${expiresIn}. If you didn't request this, you can safely ignore this email.

— Grove`;

  return { html, text };
}
