/**
 * removeTenant — one removal capability, owned by the engine
 *
 * Removing nine spam tenants by hand on 2026-11-16 took 61 statements against
 * engine, 44 against curios, 14 against groveauth, and a 96-table scan to find
 * out where the rows were. Under time pressure, with a spammer still publishing.
 * That is the exact situation where a wrong WHERE clause does real damage.
 *
 * This is the replacement. It reads `TENANT_TABLE_REGISTRY`, defaults to a dry
 * run, snapshots what it is about to destroy, verifies afterwards that nothing
 * survived, and records the removal where the record outlives the tenant.
 *
 * Deliberately **not** automatic about the parts that reach outside a database:
 * R2 objects, the auth identity, the email, and the DO eviction are passed in as
 * callbacks. The engine should not know about a bucket binding or a mail gateway,
 * and a caller that cannot do those things should be aware it skipped them.
 *
 * @see docs/security/incident-response-runbook.md — the runbook that calls this
 */

import type { TenantDatabase, TenantTable } from "./tenant-tables";
import { TENANT_TABLE_REGISTRY, registryByDatabase } from "./tenant-tables";

// ============================================================================
// Types
// ============================================================================

/** Minimal DB shape — matches D1Database and GroveDatabase. */
export interface RemovalDatabase {
	prepare(sql: string): {
		bind(...params: unknown[]): {
			first<T = Record<string, unknown>>(): Promise<T | null>;
			all<T = Record<string, unknown>>(): Promise<{ results?: T[] }>;
			run(): Promise<unknown>;
		};
	};
}

export interface RemovalDatabases {
	engine: RemovalDatabase;
	curios?: RemovalDatabase;
	observability?: RemovalDatabase;
}

export interface TenantRemovalTarget {
	/** Tenant UUID — `tenants.id`. */
	tenantId: string;
	/** Subdomain, needed for the DO eviction callback and the email. */
	subdomain: string;
	/** Owner address, for the notification. */
	email?: string | null;
}

export interface RemovedTableCount {
	database: TenantDatabase;
	table: string;
	columns: readonly string[];
	rows: number;
	/** True when the rows are counted but kept (the audit trail). */
	retained?: boolean;
}

export interface TenantRemovalPlan {
	target: TenantRemovalTarget;
	dryRun: boolean;
	tables: RemovedTableCount[];
	/** Rows that will be (or were) deleted, excluding retained tables. */
	totalRows: number;
	/** Registries whose database binding was not supplied — nothing was swept there. */
	skippedDatabases: TenantDatabase[];
}

export interface RemoveTenantOptions {
	/** Why. Recorded in audit_log; required for a real removal. */
	reason: string;
	/** Who. `gw`, an operator email, or `arbor`. */
	actor?: string;
	/** Count rows and write nothing. Default **true** — you have to ask to destroy. */
	dryRun?: boolean;
	/** Remove the R2 objects under the tenant prefix. */
	deleteR2?: (tenant: TenantRemovalTarget) => Promise<number>;
	/** Evict the TenantDO, or the deleted site keeps serving (#1677). */
	evictCache?: (tenant: TenantRemovalTarget) => Promise<void>;
	/** Delete the Better Auth identity in groveauth. */
	deleteIdentity?: (tenant: TenantRemovalTarget) => Promise<number>;
	/** Email the account holder. */
	notify?: (tenant: TenantRemovalTarget, plan: TenantRemovalPlan) => Promise<void>;
}

export interface TenantRemovalResult {
	plan: TenantRemovalPlan;
	/** True when nothing was written. */
	dryRun: boolean;
	r2ObjectsDeleted: number;
	identitiesDeleted: number;
	cacheEvicted: boolean;
	notified: boolean;
	/** Rows still present after the sweep. Must be empty for a successful removal. */
	leftovers: RemovedTableCount[];
	auditRecorded: boolean;
}

// ============================================================================
// Planning
// ============================================================================

function countSQL(entry: TenantTable, column: string): string {
	// The column comes from the registry, never from a caller — it is an
	// identifier, and identifiers cannot be bound.
	return `SELECT count(*) AS n FROM ${entry.table} WHERE ${column} = ?`;
}

