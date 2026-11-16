/**
 * Verification page (Shade)
 *
 * Hands the page the Turnstile site key, and bounces anyone who has already
 * earned the cookie straight back to where they were going.
 */

import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { isHumanVerified, safeReturnTo, turnstileEnv } from "$lib/server/human-check";

export const load: PageServerLoad = async ({ cookies, platform, url }) => {
	const returnTo = safeReturnTo(url.searchParams.get("returnTo"));
	const env = turnstileEnv(platform);

	if (await isHumanVerified(cookies, env.TURNSTILE_SECRET_KEY, url.origin)) {
		redirect(302, returnTo);
	}

	return {
		siteKey: env.TURNSTILE_SITE_KEY ?? "",
		returnTo,
	};
};
