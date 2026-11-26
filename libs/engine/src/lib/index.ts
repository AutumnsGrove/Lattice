// Main entry point for @autumnsgrove/lattice

// Custom components
export { default as ContentWithGutter } from "./ui/components/custom/ContentWithGutter.svelte";
export { default as GutterItem } from "./ui/components/custom/GutterItem.svelte";
export { default as LeftGutter } from "./ui/components/custom/LeftGutter.svelte";
export { default as TableOfContents } from "./ui/components/custom/TableOfContents.svelte";
export { default as MobileTOC } from "./ui/components/custom/MobileTOC.svelte";
export { default as CollapsibleSection } from "./ui/components/custom/CollapsibleSection.svelte";
export { default as CategoryNav } from "./ui/components/custom/CategoryNav.svelte";

// TOC and CategoryNav types and constants
export type {
	TOCHeader,
	CategoryNavSection,
	CategoryNavItem,
} from "./ui/components/custom/types.js";
export { DEFAULT_SCROLL_OFFSET, isValidIcon } from "./ui/components/custom/types.js";

// Admin components
export { default as MarkdownEditor } from "./content/editor/MarkdownEditor.svelte";
export { default as GutterManager } from "./content/editor/GutterManager.svelte";
export { default as LumenAnalytics } from "./components/admin/LumenAnalytics.svelte";
export { default as SafetyMonitoring } from "./components/admin/SafetyMonitoring.svelte";
export { default as ZephyrAnalytics } from "./components/admin/ZephyrAnalytics.svelte";

// Quota components
export { QuotaWidget, QuotaWarning, UpgradePrompt } from "./components/quota/index";

// Gallery components (from UI module)
export { default as ImageGallery } from "./ui/components/gallery/ImageGallery.svelte";
export { default as Lightbox } from "./ui/components/gallery/Lightbox.svelte";
export { default as LightboxCaption } from "./ui/components/gallery/LightboxCaption.svelte";
export { default as ZoomableImage } from "./ui/components/gallery/ZoomableImage.svelte";

// UI components - re-export all from the UI index
export * from "./ui/index";

// Utilities
export { cn } from "./utils/cn";
export { seededShuffle } from "./utils/shuffle.js";

// Config presets (colors, fonts)
export {
	COLOR_PRESETS,
	DEFAULT_ACCENT_COLOR,
	FONT_PRESETS,
	DEFAULT_FONT,
	getFontFamily,
} from "./platform/config/presets.js";
export type { ColorPreset, FontPreset } from "./platform/config/presets.js";

// Canopy categories
export {
	CANOPY_CATEGORIES,
	CANOPY_CATEGORY_LABELS,
	CANOPY_SETTING_KEYS,
	CANOPY_SETTINGS_SCHEMA,
	isValidCanopyCategory,
	parseCanopyCategories,
} from "./platform/config/canopy-categories.js";
export type { CanopyCategory } from "./platform/config/canopy-categories.js";

// =============================================================================
// Curios — re-exported from @autumnsgrove/curios for backward compat
// =============================================================================

export {
	getOpenRouterModels,
	validateOpenRouterKey,
	OPENROUTER_MODELS,
	DEFAULT_OPENROUTER_MODEL,
	buildVoicedPrompt,
	getAllVoices,
	getVoice,
	buildCustomVoice,
	VOICE_PRESETS,
	DEFAULT_VOICE,
	professional,
	quest,
	casual,
	poetic,
	minimal,
	parseAIResponse,
	DEFAULT_TIMELINE_CONFIG,
} from "@autumnsgrove/curios/timeline";

export type {
	OpenRouterModel,
	OpenRouterResponse,
	OpenRouterOptions,
	OpenRouterKeyValidation,
	VoicePreset,
	VoicePromptResult,
	CustomVoiceConfig,
	Commit,
	GutterComment,
	TimelineCurioConfig,
	TimelineSummary,
	TimelineActivity,
} from "@autumnsgrove/curios/timeline";
