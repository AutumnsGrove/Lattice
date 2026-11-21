/**
 * Recognising a refused sign-in on the OAuth return trip.
 *
 * The block hook throws a `FORBIDDEN` APIError with a careful sentence attached.
 * On a JSON call the sentence rides along with a `code`, but on the OAuth
 * redirect Better Auth keeps only the message and discards the code — it
 * redirects with `error=<message with spaces as underscores>`. So the sentence
 * *is* the identifier here, and it comes from one shared constant rather than a
 * second copy that drifts (#1719).
 *
 * Everything else is treated as "the round trip did not finish", never as a
 * refusal: Better Auth emits its own codes for a provider outage, an account
 * linking conflict, a cancelled consent screen, and a missing code, and telling
 * any of those people their account is unavailable would be a lie with an appeal
 * link attached.
 */

import { SIGNIN_REFUSAL_REDIRECT_PARAM } from "@autumnsgrove/lattice/auth/signin-refusal";

/**
 * Is this Better Auth `?error=` value our refusal?
 *
 * Compared after the same transform Better Auth applies (`" ".join("_")`) and
 * after `URLSearchParams` has decoded the percent-encoding, which leaves
 * punctuation alone.
 */
export function isRefusalRedirect(errorParam: string | null): boolean {
	if (!errorParam) return false;
	return errorParam === SIGNIN_REFUSAL_REDIRECT_PARAM;
}
