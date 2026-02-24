/**
 * Drizzle Schema — grove-curios-db (CURIO_DB binding)
 *
 * 45 tables powering Grove's curio widget system: timeline, journey,
 * gallery, pulse, guestbook, hit counters, polls, link gardens,
 * now playing, mood ring, badges, bookmarks, shrines, and more.
 *
 * All tables are tenant-scoped via tenant_id column but FK to tenants
 * table is NOT enforced (tenants lives in grove-engine-db).
 *
 * Derived from curios/001_initial_schema.sql (compiled from engine 024–074).
 */

import { sqliteTable, text, integer, real, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ─────────────────────────────────────────────────────────────────────────────
// TIMELINE
// ─────────────────────────────────────────────────────────────────────────────

export const timelineCurioConfig = sqliteTable('timeline_curio_config', {
	tenantId: text('tenant_id').primaryKey(),
	enabled: integer('enabled').default(0),
	githubUsername: text('github_username'),
	githubTokenEncrypted: text('github_token_encrypted'),
	openrouterKeyEncrypted: text('openrouter_key_encrypted'),
	openrouterModel: text('openrouter_model').default('deepseek/deepseek-v3.2'),
	voicePreset: text('voice_preset').default('professional'),
	customSystemPrompt: text('custom_system_prompt'),
	customSummaryInstructions: text('custom_summary_instructions'),
	customGutterStyle: text('custom_gutter_style'),
	reposInclude: text('repos_include'),
	reposExclude: text('repos_exclude'),
	timezone: text('timezone').default('America/New_York'),
	ownerName: text('owner_name'),
	createdAt: integer('created_at').default(sql`(strftime('%s', 'now'))`),
	updatedAt: integer('updated_at').default(sql`(strftime('%s', 'now'))`),
});

export const timelineSummaries = sqliteTable('timeline_summaries', {
	id: text('id').primaryKey(),
	tenantId: text('tenant_id').notNull(),
	summaryDate: text('summary_date').notNull(),
	briefSummary: text('brief_summary'),
	detailedTimeline: text('detailed_timeline'),
	gutterContent: text('gutter_content'),
	commitCount: integer('commit_count').default(0),
	reposActive: text('repos_active'),
	totalAdditions: integer('total_additions').default(0),
	totalDeletions: integer('total_deletions').default(0),
	aiModel: text('ai_model'),
	aiCost: real('ai_cost').default(0),
	voicePreset: text('voice_preset'),
	inputTokens: integer('input_tokens').default(0),
	outputTokens: integer('output_tokens').default(0),
	generationTimeMs: integer('generation_time_ms'),
	isRestDay: integer('is_rest_day').default(0),
	restDayMessage: text('rest_day_message'),
	contextBrief: text('context_brief'),
	detectedFocus: text('detected_focus'),
	continuationOf: text('continuation_of'),
	focusStreak: integer('focus_streak').default(0),
	createdAt: integer('created_at').default(sql`(strftime('%s', 'now'))`),
}, (table) => [
	uniqueIndex('idx_timeline_summaries_tenant_date_unique').on(table.tenantId, table.summaryDate),
]);

export const timelineActivity = sqliteTable('timeline_activity', {
	tenantId: text('tenant_id').notNull(),
	activityDate: text('activity_date').notNull(),
	commitCount: integer('commit_count').default(0),
	reposActive: text('repos_active'),
	linesAdded: integer('lines_added').default(0),
	linesDeleted: integer('lines_deleted').default(0),
	activityLevel: integer('activity_level').default(0),
	createdAt: integer('created_at').default(sql`(strftime('%s', 'now'))`),
}, (table) => [
	// Composite PK
	uniqueIndex('idx_timeline_activity_pk').on(table.tenantId, table.activityDate),
]);

export const timelineAiUsage = sqliteTable('timeline_ai_usage', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	tenantId: text('tenant_id').notNull(),
	usedAt: integer('used_at').notNull(),
	model: text('model').notNull(),
	inputTokens: integer('input_tokens').default(0),
	outputTokens: integer('output_tokens').default(0),
	costUsd: real('cost_usd').default(0),
	requestCount: integer('request_count').default(1),
	createdAt: integer('created_at').default(sql`(strftime('%s', 'now'))`),
});

