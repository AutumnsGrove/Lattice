/**
 * Thorn — Behavioral Rule Evaluation Engine
 *
 * Evaluates behavioral rules against event context.
 * Rules are checked in order — first match wins.
 *
 * Rate limiting runs BEFORE rule evaluation via Threshold SDK.
 * This evaluator handles label checks and content signal matching.
 * Typical execution: 1-3ms (1-2 D1 queries).
 *
 * @see docs/specs/thorn-behavioral-spec.md
 */

import type { D1Database } from "@cloudflare/workers-types";
import type {
	BehavioralCondition,
	BehavioralContext,
	BehavioralResult,
	BehavioralRule,
} from "./types.js";
import { getEntityLabels, addLabel } from "./labels.js";
import { BEHAVIORAL_RULES } from "./rules.js";

// =============================================================================
// Evaluation
// =============================================================================

/**
 * Evaluate all behavioral rules against the current context.
 * Rules are checked in order. First match wins.
 *
 * Rate limiting runs BEFORE this function via Threshold SDK.
 * This function handles label checks and content signal matching.
 */
export async function evaluateBehavioralRules(
	db: D1Database,
	context: BehavioralContext,
): Promise<BehavioralResult> {
	const noMatch: BehavioralResult = {
		matched: false,
		action: "allow",
		skipAI: false,
		sampledForAI: false,
		labelsApplied: [],
	};

	// Fetch entity labels once (shared across all rule condition checks)
	// If no userId, label-based conditions will short-circuit to no-match
	let entityLabels: string[] = [];
	if (context.userId) {
		entityLabels = await getEntityLabels(db, context.tenantId, "user", context.userId);
	}

	// Evaluate rules in order — first match wins
	for (const rule of BEHAVIORAL_RULES) {
		if (!rule.enabled) continue;

		// Check if rule applies to this content type
		if (!rule.contentTypes.includes(context.contentType)) continue;

		// Check all conditions (AND logic — all must pass)
		const matched = evaluateConditions(rule.conditions, context, entityLabels);
		if (!matched) continue;

		// Rule matched — apply label if configured
		const labelsApplied: string[] = [];
		if (rule.applyLabel && context.userId) {
			await addLabel(db, context.tenantId, "user", context.userId, rule.applyLabel.label, {
				addedBy: rule.name,
				expiresInHours: rule.applyLabel.expiresInHours,
				reason: `Behavioral rule: ${rule.name}`,
			});
			labelsApplied.push(rule.applyLabel.label);
		}

		// Determine sampling passthrough
		const sampledForAI = rule.skipAI && shouldSample(rule.samplingRate);

		return {
			matched: true,
			matchedRule: rule.name,
			action: rule.action,
			skipAI: rule.skipAI,
			sampledForAI,
			labelsApplied,
		};
	}

	return noMatch;
}

// =============================================================================
// Condition Evaluators
// =============================================================================

/**
 * Evaluate all conditions for a rule (AND logic).
 * Returns true only if ALL conditions pass.
 */
function evaluateConditions(
	conditions: BehavioralCondition[],
	context: BehavioralContext,
	entityLabels: string[],
): boolean {
	for (const condition of conditions) {
		if (!evaluateCondition(condition, context, entityLabels)) {
			return false;
		}
	}
	return true;
}

/**
 * Evaluate a single condition against the context.
 */
function evaluateCondition(
	condition: BehavioralCondition,
	context: BehavioralContext,
	entityLabels: string[],
): boolean {
	switch (condition.type) {
		case "has_label":
			// No userId means no labels — condition fails
			if (!context.userId) return false;
			return entityLabels.includes(condition.label);

		case "not_has_label":
			// No userId means no labels — "not has label" is vacuously true
			if (!context.userId) return true;
			return !entityLabels.includes(condition.label);

		case "account_age_below": {
			if (!context.accountCreatedAt) return false;
			const createdAt = new Date(context.accountCreatedAt).getTime();
			if (isNaN(createdAt)) return false;
			const ageHours = (Date.now() - createdAt) / (1000 * 60 * 60);
			return ageHours < condition.hours;
		}

		case "content_has_links":
			return context.linkCount >= condition.min;

		case "content_length_below":
			return context.contentLength < condition.chars;

		case "content_length_above":
			return context.contentLength > condition.chars;

		default:
			// Unknown condition type — fail closed (don't match)
			return false;
	}
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Determine if this event should be sampled for AI monitoring.
 * When samplingRate is 0.05, roughly 5% of events return true.
 *
 * Uses crypto.getRandomValues() instead of Math.random() to prevent
 * an attacker from predicting the sampling schedule and timing
 * harmful content to avoid AI scrutiny.
 */
function shouldSample(samplingRate?: number): boolean {
	if (!samplingRate || samplingRate <= 0) return false;
	if (samplingRate >= 1) return true;
	const randomByte = crypto.getRandomValues(new Uint8Array(1))[0];
	return randomByte / 255 < samplingRate;
}

/**
 * Count the number of links in content.
 * Matches http://, https://, and www. patterns.
 */
export function countLinks(content: string): number {
	const linkPattern = /https?:\/\/|www\./gi;
	const matches = content.match(linkPattern);
	return matches ? matches.length : 0;
}
