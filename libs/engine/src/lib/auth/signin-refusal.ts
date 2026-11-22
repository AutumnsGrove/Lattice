/**
 * What a refused sign-in is called, on both sides of the wire.
 *
 * Heartwood refuses two identities on purpose — a blocked signup, and an account
 * whose ban is still running — and login.grove.place is the only place that can
 * explain the refusal to the person (#1719). They have to agree on how the
 * refusal is named, and they cannot share a module for the *code* alone:
 *
 * - On a JSON call (email OTP), Better Auth returns the APIError's `code` as-is.
 * - On the OAuth redirect, it keeps only the `message` and discards the code
 *   (`better-auth/dist/oauth2/link-account.mjs`: `error: e.message`, then
 *   `redirectOnError(result.error.split(" ").join("_"))`).
 *
 * So the sentence is the identifier on one of the paths, which is exactly the
 * kind of thing that drifts when it is written down twice. It is written once
 * here: Heartwood sends it, login recognises it, and a test pins the transform.
 *
 * Deliberately vague about *why* — naming the rule, the domain, or the reason
 * tells an operator what to rotate next. The real reason is in the server log.
 */
export const SIGNIN_REFUSAL_MESSAGE =
	"We're not able to create an account with this email address. If you think that's a mistake, write to hello@grove.place.";

/**
 * The same sentence as Better Auth puts it in an OAuth redirect.
 *
 * Spaces become underscores; nothing else is touched, and `URLSearchParams`
 * decodes the rest of the percent-encoding before it can be compared.
 */
export const SIGNIN_REFUSAL_REDIRECT_PARAM = SIGNIN_REFUSAL_MESSAGE.split(" ").join("_");
