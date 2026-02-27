/**
 * Thorn - Publish Hook
 *
 * Provides a single function to moderate published content.
 * Designed to be called via platform.context.waitUntil() so
 * moderation runs asynchronously after the response is sent.
 *
 * This function NEVER throws — it catches all errors internally
 * so it's safe for fire-and-forget usage.
 *
 * Flow (with behavioral layer):
 * 1. Threshold rate check (if userId present)
 * 2. Behavioral rule pre-check (labels, content signals)
 * 3. AI moderation (if not skipped by behavioral layer)
 * 4. Post-AI label updates (blocked_content, repeat_offender)
 *
 * @see docs/specs/thorn-spec.md
 * @see docs/specs/thorn-behavioral-spec.md
 */

import type { D1Database } from "@cloudflare/workers-types";
import { createLumenClient } from "../lumen/client.js";
import { moderateContent } from "./moderate.js";
import { logModerationEvent, flagContent } from "./logging.js";
import type { ThornContentType, ThornHookPoint } from "./types.js";
import type { Threshold } from "../threshold/threshold.js";
import { evaluateBehavioralRules, countLinks } from "./behavioral/evaluate.js";
import {
	checkBehavioralRateLimit,
	mapHookToEndpoint,
	bridgeAbuseToLabels,
} from "./behavioral/rate-check.js";
import { addLabel } from "./behavioral/labels.js";

export interface ModeratePublishedContentOptions {
	/** The text content to moderate */
	content: string;
	/** Cloudflare AI binding */
	ai?: Ai;
	/** D1 database for logging */
	db: D1Database;
	/** OpenRouter API key (for provider routing) */
	openrouterApiKey?: string;
	/** Tenant ID */
	tenantId: string;
	/** User ID of the content author */
	userId?: string;
	/** Content type for threshold selection */
	contentType: ThornContentType;
	/** Hook point that triggered moderation */
	hookPoint: ThornHookPoint;
	/** Reference to the content (e.g., post slug) */
	contentRef?: string;
	/** Threshold instance for rate limiting (optional — skips behavioral checks if absent) */
	threshold?: Threshold;
	/** KV namespace for abuse tracking (optional — skips abuse escalation if absent) */
	abuseKV?: KVNamespace;
	/** Account creation timestamp for age-based rules (optional) */
	accountCreatedAt?: string;
}

/**
 * Moderate published content and log the decision.
 *
 * Safe to call in waitUntil() — never throws.
 * Flow:
 * 1. Behavioral pre-check (rate limits + rule evaluation)
 * 2. AI moderation (unless skipped by behavioral layer)
 * 3. Post-AI label updates (entity memory)
 */
