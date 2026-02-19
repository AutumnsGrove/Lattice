/**
 * Thorn - Content Moderation Configuration
 *
 * Category-to-action mappings and confidence thresholds.
 * Tune these without code changes to adjust moderation sensitivity.
 *
 * @see docs/specs/thorn-spec.md
 */

import type { ThornConfig, ThornContentType, ThornAction } from "./types.js";

// =============================================================================
// Global Thresholds
// =============================================================================

/** Below this confidence, always allow (model isn't sure enough to act) */
const GLOBAL_ALLOW_BELOW = 0.4;

/** Above this confidence, always block (model is very sure of harm) */
const GLOBAL_BLOCK_ABOVE = 0.95;

// =============================================================================
// Default Configuration
// =============================================================================

/**
 * Thorn moderation configuration.
 *
 * Design principles:
 * - Graduated enforcement: warn before blocking where possible
 * - Content-type sensitivity: comments are checked more strictly than blog posts
 *   (because comments affect other users, blog posts are self-expression)
 * - High confidence required for blocking: avoid false positives
 * - Categories map to Lumen's LlamaGuard output (S1-S7 mapped to named categories)
 */
export const THORN_CONFIG: ThornConfig = {
  globalAllowBelow: GLOBAL_ALLOW_BELOW,
  globalBlockAbove: GLOBAL_BLOCK_ABOVE,

  contentTypes: {
    // ─────────────────────────────────────────────────────────────────────────
    // Blog Posts: Most permissive (self-expression)
    // Only block clearly harmful content with high confidence
    // ─────────────────────────────────────────────────────────────────────────
    blog_post: {
      name: "Blog Post",
      thresholds: [
        {
          // Always block: violence, illegal, self-harm
          categories: ["violence", "illegal", "self_harm"],
          minConfidence: 0.85,
          action: "block",
        },
        {
          // Flag for review: sexual, hate, dangerous
          categories: ["sexual", "hate", "dangerous"],
          minConfidence: 0.8,
          action: "flag_review",
        },
        {
          // Warn: harassment (might be legitimate critique)
          categories: ["harassment"],
          minConfidence: 0.75,
          action: "warn",
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Comments: Stricter (affects other users)
    // Lower thresholds because comments can directly harm others
    // ─────────────────────────────────────────────────────────────────────────
    comment: {
      name: "Comment",
      thresholds: [
        {
          // Block: violence, illegal, self-harm, sexual
          categories: ["violence", "illegal", "self_harm", "sexual"],
          minConfidence: 0.75,
          action: "block",
        },
        {
          // Block: hate, harassment (direct harm to others)
          categories: ["hate", "harassment"],
          minConfidence: 0.8,
          action: "block",
        },
        {
          // Flag: dangerous content
          categories: ["dangerous"],
          minConfidence: 0.7,
          action: "flag_review",
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Profile Bio: Moderate strictness (public-facing)
    // ─────────────────────────────────────────────────────────────────────────
    profile_bio: {
      name: "Profile Bio",
      thresholds: [
        {
          // Block: violence, illegal, self-harm, hate
          categories: ["violence", "illegal", "self_harm", "hate"],
          minConfidence: 0.8,
          action: "block",
        },
        {
          // Flag: sexual, harassment
          categories: ["sexual", "harassment"],
          minConfidence: 0.75,
          action: "flag_review",
        },
        {
          // Warn: dangerous
          categories: ["dangerous"],
          minConfidence: 0.7,
          action: "warn",
        },
      ],
    },
  },
};

// =============================================================================
// Helpers
// =============================================================================

/**
 * Determine the action for a moderation result given a content type.
 *
 * Checks thresholds in order — first match wins.
 * Falls back to "allow" if no threshold is triggered.
 */
export function determineAction(
  moderationResult: {
    safe: boolean;
    categories: string[];
    confidence: number;
  },
  contentType: ThornContentType,
): ThornAction {
  // Safe content is always allowed
  if (moderationResult.safe) {
    return "allow";
  }

  // Below global threshold: allow regardless
  if (moderationResult.confidence < THORN_CONFIG.globalAllowBelow) {
    return "allow";
  }

  // Above global block threshold: always block
  if (moderationResult.confidence >= THORN_CONFIG.globalBlockAbove) {
    return "block";
  }

  // Check content-type-specific thresholds
  const config = THORN_CONFIG.contentTypes[contentType];

  for (const threshold of config.thresholds) {
    // Check if any flagged category matches this threshold
    const matchesCategory = moderationResult.categories.some((cat) =>
      threshold.categories.includes(cat),
    );

    if (
      matchesCategory &&
      moderationResult.confidence >= threshold.minConfidence
    ) {
      return threshold.action;
    }
  }

  // No threshold matched: allow with a warning for unsafe content
  return "warn";
}
