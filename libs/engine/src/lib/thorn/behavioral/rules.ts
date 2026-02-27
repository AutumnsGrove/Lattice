/**
 * Thorn — Behavioral Rule Definitions
 *
 * Simple, typed rule definitions for deterministic behavioral defense.
 * No custom DSL needed at Grove's scale — TypeScript config is sufficient.
 *
 * Rules are evaluated in order. First match wins.
 *
 * @see docs/specs/thorn-behavioral-spec.md
 */

import type { BehavioralRule } from "./types.js";

// =============================================================================
// Default Rules
// =============================================================================

export const BEHAVIORAL_RULES: BehavioralRule[] = [
	// ─────────────────────────────────────────────────────────────
	// Repeat offenders: skip straight to block
	// ─────────────────────────────────────────────────────────────
	{
		name: "repeat_offender_block",
		description: "Users with repeat_offender label are blocked immediately",
		contentTypes: ["blog_post", "comment", "profile_bio"],
		conditions: [{ type: "has_label", label: "thorn:repeat_offender" }],
		action: "block",
		skipAI: true,
		enabled: true,
	},

	// ─────────────────────────────────────────────────────────────
	// Trusted users: skip AI for clean track record
	// 5% of trusted-user posts still run AI as a permanent accuracy
	// signal (sampling passthrough). All trusted-user actions are
	// logged to thorn_moderation_log with model: 'thorn-behavioral'
	// so activity remains visible even when AI is skipped.
	// ─────────────────────────────────────────────────────────────
	{
		name: "trusted_user_pass",
		description: "Users with trusted label skip AI moderation (5% sampling passthrough)",
		contentTypes: ["blog_post", "comment", "profile_bio"],
		conditions: [{ type: "has_label", label: "thorn:trusted" }],
		action: "allow",
		skipAI: true,
		samplingRate: 0.05,
		enabled: true,
	},

	// ─────────────────────────────────────────────────────────────
	// New account spam pattern: first post with links
	// ─────────────────────────────────────────────────────────────
	{
		name: "new_account_link_spam",
		description: "New accounts posting content with many links get flagged",
		contentTypes: ["blog_post", "comment"],
		conditions: [
			{ type: "account_age_below", hours: 24 },
			{ type: "content_has_links", min: 3 },
		],
		action: "flag_review",
		applyLabel: {
			label: "thorn:suspicious_new_account",
			expiresInHours: 72,
		},
		skipAI: false, // Still run AI, but flag regardless
		enabled: true,
	},

	// ─────────────────────────────────────────────────────────────
	// Empty content: skip AI (nothing to classify)
	// Threshold set to 3 chars — covers truly empty/emoji-only
	// content while ensuring single-word slurs and short epithets
	// (which fit in 4-9 chars) still reach AI classification.
	// ─────────────────────────────────────────────────────────────
	{
		name: "empty_content_pass",
		description: "Content under 3 characters skips AI (empty or single emoji)",
		contentTypes: ["blog_post", "comment"],
		conditions: [{ type: "content_length_below", chars: 3 }],
		action: "allow",
		skipAI: true,
		enabled: true,
	},
];
