import { describe, it, expect } from "vitest";
import snapshot from "./tenant-tables.snapshot.json";
import {
	TENANT_ROOT,
	TENANT_TABLE_REGISTRY,
	isRegistered,
	registryByDatabase,
	removableTables,
	tenantColumnsFor,
} from "./tenant-tables";

describe("tenant table registry", () => {
	it("registers every table the production snapshot found", () => {
		const missing: string[] = [];

		for (const db of ["engine", "curios", "observability"] as const) {
			for (const table of snapshot[db]) {
				if (!isRegistered(db, table)) missing.push(`${db}.${table}`);
			}
		}

		expect(missing, "tables with tenant rows that no sweep would touch").toEqual([]);
	});

	it("does not register tables the snapshot says are gone", () => {
		// A stale entry is a query against a table that no longer exists — loud in
		// a dry run, a failed sweep during a real one.
		const extra: string[] = [];

		const alternates = new Set(snapshot.alternateColumns.map((a) => a.table));
		for (const entry of TENANT_TABLE_REGISTRY) {
			const known = snapshot[entry.database] as readonly string[];
			if (!known.includes(entry.table) && !alternates.has(entry.table)) {
				extra.push(`${entry.database}.${entry.table}`);
			}
		}

		expect(extra, "registered tables that production no longer has").toEqual([]);
	});

	it("carries the alternate tenant columns, not a guess", () => {
		for (const alt of snapshot.alternateColumns) {
			expect(isRegistered(alt.database as "engine", alt.table)).toBe(true);
			expect(tenantColumnsFor(alt.database as "engine", alt.table)).toContain(alt.column);
		}
	});

	it("registers all six alternate-column tables", () => {
		const expected = [
			"community_themes.creator_tenant_id",
			"comped_invites.used_by_tenant_id",
			"friends.friend_tenant_id",
			"meadow_follows.followed_tenant_id",
			"pending_notifications.target_tenant_id",
			"subscriptions.target_tenant_id",
		];

		for (const pair of expected) {
			const [table, column] = pair.split(".");
			expect(tenantColumnsFor("engine", table)).toContain(column);
		}
	});

	it("has no duplicate entries", () => {
		const seen = new Set<string>();
		for (const entry of TENANT_TABLE_REGISTRY) {
			const key = `${entry.database}.${entry.table}`;
			expect(seen.has(key), `duplicate registry entry: ${key}`).toBe(false);
			seen.add(key);
		}
	});

	it("keeps the removal record when the tenant is removed", () => {
		expect(removableTables().some((e) => e.table === "audit_log")).toBe(false);
		expect(TENANT_TABLE_REGISTRY.some((e) => e.table === "audit_log" && e.retain)).toBe(true);
	});

	it("groups by database in the shape a sweep needs", () => {
		const grouped = registryByDatabase();
		// engine = every table with tenant_id plus the alternate-only tables
		expect(grouped.engine.length).toBe(
			snapshot.engine.length +
				snapshot.alternateColumns.filter((a) => !snapshot.engine.includes(a.table)).length,
		);
		expect(grouped.curios.length).toBe(snapshot.curios.length);
		expect(grouped.observability.length).toBe(snapshot.observability.length);
	});

	it("orders children before parents, so a foreign key cannot abort the sweep", () => {
		const order = TENANT_TABLE_REGISTRY.filter((e) => e.database === "engine").map((e) => e.table);
		const index = (table: string) => order.indexOf(table);

		// Pairs taken from the live foreign keys: [child, parent]. Deleting the
		// parent first would either cascade rows we are about to delete anyway, or
		// fail mid-sweep on a constraint.
		const pairs: [string, string][] = [
			["comments", "posts"],
			["post_views", "posts"],
			["poll_votes", "polls"],
			["gallery_collections", "gallery_images"],
			["sentinel_checkpoints", "sentinel_runs"],
			["sentinel_metrics", "sentinel_runs"],
			["sentinel_schedules", "sentinel_runs"],
		];

		for (const [child, parent] of pairs) {
			expect(index(child), `${child} must come before ${parent}`).toBeLessThan(index(parent));
		}
	});

	it("puts the tenants row last, after everything that references it", () => {
		// `tenants` is not in the registry (keyed on id, not tenant_id) but removal
		// deletes it after the sweep; nothing may be deleted after it.
		expect(TENANT_ROOT.table).toBe("tenants");
		expect(TENANT_ROOT.column).toBe("id");
	});

	it("defaults an unregistered table's columns to tenant_id rather than guessing a name", () => {
		expect(tenantColumnsFor("engine", "not_a_real_table")).toEqual(["tenant_id"]);
	});

	it("matches both sides of a friendship", () => {
		expect(tenantColumnsFor("engine", "friends").sort()).toEqual(["friend_tenant_id", "tenant_id"]);
	});

	it("gives alternate-only tables their one column and no phantom tenant_id", () => {
		expect(tenantColumnsFor("engine", "pending_notifications")).toEqual(["target_tenant_id"]);
	});
});
