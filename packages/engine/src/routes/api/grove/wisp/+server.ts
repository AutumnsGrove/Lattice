/**
 * Wisp - Grove Writing Assistant API
 *
 * POST /api/grove/wisp - Analyze content for grammar, tone, and readability
 * GET /api/grove/wisp - Get usage statistics
 *
 * @see docs/specs/writing-assistant-unified-spec.md
 */

import { json, error } from "@sveltejs/kit";
import { validateCSRF } from "$lib/utils/csrf.js";
import {
  MAX_CONTENT_LENGTH,
  RATE_LIMIT,
  COST_CAP,
  PROMPT_MODES,
  calculateCost,
  getMaxTokens,
} from "$lib/config/wisp.js";
import {
  callInference,
  secureUserContent,
  stripMarkdown,
  smartTruncate,
} from "$lib/server/inference-client.js";
import { calculateReadability } from "$lib/utils/readability.js";
import { checkRateLimit } from "$lib/server/rate-limits/index.js";

export const prerender = false;

// ============================================================================
// POST - Analyze Content
// ============================================================================

/**
 * @type {import('./$types').RequestHandler}
 */
export async function POST({ request, platform, locals }) {
  // Authentication check
  if (!locals.user) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  // CSRF check
  if (!validateCSRF(request)) {
    return json({ error: "Invalid origin" }, { status: 403 });
  }

  const db = platform?.env?.DB;
  const kv = platform?.env?.CACHE_KV;

  // Check if Wisp is enabled
  if (db) {
    try {
      const settings = await db
        .prepare(
          "SELECT setting_value FROM site_settings WHERE setting_key = ?",
        )
        .bind("wisp_enabled")
        .first();

      if (!settings || settings.setting_value !== "true") {
        return json(
          { error: "Wisp is disabled. Enable it in Settings." },
          { status: 403 },
        );
      }
    } catch {
      // If settings table doesn't exist, allow (for initial setup)
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
    return json({ error: "Invalid request body" }, { status: 400 });
  }

  const { content, action, mode = "quick", context } = body;

  // Validate content
  if (!content || typeof content !== "string") {
    return json({ error: "No content provided" }, { status: 400 });
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
      { error: "Invalid action. Use: grammar, tone, readability, or all" },
      { status: 400 },
    );
  }

  // Validate mode
  if (!["quick", "thorough"].includes(mode)) {
    return json(
      { error: "Invalid mode. Use: quick or thorough" },
      { status: 400 },
    );
  }

  // Validate context object (if provided)
  if (context !== undefined) {
    if (context !== null && typeof context !== "object") {
      return json({ error: "Invalid context format" }, { status: 400 });
    }
    if (context?.slug !== undefined && typeof context.slug !== "string") {
      return json({ error: "Invalid slug in context" }, { status: 400 });
    }
    if (context?.title !== undefined && typeof context.title !== "string") {
      return json({ error: "Invalid title in context" }, { status: 400 });
    }
  }

  // Rate limiting using Threshold middleware
  if (kv) {
    const { result, response } = await checkRateLimit({
      kv,
      key: `wisp:${locals.user.id}`,
      limit: RATE_LIMIT.maxRequestsPerHour,
      windowSeconds: RATE_LIMIT.windowSeconds,
      namespace: "wisp",
    });

    if (response) return response; // 429 with proper headers
  }

  // Monthly cost cap check
  if (db && COST_CAP.enabled) {
    // Use single Date instance to avoid edge case at month boundary
    const now = new Date();
    const monthStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
    ).toISOString();
    try {
      const usage = (await db
        .prepare(
          "SELECT COALESCE(SUM(cost), 0) as monthly_cost FROM wisp_requests WHERE user_id = ? AND created_at > ?",
        )
        .bind(locals.user.id, monthStart)
        .first()) as { monthly_cost: number } | null;

      if (usage && usage.monthly_cost >= COST_CAP.maxCostUSD) {
        return json(
          {
            error: `Monthly usage limit reached ($${COST_CAP.maxCostUSD.toFixed(2)}). Resets on the 1st.`,
          },
          { status: 429 },
        );
      }
    } catch {
      // Table might not exist yet
    }
  }

  // Get API secrets (validate they are strings, not undefined)
  const secrets = {
    FIREWORKS_API_KEY:
      typeof platform?.env?.FIREWORKS_API_KEY === "string"
        ? platform.env.FIREWORKS_API_KEY
        : undefined,
    CEREBRAS_API_KEY:
      typeof platform?.env?.CEREBRAS_API_KEY === "string"
        ? platform.env.CEREBRAS_API_KEY
        : undefined,
    GROQ_API_KEY:
      typeof platform?.env?.GROQ_API_KEY === "string"
        ? platform.env.GROQ_API_KEY
        : undefined,
  };

  // Check if any inference provider is configured
  const hasProvider = Object.values(secrets).some(Boolean);
  if (
    !hasProvider &&
    (action === "grammar" || action === "tone" || action === "all")
  ) {
    return json({ error: "AI service not configured" }, { status: 503 });
  }

  const result: {
    grammar?: unknown;
    tone?: unknown;
    readability?: unknown;
  } = {};
  let totalTokens = { input: 0, output: 0 };
  let modelUsed: string | null = null;
  let providerUsed: string | null = null;

  try {
    // Prepare content for analysis
    const cleanContent = stripMarkdown(content);
    const truncatedContent = smartTruncate(cleanContent);

    // Grammar analysis (AI-powered)
    if (action === "grammar" || action === "all") {
      const grammarResult = await analyzeGrammar(
        truncatedContent,
        mode,
        secrets,
      );
      result.grammar = grammarResult.result;
      totalTokens.input += grammarResult.usage.input;
      totalTokens.output += grammarResult.usage.output;
      modelUsed = grammarResult.model;
      providerUsed = grammarResult.provider;
    }

    // Tone analysis (AI-powered)
    if (action === "tone" || action === "all") {
      const toneResult = await analyzeTone(
        truncatedContent,
        mode,
        secrets,
        context,
      );
      result.tone = toneResult.result;
      totalTokens.input += toneResult.usage.input;
      totalTokens.output += toneResult.usage.output;
      modelUsed = modelUsed || toneResult.model;
      providerUsed = providerUsed || toneResult.provider;
    }

    // Readability (local calculation - no AI)
    if (action === "readability" || action === "all") {
      result.readability = calculateReadability(content);
    }

    // Calculate cost
    const cost = modelUsed
      ? calculateCost(modelUsed, totalTokens.input, totalTokens.output)
      : 0;

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
      } catch {
        // Table might not exist yet - non-fatal
        console.warn("[Wisp] Could not log usage - table may not exist");
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
    console.error(
      "[Wisp] Analysis error:",
      err instanceof Error ? err.message : "Unknown error",
    );
    return json(
      { error: "Analysis failed. Please try again." },
      { status: 500 },
    );
  }
}

