/**
 * Signup identity blocks — Heartwood boundary
 *
 * Thin wrapper around the shared rules in
 * `@autumnsgrove/lattice/server/security/signup-blocks`, so the call sites in
 * `auth/index.ts` stay one line each and the logging lives in one place.
 *
 * Failure policy: **fail open, loudly.** A block list that fails to load must
 * not lock every writer out of Grove, but it also must not restart protecting
 * people quietly. So a load error is logged as an admin error and the signup is
 * allowed — visible in logs, not in the person's way.
 */

import {
	describeBlock,
	findBlock,
	loadSignupBlocks,
	normalizeIdentity,
	type SignupBlock,
} from "@autumnsgrove/lattice/server/security/signup-blocks";
import { logGroveError } from "@autumnsgrove/lattice/errors";
import { HW_SVC_ERRORS } from "../errors.js";
import type { Env } from "../types.js";

export interface SignupIdentityCheck {
	blocked: boolean;
	/** Present when blocked — for server logs, never for the user. */
	block?: SignupBlock;
}

/**
 * Paths where a blocked identity must be refused before Better Auth runs.
 *
 * Only the code-send path is here: OAuth has no email at request time (the
 * `user.create.before` hook covers it), and blocking sign-in would also lock
 * out accounts that existed before the block landed.
 */
export const SIGNUP_BLOCKED_PATHS: ReadonlySet<string> = new Set([
	"/email-otp/send-verification-otp",
]);

/**
 * Pull the email out of a Better Auth hook context.
 *
 * `ctx.body` is usually already parsed by the time before-hooks run; the request
 * fallback covers paths where it is not. The body is cloned so a caller further
 * down the chain can still read it.
 */
export async function emailFromAuthContext(ctx: {
	body?: unknown;
	request?: Request;
}): Promise<string | null> {
	const body = ctx.body as { email?: unknown } | undefined;
	if (body && typeof body.email === "string") return body.email;

	if (ctx.request) {
		try {
			const parsed = (await ctx.request.clone().json()) as { email?: unknown };
			if (typeof parsed?.email === "string") return parsed.email;
		} catch {
			return null;
		}
	}

	return null;
}

/**
 * Is this address on the deny list?
 *
 * Checks the normalized identity (lowercased, `+alias` removed) so one rule on
 * a domain catches every alias the operator can mint.
 */
export async function checkSignupIdentity(
	env: Env,
	email: string | null | undefined,
): Promise<SignupIdentityCheck> {
	const identity = normalizeIdentity(email);
	if (!identity) return { blocked: false };

	try {
		// The deny list lives in grove-engine-db, which Heartwood binds as ENGINE_DB.
		// `env.DB` here is groveauth — reading the wrong one would throw "no such
		// table" and then fail open, so every gate would silently allow.
		const blocks = await loadSignupBlocks(env.ENGINE_DB);
		const block = findBlock(identity, blocks);
		if (!block) return { blocked: false };

		console.warn(`[SignupBlocks] Rejected ${identity.normalized} — ${describeBlock(block)}`);
		return { blocked: true, block };
	} catch (err) {
		logGroveError("Heartwood", HW_SVC_ERRORS.SIGNUP_BLOCK_CHECK_FAILED, {
			detail: `signup_blocks lookup failed for ${identity.domain}: ${String(err)}`,
		});
		return { blocked: false };
	}
}
