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
      skipPiiScrub: true, // Image classification prompts don't contain user PII
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

/**
 * Convert image to base64 string
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
