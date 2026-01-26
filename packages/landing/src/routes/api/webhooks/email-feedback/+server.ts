import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { generateId } from "@autumnsgrove/groveengine/services";
import { Resend } from "resend";

/**
 * Escape HTML special characters to prevent XSS in email templates
 */
function escapeHtml(unsafe: string | null): string {
  if (!unsafe) return "";
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Email Webhook Handler for feedback@grove.place
 *
 * This endpoint receives emails via Cloudflare Email Routing.
 *
 * Setup in Cloudflare Dashboard:
 * 1. Email Routing → Email Workers
 * 2. Add route: feedback@grove.place → https://grove.place/api/webhooks/email-feedback
 *
 * Payload format: https://developers.cloudflare.com/email-routing/email-workers/
 */

interface CloudflareEmailPayload {
  from: string;
  to: string;
  subject?: string;
  text?: string;
  html?: string;
  headers?: Record<string, string>;
}

/**
 * Parse email "from" field to extract name and email
 * Examples:
 *   "John Doe <john@example.com>" → { name: "John Doe", email: "john@example.com" }
 *   "john@example.com" → { name: null, email: "john@example.com" }
 */
function parseFromField(from: string): { name: string | null; email: string } {
  const match = from.match(/^(.+?)\s*<(.+?)>$/);
  if (match) {
    return {
      name: match[1].trim(),
      email: match[2].trim(),
    };
  }
  return {
    name: null,
    email: from.trim(),
  };
}

export const POST: RequestHandler = async ({ request, platform }) => {
  if (!platform?.env?.DB) {
    console.error("Database not available");
    return json({ error: "Database not available" }, { status: 500 });
  }

  let payload: CloudflareEmailPayload;

  try {
    payload = await request.json();
  } catch (err) {
    console.error("Failed to parse email payload:", err);
    return json({ error: "Invalid payload" }, { status: 400 });
  }

  // Parse sender info
  const { name, email } = parseFromField(payload.from);

  // Extract message (prefer plain text, fallback to HTML)
  const message = payload.text || payload.html || "";

  if (!message) {
    console.error("Email has no content");
    return json({ error: "Email has no content" }, { status: 400 });
  }

  // Truncate message if too long (2000 char limit)
  const truncatedMessage =
    message.length > 2000 ? message.substring(0, 2000) : message;

  // Generate ID and timestamps
  const id = generateId();
  const now = Math.floor(Date.now() / 1000);

  // Insert feedback into D1
  try {
    await platform.env.DB.prepare(
      `INSERT INTO feedback (id, source, name, email, subject, message, sentiment, ip_address, user_agent, status, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        id,
        "email",
        name,
        email,
        payload.subject || null,
        truncatedMessage,
        null, // sentiment not available from email
        null, // IP not available from email
        null, // user agent not available from email
        "new",
        now,
        now,
      )
      .run();
  } catch (err) {
    console.error("Failed to save email feedback:", err);
    return json({ error: "Failed to save feedback" }, { status: 500 });
  }

  // Forward to autumn@grove.place via Resend
  if (platform.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(platform.env.RESEND_API_KEY);

      const emailSubject = payload.subject
        ? `Grove Feedback (Email): ${payload.subject}`
        : "Grove Feedback (Email): New feedback";

      const emailText = `From: ${name || "Unknown"}
Email: ${email}
Source: Email (feedback@grove.place)

---

${truncatedMessage}

---
View in Arbor: https://grove.place/admin/feedback
Feedback ID: ${id}`;

      const emailHtml = `<div style="font-family: sans-serif; line-height: 1.6;">
<p><strong>From:</strong> ${escapeHtml(name) || "Unknown"}<br>
<strong>Email:</strong> ${escapeHtml(email)}<br>
<strong>Source:</strong> Email (feedback@grove.place)</p>

<hr style="border: none; border-top: 1px solid #ddd; margin: 24px 0;">

<p style="white-space: pre-wrap;">${escapeHtml(truncatedMessage)}</p>

<hr style="border: none; border-top: 1px solid #ddd; margin: 24px 0;">

<p style="font-size: 14px; color: #666;">
<a href="https://grove.place/admin/feedback">View in Arbor</a><br>
Feedback ID: ${id}
</p>
</div>`;

      await resend.emails.send({
        from: "Grove <hello@grove.place>",
        to: "autumn@grove.place",
        subject: emailSubject,
        text: emailText,
        html: emailHtml,
      });
    } catch (err) {
      console.error("Failed to forward feedback email:", err);
      // Don't fail the request - feedback is already saved
    }
  }

  return json({ received: true, id });
};
