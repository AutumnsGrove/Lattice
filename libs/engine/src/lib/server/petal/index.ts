/**
 * Petal - Image Content Moderation
 *
 * Grove's 4-layer image moderation system.
 * "Petals close to protect what's precious."
 *
 * Layer 1: CSAM Detection (MANDATORY)
 * Layer 2: Content Classification
 * Layer 3: Sanity Checks
 * Layer 4: Output Verification (AI-generated only)
 *
 * @see docs/specs/petal-spec.md
 */

import type { D1Database } from "@cloudflare/workers-types";
import {
  GENERIC_REJECTION_MESSAGE,
  PETAL_RATE_LIMITS,
  getRejectionMessage,
} from "$lib/config/petal.js";
import {
  PetalError,
  type PetalResult,
  type PetalScanInput,
  type PetalContext,
  type PetalEnv,
} from "./types.js";
import { runLayer1, hasActiveCSAMFlag } from "./layer1-csam.js";
import { runLayer2 } from "./layer2-classify.js";
import {
  runLayer3,
  quickDimensionCheck,
  quickFileSizeCheck,
} from "./layer3-sanity.js";
import { runLayer4, generateWithRetry } from "./layer4-output.js";
import {
  computeContentHash,
  getUserBlockCount,
  hasViolationPattern,
} from "./logging.js";

// ============================================================================
// Main Scan Function
// ============================================================================

/**
 * Run complete Petal moderation on an image
 *
 * This is the main entry point for image moderation.
 * Runs layers 1-3 for user uploads, layer 4 for AI outputs.
 */
