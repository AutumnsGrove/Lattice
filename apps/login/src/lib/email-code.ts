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
} as const;

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
export function messageForSendFailure(status: number): string {
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
			return EMAIL_CODE_MESSAGES.VERIFY_FAILED;
	}
}
