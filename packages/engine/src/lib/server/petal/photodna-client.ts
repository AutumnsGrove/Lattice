/**
 * PhotoDNA Client - Hash-Based CSAM Detection
 *
 * Microsoft PhotoDNA is the industry-standard perceptual hash system for
 * detecting known CSAM content. This client provides the interface for
 * Grove's Layer 1 CSAM detection.
 *
 * INTEGRATION STATUS: Awaiting Microsoft approval (application submitted 2025-01-30)
 * Once approved, add PHOTODNA_SUBSCRIPTION_KEY to Cloudflare secrets.
 *
 * @see https://www.microsoft.com/en-us/photodna
 * @see docs/specs/petal-spec.md Section 3
 */

import { PHOTODNA_CONFIG } from "$lib/config/petal.js";
import { PetalError } from "./types.js";

// ============================================================================
// Types
// ============================================================================

/**
 * PhotoDNA API response for image match check
 */
export interface PhotoDNAMatchResponse {
  /** Whether a match was found against the NCMEC database */
  isMatch: boolean;
  /** Match confidence (0-100) if matched */
  matchConfidence?: number;
  /** Tracking ID for this request */
  trackingId?: string;
  /** Status of the request */
  status: {
    code: number;
    description: string;
  };
}

/**
 * Result from PhotoDNA scan
 */
export interface PhotoDNAResult {
  /** Whether the image is safe (no match found) */
  safe: boolean;
  /** Whether a hash match was found */
  matched: boolean;
  /** Match confidence if matched (0-100) */
  confidence?: number;
  /** PhotoDNA tracking ID for audit trail */
  trackingId?: string;
  /** Whether this result came from PhotoDNA (vs fallback) */
  provider: "photodna";
  /** Error message if scan failed */
  error?: string;
}

/**
 * Options for PhotoDNA scan
 */
export interface PhotoDNAScanOptions {
  /** PhotoDNA subscription key */
  subscriptionKey: string;
  /** Optional timeout override (default from config) */
  timeoutMs?: number;
}

// ============================================================================
// PhotoDNA Client
// ============================================================================

/**
 * Scan image with PhotoDNA hash matching
 *
 * Sends the image to Microsoft's PhotoDNA Cloud Service for hash-based
 * matching against the NCMEC database of known CSAM.
 *
 * @param image - Image data as Uint8Array or base64 string
 * @param mimeType - MIME type of the image
 * @param options - PhotoDNA API options
 * @returns PhotoDNA scan result
 * @throws PetalError if the scan fails
 */
export async function scanWithPhotoDNA(
  image: Uint8Array | string,
  mimeType: string,
  options: PhotoDNAScanOptions,
): Promise<PhotoDNAResult> {
  const { subscriptionKey, timeoutMs = PHOTODNA_CONFIG.timeoutMs } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Convert to base64 if needed
    const base64Image =
      typeof image === "string" ? image : uint8ArrayToBase64(image);

    // PhotoDNA expects the image in the request body
    const requestBody = {
      DataRepresentation: "Base64",
      Value: base64Image,
    };

    const response = await fetch(
      `${PHOTODNA_CONFIG.endpoint}/v1.0/Match?enhance=true`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Ocp-Apim-Subscription-Key": subscriptionKey,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      // Log error details server-side
      const errorText = await response.text().catch(() => "Unknown error");
      console.error("[Petal] PhotoDNA API error:", {
        status: response.status,
        error: errorText.substring(0, 500),
      });

      throw new PetalError(
        "PhotoDNA service temporarily unavailable",
        "PHOTODNA_ERROR",
        "layer1",
        "photodna",
      );
    }

    const data = (await response.json()) as PhotoDNAMatchResponse;

    // Check for match
    if (data.isMatch) {
      return {
        safe: false,
        matched: true,
        confidence: data.matchConfidence,
        trackingId: data.trackingId,
        provider: "photodna",
      };
    }

    return {
      safe: true,
      matched: false,
      trackingId: data.trackingId,
      provider: "photodna",
    };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new PetalError(
        "PhotoDNA request timed out",
        "PHOTODNA_TIMEOUT",
        "layer1",
        "photodna",
      );
    }

    if (err instanceof PetalError) {
      throw err;
    }

    // Log unexpected errors server-side
    console.error("[Petal] PhotoDNA unexpected error:", err);
    throw new PetalError(
      "PhotoDNA scan failed",
      "PHOTODNA_ERROR",
      "layer1",
      "photodna",
      err,
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Check if PhotoDNA is available (subscription key configured)
 */
export function isPhotoDNAAvailable(subscriptionKey?: string): boolean {
  return Boolean(subscriptionKey && subscriptionKey.length > 0);
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Convert Uint8Array to base64 string
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// ============================================================================
// Mock Fixtures (for testing)
// ============================================================================

/**
 * Mock PhotoDNA response for clean image (no match)
 */
export const MOCK_PHOTODNA_CLEAN: PhotoDNAMatchResponse = {
  isMatch: false,
  trackingId: "mock-tracking-id-clean",
  status: {
    code: 3000,
    description: "OK",
  },
};

/**
 * Mock PhotoDNA response for matched image (CSAM detected)
 */
export const MOCK_PHOTODNA_MATCH: PhotoDNAMatchResponse = {
  isMatch: true,
  matchConfidence: 95,
  trackingId: "mock-tracking-id-match",
  status: {
    code: 3000,
    description: "OK",
  },
};

/**
 * Create a mock PhotoDNA scan function for testing
 */
export function createMockPhotoDNAScan(
  response: PhotoDNAMatchResponse,
): typeof scanWithPhotoDNA {
  return async () => ({
    safe: !response.isMatch,
    matched: response.isMatch,
    confidence: response.matchConfidence,
    trackingId: response.trackingId,
    provider: "photodna" as const,
  });
}
