import { redirect, error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { proxyToBillingApi } from "$lib/billing-proxy";
import { isValidRedirect, getSafeRedirect } from "$lib/redirect";
import { isGreenhouseMode } from "$lib/greenhouse";

/**
 * Checkout page loader
 *
 * Reads query params from the referring app:
 *   ?action=checkout&tenant=xxx&tier=sapling&cycle=monthly&redirect=https://...
 *   ?action=portal&redirect=https://...
 *
 * For checkout: calls billing-api POST /checkout, returns Stripe Checkout URL
 * For portal: redirects to /portal with query params
 *
 * Sets grove_billing_redirect cookie so /callback knows where to send the user.
 */
export const load: PageServerLoad = async ({ url, locals, platform, cookies }) => {
	const action = url.searchParams.get("action");
	const redirectUrl = url.searchParams.get("redirect");
	const tenant = url.searchParams.get("tenant") || locals.tenantId;
	const tier = url.searchParams.get("tier");
	const cycle = url.searchParams.get("cycle");
	const onboarding = url.searchParams.get("onboarding");

	// Store redirect URL in cookie for post-payment callback
	if (redirectUrl && isValidRedirect(redirectUrl)) {
		cookies.set("grove_billing_redirect", redirectUrl, {
			path: "/",
			httpOnly: true,
			secure: true,
			sameSite: "lax",
			maxAge: 60 * 30, // 30 minutes
		});
	}

	// Portal action — redirect to /portal route
	if (action === "portal") {
		const portalUrl = redirectUrl
			? `/portal?redirect=${encodeURIComponent(redirectUrl)}`
			: "/portal";
		redirect(302, portalUrl);
	}

	// Checkout action — requires auth + params
	if (action === "checkout") {
		if (!tenant) {
			error(401, {
				message: "Please sign in to manage your billing.",
				code: "BILLING-002",
			});
		}

		if (!tier || !cycle) {
			error(400, {
				message: "Missing checkout parameters. Please try again from your Grove.",
				code: "BILLING-020",
			});
		}

		const safeRedirect = getSafeRedirect(redirectUrl);

		// Greenhouse mode: simulate checkout success → redirect to callback
		if (isGreenhouseMode(cookies, platform)) {
			redirect(302, "/callback?session_id=greenhouse_cs_test_mock&greenhouse=true");
		}

		const response = await proxyToBillingApi(platform, "/checkout", {
			method: "POST",
			body: {
				tenantId: tenant,
				tier,
				billingCycle: cycle,
				onboardingId: onboarding ? onboarding : undefined,
				successUrl: `https://billing.grove.place/callback?session_id={CHECKOUT_SESSION_ID}`,
				cancelUrl: `https://billing.grove.place/callback?cancelled=true`,
			},
			headers: locals.userId ? { "X-User-Id": locals.userId } : undefined,
		});

		if (!response.ok) {
			const errorData = (await response.json().catch(() => ({}))) as Record<string, unknown>;
			console.error("[billing] Checkout failed:", response.status, errorData);
			error(502, {
				message: "Could not start checkout. Please try again.",
				code: "BILLING-022",
			});
		}

		const data = (await response.json()) as { checkoutUrl?: string; sessionId?: string };

		if (!data.checkoutUrl) {
			error(502, {
				message: "Could not start checkout. Please try again.",
				code: "BILLING-022",
			});
		}

		// Return checkout URL for client-side redirect (or server redirect)
		return {
			checkoutUrl: data.checkoutUrl,
			tier,
			cycle,
			redirectUrl: safeRedirect,
		};
	}

	// No action — show the billing landing / status page
	if (!locals.tenantId) {
		return {
			checkoutUrl: null,
			tier: null,
			cycle: null,
			redirectUrl: getSafeRedirect(redirectUrl),
			authenticated: false,
		};
	}

	return {
		checkoutUrl: null,
		tier: null,
		cycle: null,
		redirectUrl: getSafeRedirect(redirectUrl),
		authenticated: true,
	};
};
