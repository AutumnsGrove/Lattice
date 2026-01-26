import { fail, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import {
  verifyTurnstileToken,
  generateId,
} from "@autumnsgrove/groveengine/services";
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

export const load: PageServerLoad = async ({ platform }) => {
  return {
    turnstileKey: platform?.env?.TURNSTILE_SITE_KEY || "",
  };
};

export const actions: Actions = {
  submit: async ({ request, platform, getClientAddress }) => {
    if (!platform?.env?.DB) {
      return fail(500, { error: "Database not available" });
    }

    const formData = await request.formData();
    const name = (formData.get("name") as string)?.trim() || null;
    const email = (formData.get("email") as string)?.trim() || null;
    const subject = (formData.get("subject") as string)?.trim() || null;
    const message = (formData.get("message") as string)?.trim();
    const sentiment = (formData.get("sentiment") as string)?.trim() || null;
    const turnstileToken = formData.get("cf-turnstile-response") as string;

    // Validate message
    if (!message || message.length < 10 || message.length > 2000) {
      return fail(400, {
        error: "Please enter a message between 10 and 2000 characters.",
      });
    }

    // Verify Turnstile
    if (!turnstileToken) {
      return fail(400, {
        error: "Please complete the verification challenge.",
      });
    }

    const turnstileResult = await verifyTurnstileToken({
      token: turnstileToken,
      secretKey: platform.env.TURNSTILE_SECRET_KEY || "",
      remoteip: getClientAddress(),
    });

    if (!turnstileResult.success) {
      return fail(403, {
        error: "Human verification failed. Please try again.",
      });
    }

    // Rate limiting: 5 submissions per day per IP
    const ip = getClientAddress();
    const rateLimitKey = `feedback:ip:${ip}`;

    try {
      // Check rate limit (if CACHE is available)
      if (platform.env.CACHE) {
        const existing = await platform.env.CACHE.get(rateLimitKey);
        const count = existing ? parseInt(existing, 10) : 0;

        if (count >= 5) {
          return fail(429, {
            error:
              "You've reached the daily feedback limit. Please try again tomorrow, or email feedback@grove.place directly.",
          });
        }

        // Increment counter (24 hour TTL)
        await platform.env.CACHE.put(rateLimitKey, (count + 1).toString(), {
          expirationTtl: 60 * 60 * 24,
        });
      }
    } catch (err) {
      console.error("Rate limit check failed:", err);
      // Continue anyway - don't block legitimate feedback
    }

    // Generate ID and timestamps
    const id = generateId();
    const now = Math.floor(Date.now() / 1000);

    // Get user agent
    const userAgent = request.headers.get("user-agent") || null;

    // Insert feedback into D1
    try {
      await platform.env.DB.prepare(
        `INSERT INTO feedback (id, source, name, email, subject, message, sentiment, ip_address, user_agent, status, created_at, updated_at)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          id,
          "web",
          name,
          email,
          subject,
          message,
          sentiment,
          ip,
          userAgent,
          "new",
          now,
          now,
        )
        .run();
    } catch (err) {
      console.error("Failed to save feedback:", err);
      return fail(500, {
        error: "Failed to save your feedback. Please try again.",
      });
    }

    // Forward to autumn@grove.place via Resend
    if (platform.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(platform.env.RESEND_API_KEY);

        const sentimentEmoji =
          sentiment === "positive"
            ? "😊"
            : sentiment === "negative"
              ? "😟"
              : sentiment === "neutral"
                ? "😐"
                : "";
        const sentimentLabel =
          sentiment === "positive"
            ? "Positive"
            : sentiment === "negative"
              ? "Concern"
              : sentiment === "neutral"
                ? "Neutral"
                : "Not specified";

        const emailSubject = subject
          ? `Grove Feedback: ${subject}`
          : "Grove Feedback: New feedback";

        const emailText = `From: ${name || "Anonymous Wanderer"}
Email: ${email || "No reply email provided"}
Sentiment: ${sentimentEmoji} ${sentimentLabel}

---

${message}

---
View in Arbor: https://grove.place/admin/feedback
Feedback ID: ${id}`;

        const emailHtml = `<div style="font-family: sans-serif; line-height: 1.6;">
<p><strong>From:</strong> ${escapeHtml(name) || "Anonymous Wanderer"}<br>
<strong>Email:</strong> ${escapeHtml(email) || "No reply email provided"}<br>
<strong>Sentiment:</strong> ${sentimentEmoji} ${sentimentLabel}</p>

<hr style="border: none; border-top: 1px solid #ddd; margin: 24px 0;">

<p style="white-space: pre-wrap;">${escapeHtml(message)}</p>

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

    return { success: true };
  },
};
