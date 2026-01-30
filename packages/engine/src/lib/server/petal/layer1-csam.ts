/**
 * Petal Layer 1: CSAM Detection
 *
 * MANDATORY layer - cannot be bypassed. Federal law requires CSAM detection
 * and NCMEC reporting within 24 hours (18 U.S.C. § 2258A).
 *
 * DETECTION STRATEGY (in priority order):
 * ═══════════════════════════════════════════════════════════════════════════
 * 1. PhotoDNA (Primary) - Hash-based matching against NCMEC database
 *    - Industry standard perceptual hash for known CSAM detection
 *    - Catches previously-identified content with high accuracy
 *    - Requires Microsoft approval (application submitted 2025-01-30)
 *
 * 2. Vision Model Classification (Fallback)
 *    - AI-based detection for novel content
 *    - Checks for "minor_present" category at ≥0.7 confidence
 *    - Used when PhotoDNA unavailable or as secondary check
 *
 * 3. Cloudflare CSAM Tool (CDN-level, async)
 *    - Runs asynchronously at serve time using fuzzy hashing
 *    - Enabled in Cloudflare Dashboard: Caching > Configuration
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @see docs/specs/petal-spec.md Section 3
 */

import type { D1Database } from "@cloudflare/workers-types";
import { FAILOVER_CONFIG, PHOTODNA_CONFIG } from "$lib/config/petal.js";
import { PetalError, type CSAMResult } from "./types.js";
import { classifyImage } from "./vision-client.js";
import {
  scanWithPhotoDNA,
  isPhotoDNAAvailable,
  type PhotoDNAResult,
} from "./photodna-client.js";
import { logSecurityEvent } from "./logging.js";

// ============================================================================
// CSAM Detection
// ============================================================================

/**
 * Scan image for CSAM content using PhotoDNA (primary) with vision fallback
 *
 * This is the CRITICAL path - if CSAM scanning fails, we CANNOT process the image.
 * Federal law requires CSAM detection before storing/processing user images.
 *
 * Detection cascade:
 * 1. PhotoDNA hash matching (if subscription key available)
 * 2. Vision model classification (fallback)
 *
 * If both fail, the upload is blocked for safety.
 */
