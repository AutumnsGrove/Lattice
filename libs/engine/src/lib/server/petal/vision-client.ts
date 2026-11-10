/**
 * Petal Vision Client - Image Analysis with Provider Fallback
 *
 * Vision inference client for content moderation. Primary path is OpenRouter
 * (Claude Haiku 5.5 → Gemma 4 26B), with Cloudflare Workers AI and
 * Together.ai as fallbacks.
 *
 * @see docs/specs/petal-spec.md
 */

import {
	PETAL_PROVIDERS,
	PETAL_PROVIDER_CASCADE,
	FAILOVER_CONFIG,
	CLASSIFICATION_PROMPT,
	SANITY_CHECK_PROMPT,
} from "$lib/platform/config/petal.js";
import { logGroveError } from "@autumnsgrove/grove-errors";
import {
	PetalError,
	type PetalProviderConfig,
	type PetalProviderHealth,
	type ClassificationResult,
	type PetalCategory,
} from "./types.js";
import { safeParseJson } from "../../utils/json.js";
import { PETAL_ERRORS } from "./errors.js";

// ============================================================================
// Types
// ============================================================================

interface VisionRequest {
	/** Image as base64 or Uint8Array */
	image: string | Uint8Array;
	/** MIME type of image */
	mimeType: string;
	/** Prompt for the model */
	prompt: string;
	/** Max output tokens */
	maxTokens?: number;
}

interface VisionResponse {
	/** Raw text response from model */
	content: string;
	/** Model used */
	model: string;
	/** Provider used */
	provider: string;
}

interface ProviderError {
	provider: string;
	model: string;
	error: string;
}

// ============================================================================
// Provider Health Management
// ============================================================================
//
// CIRCUIT BREAKER LIMITATIONS:
// ─────────────────────────────────────────────────────────────────────────────
// The circuit breaker state is stored in-memory per Worker isolate, which means:
//
// 1. State is NOT shared across isolates - each isolate has independent state
// 2. State is lost on cold starts/restarts - providers reset to healthy
// 3. Multiple isolates may independently fail the same provider
// 4. No coordination across the fleet for distributed circuit breaking
//
// This is acceptable for our use case because:
// - Provider failures are typically transient (network issues, rate limits)
// - The retry/failover logic handles individual request failures
// - False positives (resetting circuit too early) just mean extra retries
//
// For high-scale production, consider storing state in KV or Durable Objects
// to enable coordinated circuit breaking across all Workers.
// ─────────────────────────────────────────────────────────────────────────────

// In-memory provider health tracking (per-isolate)
// See limitations above
const providerHealth: Map<string, PetalProviderHealth> = new Map();

/**
 * Get current health status for a provider
 */
function getProviderHealth(providerKey: string): PetalProviderHealth {
	const existing = providerHealth.get(providerKey);
	if (existing) return existing;

	// Default healthy state
	const health: PetalProviderHealth = {
		provider: providerKey,
		healthy: true,
		lastCheck: new Date(),
		consecutiveFailures: 0,
		circuitOpen: false,
	};
	providerHealth.set(providerKey, health);
	return health;
}

/**
 * Update provider health after success/failure
 */
function updateProviderHealth(providerKey: string, update: Partial<PetalProviderHealth>): void {
	const health = getProviderHealth(providerKey);
	Object.assign(health, update, { lastCheck: new Date() });
	providerHealth.set(providerKey, health);
}

/**
 * Check if circuit should be reset (enough time has passed)
 */
function shouldResetCircuit(health: PetalProviderHealth): boolean {
	if (!health.circuitOpen) return false;
	const timeSinceOpen = Date.now() - health.lastCheck.getTime();
	return timeSinceOpen > FAILOVER_CONFIG.circuitResetMs;
}

// ============================================================================
// Image Encoding
// ============================================================================

/**
 * Convert image to base64 for API calls
 */
function imageToBase64(image: string | Uint8Array): string {
	if (typeof image === "string") {
		// Already base64
		return image;
	}
	// Convert Uint8Array to base64
	let binary = "";
	const bytes = image;
	for (let i = 0; i < bytes.length; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary);
}

/**
 * Get data URI for image
 */
function getImageDataUri(image: string | Uint8Array, mimeType: string): string {
	const base64 = imageToBase64(image);
	return `data:${mimeType};base64,${base64}`;
}

// ============================================================================
// Workers AI Provider
// ============================================================================

/**
 * Call Cloudflare Workers AI with vision model
 */
