import type { PageServerLoad } from "./$types";
import {
	PLANT_SIGNUP_URL,
	REF_COOKIE,
	REF_COOKIE_OPTIONS,
	resolveRef,
	withRef,
} from "$lib/server/ref-tracking";

/**
 * Reads cookies and the query string, so it must run at request time.
 * Without this, the prerender crawler can reach /hello through links from
 * prerendered pages and fail on `cookies`.
 */
export const prerender = false;

/**
 * Read the acquisition ref the business card QR carries, keep it in a cookie so
 * it survives a browse-around, and hand the page a signup URL that forwards it.
 *
 * Visits without a ref (or with an unsanitizable one) return `ref: null` and an
 * untouched signup URL.
 */
export const load: PageServerLoad = async ({ url, cookies }) => {
	const ref = resolveRef(url, cookies.get(REF_COOKIE));

	if (ref) {
		cookies.set(REF_COOKIE, ref, {
			...REF_COOKIE_OPTIONS,
			secure: url.protocol === "https:",
		});
	}

	return {
		ref,
		plantSignupUrl: withRef(PLANT_SIGNUP_URL, ref),
	};
};
