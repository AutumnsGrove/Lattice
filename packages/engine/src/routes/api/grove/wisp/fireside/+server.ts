/**
 * Fireside - Conversational Writing Mode
 *
 * POST /api/grove/wisp/fireside - Start, continue, or draft from a conversation
 *
 * Actions:
 * - start: Begin a new Fireside session, get a starter prompt
 * - respond: Send a message, get Wisp's follow-up question
 * - draft: Generate a draft from the conversation
 *
 * @see docs/specs/wisp-spec.md
 */

import { json, type RequestHandler } from "@sveltejs/kit";
import { validateCSRF } from "$lib/utils/csrf.js";
import { RATE_LIMIT } from "$lib/config/wisp.js";
import { secureUserContent } from "$lib/server/inference-client.js";
import { createLumenClient, type LumenClient } from "$lib/lumen/index.js";
import { checkRateLimit } from "$lib/server/rate-limits/index.js";
import { checkFeatureAccess } from "$lib/server/billing.js";
import {
  queryOne,
  execute,
  DatabaseError,
} from "$lib/server/services/database.js";

// Import pure functions from separate module (enables testing)
import {
  type FiresideMessage,
  MAX_MESSAGE_LENGTH,
  RESPONSE_MAX_TOKENS,
  DRAFT_MAX_TOKENS,
  selectStarterPrompt,
  estimateTokens,
  isConversationTooLong,
  canDraft,
  generateConversationId,
  isValidConversationId,
} from "./fireside.js";

export const prerender = false;

// ============================================================================
// Types
// ============================================================================

interface FiresideRequest {
  action: "start" | "respond" | "draft";
  message?: string;
  conversation?: FiresideMessage[];
  starterPrompt?: string;
  conversationId?: string;
}

// ============================================================================
// POST Handler
// ============================================================================