// ─────────────────────────────────────────────────────────────────────────────
// JOURNEY
// ─────────────────────────────────────────────────────────────────────────────

export const journeyCurioConfig = sqliteTable('journey_curio_config', {
	tenantId: text('tenant_id').primaryKey(),
	enabled: integer('enabled').default(0),
	githubRepoUrl: text('github_repo_url'),
	githubToken: text('github_token'),
	openrouterKey: text('openrouter_key'),
	openrouterModel: text('openrouter_model').default('deepseek/deepseek-v3.2'),
	snapshotFrequency: text('snapshot_frequency').default('release'),
	showLanguageChart: integer('show_language_chart').default(1),
	showGrowthChart: integer('show_growth_chart').default(1),
	showMilestones: integer('show_milestones').default(1),
	timezone: text('timezone').default('America/New_York'),
	createdAt: integer('created_at').default(sql`(strftime('%s', 'now'))`),
	updatedAt: integer('updated_at').default(sql`(strftime('%s', 'now'))`),
});

export const journeySnapshots = sqliteTable('journey_snapshots', {
	id: text('id').primaryKey(),
	tenantId: text('tenant_id').notNull(),
	snapshotDate: text('snapshot_date').notNull(),
	label: text('label'),
	gitHash: text('git_hash'),
	totalLines: integer('total_lines'),
	languageBreakdown: text('language_breakdown'),
	docLines: integer('doc_lines'),
	totalFiles: integer('total_files'),
	directories: integer('directories'),
	totalCommits: integer('total_commits'),
	commitsSinceLast: integer('commits_since_last'),
	testFiles: integer('test_files'),
	testLines: integer('test_lines'),
	estimatedTokens: integer('estimated_tokens'),
	bundleSizeKb: integer('bundle_size_kb'),
	ingestionSource: text('ingestion_source').default('manual'),
	createdAt: integer('created_at').default(sql`(strftime('%s', 'now'))`),
}, (table) => [
	uniqueIndex('idx_journey_snapshots_unique').on(table.tenantId, table.snapshotDate, table.label),
]);

export const journeySummaries = sqliteTable('journey_summaries', {
	id: text('id').primaryKey(),
	tenantId: text('tenant_id').notNull(),
	snapshotId: text('snapshot_id').notNull().references(() => journeySnapshots.id, { onDelete: 'cascade' }),
	version: text('version'),
	summaryDate: text('summary_date'),
	summary: text('summary'),
	highlightsFeatures: text('highlights_features'),
	highlightsFixes: text('highlights_fixes'),
	statsCommits: integer('stats_commits'),
	statsFeatures: integer('stats_features'),
	statsFixes: integer('stats_fixes'),
	statsRefactoring: integer('stats_refactoring'),
	statsDocs: integer('stats_docs'),
	statsTests: integer('stats_tests'),
	statsPerformance: integer('stats_performance'),
	aiModel: text('ai_model'),
	aiCostUsd: real('ai_cost_usd').default(0),
	createdAt: integer('created_at').default(sql`(strftime('%s', 'now'))`),
});

export const journeyJobs = sqliteTable('journey_jobs', {
	id: text('id').primaryKey(),
	tenantId: text('tenant_id').notNull(),
	jobType: text('job_type'),
	status: text('status').default('pending'),
	progress: integer('progress').default(0),
	resultSnapshotId: text('result_snapshot_id'),
	errorMessage: text('error_message'),
	startedAt: integer('started_at'),
	completedAt: integer('completed_at'),
	createdAt: integer('created_at').default(sql`(strftime('%s', 'now'))`),
});

