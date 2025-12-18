/**
 * AI Model Configuration
 * Constants and utilities for AI-powered features like writing assistance
 */

// Maximum content length for AI analysis (in characters)
// Based on typical API token limits (~100k tokens ≈ 400k chars, with safety margin)
export const MAX_CONTENT_LENGTH = 100000;

// Model pricing (per 1M tokens) - for cost estimation
const MODEL_PRICING = {
  haiku: { input: 0.25, output: 1.25 },
  sonnet: { input: 3.0, output: 15.0 }
};

// Average characters per token (rough estimate)
const CHARS_PER_TOKEN = 4;

/**
 * Calculate estimated cost for AI analysis
 * @param {string} content - The content to analyze
 * @param {string} model - The model to use ('haiku' or 'sonnet')
 * @returns {{ inputTokens: number, outputTokens: number, cost: number }}
 */
export function calculateCost(content, model = 'haiku') {
  const pricing = MODEL_PRICING[/** @type {keyof typeof MODEL_PRICING} */ (model)] || MODEL_PRICING.haiku;
  const inputTokens = Math.ceil(content.length / CHARS_PER_TOKEN);
  // Estimate output tokens as ~10% of input for analysis tasks
  const outputTokens = Math.ceil(inputTokens * 0.1);

  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;

  return {
    inputTokens,
    outputTokens,
    cost: inputCost + outputCost
  };
}

/**
 * Get available AI models
 * @returns {Array<{ id: string, name: string, description: string }>}
 */
export function getAvailableModels() {
  return [
    { id: 'haiku', name: 'Haiku', description: 'Fast and cost-effective' },
    { id: 'sonnet', name: 'Sonnet', description: 'More thorough analysis' }
  ];
}
