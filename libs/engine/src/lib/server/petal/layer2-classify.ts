/**
 * Petal Layer 2: Content Classification
 *
 * Vision model classification against Petal content categories.
 * Uses confidence thresholds to determine block/allow/review decisions.
 *
 * @see docs/specs/petal-spec.md Section 4
 */

import type { D1Database } from "@cloudflare/workers-types";
import {
  CONFIDENCE_THRESHOLDS,
  BLOCKED_CATEGORIES,
  REVIEW_CATEGORIES,
  getRejectionMessage,
  isCategoryBlocked,
  isCategoryReview,
} from "$lib/config/petal.js";
import type {
  ClassificationResult,
  PetalCategory,
  PetalDecision,
  PetalContext,
} from "./types.js";
import { classifyImage } from "./vision-client.js";
import { logSecurityEvent } from "./logging.js";

// ============================================================================
// Classification Logic
// ============================================================================

/**
 * Determine decision based on category and confidence
 */
function determineDecision(
  category: PetalCategory,
  confidence: number,
  context: PetalContext,
): { decision: PetalDecision; reason?: string } {
  // CSAM is always blocked (should be caught in Layer 1)
  if (category === "csam_detected") {
    return {
      decision: "block",
      reason: getRejectionMessage("csam_detected"),
    };
  }

  // Blocked categories
  if (isCategoryBlocked(category)) {
    if (confidence >= CONFIDENCE_THRESHOLDS.block) {
      return {
        decision: "block",
        reason: getRejectionMessage(category),
      };
    }
    if (confidence >= CONFIDENCE_THRESHOLDS.blockWithReview) {
      // Block but log for review (potential false positive)
      return {
        decision: "block",
        reason: getRejectionMessage(category),
      };
    }
    if (confidence >= CONFIDENCE_THRESHOLDS.contextCheck) {
      // Context check required - treat as review
      return {
        decision: "review",
        reason: getRejectionMessage(category),
      };
    }
    // Below threshold - allow but monitor
    return { decision: "allow" };
  }

  // Review categories - context-dependent
  if (isCategoryReview(category)) {
    if (confidence >= CONFIDENCE_THRESHOLDS.contextCheck) {
      // For try-on context, these are typically blocked
      if (context === "tryon") {
        return {
          decision: "block",
          reason: getRejectionMessage(category),
        };
      }
      // For other contexts, may be allowed
      return { decision: "allow" };
    }
    return { decision: "allow" };
  }

  // Appropriate content
  return { decision: "allow" };
}

// ============================================================================
// Layer 2 Processing
// ============================================================================

/**
 * Run content classification (Layer 2)
 */
export async function runLayer2(
  image: string | Uint8Array,
  mimeType: string,
  contentHash: string,
  context: PetalContext,
  options: {
    ai?: Ai;
    togetherApiKey?: string;
    db?: D1Database;
    userId?: string;
    tenantId?: string;
  },
): Promise<ClassificationResult> {
  const { db, userId, tenantId, ...visionOptions } = options;

  // Run classification
  const classification = await classifyImage(image, mimeType, visionOptions);

  // Determine decision based on category, confidence, and context
  const { decision, reason } = determineDecision(
    classification.category,
    classification.confidence,
    context,
  );

  const result: ClassificationResult = {
    category: classification.category,
    confidence: classification.confidence,
    decision,
    reason,
    model: classification.model,
    provider: classification.provider,
  };

  // Log the result
  if (db) {
    await logSecurityEvent(db, {
      timestamp: new Date().toISOString(),
      layer: "layer2",
      result: decision === "allow" ? "pass" : "block",
      category: decision !== "allow" ? classification.category : undefined,
      confidence: decision !== "allow" ? classification.confidence : undefined,
      contentHash,
      feature: context === "tryon" ? "tryon" : "upload",
      userId,
      tenantId,
    });
  }

  return result;
}

/**
 * Check fashion context for review categories
 * Used when swimwear/underwear is detected - may be allowed for fashion context
 */
export async function checkFashionContext(
  image: string | Uint8Array,
  mimeType: string,
  category: PetalCategory,
  options: {
    ai?: Ai;
    togetherApiKey?: string;
  },
): Promise<{ appropriate: boolean; reason?: string }> {
  // For now, swimwear/underwear is not appropriate for try-on
  // In future, could add more nuanced fashion context detection
  if (
    category === "swimwear" ||
    category === "underwear" ||
    category === "revealing"
  ) {
    return {
      appropriate: false,
      reason: "This image type is not supported for try-on.",
    };
  }

  // Artistic nudity needs human review
  if (category === "artistic_nudity") {
    return {
      appropriate: false,
      reason: "This image type requires review.",
    };
  }

  return { appropriate: true };
}

// ============================================================================
// Batch Classification (for efficiency)
// ============================================================================

/**
 * Classify multiple images (useful for batch operations)
 * Returns results in same order as input
 */
export async function classifyImageBatch(
  images: Array<{ image: string | Uint8Array; mimeType: string; hash: string }>,
  context: PetalContext,
  options: {
    ai?: Ai;
    togetherApiKey?: string;
    db?: D1Database;
    userId?: string;
    tenantId?: string;
  },
): Promise<ClassificationResult[]> {
  // Process in parallel but with concurrency limit
  const CONCURRENCY = 3;
  const results: ClassificationResult[] = [];

  for (let i = 0; i < images.length; i += CONCURRENCY) {
    const batch = images.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map((img) =>
        runLayer2(img.image, img.mimeType, img.hash, context, options),
      ),
    );
    results.push(...batchResults);
  }

  return results;
}
