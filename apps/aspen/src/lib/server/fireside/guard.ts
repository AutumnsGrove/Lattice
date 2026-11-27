/**
 * The gates every Fireside route passes before it does anything.
 *
 * Four of them, in this order, and the order is the point:
 *
 * 1. **Beta.** Fireside ships on the beta deployment, and a hidden button is not
 *    a gate — a live API is a feature anyone can `curl`. So a non-beta deployment
 *    answers `404`, exactly like a route that does not exist.
 * 2. **Signed in.** A writer with no session gets `401`.
 * 3. **A tenant.** Fireside is tenant-scoped data; no tenant is a bad request.
 * 4. **The plan.** `checkFeatureAccess(db, tenantId, "ai")`, and it **fails open**:
 *    it is a billing question, not a safety one, so a database hiccup must not
 *    take the feature away from someone paying for it.
 */

import { isBetaDeployment } from "$lib/server/beta";
import { checkFeatureAccess } from "@autumnsgrove/lattice/server/billing";
import {
	API_ERRORS,
	ARBOR_ERRORS,
	logGroveError,
	throwGroveError,
} from "@autumnsgrove/lattice/errors";

export interface FiresideContext {
	db: D1Database;
	tenantId: string;
	userId: string;
	/** Say 404 when there is nothing to find; a 403 would confirm it exists. */
}

interface Event {
	locals: App.Locals;
	url: URL;
	platform?: App.Platform;
}

export async function requireFireside({ locals, url, platform }: Event): Promise<FiresideContext> {
	if (!isBetaDeployment(locals, url)) {
		throwGroveError(404, API_ERRORS.RESOURCE_NOT_FOUND, "Fireside");
	}

	const db = platform?.env?.DB;
	if (!db) {
		throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "Fireside");
	}

	if (!locals.user) {
		throwGroveError(401, API_ERRORS.UNAUTHORIZED, "Fireside");
	}

	const tenantId = locals.tenantId;
	if (!tenantId) {
		throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "Fireside");
	}

	const plan = await checkFeatureAccess(db, tenantId, "ai").catch((cause) => {
		// Fail open, loudly: a broken billing table must not read as "not on your
		// plan". The log is the only trace that the gate did not answer.
		logGroveError("Fireside", ARBOR_ERRORS.DB_NOT_AVAILABLE, {
			detail: "AI plan gate failed; allowing the request",
			cause,
		});
		return { allowed: true };
	});

	if (!plan.allowed) {
		throwGroveError(403, API_ERRORS.FORBIDDEN, "Fireside", {
			detail: "reason" in plan && plan.reason ? plan.reason : "AI features are not on this plan",
		});
	}

	return { db, tenantId, userId: locals.user.id };
}