export async function scanImage(
  input: PetalScanInput,
  env: PetalEnv,
): Promise<PetalResult> {
  const startTime = Date.now();
  const { imageData, mimeType, context, userId, tenantId, hash } = input;

  // Compute content hash if not provided
  const contentHash = hash || (await computeContentHash(imageData));

  // Build options for layer calls
  const options = {
    ai: env.AI,
    togetherApiKey: env.TOGETHER_API_KEY,
    photodnaSubscriptionKey: env.PHOTODNA_SUBSCRIPTION_KEY,
    db: env.DB,
    userId,
    tenantId,
  };

  try {
    // Check if user is already blocked (CSAM flag)
    if (env.DB && userId) {
      const isBlocked = await hasActiveCSAMFlag(env.DB, userId);
      if (isBlocked) {
        return {
          allowed: false,
          decision: "block",
          blockedAt: "layer1",
          message: "Unable to process uploads at this time.",
          code: "ACCOUNT_BLOCKED",
          contentHash,
          layers: {},
          processingTimeMs: Date.now() - startTime,
        };
      }

      // Check violation pattern
      const hasPattern = await hasViolationPattern(
        env.DB,
        userId,
        PETAL_RATE_LIMITS.maxBlockedUploadsBeforeReview,
      );
      if (hasPattern) {
        return {
          allowed: false,
          decision: "review",
          message: "Your account is under review. Please contact support.",
          code: "ACCOUNT_UNDER_REVIEW",
          contentHash,
          layers: {},
          processingTimeMs: Date.now() - startTime,
        };
      }
    }

    // ========================================================================
    // Layer 1: CSAM Detection (MANDATORY)
    // ========================================================================
    const csamResult = await runLayer1(
      imageData,
      mimeType,
      contentHash,
      options,
    );

    if (!csamResult.safe) {
      return {
        allowed: false,
        decision: "block",
        blockedAt: "layer1",
        // NEVER reveal CSAM detection to user
        message: GENERIC_REJECTION_MESSAGE,
        code: "CONTENT_BLOCKED",
        contentHash,
        layers: { csam: csamResult },
        processingTimeMs: Date.now() - startTime,
      };
    }

    // ========================================================================
    // Layer 2: Content Classification
    // ========================================================================
    const classificationResult = await runLayer2(
      imageData,
      mimeType,
      contentHash,
      context,
      options,
    );

    if (classificationResult.decision !== "allow") {
      return {
        allowed: false,
        decision: classificationResult.decision,
        blockedAt: "layer2",
        message:
          classificationResult.reason ||
          getRejectionMessage(classificationResult.category),
        code: `CATEGORY_${classificationResult.category.toUpperCase()}`,
        contentHash,
        layers: {
          csam: csamResult,
          classification: classificationResult,
        },
        processingTimeMs: Date.now() - startTime,
      };
    }

    // ========================================================================
    // Layer 3: Sanity Checks
    // ========================================================================
    const sanityResult = await runLayer3(
      imageData,
      mimeType,
      contentHash,
      context,
      options,
    );

    if (!sanityResult.valid) {
      return {
        allowed: false,
        decision: "block",
        blockedAt: "layer3",
        message:
          sanityResult.reason || "This image is not suitable for this feature.",
        code: "SANITY_CHECK_FAILED",
        contentHash,
        layers: {
          csam: csamResult,
          classification: classificationResult,
          sanity: sanityResult,
        },
        processingTimeMs: Date.now() - startTime,
      };
    }

    // ========================================================================
    // All Layers Passed
    // ========================================================================
    return {
      allowed: true,
      decision: "allow",
      message: "Image approved",
      code: "APPROVED",
      contentHash,
      layers: {
        csam: csamResult,
        classification: classificationResult,
        sanity: sanityResult,
      },
      processingTimeMs: Date.now() - startTime,
    };
  } catch (err) {
    // Handle Petal errors
    if (err instanceof PetalError) {
      return {
        allowed: false,
        decision: "block",
        blockedAt: err.layer,
        message:
          err.code === "CSAM_SCAN_FAILED"
            ? "We're experiencing technical difficulties. Please try again in a few minutes."
            : GENERIC_REJECTION_MESSAGE,
        code: err.code,
        contentHash,
        layers: {},
        processingTimeMs: Date.now() - startTime,
      };
    }

    // Unknown error - log and block safely
    console.error("[Petal] Unexpected error during scan:", err);
    return {
      allowed: false,
      decision: "block",
      message: "We're experiencing technical difficulties. Please try again.",
      code: "SCAN_ERROR",
      contentHash,
      layers: {},
      processingTimeMs: Date.now() - startTime,
    };
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Quick scan for upload validation
 * Runs only Layer 1-2 (no sanity checks)
 */
export async function quickScan(
  imageData: Uint8Array,
  mimeType: string,
  env: PetalEnv,
  userId?: string,
  tenantId?: string,
): Promise<PetalResult> {
  return scanImage(
    {
      imageData,
      mimeType,
      context: "general",
      userId,
      tenantId,
    },
    env,
  );
}

/**
 * Full scan for try-on feature
 * Runs all layers including strict sanity checks
 */
export async function tryonScan(
  imageData: Uint8Array,
  mimeType: string,
  env: PetalEnv,
  userId?: string,
  tenantId?: string,
): Promise<PetalResult> {
  return scanImage(
    {
      imageData,
      mimeType,
      context: "tryon",
      userId,
      tenantId,
    },
    env,
  );
}

/**
 * Verify AI-generated output (Layer 4)
 */
export async function verifyOutput(
  generatedImage: Uint8Array,
  mimeType: string,
  env: PetalEnv,
  userId?: string,
  tenantId?: string,
): Promise<PetalResult> {
  const startTime = Date.now();
  const contentHash = await computeContentHash(generatedImage);

  const options = {
    ai: env.AI,
    togetherApiKey: env.TOGETHER_API_KEY,
    photodnaSubscriptionKey: env.PHOTODNA_SUBSCRIPTION_KEY,
    db: env.DB,
    userId,
    tenantId,
  };

  const outputResult = await runLayer4(
    generatedImage,
    mimeType,
    contentHash,
    options,
  );

  if (!outputResult.safe) {
    return {
      allowed: false,
      decision: outputResult.action === "retry" ? "retry" : "block",
      blockedAt: "layer4",
      message:
        outputResult.reason || "Generated image did not meet safety standards.",
      code: "OUTPUT_VERIFICATION_FAILED",
      contentHash,
      layers: { output: outputResult },
      processingTimeMs: Date.now() - startTime,
    };
  }

  return {
    allowed: true,
    decision: "allow",
    message: "Output approved",
    code: "APPROVED",
    contentHash,
    layers: { output: outputResult },
    processingTimeMs: Date.now() - startTime,
  };
}

// ============================================================================
// Re-exports
// ============================================================================

// Types
export * from "./types.js";

// Layer functions (for advanced usage)
export {
  runLayer1,
  hasActiveCSAMFlag,
  flagAccountForCSAM,
} from "./layer1-csam.js";
export { runLayer2, checkFashionContext } from "./layer2-classify.js";
export {
  runLayer3,
  quickDimensionCheck,
  quickFileSizeCheck,
} from "./layer3-sanity.js";
export {
  runLayer4,
  generateWithRetry,
  verifyOutfitMatch,
} from "./layer4-output.js";

// Vision client
export {
  callVisionModel,
  classifyImage,
  runSanityCheck,
  getProviderHealthStatus,
  resetProviderHealth,
} from "./vision-client.js";

// PhotoDNA client
export {
  scanWithPhotoDNA,
  isPhotoDNAAvailable,
  type PhotoDNAResult,
  type PhotoDNAMatchResponse,
  MOCK_PHOTODNA_CLEAN,
  MOCK_PHOTODNA_MATCH,
  createMockPhotoDNAScan,
} from "./photodna-client.js";

// Logging
export {
  logSecurityEvent,
  computeContentHash,
  getRecentUserEvents,
  getUserBlockCount,
  hasViolationPattern,
  cleanupOldLogs,
} from "./logging.js";

// Config
export {
  PETAL_PROVIDERS,
  PETAL_PROVIDER_CASCADE,
  BLOCKED_CATEGORIES,
  REVIEW_CATEGORIES,
  CONFIDENCE_THRESHOLDS,
  PETAL_RATE_LIMITS,
  PHOTODNA_CONFIG,
  getRejectionMessage,
  getSanityRequirements,
} from "$lib/config/petal.js";
