/**
 * Acquisition ref tracking (#1426)
 *
 * The business card QR encodes a short slug — `grove.place/hello?ref=card`. The
 * value is persisted in a cookie so it survives a browse-around before someone
 * signs up, forwarded to Plant on the signup CTA, and stored on the email
 * signup row so card-driven signups can be counted.
 *
 * The validation rules themselves live in the engine
 * (`@autumnsgrove/lattice/utils`), because Pulse uses the same ones for page-view
 * metadata. This module adds only what is landing-specific: the cookie and the
 * signup destination. It holds no server-only imports, so the route load and the
 * signup endpoint share exactly one definition.
 */

import { REF_MAX_LENGTH, REF_PARAM, sanitizeRef } from "@autumnsgrove/lattice/utils";

export { REF_MAX_LENGTH, REF_PARAM, sanitizeRef };

/** Cookie that keeps a ref attached to a visitor after the first page view. */
export const REF_COOKIE = "grove_ref";

/** Where tracked "Plant Your Blog" links send people. */
export const PLANT_SIGNUP_URL = "https://plant.grove.place";

/** How long a ref stays with a visitor. */
export const REF_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

/**
 * Cookie options for the ref. The caller adds `secure` when the request is
 * served over https, so local development still works.
 */
export const REF_COOKIE_OPTIONS = {
	path: "/",
	maxAge: REF_COOKIE_MAX_AGE_SECONDS,
	httpOnly: true,
	sameSite: "lax",
} as const;

/**
 * A ref arriving in the URL wins over the stored cookie — a newer card or link
 * should override what the visitor scanned last month.
 */
export function resolveRef(url: URL, cookieValue?: string | null): string | null {
	return sanitizeRef(url.searchParams.get(REF_PARAM)) ?? sanitizeRef(cookieValue);
}

/**
 * Append the ref to a URL, leaving it untouched when there is nothing valid to
 * add. Direct visitors get a clean link with no empty parameter.
 */
export function withRef(baseUrl: string, ref: string | null | undefined): string {
	const valid = sanitizeRef(ref);
	if (!valid) return baseUrl;

	const url = new URL(baseUrl);
	url.searchParams.set(REF_PARAM, valid);
	return url.toString();
}
