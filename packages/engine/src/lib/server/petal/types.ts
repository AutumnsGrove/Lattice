/**
 * Petal - Image Content Moderation Types
 *
 * Core type definitions for Grove's 4-layer image moderation system.
 * Follows the Songbird pattern: protection without surveillance.
 *
 * @see docs/specs/petal-spec.md
 */

// ============================================================================
// Core Enums
// ============================================================================

/**
 * Context for image validation - determines which checks to run
 */
export type PetalContext = "tryon" | "profile" | "blog" | "general";

/**
 * Moderation layer identifiers
 */
export type PetalLayer = "layer1" | "layer2" | "layer3" | "layer4";

/**
 * Final decision for an image
 */
export type PetalDecision = "allow" | "block" | "retry" | "review";

/**
 * Content categories for classification
 */
export type PetalCategory =
  | "appropriate"
  | "nudity"
  | "sexual"
  | "violence"
  | "minor_present"
  | "drugs"
  | "self_harm"
  | "hate_symbols"
  | "csam_detected"
  | "swimwear"
  | "underwear"
  | "revealing"
  | "artistic_nudity";

// ============================================================================
// Layer Results
// ============================================================================

/**
 * Layer 1: CSAM Detection Result
 * This layer is MANDATORY and cannot be bypassed
 */
export interface CSAMResult {
  /** Whether the image passed CSAM check */
  safe: boolean;
  /** Reason for block (only if unsafe) */
  reason?: "CSAM_DETECTED";
  /** Whether NCMEC report is required */
  mustReport?: boolean;
  /** Content hash (SHA-256, never the image itself) */
  hash?: string;
  /** Provider that performed the scan ("photodna" | "vision" | provider name) */
  provider?: string;
  /** PhotoDNA tracking ID if scanned with PhotoDNA */
  photodnaTrackingId?: string;
  /** PhotoDNA match confidence (0-100) if matched */
  photodnaConfidence?: number;
}

/**
 * Layer 2: Content Classification Result
 */
export interface ClassificationResult {
  /** Primary category detected */
  category: PetalCategory;
  /** Confidence score (0-1) */
  confidence: number;
  /** Decision based on thresholds */
  decision: PetalDecision;
  /** Human-readable reason for rejection */
  reason?: string;
  /** Model used for classification */
  model?: string;
  /** Provider used */
  provider?: string;
}

/**
 * Layer 3: Sanity Check Result
 */
export interface SanityResult {
  /** Whether the image is valid for its context */
  valid: boolean;
  /** Reason for rejection */
  reason?: string;
  /** Helpful suggestion for the user */
  suggestion?: string;
  /** Detected features */
  features?: {
    faceCount?: number;
    isScreenshot?: boolean;
    isMeme?: boolean;
    isDrawing?: boolean;
    quality?: number; // 0-1
  };
}

/**
 * Layer 4: Output Verification Result (for AI-generated images)
 */
export interface OutputVerificationResult {
  /** Whether the generated output is safe */
  safe: boolean;
  /** Recommended action */
  action?: "retry" | "reject";
  /** Reason for failure */
  reason?: string;
  /** Retry count */
  retryCount?: number;
}

// ============================================================================
// Combined Result
// ============================================================================

/**
 * Complete Petal scan result
 */
export interface PetalResult {
  /** Overall pass/fail */
  allowed: boolean;
  /** Final decision */
  decision: PetalDecision;
  /** Which layer blocked (if any) */
  blockedAt?: PetalLayer;
  /** User-friendly message */
  message: string;
  /** Internal reason code */
  code: string;
  /** Content hash for logging (never store images) */
  contentHash: string;
  /** Layer results */
  layers: {
    csam?: CSAMResult;
    classification?: ClassificationResult;
    sanity?: SanityResult;
    output?: OutputVerificationResult;
  };
  /** Processing time in ms */
  processingTimeMs: number;
}

