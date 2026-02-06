// Main entry point for @autumnsgrove/groveengine

// Custom components
export { default as ContentWithGutter } from "./components/custom/ContentWithGutter.svelte";
export { default as GutterItem } from "./components/custom/GutterItem.svelte";
export { default as LeftGutter } from "./components/custom/LeftGutter.svelte";
export { default as TableOfContents } from "./components/custom/TableOfContents.svelte";
export { default as MobileTOC } from "./components/custom/MobileTOC.svelte";
export { default as CollapsibleSection } from "./components/custom/CollapsibleSection.svelte";
export { default as CategoryNav } from "./components/custom/CategoryNav.svelte";

// TOC and CategoryNav types and constants
export type {
  TOCHeader,
  CategoryNavSection,
  CategoryNavItem,
} from "./components/custom/types.js";
export {
  DEFAULT_SCROLL_OFFSET,
  isValidIcon,
} from "./components/custom/types.js";

// Admin components
export { default as MarkdownEditor } from "./components/admin/MarkdownEditor.svelte";
export { default as GutterManager } from "./components/admin/GutterManager.svelte";

// Wisp - Writing Assistant
export { default as WispPanel } from "./components/WispPanel.svelte";
export { default as WispButton } from "./components/WispButton.svelte";

// Quota components
export {
  QuotaWidget,
  QuotaWarning,
  UpgradePrompt,
} from "./components/quota/index";

// Gallery components (from UI module)
export { default as ImageGallery } from "./ui/components/gallery/ImageGallery.svelte";
export { default as Lightbox } from "./ui/components/gallery/Lightbox.svelte";
export { default as LightboxCaption } from "./ui/components/gallery/LightboxCaption.svelte";
export { default as ZoomableImage } from "./ui/components/gallery/ZoomableImage.svelte";

// UI components - re-export all from the UI index
export * from "./ui/index";

// Utilities
export { cn } from "./utils/cn";

// Config presets (colors, fonts)
export {
  COLOR_PRESETS,
  DEFAULT_ACCENT_COLOR,
  FONT_PRESETS,
  DEFAULT_FONT,
  getFontFamily,
} from "./config/presets.js";
export type { ColorPreset, FontPreset } from "./config/presets.js";

// Heartwood client (re-export explicitly to avoid StatusColor conflict with UI)
export {
  GroveAuthClient,
  createGroveAuthClient,
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
  GroveAuthError,
  TIER_POST_LIMITS,
  TIER_NAMES,
  getQuotaDescription,
  getQuotaUrgency,
  getSuggestedActions,
  getUpgradeRecommendation,
  getQuotaWidgetData,
  getPreSubmitCheck,
  STATUS_COLORS,
  ALERT_VARIANTS,
  getStatusColorFromPercentage,
  getAlertVariantFromColor,
  RateLimiter,
  RateLimitError,
  withRateLimit,
  DEFAULT_RATE_LIMITS,
} from "./heartwood/index";

// Re-export Heartwood types with renamed StatusColor to avoid conflict
export type {
  GroveAuthConfig,
  TokenResponse,
  TokenInfo,
  UserInfo,
  LoginUrlResult,
  UserSubscription,
  SubscriptionStatus,
  SubscriptionResponse,
  CanPostResponse,
  SubscriptionTier,
  AuthError,
  QuotaWidgetData,
  PreSubmitCheckResult,
  AlertVariant,
} from "./heartwood/index";

export type { StatusColor as GroveAuthStatusColor } from "./heartwood/index";

// =============================================================================
// Curios - Developer Tools & Fun Website Features
// =============================================================================

// Timeline Curio - AI-powered daily summaries
export {
  // OpenRouter provider (model list + key validation for UI)
  getOpenRouterModels,
  validateOpenRouterKey,
  OPENROUTER_MODELS,
  DEFAULT_OPENROUTER_MODEL,
  // Voice presets
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
  // Utilities
  parseAIResponse,
  DEFAULT_TIMELINE_CONFIG,
} from "./curios/timeline";

export type {
  // OpenRouter types
  OpenRouterModel,
  OpenRouterResponse,
  OpenRouterOptions,
  OpenRouterKeyValidation,
  // Voice types
  VoicePreset,
  VoicePromptResult,
  CustomVoiceConfig,
  Commit,
  GutterComment,
  // Timeline types
  TimelineCurioConfig,
  TimelineSummary,
  TimelineActivity,
} from "./curios/timeline";
