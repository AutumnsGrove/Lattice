import { redirect, error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { proxyToBillingApi } from "$lib/billing-proxy";
import { isValidRedirect } from "$lib/redirect";
import { isGreenhouseMode } from "$lib/greenhouse";

/**
 * Portal redirect — creates a Stripe Billing Portal session and redirects.
 *
 * The user arrives here from the billing landing page or from a tenant app
 * redirect (?action=portal). We call billing-api to create a portal session
 * and redirect the user to Stripe's hosted billing portal.
 */
export const load: PageServerLoad = async ({ url, locals, platform, cookies }) => {
	if (!locals.tenantId) {
		error(401, {
			message: "Please sign in to manage your billing.",
			code: "BILLING-002",
		});
	}

	const redirectUrl = url.searchParams.get("redirect");

	// Store redirect for post-portal return
	if (redirectUrl && isValidRedirect(redirectUrl)) {
		cookies.set("grove_billing_redirect", redirectUrl, {
			path: "/",
			httpOnly: true,
			secure: true,
			sameSite: "lax",
			maxAge: 60 * 30,
		});
	}

	// Greenhouse mode: stay on portal page (shows mock message instead of redirecting to Stripe)
	if (isGreenhouseMode(cookies, platform)) {
		return;
	}

	const returnUrl = "https://billing.grove.place/callback";

	const response = await proxyToBillingApi(platform, "/portal", {
		method: "POST",
		body: {
			tenantId: locals.tenantId,
			returnUrl,
		},
		headers: locals.userId ? { "X-User-Id": locals.userId } : undefined,
	});

	if (!response.ok) {
		const errorData = (await response.json().catch(() => ({}))) as Record<string, unknown>;
		console.error("[billing] Portal session failed:", response.status, errorData);
		error(502, {
			message: "Could not open the billing portal. Please try again.",
			code: "BILLING-040",
		});
	}

	const data = (await response.json()) as { portalUrl?: string };

	if (!data.portalUrl) {
		error(502, {
			message: "Could not open the billing portal. Please try again.",
			code: "BILLING-040",
		});
	}

	// Defense-in-depth: validate portal URL points to Stripe before redirecting.
	// Prevents open redirect if billing-api were ever compromised.
	if (!data.portalUrl.startsWith("https://billing.stripe.com/")) {
		console.error("[billing] Portal URL not on stripe.com:", data.portalUrl);
		error(502, {
			message: "Could not open the billing portal. Please try again.",
			code: "BILLING-041",
		});
	}

	redirect(302, data.portalUrl);
};
