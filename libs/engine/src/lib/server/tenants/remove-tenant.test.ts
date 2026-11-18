import { describe, it, expect, vi } from "vitest";
import {
	formatRemovalPlan,
	formatRemovalResult,
	planTenantRemoval,
	removeTenant,
	type RemovalDatabase,
} from "./remove-tenant";
import { TENANT_TABLE_REGISTRY } from "./tenant-tables";

/**
 * A tiny in-memory stand-in for the three databases.
 *
 * It understands exactly the three statement shapes removeTenant issues —
 * count, delete, audit insert — so the tests assert behaviour rather than SQL
 * string matching.
 */
interface FakeDb {
	rows: Record<string, string[]>;
	counts: number;
	deletes: { table: string; column: string; value: string }[];
	auditInserts: number;
	failDeleteOn?: string;
}

function fakeDb(seed: Record<string, string[]> = {}): { db: RemovalDatabase; state: FakeDb } {
	const state: FakeDb = { rows: { ...seed }, counts: 0, deletes: [], auditInserts: 0 };

	const db: RemovalDatabase = {
		prepare(sql: string) {
			const trimmed = sql.trim();
			return {
				bind(...params: unknown[]) {
					const value = String(params[0] ?? "");
					return {
						async first<T>() {
							state.counts++;
							const match = /FROM (\w+) WHERE (\w+) = \?/.exec(trimmed);
							if (!match) return { n: 0 } as T;
							const [, table, column] = match;
							const mine = state.rows[table] ?? [];
							// The fake keys rows by "<column>=<value>" so both tenant_id
							// and alternate columns behave the same way.
							const n = mine.filter((row) => row === `${column}=${value}` || row === value).length;
							return { n } as T;
						},
						async all<R>() {
							return { results: [] as R[] };
						},
						async run() {
							if (trimmed.startsWith("INSERT INTO audit_log")) {
								state.auditInserts++;
								return {};
							}
							const match = /DELETE FROM (\w+) WHERE (\w+) = \?/.exec(trimmed);
							if (!match) return {};
							const [, table, column] = match;
							if (state.failDeleteOn === table) throw new Error(`boom: ${table}`);
							state.deletes.push({ table, column, value });
							state.rows[table] = (state.rows[table] ?? []).filter(
								(row) => row !== `${column}=${value}` && row !== value,
							);
							return {};
						},
					};
				},
			};
		},
	};

	return { db, state };
}

const target = { tenantId: "t-1", subdomain: "tianjidu", email: "spam@example.com" };

function seedForTenant(): Record<string, string[]> {
	return {
		posts: ["tenant_id=t-1", "tenant_id=t-1", "tenant_id=other"],
		comments: ["tenant_id=t-1"],
		pages: ["tenant_id=t-1"],
		friends: ["tenant_id=t-1", "friend_tenant_id=t-1"],
		pending_notifications: ["target_tenant_id=t-1"],
		audit_log: ["tenant_id=t-1"],
	};
}

describe("planTenantRemoval", () => {
	it("counts every registered table, including the ones with nothing in them", async () => {
		const engine = fakeDb();
		const curios = fakeDb();
		const plan = await planTenantRemoval({ engine: engine.db, curios: curios.db }, target);

		// One count per tenant column per registered table, plus the tenants row
		// itself (keyed on id, so a tenant_id sweep would never reach it).
		const expectedCounts =
			TENANT_TABLE_REGISTRY.filter(
				(e) => e.database === "engine" || e.database === "curios",
			).reduce((sum, e) => sum + e.columns.length, 0) + 1;
		expect(engine.state.counts + curios.state.counts).toBe(expectedCounts);
	});

	it("reports the rows it would remove, and the audit rows it would keep", async () => {
		const engine = fakeDb(seedForTenant());
		const curios = fakeDb();

		const plan = await planTenantRemoval({ engine: engine.db, curios: curios.db }, target);
		const byTable = new Map(plan.tables.map((t) => [t.table, t]));

		expect(byTable.get("posts")?.rows).toBe(2); // the other tenant's post is not counted
		expect(byTable.get("friends")?.rows).toBe(2); // both sides of the friendship
		expect(byTable.get("pending_notifications")?.rows).toBe(1); // the alternate column
		expect(byTable.get("audit_log")).toMatchObject({ rows: 1, retained: true });

		// posts 2 + comments 1 + pages 1 + friends 2 + pending_notifications 1.
		// Audit rows are counted but excluded from the total.
		expect(plan.totalRows).toBe(7);
	});

	it("says which databases it could not reach instead of silently skipping them", async () => {
		const engine = fakeDb();
		const plan = await planTenantRemoval({ engine: engine.db }, target);

		expect(plan.skippedDatabases).toContain("curios");
		expect(plan.skippedDatabases).toContain("observability");
		expect(plan.skippedDatabases).not.toContain("engine");
	});
});