// ─────────────────────────────────────────────────────────────────────────────
// GALLERY
// ─────────────────────────────────────────────────────────────────────────────

export const galleryCurioConfig = sqliteTable('gallery_curio_config', {
	tenantId: text('tenant_id').primaryKey(),
	enabled: integer('enabled').default(0),
	r2Bucket: text('r2_bucket'),
	cdnBaseUrl: text('cdn_base_url'),
	galleryTitle: text('gallery_title'),
	galleryDescription: text('gallery_description'),
	itemsPerPage: integer('items_per_page').default(30),
	sortOrder: text('sort_order').default('date-desc'),
	showDescriptions: integer('show_descriptions').default(1),
	showDates: integer('show_dates').default(1),
	showTags: integer('show_tags').default(1),
	enableLightbox: integer('enable_lightbox').default(1),
	enableSearch: integer('enable_search').default(1),
	enableFilters: integer('enable_filters').default(1),
	gridStyle: text('grid_style').default('masonry'),
	thumbnailSize: text('thumbnail_size').default('medium'),
	settings: text('settings').default('{}'),
	customCss: text('custom_css'),
	createdAt: integer('created_at').default(sql`(strftime('%s', 'now'))`),
	updatedAt: integer('updated_at').default(sql`(strftime('%s', 'now'))`),
});

export const galleryImages = sqliteTable('gallery_images', {
	id: text('id').primaryKey(),
	tenantId: text('tenant_id').notNull(),
	r2Key: text('r2_key').notNull(),
	parsedDate: text('parsed_date'),
	parsedCategory: text('parsed_category'),
	parsedSlug: text('parsed_slug'),
	customTitle: text('custom_title'),
	customDescription: text('custom_description'),
	customDate: text('custom_date'),
	altText: text('alt_text'),
	fileSize: integer('file_size'),
	uploadedAt: text('uploaded_at'),
	cdnUrl: text('cdn_url'),
	width: integer('width'),
	height: integer('height'),
	sortIndex: integer('sort_index').default(0),
	isFeatured: integer('is_featured').default(0),
	createdAt: integer('created_at').default(sql`(strftime('%s', 'now'))`),
	updatedAt: integer('updated_at').default(sql`(strftime('%s', 'now'))`),
}, (table) => [
	uniqueIndex('idx_gallery_images_tenant_r2').on(table.tenantId, table.r2Key),
]);

export const galleryTags = sqliteTable('gallery_tags', {
	id: text('id').primaryKey(),
	tenantId: text('tenant_id').notNull(),
	name: text('name').notNull(),
	slug: text('slug').notNull(),
	color: text('color').default('#5cb85f'),
	description: text('description'),
	sortOrder: integer('sort_order').default(0),
	createdAt: integer('created_at').default(sql`(strftime('%s', 'now'))`),
}, (table) => [
	uniqueIndex('idx_gallery_tags_tenant_slug').on(table.tenantId, table.slug),
]);

export const galleryImageTags = sqliteTable('gallery_image_tags', {
	imageId: text('image_id').notNull().references(() => galleryImages.id, { onDelete: 'cascade' }),
	tagId: text('tag_id').notNull().references(() => galleryTags.id, { onDelete: 'cascade' }),
	createdAt: integer('created_at').default(sql`(strftime('%s', 'now'))`),
}, (table) => [
	uniqueIndex('idx_gallery_image_tags_pk').on(table.imageId, table.tagId),
]);

export const galleryCollections = sqliteTable('gallery_collections', {
	id: text('id').primaryKey(),
	tenantId: text('tenant_id').notNull(),
	name: text('name').notNull(),
	slug: text('slug').notNull(),
	description: text('description'),
	coverImageId: text('cover_image_id').references(() => galleryImages.id, { onDelete: 'set null' }),
	displayOrder: integer('display_order').default(0),
	isPublic: integer('is_public').default(1),
	createdAt: integer('created_at').default(sql`(strftime('%s', 'now'))`),
	updatedAt: integer('updated_at').default(sql`(strftime('%s', 'now'))`),
}, (table) => [
	uniqueIndex('idx_gallery_collections_tenant_slug').on(table.tenantId, table.slug),
]);

