/**
 * Short links access for Aspen's Arbor.
 *
 * Form actions and API routes don't run the Arbor layout's load, so each one has
 * to prove the signed-in Wanderer owns this grove itself. This is that proof, in
 * one place, handing back the database and the grove the links belong to.
 */

import { getVerifiedTenantId, type SessionError } from "@autumnsgrove/lattice/auth/session";
import { LINK_ERRORS } from "@autumnsgrove/lattice/errors";
import type { GroveErrorDef } from "@autumnsgrove/lattice/errors";
import { getGroveOwner, type LinkOwner } from "@autumnsgrove/lattice/services/short-links";

export type GroveLinkAccess =
	| { ok: true; db: D1Database; owner: LinkOwner; userId: string }
	| { ok: false; status: number; error: GroveErrorDef };

export async function requireGroveLinkAccess(
	platform: App.Platform | undefined,
	locals: App.Locals,
): Promise<GroveLinkAccess> {
	const db = platform?.env?.DB;
	if (!db) return { ok: false, status: 500, error: LINK_ERRORS.DB_NOT_AVAILABLE };
	if (!locals.user || !locals.tenantId) {
		return { ok: false, status: 401, error: LINK_ERRORS.UNAUTHORIZED };
	}

	try {
		await getVerifiedTenantId(db, locals.tenantId, locals.user);
	} catch (err) {
		const status = (err as SessionError).status ?? 403;
		return { ok: false, status, error: LINK_ERRORS.UNAUTHORIZED };
	}

	const owner = await getGroveOwner(db, locals.tenantId);
	if (!owner) return { ok: false, status: 403, error: LINK_ERRORS.UNAUTHORIZED };

	return { ok: true, db, owner, userId: locals.user.id };
}