// ============================================================================
// GET - Usage Statistics
// ============================================================================

/**
 * @type {import('./$types').RequestHandler}
 */
export async function GET({ platform, locals }) {
  if (!locals.user) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = platform?.env?.DB;

  if (!db) {
    return json({ requests: 0, tokens: 0, cost: 0 });
  }

  try {
    const thirtyDaysAgo = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000,
    ).toISOString();

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
      .first();

    return json({
      requests: stats?.requests || 0,
      tokens: stats?.tokens || 0,
      cost: stats?.cost || 0,
      period: "30 days",
    });
  } catch {
    return json({ requests: 0, tokens: 0, cost: 0 });
  }
}

// ============================================================================
// Analysis Functions
// ============================================================================

type WispSecrets = {
  FIREWORKS_API_KEY?: string;
  CEREBRAS_API_KEY?: string;
  GROQ_API_KEY?: string;
};

/**
 * Analyze text for grammar and spelling issues
 */
async function analyzeGrammar(
  content: string,
  mode: "quick" | "thorough",
  secrets: WispSecrets,
) {
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

  const response = await callInference(
    {
      prompt,
      maxTokens,
      temperature: modeConfig.temperature,
    },
    secrets,
  );

  try {
    const result = JSON.parse(response.content);
    return {
      result: {
        suggestions: result.suggestions || [],
        overallScore:
          typeof result.overallScore === "number" ? result.overallScore : null,
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
 * Analyze text tone and style
 */
async function analyzeTone(
  content: string,
  mode: "quick" | "thorough",
  secrets: WispSecrets,
  context?: { slug?: string; title?: string; audience?: string } | null,
) {
  const modeConfig = PROMPT_MODES[mode];
  const maxTokens = getMaxTokens("tone", mode);

  const audienceNote = context?.audience
    ? `The intended audience is: ${context.audience}`
    : "No specific audience indicated.";

  const titleNote = context?.title
    ? `The piece is titled: "${context.title}"`
    : "";

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

  const response = await callInference(
    {
      prompt,
      maxTokens,
      temperature: modeConfig.temperature,
    },
    secrets,
  );

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
