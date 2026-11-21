/**
 * Email-code sign-in helpers
 *
 * Input normalization and error-message mapping for the "continue with email"
 * flow. The code itself is generated, stored (hashed), and verified by
 * Heartwood's Better Auth emailOTP plugin — this module only prepares what we
 * send it and translates what comes back.
 */

import { EMAIL_OTP_LENGTH } from "@autumnsgrove/lattice/auth/login/email-code";

const MAX_EMAIL_LENGTH = 254;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Friendly, user-facing messages for every way this flow can fail. */
export const EMAIL_CODE_MESSAGES = {
	INVALID_EMAIL: "That doesn't look like an email address. Mind checking it?",
	INVALID_CODE_FORMAT: `Enter the ${EMAIL_OTP_LENGTH}-digit code from your email.`,
	SEND_FAILED: "We couldn't send your code just now. Please try again in a moment.",
	RATE_LIMITED: "Too many tries. Please wait a few minutes and try again.",
	CODE_MISMATCH: "That code doesn't match. Check it and try again.",
	CODE_EXPIRED: "That code has expired. Send yourself a fresh one.",
	CODE_USED_UP: "That code has been used up. Send yourself a fresh one.",
	VERIFY_FAILED: "We couldn't sign you in. Please try again.",
	SERVICE_UNAVAILABLE: "Auth service unavailable. Please try again shortly.",
	/**
	 * Heartwood refused this identity on purpose. Deliberately vague about which
	 * rule matched — naming it tells the operator what to rotate next — and it is
	 * never a form-level error: it gets its own page state with a way to appeal.
	 */
	IDENTITY_UNAVAILABLE:
		"This account isn't available. If you think that's a mistake, you can appeal and a person will read it.",
} as const;

/**
 * Heartwood's refusal status for a blocked signup or a banned account.
 *
 * Both refusals are a 403 from the Better Auth hooks, and both mean the same
 * thing to the person: we said no, on purpose, and there is a way to ask again.
 * The *reasons* stay in the server log — see `HW_SVC_ERRORS`.
 *
 * 403 alone is not enough to conclude that: Better Auth answers a burned-out code
 * with `TOO_MANY_ATTEMPTS`, also a 403. Those codes are listed below, so a
 * refusal is "403 and not one of the codes we know" — which is why
 * `isRefusal` takes both.
 */
export const REFUSAL_STATUS = 403;

/** Better Auth's own 403s on the OTP endpoints — an expired code, not a person. */
const OTP_CODES = new Set(["INVALID_OTP", "OTP_EXPIRED", "TOO_MANY_ATTEMPTS"]);

/** True when this upstream failure is a deliberate refusal, not a fault. */
export function isRefusal(status: number, code?: string): boolean {
	if (status !== REFUSAL_STATUS) return false;
	return !(code && OTP_CODES.has(code));
}

/** Trim + lowercase an email; null when it isn't plausibly an address. */
export function normalizeEmail(raw: FormDataEntryValue | null | undefined): string | null {
	if (typeof raw !== "string") return null;
	const email = raw.trim().toLowerCase();
	if (email.length === 0 || email.length > MAX_EMAIL_LENGTH) return null;
	return EMAIL_PATTERN.test(email) ? email : null;
}

/**
 * Strip the spaces/dashes people paste in ("123 456", "123-456") and require
 * exactly EMAIL_OTP_LENGTH digits. Null when the shape is wrong.
 */
export function normalizeCode(raw: FormDataEntryValue | null | undefined): string | null {
	if (typeof raw !== "string") return null;
	const code = raw.replace(/[\s-]/g, "");
	return new RegExp(`^\\d{${EMAIL_OTP_LENGTH}}$`).test(code) ? code : null;
}

/**
 * HTTP status for the browser when a Heartwood call fails: rate limits stay
 * 429, upstream outages are 502 (not our caller's fault), the rest are 400.
 */
export function statusForUpstreamFailure(status: number): 400 | 429 | 502 {
	if (status === 429) return 429;
	return status >= 500 ? 502 : 400;
}

/** Map a failed Heartwood send-code response to a user-facing message. */
export function messageForSendFailure(status: number, code?: string): string {
	if (isRefusal(status, code)) return EMAIL_CODE_MESSAGES.IDENTITY_UNAVAILABLE;
	if (status === 429) return EMAIL_CODE_MESSAGES.RATE_LIMITED;
	if (status === 400) return EMAIL_CODE_MESSAGES.INVALID_EMAIL;
	return EMAIL_CODE_MESSAGES.SEND_FAILED;
}

/** Map a failed Heartwood verify response (status + Better Auth `code`) to a message. */
export function messageForVerifyFailure(status: number, code?: string): string {
	if (status === 429) return EMAIL_CODE_MESSAGES.RATE_LIMITED;
	switch (code) {
		case "INVALID_OTP":
			return EMAIL_CODE_MESSAGES.CODE_MISMATCH;
		case "OTP_EXPIRED":
			return EMAIL_CODE_MESSAGES.CODE_EXPIRED;
		case "TOO_MANY_ATTEMPTS":
			return EMAIL_CODE_MESSAGES.CODE_USED_UP;
		default:
			// Checked after the codes above so a burned-out code stays a burned-out
			// code. A 403 with no OTP code is the hooks refusing the identity.
			return isRefusal(status, code)
				? EMAIL_CODE_MESSAGES.IDENTITY_UNAVAILABLE
				: EMAIL_CODE_MESSAGES.VERIFY_FAILED;
	}
}
