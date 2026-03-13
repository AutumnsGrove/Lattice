import { error, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { proxyToBillingApi } from "$lib/billing-proxy";
import { getSafeRedirect } from "$lib/redirect";
import {
	isGreenhouseMode,
	isGreenhouseCancelled,
	setGreenhouseCancelled,
	GREENHOUSE_STATUS,
	GREENHOUSE_STATUS_CANCELLING,
} from "$lib/greenhouse";

/**
 * Cancellation confirmation page
 *
 * Load: fetches current billing status so we can show plan details.
 * Form action: calls billing-api POST /cancel to schedule cancellation
 * at period end (no immediate cutoff — Stripe handles this gracefully).
 */
export const load: PageServerLoad = async ({ locals, platform, cookies }) => {
	if (!locals.tenantId) {
		error(401, {
			message: "Please sign in to manage your billing.",
			code: "BILLING-002",
		});
	}

	let status: {
		plan?: string;
		status?: string;
		flourishState?: string;
		currentPeriodEnd?: string;
		cancelAtPeriodEnd?: boolean;
		isComped?: boolean;
		paymentMethod?: { last4: string; brand: string } | null;
	};

	if (isGreenhouseMode(cookies, platform)) {
		status = isGreenhouseCancelled(cookies)
			? { ...GREENHOUSE_STATUS_CANCELLING }
			: { ...GREENHOUSE_STATUS };
	} else {
		const response = await proxyToBillingApi(platform, `/status/${locals.tenantId}`, {
			headers: locals.userId ? { "X-User-Id": locals.userId } : undefined,
		});

		if (!response.ok) {
			console.error("[billing] Status fetch failed:", response.status);
			error(502, {
				message: "Could not load billing information.",
				code: "BILLING-043",
			});
		}

		status = (await response.json()) as typeof status;
	}

	const redirectUrl = cookies.get("grove_billing_redirect") || null;
	const greenhouse = isGreenhouseMode(cookies, platform);

	return {
		status,
		redirectUrl: greenhouse ? "/" : getSafeRedirect(redirectUrl),
		greenhouse,
	};
};

export const actions: Actions = {
	default: async ({ locals, platform, cookies }) => {
		if (!locals.tenantId) {
			error(401, {
				message: "Please sign in to manage your billing.",
				code: "BILLING-002",
			});
		}

		// In greenhouse mode, simulate success without calling billing-api
		if (isGreenhouseMode(cookies, platform)) {
			setGreenhouseCancelled(cookies);
			redirect(303, "/cancel");
		}

		const response = await proxyToBillingApi(platform, "/cancel", {
			method: "POST",
			body: { tenantId: locals.tenantId },
			headers: locals.userId ? { "X-User-Id": locals.userId } : undefined,
		});

		if (!response.ok) {
			const errorData = (await response.json().catch(() => ({}))) as Record<string, unknown>;
			console.error("[billing] Cancel failed:", response.status, errorData);
			error(502, {
				message: "Could not process cancellation. Please try again.",
				code: "BILLING-041",
			});
		}

		const redirectUrl = cookies.get("grove_billing_redirect");
		const target = getSafeRedirect(redirectUrl);
		redirect(303, target);
	},
};
