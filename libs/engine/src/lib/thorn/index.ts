/**
 * Thorn - Grove's Text Content Moderation System
 *
 * Config-driven content moderation that wraps Lumen's moderation task
 * with graduated enforcement and content-type-specific thresholds.
 *
 * ## Architecture
 *
 * Thorn has two layers:
 * - **Behavioral layer** (outer thorns): Deterministic, sub-millisecond defense
 *   via entity labels, rate limiting, and pattern matching. Catches obvious abuse
 *   before AI inference runs.
 * - **AI layer** (inner rose): Lumen-powered content classification with graduated
 *   enforcement and content-type-specific thresholds.
 *
 * ## Implementation Status
 *
 * **Phase: Live (wired into publish flow)**
 *
 * - [x] Hook into post publish flow (on_publish) — via waitUntil
 * - [x] Hook into post edit flow (on_edit) — via waitUntil
 * - [x] D1 tables for moderation events (audit trail)
 * - [x] Admin review UI for flagged content (moved to landing Lumen panel)
 * - [x] Behavioral layer: entity labels, rate check bridge, rule evaluation
 * - [ ] Hook into comment submission (on_comment)
 * - [ ] Hook into profile bio updates (on_profile_update)
 * - [ ] Admin panel for entity label management (Phase 5)
 * - [ ] Trusted user auto-trust after N clean passes (Phase 6)
 *
 * @see docs/specs/thorn-spec.md
 * @see docs/specs/thorn-behavioral-spec.md
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

// Behavioral layer (deterministic defense before AI)
export {
	// Entity labels
	getEntityLabels,
	hasLabel,
	addLabel,
	removeLabel,
	cleanupExpiredLabels,
	getEntityLabelDetails,
	// Rate check bridge
	checkBehavioralRateLimit,
	bridgeAbuseToLabels,
	mapHookToEndpoint,
	// Rule evaluation
	evaluateBehavioralRules,
	countLinks,
	// Rule definitions
	BEHAVIORAL_RULES,
} from "./behavioral/index.js";

export type {
	EntityType,
	EntityLabel,
	BehavioralRule,
	BehavioralCondition,
	BehavioralResult,
	BehavioralContext,
} from "./behavioral/index.js";
