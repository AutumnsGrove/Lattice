/**
 * Thorn - Grove's Text Content Moderation System
 *
 * Config-driven content moderation that wraps Lumen's moderation task
 * with graduated enforcement and content-type-specific thresholds.
 *
 * Currently provides:
 * - moderateContent() function wrapping Lumen's .moderate()
 * - Config-driven category/threshold/action mappings
 * - Type definitions for the Thorn domain
 *
 * Future additions:
 * - Integration hooks (on_publish, on_comment, etc.)
 * - Database table for moderation events/history
 * - Appeal workflow
 * - Admin review UI
 * - Graduated enforcement state machine
 *
 * @see docs/specs/thorn-spec.md
 *
 * @example
 * ```typescript
 * import { moderateContent } from '@autumnsgrove/groveengine/thorn';
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