export async function scanForCSAM(
  image: string | Uint8Array,
  mimeType: string,
  contentHash: string,
  options: {
    ai?: Ai;
    togetherApiKey?: string;
    photodnaSubscriptionKey?: string;
  },
): Promise<CSAMResult> {
  const { photodnaSubscriptionKey, ...visionOptions } = options;

  // ──────────────────────────────────────────────────────────────────────────
  // PRIMARY: PhotoDNA hash-based detection
  // ──────────────────────────────────────────────────────────────────────────
  if (
    PHOTODNA_CONFIG.isPrimary &&
    isPhotoDNAAvailable(photodnaSubscriptionKey)
  ) {
    try {
      const imageData =
        typeof image === "string"
          ? Uint8Array.from(atob(image), (c) => c.charCodeAt(0))
          : image;

      const photodnaResult = await scanWithPhotoDNA(imageData, mimeType, {
        subscriptionKey: photodnaSubscriptionKey!,
      });

      if (photodnaResult.matched) {
        // PhotoDNA match = definite CSAM detection
        return {
          safe: false,
          reason: "CSAM_DETECTED",
          mustReport: true,
          hash: contentHash,
          provider: "photodna",
          photodnaTrackingId: photodnaResult.trackingId,
          photodnaConfidence: photodnaResult.confidence,
        };
      }

      // PhotoDNA clear - image passed hash check
      // Continue to vision fallback for additional safety (optional)
      if (!PHOTODNA_CONFIG.fallbackToVision) {
        return {
          safe: true,
          hash: contentHash,
          provider: "photodna",
          photodnaTrackingId: photodnaResult.trackingId,
        };
      }

      // PhotoDNA passed, but also run vision as secondary check
      // This catches novel content that isn't in the hash database yet
      try {
        const visionResult = await scanWithVision(
          image,
          mimeType,
          contentHash,
          visionOptions,
        );
        if (!visionResult.safe) {
          return visionResult;
        }
      } catch {
        // Vision failed but PhotoDNA passed - allow the image
        // PhotoDNA is authoritative for known content
      }

      return {
        safe: true,
        hash: contentHash,
        provider: "photodna",
        photodnaTrackingId: photodnaResult.trackingId,
      };
    } catch (err) {
      // PhotoDNA failed - fall back to vision if configured
      console.warn(
        "[Petal] PhotoDNA scan failed, falling back to vision:",
        err,
      );

      if (!PHOTODNA_CONFIG.fallbackToVision) {
        // No fallback configured - block for safety
        throw new PetalError(
          "CSAM scanning unavailable - upload blocked for safety",
          "CSAM_SCAN_FAILED",
          "layer1",
          "photodna",
          err,
        );
      }
      // Continue to vision fallback
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // FALLBACK: Vision model classification
  // ──────────────────────────────────────────────────────────────────────────
  return scanWithVision(image, mimeType, contentHash, visionOptions);
}

/**
 * Scan image using vision model classification (fallback method)
 */
async function scanWithVision(
  image: string | Uint8Array,
  mimeType: string,
  contentHash: string,
  options: {
    ai?: Ai;
    togetherApiKey?: string;
  },
): Promise<CSAMResult> {
  try {
    const classification = await classifyImage(image, mimeType, options);

    // Check for CSAM indicators
    // minor_present in sexual/nudity context is treated as potential CSAM
    if (
      classification.category === "minor_present" &&
      classification.confidence >= 0.7
    ) {
      return {
        safe: false,
        reason: "CSAM_DETECTED",
        mustReport: true,
        hash: contentHash,
        provider: classification.provider,
      };
    }

    return {
      safe: true,
      hash: contentHash,
      provider: classification.provider,
    };
  } catch (err) {
    // CRITICAL: If CSAM scanning fails, we MUST block the upload
    // We cannot process images without CSAM scanning
    throw new PetalError(
      "CSAM scanning unavailable - upload blocked for safety",
      "CSAM_SCAN_FAILED",
      "layer1",
      undefined,
      err,
    );
  }
}

// ============================================================================
// Account Flagging
// ============================================================================

/**
 * Flag account for CSAM detection
 *
 * This creates a permanent block on the account until manual review.
 * CSAM detection = instant upload block + NCMEC report required.
 */
export async function flagAccountForCSAM(
  db: D1Database,
  userId: string,
  contentHash: string,
): Promise<void> {
  const id = crypto.randomUUID().replace(/-/g, "").substring(0, 16);

  // ─────────────────────────────────────────────────────────────────────────────
  // CRITICAL OPERATION: Flag the account
  // This MUST succeed - if it fails, we log loudly but don't throw
  // (the upload is already blocked at this point)
  // ─────────────────────────────────────────────────────────────────────────────
  try {
    await db
      .prepare(
        `INSERT INTO petal_account_flags (
          id, user_id, flag_type, block_uploads, requires_manual_review, review_status
        ) VALUES (?, ?, 'csam_detection', 1, 1, 'pending')
        ON CONFLICT(user_id, flag_type) DO UPDATE SET
          block_uploads = 1,
          requires_manual_review = 1,
          review_status = 'pending'`,
      )
      .bind(id, userId)
      .run();
  } catch (err) {
    // CRITICAL: Account flagging failed - log loudly
    // The upload is still blocked, but we failed to persist the flag
    console.error("[Petal] CRITICAL: Failed to flag account for CSAM:", err);
    // Don't throw - upload is already blocked, but this needs monitoring/alerting
    return; // Exit early - don't attempt logging if flagging failed
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // NON-CRITICAL: Log the security event
  // Best-effort - failure here doesn't affect the block
  // ─────────────────────────────────────────────────────────────────────────────
  try {
    await logSecurityEvent(db, {
      timestamp: new Date().toISOString(),
      layer: "layer1",
      result: "block",
      category: "csam_detected",
      contentHash,
      feature: "upload",
      userId,
    });
  } catch (err) {
    // Non-critical: Logging failed, but account is already flagged
    console.error("[Petal] Failed to log CSAM flagging event:", err);
  }
}

/**
 * Check if user has active CSAM flag (blocked from uploads)
 */
export async function hasActiveCSAMFlag(
  db: D1Database,
  userId: string,
): Promise<boolean> {
  try {
    const flag = await db
      .prepare(
        `SELECT id FROM petal_account_flags
         WHERE user_id = ?
         AND flag_type = 'csam_detection'
         AND block_uploads = 1
         AND review_status IN ('pending', 'confirmed')`,
      )
      .bind(userId)
      .first();

    return flag !== null;
  } catch (err) {
    // If check fails, assume not blocked (fail-open for legitimate users)
    console.error("[Petal] Failed to check CSAM flag:", err);
    return false;
  }
}

// ============================================================================
// NCMEC Reporting
// ============================================================================
//
// ⚠️  CRITICAL LEGAL NOTICE ⚠️
// ════════════════════════════════════════════════════════════════════════════
// This implementation is a PLACEHOLDER ONLY. Before deploying to production
// with real user uploads, you MUST implement actual NCMEC CyberTipline
// integration per 18 U.S.C. § 2258A.
//
// REQUIREMENTS FOR PRODUCTION:
// 1. Register as ESP (Electronic Service Provider) with NCMEC
// 2. Implement CyberTipline API integration
// 3. Set up secure report metadata storage with encryption
// 4. Establish monitoring and alerting for the NCMEC queue
// 5. Document manual review process for queued reports
//
// CURRENT BEHAVIOR: Logs detection and stores in database queue for manual
// processing. This does NOT satisfy legal requirements for automated reporting.
//
// See: https://www.missingkids.org/gethelpnow/cybertipline
// ════════════════════════════════════════════════════════════════════════════

/**
 * Report to NCMEC (National Center for Missing & Exploited Children)
 *
 * ⚠️ PLACEHOLDER IMPLEMENTATION - NOT FOR PRODUCTION USE ⚠️
 *
 * Federal law (18 U.S.C. § 2258A) requires reporting within 24 hours.
 * This placeholder queues reports for manual processing. Before production
 * deployment, implement actual CyberTipline API integration.
 *
 * @see https://www.missingkids.org/gethelpnow/cybertipline
 */
export async function queueNCMECReport(
  db: D1Database,
  data: {
    contentHash: string;
    timestamp: string;
    userId: string;
    tenantId?: string;
    photodnaTrackingId?: string;
  },
): Promise<void> {
  // Log the report requirement
  console.error("[PETAL CRITICAL] NCMEC Report Required:", {
    hash: data.contentHash,
    timestamp: data.timestamp,
    photodnaTrackingId: data.photodnaTrackingId,
    // Never log user-identifying info to console
    reported: false,
    deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  });

  // Store in database for manual processing
  try {
    const id = crypto.randomUUID().replace(/-/g, "").substring(0, 16);
    await db
      .prepare(
        `INSERT INTO petal_ncmec_queue (
          id, content_hash, detected_at, user_id, tenant_id, reported, report_deadline
        ) VALUES (?, ?, ?, ?, ?, 0, datetime(?, '+24 hours'))`,
      )
      .bind(
        id,
        data.contentHash,
        data.timestamp,
        data.userId,
        data.tenantId || null,
        data.timestamp,
      )
      .run();
  } catch (err) {
    // CRITICAL: If we can't queue the report, log loudly
    console.error("[PETAL CRITICAL] Failed to queue NCMEC report:", err);
    // In production, this should trigger an alert
  }
}

// ============================================================================
// Full Layer 1 Processing
// ============================================================================

/**
 * Run complete Layer 1 (CSAM) processing
 *
 * Uses PhotoDNA as primary detection method with vision model fallback.
 */
export async function runLayer1(
  image: string | Uint8Array,
  mimeType: string,
  contentHash: string,
  options: {
    ai?: Ai;
    togetherApiKey?: string;
    photodnaSubscriptionKey?: string;
    db?: D1Database;
    userId?: string;
    tenantId?: string;
  },
): Promise<CSAMResult> {
  const { db, userId, tenantId, ...scanOptions } = options;

  // Check if user is already blocked
  if (db && userId) {
    const isBlocked = await hasActiveCSAMFlag(db, userId);
    if (isBlocked) {
      throw new PetalError(
        "Unable to process uploads at this time.",
        "ACCOUNT_BLOCKED",
        "layer1",
      );
    }
  }

  // Run CSAM scan (PhotoDNA primary, vision fallback)
  const result = await scanForCSAM(image, mimeType, contentHash, scanOptions);

  // Handle CSAM detection
  if (!result.safe && result.mustReport) {
    // Flag account
    if (db && userId) {
      await flagAccountForCSAM(db, userId, contentHash);
    }

    // Queue NCMEC report
    if (db && userId) {
      await queueNCMECReport(db, {
        contentHash,
        timestamp: new Date().toISOString(),
        userId,
        tenantId,
        photodnaTrackingId: result.photodnaTrackingId,
      });
    }

    // Log security event
    if (db) {
      await logSecurityEvent(db, {
        timestamp: new Date().toISOString(),
        layer: "layer1",
        result: "block",
        category: "csam_detected",
        contentHash,
        feature: "upload",
        userId,
        tenantId,
      });
    }
  } else if (db) {
    // Log pass
    await logSecurityEvent(db, {
      timestamp: new Date().toISOString(),
      layer: "layer1",
      result: "pass",
      contentHash,
      feature: "upload",
      userId,
      tenantId,
    });
  }

  return result;
}
