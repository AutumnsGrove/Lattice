/**
 * Recognising a refusal on the OAuth return trip (#1719).
 *
 * The failure mode this guards is asymmetric on purpose: telling a blocked
 * person "something went wrong" is a dead end, and telling someone whose
 * provider hiccuped that their account is unavailable is a lie. So the
 * predicate must be narrow — our sentence, and nothing else.
 */

import { describe, it, expect } from "vitest";
import { isRefusalRedirect } from "../oauth-refusal";
import {
	SIGNIN_REFUSAL_MESSAGE,
	SIGNIN_REFUSAL_REDIRECT_PARAM,
} from "@autumnsgrove/lattice/auth/signin-refusal";

describe("isRefusalRedirect", () => {
	it("matches our refusal in the form Better Auth sends it", () => {
		// Better Auth turns every space into an underscore and keeps the rest of
		// the sentence, punctuation and all.
		expect(SIGNIN_REFUSAL_REDIRECT_PARAM).toBe(SIGNIN_REFUSAL_MESSAGE.split(" ").join("_"));
		expect(isRefusalRedirect(SIGNIN_REFUSAL_REDIRECT_PARAM)).toBe(true);
	});

	it("does not treat Better Auth's own failures as a refusal", () => {
		for (const code of [
			"access_denied",
			"state_mismatch",
			"no_code",
			"invalid_code",
			"unable_to_get_user_info",
			"unable_to_link_account",
			"account_already_linked_to_different_user",
			"email_not_found",
			"signup_disabled",
			"please_restart_the_process",
			"internal_server_error",
		]) {
			expect(isRefusalRedirect(code)).toBe(false);
		}
	});

	it("is false for nothing at all", () => {
		expect(isRefusalRedirect(null)).toBe(false);
		expect(isRefusalRedirect("")).toBe(false);
	});

	it("does not match a sentence that merely starts the same way", () => {
		expect(isRefusalRedirect(`${SIGNIN_REFUSAL_REDIRECT_PARAM}_and_more`)).toBe(false);
	});
});
