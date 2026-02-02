/**
 * Porch Reply Email Template
 *
 * Sent when Autumn replies to a visitor's message on the Porch.
 * This is THE template that fixes the silent failure bug.
 */

import { wrapEmail, paragraph, divider, link, escapeHtml } from "./base";
import type { RenderResult } from "./index";

export interface PorchReplyData {
  /** Reply content from Autumn */
  content: string;
  /** Visit ID for the conversation link */
  visitId: string;
  /** Visit number (e.g., "P-0001") */
  visitNumber?: string;
  /** Original subject line */
  subject?: string;
  /** Visitor's name (optional) */
  visitorName?: string;
}

/**
 * Render the Porch reply email.
 */
export function porchReplyTemplate(data: PorchReplyData): RenderResult {
  // Note: visitNumber and subject are used in subject line generation (templates/index.ts)
  const { content, visitId, visitorName } = data;

  const greeting = visitorName ? `Hi ${escapeHtml(visitorName)},` : "Hi there,";
  const conversationUrl = `https://grove.place/porch/visits/${visitId}`;

  // Format content preserving line breaks
  const formattedContent = escapeHtml(content)
    .replace(
      /\n\n/g,
      '</p><p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3d2914; white-space: pre-wrap;">',
    )
    .replace(/\n/g, "<br>");

  const contentHtml = `
    ${paragraph(greeting)}
    <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3d2914; white-space: pre-wrap;">${formattedContent}</p>
    ${divider()}
    <p style="margin: 0; font-size: 14px; color: #3d2914; opacity: 0.7;">
      ${link("View this conversation", conversationUrl)}
    </p>
  `;

  const html = wrapEmail({
    previewText:
      content.substring(0, 100) + (content.length > 100 ? "..." : ""),
    content: contentHtml,
    signature: "— Autumn",
  });

  // Plain text version
  const text = `${greeting}

${content}

---

View this conversation: ${conversationUrl}

— Autumn
Grove`;

  return { html, text };
}
