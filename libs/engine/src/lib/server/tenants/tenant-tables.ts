/**
 * Tenant table registry
 *
 * Every table in every Grove database that holds per-tenant rows.
 *
 * This exists because removing a tenant by hand took a generated 61-statement
 * script against engine, 44 against curios, 14 against groveauth, and a 96-table
 * scan just to find out which tables had rows (#1680). That is the situation
 * where a wrong WHERE clause does real damage.
 *
 * Two rules, both learned the hard way:
 *
 * 1. **This is the only list.** `removeTenant()` reads it, the CLI reads it, the
 *    Arbor Danger Zone reads it. A second hand-maintained list is a bug.
 * 2. **A column need not be called `tenant_id`.** Six tables use something else
 *    (`creator_tenant_id`, `used_by_tenant_id`, `friend_tenant_id`,
 *    `followed_tenant_id`, `target_tenant_id` ×2) — those are registered here
 *    explicitly rather than being discovered by a `LIKE '%tenant%'` query.
 *
 * `tenant-tables.snapshot.json` is a captured inventory of production and exists
 * so the registry can be checked without a live database. `tenant-tables.test.ts`
 * fails when the two disagree, which is the "new table, no update → red test"
 * contract from #1596 §C.
 */

export type TenantDatabase = "engine" | "curios" | "observability";

export interface TenantTable {
	/** Which D1 database holds it. */
	database: TenantDatabase;
	table: string;
	/**
	 * Every column that can carry a tenant id.
	 *
	 * Usually just `tenant_id`. `friends` has two (`tenant_id` and
	 * `friend_tenant_id`), so a sweep has to match both or it leaves the other
	 * side of every friendship behind.
	 */
	columns: readonly string[];
	/**
	 * True when the row should survive removal.
	 *
	 * Only `audit_log` today: the record of a removal is the one thing that must
	 * outlive the tenant, or nobody can answer "why did we remove that one?"
	 * a month later. Its rows are still counted, just not deleted.
	 */
	retain?: boolean;
}

/**
 * Tables in `grove-engine-db`, **children before parents**.
 *
 * The order is not alphabetical, it is dependency order derived from the live
 * foreign keys: `comments` and `post_views` before `posts`, `poll_votes` before
 * `polls`, `gallery_collections` before `gallery_images`,
 * `sentinel_checkpoints`/`metrics`/`schedules` before `sentinel_runs`. Deleting a
 * parent first would either cascade rows we are about to delete anyway, or fail
 * mid-sweep on a constraint.
 *
 * `tenant-tables.test.ts` asserts the ordering still holds, so regenerating this
 * list cannot quietly undo it.
 */
const ENGINE_TABLES: readonly string[] = [
	"webhook_events",
	"users",
	"username_history",
	"user_onboarding",
	"thorn_moderation_log",
	"thorn_flagged_content",
	"thorn_entity_labels",
	"theme_settings",
	"tenant_settings",
	"tenant_secrets",
	"storage_exports",
	"site_settings",
	"short_links",
	"sentinel_test_data",
	"sentinel_schedules",
	"sentinel_metrics",
	"sentinel_checkpoints",
	"sentinel_runs",
	"sentinel_baselines",
	"reverie_interactions",
	"post_views",
	"poll_votes",
	"polls",
	"platform_billing",
	"petal_security_log",
	"petal_ncmec_queue",
	"pages",
	"media",
	"meadow_posts",
	"lumen_usage",
	"image_hashes",
	"greenhouse_tenants",
	"gallery_tags",
	"gallery_curio_config",
	"gallery_collections",
	"gallery_images",
	"friends",
	"draft_backups",
	"custom_fonts",
	"comments",
	"posts",
	"comment_settings",
	"chat_read_cursors",
	"blocked_commenters",
	"blaze_definitions",
	"billing_audit_log",
	"audit_log",
];

/**
 * Tables in `grove-curios-db`, children before parents for the same reason.
 * None of these can cascade — `tenants` is in another database.
 */
const CURIOS_TABLES: readonly string[] = [
	"wishing_well_counts",
	"webring_memberships",
	"timeline_summaries",
	"timeline_curio_config",
	"timeline_ai_usage",
	"timeline_activity",
	"tenant_badges",
	"status_badges",
	"shrines",
	"pulse_hourly_activity",
	"pulse_events",
	"pulse_daily_stats",
	"pulse_curio_config",
	"poll_votes",
	"polls",
	"nowplaying_history",
	"nowplaying_config",
	"mood_ring_log",
	"mood_ring_config",
	"library_config",
	"journey_summaries",
	"journey_snapshots",
	"journey_jobs",
	"journey_curio_config",
	"hit_counters",
	"hit_counter_visitors",
	"guestbook_entries",
	"guestbook_config",
	"gallery_tags",
	"gallery_curio_config",
	"gallery_collections",
	"gallery_images",
	"custom_uploads",
	"custom_badges",
	"cursor_config",
	"clipart_placements",
	"cathedral_panels",
	"bookmarks",
	"bookmark_shelves",
	"blogroll_items",
	"artifacts",
	"ambient_config",
	"activity_status",
];