async function callWorkersAI(
	ai: Ai,
	model: string,
	request: VisionRequest,
	timeoutMs: number,
): Promise<VisionResponse> {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

	try {
		const imageDataUri = getImageDataUri(request.image, request.mimeType);

		// Workers AI vision models use a messages format
		const response = await ai.run(model as Parameters<typeof ai.run>[0], {
			messages: [
				{
					role: "user",
					content: [
						{
							type: "text",
							text: request.prompt,
						},
						{
							type: "image_url",
							image_url: {
								url: imageDataUri,
							},
						},
					],
				},
			],
			max_tokens: request.maxTokens || 256,
		});

		// Extract content from response
		const content =
			typeof response === "string"
				? response
				: (response as { response?: string }).response || JSON.stringify(response);

		return {
			content,
			model,
			provider: "workers_ai",
		};
	} catch (err) {
		if (err instanceof Error && err.name === "AbortError") {
			throw new PetalError("Vision provider request timed out", "TIMEOUT", undefined, "workers_ai");
		}
		// Log full error server-side for debugging
		logGroveError("Petal", PETAL_ERRORS.WORKERS_AI_ERROR, { model, cause: err });
		throw new PetalError(
			"Vision provider temporarily unavailable",
			"PROVIDER_ERROR",
			undefined,
			"workers_ai",
			// Don't include error details to prevent information disclosure
		);
	} finally {
		clearTimeout(timeoutId);
	}
}

// ============================================================================
// External API Provider (OpenRouter)
// ============================================================================

/**
 * Call OpenRouter API for vision
 */
async function callOpenRouter(
	apiKey: string,
	model: string,
	request: VisionRequest,
	timeoutMs: number,
): Promise<VisionResponse> {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

	try {
		const imageDataUri = getImageDataUri(request.image, request.mimeType);

		const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${apiKey}`,
			},
			body: JSON.stringify({
				model,
				messages: [
					{
						role: "user",
						content: [
							{ type: "text", text: request.prompt },
							{ type: "image_url", image_url: { url: imageDataUri } },
						],
					},
				],
				max_tokens: request.maxTokens || 256,
				temperature: 0.1,
			}),
			signal: controller.signal,
		});

		if (!response.ok) {
			const errorText = await response.text().catch(() => "Unknown error");
			logGroveError("Petal", PETAL_ERRORS.OPENROUTER_API_ERROR, {
				status: response.status,
				detail: errorText.substring(0, 500),
				model,
			});
			throw new PetalError(
				"Vision provider temporarily unavailable",
				"PROVIDER_ERROR",
				undefined,
				"openrouter",
			);
		}

		const data = (await response.json()) as {
			choices?: Array<{ message?: { content?: string } }>;
		};

		const content = data.choices?.[0]?.message?.content || "";

		return {
			content,
			model,
			provider: "openrouter",
		};
	} catch (err) {
		if (err instanceof Error && err.name === "AbortError") {
			throw new PetalError("Vision provider request timed out", "TIMEOUT", undefined, "openrouter");
		}
		if (err instanceof PetalError) throw err;
		logGroveError("Petal", PETAL_ERRORS.OPENROUTER_UNEXPECTED, { model, cause: err });
		throw new PetalError("OpenRouter provider error", "PROVIDER_ERROR", undefined, "openrouter");
	} finally {
		clearTimeout(timeoutId);
	}
}

// ============================================================================
// External API Provider (Together.ai)
// ============================================================================

/**
 * Call Together.ai API for vision
 */
async function callTogetherAI(
	apiKey: string,
	model: string,
	request: VisionRequest,
	timeoutMs: number,
): Promise<VisionResponse> {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

	try {
		const imageDataUri = getImageDataUri(request.image, request.mimeType);

		const response = await fetch("https://api.together.xyz/v1/chat/completions", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${apiKey}`,
				"X-Data-Retention": "none", // ZDR header
			},
			body: JSON.stringify({
				model,
				messages: [
					{
						role: "user",
						content: [
							{ type: "text", text: request.prompt },
							{ type: "image_url", image_url: { url: imageDataUri } },
						],
					},
				],
				max_tokens: request.maxTokens || 256,
				temperature: 0.1,
			}),
			signal: controller.signal,
		});

		if (!response.ok) {
			// Log full error server-side for debugging, but don't include in thrown error
			// to prevent information disclosure
			const errorText = await response.text().catch(() => "Unknown error");
			logGroveError("Petal", PETAL_ERRORS.TOGETHER_API_ERROR, {
				status: response.status,
				detail: errorText.substring(0, 500),
				model,
			});
			throw new PetalError(
				"Vision provider temporarily unavailable",
				"PROVIDER_ERROR",
				undefined,
				"together_ai",
				// Don't include status code or error details to prevent information disclosure
			);
		}

		const data = (await response.json()) as {
			choices?: Array<{ message?: { content?: string } }>;
		};

		const content = data.choices?.[0]?.message?.content || "";

		return {
			content,
			model,
			provider: "together_ai",
		};
	} catch (err) {
		if (err instanceof Error && err.name === "AbortError") {
			throw new PetalError(
				"Vision provider request timed out",
				"TIMEOUT",
				undefined,
				"together_ai",
			);
		}
		if (err instanceof PetalError) throw err;
		// Log full error server-side, but don't include in thrown error
		logGroveError("Petal", PETAL_ERRORS.TOGETHER_UNEXPECTED, { model, cause: err });
		throw new PetalError(
			"Together.ai provider error",
			"PROVIDER_ERROR",
			undefined,
			"together_ai",
			// Don't include error details to prevent information disclosure
		);
	} finally {
		clearTimeout(timeoutId);
	}
}