/**
 * Work out what a removal would touch, without touching it.
 *
 * Every table in the registry is counted, including ones that have never held a
 * row — that is the point. A clean sweep is *showing* zero, not assuming zero.
 */
export async function planTenantRemoval(
	dbs: RemovalDatabases,
	target: TenantRemovalTarget,
): Promise<TenantRemovalPlan> {
	const grouped = registryByDatabase();
	const tables: RemovedTableCount[] = [];
	const skippedDatabases: TenantDatabase[] = [];

	for (const database of Object.keys(grouped) as TenantDatabase[]) {
		const db = dbs[database];
		if (!db) {
			if (grouped[database].length > 0) skippedDatabases.push(database);
			continue;
		}

		for (const entry of grouped[database]) {
			const rows = await countTenantRows(db, entry, target.tenantId);
			tables.push({
				database,
				table: entry.table,
				columns: entry.columns,
				rows,
				...(entry.retain ? { retained: true } : {}),
			});
		}
	}

	return {
		target,
		dryRun: true,
		tables,
		totalRows: tables.filter((t) => !t.retained).reduce((sum, t) => sum + t.rows, 0),
		skippedDatabases,
	};
}

async function countTenantRows(
	db: RemovalDatabase,
	entry: TenantTable,
	tenantId: string,
): Promise<number> {
	let total = 0;
	for (const column of entry.columns) {
		const row = await db.prepare(countSQL(entry, column)).bind(tenantId).first<{ n: number }>();
		total += Number(row?.n ?? 0);
	}
	return total;
}

// ============================================================================
// Removal
// ============================================================================

/**
 * Remove a tenant.
 *
 * Refuses to run without a reason, refuses to run outside a dry run unless asked,
 * and afterwards re-counts every table and reports anything still there rather
 * than declaring success.
 */
export async function removeTenant(
	dbs: RemovalDatabases,
	target: TenantRemovalTarget,
	options: RemoveTenantOptions,
): Promise<TenantRemovalResult> {
	if (!options.reason?.trim()) {
		throw new Error("removeTenant requires a reason — it is the audit trail");
	}

	const dryRun = options.dryRun ?? true;
	const plan = await planTenantRemoval(dbs, target);

	if (dryRun) {
		return {
			plan,
			dryRun: true,
			r2ObjectsDeleted: 0,
			identitiesDeleted: 0,
			cacheEvicted: false,
			notified: false,
			leftovers: [],
			auditRecorded: false,
		};
	}

	const grouped = registryByDatabase();

	// 1. Delete the tenant's rows, curios before engine so nothing references a
	//    row that is already gone. `retain` tables are counted and kept.
	for (const database of ["curios", "observability", "engine"] as TenantDatabase[]) {
		const db = dbs[database];
		if (!db) continue;

		for (const entry of grouped[database]) {
			if (entry.retain) continue;
			for (const column of entry.columns) {
				await db
					.prepare(`DELETE FROM ${entry.table} WHERE ${column} = ?`)
					.bind(target.tenantId)
					.run();
			}
		}
	}

	// 2. Outside-the-database work, in the order the runbook uses: take it off the
	//    web, then the identity, then the files, then tell the person.
	let cacheEvicted = false;
	if (options.evictCache) {
		await options.evictCache(target);
		cacheEvicted = true;
	}

	const identitiesDeleted = options.deleteIdentity ? await options.deleteIdentity(target) : 0;
	const r2ObjectsDeleted = options.deleteR2 ? await options.deleteR2(target) : 0;

	// 3. Verify. A removal that cannot show zero is not a removal.
	const leftovers = (await planTenantRemoval(dbs, target)).tables.filter(
		(t) => t.rows > 0 && !t.retained,
	);

	// 4. Record it. The audit row is written after the sweep so it is not swept.
	const auditRecorded = await recordRemoval(dbs, target, options, {
		plan,
		leftovers,
		r2ObjectsDeleted,
		identitiesDeleted,
		cacheEvicted,
	});

	let notified = false;
	if (options.notify) {
		await options.notify(target, plan);
		notified = true;
	}

	return {
		plan,
		dryRun: false,
		r2ObjectsDeleted,
		identitiesDeleted,
		cacheEvicted,
		notified,
		leftovers,
		auditRecorded,
	};
}

