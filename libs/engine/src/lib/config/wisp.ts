/**
 * Wisp - Grove Writing Assistant Configuration
 *
 * Rate limits, content constraints, and prompt modes for the Wisp writing assistant.
 * AI inference is now handled by Lumen (see $lib/lumen).
 *
 * @see docs/specs/writing-assistant-unified-spec.md
 */

// ============================================================================
// Limits & Thresholds
// ============================================================================

/** Maximum content length for analysis (characters) */
export const MAX_CONTENT_LENGTH = 50000;

/** Max output tokens by analysis type and mode */
export const MAX_OUTPUT_TOKENS = {
  grammar: { quick: 1024, thorough: 2048 },
  tone: { quick: 512, thorough: 1024 },
  readability: 0, // No AI call needed
} as const;

/**
 * Rate limiting (burst protection)
 * Note: Cost cap is the true monthly limit (~1000 requests at current pricing).
 * Hourly limit prevents abuse bursts, not total monthly usage.
 */
export const RATE_LIMIT = {
  maxRequestsPerHour: 10,
  windowSeconds: 3600,
} as const;

/** Monthly cost cap per user (the true usage limit) */
export const COST_CAP = {
  enabled: true,
  maxCostUSD: 5.0,
  warningThreshold: 0.8, // Warn at 80%
} as const;

// ============================================================================
// Prompt Modes
// ============================================================================

export type AnalysisMode = "quick" | "thorough";
export type AnalysisAction = "grammar" | "tone" | "readability";

/**
 * Prompt modes control analysis depth without changing models
 */
export const PROMPT_MODES = {
  quick: {
    name: "Quick",
    description: "Fast essential checks",
    temperature: 0.1,
    maxOutputMultiplier: 1,
  },
  thorough: {
    name: "Thorough",
    description: "Comprehensive analysis",
    temperature: 0.2,
    maxOutputMultiplier: 2,
  },
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get max tokens for an action and mode
 */
export function getMaxTokens(
  action: AnalysisAction,
  mode: AnalysisMode = "quick",
): number {
  const tokens = MAX_OUTPUT_TOKENS[action];
  if (typeof tokens === "number") return tokens;
  return tokens?.[mode] || 1024;
}
