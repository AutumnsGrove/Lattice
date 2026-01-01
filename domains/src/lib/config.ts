// Centralized configuration for Domain Finder
// Using DeepSeek v3.2 via OpenRouter for zero-data-retention compliance

export const MODELS = {
  // Primary model for driving the search strategy (DeepSeek v3.2 via OpenRouter)
  DRIVER: "deepseek/deepseek-v3.2",
  // Fast model for parallel domain evaluation (DeepSeek v3.2 via OpenRouter)
  SWARM: "deepseek/deepseek-v3.2",
} as const;

// Model configuration - locked to DeepSeek v3.2 via OpenRouter
export const DRIVER_MODEL_OPTIONS = [
  { value: "deepseek/deepseek-v3.2", label: "DeepSeek v3.2 (via OpenRouter)" },
] as const;

export const SWARM_MODEL_OPTIONS = [
  { value: "deepseek/deepseek-v3.2", label: "DeepSeek v3.2 (via OpenRouter)" },
] as const;

// Default search configuration
export const SEARCH_DEFAULTS = {
  MAX_BATCHES: 6,
  CANDIDATES_PER_BATCH: 50,
  TARGET_GOOD_RESULTS: 25,
  CREATIVITY: 0.8,
  RDAP_DELAY_SECONDS: 10,
} as const;
