/**
 * Human check — Turnstile gate for Plant's signup
 *
 * The site key has been configured in `wrangler.toml` since launch and nothing
 * ever used it (#1678). Before this, a scripted POST straight at the form actions
 * could walk the whole signup: auth callback → profile → plans → tenant.
 *
 * The `grove_verified` cookie is shared with Aspen, so a human who has already
 * solved a challenge on their blog is not asked twice — same name, same signing
 * key, same `.grove.place` domain.
 *
 * Honest scope: this does not stop an agent driving a real browser. It removes
 * the "no challenge at all" property, which is what makes scripted signups cheap.
 */

import {
	TURNSTILE_COOKIE_NAME,
	createVerificationCookie,
	validateVerificationCookie,
	getVerificationCookieOptions,
} from "@autumnsgrove/lattice/server/services/turnstile";
import type { Cookies } from "@sveltejs/kit";

/** Where the shared cookie lives so plant → login → aspen share one challenge. */
export const COOKIE_DOMAIN = ".grove.place";

interface PlatformEnv {
	TURNSTILE_SECRET_KEY?: string;
	TURNSTILE_SITE_KEY?: string;
}

export function turnstileEnv(platform: unknown): PlatformEnv {
	return ((platform as { env?: PlatformEnv } | undefined)?.env ?? {}) as PlatformEnv;
}

/**
 * Dev-stack bypass.
 *
 * Scoped to a localhost origin — deliberately not a query param or an env flag
 * that could be flipped in production. If you can reach it from a real hostname,
 * you have to solve the challenge.
 */
export function isLocalDevOrigin(origin: string | undefined): boolean {
	if (!origin) return false;
	try {
		const host = new URL(origin).hostname;
		return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
	} catch {
		return false;
	}
}

/**
 * Has this browser already proven it is a human?
 *
 * True when the signed cookie is valid, or when we are on the local dev stack.
 */
export async function isHumanVerified(
	cookies: Cookies,
	secretKey: string | undefined,
	origin: string | undefined,
): Promise<boolean> {
	if (isLocalDevOrigin(origin)) return true;
	if (!secretKey) return false;

	const cookie = cookies.get(TURNSTILE_COOKIE_NAME);
	return await validateVerificationCookie(cookie, secretKey);
}

/** Verify a Turnstile token with Cloudflare and, on success, set the shared cookie. */
export async function completeHumanCheck(
	cookies: Cookies,
	token: string,
	secretKey: string,
	remoteIp?: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
	const form = new FormData();
	form.append("secret", secretKey);
	form.append("response", token);
	if (remoteIp) form.append("remoteip", remoteIp);

	let outcome: { success?: boolean; "error-codes"?: string[] };
	try {
		const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
			method: "POST",
			body: form,
		});
		outcome = (await response.json()) as typeof outcome;
	} catch {
		return { ok: false, message: "We couldn't reach the verification service." };
	}

	if (!outcome.success) {
		console.warn("[Turnstile] Verification failed:", outcome["error-codes"]);
		return { ok: false, message: "That verification didn't take. Please try again." };
	}

	const value = await createVerificationCookie(secretKey);
	cookies.set(TURNSTILE_COOKIE_NAME, value, getVerificationCookieOptions(COOKIE_DOMAIN));

	return { ok: true };
}

/**
 * Safe redirect target: a relative path only. `//evil.com` and absolute URLs are
 * rejected — this is reachable before anyone is signed in.
 */
export function safeReturnTo(target: string | null | undefined, fallback = "/profile"): string {
	if (!target) return fallback;
	if (!target.startsWith("/") || target.startsWith("//")) return fallback;
	return target;
}
