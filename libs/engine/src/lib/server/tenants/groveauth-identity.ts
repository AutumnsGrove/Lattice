/**
 * groveauth identity removal
 *
 * `removeTenant()` sweeps every table keyed on `tenant_id`. The Better Auth
 * identity is not one of those: it lives in a different database, and it is
 * keyed on the person, not the blog. Removing `emmareed` by hand on 2026-11-16
 * still took 14 statements against `groveauth` afterwards, because a tenant row
 * and a login identity are different things and nothing joined them for us.
 *
 * This is that half, as a registry rather than a memory. It follows the same two
 * rules as `tenant-tables.ts`: the list lives in one place, and a column need
 * not be called `user_id` (`ba_verification` uses `identifier` for the email,
 * `failed_attempts` uses `email`).
 *
 * Three things this deliberately does not do:
 *
 * - **Touch `rate_limits`.** Its keys are opaque strings assembled by whichever
 *   limiter wrote them. Guessing at key formats to delete rows that expire on
 *   their own is how you delete the wrong thing.
 * - **Resolve the identity alone.** `ba_user.tenant_id` is often null — the
 *   mapping normally lives in `engine.users.groveauth_id`, which the tenant
 *   sweep deletes. Callers resolve before the sweep and pass `knownUserIds`.
 * - **Decide whether the person has other blogs.** That is the caller's job:
 *   an identity shared with a surviving tenant must not be deleted. See
 *   `POST /tenant/remove`, which resolves first and refuses to guess.
 */

import type { RemovalDatabase } from "./remove-tenant";

// ============================================================================
// Registry
// ============================================================================

export interface IdentityTable {
	/** Table in `groveauth`. */
	table: string;
	/** Column holding the groveauth user id (`ba_user.id`), if the table has one. */
	userIdColumn?: string;
	/** Column holding the email address, if the table has one. */
	emailColumn?: string;
}

/**
 * Every table that holds a person's identity rows, **children before parents**.
 *
 * `ba_session` before `ba_user`, and so on: deleting the parent first cascades
 * or fails mid-sweep, and either way leaves the rest to be found by hand. The
 * order here is the order the sweep runs in, and `groveauth-identity.test.ts`
 * asserts `ba_user` is last.
 */
export const GROVEAUTH_IDENTITY_TABLES: readonly IdentityTable[] = [
	{ table: "ba_session", userIdColumn: "user_id" },
	{ table: "ba_account", userIdColumn: "user_id" },
	{ table: "ba_passkey", userIdColumn: "user_id" },
	{ table: "ba_two_factor", userIdColumn: "user_id" },
	{ table: "ba_verification", emailColumn: "identifier" },
	{ table: "device_codes", userIdColumn: "user_id" },
	{ table: "refresh_tokens", userIdColumn: "user_id" },
	{ table: "user_sessions", userIdColumn: "user_id" },
	{ table: "user_client_preferences", userIdColumn: "user_id" },
	{ table: "user_subscriptions", userIdColumn: "user_id" },
	{ table: "subscription_audit_log", userIdColumn: "user_id" },
	{ table: "audit_log", userIdColumn: "user_id" },
	{ table: "failed_attempts", emailColumn: "email" },
	// The identity itself, last — everything above references it.
	{ table: "ba_user", userIdColumn: "id", emailColumn: "email" },
];

// ============================================================================
// Types
// ============================================================================

/** The identity rows belonging to one person, as resolved before a sweep. */
export interface IdentitySet {
	userIds: string[];
	/** Lowercased — `ba_user.email` is compared case-insensitively here. */
	emails: string[];
}

export interface IdentityCount {
	table: string;
	rows: number;
}

export interface IdentityFailure {
	table: string;
	error: string;
}

export interface IdentityRemovalResult {
	dryRun: boolean;
	/** Per-table row counts, including tables with nothing in them. */
	plan: IdentityCount[];
	totalRows: number;
	deleted: number;
	/** Rows still present after a real sweep. Must be empty. */
	leftovers: IdentityCount[];
	failures: IdentityFailure[];
}

export interface IdentityTarget {
	tenantId: string;
	email?: string | null;
	/**
	 * `engine.users.groveauth_id` values for this tenant.
	 *
	 * Must be read **before** the tenant sweep deletes `engine.users`; afterwards
	 * this is the link that no longer exists.
	 */
	knownUserIds?: readonly string[];
}

// ============================================================================
// Resolving
// ============================================================================

/**
 * Work out which groveauth identities belong to a tenant.
 *
 * Tries every link we have, because none of them is reliable alone:
 * `ba_user.tenant_id` is null for accounts created before it was populated,
 * `ba_user.email` can have changed on one side but not the other, and
 * `engine.users.groveauth_id` is only readable before the sweep.
 *
 * An identity is only returned when it matches. This never answers "no identity"
 * by falling back to something approximate — a removal that guesses at who a
 * person is has stopped being a removal and become an incident.
 */
export async function resolveIdentity(
	db: RemovalDatabase,
	target: IdentityTarget,
): Promise<IdentitySet> {
	const userIds = new Set<string>(target.knownUserIds ?? []);
	const emails = new Set<string>();

	const email = target.email?.trim().toLowerCase();
	if (email) emails.add(email);

	// Rows keyed on the tenant still tell us who they are.
	const byTenant = await db
		.prepare("SELECT id, email FROM ba_user WHERE tenant_id = ?")
		.bind(target.tenantId)
		.all<{ id: string; email: string }>();
	for (const row of byTenant.results ?? []) {
		if (row.id) userIds.add(row.id);
		if (row.email) emails.add(row.email.trim().toLowerCase());
	}

	// And rows keyed on the address tell us the ids we are missing.
	if (email) {
		const byEmail = await db
			.prepare("SELECT id FROM ba_user WHERE lower(email) = ?")
			.bind(email)
			.all<{ id: string }>();
		for (const row of byEmail.results ?? []) {
			if (row.id) userIds.add(row.id);
		}
	}

	return { userIds: [...userIds], emails: [...emails] };
}

