import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { getSafeRedirect } from "$lib/redirect";
import { isGreenhouseMode } from "$lib/greenhouse";

/**
 * Post-payment callback handler
 *
 * Users land here after returning from Stripe Checkout or the Billing Portal.
 * We read the stored redirect cookie and send them back to their originating
 * Grove app with appropriate query params.
 *
 * Query params from Stripe:
 *   ?session_id=cs_xxx  — successful checkout
 *   ?cancelled=true     — user cancelled checkout
 *   (no params)         — returning from billing portal
 */
export const load: PageServerLoad = async ({ url, cookies, platform }) => {
	const rawSessionId = url.searchParams.get("session_id");
	const cancelled = url.searchParams.get("cancelled");

	// Validate session_id matches Stripe's format (cs_test_ or cs_live_ prefix, alphanumeric)
	const STRIPE_SESSION_RE = /^cs_(test|live)_[a-zA-Z0-9]{10,200}$/;
	const sessionId =
		rawSessionId && (STRIPE_SESSION_RE.test(rawSessionId) || rawSessionId.startsWith("greenhouse_"))
			? rawSessionId
			: null;

	// Greenhouse mode: redirect back to billing hub home, not to an external app
	if (isGreenhouseMode(cookies, platform)) {
		const result = sessionId
			? "?billing=success"
			: cancelled
				? "?billing=cancelled"
				: "?billing=portal";
		redirect(302, `/${result}`);
	}

	// Read and clear the redirect cookie
	const storedRedirect = cookies.get("grove_billing_redirect");
	cookies.delete("grove_billing_redirect", { path: "/" });

	const baseRedirect = getSafeRedirect(storedRedirect);

	// Build redirect URL with billing result params
	const target = new URL(baseRedirect);

	if (sessionId) {
		target.searchParams.set("billing", "success");
		target.searchParams.set("session_id", sessionId);
	} else if (cancelled) {
		target.searchParams.set("billing", "cancelled");
	} else {
		// Returning from portal — no specific status
		target.searchParams.set("billing", "portal");
	}

	redirect(302, target.toString());
};
