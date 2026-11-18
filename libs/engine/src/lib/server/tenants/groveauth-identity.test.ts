import { describe, it, expect } from "vitest";
import {
	GROVEAUTH_IDENTITY_TABLES,
	formatIdentityPlan,
	identityHasOtherTenants,
	planIdentityRemoval,
	removeIdentity,
	resolveIdentity,
	type IdentitySet,
} from "./groveauth-identity";
import type { RemovalDatabase } from "./remove-tenant";

/**
 * A stand-in for `groveauth` that understands the two shapes this module uses:
 * `SELECT ... FROM <table> WHERE <predicate>` and `DELETE FROM <table> WHERE ...`.
 *
 * Rows are held per table as `{ user_id?, email?, id?, tenant_id? }` so the same
 * seed exercises both id-keyed and address-keyed tables.
 */
type Row = Record<string, string | null>;

interface FakeAuth {
	rows: Record<string, Row[]>;
	counts: number;
	deletes: { table: string; params: string[] }[];
	failDeleteOn?: string;
}

/**
 * Matches one row against the WHERE clause this module builds.
 *
 * The predicates are only ever `col IN (?, …)`, `col = ?`, `lower(col) = ?`, and
 * `col IS NOT NULL`, joined by AND or OR — never mixed — so the clause can be
 * read back without pretending to be a SQL engine. Splitting on the operators
 * is enough, and where the two are mixed the fake is wrong in the same way both
 * branches would be, which is why the module keeps them separate.
 */
function matches(sql: string, row: Row, params: string[]): boolean {
	const where = /WHERE\s+(.+?)(?:\s+ORDER\s+BY|$)/is.exec(sql.trim())?.[1];
	if (!where) return false;

	const parts = where.split(/\s+(OR|AND)\s+/i);
	let result: boolean | null = null;
	let operator = "AND";
	let paramIndex = 0;

	for (const part of parts) {
		const token = part.trim();
		if (/^(OR|AND)$/i.test(token)) {
			operator = token.toUpperCase();
			continue;
		}

		let value: boolean;
		const notNull = /^(\w+)\s+IS\s+NOT\s+NULL$/i.exec(token);
		const equality = /^(lower\()?(\w+)\)?\s*=\s*\?$/i.exec(token);
		const inList = /^(\w+)\s+IN\s*\(([^)]*)\)$/i.exec(token);

		if (notNull) {
			value = row[notNull[1]] != null;
		} else if (equality) {
			const bound = params[paramIndex++] ?? "";
			const actual = String(row[equality[2]] ?? "");
			value = (equality[1] ? actual.toLowerCase() : actual) === bound;
		} else if (inList) {
			const count = inList[2].split(",").length;
			const values = params.slice(paramIndex, paramIndex + count);
			paramIndex += count;
			value = values.includes(String(row[inList[1]] ?? ""));
		} else {
			value = true;
		}

		result = result === null ? value : operator === "AND" ? result && value : result || value;
	}

	return result ?? false;
}

function fakeAuth(seed: Record<string, Row[]> = {}): { db: RemovalDatabase; state: FakeAuth } {
	const state: FakeAuth = { rows: { ...seed }, counts: 0, deletes: [] };

	const db: RemovalDatabase = {
		prepare(sql: string) {
			const trimmed = sql.trim();
			return {
				bind(...params: unknown[]) {
					const bound = params.map((p) => String(p ?? ""));
					return {
						async first<T>() {
							state.counts++;
							const table = /FROM (\w+)/.exec(trimmed)?.[1] ?? "";
							const rows = state.rows[table] ?? [];
							return {
								n: rows.filter((row) => matches(trimmed, row, bound)).length,
							} as T;
						},
						async all<T>() {
							const rows = (state.rows[/FROM (\w+)/.exec(trimmed)?.[1] ?? ""] ?? []).filter((row) =>
								matches(trimmed, row, bound),
							);
							return { results: rows as T[] };
						},
						async run() {
							const table = /FROM (\w+)/.exec(trimmed)?.[1] ?? "";
							if (state.failDeleteOn === table) throw new Error(`boom: ${table}`);
							const before = state.rows[table] ?? [];
							const kept = before.filter((row) => !matches(trimmed, row, bound));
							state.deletes.push({ table, params: bound });
							state.rows[table] = kept;
							return { changes: before.length - kept.length };
						},
					};
				},
			};
		},
	};

	return { db, state };
}

const identities: IdentitySet = { userIds: ["u-1"], emails: ["spam@example.com"] };

describe("groveauth identity registry", () => {
	it("deletes ba_user last, after everything that references it", () => {
		expect(GROVEAUTH_IDENTITY_TABLES[GROVEAUTH_IDENTITY_TABLES.length - 1].table).toBe("ba_user");
	});

	it("knows the two tables that key on an address rather than a user id", () => {
		const byTable = new Map(GROVEAUTH_IDENTITY_TABLES.map((e) => [e.table, e]));

		// ba_verification identifies by email, not by user id — a sweep that only
		// knew about user_id would leave live verification tokens behind.
		expect(byTable.get("ba_verification")).toMatchObject({ emailColumn: "identifier" });
		expect(byTable.get("failed_attempts")).toMatchObject({ emailColumn: "email" });
	});

	it("every table can be matched by something", () => {
		for (const entry of GROVEAUTH_IDENTITY_TABLES) {
			expect(
				Boolean(entry.userIdColumn || entry.emailColumn),
				`${entry.table} has no way to find its rows`,
			).toBe(true);
		}
	});
});

