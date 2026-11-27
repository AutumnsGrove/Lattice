/**
 * Content Domain Schema — Posts, Pages, Blazes, Themes
 *
 * Core content creation and presentation tables.
 */

import { sqliteTable, text, integer, uniqueIndex, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { tenants } from "./platform.js";
import { firesideSessions } from "./fireside.js";

// ─────────────────────────────────────────────────────────────────────────────
// CORE: Posts
// ─────────────────────────────────────────────────────────────────────────────

export const posts = sqliteTable(
	"posts",
	{
		id: text("id").primaryKey(),
		tenantId: text("tenant_id")
			.notNull()
			.references(() => tenants.id, { onDelete: "cascade" }),
		slug: text("slug").notNull(),
		title: text("title").notNull(),
		description: text("description"),
		markdownContent: text("markdown_content").notNull(),
		htmlContent: text("html_content"),
		gutterContent: text("gutter_content").default("[]"),
		tags: text("tags").default("[]"),
		status: text("status", { enum: ["draft", "published", "archived"] }).default("draft"),
		featuredImage: text("featured_image"),
		wordCount: integer("word_count").default(0),
		readingTime: integer("reading_time").default(0),

		// Storage tiers (018)
		storageLocation: text("storage_location", { enum: ["hot", "warm", "cold"] }).default("hot"),
		r2Key: text("r2_key"),
		font: text("font").default("default"),

		// Meadow exclusion (079) — @deprecated Meadow removed; column retained for prod compat
		meadowExclude: integer("meadow_exclude").default(0),

		// Blazes (088)
		blaze: text("blaze"),

		// Spark prompts (114) — the writing-prompt text (if any) a draft started from
		sparkPrompt: text("spark_prompt"),

		// Beta authorship tracking (118) — was this post created via the beta deployment?
		isBeta: integer("is_beta").default(0),

		// Fireside attribution — 027 added this column but this schema never learned
		// about it, so every typed query has been reading it blind.
		firesideAssisted: integer("fireside_assisted").default(0),
		// Fireside (128) — the post owns its transcript: deleting the post takes the
		// conversation, an expired session leaves the attribution and sets this NULL.
		firesideSessionId: text("fireside_session_id").references(() => firesideSessions.id, {
			onDelete: "set null",
		}),

		// Timestamps
		publishedAt: integer("published_at"),
		createdAt: integer("created_at")
			.notNull()
			.default(sql`(unixepoch())`),
		updatedAt: integer("updated_at")
			.notNull()
			.default(sql`(unixepoch())`),
	},
	(table) => [uniqueIndex("idx_posts_tenant_slug_unique").on(table.tenantId, table.slug)],
);

// ─────────────────────────────────────────────────────────────────────────────
// CORE: Pages
// ─────────────────────────────────────────────────────────────────────────────

export const pages = sqliteTable(
	"pages",
	{
		id: text("id").primaryKey(),
		tenantId: text("tenant_id")
			.notNull()
			.references(() => tenants.id, { onDelete: "cascade" }),
		slug: text("slug").notNull(),
		title: text("title").notNull(),
		description: text("description"),
		type: text("type").notNull().default("page"),
		markdownContent: text("markdown_content").notNull(),
		htmlContent: text("html_content"),
		hero: text("hero"),
		gutterContent: text("gutter_content").default("[]"),
		font: text("font").default("default"),
		createdAt: integer("created_at")
			.notNull()
			.default(sql`(unixepoch())`),
		updatedAt: integer("updated_at")
			.notNull()
			.default(sql`(unixepoch())`),
	},
	(table) => [uniqueIndex("idx_pages_tenant_slug_unique").on(table.tenantId, table.slug)],
);

// ─────────────────────────────────────────────────────────────────────────────
// CONTENT: Blaze Definitions (088)
// ─────────────────────────────────────────────────────────────────────────────

export const blazeDefinitions = sqliteTable(
	"blaze_definitions",
	{
		id: text("id").primaryKey(),
		tenantId: text("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
		slug: text("slug").notNull(),
		label: text("label").notNull(),
		icon: text("icon").notNull(),
		color: text("color").notNull(),
		sortOrder: integer("sort_order").default(0),
		createdAt: integer("created_at")
			.notNull()
			.default(sql`(unixepoch())`),
	},
	(table) => [
		uniqueIndex("idx_blaze_definitions_slug_tenant").on(table.tenantId, table.slug),
		index("idx_blaze_definitions_tenant").on(table.tenantId),
	],
);

// ─────────────────────────────────────────────────────────────────────────────
// CONTENT: Analytics (Post Views)
// ─────────────────────────────────────────────────────────────────────────────

export const postViews = sqliteTable("post_views", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	postId: text("post_id")
		.notNull()
		.references(() => posts.id, { onDelete: "cascade" }),
	tenantId: text("tenant_id")
		.notNull()
		.references(() => tenants.id, { onDelete: "cascade" }),
	sessionId: text("session_id"),
	viewedAt: integer("viewed_at")
		.notNull()
		.default(sql`(unixepoch() * 1000)`),
});

// ─────────────────────────────────────────────────────────────────────────────
// THEMES: Theme Settings, Custom Fonts, Community Themes
// ─────────────────────────────────────────────────────────────────────────────

export const themeSettings = sqliteTable("theme_settings", {
	tenantId: text("tenant_id")
		.primaryKey()
		.references(() => tenants.id, { onDelete: "cascade" }),
	themeId: text("theme_id").notNull().default("grove"),
	accentColor: text("accent_color").default("#4f46e5"),
	customizerEnabled: integer("customizer_enabled").default(0),
	customColors: text("custom_colors"),
	customTypography: text("custom_typography"),
	customLayout: text("custom_layout"),
	customCss: text("custom_css"),
	communityThemeId: text("community_theme_id"),
	updatedAt: integer("updated_at").default(sql`(unixepoch())`),
});

export const customFonts = sqliteTable("custom_fonts", {
	id: text("id").primaryKey(),
	tenantId: text("tenant_id")
		.notNull()
		.references(() => tenants.id, { onDelete: "cascade" }),
	name: text("name").notNull(),
	family: text("family").notNull(),
	category: text("category", { enum: ["sans-serif", "serif", "mono", "display"] }).notNull(),
	woff2Path: text("woff2_path").notNull(),
	woffPath: text("woff_path"),
	fileSize: integer("file_size").notNull(),
	createdAt: integer("created_at").default(sql`(unixepoch())`),
});

export const communityThemes = sqliteTable("community_themes", {
	id: text("id").primaryKey(),
	creatorTenantId: text("creator_tenant_id")
		.notNull()
		.references(() => tenants.id),
	name: text("name").notNull(),
	description: text("description"),
	tags: text("tags"),
	baseTheme: text("base_theme").notNull(),
	customColors: text("custom_colors"),
	customTypography: text("custom_typography"),
	customLayout: text("custom_layout"),
	customCss: text("custom_css"),
	thumbnailPath: text("thumbnail_path"),
	downloads: integer("downloads").default(0),
	ratingSum: integer("rating_sum").default(0),
	ratingCount: integer("rating_count").default(0),
	status: text("status", {
		enum: [
			"draft",
			"pending",
			"in_review",
			"approved",
			"featured",
			"changes_requested",
			"rejected",
			"removed",
		],
	}).default("pending"),
	reviewedAt: integer("reviewed_at"),
	createdAt: integer("created_at").default(sql`(unixepoch())`),
	updatedAt: integer("updated_at").default(sql`(unixepoch())`),
});
