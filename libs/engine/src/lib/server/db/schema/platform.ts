/**
 * Platform Domain Schema — Tenants, Config, Feature Flags, Admin
 *
 * Root anchor for the entire engine DB. The `tenants` table is referenced
 * by 30+ tables across all domain files.
 */

import { sqliteTable, text, integer, real, uniqueIndex, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ─────────────────────────────────────────────────────────────────────────────
// CORE: Tenants
// ─────────────────────────────────────────────────────────────────────────────

export const tenants = sqliteTable("tenants", {
	id: text("id").primaryKey(),
	subdomain: text("subdomain").unique().notNull(),
	displayName: text("display_name").notNull(),
	email: text("email").notNull(),

	// Subscription & limits
	plan: text("plan", { enum: ["wanderer", "seedling", "sapling", "oak", "evergreen"] }).default(
		"seedling",
	),
	storageUsed: integer("storage_used").default(0),
	postCount: integer("post_count").default(0),

	// Business plan features
	customDomain: text("custom_domain"),

	// Customization
	theme: text("theme").default("default"),

	// Status
	active: integer("active").default(1),

	// Meadow (076) — @deprecated Meadow removed; column retained for prod compat
	meadowOptIn: integer("meadow_opt_in").default(0),

	// Wanderer tier (053)
	lastActivityAt: integer("last_activity_at"),
	reclamationStatus: text("reclamation_status"),

	// Timestamps
	createdAt: integer("created_at")
		.notNull()
		.default(sql`(unixepoch())`),
	updatedAt: integer("updated_at")
		.notNull()
		.default(sql`(unixepoch())`),
});

// ─────────────────────────────────────────────────────────────────────────────
// CORE: Site Settings & Tenant Settings
// ─────────────────────────────────────────────────────────────────────────────

export const siteSettings = sqliteTable(
	"site_settings",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		tenantId: text("tenant_id")
			.notNull()
			.references(() => tenants.id, { onDelete: "cascade" }),
		settingKey: text("setting_key").notNull(),
		settingValue: text("setting_value").notNull(),
		updatedAt: integer("updated_at")
			.notNull()
			.default(sql`(unixepoch())`),
	},
	(table) => [uniqueIndex("idx_site_settings_tenant_key").on(table.tenantId, table.settingKey)],
);

export const tenantSettings = sqliteTable(
	"tenant_settings",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		tenantId: text("tenant_id")
			.notNull()
			.references(() => tenants.id, { onDelete: "cascade" }),
		settingKey: text("setting_key").notNull(),
		settingValue: text("setting_value").notNull(),
		updatedAt: integer("updated_at")
			.notNull()
			.default(sql`(unixepoch())`),
	},
	(table) => [uniqueIndex("idx_tenant_settings_tenant_key").on(table.tenantId, table.settingKey)],
);

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE FLAGS: Flags, Rules, Audit, Greenhouse
// ─────────────────────────────────────────────────────────────────────────────

export const featureFlags = sqliteTable("feature_flags", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	description: text("description"),
	flagType: text("flag_type").notNull(),
	defaultValue: text("default_value").notNull(),
	enabled: integer("enabled").notNull().default(1),
	cacheTtl: integer("cache_ttl").default(60),
	greenhouseOnly: integer("greenhouse_only").notNull().default(0),
	createdAt: text("created_at")
		.notNull()
		.default(sql`(datetime('now'))`),
	updatedAt: text("updated_at")
		.notNull()
		.default(sql`(datetime('now'))`),
	createdBy: text("created_by"),
	updatedBy: text("updated_by"),
});

export const flagRules = sqliteTable(
	"flag_rules",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		flagId: text("flag_id")
			.notNull()
			.references(() => featureFlags.id, { onDelete: "cascade" }),
		priority: integer("priority").notNull().default(0),
		ruleType: text("rule_type").notNull(),
		ruleValue: text("rule_value").notNull(),
		resultValue: text("result_value").notNull(),
		enabled: integer("enabled").notNull().default(1),
		createdAt: text("created_at")
			.notNull()
			.default(sql`(datetime('now'))`),
	},
	(table) => [uniqueIndex("idx_flag_rules_flag_priority").on(table.flagId, table.priority)],
);

export const flagAuditLog = sqliteTable("flag_audit_log", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	flagId: text("flag_id").notNull(),
	action: text("action").notNull(),
	oldValue: text("old_value"),
	newValue: text("new_value"),
	changedBy: text("changed_by"),
	changedAt: text("changed_at")
		.notNull()
		.default(sql`(datetime('now'))`),
	reason: text("reason"),
});

