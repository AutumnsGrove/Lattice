// Centralized configuration for Domain Finder
// Update model versions here when new ones are released

export const MODELS = {
  // Primary model for driving the search strategy
  DRIVER: "claude-sonnet-4-5-20250929",
  // Fast model for parallel domain evaluation
  SWARM: "claude-haiku-4-5-20251001",
} as const;

// Available model options for the config UI
export const DRIVER_MODEL_OPTIONS = [
  { value: "claude-sonnet-4-5-20250929", label: "Claude Sonnet 4.5 (Latest)" },
  { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
  { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet" },
] as const;

export const SWARM_MODEL_OPTIONS = [
  { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5 (Latest)" },
  { value: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku" },
  { value: "claude-3-haiku-20240307", label: "Claude 3 Haiku (Legacy)" },
] as const;

// Default search configuration
export const SEARCH_DEFAULTS = {
  MAX_BATCHES: 6,
  CANDIDATES_PER_BATCH: 50,
  TARGET_GOOD_RESULTS: 25,
  CREATIVITY: 0.8,
  RDAP_DELAY_SECONDS: 10,
} as const;