// ============================================================================
// Main Vision Client
// ============================================================================

interface VisionClientOptions {
	/** Workers AI binding (primary) */
	ai?: Ai;
	/** OpenRouter API key (fallback) */
	openRouterApiKey?: string;
	/** Together.ai API key (dead-last fallback) */
	togetherApiKey?: string;
}

/**
 * Call vision model with automatic provider fallback
 */
export async function callVisionModel(
	request: VisionRequest,
	options: VisionClientOptions,
): Promise<VisionResponse> {
	const errors: ProviderError[] = [];

	// Try each provider in the cascade
	for (const providerKey of PETAL_PROVIDER_CASCADE) {
		const config = PETAL_PROVIDERS[providerKey];
		if (!config) continue;

		const health = getProviderHealth(providerKey);

		// Check circuit breaker
		if (health.circuitOpen) {
			if (shouldResetCircuit(health)) {
				// Reset and try again
				updateProviderHealth(providerKey, {
					circuitOpen: false,
					consecutiveFailures: 0,
				});
			} else {
				// Skip this provider
				continue;
			}
		}

		try {
			let response: VisionResponse;

			if (config.type === "workers_ai") {
				if (!options.ai) {
					continue; // Workers AI not available
				}
				response = await callWorkersAI(options.ai, config.model, request, config.timeoutMs);
			} else if (config.type === "external_api" && providerKey.startsWith("openrouter")) {
				if (!options.openRouterApiKey) {
					continue; // API key not available
				}
				response = await callOpenRouter(
					options.openRouterApiKey,
					config.model,
					request,
					config.timeoutMs,
				);
			} else if (config.type === "external_api" && providerKey === "together_ai") {
				if (!options.togetherApiKey) {
					continue; // API key not available
				}
				response = await callTogetherAI(
					options.togetherApiKey,
					config.model,
					request,
					config.timeoutMs,
				);
			} else {
				continue; // Unknown provider type
			}

			// Success - reset failure count
			updateProviderHealth(providerKey, {
				consecutiveFailures: 0,
				healthy: true,
			});

			return response;
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : "Unknown error";
			errors.push({
				provider: providerKey,
				model: config.model,
				error: errorMessage,
			});

			// Update health status
			const newFailures = health.consecutiveFailures + 1;
			updateProviderHealth(providerKey, {
				consecutiveFailures: newFailures,
				circuitOpen: newFailures >= FAILOVER_CONFIG.failureThreshold,
				healthy: false,
			});

			// Continue to next provider
		}
	}

	// All providers failed
	const attemptedProviders = errors.map((e) => `${e.provider}/${e.model}: ${e.error}`).join("; ");

	throw new PetalError(
		`All vision providers failed. Attempted: ${attemptedProviders}`,
		"ALL_PROVIDERS_FAILED",
		undefined,
		undefined,
		errors,
	);
}

// ============================================================================
// High-Level Functions
// ============================================================================

/**
 * Classify image content against Petal categories
 */
