import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { validateCSRF } from "$lib/utils/csrf.js";
import { sendWelcomeEmail } from "$lib/email/send";

export const POST: RequestHandler = async ({ request, platform }) => {
  // CSRF check
  if (!validateCSRF(request)) {
    return json({ error: "Invalid origin" }, { status: 403 });
  }

  if (!platform?.env?.DB) {
    return json({ error: "Service temporarily unavailable" }, { status: 503 });
  }

  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request body" }, { status: 400 });
  }

  const { email } = body;

  if (!email || typeof email !== "string") {
    return json({ error: "Email is required" }, { status: 400 });
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return json(
      { error: "Please enter a valid email address" },
      { status: 400 },
    );
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    // Check if already signed up
    const existing = await platform.env.DB.prepare(
      "SELECT id, unsubscribed_at FROM email_signups WHERE email = ?",
    )
      .bind(normalizedEmail)
      .first<{ id: number; unsubscribed_at: string | null }>();

    if (existing) {
      if (existing.unsubscribed_at) {
        // Re-subscribe
        await platform.env.DB.prepare(
          'UPDATE email_signups SET unsubscribed_at = NULL, created_at = datetime("now") WHERE id = ?',
        )
          .bind(existing.id)
          .run();

        // Send welcome email in background
        if (platform.env.RESEND_API_KEY) {
          platform.context.waitUntil(
            sendWelcomeEmail(normalizedEmail, platform.env.RESEND_API_KEY),
          );
        }

        return json({ success: true, message: "Welcome back!" });
      }
      return json(
        { error: "This email is already on our list!" },
        { status: 409 },
      );
    }

    // Insert new signup with welcome_email_sent flag
    await platform.env.DB.prepare(
      "INSERT INTO email_signups (email, welcome_email_sent) VALUES (?, 1)",
    )
      .bind(normalizedEmail)
      .run();

    // Send welcome email in background
    if (platform.env.RESEND_API_KEY) {
      platform.context.waitUntil(
        sendWelcomeEmail(normalizedEmail, platform.env.RESEND_API_KEY),
      );
    }

    return json({ success: true, message: "Thanks for signing up!" });
  } catch (error) {
    console.error("Signup error", {
      errorType: error instanceof Error ? error.name : "Unknown",
    });
    return json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
};