export async function moderatePublishedContent(
	options: ModeratePublishedContentOptions,
): Promise<void> {
	const {
		content,
		ai,
		db,
		openrouterApiKey,
		tenantId,
		userId,
		contentType,
		hookPoint,
		contentRef,
		threshold,
		abuseKV,
		accountCreatedAt,
	} = options;

	try {
		// ── Behavioral: Threshold rate check ─────────────────────────
		// Rate checks and label operations require a userId.
		// Anonymous content (no userId) skips behavioral rules entirely
		// and falls through to AI moderation.
		if (threshold && userId) {
			const rateResult = await checkBehavioralRateLimit(
				threshold,
				db,
				tenantId,
				userId,
				mapHookToEndpoint(hookPoint),
			);

			if (rateResult.exceeded) {
				await logModerationEvent(db, {
					userId,
					tenantId,
					contentType,
					hookPoint,
					action: rateResult.action!,
					categories: ["behavioral:rate_limit"],
					confidence: 1.0,
					model: "threshold-sdk",
					contentRef,
				});

				// Bridge abuse escalation if KV is available
				if (abuseKV) {
					await bridgeAbuseToLabels(abuseKV, db, tenantId, userId);
				}

				return; // Rate limited — skip everything
			}
		}

		// ── Behavioral: Rule pre-check ───────────────────────────────
		const behavioral = await evaluateBehavioralRules(db, {
			userId,
			tenantId,
			contentType,
			hookPoint,
			contentLength: content.length,
			linkCount: countLinks(content),
			accountCreatedAt,
		});

		if (behavioral.matched) {
			// Log behavioral decision
			await logModerationEvent(db, {
				userId,
				tenantId,
				contentType,
				hookPoint,
				action: behavioral.action,
				categories: [`behavioral:${behavioral.matchedRule}`],
				confidence: 1.0, // Deterministic rules = full confidence
				model: "thorn-behavioral",
				contentRef,
			});

			// If behavioral says block/flag and skipAI, handle immediately
			if (behavioral.skipAI) {
				if (behavioral.action === "block" || behavioral.action === "flag_review") {
					await flagContent(db, {
						userId,
						tenantId,
						contentType,
						contentRef,
						action: behavioral.action,
						categories: [`behavioral:${behavioral.matchedRule}`],
						confidence: 1.0,
					});
				}

				// Sampling passthrough: a percentage of skipped events still run AI
				// for accuracy monitoring. The behavioral decision stands regardless.
				if (!behavioral.sampledForAI) {
					return; // Skip AI inference
				}
				// Fall through to AI — behavioral decision already applied,
				// AI result is logged but does NOT override the allow/block.
			}
		}

		// ── AI moderation ────────────────────────────────────────────
		// openrouterApiKey defaults to empty — moderation uses Cloudflare AI, not OpenRouter
		const lumen = createLumenClient({
			openrouterApiKey: openrouterApiKey || "",
			ai,
			db,
		});

		const result = await moderateContent(content, {
			lumen,
			tenant: tenantId,
			contentType,
		});

		// Log the AI moderation event (always, even for allows)
		await logModerationEvent(db, {
			userId,
			tenantId,
			contentType,
			hookPoint,
			action: result.action,
			categories: result.categories,
			confidence: result.confidence,
			model: result.model,
			contentRef,
		});

		// If flagged or blocked, create a review queue entry
		if (result.action === "flag_review" || result.action === "block") {
			await flagContent(db, {
				userId,
				tenantId,
				contentType,
				contentRef,
				action: result.action,
				categories: result.categories,
				confidence: result.confidence,
			});

			console.log(
				`[Thorn] Content ${result.action}: ${contentType} "${contentRef}" ` +
					`(${result.categories.join(", ")} @ ${result.confidence})`,
			);
		}

		// ── Post-AI: Label updates ───────────────────────────────────
		// Labels require a userId — anonymous blocked content is still flagged
		// by flagContent() above but cannot accumulate user-level labels.
		if (result.action === "block" && userId) {
			await addLabel(db, tenantId, "user", userId, "thorn:blocked_content", {
				addedBy: "ai_moderation",
				expiresInHours: 90 * 24, // 90 days
				reason: `Blocked: ${result.categories.join(", ")}`,
			});

			// Check for repeat offender escalation
			await checkRepeatOffenderEscalation(db, tenantId, userId);
		}
	} catch (err) {
		// Never throw — this runs in waitUntil, failures should not affect the user
		console.error("[Thorn] Post-publish moderation failed:", err);
	}
}

// =============================================================================
// Escalation
// =============================================================================

/**
 * Check if a user should be escalated to repeat_offender status.
 * Triggered after an AI block — counts blocks in the last 30 days.
 * 3+ blocks → repeat_offender label (permanent until admin review).
 */
async function checkRepeatOffenderEscalation(
	db: D1Database,
	tenantId: string,
	userId: string,
): Promise<void> {
	try {
		const result = await db
			.prepare(
				`SELECT COUNT(*) as block_count FROM thorn_moderation_log
         WHERE tenant_id = ? AND user_id = ? AND action = 'block'
         AND timestamp > datetime('now', '-30 days')`,
			)
			.bind(tenantId, userId)
			.first<{ block_count: number }>();

		if (result && result.block_count >= 3) {
			await addLabel(db, tenantId, "user", userId, "thorn:repeat_offender", {
				addedBy: "escalation_rule",
				reason: `${result.block_count} blocks in 30 days`,
			});
		}
	} catch (err) {
		console.error("[Thorn] Repeat offender check failed:", err);
	}
}
