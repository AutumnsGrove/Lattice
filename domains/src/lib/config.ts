// Centralized configuration for Domain Finder
// Update model versions here when new ones are released

export const MODELS = {
  // Primary model for driving the search strategy (OpenRouter)
  DRIVER: "deepseek/deepseek-chat",
  // Fast model for parallel domain evaluation (OpenRouter)
  SWARM: "cerebras/btlm-3b-8k-base",
} as const;

// Available model options for the config UI (OpenRouter models)
export const DRIVER_MODEL_OPTIONS = [
  { value: "deepseek/deepseek-chat", label: "DeepSeek Chat (V3.2)" },
  { value: "deepseek/deepseek-coder", label: "DeepSeek Coder" },
  { value: "openai/gpt-4o-mini", label: "GPT-4o Mini" },
] as const;

export const SWARM_MODEL_OPTIONS = [
  { value: "cerebras/btlm-3b-8k-base", label: "Cerebras BTLM-3B (Fast)" },
  { value: "cerebras/cerebras-llama-3.1-70b", label: "Cerebras Llama 3.1 70B" },
  { value: "deepseek/deepseek-chat", label: "DeepSeek Chat (Fallback)" },
] as const;

// Default search configuration
export const SEARCH_DEFAULTS = {
  MAX_BATCHES: 6,
  CANDIDATES_PER_BATCH: 50,
  TARGET_GOOD_RESULTS: 25,
  CREATIVITY: 0.8,
  RDAP_DELAY_SECONDS: 10,
} as const;
