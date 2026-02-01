import { json, error } from "@sveltejs/kit";
import { validateCSRF } from "$lib/utils/csrf.js";
import {
  checkRateLimit,
  buildRateLimitKey,
  rateLimitHeaders,
} from "$lib/server/rate-limits/middleware.js";
import type { RequestHandler } from "./$types";
import { getVerifiedTenantId } from "$lib/auth/session.js";
import { checkFeatureAccess } from "$lib/server/billing.js";
import { validateEnv } from "$lib/server/env-validation.js";

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
    throw error(401, "Unauthorized");
  }

  // Tenant check (CRITICAL for security)
  if (!locals.tenantId) {
    throw error(403, "Tenant context required");
  }

  // CSRF check
  if (!validateCSRF(request)) {
    throw error(403, "Invalid origin");
  }

  // Validate required environment variables (fail-fast with actionable errors)
  const envValidation = validateEnv(platform?.env, [
    "DB",
    "ANTHROPIC_API_KEY",
    "CACHE_KV",
  ]);
  if (!envValidation.valid) {
    console.error(`[AI Analyze] ${envValidation.message}`);
    throw error(503, "AI analysis service temporarily unavailable");
  }

  // Safe to access after validation (non-null assertion is safe here)
  const db = platform!.env!.DB;
  const apiKey = platform!.env!.ANTHROPIC_API_KEY as string;
  const kv = platform!.env!.CACHE_KV;

  // Verify tenant ownership
  try {
    await getVerifiedTenantId(db, locals.tenantId, locals.user);
  } catch (err) {
    throw err;
  }

  // Check subscription access to AI features
  const featureCheck = await checkFeatureAccess(db, locals.tenantId, "ai");
  if (!featureCheck.allowed) {
    throw error(
      403,
      featureCheck.reason || "AI features require an active subscription",
    );
  }

  // Rate limit expensive AI operations (fail-closed - already validated above)
  const { result, response } = await checkRateLimit({
    kv,
    key: buildRateLimitKey("ai/analyze", locals.user.id),
    limit: 20,
    windowSeconds: 86400, // 24 hours
    namespace: "ai-ratelimit",
  });

  if (response) {
    return new Response(
      JSON.stringify({
        error: "rate_limited",
        message: "Daily AI analysis limit reached. Limit resets in 24 hours.",
        remaining: 0,
        resetAt: new Date(result.resetAt * 1000).toISOString(),
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          ...rateLimitHeaders(result, 20),
        },
      },
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      throw error(400, "No file provided");
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      throw error(400, "Invalid file type for analysis");
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
        throw error(504, "AI analysis timed out - please try again");
      }
      throw err;
    }
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Claude API error:", errorData);
      throw error(500, "AI analysis failed");
    }

    const result = (await response.json()) as ClaudeResponse;

    // Extract the text content from Claude's response
    const textContent = result.content?.find((c) => c.type === "text")?.text;
    if (!textContent) {
      throw error(500, "Invalid AI response format");
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
    console.error("Analysis error:", err);
    throw error(500, "Failed to analyze image");
  }
};
