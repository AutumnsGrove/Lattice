// Utils barrel — explicit named exports (no export * wildcards)
//
// Prefer importing from the specific util file directly:
//   import { formatRelativeTime } from "$lib/utils/date"

// --- API ---
export { getCSRFToken, apiRequest, api } from "./api";

// --- Acquisition refs ---
export { REF_PARAM, REF_MAX_LENGTH, sanitizeRef } from "./acquisition-ref";

// --- Classnames ---
export { cn } from "./cn";

// --- CSRF ---
export {
	generateCSRFToken,
	generateSessionCSRFToken,
	validateSessionCSRFToken,
	timingSafeEqual,
	validateCSRFToken,
	validateCSRF,
} from "./csrf";

// --- Date ---
export type { DateInput } from "./date";
export {
	formatRelativeTime,
	formatDateFull,
	formatDateShort,
	formatDateTime,
	formatDateISO,
	formatSmartDate,
	formatDuration,
} from "./date";

// --- Debounce ---
export { debounce } from "./debounce";

// --- Errors ---
export { sanitizeErrorMessage } from "./errors";

// --- Escape HTML ---
export { escapeHtml } from "./escape-html";

// --- Format ---
export { formatBytes } from "./format";

// --- ID ---
export { generateId } from "./id";

// --- Schedule ---
export { scheduleIdle, cancelIdle } from "./schedule";

// --- Shuffle ---
export { seededShuffle } from "./shuffle";

// --- Slugify ---
export type { SlugifyOptions } from "./slugify";
export { slugify } from "./slugify";

// --- JSON ---
export type { SafeParseJsonOptions, JsonParseResult } from "./json";
export { safeParseJson, tryJsonParse } from "./json";

// --- Readability ---
export type { ReadabilityResult } from "./readability";
export {
	calculateReadability,
	stripMarkdownForAnalysis,
	countSyllables,
	getGradeDescription,
} from "./readability";

// --- Sanitize ---
export { sanitizeHTML, sanitizeSVG, sanitizeMarkdown, sanitizeURL } from "./sanitize";

// --- User ---
export type { UserLike } from "./user";
export { getUserDisplayName, hasPersonalizedName, normalizeEmail, emailsMatch } from "./user";

// --- Trace Path ---
export { buildTracePath, validateTracePath } from "./trace-path";

// --- Validation ---
export {
	validateFileSignature,
	sanitizeObject,
	sanitizeFilename,
	validatePath,
	validateEmail,
	validateURL,
	validateSlug,
	validateUUID,
} from "./validation";

// --- Webhook Sanitizer ---
export type {
	SanitizedWebhookPayload,
	SanitizedAttributes,
	SanitizedStripePayload,
} from "./webhook-sanitizer";
export {
	sanitizeWebhookPayload,
	sanitizeStripeWebhookPayload,
	detectPiiFields,
	calculateWebhookExpiry,
} from "./webhook-sanitizer";

// --- Grove URL ---
export {
	GROVE_DOMAIN,
	buildGroveUrl,
	buildGroveAdminUrl,
	parseGroveUrl,
	isGroveUrl,
	sanitizeReturnTo,
} from "./grove-url";

// --- Gallery (from @autumnsgrove/curios) ---
export {
	parseImageFilename,
	getImageTitle,
	getImageDate,
	searchImages,
	filterImagesByDateRange,
	filterImagesByTags,
	filterImagesByCategory,
	getAvailableYears,
	getAvailableCategories,
	type GalleryImage,
	type ImageTag,
	type ParsedImageMetadata,
} from "@autumnsgrove/curios/gallery";

// --- Gutter ---
export {
	parseAnchor,
	getAnchorKey,
	getUniqueAnchors,
	getAnchorLabel,
	getItemsForAnchor,
	getOrphanItems,
	findAnchorElement,
	type AnchorType,
	type ParsedAnchor,
	type Header,
	type GutterItem,
} from "./gutter";

// --- Image Processing (cross-module, backward compat) ---
export {
	isHeicFile,
	isHeifByMagicBytes,
	convertHeicToJpeg,
	calculateFileHash,
	type ImageFormat,
	type ProcessedImageResult,
	type ProcessImageOptions,
	processImage,
	type ThumbnailOptions,
	type ThumbnailResult,
	generateThumbnail,
	extractDominantColor,
	generateDatePath,
	sanitizeImageFilename,
	compressionRatio,
	formatName,
} from "../media/processing/imageProcessor";

// --- Markdown (cross-module, backward compat) ---
export {
	type Header as MarkdownHeader,
	type Frontmatter,
	type ParsedContent,
	type GalleryImage as MarkdownGalleryImage,
	type GutterItemBase,
	type GutterItem as MarkdownGutterItem,
	type GutterManifest,
	type PostMeta,
	type Post,
	type Page,
	type SiteConfig,
	type ModuleMap,
	type GutterModules,
	type GetItemOptions,
	type GetPageOptions,
	type ContentLoader,
	type ContentLoaderConfig,
	generateHeadingId,
	renderMarkdown,
	extractHeaders,
	processAnchorTags,
	parseMarkdownContent,
	parseMarkdownContentSanitized,
	processGutterContent,
	processMarkdownModules,
	getItemBySlug,
	getPageByFilename,
	getSiteConfigFromModule,
	createContentLoader,
	registerContentLoader,
	getAllPosts,
	getSiteConfig,
	getLatestPost,
	getHomePage,
	getPostBySlug,
	getAboutPage,
	getContactPage,
	getAllRecipes,
	getRecipeBySlug,
} from "../content/markdown/markdown";

// --- Mentions ---
export { mentionsPlugin, processMentions } from "../content/markdown/mentions";

// --- Rehype GroveTerm ---
export {
	rehypeGroveTerm,
	processGroveTerms,
	type RehypeGroveTermOptions,
} from "./rehype-groveterm";
