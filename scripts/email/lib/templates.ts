/**
 * Email Template Builder for Grove Broadcasts
 *
 * Generates Grove-styled HTML emails with proper unsubscribe handling.
 * Uses Resend's {{{RESEND_UNSUBSCRIBE_URL}}} magic variable.
 */

const GROVE_LOGO_SVG = `<svg width="48" height="59" viewBox="0 0 417 512" xmlns="http://www.w3.org/2000/svg">
  <path fill="#5d4037" d="M171.274 344.942h74.09v167.296h-74.09V344.942z"/>
  <path fill="#16a34a" d="M0 173.468h126.068l-89.622-85.44 49.591-50.985 85.439 87.829V0h74.086v124.872L331 37.243l49.552 50.785-89.58 85.24H417v70.502H290.252l90.183 87.629L331 381.192 208.519 258.11 86.037 381.192l-49.591-49.591 90.218-87.631H0v-70.502z"/>
</svg>`;

/**
 * Wrap content in Grove email template
 * Uses the standard Grove dark theme styling
 */
export function wrapInGroveTemplate(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Grove</title>
</head>
<body style="margin: 0; padding: 0; background-color: #fefdfb; font-family: Georgia, Cambria, 'Times New Roman', serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <tr>
      <td align="center" style="padding-bottom: 30px;">
        ${GROVE_LOGO_SVG}
      </td>
    </tr>
    ${content}
    <tr>
      <td align="center" style="padding-top: 40px;">
        <p style="margin: 0 0 8px 0; font-size: 12px; color: #3d2914; opacity: 0.5;">
          <em>A place to be.</em>
        </p>
        <p style="margin: 0; font-size: 11px; color: #3d2914; opacity: 0.3;">
          <a href="https://grove.place" style="color: inherit;">grove.place</a> · <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color: inherit;">step away (unsubscribe)</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Generate plain text version from HTML content
 */
export function htmlToPlainText(html: string): string {
  return (
    html
      // Remove HTML tags
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<[^>]+>/g, " ")
      // Decode entities
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      // Clean up whitespace
      .replace(/\s+/g, " ")
      .trim()
  );
}

/**
 * Build a complete broadcast email with Grove styling
 */
export function buildBroadcastEmail(bodyHtml: string): {
  html: string;
  text: string;
} {
  const html = wrapInGroveTemplate(`
    <tr>
      <td style="padding: 30px; background-color: #f0fdf4; border-radius: 12px;">
        ${bodyHtml}
      </td>
    </tr>
    <tr>
      <td align="center" style="padding-top: 30px;">
        <p style="margin: 0; font-size: 14px; color: #3d2914; opacity: 0.5;">
          — Autumn
        </p>
      </td>
    </tr>
  `);

  // Generate plain text version
  const text = `${htmlToPlainText(bodyHtml)}

— Autumn

---
grove.place

Unsubscribe: {{{RESEND_UNSUBSCRIBE_URL}}}`;

  return { html, text };
}

/**
 * Simple paragraph styling for broadcast content
 */
export function paragraph(content: string): string {
  return `<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3d2914;">${content}</p>`;
}

/**
 * Highlighted/emphasized text
 */
export function highlight(content: string): string {
  return `<strong style="color: #16a34a;">${content}</strong>`;
}

/**
 * Heading for broadcast
 */
export function heading(content: string): string {
  return `<h1 style="margin: 0 0 16px 0; font-size: 24px; color: #3d2914; font-weight: normal;">${content}</h1>`;
}

/**
 * Bullet list
 */
export function bulletList(items: string[]): string {
  const listItems = items
    .map((item) => `<li style="margin-bottom: 8px;">${item}</li>`)
    .join("\n          ");

  return `<ul style="margin: 0 0 16px 0; padding-left: 20px; color: #3d2914; line-height: 1.8;">
          ${listItems}
        </ul>`;
}

/**
 * Horizontal divider
 */
export function divider(): string {
  return `<hr style="border: none; border-top: 1px solid rgba(61, 41, 20, 0.1); margin: 24px 0;" />`;
}

/**
 * Link styling
 */
export function link(text: string, url: string): string {
  return `<a href="${url}" style="color: #16a34a; text-decoration: none;">${text}</a>`;
}
