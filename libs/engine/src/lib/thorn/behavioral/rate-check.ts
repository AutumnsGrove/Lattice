/**
 * Thorn — Behavioral Rate Check Bridge
 *
 * Bridges the Threshold SDK into Thorn's behavioral layer.
 * When a rate limit is exceeded, the bridge applies entity labels
 * so behavioral rules can act on repeated violations.
 *
 * This file does NOT implement custom rate limiting — it delegates
 * entirely to the Threshold SDK and mirrors decisions as labels.
 *
 * @see docs/specs/thorn-behavioral-spec.md
 */

import type { D1Database } from "@cloudflare/workers-types";
import type { Threshold } from "../../threshold/threshold.js";
import type { ThornAction } from "../types.js";
import { getEndpointLimitByKey, type EndpointKey } from "../../threshold/config.js";
import { recordViolation } from "../../threshold/abuse.js";
import { addLabel } from "./labels.js";

// =============================================================================
// Hook Point → Endpoint Key Mapping
// =============================================================================

/**
 * Map Thorn hook points to Threshold endpoint keys.
 * These keys index into ENDPOINT_RATE_LIMITS for limit lookups.
 */
const HOOK_ENDPOINT_MAP: Record<string, EndpointKey> = {
	on_publish: "posts/create",
	on_edit: "posts/update",
	on_comment: "comments/create",
	// on_profile_update has no direct endpoint equivalent;
	// use default limits when no mapping exists
};

/**
 * Resolve a hook point to a Threshold endpoint key.
 * Falls back to "default" for unmapped hooks.
 */
export function mapHookToEndpoint(hookPoint: string): EndpointKey {
	return HOOK_ENDPOINT_MAP[hookPoint] ?? "default";
}

// =============================================================================
// Rate Check
// =============================================================================

export interface RateCheckResult {
	exceeded: boolean;
	action?: ThornAction;
}

/**
 * Check Threshold rate limits and apply labels on violation.
 *
 * Bridges the Threshold SDK into Thorn's behavioral layer:
 * 1. Calls threshold.check() for the endpoint
 * 2. If exceeded, applies a thorn:rapid_poster label
 * 3. Returns whether the action should be blocked
 */
export async function checkBehavioralRateLimit(
	threshold: Threshold,
	db: D1Database,
	tenantId: string,
	userId: string,
	endpointKey: EndpointKey,
): Promise<RateCheckResult> {
	try {
		const config = getEndpointLimitByKey(endpointKey);
		const result = await threshold.check({
			key: `thorn:${endpointKey}:${userId}`,
			limit: config.limit,
			windowSeconds: config.windowSeconds,
		});

		if (!result.allowed) {
			// Apply rapid_poster label (expires when window resets)
			await addLabel(db, tenantId, "user", userId, "thorn:rapid_poster", {
				addedBy: `threshold:${endpointKey}`,
				expiresInHours: 1,
				reason: `Rate limit exceeded: ${endpointKey}`,
			});

			return { exceeded: true, action: "block" };
		}

		return { exceeded: false };
	} catch (err) {
		// Fail open — rate check failure should not block content
		console.error("[Thorn:behavioral] Rate check failed:", err);
		return { exceeded: false };
	}
}

// =============================================================================
// Abuse Escalation Bridge
// =============================================================================

/**
 * When Threshold records a violation, mirror it as a Thorn label.
 * Called after any rate limit violation in the behavioral pipeline.
 *
 * Bridges Threshold's abuse escalation (5+ violations → 24h ban)
 * into entity labels for behavioral rule matching.
 */
export async function bridgeAbuseToLabels(
	abuseKV: KVNamespace,
	db: D1Database,
	tenantId: string,
	userId: string,
): Promise<void> {
	try {
		const violation = await recordViolation(abuseKV, userId);

		if (violation.banned) {
			// Threshold escalated to ban (5+ violations in 24h)
			await addLabel(db, tenantId, "user", userId, "thorn:repeat_offender", {
				addedBy: "threshold:abuse_escalation",
				expiresInHours: 24,
				reason: "Threshold abuse escalation: repeated rate limit violations",
			});
		}
	} catch (err) {
		console.error("[Thorn:behavioral] Abuse bridge failed:", err);
	}
}
