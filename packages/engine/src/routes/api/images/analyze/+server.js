import { json, error } from "@sveltejs/kit";
import { validateCSRF } from "$lib/utils/csrf.js";

/**
 * AI Image Analysis Endpoint
 * Uses Claude's vision API to generate smart filenames, descriptions, and alt text
 */
export async function POST({ request, platform, locals }) {
  // Authentication check
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }

  // CSRF check
  if (!validateCSRF(request)) {
    throw error(403, "Invalid origin");
  }

  // Check for API key
  const apiKey = platform?.env?.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw error(500, "AI analysis not configured - ANTHROPIC_API_KEY not set");
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
        ""
      )
    );

    // Determine media type for Claude API
    const mediaType = file.type;

    // Call Claude API with vision
    const response = await fetch("https://api.anthropic.com/v1/messages", {
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
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Claude API error:", errorData);
      throw error(500, "AI analysis failed");
    }

    const result = await response.json();

    // Extract the text content from Claude's response
    const textContent = result.content?.find((c) => c.type === "text")?.text;
    if (!textContent) {
      throw error(500, "Invalid AI response format");
    }

    // Parse the JSON response
    let analysis;
    try {
      // Try to extract JSON from the response (in case Claude adds extra text)
      const jsonMatch = textContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
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
    if (err.status) throw err;
    console.error("Analysis error:", err);
    throw error(500, "Failed to analyze image");
  }
}
