/**
 * Billing URL Configuration — Single Source of Truth
 *
 * ALL billing URLs across the monorepo MUST import from here.
 * No package should define its own BILLING_URL or STRIPE config.
 *
 * The canonical billing entry point is billing.grove.place, which proxies
 * all requests to grove-billing-api via Cloudflare service binding.
 */

export const BILLING_HUB_URL = import.meta.env.VITE_BILLING_URL ?? "https://billing.grove.place";

/** Build a path on the billing hub. */
export function billingPath(path: string): string {
	return `${BILLING_HUB_URL}${path}`;
}

/**
 * Build a URL to the billing hub for checkout.
 * Redirects the user to billing.grove.place to complete payment.
 */
export function buildCheckoutUrl(params: {
	tenantId?: string;
	onboardingId?: string;
	tier: string;
	billingCycle: "monthly" | "yearly";
	redirect: string;
}): string {
	const url = new URL(BILLING_HUB_URL);
	url.searchParams.set("action", "checkout");
	if (params.tenantId) url.searchParams.set("tenant", params.tenantId);
	if (params.onboardingId) url.searchParams.set("onboarding", params.onboardingId);
	url.searchParams.set("tier", params.tier);
	url.searchParams.set("cycle", params.billingCycle);
	url.searchParams.set("redirect", params.redirect);
	return url.toString();
}

/**
 * Build a URL to the billing hub for the billing portal.
 * Opens Stripe's hosted portal for payment method and plan management.
 */
export function buildPortalUrl(redirect: string): string {
	const url = new URL(`${BILLING_HUB_URL}/portal`);
	url.searchParams.set("redirect", redirect);
	return url.toString();
}

/**
 * Build a URL to the billing hub for cancellation.
 * Shows a confirmation page before cancelling.
 */
export function buildCancelUrl(redirect: string): string {
	const url = new URL(`${BILLING_HUB_URL}/cancel`);
	url.searchParams.set("redirect", redirect);
	return url.toString();
}

/**
 * Build a URL to the billing hub for resuming a cancelled subscription.
 * Shows a confirmation page before resuming.
 */
export function buildResumeUrl(redirect: string): string {
	const url = new URL(`${BILLING_HUB_URL}/resume`);
	url.searchParams.set("redirect", redirect);
	return url.toString();
}
