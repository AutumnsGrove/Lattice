import { json, error } from "@sveltejs/kit";
import { createThreshold } from "@autumnsgrove/lattice/platform/threshold/factory";
import { thresholdCheck } from "@autumnsgrove/lattice/platform/threshold/sveltekit";
import type { RequestHandler } from "./$types";
import { getVerifiedTenantId } from "@autumnsgrove/lattice/auth/session";
import { checkFeatureAccess } from "@autumnsgrove/lattice/server/billing";
import { validateEnv } from "@autumnsgrove/lattice/server/env-validation";
import { API_ERRORS, logGroveError, throwGroveError } from "@autumnsgrove/lattice/errors";
import { createLumenClient } from "@autumnsgrove/lattice/ai/lumen";
import { LumenError } from "@autumnsgrove/lattice/ai/lumen/errors";

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
	const envValidation = validateEnv(platform?.env, ["DB", "OPENROUTER_API_KEY", "CACHE_KV"]);
	if (!envValidation.valid) {
		console.error(`[AI Analyze] ${envValidation.message}`);
		throwGroveError(503, API_ERRORS.AI_SERVICE_NOT_CONFIGURED, "API");
	}

	// Safe to access after validation (non-null assertion is safe here)
	const db = platform!.env!.DB;
	const openrouterApiKey = platform!.env!.OPENROUTER_API_KEY as string;

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
		const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/avif"];
		if (!allowedTypes.includes(file.type)) {
			throwGroveError(400, API_ERRORS.INVALID_FILE, "API", {
				detail: "unsupported file type for analysis",
			});
		}

		// Convert file to base64
		const arrayBuffer = await file.arrayBuffer();
		const base64 = btoa(
			new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ""),
		);

		// Call Lumen AI gateway with image task
		const lumen = createLumenClient({
			openrouterApiKey,
			ai: platform?.env?.AI,
			db,
		});

		const promptText = `Analyze this image and provide:
1. A short, descriptive filename (lowercase, hyphens instead of spaces, no extension, max 50 chars). Be specific and descriptive about the actual content.
2. A brief description (1-2 sentences) suitable for a caption.
3. Alt text for accessibility (concise but descriptive, suitable for screen readers).

Respond in this exact JSON format only, no other text:
{"filename": "example-filename", "description": "A brief description.", "altText": "Descriptive alt text for the image."}`;

		let textContent: string;
		try {
			const response = await lumen.run({
				task: "image",
				input: [
					{
						role: "user",
						content: [
							{ type: "text", text: promptText },
							{
								type: "image_url",
								image_url: { url: `data:${file.type};base64,${base64}` },
							},
						],
					},
				],
				tenant: locals.tenantId,
				options: {
					maxTokens: 300,
					temperature: 0.1,
				},
			});

			textContent = response.content;
		} catch (err) {
			if (err instanceof LumenError && err.code === "PROVIDER_TIMEOUT") {
				throwGroveError(504, API_ERRORS.AI_TIMEOUT, "API");
			}
			if (err instanceof LumenError) {
				console.error("[AI Analyze] Lumen error:", err.code, err.message);
				throwGroveError(500, API_ERRORS.UPSTREAM_ERROR, "API", {
					detail: "AI gateway returned error",
				});
			}
			throw err;
		}

		if (!textContent) {
			throwGroveError(500, API_ERRORS.UPSTREAM_ERROR, "API", {
				detail: "empty AI response",
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
