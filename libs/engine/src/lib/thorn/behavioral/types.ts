/**
 * Thorn — Behavioral Layer Types
 *
 * Type definitions for the deterministic behavioral defense layer.
 * These types extend the core Thorn types with behavioral-specific
 * concepts: entity labels, behavioral rules, and evaluation results.
 *
 * @see docs/specs/thorn-behavioral-spec.md
 */

import type { ThornAction, ThornContentType, ThornHookPoint } from "../types.js";

// =============================================================================
// Entity Types
// =============================================================================

/** Entity types that can carry labels */
export type EntityType = "user" | "ip" | "email_domain" | "tenant";

/** A label row as stored in D1 */
export interface EntityLabel {
	tenant_id: string;
	entity_type: EntityType;
	entity_id: string;
	label: string;
	added_at: string;
	expires_at: string | null;
	added_by: string;
	reason: string | null;
}

// =============================================================================
// Behavioral Rules
// =============================================================================

/**
 * A single behavioral rule definition.
 * Rules are evaluated in order — first match wins.
 */
export interface BehavioralRule {
	/** Unique rule identifier */
	name: string;
	/** Human-readable description */
	description: string;
	/** Content types this rule applies to */
	contentTypes: ThornContentType[];
	/** All conditions must be true for this rule to match */
	conditions: BehavioralCondition[];
	/** Action to take when rule matches */
	action: ThornAction;
	/** Label to apply when rule triggers (optional) */
	applyLabel?: {
		label: string;
		expiresInHours?: number;
	};
	/** Skip AI inference if this rule matches? */
	skipAI: boolean;
	/**
	 * Sampling passthrough rate (0.0–1.0). When skipAI is true, this
	 * fraction of matched events still run AI as a permanent accuracy signal.
	 * Example: 0.05 = 5% of matched events still go through AI.
	 * The behavioral decision (allow/block) stands regardless; sampling
	 * only determines whether AI also runs for monitoring.
	 */
	samplingRate?: number;
	/** Is this rule enabled? */
	enabled: boolean;
}

/**
 * Conditions that can be checked by the behavioral rule engine.
 * All conditions in a rule must be true for the rule to match.
 *
 * Note: rate limiting is NOT a condition type.
 * Rate checks are handled by Threshold SDK (checkBehavioralRateLimit)
 * and run as a separate step before rule evaluation.
 */
export type BehavioralCondition =
	| { type: "has_label"; label: string }
	| { type: "not_has_label"; label: string }
	| { type: "account_age_below"; hours: number }
	| { type: "content_has_links"; min: number }
	| { type: "content_length_below"; chars: number }
	| { type: "content_length_above"; chars: number };

// =============================================================================
// Evaluation Types
// =============================================================================

/** Result of behavioral rule evaluation */
export interface BehavioralResult {
	/** Did any rule match? */
	matched: boolean;
	/** Which rule matched (first match wins) */
	matchedRule?: string;
	/** Action determined by the matched rule */
	action: ThornAction;
	/** Should AI inference be skipped? */
	skipAI: boolean;
	/** Was this event selected for AI sampling passthrough? */
	sampledForAI: boolean;
	/** Labels applied as a result */
	labelsApplied: string[];
}

/** Context passed to the behavioral rule evaluator */
export interface BehavioralContext {
	/**
	 * Entity performing the action. Optional because some content types
	 * (e.g. anonymous guestbook entries) have no authenticated user.
	 * When absent, label-based conditions (has_label, not_has_label) and
	 * rate-limit checks short-circuit to "no match" — the content falls
	 * through to AI moderation with no behavioral override.
	 */
	userId?: string;
	/** Tenant scope — required for all label and moderation log operations */
	tenantId: string;
	/** Content metadata (not the content itself) */
	contentType: ThornContentType;
	hookPoint: ThornHookPoint;
	/** Lightweight content signals (extracted before this call) */
	contentLength: number;
	linkCount: number;
	/** Account metadata */
	accountCreatedAt?: string;
}
