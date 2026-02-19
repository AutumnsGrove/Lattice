import { fail, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { generateId } from "@autumnsgrove/lattice/services";
import { GROVE_EMAILS } from "@autumnsgrove/lattice/config";
import { Resend } from "resend";

interface Visit {
  id: string;
  visit_number: string;
  user_id: string | null;
  guest_email: string | null;
  guest_name: string | null;
  category: string;
  subject: string;
  status: string;
  created_at: number;
  updated_at: number;
}

interface Message {
  id: string;
  visit_id: string;
  sender_type: string;
  sender_name: string | null;
  content: string;
  created_at: number;
}

function escapeHtml(unsafe: string | null): string {
  if (!unsafe) return "";
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export const load: PageServerLoad = async ({ params, locals, platform }) => {
  if (!locals.user || !platform?.env?.DB) {
    return {
      user: locals.user || null,
      visit: null,
      messages: [],
    };
  }

  let visit: Visit | null = null;
  let messages: Message[] = [];

  try {
    // Load visit (only if owned by user)
    visit = await platform.env.DB.prepare(
      `SELECT id, visit_number, user_id, guest_email, guest_name, category, subject, status, created_at, updated_at
			 FROM porch_visits
			 WHERE id = ? AND user_id = ?`,
    )
      .bind(params.id, locals.user.id)
      .first<Visit>();

    if (visit) {
      // Load messages
      const result = await platform.env.DB.prepare(
        `SELECT id, visit_id, sender_type, sender_name, content, created_at
				 FROM porch_messages
				 WHERE visit_id = ?
				 ORDER BY created_at ASC`,
      )
        .bind(visit.id)
        .all<Message>();

      messages = result.results || [];
    }
  } catch (err) {
    console.error("Failed to load visit:", err);
  }

  return {
    user: locals.user,
    visit,
    messages,
  };
};

export const actions: Actions = {
  reply: async ({ params, request, locals, platform }) => {
    if (!locals.user) {
      return fail(401, { error: "Please sign in to reply." });
    }

    if (!platform?.env?.DB) {
      return fail(500, { error: "Database not available." });
    }

    const formData = await request.formData();
    const content = (formData.get("content") as string)?.trim();

    if (!content || content.length < 1 || content.length > 5000) {
      return fail(400, { error: "Please enter a reply." });
    }

    // Verify user owns this visit
    const visit = await platform.env.DB.prepare(
      `SELECT id, visit_number, subject, status, guest_email
			 FROM porch_visits
			 WHERE id = ? AND user_id = ?`,
    )
      .bind(params.id, locals.user.id)
      .first<Visit>();

    if (!visit) {
      return fail(404, { error: "Visit not found." });
    }

    if (visit.status === "resolved") {
      return fail(400, {
        error:
          "This conversation is resolved. Start a new visit if you need help.",
      });
    }

    const messageId = generateId();
    const now = Math.floor(Date.now() / 1000);

    try {
      // Insert message
      await platform.env.DB.prepare(
        `INSERT INTO porch_messages (id, visit_id, sender_type, sender_name, content, created_at)
				 VALUES (?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          messageId,
          visit.id,
          "visitor",
          locals.user.name || "Wanderer",
          content,
          now,
        )
        .run();

      // Update visit timestamp and status (reopen if pending)
      await platform.env.DB.prepare(
        `UPDATE porch_visits SET updated_at = ?, status = 'open' WHERE id = ?`,
      )
        .bind(now, visit.id)
        .run();
    } catch (err) {
      console.error("Failed to save reply:", err);
      return fail(500, { error: "Failed to send reply. Please try again." });
    }

    // Notify Autumn
    if (platform.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(platform.env.RESEND_API_KEY);

        const emailSubject = `Re: [Porch ${visit.visit_number}] ${visit.subject}`;

        const emailText = `New reply from ${locals.user.name || "Wanderer"} on ${visit.visit_number}

---

${content}

---
Reply in Arbor: https://grove.place/arbor/porch/${visit.id}`;

        const emailHtml = `<div style="font-family: sans-serif; line-height: 1.6;">
<p style="color: #666;">New reply from <strong>${escapeHtml(locals.user.name) || "Wanderer"}</strong> on <strong>${escapeHtml(visit.visit_number)}</strong></p>

<hr style="border: none; border-top: 1px solid #ddd; margin: 24px 0;">

<p style="white-space: pre-wrap;">${escapeHtml(content)}</p>

<hr style="border: none; border-top: 1px solid #ddd; margin: 24px 0;">

<p style="font-size: 14px;">
<a href="https://grove.place/arbor/porch/${visit.id}" style="color: #166534;">Reply in Arbor</a>
</p>
</div>`;

        await resend.emails.send({
          from: GROVE_EMAILS.porch.fromSystem,
          to: GROVE_EMAILS.autumn.address,
          replyTo: locals.user.email,
          subject: emailSubject,
          text: emailText,
          html: emailHtml,
        });
      } catch (err) {
        console.error("Failed to send notification email:", err);
      }
    }

    return { success: true };
  },
};