export async function classifyImage(
	image: string | Uint8Array,
	mimeType: string,
	options: VisionClientOptions,
): Promise<ClassificationResult> {
	const response = await callVisionModel(
		{
			image,
			mimeType,
			prompt: CLASSIFICATION_PROMPT,
			maxTokens: 100,
		},
		options,
	);

	// Parse JSON response
	try {
		// Extract JSON from response (may have surrounding text)
		// Use a more robust approach: find opening { and parse from there
		let content = response.content;
		// Some models return JSON without opening brace — fix up before parsing
		if (content.indexOf("{") === -1 && content.indexOf("}") !== -1) {
			content = "{" + content;
		}
		const jsonStart = content.indexOf("{");
		if (jsonStart === -1) {
			throw new Error("No JSON found in response");
		}

		// Try to parse from the first { onwards, handling nested objects
		let depth = 0;
		let jsonEnd = jsonStart;
		for (let i = jsonStart; i < content.length; i++) {
			if (content[i] === "{") depth++;
			if (content[i] === "}") depth--;
			if (depth === 0) {
				jsonEnd = i + 1;
				break;
			}
		}

		if (depth !== 0) {
			throw new Error("Malformed JSON: unbalanced braces");
		}

		const jsonStr = content.substring(jsonStart, jsonEnd);
		const parsed = safeParseJson<{
			category: string;
			confidence: number;
		} | null>(jsonStr, null);

		if (!parsed) {
			throw new Error("Failed to parse JSON");
		}

		const category = parsed.category as PetalCategory;
		const confidence = Math.max(0, Math.min(1, parsed.confidence || 0));

		return {
			category,
			confidence,
			decision: "allow", // Will be set by layer logic
			model: response.model,
			provider: response.provider,
		};
	} catch (parseError) {
		// If parsing fails, escalate to review rather than silently allowing
		logGroveError("Petal", PETAL_ERRORS.CLASSIFICATION_PARSE_FAILED, {
			detail: response.content.substring(0, 200),
			model: response.model,
			provider: response.provider,
		});
		return {
			category: "appropriate",
			confidence: 0,
			decision: "review",
			reason: "Classification parse error - escalating to review",
			model: response.model,
			provider: response.provider,
		};
	}
}

/**
 * Run sanity checks on image (for try-on context)
 */
export async function runSanityCheck(
	image: string | Uint8Array,
	mimeType: string,
	options: VisionClientOptions,
): Promise<{
	faceCount: number;
	isScreenshot: boolean;
	isMeme: boolean;
	isDrawing: boolean;
	quality: number;
}> {
	const response = await callVisionModel(
		{
			image,
			mimeType,
			prompt: SANITY_CHECK_PROMPT,
			maxTokens: 100,
		},
		options,
	);

	// Parse JSON response
	try {
		// Extract JSON from response (may have surrounding text)
		// Use a more robust approach: find opening { and parse from there
		let content = response.content;
		// Some models return JSON without opening brace — fix up before parsing
		if (content.indexOf("{") === -1 && content.indexOf("}") !== -1) {
			content = "{" + content;
		}
		const jsonStart = content.indexOf("{");
		if (jsonStart === -1) {
			throw new Error("No JSON found in response");
		}

		// Try to parse from the first { onwards, handling nested objects
		let depth = 0;
		let jsonEnd = jsonStart;
		for (let i = jsonStart; i < content.length; i++) {
			if (content[i] === "{") depth++;
			if (content[i] === "}") depth--;
			if (depth === 0) {
				jsonEnd = i + 1;
				break;
			}
		}

		if (depth !== 0) {
			throw new Error("Malformed JSON: unbalanced braces");
		}

		const jsonStr = content.substring(jsonStart, jsonEnd);
		const parsed = safeParseJson<{
			faceCount?: number;
			isScreenshot?: boolean;
			isMeme?: boolean;
			isDrawing?: boolean;
			quality?: number;
		} | null>(jsonStr, null);

		if (!parsed) {
			throw new Error("Failed to parse JSON");
		}

		return {
			faceCount: parsed.faceCount ?? 0,
			isScreenshot: parsed.isScreenshot ?? false,
			isMeme: parsed.isMeme ?? false,
			isDrawing: parsed.isDrawing ?? false,
			quality: Math.max(0, Math.min(1, parsed.quality ?? 0.5)),
		};
	} catch (parseError) {
		// If parsing fails, return default values (fail-open for sanity)
		logGroveError("Petal", PETAL_ERRORS.SANITY_PARSE_FAILED, {
			detail: response.content.substring(0, 200),
			model: response.model,
			provider: response.provider,
		});
		return {
			faceCount: 1,
			isScreenshot: false,
			isMeme: false,
			isDrawing: false,
			quality: 0.5,
		};
	}
}

/**
 * Get current provider health status (for monitoring)
 */
export function getProviderHealthStatus(): PetalProviderHealth[] {
	return PETAL_PROVIDER_CASCADE.map((key) => getProviderHealth(key));
}

/**
 * Reset all provider health (for testing or manual intervention)
 */
export function resetProviderHealth(): void {
	providerHealth.clear();
}
