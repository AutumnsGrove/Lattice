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
		const blocks = await loadSignupBlocks(env.DB);
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