describe("removeTenant", () => {
	it("refuses to run without a reason", async () => {
		const engine = fakeDb();
		await expect(
			removeTenant({ engine: engine.db }, target, { reason: "  ", dryRun: false }),
		).rejects.toThrow(/reason/i);
	});

	it("is a dry run unless told otherwise", async () => {
		const engine = fakeDb(seedForTenant());
		const result = await removeTenant({ engine: engine.db }, target, { reason: "test" });

		expect(result.dryRun).toBe(true);
		expect(engine.state.deletes).toHaveLength(0);
		expect(engine.state.auditInserts).toBe(0);
	});

	it("says 'Would remove' on a dry run, not 'Removed'", async () => {
		// A dry run prints the same block. Claiming it removed anything is how an
		// operator skims the output and believes the tenant is gone.
		const engine = fakeDb(seedForTenant());
		const result = await removeTenant({ engine: engine.db }, target, { reason: "test" });

		expect(formatRemovalResult(result).startsWith("Would remove")).toBe(true);
	});

	it("deletes from every registered table and verifies nothing survived", async () => {
		const engine = fakeDb(seedForTenant());
		const curios = fakeDb({ guestbook_entries: ["tenant_id=t-1"] });
		const observability = fakeDb({ pulse_events: ["tenant_id=t-1"] });

		const result = await removeTenant(
			{ engine: engine.db, curios: curios.db, observability: observability.db },
			target,
			{ reason: "link farm", dryRun: false, actor: "autumn" },
		);

		expect(result.dryRun).toBe(false);
		expect(result.leftovers).toEqual([]);
		expect(result.auditRecorded).toBe(true);
		// Intent before the sweep, outcome after it: a half-finished removal must
		// leave a record of what it was trying to do.
		expect(engine.state.auditInserts).toBe(2);
		expect(result.tenantRowDeleted).toBe(true);
		expect(engine.state.deletes.some((d) => d.table === "tenants" && d.column === "id")).toBe(true);

		// The tenant's audit rows are kept — that record outlives the tenant.
		expect(engine.state.deletes.some((d) => d.table === "audit_log")).toBe(false);

		// Both friendship columns were swept.
		const friendDeletes = engine.state.deletes.filter((d) => d.table === "friends");
		expect(friendDeletes.map((d) => d.column).sort()).toEqual(["friend_tenant_id", "tenant_id"]);

		// Alternate-column tables were swept by their own column.
		expect(engine.state.deletes.find((d) => d.table === "pending_notifications")?.column).toBe(
			"target_tenant_id",
		);
	});

	it("reports leftovers rather than claiming success", async () => {
		const engine = fakeDb(seedForTenant());
		// Simulate a table that refuses to clear — a foreign key, a typo'd column,
		// a row somebody re-inserted mid-sweep.
		const stubborn: RemovalDatabase = {
			prepare(sql: string) {
				if (/DELETE FROM posts/.test(sql)) {
					return {
						bind: () => ({
							first: async () => null,
							all: async () => ({ results: [] }),
							run: async () => ({}),
						}),
					};
				}
				return engine.db.prepare(sql);
			},
		};

		const result = await removeTenant({ engine: stubborn }, target, {
			reason: "link farm",
			dryRun: false,
		});

		expect(result.leftovers.map((l) => l.table)).toContain("posts");
		expect(formatRemovalResult(result)).toContain("incomplete");
	});

	it("runs the outside-the-database work in order and reports what it skipped", async () => {
		const engine = fakeDb(seedForTenant());
		const order: string[] = [];

		const result = await removeTenant({ engine: engine.db }, target, {
			reason: "link farm",
			dryRun: false,
			evictCache: async () => {
				order.push("evict");
			},
			deleteIdentity: async () => {
				order.push("identity");
				return 3;
			},
			deleteR2: async () => {
				order.push("r2");
				return 2;
			},
			notify: async () => {
				order.push("notify");
			},
		});

		expect(order).toEqual(["evict", "identity", "r2", "notify"]);
		expect(result.cacheEvicted).toBe(true);
		expect(result.identitiesDeleted).toBe(3);
		expect(result.r2ObjectsDeleted).toBe(2);
		expect(result.notified).toBe(true);
	});

	it("keeps sweeping past a failing statement and reports it", async () => {
		const engine = fakeDb(seedForTenant());
		const failing: RemovalDatabase = {
			prepare(sql: string) {
				if (/DELETE FROM pages/.test(sql)) {
					return {
						bind: () => ({
							first: async () => null,
							all: async () => ({ results: [] }),
							run: async () => {
								throw new Error("fk violation");
							},
						}),
					};
				}
				return engine.db.prepare(sql);
			},
		};

		const result = await removeTenant({ engine: failing }, target, {
			reason: "link farm",
			dryRun: false,
		});

		// One constraint must not strand the rest of the tenant's data.
		expect(result.failures.map((f) => f.table)).toContain("pages");
		expect(result.leftovers.map((l) => l.table)).toContain("pages");
		expect(engine.state.deletes.some((d) => d.table === "posts")).toBe(true);
		expect(result.auditRecorded).toBe(true);
		expect(formatRemovalResult(result)).toContain("Statements that failed");
	});

	it("keeps the tenants row when the sweep failed, so a retry can find it", async () => {
		const engine = fakeDb(seedForTenant());
		const failing: RemovalDatabase = {
			prepare(sql: string) {
				if (/DELETE FROM pages/.test(sql)) {
					return {
						bind: () => ({
							first: async () => null,
							all: async () => ({ results: [] }),
							run: async () => {
								throw new Error("fk violation");
							},
						}),
					};
				}
				return engine.db.prepare(sql);
			},
		};

		const result = await removeTenant({ engine: failing }, target, {
			reason: "link farm",
			dryRun: false,
		});

		// Deleting the root while child rows survive orphans them with nothing to
		// find them by, and leaves no tenant for the retry to resolve.
		expect(result.tenantRowDeleted).toBe(false);
		expect(engine.state.deletes.some((d) => d.table === "tenants")).toBe(false);
		expect(result.failures.find((f) => f.table === "tenants")?.error).toMatch(/kept for a retry/);
	});

	it("records a throwing callback instead of losing the result", async () => {
		const engine = fakeDb(seedForTenant());

		const result = await removeTenant({ engine: engine.db }, target, {
			reason: "link farm",
			dryRun: false,
			evictCache: async () => {
				throw new Error("DO unavailable");
			},
			deleteR2: async () => {
				throw new Error("bucket missing");
			},
			notify: async () => {
				throw new Error("zephyr down");
			},
		});

		// The rows were already gone by the time these ran, so a throw must not
		// prevent the verification pass or the outcome record.
		expect(result.failures.map((f) => f.table)).toEqual(
			expect.arrayContaining(["tenant_do", "r2_objects"]),
		);
		expect(result.cacheEvicted).toBe(false);
		expect(result.notified).toBe(false);
		expect(result.auditRecorded).toBe(true);
		expect(formatRemovalResult(result)).toContain("cache eviction failed");
	});

	it("reports a failed audit write without pretending the removal failed", async () => {
		const engine = fakeDb(seedForTenant());
		const noAudit: RemovalDatabase = {
			prepare(sql: string) {
				if (sql.includes("INSERT INTO audit_log")) {
					return {
						bind: () => ({
							first: async () => null,
							all: async () => ({ results: [] }),
							run: async () => {
								throw new Error("no such table");
							},
						}),
					};
				}
				return engine.db.prepare(sql);
			},
		};

		const result = await removeTenant({ engine: noAudit }, target, {
			reason: "link farm",
			dryRun: false,
		});

		expect(result.auditRecorded).toBe(false);
		expect(result.dryRun).toBe(false);
	});
});

describe("formatting", () => {
	it("prints a plan that shows keep vs delete", async () => {
		const engine = fakeDb(seedForTenant());
		const plan = await planTenantRemoval({ engine: engine.db }, target);
		const text = formatRemovalPlan(plan);

		expect(text).toContain("tianjidu.grove.place");
		expect(text).toContain("delete posts");
		expect(text).toContain("keep  audit_log");
		expect(text).toContain("Not swept: curios");
	});

	it("loudly says so when the cache was not evicted", async () => {
		const engine = fakeDb();
		const result = await removeTenant({ engine: engine.db }, target, {
			reason: "test",
			dryRun: false,
		});
		expect(formatRemovalResult(result)).toContain("NO — the site may still serve");
	});
});
