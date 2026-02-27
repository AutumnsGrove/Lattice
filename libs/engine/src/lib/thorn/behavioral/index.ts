/**
 * Thorn — Behavioral Layer Public API
 *
 * Deterministic behavioral defense that catches obvious abuse
 * before AI inference. The outer thorns of the rose.
 *
 * @see docs/specs/thorn-behavioral-spec.md
 */

// Entity labels
export {
	getEntityLabels,
	hasLabel,
	addLabel,
	removeLabel,
	cleanupExpiredLabels,
	getEntityLabelDetails,
} from "./labels.js";

// Rate check bridge
export { checkBehavioralRateLimit, bridgeAbuseToLabels, mapHookToEndpoint } from "./rate-check.js";

// Rule evaluation
export { evaluateBehavioralRules, countLinks } from "./evaluate.js";

// Rule definitions
export { BEHAVIORAL_RULES } from "./rules.js";

// Types
export type {
	EntityType,
	EntityLabel,
	BehavioralRule,
	BehavioralCondition,
	BehavioralResult,
	BehavioralContext,
} from "./types.js";