export const galleryCollectionImages = sqliteTable('gallery_collection_images', {
	collectionId: text('collection_id').notNull().references(() => galleryCollections.id, { onDelete: 'cascade' }),
	imageId: text('image_id').notNull().references(() => galleryImages.id, { onDelete: 'cascade' }),
	displayOrder: integer('display_order').default(0),
	createdAt: integer('created_at').default(sql`(strftime('%s', 'now'))`),
}, (table) => [
	uniqueIndex('idx_gallery_collection_images_pk').on(table.collectionId, table.imageId),
]);

// ─────────────────────────────────────────────────────────────────────────────
// PULSE
// ─────────────────────────────────────────────────────────────────────────────

export const pulseCurioConfig = sqliteTable('pulse_curio_config', {
	tenantId: text('tenant_id').primaryKey(),
	enabled: integer('enabled').default(0),
	showHeatmap: integer('show_heatmap').default(1),
	showFeed: integer('show_feed').default(1),
	showStats: integer('show_stats').default(1),
	showTrends: integer('show_trends').default(1),
	showCi: integer('show_ci').default(1),
	reposInclude: text('repos_include'),
	reposExclude: text('repos_exclude'),
	timezone: text('timezone').default('America/New_York'),
	feedMaxItems: integer('feed_max_items').default(100),
	createdAt: integer('created_at').default(sql`(strftime('%s', 'now'))`),
	updatedAt: integer('updated_at').default(sql`(strftime('%s', 'now'))`),
});

export const pulseEvents = sqliteTable('pulse_events', {
	id: text('id').primaryKey(),
	tenantId: text('tenant_id').notNull(),
	deliveryId: text('delivery_id'),
	eventType: text('event_type').notNull(),
	action: text('action'),
	repoName: text('repo_name').notNull(),
	repoFullName: text('repo_full_name').notNull(),
	actor: text('actor').notNull(),
	title: text('title'),
	ref: text('ref'),
	data: text('data'),
	occurredAt: integer('occurred_at').notNull(),
	createdAt: integer('created_at').default(sql`(strftime('%s', 'now'))`),
}, (table) => [
	uniqueIndex('idx_pulse_events_delivery').on(table.tenantId, table.deliveryId),
]);

export const pulseDailyStats = sqliteTable('pulse_daily_stats', {
	id: text('id').primaryKey(),
	tenantId: text('tenant_id').notNull(),
	date: text('date').notNull(),
	repoName: text('repo_name'),
	commits: integer('commits').default(0),
	linesAdded: integer('lines_added').default(0),
	linesRemoved: integer('lines_removed').default(0),
	filesChanged: integer('files_changed').default(0),
	prsOpened: integer('prs_opened').default(0),
	prsMerged: integer('prs_merged').default(0),
	prsClosed: integer('prs_closed').default(0),
	issuesOpened: integer('issues_opened').default(0),
	issuesClosed: integer('issues_closed').default(0),
	releases: integer('releases').default(0),
	ciPasses: integer('ci_passes').default(0),
	ciFailures: integer('ci_failures').default(0),
	starsTotal: integer('stars_total'),
	forksTotal: integer('forks_total'),
	createdAt: integer('created_at').default(sql`(strftime('%s', 'now'))`),
	updatedAt: integer('updated_at').default(sql`(strftime('%s', 'now'))`),
}, (table) => [
	uniqueIndex('idx_pulse_daily_stats_unique').on(table.tenantId, table.date, table.repoName),
]);