// ============================================================================
// Account Flagging
// ============================================================================

/**
 * Account flag types
 */
export type PetalFlagType =
  | "csam_detection"
  | "content_violations"
  | "abuse_pattern";

/**
 * Review status for flagged accounts
 */
export type PetalReviewStatus =
  | "pending"
  | "reviewed"
  | "cleared"
  | "confirmed";

/**
 * Account flag record
 */
export interface PetalAccountFlag {
  id: string;
  userId: string;
  flagType: PetalFlagType;
  createdAt: string;
  /** Block all photo uploads */
  blockUploads: boolean;
  /** Requires manual review by Wayfinder */
  requiresManualReview: boolean;
  /** Review status */
  reviewStatus: PetalReviewStatus;
  /** Reviewer ID */
  reviewedBy?: string;
  /** Review timestamp */
  reviewedAt?: string;
  /** Internal notes */
  reviewNotes?: string;
}

// ============================================================================
// Security Logging
// ============================================================================

/**
 * Security log entry (no image content, only hashes)
 */
export interface PetalSecurityLog {
  id?: string;
  timestamp: string;
  layer: PetalLayer;
  result: "pass" | "block" | "retry";
  /** Category (only for blocks) */
  category?: PetalCategory;
  /** Confidence (only for blocks) */
  confidence?: number;
  /** SHA-256 of image, NEVER the image itself */
  contentHash: string;
  /** Feature that triggered the scan */
  feature: "upload" | "tryon" | "model_farm" | "profile";
  /** Anonymous user ID for pattern detection */
  userId?: string;
  /** Tenant ID */
  tenantId?: string;
}

// ============================================================================
// Provider Types
// ============================================================================

/**
 * Vision provider configuration
 */
export interface PetalProviderConfig {
  name: string;
  type: "workers_ai" | "external_api";
  role: "primary" | "fallback" | "tertiary";
  /** Zero Data Retention support */
  zdr: boolean;
  /** Built-in CSAM scanning */
  csamScan: boolean;
  /** Model identifier */
  model: string;
  /** Timeout in ms */
  timeoutMs: number;
}

/**
 * Provider health status (for circuit breaker)
 */
export interface PetalProviderHealth {
  provider: string;
  healthy: boolean;
  lastCheck: Date;
  consecutiveFailures: number;
  /** Circuit is open = skip this provider */
  circuitOpen: boolean;
}

// ============================================================================
// Request/Response Types
// ============================================================================

/**
 * Input for Petal scan
 */
export interface PetalScanInput {
  /** Image data as Uint8Array */
  imageData: Uint8Array;
  /** MIME type */
  mimeType: string;
  /** Context for validation rules */
  context: PetalContext;
  /** User ID for logging/flagging */
  userId?: string;
  /** Tenant ID */
  tenantId?: string;
  /** Pre-computed hash (optional, will compute if not provided) */
  hash?: string;
}

/**
 * Platform environment with Petal bindings
 */
export interface PetalEnv {
  /** Workers AI binding */
  AI?: Ai;
  /** D1 Database */
  DB?: D1Database;
  /** KV for rate limiting */
  CACHE_KV?: KVNamespace;
  /** PhotoDNA subscription key (primary CSAM detection) */
  PHOTODNA_SUBSCRIPTION_KEY?: string;
  /** External provider API keys (optional fallbacks) */
  TOGETHER_API_KEY?: string;
  FAL_API_KEY?: string;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Petal-specific error
 */
export class PetalError extends Error {
  code: string;
  layer?: PetalLayer;
  provider?: string;
  override cause?: unknown;

  constructor(
    message: string,
    code: string,
    layer?: PetalLayer,
    provider?: string,
    cause?: unknown,
  ) {
    super(message);
    this.name = "PetalError";
    this.code = code;
    this.layer = layer;
    this.provider = provider;
    this.cause = cause;
  }
}
