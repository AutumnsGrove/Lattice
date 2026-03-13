import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { buildCheckoutUrl } from "@autumnsgrove/lattice/config";

interface CompedInvite {
	id: string;
	email: string;
	tier: string;
	custom_message: string | null;
}

export const POST: RequestHandler = async ({ cookies, platform }) => {
	const onboardingId = cookies.get("onboarding_id");
	if (!onboardingId) {
		return json({ error: "Session expired. Please start over." }, { status: 401 });
	}

	const db = platform?.env?.DB;

	// Use configured base URL or fall back to production URL
	// This ensures redirects go to the correct domain (plant.grove.place, not pages.dev)
	const baseUrl = platform?.env?.PUBLIC_APP_URL || "https://plant.grove.place";

	if (!db) {
		console.error("[Checkout] Database not available");
		return json({ error: "Database not configured" }, { status: 503 });
	}

	try {
		// Get onboarding data
		const onboarding = await db
			.prepare(
				`SELECT id, email, username, plan_selected, plan_billing_cycle
         FROM user_onboarding WHERE id = ?`,
			)
			.bind(onboardingId)
			.first();

		if (!onboarding) {
			return json({ error: "Session not found. Please start over." }, { status: 404 });
		}

		// Check if this email has a comped invite
		const compedInvite = await db
			.prepare(
				`SELECT id, email, tier, custom_message
         FROM comped_invites
         WHERE email = ? AND used_at IS NULL`,
			)
			.bind((onboarding.email as string).toLowerCase())
			.first<CompedInvite>();

		if (compedInvite) {
			// User has a comped invite - redirect to comped welcome page
			return json({
				comped: true,
				redirectUrl: `${baseUrl}/comped`,
			});
		}

		// Build BillingHub checkout URL — all Stripe logic lives in billing-api
		const plan = onboarding.plan_selected as string;
		const billingCycle = (onboarding.plan_billing_cycle || "monthly") as "monthly" | "yearly";

		const checkoutUrl = buildCheckoutUrl({
			onboardingId: onboarding.id as string,
			tier: plan,
			billingCycle,
			redirect: `${baseUrl}/success`,
		});

		return json({ url: checkoutUrl });
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : String(err);
		console.error("[Checkout] Error creating session:", errorMessage, err);
		return json({ error: `Checkout failed: ${errorMessage}` }, { status: 500 });
	}
};
