/**
 * Write Allowlist — Independent Security Gate
 *
 * Hand-maintained list of every domain+field the execution worker is
 * permitted to write. Does NOT import from @autumnsgrove/lattice/reverie.
 * If Reverie's schema registry is compromised, this allowlist still blocks
 * unauthorized writes.
 *
 * Explicitly ABSENT: infra.billing, infra.flags (read-only),
 * identity.profile.username (sensitive — username changes need extra checks)
 */

// =============================================================================
// Allowlist
// =============================================================================

export const WRITE_ALLOWLIST: Record<string, ReadonlySet<string>> = {
	// ── Appearance ──────────────────────────────────────────────────────────
	"foliage.accent": new Set(["accentColor"]),
	"foliage.colors": new Set(["customColors"]),
	"foliage.css": new Set(["customCss"]),
	"foliage.layout": new Set(["customLayout"]),
	"foliage.theme": new Set(["themeId", "communityThemeId", "customizerEnabled"]),
	"foliage.typography": new Set(["fontFamily", "customTypography"]),

	// ── Content ─────────────────────────────────────────────────────────────
	"content.blazes": new Set(["slug", "label", "icon", "color", "sortOrder"]),
	"content.pages": new Set([
		"title",
		"slug",
		"description",
		"markdownContent",
		"hero",
		"font",
		"type",
	]),
	"content.posts": new Set([
		"title",
		"slug",
		"description",
		"markdownContent",
		"status",
		"font",
		"featuredImage",
		"tags",
		"blaze",
		"meadowExclude",
		"storageLocation",
		"gutterContent",
	]),

	// ── Curios ──────────────────────────────────────────────────────────────
	"curios.ambient": new Set(["enabled", "soundSet", "volume", "customUrl"]),
	"curios.blogroll": new Set(["url", "title", "description", "feedUrl", "sortOrder"]),
	"curios.bookmarks": new Set(["url", "title", "description", "tags", "isPinned", "isPrivate"]),
	"curios.cursor": new Set([
		"cursorType",
		"preset",
		"customUrl",
		"trailEnabled",
		"trailEffect",
		"trailLength",
	]),
	"curios.gallery": new Set([
		"enabled",
		"galleryTitle",
		"galleryDescription",
		"itemsPerPage",
		"sortOrder",
		"showDescriptions",
		"showDates",
		"showTags",
		"enableLightbox",
		"enableSearch",
		"enableFilters",
		"gridStyle",
		"thumbnailSize",
		"customCss",
	]),
	"curios.guestbook": new Set([
		"enabled",
		"style",
		"entriesPerPage",
		"requireApproval",
		"allowEmoji",
		"maxMessageLength",
		"customPrompt",
	]),
	"curios.hitcounter": new Set([
		"pagePath",
		"style",
		"label",
		"showSinceDate",
		"countMode",
		"sinceDateStyle",
	]),
	"curios.journey": new Set([
		"enabled",
		"githubRepoUrl",
		"snapshotFrequency",
		"showLanguageChart",
		"showGrowthChart",
		"showMilestones",
		"timezone",
	]),
	"curios.linkgarden": new Set(["title", "description", "style"]),
	"curios.moodring": new Set([
		"mode",
		"manualMood",
		"manualColor",
		"colorScheme",
		"displayStyle",
		"showMoodLog",
	]),
	"curios.nowplaying": new Set([
		"provider",
		"displayStyle",
		"showAlbumArt",
		"showProgress",
		"fallbackText",
		"lastFmUsername",
	]),
	"curios.polls": new Set([
		"question",
		"description",
		"pollType",
		"options",
		"resultsVisibility",
		"isPinned",
	]),
	"curios.pulse": new Set([
		"enabled",
		"showHeatmap",
		"showFeed",
		"showStats",
		"showTrends",
		"showCi",
		"reposInclude",
		"reposExclude",
		"feedMaxItems",
	]),
	"curios.timeline": new Set([
		"enabled",
		"githubUsername",
		"voicePreset",
		"customSystemPrompt",
		"customSummaryInstructions",
		"reposInclude",
		"reposExclude",
		"timezone",
		"ownerName",
		"openrouterModel",
	]),
	"curios.webring": new Set([
		"enabled",
		"webringId",
		"displayStyle",
		"showMemberCount",
		"customLabel",
		"prevLabel",
		"nextLabel",
	]),

	// ── Identity ────────────────────────────────────────────────────────────
	"identity.activitystatus": new Set([
		"enabled",
		"statusText",
		"statusEmoji",
		"availability",
		"autoExpire",
		"expireAfterMinutes",
	]),
	"identity.badges": new Set(["pronounBadge", "roleBadges", "customBadges"]),
	"identity.profile": new Set(["displayName", "favoriteColor", "interests"]),
	// NOTE: "username" deliberately excluded — username changes need extra validation

	// ── Social ──────────────────────────────────────────────────────────────
	"social.canopy": new Set([
		"canopyVisible",
		"canopyBanner",
		"canopyCategories",
		"canopyShowForests",
	]),
	"social.comments": new Set([
		"commentsEnabled",
		"publicCommentsEnabled",
		"whoCanComment",
		"showCommentCount",
		"notifyOnReply",
		"notifyOnPending",
		"notifyOnThreadReply",
	]),
	"social.meadow": new Set(["meadowOptIn"]),
};

// =============================================================================
// Validation
// =============================================================================

/**
 * Check if a domain+field combination is allowed for writing.
 * Returns false for any domain or field not explicitly listed.
 */
export function isAllowed(domain: string, field: string): boolean {
	const fields = WRITE_ALLOWLIST[domain];
	if (!fields) return false;
	return fields.has(field);
}

/**
 * Validate an entire batch of changes against the allowlist.
 * Returns the first disallowed change, or null if all are permitted.
 */
export function validateBatch(
	changes: Array<{ domain: string; field: string }>,
): { domain: string; field: string } | null {
	for (const change of changes) {
		if (!isAllowed(change.domain, change.field)) {
			return change;
		}
	}
	return null;
}
