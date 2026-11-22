/**
 * Is this subdomain switched off, rather than never having existed?
 *
 * Every tenant lookup in the hook filters on `active = 1`, and that has to stay
 * true: a suspended grove must not resolve, must not serve its theme, and must
 * not outlive a cache flush (#1677). So this asks a second, narrower question on
 * the not-found path only — "is there a row here that somebody turned off?" —
 * and returns a boolean. No config, no theme, no owner address.
 *
 * The distinction is the whole of #1720: an owner seeing "this garden doesn't
 * exist yet" is being told their grove was deleted, by us, in our own welcome
 * voice, with an invitation to sign up again.
 */

type Database = D1Database;

/**
 * True when a `tenants` row exists for this subdomain and is inactive.
 *
 * False for an unknown subdomain (a genuine 404 — the current copy is right for
 * that) and false for an active one (which never reaches this path).
 */
export async function isSuspendedSubdomain(
	db: Database | undefined,
	subdomain: string,
): Promise<boolean> {
	if (!db) return false;

	try {
		const row = await db
			.prepare("SELECT 1 AS off FROM tenants WHERE subdomain = ? AND active = 0 LIMIT 1")
			.bind(subdomain)
			.first<{ off: number }>();
		return Boolean(row?.off);
	} catch (err) {
		// A failure here must not turn a suspension into a 404 or, worse, a 500 on
		// every page of a grove that is fine. The not-found page is the safe answer.
		console.error("[Aspen] Suspension lookup failed:", err);
		return false;
	}
}

/**
 * Does the viewer own the suspended grove?
 *
 * Deliberately a boolean and nothing else. The suspended page must not carry the
 * tenant's name, theme, or address — the owner already knows them, and a stranger
 * must not learn them (#1720).
 */
export async function ownsSuspendedSubdomain(
	db: Database | undefined,
	subdomain: string,
	viewerEmail: string | null | undefined,
): Promise<boolean> {
	if (!db || !viewerEmail) return false;

	try {
		const row = await db
			.prepare(
				`SELECT 1 AS mine FROM tenants
          WHERE subdomain = ? AND active = 0 AND lower(email) = lower(?)
          LIMIT 1`,
			)
			.bind(subdomain, viewerEmail)
			.first<{ mine: number }>();
		return Boolean(row?.mine);
	} catch (err) {
		console.error("[Aspen] Suspension ownership lookup failed:", err);
		return false;
	}
}
