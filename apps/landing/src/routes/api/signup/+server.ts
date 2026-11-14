import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { sanitizeRef } from "$lib/server/ref-tracking";

/**
 * Start the onboarding sequence via the OnboardingAgent service binding.
 * The agent handles Day 0/1/7/14/30 scheduling, idempotency, and unsubscribe.
 */
function startOnboardingAgent(
	onboarding: Fetcher,
	email: string,
	audience: string,
): Promise<Response> {
	return onboarding.fetch("https://onboarding/start", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email, audience }),
	});
}

export const POST: RequestHandler = async ({ request, platform }) => {
	if (!platform?.env?.DB) {
		return json({ error: "Service temporarily unavailable" }, { status: 503 });
	}

	let body: { email?: string; ref?: unknown };
	try {
		body = await request.json();
	} catch {
		return json({ error: "Invalid request body" }, { status: 400 });
	}

	const { email } = body;

	// Acquisition ref from the business card QR (#1426). Optional — an absent or
	// malformed value just means the signup came from somewhere untracked.
	const ref = sanitizeRef(typeof body.ref === "string" ? body.ref : null);

	if (!email || typeof email !== "string") {
		return json({ error: "Email is required" }, { status: 400 });
	}

	// Basic email validation
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	if (!emailRegex.test(email)) {
		return json({ error: "Please enter a valid email address" }, { status: 400 });
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

				// Start onboarding sequence via agent (idempotent — safe to call again)
				if (platform.env.ONBOARDING) {
					platform.context.waitUntil(
						startOnboardingAgent(platform.env.ONBOARDING, normalizedEmail, "wanderer"),
					);
				}

				return json({ success: true, message: "Welcome back!" });
			}
			return json({ error: "This email is already on our list!" }, { status: 409 });
		}

		// Insert new signup with welcome_email_sent flag. `source` records where the
		// signup came from: the card's ref when we have one, otherwise the page
		// that has always been the default.
		await platform.env.DB.prepare(
			"INSERT INTO email_signups (email, welcome_email_sent, source) VALUES (?, 1, ?)",
		)
			.bind(normalizedEmail, ref ?? "landing")
			.run();

		// Start onboarding sequence via agent
		if (platform.env.ONBOARDING) {
			platform.context.waitUntil(
				startOnboardingAgent(platform.env.ONBOARDING, normalizedEmail, "wanderer"),
			);
		}

		return json({ success: true, message: "Thanks for signing up!" });
	} catch (error) {
		console.error("Signup error", {
			errorType: error instanceof Error ? error.name : "Unknown",
		});
		return json({ error: "Something went wrong. Please try again." }, { status: 500 });
	}
};
