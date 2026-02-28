/**
 * Wisp - Grove Writing Assistant API
 *
 * POST /api/grove/wisp - Analyze content for grammar, tone, and readability
 * GET /api/grove/wisp - Get usage statistics
 *
 * @see docs/specs/writing-assistant-unified-spec.md
 */

import { json, error, type RequestHandler } from "@sveltejs/kit";
import { API_ERRORS, logGroveError } from "$lib/errors";
import {
	MAX_CONTENT_LENGTH,
	RATE_LIMIT,
	COST_CAP,
	PROMPT_MODES,
	getMaxTokens,
} from "$lib/config/wisp.js";
import { secureUserContent, stripMarkdown, smartTruncate } from "$lib/server/inference-client.js";
import { createLumenClient } from "$lib/lumen/index.js";
import { calculateReadability } from "$lib/utils/readability.js";
import { createThreshold } from "$lib/threshold/factory.js";
import { thresholdCheck } from "$lib/threshold/adapters/sveltekit.js";
import { checkFeatureAccess } from "$lib/server/billing.js";

interface SettingsRow {
	setting_value: string;
}

export const prerender = false;

// ============================================================================
// POST - Analyze Content
// ============================================================================

export const POST: RequestHandler = async ({ request, platform, locals }) => {
	// Authentication check
	if (!locals.user) {
		return json(
			{
				error: API_ERRORS.UNAUTHORIZED.userMessage,
				error_code: API_ERRORS.UNAUTHORIZED.code,
			},
			{ status: 401 },
		);
	}

	const db = platform?.env?.DB;

	// Guard checks are intentionally sequential: if Wisp is disabled (common during
	// onboarding), skip the subscription check entirely to avoid a wasted D1 query.
	if (db && locals.tenantId) {
		try {
			const settings = await db
				.prepare(
					"SELECT setting_value FROM tenant_settings WHERE tenant_id = ? AND setting_key = ?",
				)
				.bind(locals.tenantId, "wisp_enabled")
				.first<SettingsRow>();

			if (!settings || settings.setting_value !== "true") {
				return json({ error: "Wisp is disabled. Enable it in Settings." }, { status: 403 });
			}
		} catch {
			// If settings table doesn't exist, allow (for initial setup)
		}
	}

	// Check subscription access to AI features (after wisp_enabled, before request parsing)
	if (db && locals.tenantId) {
		const featureCheck = await checkFeatureAccess(db, locals.tenantId, "ai");
		if (!featureCheck.allowed) {
			return json(
				{
					error: featureCheck.reason || "AI features require an active subscription",
				},
				{ status: 403 },
			);
		}
	}

	// Parse request body
	let body: {
		content?: string;
		action?: string;
		mode?: "quick" | "thorough";
		context?: { slug?: string; title?: string } | null;
	};
	try {
		body = await request.json();
	} catch {
		return json(
			{
				error: API_ERRORS.INVALID_REQUEST_BODY.userMessage,
				error_code: API_ERRORS.INVALID_REQUEST_BODY.code,
			},
			{ status: 400 },
		);
	}

	const { content, action, mode = "quick", context } = body;

	// Validate content
	if (!content || typeof content !== "string") {
		return json(
			{
				error: API_ERRORS.MISSING_REQUIRED_FIELDS.userMessage,
				error_code: API_ERRORS.MISSING_REQUIRED_FIELDS.code,
			},
			{ status: 400 },
		);
	}

	if (content.length > MAX_CONTENT_LENGTH) {
		return json(
			{
				error: `Content too long. Maximum ${MAX_CONTENT_LENGTH.toLocaleString()} characters.`,
			},
			{ status: 400 },
		);
	}

	// Validate action
	const validActions = ["grammar", "tone", "readability", "all"];
	if (!action || !validActions.includes(action)) {
		return json(
			{
				error: API_ERRORS.INVALID_REQUEST_BODY.userMessage,
				error_code: API_ERRORS.INVALID_REQUEST_BODY.code,
			},
			{ status: 400 },
		);
	}

	// Validate mode
	if (!["quick", "thorough"].includes(mode)) {
		return json(
			{
				error: API_ERRORS.VALIDATION_FAILED.userMessage,
				error_code: API_ERRORS.VALIDATION_FAILED.code,
			},
			{ status: 400 },
		);
	}

	// Validate context object (if provided)
	if (context !== undefined) {
		if (context !== null && typeof context !== "object") {
			return json(
				{
					error: API_ERRORS.VALIDATION_FAILED.userMessage,
					error_code: API_ERRORS.VALIDATION_FAILED.code,
				},
				{ status: 400 },
			);
		}
		if (context?.slug !== undefined && typeof context.slug !== "string") {
			return json(
				{
					error: API_ERRORS.VALIDATION_FAILED.userMessage,
					error_code: API_ERRORS.VALIDATION_FAILED.code,
				},
				{ status: 400 },
			);
		}
		if (context?.title !== undefined && typeof context.title !== "string") {
			return json(
				{
					error: API_ERRORS.VALIDATION_FAILED.userMessage,
					error_code: API_ERRORS.VALIDATION_FAILED.code,
				},
				{ status: 400 },
			);
		}
	}

	// Rate limiting using Threshold (fail-closed to prevent cost overruns)
	const threshold = createThreshold(platform?.env, {
		identifier: locals.user?.id,
	});
	if (!threshold) {
		// Fail closed: AI operations are expensive, so we reject if we can't enforce limits
		logGroveError("API", API_ERRORS.SERVICE_UNAVAILABLE);
		return json(
			{
				error: API_ERRORS.SERVICE_UNAVAILABLE.userMessage,
				error_code: API_ERRORS.SERVICE_UNAVAILABLE.code,
			},
			{ status: 503 },
		);
	}

	const denied = await thresholdCheck(threshold, {
		key: `wisp:${locals.user.id}`,
		limit: RATE_LIMIT.maxRequestsPerHour,
		windowSeconds: RATE_LIMIT.windowSeconds,
		failMode: "closed",
	});

	if (denied) return denied; // 429 with proper headers

	// Monthly cost cap check (fail-closed: reject if we can't verify limits)
	if (db && COST_CAP.enabled) {
		// Use single Date instance to avoid edge case at month boundary
		const now = new Date();
		const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

		let usage: { monthly_cost: number } | null;
		try {
			usage = (await db
				.prepare(
					"SELECT COALESCE(SUM(cost), 0) as monthly_cost FROM wisp_requests WHERE user_id = ? AND created_at > ?",
				)
				.bind(locals.user.id, monthStart)
				.first()) as { monthly_cost: number } | null;
		} catch (err) {
			// Fail closed: reject request if we can't verify cost limits for safety
			logGroveError("API", API_ERRORS.SERVICE_UNAVAILABLE, { cause: err });
			return json(
				{
					error: API_ERRORS.SERVICE_UNAVAILABLE.userMessage,
					error_code: API_ERRORS.SERVICE_UNAVAILABLE.code,
				},
				{ status: 503 },
			);
		}

		if (usage && usage.monthly_cost >= COST_CAP.maxCostUSD) {
			return json(
				{
					error: `Monthly usage limit reached ($${COST_CAP.maxCostUSD.toFixed(2)}). Resets on the 1st.`,
				},
				{ status: 429 },
			);
		}
	}

	// Create Lumen client for AI inference
	const openrouterApiKey = platform?.env?.OPENROUTER_API_KEY;
	if (!openrouterApiKey && (action === "grammar" || action === "tone" || action === "all")) {
		return json(
			{
				error: API_ERRORS.AI_SERVICE_NOT_CONFIGURED.userMessage,
				error_code: API_ERRORS.AI_SERVICE_NOT_CONFIGURED.code,
			},
			{ status: 503 },
		);
	}

	const lumen = openrouterApiKey
		? createLumenClient({
				openrouterApiKey,
				ai: platform?.env?.AI,
				db,
			})
		: null;

	const result: {
		grammar?: unknown;
		tone?: unknown;
		readability?: unknown;
	} = {};
	const totalTokens = { input: 0, output: 0 };
	let totalCost = 0;
	let modelUsed: string | null = null;
	let providerUsed: string | null = null;

	try {
		// Prepare content for analysis
		const cleanContent = stripMarkdown(content);
		const truncatedContent = smartTruncate(cleanContent);

		// Grammar analysis (AI-powered via Lumen)
		if ((action === "grammar" || action === "all") && lumen) {
			const grammarResult = await analyzeGrammar(truncatedContent, mode, lumen);
			result.grammar = grammarResult.result;
			totalTokens.input += grammarResult.usage.input;
			totalTokens.output += grammarResult.usage.output;
			totalCost += grammarResult.usage.cost;
			modelUsed = grammarResult.model;
			providerUsed = grammarResult.provider;
		}

		// Tone analysis (AI-powered via Lumen)
		if ((action === "tone" || action === "all") && lumen) {
			const toneResult = await analyzeTone(truncatedContent, mode, lumen, context);
			result.tone = toneResult.result;
			totalTokens.input += toneResult.usage.input;
			totalTokens.output += toneResult.usage.output;
			totalCost += toneResult.usage.cost;
			modelUsed = modelUsed || toneResult.model;
			providerUsed = providerUsed || toneResult.provider;
		}

		// Readability (local calculation - no AI)
		if (action === "readability" || action === "all") {
			result.readability = calculateReadability(content);
		}

		const cost = totalCost;

		// Log usage to database
		if (db) {
			try {
				await db
					.prepare(
						`
						INSERT INTO wisp_requests (user_id, action, mode, model, provider, input_tokens, output_tokens, cost, post_slug)
						VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
					`,
					)
					.bind(
						locals.user.id,
						action,
						mode,
						modelUsed || "local",
						providerUsed || "local",
						totalTokens.input,
						totalTokens.output,
						cost,
						context?.slug || null,
					)
					.run();
			} catch (err) {
				// Usage logging is non-fatal - table might not exist yet or DB temporarily unavailable
				// Request already succeeded, so we log but don't fail
				console.warn(
					"[Wisp] Could not log usage:",
					err instanceof Error ? err.message : "Unknown error",
				);
			}
		}

		return json({
			...result,
			meta: {
				tokensUsed: totalTokens.input + totalTokens.output,
				cost,
				model: modelUsed || "local",
				provider: providerUsed || "local",
				mode,
			},
		});
	} catch (err) {
		logGroveError("API", API_ERRORS.INTERNAL_ERROR, { cause: err });
		return json(
			{
				error: API_ERRORS.INTERNAL_ERROR.userMessage,
				error_code: API_ERRORS.INTERNAL_ERROR.code,
			},
			{ status: 500 },
		);
	}
};

