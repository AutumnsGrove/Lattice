// Main entry point for @autumnsgrove/groveengine

// Custom components
export { default as ContentWithGutter } from './components/custom/ContentWithGutter.svelte';
export { default as GutterItem } from './components/custom/GutterItem.svelte';
export { default as LeftGutter } from './components/custom/LeftGutter.svelte';
export { default as TableOfContents } from './components/custom/TableOfContents.svelte';
export { default as MobileTOC } from './components/custom/MobileTOC.svelte';
export { default as CollapsibleSection } from './components/custom/CollapsibleSection.svelte';

// Admin components
export { default as MarkdownEditor } from './components/admin/MarkdownEditor.svelte';
export { default as GutterManager } from './components/admin/GutterManager.svelte';

// Wisp - Writing Assistant
export { default as WispPanel } from './components/WispPanel.svelte';
export { default as WispButton } from './components/WispButton.svelte';

// Quota components
export { QuotaWidget, QuotaWarning, UpgradePrompt } from './components/quota/index';

// Gallery components (from UI module)
export { default as ImageGallery } from './ui/components/gallery/ImageGallery.svelte';
export { default as Lightbox } from './ui/components/gallery/Lightbox.svelte';
export { default as LightboxCaption } from './ui/components/gallery/LightboxCaption.svelte';
export { default as ZoomableImage } from './ui/components/gallery/ZoomableImage.svelte';

// UI components - re-export all from the UI index
export * from './ui/index';

// Utilities
export { cn } from './utils/cn';

// GroveAuth client (re-export explicitly to avoid StatusColor conflict with UI)
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
} from './groveauth/index';

// Re-export GroveAuth types with renamed StatusColor to avoid conflict
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
} from './groveauth/index';

export type { StatusColor as GroveAuthStatusColor } from './groveauth/index';
