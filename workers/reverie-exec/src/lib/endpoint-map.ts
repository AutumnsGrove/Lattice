/**
 * Endpoint Map — Domain-to-API Translation
 *
 * Maps each Reverie domain to its SvelteKit API endpoint, HTTP method,
 * payload style, and per-field key translation.
 *
 * Two payload styles:
 *
 * 1. "settings-kv" — PUT /api/admin/settings
 *    Takes { setting_key, setting_value } — one field per API call.
 *    Used by: foliage.accent, foliage.typography, social.canopy
 *
 * 2. "object-merge" — PUT/POST /api/curios/*, /api/admin/theme, etc.
 *    Takes a JSON body with all fields merged — one call per domain.
 *    Used by: all curios domains, theme, profile, posts, pages, etc.
 */

// =============================================================================
// Types
// =============================================================================

export type PayloadStyle = "settings-kv" | "object-merge";

export interface FieldMapping {
	/** The API-side key name (snake_case for settings-kv, camelCase for object-merge) */
	apiKey: string;
}

export interface DomainEndpoint {
	/** API path (e.g., "/api/admin/settings") */
	path: string;
	/** HTTP method */
	method: "PUT" | "POST";
	/** Payload construction style */
	style: PayloadStyle;
	/** Per-field key mappings (domain field name → API field name) */
	fields: Record<string, FieldMapping>;
}

// =============================================================================
// Endpoint Map — All 30 Writable Domains
// =============================================================================

