import { json, error } from "@sveltejs/kit";
import { createThreshold } from "$lib/threshold/factory.js";
import { thresholdCheck } from "$lib/threshold/adapters/sveltekit.js";
import type { RequestHandler } from "./$types";
import { getVerifiedTenantId } from "$lib/auth/session.js";
import { checkFeatureAccess } from "$lib/server/billing.js";
import { validateEnv } from "$lib/server/env-validation.js";
import { API_ERRORS, logGroveError, throwGroveError } from "$lib/errors";

interface ClaudeContentBlock {
  type: string;
  text?: string;
}

interface ClaudeResponse {
  content?: ClaudeContentBlock[];
}

interface AnalysisResult {
  filename: string;
  description: string;
  altText: string;
}

/**
 * AI Image Analysis Endpoint
 * Uses Claude's vision API to generate smart filenames, descriptions, and alt text
 */
export const POST: RequestHandler = async ({ request, platform, locals }) => {
  // Authentication check
  if (!locals.user) {
    throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
  }

  // Tenant check (CRITICAL for security)
  if (!locals.tenantId) {
    throwGroveError(403, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
  }

  // Validate required environment variables (fail-fast with actionable errors)
  const envValidation = validateEnv(platform?.env, [
    "DB",
    "ANTHROPIC_API_KEY",
    "CACHE_KV",
  ]);
  if (!envValidation.valid) {
    console.error(`[AI Analyze] ${envValidation.message}`);
    throwGroveError(503, API_ERRORS.AI_SERVICE_NOT_CONFIGURED, "API");
  }

  // Safe to access after validation (non-null assertion is safe here)
  const db = platform!.env!.DB;
  const apiKey = platform!.env!.ANTHROPIC_API_KEY as string;

  // Verify tenant ownership
  try {
    await getVerifiedTenantId(db, locals.tenantId, locals.user);
  } catch (err) {
    throw err;
  }

  // Check subscription access to AI features
  const featureCheck = await checkFeatureAccess(db, locals.tenantId, "ai");
  if (!featureCheck.allowed) {
    throwGroveError(403, API_ERRORS.SUBSCRIPTION_REQUIRED, "API", {
      detail: featureCheck.reason || "AI features require active subscription",
    });
  }

  // Rate limit expensive AI operations (fail-closed - already validated above)
  const threshold = createThreshold(platform?.env, {
    identifier: locals.user?.id,
  });
  if (threshold) {
    const denied = await thresholdCheck(threshold, {
      key: `ai/analyze:${locals.user.id}`,
      limit: 20,
      windowSeconds: 86400, // 24 hours
    });

    if (denied) {
      return denied;
    }
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      throwGroveError(400, API_ERRORS.INVALID_REQUEST_BODY, "API", {
        detail: "file required",
      });
    }

    // Validate file type
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/jxl",
      "image/avif",
    ];
    if (!allowedTypes.includes(file.type)) {
      throwGroveError(400, API_ERRORS.INVALID_FILE, "API", {
        detail: "unsupported file type for analysis",
      });
    }

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        "",
      ),
    );

    // Determine media type for Claude API
    const mediaType = file.type;

    // Call Claude API with vision (30s timeout to prevent hanging requests)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    let response: Response;
    try {
      response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 300,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: mediaType,
                    data: base64,
                  },
                },
                {
                  type: "text",
                  text: `Analyze this image and provide:
1. A short, descriptive filename (lowercase, hyphens instead of spaces, no extension, max 50 chars). Be specific and descriptive about the actual content.
2. A brief description (1-2 sentences) suitable for a caption.
3. Alt text for accessibility (concise but descriptive, suitable for screen readers).

Respond in this exact JSON format only, no other text:
{"filename": "example-filename", "description": "A brief description.", "altText": "Descriptive alt text for the image."}`,
                },
              ],
            },
          ],
        }),
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timeoutId);
      if ((err as Error).name === "AbortError") {
        throwGroveError(504, API_ERRORS.AI_TIMEOUT, "API");
      }
      throw err;
    }
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Claude API error:", errorData);
      throwGroveError(500, API_ERRORS.UPSTREAM_ERROR, "API", {
        detail: "Claude API returned error",
      });
    }

    const result = (await response.json()) as ClaudeResponse;

    // Extract the text content from Claude's response
    const textContent = result.content?.find((c) => c.type === "text")?.text;
    if (!textContent) {
      throwGroveError(500, API_ERRORS.UPSTREAM_ERROR, "API", {
        detail: "invalid Claude response format",
      });
    }

    // Parse the JSON response
    let analysis: AnalysisResult;
    try {
      // Try to extract JSON from the response (in case Claude adds extra text)
      const jsonMatch = textContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]) as AnalysisResult;
      } else {
        throw new Error("No JSON found in response");
      }
    } catch {
      console.error("Failed to parse AI response:", textContent);
      // Fallback to basic extraction
      analysis = {
        filename: "image",
        description: "An uploaded image.",
        altText: "Image",
      };
    }

    // Sanitize the filename
    const sanitizedFilename = analysis.filename
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .substring(0, 50);

    return json({
      success: true,
      filename: sanitizedFilename || "image",
      description: analysis.description || "An uploaded image.",
      altText: analysis.altText || "Image",
    });
  } catch (err) {
    if (err instanceof Error && "status" in err) throw err;
    logGroveError("API", API_ERRORS.OPERATION_FAILED, { cause: err });
    throw error(500, API_ERRORS.OPERATION_FAILED.userMessage);
  }
};
