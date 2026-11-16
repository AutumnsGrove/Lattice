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

/** Tables in `grove-engine-db`. */
const ENGINE_TABLES: readonly string[] = [
	"audit_log",
	"billing_audit_log",
	"blaze_definitions",
	"blocked_commenters",
	"chat_read_cursors",
	"comment_settings",
	"comments",
	"custom_fonts",
	"draft_backups",
	"friends",
	"gallery_collections",
	"gallery_curio_config",
	"gallery_images",
	"gallery_tags",
	"greenhouse_tenants",
	"image_hashes",
	"lumen_usage",
	"meadow_posts",
	"media",
	"pages",
	"petal_ncmec_queue",
	"petal_security_log",
	"platform_billing",
	"poll_votes",
	"polls",
	"post_views",
	"posts",
	"reverie_interactions",
	"sentinel_baselines",
	"sentinel_checkpoints",
	"sentinel_metrics",
	"sentinel_runs",
	"sentinel_schedules",
	"sentinel_test_data",
	"short_links",
	"site_settings",
	"storage_exports",
	"tenant_secrets",
	"tenant_settings",
	"theme_settings",
	"thorn_entity_labels",
	"thorn_flagged_content",
	"thorn_moderation_log",
	"user_onboarding",
	"username_history",
	"users",
	"webhook_events",
];

/** Tables in `grove-curios-db`. None of these can cascade — `tenants` is in another database. */
const CURIOS_TABLES: readonly string[] = [
	"activity_status",
	"ambient_config",
	"artifacts",
	"blogroll_items",
	"bookmark_shelves",
	"bookmarks",
	"cathedral_panels",
	"clipart_placements",
	"cursor_config",
	"custom_badges",
	"custom_uploads",
	"gallery_collections",
	"gallery_curio_config",
	"gallery_images",
	"gallery_tags",
	"guestbook_config",
	"guestbook_entries",
	"hit_counter_visitors",
	"hit_counters",
	"journey_curio_config",
	"journey_jobs",
	"journey_snapshots",
	"journey_summaries",
	"library_config",
	"mood_ring_config",
	"mood_ring_log",
	"nowplaying_config",
	"nowplaying_history",
	"poll_votes",
	"polls",
	"pulse_curio_config",
	"pulse_daily_stats",
	"pulse_events",
	"pulse_hourly_activity",
	"shrines",
	"status_badges",
	"tenant_badges",
	"timeline_activity",
	"timeline_ai_usage",
	"timeline_curio_config",
	"timeline_summaries",
	"webring_memberships",
	"wishing_well_counts",
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