/**
 * True when the identity is still referenced by a tenant that is not being
 * removed.
 *
 * A person may have two blogs on one login. Deleting the identity because one
 * of them went away locks them out of the other, which is both wrong and the
 * kind of wrong that gets discovered by the person, not by us.
 */
export async function identityHasOtherTenants(
	db: RemovalDatabase,
	identities: IdentitySet,
	removingTenantId: string,
): Promise<string[]> {
	const others = new Set<string>();
	if (identities.userIds.length === 0) return [];

	const rows = await db
		.prepare(
			`SELECT DISTINCT tenant_id FROM ba_user
			 WHERE tenant_id IS NOT NULL AND id IN (${identities.userIds.map(() => "?").join(", ")})`,
		)
		.bind(...identities.userIds)
		.all<{ tenant_id: string }>();

	for (const row of rows.results ?? []) {
		if (row.tenant_id && row.tenant_id !== removingTenantId) others.add(row.tenant_id);
	}

	return [...others];
}

// ============================================================================
// Planning and removal
// ============================================================================

/**
 * Build the `WHERE` fragment for one table.
 *
 * Both columns are bound so an id or an address can never be concatenated into
 * the statement. A single `count(*)` over the OR counts each row once, which
 * matters for `ba_user` — it matches on both `id` and `email`, and summing two
 * counts would report two rows for one person.
 */
function identityPredicate(
	entry: IdentityTable,
	identities: IdentitySet,
): { sql: string; params: string[] } | null {
	const clauses: string[] = [];
	const params: string[] = [];

	if (entry.userIdColumn && identities.userIds.length > 0) {
		clauses.push(`${entry.userIdColumn} IN (${identities.userIds.map(() => "?").join(", ")})`);
		params.push(...identities.userIds);
	}
	if (entry.emailColumn && identities.emails.length > 0) {
		clauses.push(`${entry.emailColumn} IN (${identities.emails.map(() => "?").join(", ")})`);
		params.push(...identities.emails);
	}

	if (clauses.length === 0) return null;
	return { sql: clauses.join(" OR "), params };
}

async function countIdentityRows(
	db: RemovalDatabase,
	identities: IdentitySet,
): Promise<IdentityCount[]> {
	const counts: IdentityCount[] = [];

	for (const entry of GROVEAUTH_IDENTITY_TABLES) {
		const predicate = identityPredicate(entry, identities);
		if (!predicate) {
			counts.push({ table: entry.table, rows: 0 });
			continue;
		}

		const row = await db
			.prepare(`SELECT count(*) AS n FROM ${entry.table} WHERE ${predicate.sql}`)
			.bind(...predicate.params)
			.first<{ n: number }>();

		counts.push({ table: entry.table, rows: Number(row?.n ?? 0) });
	}

	return counts;
}

/**
 * Count the identity rows a removal would take, without taking them.
 *
 * Every table is counted, including the empty ones — a clean sweep is showing
 * zero, not assuming zero.
 */
export async function planIdentityRemoval(
	db: RemovalDatabase,
	identities: IdentitySet,
): Promise<IdentityCount[]> {
	return countIdentityRows(db, identities);
}

/**
 * Delete a person's identity rows, children first, and verify nothing survived.
 *
 * Returns rather than throws when a statement fails: the sweep keeps going, and
 * the caller decides whether a partial identity deletion is acceptable. It never
 * is for a removal, so `POST /tenant/remove` turns a non-empty `failures` or
 * `leftovers` into a thrown error and the removal reports the step as failed.
 */
export async function removeIdentity(
	db: RemovalDatabase,
	identities: IdentitySet,
	options: { dryRun?: boolean } = {},
): Promise<IdentityRemovalResult> {
	const dryRun = options.dryRun ?? false;
	const plan = await countIdentityRows(db, identities);
	const totalRows = plan.reduce((sum, row) => sum + row.rows, 0);

	if (dryRun) {
		return {
			dryRun: true,
			plan,
			totalRows,
			deleted: 0,
			leftovers: [],
			failures: [],
		};
	}

	const failures: IdentityFailure[] = [];
	let deleted = 0;

	for (const entry of GROVEAUTH_IDENTITY_TABLES) {
		const predicate = identityPredicate(entry, identities);
		if (!predicate) continue;

		try {
			await db
				.prepare(`DELETE FROM ${entry.table} WHERE ${predicate.sql}`)
				.bind(...predicate.params)
				.run();
			deleted += plan.find((row) => row.table === entry.table)?.rows ?? 0;
		} catch (err) {
			failures.push({
				table: entry.table,
				error: err instanceof Error ? err.message : String(err),
			});
		}
	}

	const leftovers = (await countIdentityRows(db, identities)).filter((row) => row.rows > 0);

	return { dryRun: false, plan, totalRows, deleted, leftovers, failures };
}

/** Human-readable identity plan — the part of a dry run that says who. */
export function formatIdentityPlan(plan: readonly IdentityCount[]): string {
	const rows = plan.filter((row) => row.rows > 0);
	if (rows.length === 0) return "groveauth: nothing to remove";

	return ["groveauth:", ...rows.map((row) => `  delete ${row.table}: ${row.rows}`)].join("\n");
}
