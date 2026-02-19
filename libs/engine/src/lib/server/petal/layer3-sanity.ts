/**
 * Petal Layer 3: Sanity Checks
 *
 * Context-specific validation to ensure images are suitable for their
 * intended use. For try-on: face detection, quality, actual photo check.
 *
 * @see docs/specs/petal-spec.md Section 5
 */

import type { D1Database } from "@cloudflare/workers-types";
import {
  getSanityRequirements,
  type SanityRequirements,
} from "$lib/config/petal.js";
import type { SanityResult, PetalContext } from "./types.js";
import { runSanityCheck } from "./vision-client.js";
import { logSecurityEvent } from "./logging.js";

// ============================================================================
// Sanity Validation Logic
// ============================================================================

/**
 * Validate sanity check results against requirements
 */
function validateSanityResults(
  results: {
    faceCount: number;
    isScreenshot: boolean;
    isMeme: boolean;
    isDrawing: boolean;
    quality: number;
  },
  requirements: SanityRequirements,
  context: PetalContext,
): SanityResult {
  // Face detection check
  if (requirements.requireFace && results.faceCount === 0) {
    return {
      valid: false,
      reason: "Please upload a photo that shows your face and body.",
      suggestion: "A full-body or half-body selfie works best!",
      features: results,
    };
  }

  // Too many faces check
  if (results.faceCount > requirements.maxFaces) {
    return {
      valid: false,
      reason: "Please upload a photo with just you in it.",
      suggestion: "Group photos don't work well for try-on.",
      features: results,
    };
  }

  // Screenshot check
  if (requirements.blockScreenshots && results.isScreenshot) {
    return {
      valid: false,
      reason: "Please upload an actual photo of yourself.",
      suggestion: "Screenshots don't work for try-on.",
      features: results,
    };
  }

  // Non-photo check (memes, drawings)
  if (requirements.blockNonPhotos && (results.isMeme || results.isDrawing)) {
    return {
      valid: false,
      reason: "Please upload an actual photo of yourself.",
      suggestion: "Drawings and memes don't work for try-on.",
      features: results,
    };
  }

  // Quality check
  if (results.quality < requirements.minQuality) {
    return {
      valid: false,
      reason: "This image is too low quality for a good try-on.",
      suggestion: "Try a clearer, higher-resolution photo.",
      features: results,
    };
  }

  // All checks passed
  return {
    valid: true,
    features: results,
  };
}

// ============================================================================
// Layer 3 Processing
// ============================================================================

/**
 * Run sanity checks (Layer 3)
 */
export async function runLayer3(
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
): Promise<SanityResult> {
  const { db, userId, tenantId, ...visionOptions } = options;

  // Get requirements for this context
  const requirements = getSanityRequirements(context);

  // For blog/general context with minimal requirements, skip vision API
  if (
    !requirements.requireFace &&
    !requirements.blockScreenshots &&
    !requirements.blockNonPhotos &&
    requirements.minQuality <= 0.1
  ) {
    // No sanity checks needed for this context
    if (db) {
      await logSecurityEvent(db, {
        timestamp: new Date().toISOString(),
        layer: "layer3",
        result: "pass",
        contentHash,
        feature: "upload",
        userId,
        tenantId,
      });
    }
    return { valid: true };
  }

  // Run sanity check via vision model
  const checkResults = await runSanityCheck(image, mimeType, visionOptions);

  // Validate against requirements
  const result = validateSanityResults(checkResults, requirements, context);

  // Log the result
  if (db) {
    await logSecurityEvent(db, {
      timestamp: new Date().toISOString(),
      layer: "layer3",
      result: result.valid ? "pass" : "block",
      contentHash,
      feature: context === "tryon" ? "tryon" : "upload",
      userId,
      tenantId,
    });
  }

  return result;
}

// ============================================================================
// Quick Sanity Checks (No Vision API)
// ============================================================================

/**
 * Quick dimension-based sanity check (no API call)
 * Use when you have image dimensions available
 */
export function quickDimensionCheck(
  width: number,
  height: number,
  context: PetalContext,
): { valid: boolean; reason?: string } {
  const requirements = getSanityRequirements(context);

  // Check minimum resolution
  const minDimension = Math.min(width, height);
  if (minDimension < requirements.minResolution) {
    return {
      valid: false,
      reason: `Image resolution too low. Minimum ${requirements.minResolution}px required.`,
    };
  }

  // Check aspect ratio for try-on (should be portrait-ish)
  if (context === "tryon") {
    const aspectRatio = width / height;
    // Allow 1:3 to 3:1 aspect ratios
    if (aspectRatio < 0.33 || aspectRatio > 3) {
      return {
        valid: false,
        reason: "Image aspect ratio is unusual. Please use a standard photo.",
      };
    }
  }

  return { valid: true };
}

/**
 * Quick file size sanity check (no API call)
 */
export function quickFileSizeCheck(
  sizeBytes: number,
  context: PetalContext,
): { valid: boolean; reason?: string } {
  // Very small files are suspicious (likely not real photos)
  if (context === "tryon" && sizeBytes < 10_000) {
    return {
      valid: false,
      reason: "Image file is too small. Please upload a higher quality photo.",
    };
  }

  // Very large files (> 20MB) - already handled by upload validation
  // but double-check here
  if (sizeBytes > 20_000_000) {
    return {
      valid: false,
      reason: "Image file is too large. Maximum 20MB allowed.",
    };
  }

  return { valid: true };
}
