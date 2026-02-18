/**
 * Thorn - Grove's Text Content Moderation System
 *
 * Config-driven content moderation that wraps Lumen's moderation task
 * with graduated enforcement and content-type-specific thresholds.
 *
 * ## Implementation Status
 *
 * **Phase: Live (wired into publish flow)**
 *
 * Thorn is active in production:
 * - [x] Hook into post publish flow (on_publish) — via waitUntil
 * - [x] Hook into post edit flow (on_edit) — via waitUntil
 * - [x] D1 tables for moderation events (audit trail)
 * - [x] Admin review UI for flagged content (moved to landing Lumen panel)
 * - [ ] Hook into comment submission (on_comment)
 * - [ ] Hook into profile bio updates (on_profile_update)
 *
 * @see docs/specs/thorn-spec.md
 *
 * @example
 * ```typescript
 * import { moderateContent } from '@autumnsgrove/lattice/thorn';
 *
 * const result = await moderateContent(userContent, {
 *   lumen,
 *   tenant: tenantId,
 *   contentType: 'comment',
 * });
 *
 * if (!result.allowed) {
 *   console.log(`Content ${result.action}: ${result.categories.join(', ')}`);
 * }
 * ```
 */

// Core moderation function
export { moderateContent } from "./moderate.js";

// Configuration
export { THORN_CONFIG, determineAction } from "./config.js";

// Logging (for dashboard and audit trail)
export {
  logModerationEvent,
  flagContent,
  getRecentEvents,
  getFlaggedContent,
  updateFlagStatus,
  getStats,
  cleanupOldLogs,
} from "./logging.js";

export type {
  ThornModerationEvent,
  ThornFlaggedContentInput,
  ThornFlaggedContentRow,
  ThornModerationLogRow,
  ThornStats,
} from "./logging.js";

// Publish hook (for waitUntil integration)
export { moderatePublishedContent } from "./hooks.js";
export type { ModeratePublishedContentOptions } from "./hooks.js";

// Types
export type {
  ThornResult,
  ThornOptions,
  ThornAction,
  ThornContentType,
  ThornHookPoint,
  ThornConfig,
  ThornCategoryThreshold,
  ThornContentTypeConfig,
  ThornEvent,
} from "./types.js";