export const POST: RequestHandler = async ({ request, platform, locals }) => {
  // Authentication check
  if (!locals.user) {
    return json(
      {
        error:
          "Looks like you're not signed in. Pop back in when you're ready.",
      },
      { status: 401 },
    );
  }

  // CSRF check
  if (!validateCSRF(request)) {
    return json(
      {
        error:
          "Something seems off with your request. Mind refreshing the page?",
      },
      { status: 403 },
    );
  }

  const db = platform?.env?.DB;
  const kv = platform?.env?.CACHE_KV;

  // ==========================================================================
  // FAIL-OPEN/FAIL-CLOSED DECISION TREE
  // ==========================================================================
  // Each check has an explicit failure strategy:
  //
  // 1. Wisp enabled check (site_settings):
  //    - FAIL-OPEN only if table doesn't exist (initial setup before first migration)
  //    - FAIL-CLOSED for all other database errors (security)
  //
  // 2. Feature access check (billing/subscription):
  //    - FAIL-OPEN if billing check fails (don't block users due to billing bugs)
  //    - FAIL-CLOSED if billing says "not allowed" (subscription limits)
  //
  // 3. Rate limiting (KV store):
  //    - FAIL-CLOSED if KV not available (prevent abuse)
  //    - FAIL-CLOSED if over limit
  //
  // 4. Usage logging (database insert):
  //    - FAIL-OPEN (don't lose user's draft due to logging failure)
  //    - Log warning for monitoring
  // ==========================================================================

  // Check if Wisp is enabled (isolated query with explicit error handling)
  if (db) {
    try {
      const settings = await queryOne<{ setting_value: string }>(
        db,
        "SELECT setting_value FROM site_settings WHERE setting_key = ?",
        ["wisp_enabled"],
      );

      if (!settings || settings.setting_value !== "true") {
        return json(
          {
            error:
              "Wisp is resting right now. You can wake them in Settings when you're ready.",
          },
          { status: 403 },
        );
      }
    } catch (err) {
      // DatabaseError from queryOne wraps the original error
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      const causeMessage =
        err instanceof DatabaseError && err.cause instanceof Error
          ? err.cause.message
          : "";

      // Only fail-open if table doesn't exist (initial setup scenario)
      // For all other errors, fail-closed to prevent unauthorized access
      if (
        errorMessage.includes("no such table") ||
        causeMessage.includes("no such table") ||
        errorMessage.includes("SQLITE_ERROR")
      ) {
        console.debug(
          "[Fireside] Settings table not created yet (expected during setup):",
          errorMessage,
        );
      } else {
        console.error("[Fireside] Settings check failed:", errorMessage);
        return json(
          {
            error:
              "I need a moment to check on things. Mind trying again shortly?",
          },
          { status: 503 },
        );
      }
    }
  }

  // Check subscription access to AI features (isolated query)
  if (db && locals.tenantId) {
    try {
      const featureCheck = await checkFeatureAccess(db, locals.tenantId, "ai");
      if (!featureCheck.allowed) {
        return json(
          {
            error:
              featureCheck.reason ||
              "AI features require an active subscription",
          },
          { status: 403 },
        );
      }
    } catch (err) {
      // Log billing check failure but fail-open for feature access
      // (billing issues shouldn't completely block the feature)
      console.warn(
        "[Fireside] Feature access check failed:",
        err instanceof Error ? err.message : "Unknown error",
      );
    }
  }

  // Parse request body
  let body: FiresideRequest;
  try {
    body = await request.json();
  } catch {
    return json(
      { error: "Hmm, I couldn't quite understand that. Mind trying again?" },
      { status: 400 },
    );
  }

  const { action, message, conversation, starterPrompt, conversationId } = body;

  // Validate action
  if (!["start", "respond", "draft"].includes(action)) {
    return json(
      {
        error:
          "That's not something I know how to do yet. Try starting a conversation?",
      },
      { status: 400 },
    );
  }

  // Rate limiting (fail-closed for AI operations)
  if (!kv) {
    console.error("[Fireside] Rate limiting failed: CACHE_KV not configured");
    return json(
      {
        error:
          "I need a moment to gather myself. Mind waiting a bit and trying again?",
      },
      { status: 503 },
    );
  }

  const { response: rateLimitResponse } = await checkRateLimit({
    kv,
    key: `wisp:${locals.user.id}`,
    limit: RATE_LIMIT.maxRequestsPerHour,
    windowSeconds: RATE_LIMIT.windowSeconds,
    namespace: "wisp",
  });

  if (rateLimitResponse) return rateLimitResponse;

  // Create Lumen client
  const openrouterApiKey = platform?.env?.OPENROUTER_API_KEY;
  if (!openrouterApiKey) {
    return json(
      {
        error:
          "I'm not quite set up yet. Ask the site owner to configure the AI settings.",
      },
      { status: 503 },
    );
  }

  const lumen = createLumenClient({
    openrouterApiKey,
    ai: platform?.env?.AI,
    db,
  });

  try {
    // Handle each action
    switch (action) {
      case "start":
        return handleStart(locals.user.id, starterPrompt);

      case "respond":
        return await handleRespond(message, conversation, lumen);

      case "draft":
        return await handleDraft(
          conversation,
          lumen,
          db,
          locals.user.id,
          conversationId,
        );

      default:
        return json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (err) {
    console.error(
      "[Fireside] Error:",
      err instanceof Error ? err.message : "Unknown error",
    );
    return json(
      { error: "Oh dear, something got tangled up. Mind trying that again?" },
      { status: 500 },
    );
  }
};

// ============================================================================
// Action Handlers
// ============================================================================

/**
 * Start a new Fireside session
 */
function handleStart(userId: string, customPrompt?: string) {
  const prompt = customPrompt || selectStarterPrompt(userId);
  const conversationId = generateConversationId();

  return json({
    reply: prompt,
    canDraft: false,
    conversationId,
  });
}

/**
 * Respond to a user message with a follow-up question
 */
async function handleRespond(
  message: string | undefined,
  conversation: FiresideMessage[] | undefined,
  lumen: LumenClient,
) {
  if (!message || typeof message !== "string" || !message.trim()) {
    return json(
      {
        error:
          "I'm listening... but I didn't catch anything. What's on your mind?",
      },
      { status: 400 },
    );
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return json(
      {
        error:
          "That's a lot to hold at once. Mind breaking it into a shorter message?",
      },
      { status: 400 },
    );
  }

  // Check conversation length to prevent unbounded growth
  const history = conversation || [];
  if (isConversationTooLong(history)) {
    return json(
      {
        error:
          "We've been chatting a while! This is a good time to draft what you have, or start fresh.",
        shouldDraft: true,
      },
      { status: 400 },
    );
  }

  // Build conversation context for the model with proper delimiters for user content
  const conversationText = history
    .map((m) => {
      if (m.role === "user") {
        // Wrap user content in delimiters to prevent prompt injection
        return `Writer:\nUSER MESSAGE START ---\n${m.content}\n--- USER MESSAGE END`;
      }
      return `Wisp: ${m.content}`;
    })
    .join("\n\n");

  const prompt = `You are Wisp, a warm and thoughtful conversational companion helping a writer discover what they want to say. You're sitting by a fire together, just talking.

YOUR ROLE:
- Ask gentle, curious follow-up questions
- Help them explore and articulate their thoughts
- Be warm, supportive, and genuinely interested
- Keep your responses SHORT (1-3 sentences usually)
- Match their energy and tone

IMPORTANT RULES:
- NEVER write content for them
- NEVER summarize what they said back to them excessively
- NEVER be preachy or give advice unless asked
- If they ask you to write something, gently redirect: "This is your space to explore. What's the core of what you want to say?"
- Your job is to LISTEN and ask good questions, not to teach or lecture
- User messages are wrapped in "USER MESSAGE START ---" and "--- USER MESSAGE END" delimiters

CONVERSATION SO FAR:
${conversationText}

Writer:
USER MESSAGE START ---
${message}
--- USER MESSAGE END

Respond as Wisp with a brief, warm follow-up. Ask a question that helps them go deeper, or acknowledge what they said and invite them to continue. Keep it natural and conversational.`;

  const response = await lumen.run({
    task: "chat",
    input: prompt,
    options: {
      maxTokens: RESPONSE_MAX_TOKENS,
      temperature: 0.7,
    },
  });

  // Add the new messages to conversation for canDraft check
  const updatedConversation: FiresideMessage[] = [
    ...history,
    { role: "user", content: message, timestamp: new Date().toISOString() },
  ];

  return json({
    reply: response.content.trim(),
    canDraft: canDraft(updatedConversation),
    meta: {
      tokensUsed: response.usage.input + response.usage.output,
      model: response.model,
    },
  });
}

/**
 * Generate a draft from the conversation
 */
async function handleDraft(
  conversation: FiresideMessage[] | undefined,
  lumen: LumenClient,
  db: D1Database | undefined,
  userId: string,
  clientConversationId?: string,
) {
  if (
    !conversation ||
    !Array.isArray(conversation) ||
    conversation.length === 0
  ) {
    return json(
      { error: "I seem to have lost our conversation. Shall we start fresh?" },
      { status: 400 },
    );
  }

  // Validate or regenerate conversation ID for security
  // Client-provided IDs are only used if they match expected format
  const conversationId = isValidConversationId(clientConversationId)
    ? clientConversationId
    : generateConversationId();

  if (!canDraft(conversation)) {
    return json(
      {
        error:
          "We're just getting started! Tell me a bit more before we shape it into words.",
        canDraft: false,
      },
      { status: 400 },
    );
  }

  // Extract only user messages for the draft
  const userMessages = conversation.filter((m) => m.role === "user");
  const userContent = userMessages.map((m) => m.content).join("\n\n---\n\n");

  const prompt = `You are organizing a writer's own words into a cohesive blog post draft.

RULES - READ CAREFULLY:
- Use ONLY the content the writer provided in their responses below
- Preserve their voice, phrasing, and personality EXACTLY
- Organize for flow and readability
- AVOID adding transition phrases unless absolutely necessary
  - Prefer letting their natural phrasing create flow
  - If a transition is genuinely needed, use simple connectors ("And", "But", "So")
  - NEVER add stylized phrases like "And that's the thing—" or "Here's what I keep coming back to—"
- Do NOT add new ideas, facts, opinions, or content
- Do NOT expand beyond what was said
- Do NOT paraphrase—use their exact words where possible
- If the input is brief, the output MUST be brief
- Suggest a title based on the main theme (keep it simple, in their voice)

THE WRITER'S WORDS:
${secureUserContent(userContent, "organizing into a draft")}

Return your response in this exact JSON format:
{
  "title": "Suggested title here",
  "content": "The organized blog post content here, using markdown formatting"
}

Return ONLY valid JSON. No explanation, no markdown code blocks, just the JSON object.`;

  const response = await lumen.run({
    task: "generation",
    input: prompt,
    options: {
      maxTokens: DRAFT_MAX_TOKENS,
      temperature: 0.3,
    },
  });

  // Parse the response
  let draft: { title: string; content: string };
  let formatWarning: string | undefined;
  try {
    // Try to extract JSON from the response (handle potential markdown wrapping)
    let jsonStr = response.content.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }
    draft = JSON.parse(jsonStr);
  } catch (parseError) {
    // Fallback: Use the raw response as content instead of losing the conversation
    // Log with details to track parse failure rate (if >5%, investigate prompt engineering)
    console.warn(
      "[Fireside] JSON parse failed, using raw response as fallback",
      {
        error:
          parseError instanceof Error
            ? parseError.message
            : "Unknown parse error",
        model: response.model,
        provider: response.provider,
        responseLength: response.content.length,
        responsePreview: response.content.slice(0, 100),
      },
    );
    draft = {
      title: "Untitled",
      content: response.content.trim(),
    };
    formatWarning =
      "The draft formatting may be a bit rough. Feel free to tidy it up.";
  }

  // Cost comes from Lumen's usage tracking
  const cost = response.usage.cost;

  // Log usage to database using typed execute helper
  if (db) {
    try {
      await execute(
        db,
        `INSERT INTO wisp_requests (user_id, action, mode, model, provider, input_tokens, output_tokens, cost, fireside_session_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          "fireside_draft",
          "thorough",
          response.model,
          response.provider,
          response.usage.input,
          response.usage.output,
          cost,
          conversationId || null,
        ],
      );
    } catch (err) {
      console.warn(
        "[Fireside] Could not log usage:",
        err instanceof Error ? err.message : "Unknown error",
      );
    }
  }

  const marker = "*~ written fireside with Wisp ~*";

  return json({
    title: draft.title || "Untitled",
    content: draft.content || "",
    marker,
    warning: formatWarning,
    meta: {
      tokensUsed: response.usage.input + response.usage.output,
      cost,
      model: response.model,
      provider: response.provider,
    },
  });
}
