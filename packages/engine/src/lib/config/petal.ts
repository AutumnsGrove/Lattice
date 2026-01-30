/**
 * Petal - Image Content Moderation Configuration
 *
 * Model configuration, category definitions, and thresholds for Petal.
 * Uses Cloudflare Workers AI as primary with external API fallbacks.
 *
 * @see docs/specs/petal-spec.md
 */

import type {
  PetalCategory,
  PetalProviderConfig,
} from "$lib/server/petal/types.js";

// ============================================================================
// Provider Configuration
// ============================================================================

/**
 * Vision providers with automatic fallback cascade
 * Primary: Cloudflare Workers AI (same infrastructure, ZDR inherent)
 * Fallback: Together.ai (external API)
 */
export const PETAL_PROVIDERS: Record<string, PetalProviderConfig> = {
  workers_ai_llama4: {
    name: "Cloudflare Workers AI - Llama 4 Scout",
    type: "workers_ai",
    role: "primary",
    zdr: true, // Data never leaves Cloudflare
    csamScan: true, // Combined with Cloudflare CSAM Tool
    model: "@cf/meta/llama-4-scout-17b-16e-instruct",
    timeoutMs: 15000,
  },
  workers_ai_llama3: {
    name: "Cloudflare Workers AI - Llama 3.2 Vision",
    type: "workers_ai",
    role: "fallback",
    zdr: true,
    csamScan: true,
    model: "@cf/meta/llama-3.2-11b-vision-instruct",
    timeoutMs: 10000,
  },
  together_ai: {
    name: "Together.ai",
    type: "external_api",
    role: "tertiary",
    zdr: true, // ZDR enabled for open models
    csamScan: true, // Built-in CSAM scanning
    model: "meta-llama/Llama-4-Scout-17B-16E-Instruct",
    timeoutMs: 20000,
  },
};

/**
 * Provider fallback cascade for content classification
 */
export const PETAL_PROVIDER_CASCADE = [
  "workers_ai_llama4",
  "workers_ai_llama3",
  "together_ai",
] as const;

// ============================================================================
// Content Categories
// ============================================================================

/**
 * Categories that result in immediate block
 */
export const BLOCKED_CATEGORIES: PetalCategory[] = [
  "nudity",
  "sexual",
  "violence",
  "minor_present",
  "drugs",
  "self_harm",
  "hate_symbols",
  "csam_detected",
];

/**
 * Categories that need context review
 */
export const REVIEW_CATEGORIES: PetalCategory[] = [
  "swimwear",
  "underwear",
  "revealing",
  "artistic_nudity",
];

/**
 * Categories that are always allowed
 */
export const ALLOWED_CATEGORIES: PetalCategory[] = ["appropriate"];

// ============================================================================
// Confidence Thresholds
// ============================================================================

/**
 * Confidence thresholds for decision-making
 */
export const CONFIDENCE_THRESHOLDS = {
  /** Block with high certainty */
  block: 0.9,
  /** Block, but log for review */
  blockWithReview: 0.8,
  /** Context check required */
  contextCheck: 0.7,
  /** Allow, but monitor patterns */
  monitorThreshold: 0.5,
} as const;

// ============================================================================
// User-Facing Messages
// ============================================================================

/**
 * User-friendly rejection messages by category
 * IMPORTANT: Never reveal CSAM detection reason to users
 */
export const REJECTION_MESSAGES: Record<PetalCategory, string> = {
  appropriate: "", // Not used for rejections
  nudity: "Please upload a photo where you are fully clothed.",
  sexual: "This image is not appropriate for our platform.",
  violence: "This image contains content we cannot process.",
  minor_present: "Custom Model is only available for photos of adults (18+).",
  drugs: "This image contains content we cannot process.",
  self_harm: "This image contains content we cannot process.",
  hate_symbols:
    "This image contains symbols that violate our community guidelines.",
  // Generic message for CSAM - never reveal detection
  csam_detected:
    "This image could not be processed. Please try a different photo.",
  // Review categories - contextual messages
  swimwear: "This image type is not supported for try-on.",
  underwear: "This image type is not supported for try-on.",
  revealing: "This image type is not supported for try-on.",
  artistic_nudity: "This image type is not supported for try-on.",
};

/**
 * Generic fallback message (never reveals specific reason for security categories)
 */
export const GENERIC_REJECTION_MESSAGE =
  "This image could not be processed. Please try a different photo.";

// ============================================================================
// Sanity Check Requirements by Context
// ============================================================================

export interface SanityRequirements {
  /** Require face detection */
  requireFace: boolean;
  /** Maximum number of faces allowed */
  maxFaces: number;
  /** Block screenshots */
  blockScreenshots: boolean;
  /** Block memes/drawings */
  blockNonPhotos: boolean;
  /** Minimum quality score (0-1) */
  minQuality: number;
  /** Minimum resolution (smallest dimension) */
  minResolution: number;
}

/**
 * Sanity check requirements by context
 */
export const SANITY_REQUIREMENTS: Record<string, SanityRequirements> = {
  tryon: {
    requireFace: true,
    maxFaces: 1,
    blockScreenshots: true,
    blockNonPhotos: true,
    minQuality: 0.3,
    minResolution: 256,
  },
  profile: {
    requireFace: true,
    maxFaces: 3,
    blockScreenshots: true,
    blockNonPhotos: false, // Allow some artistic photos
    minQuality: 0.2,
    minResolution: 128,
  },
  blog: {
    requireFace: false,
    maxFaces: 99, // No limit
    blockScreenshots: false, // Screenshots OK for blog posts
    blockNonPhotos: false,
    minQuality: 0.1,
    minResolution: 64,
  },
  general: {
    requireFace: false,
    maxFaces: 99,
    blockScreenshots: false,
    blockNonPhotos: false,
    minQuality: 0.1,
    minResolution: 64,
  },
};

