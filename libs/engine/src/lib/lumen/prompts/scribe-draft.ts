/**
 * Scribe Draft Mode Prompts
 *
 * Used to structure raw transcriptions with AI assistance.
 * The LLM cleans up speech patterns and extracts tangents as Vines.
 *
 * A Vine is Grove's margin note system - content that relates to but
 * diverges from the main text. In Draft mode, we auto-detect tangents
 * and suggest them as Vines.
 */

import type { GutterItem } from "../types.js";

/**
 * System prompt for structuring voice transcriptions.
 *
 * Key behaviors:
 * - Clean up filler words and speech patterns
 * - Maintain the author's voice and style
 * - Extract tangents and asides as Vines
 * - Don't over-edit or add content
 */
export const SCRIBE_DRAFT_SYSTEM_PROMPT = `You are a writing assistant helping to structure voice transcriptions. Your goal is to clean up spoken text while preserving the author's authentic voice.

## Your Tasks

1. **Clean up speech patterns**: Remove filler words (um, uh, like, you know), false starts, and verbal tics. Don't remove personality or style.

2. **Fix obvious errors**: Correct misheard words if they're clearly wrong in context. Don't guess - leave ambiguous words as-is.

3. **Structure for readability**: Add paragraph breaks where natural pauses occur. Don't add headers or formatting the author didn't imply.

4. **Extract tangents as Vines**: When the speaker goes on an aside, digression, or "oh by the way" moment, extract that as a Vine. Vines are margin notes that connect to but diverge from the main text.

## What NOT To Do

- Don't change the meaning or add content
- Don't make the text more formal unless it was already formal
- Don't remove personality, humor, or stylistic choices
- Don't over-structure - some stream-of-consciousness is intentional
- Don't create Vines for everything - only clear tangents/asides

## Output Format

Respond with ONLY valid JSON in this exact format:
{
  "text": "The cleaned-up main text...",
  "gutterContent": [
    {
      "type": "vine",
      "content": "The tangent or aside content",
      "anchor": "Optional: a word or phrase from the main text this relates to"
    }
  ]
}

If there are no tangents, use an empty array for gutterContent.`;

/**
 * Build the user prompt with the raw transcript.
 */
export function buildScribeDraftPrompt(rawTranscript: string): string {
  return `Please structure this voice transcription. Extract any tangents or asides as Vines.

<transcript>
${rawTranscript}
</transcript>

Remember: Output ONLY valid JSON with "text" and "gutterContent" fields.`;
}

/**
 * Parse and validate the LLM response.
 * Returns null if parsing fails (caller should fallback to raw text).
 */
export function parseScribeDraftResponse(response: string): {
  text: string;
  gutterContent: GutterItem[];
} | null {
  try {
    // Try to extract JSON from the response (in case LLM adds extra text)
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      text?: string;
      gutterContent?: unknown[];
    };

    // Validate required fields
    if (typeof parsed.text !== "string" || parsed.text.length === 0) {
      return null;
    }

    // Validate and filter gutter content
    const gutterContent: GutterItem[] = [];
    if (Array.isArray(parsed.gutterContent)) {
      for (const item of parsed.gutterContent) {
        if (
          item &&
          typeof item === "object" &&
          "type" in item &&
          item.type === "vine" &&
          "content" in item &&
          typeof item.content === "string"
        ) {
          gutterContent.push({
            type: "vine",
            content: item.content,
            anchor:
              "anchor" in item && typeof item.anchor === "string"
                ? item.anchor
                : undefined,
          });
        }
      }
    }

    return {
      text: parsed.text,
      gutterContent,
    };
  } catch {
    return null;
  }
}
