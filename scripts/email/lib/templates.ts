/**
 * Email Template Builder for Grove Broadcasts
 *
 * Generates Grove-styled HTML emails with proper unsubscribe handling.
 * Uses Resend's {{{RESEND_UNSUBSCRIBE_URL}}} magic variable.
 */

const GROVE_LOGO_HTML = `<img src="https://cdn.grove.place/email/logo.png" width="48" height="48" alt="Grove" style="display: inline-block; border-radius: 50%;" />`;

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
        ${GROVE_LOGO_HTML}
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