// ============================================================================
// Rate Limiting
// ============================================================================

/**
 * Rate limits for Petal operations
 */
export const PETAL_RATE_LIMITS = {
  /** Max uploads per session */
  maxUploadsPerSession: 5,
  /** Max retries per image */
  maxRetriesPerImage: 3,
  /** Max uploads per day */
  maxUploadsPerDay: 20,
  /** Blocked uploads before account review */
  maxBlockedUploadsBeforeReview: 3,
  /** CSAM flags before instant ban (always 1) */
  maxCSAMFlagsBeforeBan: 1,
} as const;

// ============================================================================
// Circuit Breaker Configuration
// ============================================================================

/**
 * Circuit breaker settings for provider failover
 */
export const FAILOVER_CONFIG = {
  /** Failures before circuit opens */
  failureThreshold: 3,
  /** Time before trying again (ms) */
  circuitResetMs: 60_000,
  /** CSAM scan timeout (ms) */
  csamTimeoutMs: 5_000,
  /** Classification timeout (ms) */
  classificationTimeoutMs: 15_000,
  /** Sanity check timeout (ms) */
  sanityTimeoutMs: 10_000,
} as const;

// ============================================================================
// PhotoDNA Configuration
// ============================================================================

/**
 * PhotoDNA Cloud Service configuration
 *
 * PhotoDNA is Microsoft's industry-standard perceptual hash system for
 * detecting known CSAM content against the NCMEC database.
 *
 * INTEGRATION STATUS: Awaiting Microsoft approval
 * Once approved, add PHOTODNA_SUBSCRIPTION_KEY to Cloudflare secrets.
 *
 * @see https://www.microsoft.com/en-us/photodna
 */
export const PHOTODNA_CONFIG = {
  /** PhotoDNA Cloud Service endpoint */
  endpoint: "https://api.microsoftmoderator.com/photodna",
  /** Request timeout in milliseconds */
  timeoutMs: 5_000,
  /** Environment variable name for subscription key */
  subscriptionKeyEnvVar: "PHOTODNA_SUBSCRIPTION_KEY",
  /** Whether PhotoDNA is the primary CSAM detection method */
  isPrimary: true,
  /** Fall back to vision model if PhotoDNA unavailable */
  fallbackToVision: true,
} as const;

// ============================================================================
// Pricing (for cost tracking)
// ============================================================================

/**
 * Approximate cost per image (in USD)
 * Based on Workers AI pricing: $0.27/M input, $0.85/M output
 */
export const PETAL_PRICING = {
  /** Cost per classification (approximate) */
  perClassification: 0.0014,
  /** Cost per sanity check (approximate) */
  perSanityCheck: 0.0007,
  /** Free tier limit (neurons/day) */
  freeTierLimit: 10_000,
} as const;

// ============================================================================
// Classification Prompt
// ============================================================================

/**
 * System prompt for content classification
 * Used with vision models to classify images against Petal categories
 */
export const CLASSIFICATION_PROMPT = `You are a content safety classifier for Grove, a community platform.
Analyze this image and classify it into exactly ONE of these categories:

BLOCKED (return the specific category):
- nudity: Full or partial nudity
- sexual: Sexually explicit or suggestive content
- violence: Gore, injury, weapons
- minor_present: A minor (person under 18) appears to be in the photo
- drugs: Drug paraphernalia visible
- self_harm: Self-harm imagery
- hate_symbols: Hate symbols (swastikas, etc.)

REVIEW (context-dependent):
- swimwear: Person in swimwear
- underwear: Person in underwear
- revealing: Revealing clothing

ALLOWED:
- appropriate: Safe, appropriate content

Respond with ONLY a JSON object in this exact format:
{"category": "category_name", "confidence": 0.95}

Where confidence is 0.0 to 1.0.`;

/**
 * Sanity check prompt for try-on context
 */
export const SANITY_CHECK_PROMPT = `Analyze this image for a virtual try-on feature. Check:
1. Is there exactly one person visible?
2. Is their face clearly visible?
3. Is this an actual photograph (not a screenshot, meme, or drawing)?
4. Is the image quality sufficient (not blurry or pixelated)?

Respond with ONLY a JSON object:
{"faceCount": 1, "isScreenshot": false, "isMeme": false, "isDrawing": false, "quality": 0.8}

Where quality is 0.0 to 1.0 (1.0 = perfect quality).`;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get provider config by key
 */
export function getPetalProvider(key: string): PetalProviderConfig | null {
  return PETAL_PROVIDERS[key] || null;
}

/**
 * Check if category is blocked
 */
export function isCategoryBlocked(category: PetalCategory): boolean {
  return BLOCKED_CATEGORIES.includes(category);
}

/**
 * Check if category needs review
 */
export function isCategoryReview(category: PetalCategory): boolean {
  return REVIEW_CATEGORIES.includes(category);
}

/**
 * Get rejection message for category
 */
export function getRejectionMessage(category: PetalCategory): string {
  return REJECTION_MESSAGES[category] || GENERIC_REJECTION_MESSAGE;
}

/**
 * Get sanity requirements for context
 */
export function getSanityRequirements(context: string): SanityRequirements {
  return SANITY_REQUIREMENTS[context] || SANITY_REQUIREMENTS.general;
}
