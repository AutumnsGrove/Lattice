/**
 * Voice Presets System
 *
 * Allows users to customize the "personality" of their timeline summaries.
 * Each voice defines how the AI writes about their daily coding activity.
 */

import { professional, quest, casual, poetic, minimal } from "./presets";
import type {
  VoicePreset,
  VoicePromptResult,
  CustomVoiceConfig,
  Commit,
  PromptContextInput,
} from "./types";

// =============================================================================
// Voice Registry
// =============================================================================

/**
 * All available voice presets
 */
export const VOICE_PRESETS: Record<string, VoicePreset> = {
  professional,
  quest,
  casual,
  poetic,
  minimal,
};

/**
 * Default voice preset ID
 */
export const DEFAULT_VOICE = "professional";

// =============================================================================
// Voice Selection
// =============================================================================

/**
 * Get a voice preset by ID
 */
export function getVoice(voiceId: string): VoicePreset {
  const voice = VOICE_PRESETS[voiceId];
  if (!voice) {
    console.warn(
      `Unknown voice preset: ${voiceId}, falling back to professional`,
    );
    return VOICE_PRESETS[DEFAULT_VOICE];
  }
  return voice;
}

/**
 * Get list of all available voices for UI display
 */
export function getAllVoices() {
  return Object.values(VOICE_PRESETS).map((voice) => ({
    id: voice.id,
    name: voice.name,
    description: voice.description,
    preview: voice.preview,
    isDefault: voice.id === DEFAULT_VOICE,
  }));
}

/**
 * Build a custom voice from user-provided prompts
 */
export function buildCustomVoice(customConfig: CustomVoiceConfig): VoicePreset {
  const {
    systemPrompt = VOICE_PRESETS.professional.systemPrompt,
    summaryInstructions = "",
    gutterStyle = "",
  } = customConfig;

  return {
    id: "custom",
    name: "Custom",
    description: "User-defined voice",
    preview: "Custom voice - see your configuration",
    systemPrompt,

    buildPrompt(commits: Commit[], date: string, ownerName = "the developer") {
      const commitList = commits
        .map(
          (c, i) =>
            `${i + 1}. [${c.repo}] ${c.message} (+${c.additions}/-${c.deletions})`,
        )
        .join("\n");

      const repoGroups: Record<string, string[]> = {};
      commits.forEach((c) => {
        if (!repoGroups[c.repo]) repoGroups[c.repo] = [];
        repoGroups[c.repo].push(c.message);
      });
      const repoSummary = Object.entries(repoGroups)
        .map(([repo, msgs]) => `${repo}: ${msgs.length} commits`)
        .join(", ");

      const gutterCount = Math.min(
        5,
        Math.max(1, Math.ceil(commits.length / 3)),
      );

      let prompt = `Write a daily development summary for ${ownerName} on ${date}.

COMMITS TODAY (${commits.length} total across: ${repoSummary}):
${commitList}

`;

      if (summaryInstructions) {
        prompt += `STYLE INSTRUCTIONS:
${summaryInstructions}

`;
      }

      prompt += `GENERATE THREE OUTPUTS:

1. BRIEF SUMMARY (2-3 sentences)

2. DETAILED BREAKDOWN (markdown):
   - Header: "## Projects"
   - Each project: "### ProjectName"
   - Bullet points for key changes

3. GUTTER COMMENTS (${gutterCount} margin notes):
   Short observations (10 words max).`;

      if (gutterStyle) {
        prompt += `
   Style: ${gutterStyle}`;
      }

      prompt += `

OUTPUT FORMAT (valid JSON only):
{
  "brief": "Your summary here",
  "detailed": "## Projects\\n\\n### ProjectName\\n- Change one",
  "gutter": [
    {"anchor": "### ProjectName", "type": "comment", "content": "Observation"}
  ]
}

REQUIREMENTS:
- JSON only, no markdown code blocks
- Escape newlines as \\n
- Gutter anchors must EXACTLY match "### ProjectName" headers
- Exactly ${gutterCount} gutter comments`;

      return prompt;
    },
  };
}

// =============================================================================
// Prompt Generation (Main Interface)
// =============================================================================

/**
 * Build the complete prompt for summary generation using the selected voice.
 *
 * @param voiceId - The voice preset ID (or "custom")
 * @param commits - Array of commits to summarize
 * @param date - Target date in YYYY-MM-DD format
 * @param ownerName - Display name for the developer
 * @param customConfig - Custom voice configuration (when voiceId is "custom")
 * @param context - Optional long-horizon context for multi-day awareness
 */
export function buildVoicedPrompt(
  voiceId: string,
  commits: Commit[],
  date: string,
  ownerName = "the developer",
  customConfig: CustomVoiceConfig | null = null,
  context: PromptContextInput | null = null,
): VoicePromptResult {
  let voice: VoicePreset;

  if (voiceId === "custom" && customConfig) {
    voice = buildCustomVoice(customConfig);
  } else {
    voice = getVoice(voiceId);
  }

  let userPrompt = voice.buildPrompt(commits, date, ownerName);

  // Append long-horizon context if provided (condensed to save tokens)
  if (context) {
    let contextSection = "";

    if (context.historicalContext) {
      contextSection += `
RECENT CONTEXT (brief awareness only — do NOT recap these):
${context.historicalContext}

`;
    }

    if (context.continuationNote) {
      contextSection += `${context.continuationNote}

`;
    }

    // Insert context before the commit list
    // Voice prompts use either "COMMITS TODAY" or "WHAT HAPPENED" as markers
    const commitsMarker = "COMMITS TODAY";
    const whatHappenedMarker = "WHAT HAPPENED";
    let insertIndex = userPrompt.indexOf(commitsMarker);
    if (insertIndex <= 0) {
      insertIndex = userPrompt.indexOf(whatHappenedMarker);
    }
    if (insertIndex > 0) {
      userPrompt =
        userPrompt.slice(0, insertIndex) +
        contextSection +
        userPrompt.slice(insertIndex);
    } else {
      // Fallback: prepend context
      userPrompt = contextSection + userPrompt;
    }
  }

  return {
    systemPrompt: voice.systemPrompt,
    userPrompt,
    voiceId: voice.id,
    voiceName: voice.name,
  };
}

// =============================================================================
// Re-exports
// =============================================================================

export { professional, quest, casual, poetic, minimal };
export type {
  VoicePreset,
  VoicePromptResult,
  CustomVoiceConfig,
  Commit,
  GutterComment,
  PromptContextInput,
} from "./types";
