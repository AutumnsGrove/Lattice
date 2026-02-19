/**
 * Petal Layer 4: Output Verification
 *
 * Verifies AI-generated images before showing to users.
 * AI models can hallucinate inappropriate content even from safe inputs.
 *
 * This layer runs ONLY for AI-generated images (try-on, Model Farm).
 *
 * @see docs/specs/petal-spec.md Section 6
 */

import type { D1Database } from "@cloudflare/workers-types";
import type { OutputVerificationResult, PetalCategory } from "./types.js";
import { runLayer2 } from "./layer2-classify.js";
import { logSecurityEvent } from "./logging.js";

// ============================================================================
// Output Verification
// ============================================================================

/**
 * Verify AI-generated output is safe before delivery
 */
export async function runLayer4(
  generatedImage: string | Uint8Array,
  mimeType: string,
  contentHash: string,
  options: {
    ai?: Ai;
    togetherApiKey?: string;
    db?: D1Database;
    userId?: string;
    tenantId?: string;
    /** Intended description for matching verification */
    intendedDescription?: string;
    /** Current retry count */
    retryCount?: number;
  },
): Promise<OutputVerificationResult> {
  const {
    db,
    userId,
    tenantId,
    intendedDescription,
    retryCount = 0,
    ...visionOptions
  } = options;

  // Re-run content classification on generated output
  const classification = await runLayer2(
    generatedImage,
    mimeType,
    contentHash,
    "general", // Use general context for generated images
    { ...visionOptions, db, userId, tenantId },
  );

  // Check if generated content is safe
  if (classification.decision !== "allow") {
    // AI generated something inappropriate
    if (db) {
      await logSecurityEvent(db, {
        timestamp: new Date().toISOString(),
        layer: "layer4",
        result: "block",
        category: classification.category,
        confidence: classification.confidence,
        contentHash,
        feature: "tryon",
        userId,
        tenantId,
      });
    }

    // Decide whether to retry or reject
    const MAX_RETRIES = 3;
    const shouldRetry = retryCount < MAX_RETRIES;

    return {
      safe: false,
      action: shouldRetry ? "retry" : "reject",
      reason: "Generated image did not meet safety standards.",
      retryCount,
    };
  }

  // If we have an intended description, could verify match
  // (This is a placeholder for future outfit matching logic)
  // For now, we trust the generation if it passes content classification

  // Log success
  if (db) {
    await logSecurityEvent(db, {
      timestamp: new Date().toISOString(),
      layer: "layer4",
      result: "pass",
      contentHash,
      feature: "tryon",
      userId,
      tenantId,
    });
  }

  return {
    safe: true,
    retryCount,
  };
}

// ============================================================================
// Retry Logic
// ============================================================================

/**
 * Generate with retry on Layer 4 failure
 *
 * @param generateFn - Function that generates the image (returns base64 or Uint8Array)
 * @param options - Verification options
 * @returns Generated image if safe, null if all retries exhausted
 */
export async function generateWithRetry<T extends string | Uint8Array>(
  generateFn: (
    seed: number,
  ) => Promise<{ image: T; hash: string; mimeType: string }>,
  options: {
    ai?: Ai;
    togetherApiKey?: string;
    db?: D1Database;
    userId?: string;
    tenantId?: string;
    maxRetries?: number;
  },
): Promise<{ image: T; hash: string } | null> {
  const { maxRetries = 3, ...verifyOptions } = options;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // Generate with different seed each time
    const seed = Date.now() + attempt;
    const generated = await generateFn(seed);

    // Verify the output
    const verification = await runLayer4(
      generated.image,
      generated.mimeType,
      generated.hash,
      { ...verifyOptions, retryCount: attempt },
    );

    if (verification.safe) {
      return { image: generated.image, hash: generated.hash };
    }

    // If action is 'reject', don't retry
    if (verification.action === "reject") {
      console.warn("[Petal] Layer 4 rejected output without retry");
      break;
    }

    // Log retry
    console.log(`[Petal] Layer 4 retry ${attempt + 1}/${maxRetries + 1}`);
  }

  // All retries exhausted
  return null;
}

// ============================================================================
// Output Matching (Future)
// ============================================================================

/**
 * Verify generated output matches intended description
 * This is a placeholder for future outfit matching logic
 */
export async function verifyOutfitMatch(
  generatedImage: string | Uint8Array,
  mimeType: string,
  intendedDescription: string,
  options: {
    ai?: Ai;
    togetherApiKey?: string;
  },
): Promise<{ matches: boolean; score: number; reason?: string }> {
  // Placeholder - in future, would use vision model to compare
  // generated output to intended description

  // For now, assume match if we got here (passed classification)
  return {
    matches: true,
    score: 0.8,
  };
}