describe("resolveIdentity", () => {
	it("finds the id from the tenant link, the address link, and the caller", async () => {
		const auth = fakeAuth({
			ba_user: [
				{ id: "u-tenant", email: "other@example.com", tenant_id: "t-1" },
				{ id: "u-email", email: "spam@example.com", tenant_id: null },
			],
		});

		const resolved = await resolveIdentity(auth.db, {
			tenantId: "t-1",
			email: "Spam@Example.com",
			knownUserIds: ["u-engine"],
		});

		expect(resolved.userIds.sort()).toEqual(["u-email", "u-engine", "u-tenant"]);
		// The address is kept lowercase so `failed_attempts` matches.
		expect(resolved.emails).toContain("spam@example.com");
	});

	it("does not invent an identity it cannot find", async () => {
		const auth = fakeAuth();
		const resolved = await resolveIdentity(auth.db, { tenantId: "t-1" });

		expect(resolved).toEqual({ userIds: [], emails: [] });
	});
});

describe("identityHasOtherTenants", () => {
	it("says which other blogs the same login still owns", async () => {
		const auth = fakeAuth({
			ba_user: [
				{ id: "u-1", email: "spam@example.com", tenant_id: "t-1" },
				{ id: "u-1", email: "spam@example.com", tenant_id: "t-kept" },
			],
		});

		expect(await identityHasOtherTenants(auth.db, identities, "t-1")).toEqual(["t-kept"]);
	});

	it("is empty when the login belongs to nothing else", async () => {
		const auth = fakeAuth({
			ba_user: [{ id: "u-1", email: "spam@example.com", tenant_id: "t-1" }],
		});

		expect(await identityHasOtherTenants(auth.db, identities, "t-1")).toEqual([]);
	});
});

describe("removeIdentity", () => {
	it("counts every table, including the empty ones", async () => {
		const auth = fakeAuth();
		const plan = await planIdentityRemoval(auth.db, identities);

		expect(plan).toHaveLength(GROVEAUTH_IDENTITY_TABLES.length);
		expect(plan.every((row) => row.rows === 0)).toBe(true);
		expect(auth.state.counts).toBe(GROVEAUTH_IDENTITY_TABLES.length);
	});

	it("counts ba_user once even though it matches on both id and address", async () => {
		const auth = fakeAuth({
			ba_user: [{ id: "u-1", email: "spam@example.com", tenant_id: "t-1" }],
		});

		const plan = await planIdentityRemoval(auth.db, identities);
		expect(plan.find((row) => row.table === "ba_user")?.rows).toBe(1);
	});

	it("is a dry run when asked, and touches nothing", async () => {
		const auth = fakeAuth({
			ba_user: [{ id: "u-1", email: "spam@example.com", tenant_id: "t-1" }],
		});

		const result = await removeIdentity(auth.db, identities, { dryRun: true });

		expect(result.dryRun).toBe(true);
		expect(result.totalRows).toBe(1);
		expect(auth.state.deletes).toHaveLength(0);
	});

	it("deletes children before ba_user and verifies nothing survived", async () => {
		const auth = fakeAuth({
			ba_session: [{ id: "s-1", user_id: "u-1" }],
			ba_account: [{ id: "a-1", user_id: "u-1" }],
			ba_verification: [{ id: "v-1", identifier: "spam@example.com" }],
			failed_attempts: [{ email: "spam@example.com", attempts: "3" }],
			ba_user: [{ id: "u-1", email: "spam@example.com", tenant_id: "t-1" }],
			user_sessions: [{ id: "s-2", user_id: "other" }],
		});

		const result = await removeIdentity(auth.db, identities);

		expect(result.dryRun).toBe(false);
		expect(result.failures).toEqual([]);
		expect(result.leftovers).toEqual([]);
		expect(result.totalRows).toBe(5);

		const order = auth.state.deletes.map((d) => d.table);
		expect(order.indexOf("ba_user")).toBe(order.length - 1);
		expect(order).toEqual(
			expect.arrayContaining(["ba_session", "ba_account", "ba_verification", "failed_attempts"]),
		);

		// Somebody else's session, in the same table, is untouched.
		expect(auth.state.rows.user_sessions).toEqual([{ id: "s-2", user_id: "other" }]);
	});

	it("reports a failed delete rather than claiming the identity is gone", async () => {
		const auth = fakeAuth({
			ba_session: [{ id: "s-1", user_id: "u-1" }],
			ba_user: [{ id: "u-1", email: "spam@example.com", tenant_id: "t-1" }],
		});
		auth.state.failDeleteOn = "ba_session";

		const result = await removeIdentity(auth.db, identities);

		expect(result.failures.map((f) => f.table)).toContain("ba_session");
		expect(result.leftovers.map((l) => l.table)).toContain("ba_session");
		expect(formatIdentityPlan(result.plan)).toContain("ba_session: 1");
	});
});

describe("formatIdentityPlan", () => {
	it("says so plainly when there is nothing to remove", () => {
		expect(formatIdentityPlan([{ table: "ba_user", rows: 0 }])).toBe(
			"groveauth: nothing to remove",
		);
	});
});