// ============================================================================
// GET - Usage Statistics
// ============================================================================

export const GET: RequestHandler = async ({ platform, locals }) => {
	if (!locals.user) {
		return json(
			{
				error: API_ERRORS.UNAUTHORIZED.userMessage,
				error_code: API_ERRORS.UNAUTHORIZED.code,
			},
			{ status: 401 },
		);
	}

	const db = platform?.env?.DB;

	if (!db) {
		return json({ requests: 0, tokens: 0, cost: 0 });
	}

	try {
		const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

		const stats = await db
			.prepare(
				`
				SELECT
					COUNT(*) as requests,
					COALESCE(SUM(input_tokens + output_tokens), 0) as tokens,
					COALESCE(SUM(cost), 0) as cost
				FROM wisp_requests
				WHERE user_id = ? AND created_at > ?
			`,
			)
			.bind(locals.user.id, thirtyDaysAgo)
			.first<{ requests: number; tokens: number; cost: number }>();

		return json({
			requests: stats?.requests || 0,
			tokens: stats?.tokens || 0,
			cost: stats?.cost || 0,
			period: "30 days",
		});
	} catch {
		return json({ requests: 0, tokens: 0, cost: 0 });
	}
};

// ============================================================================
// Analysis Functions (Lumen-powered)
// ============================================================================

