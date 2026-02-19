/**
 * Triage Classifier — AI Email Classification via Lumen
 *
 * Sends only metadata to Lumen (from, subject, snippet) — never the full body.
 * Uses the 'summary' task type with a cheap model (~$0.0002/email).
 * Falls back to "uncategorized" on any parse failure.
 */

import type { LumenClient } from "@autumnsgrove/lattice/lumen";
import type {
  EmailCategory,
  SuggestedAction,
  ClassificationResult,
} from "./types.js";

// =============================================================================
// TYPES
// =============================================================================

export interface EmailEnvelope {
  from: string;
  subject: string;
  snippet: string; // First ~300 chars of body text
  date?: string;
  to?: string;
}

// =============================================================================
// CLASSIFICATION PROMPT
// =============================================================================

const CLASSIFICATION_SYSTEM_PROMPT = `You are an email triage assistant. Classify the email into exactly one category and suggest an action.

Categories:
- important: Personal messages from real people, urgent matters, appointments
- actionable: Requires a response or action (bills, requests, confirmations needing review)
- fyi: Informational but useful (shipping updates, receipts, service notices)
- social: Social media notifications, community updates
- marketing: Newsletters, promotions, sales emails
- transactional: Automated confirmations, password resets, verification codes
- junk: Spam, unwanted solicitations, phishing attempts

Actions:
- respond: Needs a reply
- read: Worth reading but no reply needed
- archive: Can be filed away
- delete: Safe to discard
- review: Needs manual judgment

Respond with ONLY valid JSON in this exact format:
{"category":"<category>","confidence":<0.0-1.0>,"reason":"<brief reason>","suggestedAction":"<action>","topics":["<topic1>","<topic2>"]}`;

function buildClassificationPrompt(envelope: EmailEnvelope): string {
  const parts = [`From: ${envelope.from}`, `Subject: ${envelope.subject}`];

  if (envelope.date) {
    parts.push(`Date: ${envelope.date}`);
  }

  if (envelope.snippet) {
    // Truncate snippet to ~300 chars to keep costs low
    const truncated =
      envelope.snippet.length > 300
        ? envelope.snippet.slice(0, 300) + "..."
        : envelope.snippet;
    parts.push(`Preview: ${truncated}`);
  }

  return parts.join("\n");
}

// =============================================================================
// CLASSIFIER
// =============================================================================

const VALID_CATEGORIES: EmailCategory[] = [
  "important",
  "actionable",
  "fyi",
  "social",
  "marketing",
  "transactional",
  "junk",
  "uncategorized",
];

const VALID_ACTIONS: SuggestedAction[] = [
  "respond",
  "read",
  "archive",
  "delete",
  "review",
];

/**
 * Classify an email envelope using Lumen AI.
 *
 * Only sends metadata (from, subject, snippet) — never the full body.
 * This keeps costs at ~$0.0002/email with DeepSeek v3.
 */
export async function classifyEmail(
  envelope: EmailEnvelope,
  lumen: LumenClient,
): Promise<ClassificationResult> {
  try {
    const response = await lumen.run({
      task: "summary" as const,
      input: [
        { role: "system", content: CLASSIFICATION_SYSTEM_PROMPT },
        { role: "user", content: buildClassificationPrompt(envelope) },
      ],
      options: {
        maxTokens: 200,
        temperature: 0.1, // Low temperature for consistent classification
        skipQuota: true, // Ivy is a personal tool, no tenant quotas
        skipPiiScrub: true, // We're deliberately sending email metadata
      },
    });

    return parseClassificationResponse(response.content);
  } catch (error) {
    console.error("[TriageDO/Classifier] Lumen call failed:", error);
    return fallbackClassification(envelope);
  }
}

/**
 * Parse the JSON response from Lumen, with validation.
 */
function parseClassificationResponse(content: string): ClassificationResult {
  try {
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate and coerce fields
    const category: EmailCategory = VALID_CATEGORIES.includes(parsed.category)
      ? parsed.category
      : "uncategorized";

    const suggestedAction: SuggestedAction = VALID_ACTIONS.includes(
      parsed.suggestedAction,
    )
      ? parsed.suggestedAction
      : "read";

    const confidence =
      typeof parsed.confidence === "number"
        ? Math.max(0, Math.min(1, parsed.confidence))
        : 0.5;

    const reason =
      typeof parsed.reason === "string" ? parsed.reason.slice(0, 200) : "";

    const topics = Array.isArray(parsed.topics)
      ? parsed.topics.filter((t: unknown) => typeof t === "string").slice(0, 5)
      : [];

    return { category, confidence, reason, suggestedAction, topics };
  } catch (error) {
    console.warn("[TriageDO/Classifier] Failed to parse response:", content);
    return {
      category: "uncategorized",
      confidence: 0,
      reason: "Failed to parse AI response",
      suggestedAction: "review",
      topics: [],
    };
  }
}

/**
 * Fallback classification when Lumen is unavailable.
 * Uses simple heuristics based on sender domain.
 */
function fallbackClassification(envelope: EmailEnvelope): ClassificationResult {
  const sender = envelope.from.toLowerCase();
  const subject = envelope.subject.toLowerCase();

  // Simple heuristic fallbacks
  if (sender.includes("noreply") || sender.includes("no-reply")) {
    return {
      category: "transactional",
      confidence: 0.6,
      reason: "Automated sender (noreply)",
      suggestedAction: "read",
      topics: ["automated"],
    };
  }

  if (
    subject.includes("unsubscribe") ||
    subject.includes("newsletter") ||
    subject.includes("sale") ||
    subject.includes("% off")
  ) {
    return {
      category: "marketing",
      confidence: 0.5,
      reason: "Marketing keywords in subject",
      suggestedAction: "archive",
      topics: ["marketing"],
    };
  }

  return {
    category: "uncategorized",
    confidence: 0,
    reason: "Lumen unavailable, no heuristic match",
    suggestedAction: "review",
    topics: [],
  };
}
