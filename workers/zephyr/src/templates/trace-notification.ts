/**
 * Trace Notification Email Template
 *
 * Sent when someone leaves feedback via the Trace feature.
 */

import { wrapEmail, escapeHtml, COLORS } from "./base";
import type { RenderResult } from "./index";

export interface TraceNotificationData {
  /** The path/URL where feedback was left */
  sourcePath: string;
  /** Vote type */
  vote: "up" | "down";
  /** Optional comment */
  comment?: string;
  /** Trace ID for reference */
  traceId?: string;
}

/**
 * Render the trace notification email.
 */
export function traceNotificationTemplate(
  data: TraceNotificationData,
): RenderResult {
  const { sourcePath, vote, comment } = data;

  const emoji = vote === "up" ? "👍" : "👎";
  const voteText = vote === "up" ? "positive" : "negative";

  const commentSection = comment
    ? `
      <div style="margin-top: 16px; padding: 16px; background-color: rgba(22, 163, 74, 0.1); border-radius: 8px; border-left: 4px solid ${COLORS.groveGreen};">
        <p style="margin: 0; color: ${COLORS.barkBrown}; font-style: italic;">"${escapeHtml(comment)}"</p>
      </div>
    `
    : "";

  const contentHtml = `
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="font-size: 48px;">${emoji}</span>
      <h1 style="margin: 12px 0 0 0; font-size: 24px; color: ${COLORS.groveGreen}; font-weight: normal;">Someone left a trace</h1>
    </div>

    <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
      <tr>
        <td style="padding: 8px 0; color: ${COLORS.barkBrown}; opacity: 0.7; width: 100px;">Location</td>
        <td style="padding: 8px 0; font-family: monospace; color: ${COLORS.barkBrown};">${escapeHtml(sourcePath)}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: ${COLORS.barkBrown}; opacity: 0.7;">Feedback</td>
        <td style="padding: 8px 0; color: ${COLORS.barkBrown}; text-transform: capitalize;">${voteText}</td>
      </tr>
    </table>

    ${commentSection}

    <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid rgba(61, 41, 20, 0.1); text-align: center;">
      <a href="https://grove.place/admin/traces" style="display: inline-block; padding: 12px 24px; background-color: ${COLORS.groveGreen}; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 500;">View all traces</a>
    </div>
  `;

  const html = wrapEmail({
    previewText: `${emoji} ${voteText} feedback on ${sourcePath}`,
    content: contentHtml,
    hideFooter: true, // Internal notification, no unsubscribe needed
    signature: "",
  });

  // Plain text version
  let text = `${emoji} Someone left a trace\n\n`;
  text += `Location: ${sourcePath}\n`;
  text += `Feedback: ${voteText}\n`;

  if (comment) {
    text += `\nComment:\n"${comment}"\n`;
  }

  text += `\n---\nView all traces: https://grove.place/admin/traces`;

  return { html, text };
}
