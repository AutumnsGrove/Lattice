/**
 * Drizzle Schema — grove-engine-db (DB binding)
 *
 * Source of truth for ~60 tables powering Grove's core:
 * auth, tenants, content, billing, flags, social, moderation, and infrastructure.
 *
 * Derived from migrations 001–088 (post-consolidation state).
 * Curio tables (045 tables) → see curios.ts
 * Observability tables (010 tables) → see observability.ts
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
	plan: text("plan", { enum: ["free", "seedling", "sapling", "oak", "evergreen"] }).default(
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

	// Meadow (076)
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
// CORE: Users
// ─────────────────────────────────────────────────────────────────────────────

export const users = sqliteTable("users", {
	id: text("id").primaryKey(),
	groveauthId: text("groveauth_id").unique().notNull(),
	email: text("email").notNull(),
	displayName: text("display_name"),
	avatarUrl: text("avatar_url"),
	tenantId: text("tenant_id").references(() => tenants.id, { onDelete: "set null" }),
	lastLoginAt: integer("last_login_at"),
	loginCount: integer("login_count").default(0),
	isActive: integer("is_active").default(1),
	createdAt: integer("created_at").default(sql`(unixepoch())`),
	updatedAt: integer("updated_at").default(sql`(unixepoch())`),
});

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

		// Meadow exclusion (079)
		meadowExclude: integer("meadow_exclude").default(0),

		// Blazes (088)
		blaze: text("blaze"),

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
// CORE: Sessions
// ─────────────────────────────────────────────────────────────────────────────

export const sessions = sqliteTable("sessions", {
	id: text("id").primaryKey(),
	tenantId: text("tenant_id")
		.notNull()
		.references(() => tenants.id, { onDelete: "cascade" }),
	userEmail: text("user_email").notNull(),
	expiresAt: integer("expires_at").notNull(),
	createdAt: integer("created_at")
		.notNull()
		.default(sql`(unixepoch())`),
});

// ─────────────────────────────────────────────────────────────────────────────
// CORE: Media
// ─────────────────────────────────────────────────────────────────────────────

export const media = sqliteTable("media", {
	id: text("id").primaryKey(),
	tenantId: text("tenant_id")
		.notNull()
		.references(() => tenants.id, { onDelete: "cascade" }),
	filename: text("filename").notNull(),
	originalName: text("original_name").notNull(),
	r2Key: text("r2_key").notNull(),
	url: text("url").notNull(),
	size: integer("size"),
	width: integer("width"),
	height: integer("height"),
	mimeType: text("mime_type"),
	uploadedAt: integer("uploaded_at")
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
// CORE: User Onboarding
// ─────────────────────────────────────────────────────────────────────────────

export const userOnboarding = sqliteTable("user_onboarding", {
	id: text("id").primaryKey(),
	groveauthId: text("groveauth_id").unique().notNull(),
	email: text("email").notNull(),

	// Profile data
	displayName: text("display_name"),
	username: text("username").unique(),
	favoriteColor: text("favorite_color"),
	interests: text("interests").default("[]"),

	// Progress tracking
	authCompletedAt: integer("auth_completed_at"),
	profileCompletedAt: integer("profile_completed_at"),
	planSelected: text("plan_selected"),
	planBillingCycle: text("plan_billing_cycle"),
	planSelectedAt: integer("plan_selected_at"),
	paymentCompletedAt: integer("payment_completed_at"),
	tenantCreatedAt: integer("tenant_created_at"),
	tourStartedAt: integer("tour_started_at"),
	tourCompletedAt: integer("tour_completed_at"),
	tourSkipped: integer("tour_skipped").default(0),

	// Checklist
	checklistDismissed: integer("checklist_dismissed").default(0),
	firstPostAt: integer("first_post_at"),
	firstVineAt: integer("first_vine_at"),
	themeCustomizedAt: integer("theme_customized_at"),

	// Email tracking
	welcomeEmailSent: integer("welcome_email_sent").default(0),
	day1EmailSent: integer("day1_email_sent").default(0),
	day3EmailSent: integer("day3_email_sent").default(0),
	day7EmailSent: integer("day7_email_sent").default(0),
	day30EmailSent: integer("day30_email_sent").default(0),
	checkinEmailsUnsubscribed: integer("checkin_emails_unsubscribed").default(0),

	// Stripe
	stripeCustomerId: text("stripe_customer_id"),
	stripeSubscriptionId: text("stripe_subscription_id"),
	stripeCheckoutSessionId: text("stripe_checkout_session_id"),

	// Email verification (028)
	emailVerified: integer("email_verified").default(0),
	emailVerifiedAt: integer("email_verified_at"),
	emailVerifiedVia: text("email_verified_via"),

	// Tenant link
	tenantId: text("tenant_id"),

	createdAt: integer("created_at").default(sql`(unixepoch())`),
	updatedAt: integer("updated_at").default(sql`(unixepoch())`),
});

// ─────────────────────────────────────────────────────────────────────────────
// AUTH: Magic Codes, Rate Limits, Failed Attempts
// ─────────────────────────────────────────────────────────────────────────────

export const magicCodes = sqliteTable("magic_codes", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	email: text("email").notNull(),
	code: text("code").notNull(),
	createdAt: integer("created_at").notNull(),
	expiresAt: integer("expires_at").notNull(),
	used: integer("used").default(0),
});

export const rateLimits = sqliteTable("rate_limits", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	ipAddress: text("ip_address").notNull(),
	createdAt: integer("created_at").notNull(),
});

export const failedAttempts = sqliteTable("failed_attempts", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	email: text("email").notNull().unique(),
	attempts: integer("attempts").default(0),
	lastAttempt: integer("last_attempt").notNull(),
	lockedUntil: integer("locked_until"),
});

export const emailVerifications = sqliteTable("email_verifications", {
	id: text("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => userOnboarding.id, { onDelete: "cascade" }),
	email: text("email").notNull(),
	code: text("code").notNull(),
	createdAt: integer("created_at").default(sql`(unixepoch())`),
	expiresAt: integer("expires_at").notNull(),
	verifiedAt: integer("verified_at"),
	attempts: integer("attempts").default(0),
});

export const reservedUsernames = sqliteTable("reserved_usernames", {
	username: text("username").primaryKey(),
	reason: text("reason").notNull(),
	createdAt: integer("created_at").default(sql`(unixepoch())`),
});

export const usernameAuditLog = sqliteTable("username_audit_log", {
	id: text("id").primaryKey(),
	action: text("action").notNull(),
	username: text("username").notNull(),
	reason: text("reason"),
	actorEmail: text("actor_email").notNull(),
	actorId: text("actor_id"),
	notes: text("notes"),
	createdAt: integer("created_at").default(sql`(unixepoch())`),
});

export const usernameHistory = sqliteTable("username_history", {
	id: text("id").primaryKey(),
	tenantId: text("tenant_id")
		.notNull()
		.references(() => tenants.id, { onDelete: "cascade" }),
	oldSubdomain: text("old_subdomain").notNull(),
	newSubdomain: text("new_subdomain").notNull(),
	changedAt: integer("changed_at")
		.notNull()
		.default(sql`(unixepoch())`),
	holdExpiresAt: integer("hold_expires_at").notNull(),
	released: integer("released").default(0),
	actorEmail: text("actor_email").notNull(),
});

// ─────────────────────────────────────────────────────────────────────────────
// BILLING: Platform Billing, Webhooks, Comped Invites
// ─────────────────────────────────────────────────────────────────────────────

export const platformBilling = sqliteTable("platform_billing", {
	id: text("id").primaryKey(),
	tenantId: text("tenant_id")
		.notNull()
		.unique()
		.references(() => tenants.id, { onDelete: "cascade" }),
	plan: text("plan", { enum: ["free", "seedling", "sapling", "oak", "evergreen"] })
		.notNull()
		.default("seedling"),
	status: text("status", {
		enum: ["trialing", "active", "past_due", "paused", "canceled", "unpaid"],
	})
		.notNull()
		.default("active"),
	providerCustomerId: text("provider_customer_id"),
	providerSubscriptionId: text("provider_subscription_id"),
	currentPeriodStart: integer("current_period_start"),
	currentPeriodEnd: integer("current_period_end"),
	cancelAtPeriodEnd: integer("cancel_at_period_end").default(0),
	trialEnd: integer("trial_end"),
	paymentMethodLast4: text("payment_method_last4"),
	paymentMethodBrand: text("payment_method_brand"),
	createdAt: integer("created_at")
		.notNull()
		.default(sql`(unixepoch())`),
	updatedAt: integer("updated_at")
		.notNull()
		.default(sql`(unixepoch())`),
});

export const webhookEvents = sqliteTable(
	"webhook_events",
	{
		id: text("id").primaryKey(),
		tenantId: text("tenant_id"),
		provider: text("provider").notNull().default("stripe"),
		providerEventId: text("provider_event_id").notNull(),
		eventType: text("event_type").notNull(),
		payload: text("payload").notNull(),
		processed: integer("processed").default(0),
		processedAt: integer("processed_at"),
		error: text("error"),
		retryCount: integer("retry_count").default(0),
		expiresAt: integer("expires_at"),
		createdAt: integer("created_at")
			.notNull()
			.default(sql`(unixepoch())`),
	},
	(table) => [uniqueIndex("idx_webhooks_provider_event").on(table.provider, table.providerEventId)],
);

export const compedInvites = sqliteTable("comped_invites", {
	id: text("id").primaryKey(),
	email: text("email").notNull().unique(),
	tier: text("tier", { enum: ["seedling", "sapling", "oak", "evergreen"] }).notNull(),
	customMessage: text("custom_message"),
	invitedBy: text("invited_by").notNull(),
	createdAt: integer("created_at")
		.notNull()
		.default(sql`(unixepoch())`),
	usedAt: integer("used_at"),
	usedByTenantId: text("used_by_tenant_id").references(() => tenants.id, { onDelete: "set null" }),
});

export const compedInvitesAudit = sqliteTable("comped_invites_audit", {
	id: text("id").primaryKey(),
	action: text("action", { enum: ["create", "revoke", "use"] }).notNull(),
	inviteId: text("invite_id").notNull(),
	email: text("email").notNull(),
	tier: text("tier").notNull(),
	actorEmail: text("actor_email").notNull(),
	notes: text("notes"),
	createdAt: integer("created_at")
		.notNull()
		.default(sql`(unixepoch())`),
});

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
// SOCIAL: Meadow (Community Feed)
// ─────────────────────────────────────────────────────────────────────────────

export const meadowPosts = sqliteTable(
	"meadow_posts",
	{
		id: text("id").primaryKey(),
		tenantId: text("tenant_id")
			.notNull()
			.references(() => tenants.id, { onDelete: "cascade" }),
		guid: text("guid").notNull(),
		title: text("title").notNull(),
		description: text("description"),
		contentHtml: text("content_html"),
		link: text("link").notNull(),
		authorName: text("author_name"),
		authorSubdomain: text("author_subdomain"),
		tags: text("tags").default("[]"),
		featuredImage: text("featured_image"),
		publishedAt: integer("published_at").notNull(),
		fetchedAt: integer("fetched_at").notNull(),
		contentHash: text("content_hash"),
		score: real("score").default(0),
		reactionCounts: text("reaction_counts").default("{}"),

		// 077: Moderation visibility
		visible: integer("visible").default(1),

		// 078: Notes support
		postType: text("post_type").notNull().default("bloom"),
		userId: text("user_id"),
		body: text("body"),

		// Blazes (088)
		blaze: text("blaze"),
	},
	(table) => [uniqueIndex("idx_meadow_posts_tenant_guid").on(table.tenantId, table.guid)],
);

export const meadowVotes = sqliteTable(
	"meadow_votes",
	{
		id: text("id").primaryKey(),
		userId: text("user_id").notNull(),
		postId: text("post_id")
			.notNull()
			.references(() => meadowPosts.id, { onDelete: "cascade" }),
		createdAt: integer("created_at").notNull(),
	},
	(table) => [uniqueIndex("idx_meadow_votes_user_post").on(table.userId, table.postId)],
);

export const meadowReactions = sqliteTable(
	"meadow_reactions",
	{
		id: text("id").primaryKey(),
		userId: text("user_id").notNull(),
		postId: text("post_id")
			.notNull()
			.references(() => meadowPosts.id, { onDelete: "cascade" }),
		emoji: text("emoji").notNull(),
		createdAt: integer("created_at").notNull(),
	},
	(table) => [
		uniqueIndex("idx_meadow_reactions_unique").on(table.userId, table.postId, table.emoji),
	],
);

export const meadowBookmarks = sqliteTable(
	"meadow_bookmarks",
	{
		id: text("id").primaryKey(),
		userId: text("user_id").notNull(),
		postId: text("post_id")
			.notNull()
			.references(() => meadowPosts.id, { onDelete: "cascade" }),
		createdAt: integer("created_at").notNull(),
	},
	(table) => [uniqueIndex("idx_meadow_bookmarks_user_post").on(table.userId, table.postId)],
);

export const meadowFollows = sqliteTable(
	"meadow_follows",
	{
		id: text("id").primaryKey(),
		followerId: text("follower_id").notNull(),
		followedTenantId: text("followed_tenant_id")
			.notNull()
			.references(() => tenants.id, { onDelete: "cascade" }),
		createdAt: integer("created_at").notNull(),
	},
	(table) => [
		uniqueIndex("idx_meadow_follows_unique").on(table.followerId, table.followedTenantId),
	],
);

export const meadowReports = sqliteTable("meadow_reports", {
	id: text("id").primaryKey(),
	userId: text("user_id").notNull(),
	postId: text("post_id")
		.notNull()
		.references(() => meadowPosts.id, { onDelete: "cascade" }),
	reason: text("reason").notNull(),
	details: text("details"),
	status: text("status", { enum: ["pending", "reviewed", "actioned", "dismissed"] })
		.notNull()
		.default("pending"),
	createdAt: integer("created_at").notNull(),
	reviewedAt: integer("reviewed_at"),
	reviewedBy: text("reviewed_by"),
});

// ─────────────────────────────────────────────────────────────────────────────
// SOCIAL: Reeds (Comments)
// ─────────────────────────────────────────────────────────────────────────────

export const comments = sqliteTable("comments", {
	id: text("id").primaryKey(),
	tenantId: text("tenant_id")
		.notNull()
		.references(() => tenants.id, { onDelete: "cascade" }),
	postId: text("post_id")
		.notNull()
		.references(() => posts.id, { onDelete: "cascade" }),
	authorId: text("author_id").notNull(),
	authorName: text("author_name").notNull().default(""),
	authorEmail: text("author_email").notNull().default(""),
	parentId: text("parent_id"),
	content: text("content").notNull(),
	contentHtml: text("content_html"),
	isPublic: integer("is_public").notNull().default(1),
	status: text("status").notNull().default("pending"),
	moderationNote: text("moderation_note"),
	moderatedAt: text("moderated_at"),
	moderatedBy: text("moderated_by"),
	createdAt: text("created_at")
		.notNull()
		.default(sql`(datetime('now'))`),
	updatedAt: text("updated_at")
		.notNull()
		.default(sql`(datetime('now'))`),
	editedAt: text("edited_at"),
});

export const commentRateLimits = sqliteTable(
	"comment_rate_limits",
	{
		userId: text("user_id").notNull(),
		limitType: text("limit_type").notNull(),
		periodStart: text("period_start").notNull(),
		count: integer("count").notNull().default(0),
	},
	(table) => [
		// Composite primary key via unique index (SQLite)
		uniqueIndex("idx_comment_rate_limits_pk").on(table.userId, table.limitType),
	],
);

export const blockedCommenters = sqliteTable(
	"blocked_commenters",
	{
		tenantId: text("tenant_id")
			.notNull()
			.references(() => tenants.id, { onDelete: "cascade" }),
		blockedUserId: text("blocked_user_id").notNull(),
		reason: text("reason"),
		createdAt: text("created_at")
			.notNull()
			.default(sql`(datetime('now'))`),
	},
	(table) => [uniqueIndex("idx_blocked_commenters_pk").on(table.tenantId, table.blockedUserId)],
);

export const commentSettings = sqliteTable("comment_settings", {
	tenantId: text("tenant_id")
		.primaryKey()
		.references(() => tenants.id, { onDelete: "cascade" }),
	commentsEnabled: integer("comments_enabled").default(1),
	publicCommentsEnabled: integer("public_comments_enabled").default(1),
	whoCanComment: text("who_can_comment").default("anyone"),
	showCommentCount: integer("show_comment_count").default(1),
	notifyOnReply: integer("notify_on_reply").default(1),
	notifyOnPending: integer("notify_on_pending").default(1),
	notifyOnThreadReply: integer("notify_on_thread_reply").default(1),
	updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});

// ─────────────────────────────────────────────────────────────────────────────
// MODERATION: Thorn (Text) & Petal (Image)
// ─────────────────────────────────────────────────────────────────────────────

export const thornModerationLog = sqliteTable("thorn_moderation_log", {
	id: text("id").primaryKey(),
	timestamp: text("timestamp")
		.notNull()
		.default(sql`(datetime('now'))`),
	userId: text("user_id"),
	tenantId: text("tenant_id"),
	contentType: text("content_type").notNull(),
	hookPoint: text("hook_point").notNull(),
	action: text("action").notNull(),
	categories: text("categories"),
	confidence: real("confidence"),
	model: text("model"),
	contentRef: text("content_ref"),
});

export const thornFlaggedContent = sqliteTable("thorn_flagged_content", {
	id: text("id").primaryKey(),
	createdAt: text("created_at")
		.notNull()
		.default(sql`(datetime('now'))`),
	userId: text("user_id"),
	tenantId: text("tenant_id"),
	contentType: text("content_type").notNull(),
	contentRef: text("content_ref"),
	action: text("action").notNull(),
	categories: text("categories"),
	confidence: real("confidence"),
	status: text("status").notNull().default("pending"),
	reviewedBy: text("reviewed_by"),
	reviewedAt: text("reviewed_at"),
	reviewNotes: text("review_notes"),
});

export const petalAccountFlags = sqliteTable(
	"petal_account_flags",
	{
		id: text("id").primaryKey(),
		userId: text("user_id").notNull(),
		flagType: text("flag_type").notNull(),
		createdAt: text("created_at").default(sql`(datetime('now'))`),
		blockUploads: integer("block_uploads").default(1),
		requiresManualReview: integer("requires_manual_review").default(1),
		reviewStatus: text("review_status").default("pending"),
		reviewedBy: text("reviewed_by"),
		reviewedAt: text("reviewed_at"),
		reviewNotes: text("review_notes"),
	},
	(table) => [uniqueIndex("idx_petal_flags_user_type").on(table.userId, table.flagType)],
);

export const petalSecurityLog = sqliteTable("petal_security_log", {
	id: text("id").primaryKey(),
	timestamp: text("timestamp")
		.notNull()
		.default(sql`(datetime('now'))`),
	layer: text("layer").notNull(),
	result: text("result").notNull(),
	category: text("category"),
	confidence: real("confidence"),
	contentHash: text("content_hash").notNull(),
	feature: text("feature").notNull(),
	userId: text("user_id"),
	tenantId: text("tenant_id"),
});

export const petalNcmecQueue = sqliteTable("petal_ncmec_queue", {
	id: text("id").primaryKey(),
	contentHash: text("content_hash").notNull(),
	detectedAt: text("detected_at").notNull(),
	reportDeadline: text("report_deadline").notNull(),
	userId: text("user_id").notNull(),
	tenantId: text("tenant_id"),
	reported: integer("reported").default(0),
	reportedAt: text("reported_at"),
	reportId: text("report_id"),
	lastAttempt: text("last_attempt"),
	attemptCount: integer("attempt_count").default(0),
	lastError: text("last_error"),
});

// ─────────────────────────────────────────────────────────────────────────────
// INFRASTRUCTURE: Sentinel (Stress Testing)
// ─────────────────────────────────────────────────────────────────────────────

export const sentinelRuns = sqliteTable("sentinel_runs", {
	id: text("id").primaryKey(),
	tenantId: text("tenant_id").notNull(),
	name: text("name").notNull(),
	description: text("description"),
	profileType: text("profile_type", {
		enum: ["spike", "sustained", "oscillation", "ramp", "custom"],
	}).notNull(),
	targetOperations: integer("target_operations").notNull(),
	durationSeconds: integer("duration_seconds").notNull(),
	concurrency: integer("concurrency").default(10),
	targetSystems: text("target_systems").notNull().default('["d1_writes", "d1_reads"]'),
	status: text("status", { enum: ["pending", "running", "completed", "failed", "cancelled"] })
		.notNull()
		.default("pending"),
	scheduledAt: integer("scheduled_at"),
	startedAt: integer("started_at"),
	completedAt: integer("completed_at"),
	totalOperations: integer("total_operations").default(0),
	successfulOperations: integer("successful_operations").default(0),
	failedOperations: integer("failed_operations").default(0),
	avgLatencyMs: real("avg_latency_ms"),
	p50LatencyMs: real("p50_latency_ms"),
	p95LatencyMs: real("p95_latency_ms"),
	p99LatencyMs: real("p99_latency_ms"),
	maxLatencyMs: real("max_latency_ms"),
	minLatencyMs: real("min_latency_ms"),
	throughputOpsSec: real("throughput_ops_sec"),
	errorCount: integer("error_count").default(0),
	errorTypes: text("error_types").default("{}"),
	estimatedCostUsd: real("estimated_cost_usd"),
	configSnapshot: text("config_snapshot"),
	triggeredBy: text("triggered_by"),
	notes: text("notes"),
	metadata: text("metadata").default("{}"),
	createdAt: integer("created_at")
		.notNull()
		.default(sql`(unixepoch())`),
	updatedAt: integer("updated_at")
		.notNull()
		.default(sql`(unixepoch())`),
});

export const sentinelMetrics = sqliteTable("sentinel_metrics", {
	id: text("id").primaryKey(),
	runId: text("run_id")
		.notNull()
		.references(() => sentinelRuns.id, { onDelete: "cascade" }),
	tenantId: text("tenant_id").notNull(),
	operationType: text("operation_type").notNull(),
	operationName: text("operation_name"),
	batchIndex: integer("batch_index").default(0),
	startedAt: integer("started_at").notNull(),
	completedAt: integer("completed_at"),
	latencyMs: real("latency_ms"),
	success: integer("success").notNull().default(1),
	errorMessage: text("error_message"),
	errorCode: text("error_code"),
	rowsAffected: integer("rows_affected"),
	bytesTransferred: integer("bytes_transferred"),
	metadata: text("metadata").default("{}"),
});

export const sentinelCheckpoints = sqliteTable("sentinel_checkpoints", {
	id: text("id").primaryKey(),
	runId: text("run_id")
		.notNull()
		.references(() => sentinelRuns.id, { onDelete: "cascade" }),
	tenantId: text("tenant_id").notNull(),
	checkpointIndex: integer("checkpoint_index").notNull(),
	recordedAt: integer("recorded_at").notNull(),
	elapsedSeconds: integer("elapsed_seconds").notNull(),
	operationsCompleted: integer("operations_completed").notNull(),
	operationsFailed: integer("operations_failed").notNull(),
	currentThroughput: real("current_throughput"),
	avgLatencyMs: real("avg_latency_ms"),
	estimatedD1Reads: integer("estimated_d1_reads"),
	estimatedD1Writes: integer("estimated_d1_writes"),
	estimatedKvOps: integer("estimated_kv_ops"),
	estimatedR2Ops: integer("estimated_r2_ops"),
	errorRate: real("error_rate"),
	metadata: text("metadata").default("{}"),
});

export const sentinelBaselines = sqliteTable("sentinel_baselines", {
	id: text("id").primaryKey(),
	tenantId: text("tenant_id").notNull(),
	name: text("name").notNull(),
	description: text("description"),
	profileType: text("profile_type").notNull(),
	targetSystems: text("target_systems").notNull(),
	baselineThroughput: real("baseline_throughput"),
	baselineP50Latency: real("baseline_p50_latency"),
	baselineP95Latency: real("baseline_p95_latency"),
	baselineP99Latency: real("baseline_p99_latency"),
	baselineErrorRate: real("baseline_error_rate"),
	throughputThreshold: real("throughput_threshold"),
	latencyP95Threshold: real("latency_p95_threshold"),
	errorRateThreshold: real("error_rate_threshold"),
	sourceRunIds: text("source_run_ids"),
	isActive: integer("is_active").default(1),
	createdAt: integer("created_at")
		.notNull()
		.default(sql`(unixepoch())`),
	updatedAt: integer("updated_at")
		.notNull()
		.default(sql`(unixepoch())`),
});

export const sentinelSchedules = sqliteTable("sentinel_schedules", {
	id: text("id").primaryKey(),
	tenantId: text("tenant_id").notNull(),
	name: text("name").notNull(),
	description: text("description"),
	cronExpression: text("cron_expression").notNull(),
	timezone: text("timezone").default("UTC"),
	profileType: text("profile_type").notNull(),
	targetOperations: integer("target_operations").notNull(),
	durationSeconds: integer("duration_seconds").notNull(),
	concurrency: integer("concurrency").default(10),
	targetSystems: text("target_systems").notNull().default('["d1_writes", "d1_reads"]'),
	enableMaintenanceMode: integer("enable_maintenance_mode").default(1),
	maintenanceMessage: text("maintenance_message").default(
		"Scheduled infrastructure validation in progress",
	),
	isActive: integer("is_active").default(1),
	lastRunAt: integer("last_run_at"),
	lastRunId: text("last_run_id").references(() => sentinelRuns.id, { onDelete: "set null" }),
	nextRunAt: integer("next_run_at"),
	alertOnFailure: integer("alert_on_failure").default(1),
	alertEmail: text("alert_email"),
	createdAt: integer("created_at")
		.notNull()
		.default(sql`(unixepoch())`),
	updatedAt: integer("updated_at")
		.notNull()
		.default(sql`(unixepoch())`),
});

export const sentinelTestData = sqliteTable("sentinel_test_data", {
	id: text("id").primaryKey(),
	tenantId: text("tenant_id").notNull(),
	data: text("data"),
	createdAt: integer("created_at")
		.notNull()
		.default(sql`(unixepoch())`),
});

// ─────────────────────────────────────────────────────────────────────────────
// INFRASTRUCTURE: Image Processing, Storage, Analytics
// ─────────────────────────────────────────────────────────────────────────────

export const imageHashes = sqliteTable("image_hashes", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	hash: text("hash").notNull().unique(),
	key: text("key").notNull(),
	url: text("url").notNull(),
	createdAt: text("created_at").default(sql`(datetime('now'))`),
	// ALTERs from 023
	imageFormat: text("image_format").default("webp"),
	originalFormat: text("original_format"),
	originalSizeBytes: integer("original_size_bytes"),
	storedSizeBytes: integer("stored_size_bytes"),
});

export const jxlEncodingMetrics = sqliteTable("jxl_encoding_metrics", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	tenantId: text("tenant_id").notNull(),
	success: integer("success").notNull().default(1),
	fallbackReason: text("fallback_reason"),
	encodingTimeMs: integer("encoding_time_ms"),
	originalSizeBytes: integer("original_size_bytes").notNull(),
	encodedSizeBytes: integer("encoded_size_bytes").notNull(),
	width: integer("width"),
	height: integer("height"),
	quality: integer("quality"),
	effort: integer("effort"),
	userAgent: text("user_agent"),
	deviceType: text("device_type"),
	createdAt: text("created_at")
		.notNull()
		.default(sql`(datetime('now'))`),
});

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

export const migrationRuns = sqliteTable("migration_runs", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	runAt: integer("run_at")
		.notNull()
		.default(sql`(unixepoch() * 1000)`),
	hotToWarm: integer("hot_to_warm").default(0),
	warmToCold: integer("warm_to_cold").default(0),
	coldToWarm: integer("cold_to_warm").default(0),
	errors: text("errors"),
	durationMs: integer("duration_ms"),
	completedAt: integer("completed_at"),
});

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

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: Messages, Audit, Trace, Secrets, Exports
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

export const traceFeedback = sqliteTable("trace_feedback", {
	id: text("id").primaryKey(),
	sourcePath: text("source_path").notNull(),
	vote: text("vote", { enum: ["up", "down"] }).notNull(),
	comment: text("comment"),
	ipHash: text("ip_hash").notNull(),
	userAgent: text("user_agent"),
	createdAt: integer("created_at").default(sql`(unixepoch())`),
	readAt: integer("read_at"),
	archivedAt: integer("archived_at"),
});

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

export const storageExports = sqliteTable("storage_exports", {
	id: text("id").primaryKey(),
	tenantId: text("tenant_id")
		.notNull()
		.references(() => tenants.id),
	userEmail: text("user_email").notNull(),
	includeImages: integer("include_images").notNull().default(1),
	deliveryMethod: text("delivery_method").notNull().default("email"),
	status: text("status").notNull().default("pending"),
	progress: integer("progress").notNull().default(0),
	r2Key: text("r2_key"),
	fileSizeBytes: integer("file_size_bytes"),
	itemCounts: text("item_counts"),
	errorMessage: text("error_message"),
	createdAt: integer("created_at").notNull(),
	completedAt: integer("completed_at"),
	expiresAt: integer("expires_at"),
});

// ─────────────────────────────────────────────────────────────────────────────
// AMBER: User-Scoped Storage (files, quota, add-ons, exports)
// ─────────────────────────────────────────────────────────────────────────────

export const amberExports = sqliteTable("amber_exports", {
	id: text("id").primaryKey(),
	userId: text("user_id").notNull(),
	status: text("status").notNull().default("pending"),
	exportType: text("export_type").notNull(),
	filterParams: text("filter_params"),
	r2Key: text("r2_key"),
	sizeBytes: integer("size_bytes"),
	fileCount: integer("file_count"),
	errorMessage: text("error_message"),
	createdAt: text("created_at").default(sql`(datetime('now'))`),
	completedAt: text("completed_at"),
	expiresAt: text("expires_at"),
});

export const storageFiles = sqliteTable("storage_files", {
	id: text("id").primaryKey(),
	userId: text("user_id").notNull(),
	r2Key: text("r2_key").notNull(),
	filename: text("filename").notNull(),
	mimeType: text("mime_type").notNull(),
	sizeBytes: integer("size_bytes").notNull().default(0),
	product: text("product").notNull(),
	category: text("category").notNull(),
	parentId: text("parent_id"),
	metadata: text("metadata"),
	createdAt: text("created_at").default(sql`(datetime('now'))`),
	updatedAt: text("updated_at").default(sql`(datetime('now'))`),
	deletedAt: text("deleted_at"),
});

export const userStorage = sqliteTable("user_storage", {
	userId: text("user_id").primaryKey(),
	tierGb: integer("tier_gb").notNull().default(0),
	additionalGb: integer("additional_gb").notNull().default(0),
	usedBytes: integer("used_bytes").notNull().default(0),
	updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});

export const storageAddons = sqliteTable("storage_addons", {
	id: text("id").primaryKey(),
	userId: text("user_id").notNull(),
	addonType: text("addon_type").notNull(),
	gbAmount: integer("gb_amount").notNull(),
	stripeSubscriptionItemId: text("stripe_subscription_item_id"),
	active: integer("active").notNull().default(1),
	createdAt: text("created_at").default(sql`(datetime('now'))`),
	cancelledAt: text("cancelled_at"),
});

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

// ─────────────────────────────────────────────────────────────────────────────
// MISC: Account Reclamation, Free Account Limits
// ─────────────────────────────────────────────────────────────────────────────

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

export const freeAccountCreationLog = sqliteTable("free_account_creation_log", {
	id: text("id").primaryKey(),
	ipAddress: text("ip_address").notNull(),
	createdAt: integer("created_at")
		.notNull()
		.default(sql`(unixepoch())`),
});
