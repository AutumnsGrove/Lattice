import { fail, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import {
  verifyTurnstileToken,
  generateId,
} from "@autumnsgrove/lattice/services";
import { GROVE_EMAILS } from "@autumnsgrove/lattice/config";
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
 * Generate next visit number in format: PORCH-2026-00001
 *
 * Uses a two-tier strategy for sequence generation:
 *
 * 1. **KV (preferred)**: Cloudflare KV provides fast, globally consistent reads.
 *    We read the current sequence, increment, and write back. While not truly
 *    atomic, KV's eventual consistency is acceptable for support ticket numbers
 *    where small gaps or rare duplicates can be handled gracefully.
 *
 * 2. **D1 fallback**: If KV is unavailable (local dev, KV errors), we count
 *    existing visits for the year. This is slower but reliable. The COUNT
 *    approach means deleted visits could cause gaps, but that's acceptable.
 *
 * Why not use D1 auto-increment? We want human-readable, year-prefixed numbers
 * (PORCH-2026-00001) that reset each year, not raw integer IDs.
 */
async function generateVisitNumber(
  db: D1Database,
  kv?: KVNamespace,
): Promise<string> {
  const year = new Date().getFullYear();
  const kvKey = `porch:visit_sequence:${year}`;

  let sequence = 1;

  if (kv) {
    try {
      // KV path: read-increment-write (fast, globally distributed)
      const existing = await kv.get(kvKey);
      sequence = existing ? parseInt(existing, 10) + 1 : 1;
      await kv.put(kvKey, sequence.toString());
    } catch {
      // KV failed - fall back to DB count
      const result = await db
        .prepare(
          `SELECT COUNT(*) as count FROM porch_visits WHERE visit_number LIKE ?`,
        )
        .bind(`PORCH-${year}-%`)
        .first<{ count: number }>();
      sequence = (result?.count || 0) + 1;
    }
  } else {
    // No KV available (local dev) - count from DB
    const result = await db
      .prepare(
        `SELECT COUNT(*) as count FROM porch_visits WHERE visit_number LIKE ?`,
      )
      .bind(`PORCH-${year}-%`)
      .first<{ count: number }>();
    sequence = (result?.count || 0) + 1;
  }

  return `PORCH-${year}-${sequence.toString().padStart(5, "0")}`;
}

const VALID_CATEGORIES = [
  "billing",
  "technical",
  "account",
  "hello",
  "other",
] as const;

export const load: PageServerLoad = async ({ locals, platform }) => {
  return {
    user: locals.user || null,
    turnstileKey: platform?.env?.TURNSTILE_SITE_KEY || "",
  };
};

export const actions: Actions = {
  submit: async ({ request, platform, locals, getClientAddress }) => {
    if (!platform?.env?.DB) {
      return fail(500, { error: "Database not available" });
    }

    const formData = await request.formData();
    const name = (formData.get("name") as string)?.trim() || null;
    const email = (formData.get("email") as string)?.trim();
    const subject = (formData.get("subject") as string)?.trim();
    const message = (formData.get("message") as string)?.trim();
    const categoryRaw = (formData.get("category") as string)?.trim() || "other";
    const turnstileToken = formData.get("cf-turnstile-response") as string;

    // Validate category
    const category = VALID_CATEGORIES.includes(
      categoryRaw as (typeof VALID_CATEGORIES)[number],
    )
      ? categoryRaw
      : "other";

    // Validate required fields
    if (!email) {
      return fail(400, {
        error: "Email is required so I can get back to you.",
      });
    }

    if (!subject || subject.length < 3) {
      return fail(400, { error: "Please provide a subject." });
    }

    if (!message || message.length < 10 || message.length > 5000) {
      return fail(400, {
        error: "Please enter a message between 10 and 5000 characters.",
      });
    }

    // Turnstile verification for guests
    if (!locals.user) {
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
    }

    // Rate limiting for guests: 5 visits per day per IP
    if (!locals.user) {
      const ip = getClientAddress();
      const rateLimitKey = `porch:ip:${ip}`;

      try {
        if (platform.env.CACHE) {
          const existing = await platform.env.CACHE.get(rateLimitKey);
          const count = existing ? parseInt(existing, 10) : 0;

          if (count >= 5) {
            return fail(429, {
              error:
                "You've started several visits today. Please try again tomorrow, or email porch@grove.place directly.",
            });
          }

          await platform.env.CACHE.put(rateLimitKey, (count + 1).toString(), {
            expirationTtl: 60 * 60 * 24,
          });
        }
      } catch (err) {
        console.error("Rate limit check failed:", err);
      }
    }

    // Generate IDs and visit number
    const visitId = generateId();
    const messageId = generateId();
    const visitNumber = await generateVisitNumber(
      platform.env.DB,
      platform.env.CACHE,
    );
    const now = Math.floor(Date.now() / 1000);

    // Insert visit and first message
    try {
      // Create the visit
      await platform.env.DB.prepare(
        `INSERT INTO porch_visits (id, visit_number, user_id, guest_email, guest_name, category, subject, status, priority, created_at, updated_at)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          visitId,
          visitNumber,
          locals.user?.id || null,
          locals.user ? null : email, // Store email as guest_email only for guests
          name,
          category,
          subject,
          "open",
          "normal",
          now,
          now,
        )
        .run();

      // Create the first message
      await platform.env.DB.prepare(
        `INSERT INTO porch_messages (id, visit_id, sender_type, sender_name, content, created_at)
				 VALUES (?, ?, ?, ?, ?, ?)`,
      )
        .bind(messageId, visitId, "visitor", name || "Wanderer", message, now)
        .run();
    } catch (err) {
      console.error("Failed to save visit:", err);
      return fail(500, {
        error: "Failed to start your visit. Please try again.",
      });
    }

    // Send notification email to Autumn
    if (platform.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(platform.env.RESEND_API_KEY);

        const categoryLabels: Record<string, string> = {
          billing: "Billing",
          technical: "Technical",
          account: "Account",
          hello: "Just saying hi",
          other: "Other",
        };

        const emailSubject = `[Porch ${visitNumber}] ${subject}`;

        const emailText = `New Porch visit from ${name || "A Wanderer"}

Visit: ${visitNumber}
Category: ${categoryLabels[category] || category}
From: ${name || "Anonymous"}
Email: ${email}
${locals.user ? `User ID: ${locals.user.id}` : "(Guest)"}

---

${message}

---
Reply in Arbor: https://grove.place/arbor/porch/${visitId}`;

        const emailHtml = `<div style="font-family: sans-serif; line-height: 1.6;">
<h2 style="color: #166534; margin-bottom: 0.5rem;">New Porch Visit</h2>
<p style="color: #666; margin-top: 0;">
<strong>${escapeHtml(visitNumber)}</strong> &middot; ${categoryLabels[category] || category}
</p>

<p><strong>From:</strong> ${escapeHtml(name) || "A Wanderer"}<br>
<strong>Email:</strong> ${escapeHtml(email)}<br>
${locals.user ? `<strong>User:</strong> ${escapeHtml(locals.user.id)}<br>` : "<em>(Guest)</em><br>"}
</p>

<hr style="border: none; border-top: 1px solid #ddd; margin: 24px 0;">

<p style="white-space: pre-wrap;">${escapeHtml(message)}</p>

<hr style="border: none; border-top: 1px solid #ddd; margin: 24px 0;">

<p style="font-size: 14px;">
<a href="https://grove.place/arbor/porch/${visitId}" style="color: #166534;">Reply in Arbor</a>
</p>
</div>`;

        await resend.emails.send({
          from: GROVE_EMAILS.porch.fromSystem,
          to: GROVE_EMAILS.autumn.address,
          replyTo: email,
          subject: emailSubject,
          text: emailText,
          html: emailHtml,
        });
      } catch (err) {
        console.error("Failed to send notification email:", err);
        // Don't fail - visit is saved
      }
    }

    // Send confirmation email to visitor
    if (platform.env.RESEND_API_KEY && email) {
      try {
        const resend = new Resend(platform.env.RESEND_API_KEY);

        const confirmSubject = `Your Porch visit: ${visitNumber}`;

        const confirmText = `Hi ${name || "there"},

Thanks for reaching out! I've received your message and I'll get back to you as soon as I can.

Your visit number: ${visitNumber}

---

${subject}

${message}

---

I typically respond within a day, often much sooner. You'll get an email when I reply.

—Autumn
Grove`;

        const confirmHtml = `<div style="font-family: sans-serif; line-height: 1.6; max-width: 600px;">
<p>Hi ${escapeHtml(name) || "there"},</p>

<p>Thanks for reaching out! I've received your message and I'll get back to you as soon as I can.</p>

<p><strong>Your visit number:</strong> ${escapeHtml(visitNumber)}</p>

<div style="background: #f0fdf4; border-radius: 8px; padding: 16px; margin: 24px 0;">
<p style="margin: 0 0 8px 0; font-weight: bold;">${escapeHtml(subject)}</p>
<p style="margin: 0; white-space: pre-wrap; color: #166534;">${escapeHtml(message)}</p>
</div>

<p style="color: #666;">I typically respond within a day, often much sooner. You'll get an email when I reply.</p>

<p style="margin-top: 24px;">—Autumn<br><a href="https://grove.place" style="color: #166534;">Grove</a></p>
</div>`;

        await resend.emails.send({
          from: GROVE_EMAILS.porch.fromAutumn,
          to: email,
          subject: confirmSubject,
          text: confirmText,
          html: confirmHtml,
        });
      } catch (err) {
        console.error("Failed to send confirmation email:", err);
        // Don't fail - visit is saved
      }
    }

    return { success: true, visitNumber };
  },
};
