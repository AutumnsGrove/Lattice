/**
 * Timeline Curio
 *
 * AI-powered daily development summaries from your GitHub activity.
 * The first Developer Curio for Grove.
 *
 * Features:
 * - OpenRouter integration (BYOK - Bring Your Own Key)
 * - 5 voice presets + custom prompts
 * - Multi-tenant support
 * - Long-horizon context (multi-day task awareness)
 * - Configurable repos (include/exclude)
 */

// =============================================================================
// Internal Imports (for use within this file)
// =============================================================================

import { DEFAULT_OPENROUTER_MODEL as _DEFAULT_OPENROUTER_MODEL } from "./providers/openrouter";
import {
  DEFAULT_VOICE as _DEFAULT_VOICE,
  type GutterComment as _GutterComment,
} from "./voices";
import type {
  ContextBrief as _ContextBrief,
  DetectedFocus as _DetectedFocus,
} from "./context";

// =============================================================================
// Svelte Components
// =============================================================================

export { default as Timeline } from "./Timeline.svelte";
export { default as Heatmap } from "./Heatmap.svelte";

// =============================================================================
// OpenRouter Provider
// =============================================================================

export {
  getOpenRouterModels,
  validateOpenRouterKey,
  OPENROUTER_MODELS,
  DEFAULT_OPENROUTER_MODEL,
  type OpenRouterModel,
  type OpenRouterResponse,
  type OpenRouterOptions,
  type OpenRouterKeyValidation,
} from "./providers/openrouter";

// =============================================================================
// Voice Presets
// =============================================================================

export {
  // Main functions
  buildVoicedPrompt,
  getAllVoices,
  getVoice,
  buildCustomVoice,
  // Constants
  VOICE_PRESETS,
  DEFAULT_VOICE,
  // Individual presets
  professional,
  quest,
  casual,
  poetic,
  minimal,
  // Types
  type VoicePreset,
  type VoicePromptResult,
  type CustomVoiceConfig,
  type Commit,
  type GutterComment,
  type PromptContextInput,
} from "./voices";

// =============================================================================
// Long-Horizon Context
// =============================================================================

export {
  // Detection functions
  detectTaskFromText,
  detectTask,
  // Context generation
  generateContextBrief,
  buildDetectedFocus,
  buildSummaryContextData,
  // Historical context
  getHistoricalContext,
  detectContinuation,
  // Prompt formatting
  formatHistoricalContextForPrompt,
  formatContinuationForPrompt,
  buildPromptContext,
  // Types
  type TaskType,
  type ContextBrief,
  type DetectedFocus,
  type TaskContinuation,
  type HistoricalContextEntry,
  type SummaryContextData,
  type PromptContext,
} from "./context";

// =============================================================================
// Secrets Management (Envelope Encryption)
// =============================================================================
// Server-only module: import from "$lib/curios/timeline/secrets.server" directly
// This keeps server secrets out of client bundles.

// =============================================================================
// Types
// =============================================================================

/**
 * Timeline curio configuration stored per tenant
 */
export interface TimelineCurioConfig {
  enabled: boolean;
  githubUsername: string;
  githubToken?: string; // Encrypted
  openrouterKey?: string; // Encrypted
  openrouterModel: string;
  voicePreset: string;
  customPrompt?: string;
  reposInclude?: string[]; // NULL = all repos
  reposExclude?: string[]; // Repos to skip
  timezone: string;
}

/**
 * Timeline summary stored in database
 */
export interface TimelineSummary {
  id: string;
  tenantId: string;
  summaryDate: string;
  briefSummary: string;
  detailedTimeline: string;
  gutterContent: _GutterComment[];
  commitCount: number;
  reposActive: string[];
  totalAdditions: number;
  totalDeletions: number;
  aiModel: string;
  voicePreset: string;
  createdAt: number;
  // Long-horizon context fields
  contextBrief?: _ContextBrief;
  detectedFocus?: _DetectedFocus;
  continuationOf?: string; // Start date if continuing multi-day task
  focusStreak?: number; // Consecutive days on same task
}

/**
 * Activity data for heatmap visualization
 */
export interface TimelineActivity {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4; // GitHub-style intensity levels
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Strip hallucinated links from AI output.
 *
 * The AI sometimes invents URLs for section headers like:
 * [Sentinel Stress Testing System](https://github.com/AutumnsGrove/Sentinel Stress Testing System)
 * or creates links to repo roots that don't exist.
 *
 * The Timeline component handles repo linking itself via renderMarkdownWithGutter,
 * so we aggressively strip all AI-generated links. We only preserve links that:
 * 1. Point to specific resources (commit, PR, issue, file)
 * 2. Don't have spaces in the URL (a hallucination giveaway)
 */
function stripHallucinatedLinks(text: string): string {
  // Strip ALL markdown links, keeping only the link text
  // The component adds proper repo links; AI-generated ones are unreliable
  return text.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (match, linkText: string, url: string) => {
      // Keep links to specific resources (commits, PRs, issues, files)
      const isSpecificResource =
        /\/(commit|pull|issues|blob|tree|compare|releases)\/[a-zA-Z0-9]/.test(
          url,
        );
      const hasNoSpaces = !/ /.test(url);
      const isValidUrl = /^https?:\/\//.test(url);

      if (isSpecificResource && hasNoSpaces && isValidUrl) {
        return match; // Keep genuinely useful links
      }

      // Strip everything else — repo root links, invented URLs, etc.
      return linkText;
    },
  );
}

/**
 * Parse AI response into structured summary data
 */
export function parseAIResponse(response: string): {
  success: boolean;
  brief: string;
  detailed: string;
  gutter: _GutterComment[];
} {
  try {
    let jsonStr = response.trim();

    // Remove markdown code block if present
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const parsed = JSON.parse(jsonStr);

    // Validate gutter items
    const validGutter = (parsed.gutter || [])
      .filter(
        (item: { anchor?: string; content?: unknown }) =>
          item.anchor && item.content && typeof item.content === "string",
      )
      .map((item: { anchor: string; type?: string; content: string }) => ({
        anchor: stripHallucinatedLinks(item.anchor),
        type: item.type || "comment",
        content: item.content.trim(),
      }));

    // Sanitize brief and detailed to remove any hallucinated links
    const brief = stripHallucinatedLinks(
      parsed.brief || "Worked on a few things today.",
    );
    const detailed = stripHallucinatedLinks(
      parsed.detailed || "## Projects\n\nSome progress was made.",
    );

    return {
      success: true,
      brief,
      detailed,
      gutter: validGutter,
    };
  } catch (error) {
    console.error("Failed to parse AI response:", error);

    return {
      success: false,
      brief:
        "Some work happened today. The summary got a bit tangled, but the commits tell the story.",
      detailed: "## Projects\n\nWork continued across various projects.",
      gutter: [],
    };
  }
}

/**
 * Default configuration for new Timeline Curio setups
 */
export const DEFAULT_TIMELINE_CONFIG: Omit<
  TimelineCurioConfig,
  "githubUsername" | "githubToken" | "openrouterKey"
> = {
  enabled: false,
  openrouterModel: _DEFAULT_OPENROUTER_MODEL,
  voicePreset: _DEFAULT_VOICE,
  timezone: "America/New_York",
};

/**
 * Sentinel value for explicitly clearing a token via config update.
 * Send this value to delete an existing token (vs sending empty/null which preserves it).
 */
export const CLEAR_TOKEN_VALUE = "__CLEAR__";
