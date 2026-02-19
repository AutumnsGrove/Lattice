/**
 * Petal Classification via Lumen
 *
 * Replaces the direct vision-client classification path with Lumen's unified
 * `image` task. Benefits: unified quota tracking, fallback chains (Gemini Flash
 * → Claude Haiku → CF Llama 4 Scout), PII scrubbing on prompts.
 *
 * CSAM/Layer1 detection remains on the direct vision-client path — it's legally
 * mandated and must never depend on a disableable gateway.
 *
 * @see docs/specs/petal-spec.md
 */

import type { LumenClient } from "$lib/lumen/index.js";
import { CLASSIFICATION_PROMPT } from "$lib/config/petal.js";
import type { ClassificationResult, PetalCategory } from "./types.js";

// =============================================================================
// CONSTANTS
// =============================================================================

/** Supported image MIME types for classification */
const VALID_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
]);

/**
 * Maximum image size in bytes (8MB).
 * Cloudflare Workers have a 10MB request body limit — leave headroom for
 * the base64 overhead (~33%) and the rest of the request payload.
 */
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/**
 * Classify an image using Lumen's image task.
 *
 * Converts the image to a base64 data URI and sends it through Lumen's
 * vision-capable model chain (Gemini Flash → Claude Haiku → CF Llama 4 Scout).
 *
 * @param image - Image data as base64 string or Uint8Array
 * @param mimeType - MIME type (e.g., "image/jpeg", "image/png")
 * @param lumen - Configured LumenClient instance
 * @param tenant - Tenant ID for quota tracking (optional)
 */
export async function classifyWithLumen(
  image: string | Uint8Array,
  mimeType: string,
  lumen: LumenClient,
  tenant?: string,
): Promise<ClassificationResult> {
  // Validate image input
  validateImageInput(image, mimeType);

  // Convert to base64 data URI
  const base64 = imageToBase64(image);
  const dataUri = `data:${mimeType};base64,${base64}`;

  const response = await lumen.run({
    task: "image",
    input: [
      {
        role: "user",
        content: [
          { type: "text", text: CLASSIFICATION_PROMPT },
          { type: "image_url", image_url: { url: dataUri } },
        ],
      },
    ],
    tenant,
    options: {
      maxTokens: 100,
      temperature: 0.1,
      // Safe to skip: CLASSIFICATION_PROMPT is a static template with no user input.
      // Only the image itself (binary data) is user-provided, and PII scrubbing
      // doesn't apply to image content parts.
      skipPiiScrub: true,
    },
  });

  // Parse JSON response
  try {
    const jsonMatch = response.content.match(/\{[^}]+\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      category: string;
      confidence: number;
    };

    const category = parsed.category as PetalCategory;
    const confidence = Math.max(0, Math.min(1, parsed.confidence || 0));

    return {
      category,
      confidence,
      decision: "allow", // Will be set by layer logic
      model: response.model,
      provider: response.provider,
    };
  } catch {
    // If parsing fails, assume appropriate (fail-open for classification)
    console.warn(
      "[Petal/Lumen] Failed to parse classification response:",
      response.content.substring(0, 200),
    );
    return {
      category: "appropriate",
      confidence: 0.5,
      decision: "allow",
      reason: "Classification parse error - defaulting to allow",
      model: response.model,
      provider: response.provider,
    };
  }
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validate image input before sending to Lumen.
 * Throws descriptive errors for invalid data to prevent confusing provider errors.
 */
function validateImageInput(
  image: string | Uint8Array,
  mimeType: string,
): void {
  // Check MIME type
  if (!VALID_IMAGE_TYPES.has(mimeType)) {
    throw new Error(
      `[Petal] Unsupported image type "${mimeType}". ` +
        `Supported: ${[...VALID_IMAGE_TYPES].join(", ")}`,
    );
  }

  // Check for empty image data
  if (typeof image === "string") {
    if (image.length === 0) {
      throw new Error("[Petal] Empty image data (base64 string is empty)");
    }
  } else {
    if (image.length === 0) {
      throw new Error("[Petal] Empty image data (Uint8Array is empty)");
    }
    if (image.length > MAX_IMAGE_BYTES) {
      throw new Error(
        `[Petal] Image too large (${(image.length / 1024 / 1024).toFixed(1)}MB). ` +
          `Maximum: ${MAX_IMAGE_BYTES / 1024 / 1024}MB`,
      );
    }
  }
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Convert image to base64 string.
 * Uses manual conversion for Cloudflare Workers compatibility (no Buffer.from).
 */
function imageToBase64(image: string | Uint8Array): string {
  if (typeof image === "string") {
    return image; // Already base64
  }
  let binary = "";
  for (let i = 0; i < image.length; i++) {
    binary += String.fromCharCode(image[i]);
  }
  return btoa(binary);
}