/** Tables in `grove-observability-db`. Analytics is not part of any cascade. */
const OBSERVABILITY_TABLES: readonly string[] = ["pulse_events"];

/** Columns that carry a tenant id but are not named `tenant_id`. */
const ALTERNATE_TABLES: readonly string[] = [
	"community_themes",
	"comped_invites",
	"meadow_follows",
	"pending_notifications",
	"subscriptions",
];

const ALTERNATE_COLUMNS: readonly { table: string; column: string }[] = [
	{ table: "community_themes", column: "creator_tenant_id" },
	{ table: "comped_invites", column: "used_by_tenant_id" },
	{ table: "friends", column: "friend_tenant_id" },
	{ table: "meadow_follows", column: "followed_tenant_id" },
	{ table: "pending_notifications", column: "target_tenant_id" },
	{ table: "subscriptions", column: "target_tenant_id" },
];

function buildRegistry(): TenantTable[] {
	const alternatesByTable = new Map<string, string[]>();
	for (const alt of ALTERNATE_COLUMNS) {
		const existing = alternatesByTable.get(alt.table) ?? [];
		alternatesByTable.set(alt.table, [...existing, alt.column]);
	}

	const entry =
		(database: TenantDatabase) =>
		(table: string): TenantTable => {
			const columns = new Set<string>();
			// Tables with a plain tenant_id column, plus any alternate ones they also
			// carry. Alternate-only tables get no tenant_id.
			if (database !== "engine" || ENGINE_TABLES.includes(table)) {
				if (hasTenantIdColumn(database, table)) columns.add("tenant_id");
			}
			for (const column of alternatesByTable.get(table) ?? []) columns.add(column);

			return {
				database,
				table,
				columns: [...columns],
				// The removal record outlives the tenant, by design.
				...(table === "audit_log" && database === "engine" ? { retain: true } : {}),
			};
		};

	return [...new Set([...ENGINE_TABLES, ...ALTERNATE_TABLES]).values()]
		.map(entry("engine"))
		.concat(CURIOS_TABLES.map(entry("curios")), OBSERVABILITY_TABLES.map(entry("observability")));
}

/** True when the table is expected to have a plain `tenant_id` column. */
function hasTenantIdColumn(database: TenantDatabase, table: string): boolean {
	if (database === "engine") return ENGINE_TABLES.includes(table);
	return true; // every curios/observability table above carries tenant_id
}

/**
 * The tenant row itself.
 *
 * Registered separately because it is keyed on `id`, not `tenant_id`, and because
 * it must be deleted **last** — after everything that references it. A sweep that
 * leaves this row behind leaves the subdomain claimed, and reports clean while
 * the tenant still exists.
 */
export const TENANT_ROOT = {
	database: "engine" as TenantDatabase,
	table: "tenants",
	column: "id",
} as const;

/** Every table that holds per-tenant rows, in every database. */
export const TENANT_TABLE_REGISTRY: readonly TenantTable[] = buildRegistry();

/** Registry grouped by database — what a sweep iterates. */
export function registryByDatabase(): Record<TenantDatabase, TenantTable[]> {
	const grouped: Record<TenantDatabase, TenantTable[]> = {
		engine: [],
		curios: [],
		observability: [],
	};
	for (const entry of TENANT_TABLE_REGISTRY) grouped[entry.database].push(entry);
	return grouped;
}

/** The tables a removal actually deletes from (everything not marked `retain`). */
export function removableTables(): readonly TenantTable[] {
	return TENANT_TABLE_REGISTRY.filter((entry) => !entry.retain);
}

/** Is this table registered? Used by the drift test and by ad-hoc sweeps. */
export function isRegistered(database: TenantDatabase, table: string): boolean {
	return TENANT_TABLE_REGISTRY.some(
		(entry) => entry.database === database && entry.table === table,
	);
}

/** The columns carrying the tenant id for a table, or just `tenant_id` if unregistered. */
export function tenantColumnsFor(database: TenantDatabase, table: string): readonly string[] {
	return (
		TENANT_TABLE_REGISTRY.find((entry) => entry.database === database && entry.table === table)
			?.columns ?? ["tenant_id"]
	);
}