import type { LumenClient } from "$lib/lumen/index.js";

/**
 * Analyze text for grammar and spelling issues via Lumen generation task
 */
async function analyzeGrammar(content: string, mode: "quick" | "thorough", lumen: LumenClient) {
	const modeConfig = PROMPT_MODES[mode];
	const maxTokens = getMaxTokens("grammar", mode);

	const prompt = `You are a helpful proofreader. Analyze the text for grammar, spelling, punctuation, and style issues.

${secureUserContent(content, "grammar analysis")}

IMPORTANT RULES:
- ONLY identify actual errors and unclear writing
- Do NOT suggest rewording that changes meaning
- Do NOT suggest expanding or adding content
- Be helpful but not pedantic
- Focus on errors that would confuse readers
${mode === "thorough" ? "- Be comprehensive and check for subtle issues" : "- Focus on the most important issues only"}

Return a JSON object with:
{
  "suggestions": [
    {
      "original": "the exact text with the issue",
      "suggestion": "the corrected text",
      "reason": "brief explanation (1 sentence max)",
      "severity": "error" | "warning" | "style"
    }
  ],
  "overallScore": 0-100
}

Use these severity levels:
- "error": Grammar/spelling mistakes
- "warning": Unclear or potentially confusing phrasing
- "style": Minor style improvements (use sparingly)

Return ONLY valid JSON. No explanation or markdown.`;

	const response = await lumen.run({
		task: "generation",
		input: prompt,
		options: {
			maxTokens,
			temperature: modeConfig.temperature,
		},
	});

	try {
		const result = JSON.parse(response.content);
		return {
			result: {
				suggestions: result.suggestions || [],
				overallScore: typeof result.overallScore === "number" ? result.overallScore : null,
			},
			usage: response.usage,
			model: response.model,
			provider: response.provider,
		};
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err);
		console.warn(
			"[Wisp] Failed to parse grammar result:",
			message,
			"| Response preview:",
			response.content?.substring(0, 100),
		);
		return {
			result: { suggestions: [], overallScore: null, parseError: true },
			usage: response.usage,
			model: response.model,
			provider: response.provider,
		};
	}
}

