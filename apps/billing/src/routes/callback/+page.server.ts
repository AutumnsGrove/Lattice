import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { getSafeRedirect } from "$lib/redirect";

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
export const load: PageServerLoad = async ({ url, cookies }) => {
	const sessionId = url.searchParams.get("session_id");
	const cancelled = url.searchParams.get("cancelled");

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