/**
 * Write the removal record.
 *
 * Kept as counts, never content: "we deleted 14 posts" is enough to explain a
 * removal later, and avoids turning the audit table into a copy of everything we
 * just agreed to destroy.
 */
async function recordRemoval(
	dbs: RemovalDatabases,
	target: TenantRemovalTarget,
	options: RemoveTenantOptions,
	result: {
		plan: TenantRemovalPlan;
		leftovers: RemovedTableCount[];
		r2ObjectsDeleted: number;
		identitiesDeleted: number;
		cacheEvicted: boolean;
	},
): Promise<boolean> {
	const db = dbs.engine;
	if (!db) return false;

	const details = JSON.stringify({
		reason: options.reason,
		actor: options.actor ?? "unknown",
		subdomain: target.subdomain,
		counts: result.plan.tables
			.filter((t) => t.rows > 0)
			.map((t) => ({ db: t.database, table: t.table, rows: t.rows })),
		r2ObjectsDeleted: result.r2ObjectsDeleted,
		identitiesDeleted: result.identitiesDeleted,
		cacheEvicted: result.cacheEvicted,
		leftovers: result.leftovers.map((t) => `${t.database}.${t.table}=${t.rows}`),
	});

	try {
		await db
			.prepare(
				`INSERT INTO audit_log (id, tenant_id, category, action, details, user_email, created_at)
				 VALUES (lower(hex(randomblob(16))), ?, 'admin', 'tenant_remove', ?, ?, unixepoch())`,
			)
			.bind(target.tenantId, details, options.actor ?? "gw")
			.run();
		return true;
	} catch (err) {
		// Not fatal: the removal happened, and a thrown error here would make the
		// caller think it did not. The count-only log still reaches stderr.
		console.error("[removeTenant] Could not write audit_log entry:", err);
		return false;
	}
}

// ============================================================================
// Reporting
// ============================================================================

/** Human-readable plan — what a dry run prints. */
export function formatRemovalPlan(plan: TenantRemovalPlan): string {
	const lines: string[] = [];
	const host = `${plan.target.subdomain}.grove.place`;

	lines.push(`Tenant ${plan.target.tenantId} (${host})`);
	if (plan.skippedDatabases.length > 0) {
		lines.push(
			`\u26a0 Not swept: ${plan.skippedDatabases.join(", ")} — no database binding supplied`,
		);
	}
	lines.push("");

	for (const database of ["engine", "curios", "observability"] as TenantDatabase[]) {
		const rows = plan.tables.filter((t) => t.database === database && t.rows > 0);
		if (rows.length === 0) {
			lines.push(`${database}: nothing to remove`);
			continue;
		}
		lines.push(`${database}:`);
		for (const row of rows) {
			lines.push(
				`  ${row.retained ? "keep " : "delete"} ${row.table} (${row.columns.join(", ")}): ${row.rows}`,
			);
		}
	}

	lines.push("");
	lines.push(`${plan.totalRows} rows would be removed.`);
	return lines.join("\n");
}

/** Human-readable result of a real removal. */
export function formatRemovalResult(result: TenantRemovalResult): string {
	const lines: string[] = [
		`Removed ${result.plan.target.subdomain}.grove.place — ${result.plan.totalRows} rows`,
	];

	if (result.identitiesDeleted > 0) lines.push(`Identity: ${result.identitiesDeleted} rows`);
	if (result.r2ObjectsDeleted > 0) lines.push(`R2 objects: ${result.r2ObjectsDeleted}`);
	lines.push(`Cache evicted: ${result.cacheEvicted ? "yes" : "NO — the site may still serve"}`);
	lines.push(`Account holder notified: ${result.notified ? "yes" : "no"}`);
	lines.push(`Audit recorded: ${result.auditRecorded ? "yes" : "NO"}`);

	if (result.leftovers.length > 0) {
		lines.push("");
		lines.push("\u26a0 Leftovers — this removal is incomplete:");
		for (const row of result.leftovers) {
			lines.push(`  ${row.database}.${row.table}: ${row.rows}`);
		}
	}

	return lines.join("\n");
}

/** Every table the registry knows about, for a caller that wants to print it. */
export function registrySummary(): string {
	return TENANT_TABLE_REGISTRY.map(
		(entry) => `${entry.database}.${entry.table} (${entry.columns.join(", ")})`,
	).join("\n");
}