export const pulseHourlyActivity = sqliteTable('pulse_hourly_activity', {
	id: text('id').primaryKey(),
	tenantId: text('tenant_id').notNull(),
	date: text('date').notNull(),
	hour: integer('hour').notNull(),
	commits: integer('commits').default(0),
	events: integer('events').default(0),
	createdAt: integer('created_at').default(sql`(strftime('%s', 'now'))`),
}, (table) => [
	uniqueIndex('idx_pulse_hourly_unique').on(table.tenantId, table.date, table.hour),
]);

// ─────────────────────────────────────────────────────────────────────────────
// GUESTBOOK
// ─────────────────────────────────────────────────────────────────────────────

export const guestbookConfig = sqliteTable('guestbook_config', {
	tenantId: text('tenant_id').primaryKey(),
	enabled: integer('enabled').notNull().default(0),
	style: text('style').notNull().default('cozy'),
	entriesPerPage: integer('entries_per_page').notNull().default(20),
	requireApproval: integer('require_approval').notNull().default(1),
	allowEmoji: integer('allow_emoji').notNull().default(1),
	maxMessageLength: integer('max_message_length').notNull().default(500),
	customPrompt: text('custom_prompt'),
	createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
	updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

export const guestbookEntries = sqliteTable('guestbook_entries', {
	id: text('id').primaryKey(),
	tenantId: text('tenant_id').notNull(),
	name: text('name').notNull().default('Anonymous Wanderer'),
	message: text('message').notNull(),
	emoji: text('emoji'),
	approved: integer('approved').notNull().default(0),
	ipHash: text('ip_hash'),
	createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
	updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

// ─────────────────────────────────────────────────────────────────────────────
// HIT COUNTER
// ─────────────────────────────────────────────────────────────────────────────

export const hitCounters = sqliteTable('hit_counters', {
	id: text('id').primaryKey(),
	tenantId: text('tenant_id').notNull(),
	pagePath: text('page_path').notNull().default('/'),
	count: integer('count').notNull().default(0),
	style: text('style').notNull().default('classic'),
	label: text('label').default('You are visitor'),
	showSinceDate: integer('show_since_date').notNull().default(1),
	countMode: text('count_mode').notNull().default('every'),
	sinceDateStyle: text('since_date_style').notNull().default('footnote'),
	startedAt: text('started_at').notNull().default(sql`(datetime('now'))`),
	updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
}, (table) => [
	uniqueIndex('idx_hit_counters_tenant_path').on(table.tenantId, table.pagePath),
]);

export const hitCounterVisitors = sqliteTable('hit_counter_visitors', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	tenantId: text('tenant_id').notNull(),
	pagePath: text('page_path').notNull().default('/'),
	visitorHash: text('visitor_hash').notNull(),
	visitedDate: text('visited_date').notNull(),
	createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
}, (table) => [
	uniqueIndex('idx_hcv_unique').on(table.tenantId, table.pagePath, table.visitorHash, table.visitedDate),
]);

// ─────────────────────────────────────────────────────────────────────────────
// STATUS BADGE
// ─────────────────────────────────────────────────────────────────────────────

export const statusBadges = sqliteTable('status_badges', {
	id: text('id').primaryKey(),
	tenantId: text('tenant_id').notNull(),
	badgeType: text('badge_type').notNull(),
	position: text('position').notNull().default('floating'),
	animated: integer('animated').notNull().default(1),
	customText: text('custom_text'),
	showDate: integer('show_date').notNull().default(0),
	createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVITY STATUS
// ─────────────────────────────────────────────────────────────────────────────

export const activityStatus = sqliteTable('activity_status', {
	tenantId: text('tenant_id').primaryKey(),
	statusText: text('status_text'),
	statusEmoji: text('status_emoji'),
	statusType: text('status_type').notNull().default('manual'),
	preset: text('preset'),
	autoSource: text('auto_source'),
	expiresAt: text('expires_at'),
	updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

// ─────────────────────────────────────────────────────────────────────────────
// LINK GARDEN
// ─────────────────────────────────────────────────────────────────────────────

export const linkGardens = sqliteTable('link_gardens', {
	id: text('id').primaryKey(),
	tenantId: text('tenant_id').notNull(),
	title: text('title').notNull().default('Links'),
	description: text('description'),
	style: text('style').notNull().default('list'),
	createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
	updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

export const linkGardenItems = sqliteTable('link_garden_items', {
	id: text('id').primaryKey(),
	gardenId: text('garden_id').notNull().references(() => linkGardens.id, { onDelete: 'cascade' }),
	tenantId: text('tenant_id').notNull(),
	url: text('url').notNull(),
	title: text('title').notNull(),
	description: text('description'),
	faviconUrl: text('favicon_url'),
	buttonImageUrl: text('button_image_url'),
	category: text('category'),
	sortOrder: integer('sort_order').notNull().default(0),
	addedAt: text('added_at').notNull().default(sql`(datetime('now'))`),
});

// ─────────────────────────────────────────────────────────────────────────────
// NOW PLAYING
// ─────────────────────────────────────────────────────────────────────────────

export const nowplayingConfig = sqliteTable('nowplaying_config', {
	tenantId: text('tenant_id').primaryKey(),
	provider: text('provider').notNull().default('manual'),
	accessTokenEncrypted: text('access_token_encrypted'),
	refreshTokenEncrypted: text('refresh_token_encrypted'),
	displayStyle: text('display_style').notNull().default('compact'),
	showAlbumArt: integer('show_album_art').notNull().default(1),
	showProgress: integer('show_progress').notNull().default(0),
	fallbackText: text('fallback_text'),
	lastFmUsername: text('last_fm_username'),
	updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

export const nowplayingHistory = sqliteTable('nowplaying_history', {
	id: text('id').primaryKey(),
	tenantId: text('tenant_id').notNull(),
	trackName: text('track_name').notNull(),
	artist: text('artist').notNull(),
	album: text('album'),
	albumArtUrl: text('album_art_url'),
	playedAt: text('played_at').notNull().default(sql`(datetime('now'))`),
});

// ─────────────────────────────────────────────────────────────────────────────
// POLLS
// ─────────────────────────────────────────────────────────────────────────────

export const polls = sqliteTable('polls', {
	id: text('id').primaryKey(),
	tenantId: text('tenant_id').notNull(),
	question: text('question').notNull(),
	description: text('description'),
	pollType: text('poll_type').notNull().default('single'),
	options: text('options').notNull().default('[]'),
	resultsVisibility: text('results_visibility').notNull().default('after-vote'),
	isPinned: integer('is_pinned').notNull().default(0),
	closeDate: text('close_date'),
	createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
	updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

export const pollVotes = sqliteTable('poll_votes', {
	id: text('id').primaryKey(),
	pollId: text('poll_id').notNull().references(() => polls.id, { onDelete: 'cascade' }),
	tenantId: text('tenant_id').notNull(),
	voterHash: text('voter_hash').notNull(),
	selectedOptions: text('selected_options').notNull().default('[]'),
	votedAt: text('voted_at').notNull().default(sql`(datetime('now'))`),
}, (table) => [
	uniqueIndex('idx_poll_votes_unique').on(table.pollId, table.voterHash),
]);

// ─────────────────────────────────────────────────────────────────────────────
// WEBRING
// ─────────────────────────────────────────────────────────────────────────────

export const webringMemberships = sqliteTable('webring_memberships', {
	id: text('id').primaryKey(),
	tenantId: text('tenant_id').notNull(),
	ringName: text('ring_name').notNull(),
	ringUrl: text('ring_url'),
	prevUrl: text('prev_url').notNull(),
	nextUrl: text('next_url').notNull(),
	homeUrl: text('home_url'),
	badgeStyle: text('badge_style').notNull().default('classic'),
	position: text('position').notNull().default('footer'),
	sortOrder: integer('sort_order').notNull().default(0),
	joinedAt: text('joined_at').notNull().default(sql`(datetime('now'))`),
});

// ─────────────────────────────────────────────────────────────────────────────
// ARTIFACTS
// ─────────────────────────────────────────────────────────────────────────────

export const artifacts = sqliteTable('artifacts', {
	id: text('id').primaryKey(),
	tenantId: text('tenant_id').notNull(),
	artifactType: text('artifact_type').notNull(),
	placement: text('placement').notNull().default('right-vine'),
	config: text('config').notNull().default('{}'),
	sortOrder: integer('sort_order').notNull().default(0),
	createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});

// ─────────────────────────────────────────────────────────────────────────────
// CURSOR
// ─────────────────────────────────────────────────────────────────────────────

export const cursorConfig = sqliteTable('cursor_config', {
	tenantId: text('tenant_id').primaryKey(),
	cursorType: text('cursor_type').notNull().default('preset'),
	preset: text('preset').default('leaf'),
	customUrl: text('custom_url'),
	trailEnabled: integer('trail_enabled').notNull().default(0),
	trailEffect: text('trail_effect').default('sparkle'),
	trailLength: integer('trail_length').notNull().default(8),
	updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

// ─────────────────────────────────────────────────────────────────────────────
// MOOD RING
// ─────────────────────────────────────────────────────────────────────────────

export const moodRingConfig = sqliteTable('mood_ring_config', {
	tenantId: text('tenant_id').primaryKey(),
	mode: text('mode').notNull().default('time'),
	manualMood: text('manual_mood'),
	manualColor: text('manual_color'),
	colorScheme: text('color_scheme').notNull().default('default'),
	displayStyle: text('display_style').notNull().default('ring'),
	showMoodLog: integer('show_mood_log').notNull().default(0),
	updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

export const moodRingLog = sqliteTable('mood_ring_log', {
	id: text('id').primaryKey(),
	tenantId: text('tenant_id').notNull(),
	mood: text('mood').notNull(),
	color: text('color').notNull(),
	note: text('note'),
	loggedAt: text('logged_at').notNull().default(sql`(datetime('now'))`),
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOGROLL
// ─────────────────────────────────────────────────────────────────────────────

export const blogrollItems = sqliteTable('blogroll_items', {
	id: text('id').primaryKey(),
	tenantId: text('tenant_id').notNull(),
	url: text('url').notNull(),
	title: text('title').notNull(),
	description: text('description'),
	feedUrl: text('feed_url'),
	faviconUrl: text('favicon_url'),
	lastPostTitle: text('last_post_title'),
	lastPostUrl: text('last_post_url'),
	lastPostDate: text('last_post_date'),
	lastFeedCheck: text('last_feed_check'),
	sortOrder: integer('sort_order').notNull().default(0),
	addedAt: text('added_at').notNull().default(sql`(datetime('now'))`),
	updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

// ─────────────────────────────────────────────────────────────────────────────
// BADGES
// ─────────────────────────────────────────────────────────────────────────────

export const badgeDefinitions = sqliteTable('badge_definitions', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	description: text('description').notNull(),
	iconUrl: text('icon_url').notNull(),
	category: text('category').notNull().default('achievement'),
	rarity: text('rarity').notNull().default('common'),
	autoCriteria: text('auto_criteria'),
	isSystem: integer('is_system').notNull().default(0),
	createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});

export const tenantBadges = sqliteTable('tenant_badges', {
	id: text('id').primaryKey(),
	tenantId: text('tenant_id').notNull(),
	badgeId: text('badge_id').notNull().references(() => badgeDefinitions.id, { onDelete: 'cascade' }),
	earnedAt: text('earned_at').notNull().default(sql`(datetime('now'))`),
	displayOrder: integer('display_order').notNull().default(0),
	isShowcased: integer('is_showcased').notNull().default(0),
}, (table) => [
	uniqueIndex('idx_tenant_badges_unique').on(table.tenantId, table.badgeId),
]);

export const customBadges = sqliteTable('custom_badges', {
	id: text('id').primaryKey(),
	tenantId: text('tenant_id').notNull(),
	name: text('name').notNull(),
	description: text('description').notNull(),
	iconUrl: text('icon_url').notNull(),
	createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});

// ─────────────────────────────────────────────────────────────────────────────
// AMBIENT
// ─────────────────────────────────────────────────────────────────────────────

export const ambientConfig = sqliteTable('ambient_config', {
	tenantId: text('tenant_id').primaryKey(),
	soundSet: text('sound_set').notNull().default('forest-rain'),
	volume: integer('volume').notNull().default(30),
	enabled: integer('enabled').notNull().default(0),
	customUrl: text('custom_url'),
	updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

// ─────────────────────────────────────────────────────────────────────────────
// BOOKMARK SHELF
// ─────────────────────────────────────────────────────────────────────────────

export const bookmarkShelves = sqliteTable('bookmark_shelves', {
	id: text('id').primaryKey(),
	tenantId: text('tenant_id').notNull(),
	name: text('name').notNull(),
	description: text('description'),
	sortOrder: integer('sort_order').notNull().default(0),
	createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});

export const bookmarks = sqliteTable('bookmarks', {
	id: text('id').primaryKey(),
	tenantId: text('tenant_id').notNull(),
	shelfId: text('shelf_id').notNull().references(() => bookmarkShelves.id, { onDelete: 'cascade' }),
	url: text('url').notNull(),
	title: text('title').notNull(),
	author: text('author'),
	description: text('description'),
	coverUrl: text('cover_url'),
	category: text('category'),
	isCurrentlyReading: integer('is_currently_reading').notNull().default(0),
	isFavorite: integer('is_favorite').notNull().default(0),
	sortOrder: integer('sort_order').notNull().default(0),
	addedAt: text('added_at').notNull().default(sql`(datetime('now'))`),
});

// ─────────────────────────────────────────────────────────────────────────────
// SHRINES
// ─────────────────────────────────────────────────────────────────────────────

export const shrines = sqliteTable('shrines', {
	id: text('id').primaryKey(),
	tenantId: text('tenant_id').notNull(),
	title: text('title').notNull(),
	shrineType: text('shrine_type').notNull().default('blank'),
	description: text('description'),
	size: text('size').notNull().default('medium'),
	frameStyle: text('frame_style').notNull().default('minimal'),
	contents: text('contents').notNull().default('[]'),
	isPublished: integer('is_published').notNull().default(0),
	sortOrder: integer('sort_order').notNull().default(0),
	createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
	updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

// ─────────────────────────────────────────────────────────────────────────────
// CLIPART
// ─────────────────────────────────────────────────────────────────────────────

export const clipartPlacements = sqliteTable('clipart_placements', {
	id: text('id').primaryKey(),
	tenantId: text('tenant_id').notNull(),
	assetId: text('asset_id').notNull(),
	pagePath: text('page_path').notNull().default('/'),
	xPosition: real('x_position').notNull().default(50),
	yPosition: real('y_position').notNull().default(50),
	scale: real('scale').notNull().default(1.0),
	rotation: real('rotation').notNull().default(0),
	zIndex: integer('z_index').notNull().default(10),
	createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOM UPLOADS
// ─────────────────────────────────────────────────────────────────────────────

export const customUploads = sqliteTable('custom_uploads', {
	id: text('id').primaryKey(),
	tenantId: text('tenant_id').notNull(),
	filename: text('filename').notNull(),
	originalFilename: text('original_filename').notNull(),
	mimeType: text('mime_type').notNull(),
	fileSize: integer('file_size').notNull().default(0),
	width: integer('width'),
	height: integer('height'),
	r2Key: text('r2_key').notNull(),
	thumbnailR2Key: text('thumbnail_r2_key'),
	usageCount: integer('usage_count').notNull().default(0),
	uploadedAt: text('uploaded_at').notNull().default(sql`(datetime('now'))`),
});