export const ENDPOINT_MAP: Record<string, DomainEndpoint> = {
	// ── Appearance (Settings-KV: /api/admin/settings) ───────────────────────
	"foliage.accent": {
		path: "/api/admin/settings",
		method: "PUT",
		style: "settings-kv",
		fields: {
			accentColor: { apiKey: "accent_color" },
		},
	},
	"foliage.typography": {
		path: "/api/admin/settings",
		method: "PUT",
		style: "settings-kv",
		fields: {
			fontFamily: { apiKey: "font_family" },
			customTypography: { apiKey: "custom_typography" },
		},
	},

	// ── Appearance (Object-Merge: /api/admin/theme) ─────────────────────────
	"foliage.theme": {
		path: "/api/admin/theme",
		method: "PUT",
		style: "object-merge",
		fields: {
			themeId: { apiKey: "themeId" },
			communityThemeId: { apiKey: "communityThemeId" },
			customizerEnabled: { apiKey: "customizerEnabled" },
		},
	},
	"foliage.colors": {
		path: "/api/admin/theme",
		method: "PUT",
		style: "object-merge",
		fields: {
			customColors: { apiKey: "customColors" },
		},
	},
	"foliage.css": {
		path: "/api/admin/theme",
		method: "PUT",
		style: "object-merge",
		fields: {
			customCss: { apiKey: "customCss" },
		},
	},
	"foliage.layout": {
		path: "/api/admin/theme",
		method: "PUT",
		style: "object-merge",
		fields: {
			customLayout: { apiKey: "customLayout" },
		},
	},

	// ── Content ─────────────────────────────────────────────────────────────
	"content.blazes": {
		path: "/api/blazes",
		method: "POST",
		style: "object-merge",
		fields: {
			slug: { apiKey: "slug" },
			label: { apiKey: "label" },
			icon: { apiKey: "icon" },
			color: { apiKey: "color" },
			sortOrder: { apiKey: "sortOrder" },
		},
	},
	"content.pages": {
		path: "/api/pages",
		method: "POST",
		style: "object-merge",
		fields: {
			title: { apiKey: "title" },
			slug: { apiKey: "slug" },
			description: { apiKey: "description" },
			markdownContent: { apiKey: "markdownContent" },
			hero: { apiKey: "hero" },
			font: { apiKey: "font" },
			type: { apiKey: "type" },
		},
	},
	"content.posts": {
		path: "/api/blooms",
		method: "POST",
		style: "object-merge",
		fields: {
			title: { apiKey: "title" },
			slug: { apiKey: "slug" },
			description: { apiKey: "description" },
			markdownContent: { apiKey: "markdownContent" },
			status: { apiKey: "status" },
			font: { apiKey: "font" },
			featuredImage: { apiKey: "featuredImage" },
			tags: { apiKey: "tags" },
			blaze: { apiKey: "blaze" },
			meadowExclude: { apiKey: "meadowExclude" },
			storageLocation: { apiKey: "storageLocation" },
			gutterContent: { apiKey: "gutterContent" },
		},
	},

	// ── Curios ──────────────────────────────────────────────────────────────
	"curios.ambient": {
		path: "/api/curios/ambient",
		method: "PUT",
		style: "object-merge",
		fields: {
			enabled: { apiKey: "enabled" },
			soundSet: { apiKey: "soundSet" },
			volume: { apiKey: "volume" },
			customUrl: { apiKey: "customUrl" },
		},
	},
	"curios.blogroll": {
		path: "/api/curios/blogroll",
		method: "POST",
		style: "object-merge",
		fields: {
			url: { apiKey: "url" },
			title: { apiKey: "title" },
			description: { apiKey: "description" },
			feedUrl: { apiKey: "feedUrl" },
			sortOrder: { apiKey: "sortOrder" },
		},
	},
	"curios.bookmarks": {
		path: "/api/curios/bookmarks",
		method: "POST",
		style: "object-merge",
		fields: {
			url: { apiKey: "url" },
			title: { apiKey: "title" },
			description: { apiKey: "description" },
			tags: { apiKey: "tags" },
			isPinned: { apiKey: "isPinned" },
			isPrivate: { apiKey: "isPrivate" },
		},
	},
	"curios.cursor": {
		path: "/api/curios/cursor",
		method: "PUT",
		style: "object-merge",
		fields: {
			cursorType: { apiKey: "cursorType" },
			preset: { apiKey: "preset" },
			customUrl: { apiKey: "customUrl" },
			trailEnabled: { apiKey: "trailEnabled" },
			trailEffect: { apiKey: "trailEffect" },
			trailLength: { apiKey: "trailLength" },
		},
	},
	"curios.gallery": {
		path: "/api/curios/gallery/config",
		method: "PUT",
		style: "object-merge",
		fields: {
			enabled: { apiKey: "enabled" },
			galleryTitle: { apiKey: "galleryTitle" },
			galleryDescription: { apiKey: "galleryDescription" },
			itemsPerPage: { apiKey: "itemsPerPage" },
			sortOrder: { apiKey: "sortOrder" },
			showDescriptions: { apiKey: "showDescriptions" },
			showDates: { apiKey: "showDates" },
			showTags: { apiKey: "showTags" },
			enableLightbox: { apiKey: "enableLightbox" },
			enableSearch: { apiKey: "enableSearch" },
			enableFilters: { apiKey: "enableFilters" },
			gridStyle: { apiKey: "gridStyle" },
			thumbnailSize: { apiKey: "thumbnailSize" },
			customCss: { apiKey: "customCss" },
		},
	},
	"curios.guestbook": {
		path: "/api/curios/guestbook/config",
		method: "PUT",
		style: "object-merge",
		fields: {
			enabled: { apiKey: "enabled" },
			style: { apiKey: "style" },
			entriesPerPage: { apiKey: "entriesPerPage" },
			requireApproval: { apiKey: "requireApproval" },
			allowEmoji: { apiKey: "allowEmoji" },
			maxMessageLength: { apiKey: "maxMessageLength" },
			customPrompt: { apiKey: "customPrompt" },
		},
	},
	"curios.hitcounter": {
		path: "/api/curios/hitcounter",
		method: "PUT",
		style: "object-merge",
		fields: {
			pagePath: { apiKey: "pagePath" },
			style: { apiKey: "style" },
			label: { apiKey: "label" },
			showSinceDate: { apiKey: "showSinceDate" },
			countMode: { apiKey: "countMode" },
			sinceDateStyle: { apiKey: "sinceDateStyle" },
		},
	},
	"curios.journey": {
		path: "/api/curios/journey/config",
		method: "PUT",
		style: "object-merge",
		fields: {
			enabled: { apiKey: "enabled" },
			githubRepoUrl: { apiKey: "githubRepoUrl" },
			snapshotFrequency: { apiKey: "snapshotFrequency" },
			showLanguageChart: { apiKey: "showLanguageChart" },
			showGrowthChart: { apiKey: "showGrowthChart" },
			showMilestones: { apiKey: "showMilestones" },
			timezone: { apiKey: "timezone" },
		},
	},
	"curios.linkgarden": {
		path: "/api/curios/linkgarden",
		method: "POST",
		style: "object-merge",
		fields: {
			title: { apiKey: "title" },
			description: { apiKey: "description" },
			style: { apiKey: "style" },
		},
	},
	"curios.moodring": {
		path: "/api/curios/moodring",
		method: "PUT",
		style: "object-merge",
		fields: {
			mode: { apiKey: "mode" },
			manualMood: { apiKey: "manualMood" },
			manualColor: { apiKey: "manualColor" },
			colorScheme: { apiKey: "colorScheme" },
			displayStyle: { apiKey: "displayStyle" },
			showMoodLog: { apiKey: "showMoodLog" },
		},
	},
	"curios.nowplaying": {
		path: "/api/curios/nowplaying",
		method: "PUT",
		style: "object-merge",
		fields: {
			provider: { apiKey: "provider" },
			displayStyle: { apiKey: "displayStyle" },
			showAlbumArt: { apiKey: "showAlbumArt" },
			showProgress: { apiKey: "showProgress" },
			fallbackText: { apiKey: "fallbackText" },
			lastFmUsername: { apiKey: "lastFmUsername" },
		},
	},
	"curios.polls": {
		path: "/api/curios/polls",
		method: "POST",
		style: "object-merge",
		fields: {
			question: { apiKey: "question" },
			description: { apiKey: "description" },
			pollType: { apiKey: "pollType" },
			options: { apiKey: "options" },
			resultsVisibility: { apiKey: "resultsVisibility" },
			isPinned: { apiKey: "isPinned" },
		},
	},
	"curios.pulse": {
		path: "/api/curios/pulse/config",
		method: "PUT",
		style: "object-merge",
		fields: {
			enabled: { apiKey: "enabled" },
			showHeatmap: { apiKey: "showHeatmap" },
			showFeed: { apiKey: "showFeed" },
			showStats: { apiKey: "showStats" },
			showTrends: { apiKey: "showTrends" },
			showCi: { apiKey: "showCi" },
			reposInclude: { apiKey: "reposInclude" },
			reposExclude: { apiKey: "reposExclude" },
			feedMaxItems: { apiKey: "feedMaxItems" },
		},
	},
	"curios.timeline": {
		path: "/api/curios/timeline/config",
		method: "PUT",
		style: "object-merge",
		fields: {
			enabled: { apiKey: "enabled" },
			githubUsername: { apiKey: "githubUsername" },
			voicePreset: { apiKey: "voicePreset" },
			customSystemPrompt: { apiKey: "customSystemPrompt" },
			customSummaryInstructions: { apiKey: "customSummaryInstructions" },
			reposInclude: { apiKey: "reposInclude" },
			reposExclude: { apiKey: "reposExclude" },
			timezone: { apiKey: "timezone" },
			ownerName: { apiKey: "ownerName" },
			openrouterModel: { apiKey: "openrouterModel" },
		},
	},
	"curios.webring": {
		path: "/api/curios/webring",
		method: "PUT",
		style: "object-merge",
		fields: {
			enabled: { apiKey: "enabled" },
			webringId: { apiKey: "webringId" },
			displayStyle: { apiKey: "displayStyle" },
			showMemberCount: { apiKey: "showMemberCount" },
			customLabel: { apiKey: "customLabel" },
			prevLabel: { apiKey: "prevLabel" },
			nextLabel: { apiKey: "nextLabel" },
		},
	},

	// ── Identity ────────────────────────────────────────────────────────────
	"identity.activitystatus": {
		path: "/api/admin/activity-status",
		method: "PUT",
		style: "object-merge",
		fields: {
			enabled: { apiKey: "enabled" },
			statusText: { apiKey: "statusText" },
			statusEmoji: { apiKey: "statusEmoji" },
			availability: { apiKey: "availability" },
			autoExpire: { apiKey: "autoExpire" },
			expireAfterMinutes: { apiKey: "expireAfterMinutes" },
		},
	},
	"identity.badges": {
		path: "/api/admin/badges",
		method: "PUT",
		style: "object-merge",
		fields: {
			pronounBadge: { apiKey: "pronounBadge" },
			roleBadges: { apiKey: "roleBadges" },
			customBadges: { apiKey: "customBadges" },
		},
	},
	"identity.profile": {
		path: "/api/save-profile",
		method: "POST",
		style: "object-merge",
		fields: {
			displayName: { apiKey: "displayName" },
			favoriteColor: { apiKey: "favoriteColor" },
			interests: { apiKey: "interests" },
			// NOTE: "username" deliberately excluded from allowlist
		},
	},

	// ── Social ──────────────────────────────────────────────────────────────
	"social.canopy": {
		path: "/api/admin/settings",
		method: "PUT",
		style: "settings-kv",
		fields: {
			canopyVisible: { apiKey: "canopy_visible" },
			canopyBanner: { apiKey: "canopy_banner" },
			canopyCategories: { apiKey: "canopy_categories" },
			canopyShowForests: { apiKey: "canopy_show_forests" },
		},
	},
	"social.comments": {
		path: "/api/admin/comments/settings",
		method: "PUT",
		style: "object-merge",
		fields: {
			commentsEnabled: { apiKey: "commentsEnabled" },
			publicCommentsEnabled: { apiKey: "publicCommentsEnabled" },
			whoCanComment: { apiKey: "whoCanComment" },
			showCommentCount: { apiKey: "showCommentCount" },
			notifyOnReply: { apiKey: "notifyOnReply" },
			notifyOnPending: { apiKey: "notifyOnPending" },
			notifyOnThreadReply: { apiKey: "notifyOnThreadReply" },
		},
	},
	"social.meadow": {
		path: "/api/admin/meadow",
		method: "PUT",
		style: "object-merge",
		fields: {
			meadowOptIn: { apiKey: "meadowOptIn" },
		},
	},
};

/**
 * Look up the endpoint configuration for a domain.
 * Returns undefined for unknown or read-only domains.
 */
export function getEndpoint(domain: string): DomainEndpoint | undefined {
	return ENDPOINT_MAP[domain];
}