export const greenhouseTenants = sqliteTable("greenhouse_tenants", {
	tenantId: text("tenant_id")
		.primaryKey()
		.references(() => tenants.id, { onDelete: "cascade" }),
	enabled: integer("enabled").notNull().default(1),
	enrolledAt: text("enrolled_at")
		.notNull()
		.default(sql`(datetime('now'))`),
	enrolledBy: text("enrolled_by"),
	notes: text("notes"),
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: Secrets, Git Dashboard
// ─────────────────────────────────────────────────────────────────────────────

export const tenantSecrets = sqliteTable(
	"tenant_secrets",
	{
		id: text("id")
			.primaryKey()
			.default(sql`(lower(hex(randomblob(16))))`),
		tenantId: text("tenant_id")
			.notNull()
			.references(() => tenants.id, { onDelete: "cascade" }),
		keyName: text("key_name").notNull(),
		encryptedValue: text("encrypted_value").notNull(),
		createdAt: text("created_at").default(sql`(datetime('now'))`),
		updatedAt: text("updated_at").default(sql`(datetime('now'))`),
	},
	(table) => [uniqueIndex("idx_tenant_secrets_tenant_key").on(table.tenantId, table.keyName)],
);

export const gitDashboardConfig = sqliteTable("git_dashboard_config", {
	tenantId: text("tenant_id")
		.primaryKey()
		.references(() => tenants.id, { onDelete: "cascade" }),
	enabled: integer("enabled").default(0),
	githubUsername: text("github_username"),
	showOnHomepage: integer("show_on_homepage").default(0),
	cacheTtlSeconds: integer("cache_ttl_seconds").default(3600),
	settings: text("settings").default("{}"),
	createdAt: integer("created_at").default(sql`(strftime('%s', 'now'))`),
	updatedAt: integer("updated_at").default(sql`(strftime('%s', 'now'))`),
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: Messages, Audit, Trace, Account Management
// ─────────────────────────────────────────────────────────────────────────────

export const groveMessages = sqliteTable("grove_messages", {
	id: text("id").primaryKey(),
	channel: text("channel", { enum: ["landing", "arbor"] }).notNull(),
	title: text("title").notNull(),
	body: text("body").notNull(),
	messageType: text("message_type", { enum: ["info", "warning", "celebration", "update"] })
		.notNull()
		.default("info"),
	pinned: integer("pinned").notNull().default(0),
	published: integer("published").notNull().default(0),
	expiresAt: text("expires_at"),
	createdBy: text("created_by").notNull(),
	createdAt: text("created_at")
		.notNull()
		.default(sql`(datetime('now'))`),
	updatedAt: text("updated_at")
		.notNull()
		.default(sql`(datetime('now'))`),
});

export const auditLog = sqliteTable("audit_log", {
	id: text("id").primaryKey(),
	tenantId: text("tenant_id").notNull(),
	category: text("category").notNull(),
	action: text("action").notNull(),
	details: text("details"),
	userEmail: text("user_email"),
	createdAt: integer("created_at").notNull(),
});

export const reclaimedAccounts = sqliteTable("reclaimed_accounts", {
	id: text("id").primaryKey(),
	originalTenantId: text("original_tenant_id").notNull(),
	username: text("username").notNull(),
	email: text("email").notNull(),
	contentArchiveKey: text("content_archive_key"),
	reclaimedAt: integer("reclaimed_at").notNull(),
	archiveExpiresAt: integer("archive_expires_at").notNull(),
	createdAt: integer("created_at").default(sql`(unixepoch())`),
});

// ─────────────────────────────────────────────────────────────────────────────
// Wanderer reclamation (migration 053)
// NOTE: none of 053's artefacts exist in production despite d1_migrations
// claiming otherwise — see #1691 and #1692. freeAccountCreationLog was deleted
// in #1683: the per-IP signup limiter was never deployed and never ran.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// AI: Lumen & Wisp Usage Tracking
// NOTE: wispRequests is deprecated — Wisp has been removed from the platform.
// ─────────────────────────────────────────────────────────────────────────────

export const lumenUsage = sqliteTable("lumen_usage", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	tenantId: text("tenant_id").notNull(),
	task: text("task").notNull(),
	model: text("model").notNull(),
	provider: text("provider").notNull(),
	inputTokens: integer("input_tokens").default(0),
	outputTokens: integer("output_tokens").default(0),
	cost: real("cost").default(0),
	latencyMs: integer("latency_ms").default(0),
	cached: integer("cached").default(0),
	createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

/**
 * @deprecated Wisp has been removed. Table retained for prod data integrity.
 */
export const wispRequests = sqliteTable("wisp_requests", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	userId: text("user_id").notNull(),
	action: text("action").notNull(),
	mode: text("mode").notNull(),
	model: text("model").notNull(),
	provider: text("provider").notNull(),
	inputTokens: integer("input_tokens").default(0),
	outputTokens: integer("output_tokens").default(0),
	cost: real("cost").default(0),
	postSlug: text("post_slug"),
	createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});