/**
 * Analyze text tone and style via Lumen generation task
 */
async function analyzeTone(
	content: string,
	mode: "quick" | "thorough",
	lumen: LumenClient,
	context?: { slug?: string; title?: string; audience?: string } | null,
) {
	const modeConfig = PROMPT_MODES[mode];
	const maxTokens = getMaxTokens("tone", mode);

	const audienceNote = context?.audience
		? `The intended audience is: ${context.audience}`
		: "No specific audience indicated.";

	const titleNote = context?.title ? `The piece is titled: "${context.title}"` : "";

	const prompt = `You are analyzing the tone of a piece of writing. ${titleNote} ${audienceNote}

${secureUserContent(content, "tone analysis")}

Analyze the overall tone and voice. Do NOT suggest rewrites or content changes.
${mode === "thorough" ? "Provide detailed analysis of voice consistency and emotional resonance." : "Keep analysis brief and focused."}

Return a JSON object with:
{
  "analysis": "2-3 sentence summary of the overall tone and voice",
  "traits": [
    { "trait": "trait name", "score": 0-100 }
  ],
  "suggestions": ["brief observation about tone consistency (max 3)"]
}

Common traits to evaluate (pick 4-6 most relevant):
- formal, casual, friendly, professional
- technical, accessible, poetic, direct
- warm, neutral, passionate, contemplative

Return ONLY valid JSON. No explanation or markdown.`;

	const response = await lumen.run({
		task: "generation",
		input: prompt,
		options: {
			maxTokens,
			temperature: modeConfig.temperature,
		},
	});

	try {
		const result = JSON.parse(response.content);
		return {
			result: {
				analysis: result.analysis || null,
				traits: result.traits || [],
				suggestions: result.suggestions || [],
			},
			usage: response.usage,
			model: response.model,
			provider: response.provider,
		};
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err);
		console.warn(
			"[Wisp] Failed to parse tone result:",
			message,
			"| Response preview:",
			response.content?.substring(0, 100),
		);
		return {
			result: { analysis: null, traits: [], suggestions: [], parseError: true },
			usage: response.usage,
			model: response.model,
			provider: response.provider,
		};
	}
}
